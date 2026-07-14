// ============================================================
// agent.js — Render 에이전트 코어 (브라우저/노드 공용).
//   시스템 프롬프트는 주입 필수 (js/prompt-v3.js).
//   - 도구: tier-1 peek_orm·peek_profile·peek_reftable (SIGNAL_STORE 위)
//           tier-2 grep_code·read_file·find_refs (CORPUS 위)
//   - 루프: 매니페스트 시드 → 결손 타입화 → tier-1 → 남으면 tier-2 dig → 검증 → answer
//   - callModel 주입식: 브라우저=Anthropic API, 노드=mock 하니스
//   window.RenderAgent 로 노출. (노드에서는 module.exports)
// ============================================================
(function (root) {

const MAX_OPS = 12;

// ── 도구 구현 (순수 함수, store/corpus 주입) ────────────────────────────────
// 설계 원칙: 도구는 "결과"가 아니라 "다음 행동의 근거"를 돌려준다.
//   - 검색은 지도(파일별 분포 + 총 건수)를 준다. 잘림은 숨기지 않고 명시한다.
//   - 읽기는 조준(줄 범위)이 가능하고, 절단 시 전체 크기와 이어읽는 방법을 알려준다.
//   - 응답은 스스로 크기 예산을 지킨다 — 하류(userPrompt)에서 JSON 이 깨진 채
//     잘리는 일이 없도록. note·total 같은 핵심 필드는 JSON 앞쪽에 둔다.
//   - 도구는 '읽는 방법'만 제공하고 '무엇을 읽을지에 대한 지식'은 넣지 않는다.
function makeTools(store, corpus) {
  const col = (cid) => (store.columns[cid] || null);

  // 라인 캐시 — split 을 파일당 한 번만. grep/find_refs/read_file 공유.
  // (브라우저 메인스레드에서 매 호출 전체 재분할이 프리즈의 주원인이었다.)
  const lineCache = new Map();
  function linesOf(path) {
    let l = lineCache.get(path);
    if (!l) { l = corpus[path].split("\n"); lineCache.set(path, l); }
    return l;
  }

  // cid 또는 {table, column} → store 키. 타 엔티티 조회 지원.
  function resolveCid(cid, args) {
    if (args && args.table && args.column) return args.table + "." + args.column;
    return cid;
  }

  function peek_orm(cid, args) {
    const key = resolveCid(cid, args);
    const r = col(key);
    if (!r) return { error: "unknown column: " + key,
      note: "store 에 없는 컬럼(슬라이스 밖). 코드로 보려면 grep_code/read_file 을 써라." };
    return r.orm && r.orm.present ? r.orm : { present: false, note: "orm 신호 없음(정보 부재)" };
  }
  function peek_profile(cid, args) {
    const key = resolveCid(cid, args);
    const r = col(key);
    if (!r) return { error: "unknown column: " + key,
      note: "store 에 없는 컬럼(슬라이스 밖)." };
    return r.profile && r.profile.present ? r.profile : { present: false, note: "프로파일 없음" };
  }
  // group 미지정: 그룹 목록만(이름+행수). group 지정: 그 그룹 행들.
  function peek_reftable(cid, args) {
    const r = col(cid); if (!r) return { error: "unknown column" };
    const dump = store.reftable_dump || {};
    const group = args && args.group;
    if (group) {
      if (dump[group] == null) return { error: "그룹 없음: " + group, available_groups: Object.keys(dump) };
      return { group, rows: dump[group],
        note: "이 컬럼→그룹 연결은 미선언. 값집합 매칭/코드 탐색으로 직접 이어라." };
    }
    const groups = Object.entries(dump).map(([g, rows]) =>
      ({ group: g, row_count: Array.isArray(rows) ? rows.length : Object.keys(rows || {}).length }));
    return {
      column_linked: !!(r.reftable && r.reftable.present),
      note: "이 컬럼→그룹 연결은 미선언. 그룹 목록을 보고 유망한 그룹을 {group:\"이름\"} 으로 다시 조회하라.",
      groups,
      dump: groups.length <= 3 ? dump : undefined,
    };
  }

  // 조망: 코퍼스의 구조를 본다. dir 프리픽스·pattern 부분일치 필터.
  function list_files(args) {
    const dir = (args && args.dir || "").trim();
    const pattern = (args && args.pattern || "").trim();
    let paths = Object.keys(corpus);
    if (dir) paths = paths.filter((p) => p.startsWith(dir) || p.includes("/" + dir));
    if (pattern) paths = paths.filter((p) => p.includes(pattern));
    const total = paths.length;
    if (total === 0) return { total: 0, note: "해당 없음" + (dir ? " (dir=" + dir + ")" : "") };
    if (total > 60) {
      const byDir = {};
      paths.forEach((p) => {
        const d = p.split("/").slice(0, -1).join("/");
        byDir[d] = (byDir[d] || 0) + 1;
      });
      const dirs = Object.entries(byDir).sort((a, b) => b[1] - a[1])
        .map(([d, n]) => ({ dir: d, file_count: n }));
      return { total, note: "파일이 많아 디렉토리 요약으로 반환. dir 필터로 좁혀 다시 조회하라.",
        directories: dirs.slice(0, 40),
        directories_shown: Math.min(40, dirs.length), directories_total: dirs.length };
    }
    const files = paths.sort().map((p) => ({ path: p, lines: linesOf(p).length }));
    return { total, files };
  }

  // 검색: 파일별 지도. 단일 패스, 문맥 포함, 자기 크기 예산(~3000자) 준수.
  function grep_code(args) {
    const q = (args && args.query || "").trim();
    if (!q) return { error: "query 필요" };
    // context 는 앞뒤 문맥 줄 수(숫자). 숫자가 아니면 기본 1 — 모델이 문자열을
    // 넘긴 실측 사례(NaN 전파로 샘플이 전부 빈 문자열이 되던 버그) 방어.
    const rawCtx = args && args.context;
    const ctx = Number.isFinite(+rawCtx) && rawCtx !== "" && rawCtx !== null ? Math.min(Math.max(+rawCtx, 0), 4) : 1;
    const clip = (s) => (s.length > 160 ? s.slice(0, 157) + "…" : s);
    const byFile = new Map(); // path → { count, samples[] }
    let total = 0;
    for (const path of Object.keys(corpus)) {
      const lines = linesOf(path);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(q)) {
          total++;
          let e = byFile.get(path);
          if (!e) { e = { count: 0, samples: [] }; byFile.set(path, e); }
          e.count++;
          if (e.samples.length < 2) {
            const from = Math.max(0, i - ctx), to = Math.min(lines.length - 1, i + ctx);
            const block = [];
            for (let j = from; j <= to; j++)
              block.push((j === i ? "▶ " : "  ") + clip(lines[j].trim()));
            e.samples.push({ line: i + 1, text: block.join("\n") });
          }
        }
      }
    }
    const fileEntries = [...byFile.entries()]
      .map(([file, e]) => ({ file, match_count: e.count, samples: e.samples }))
      .sort((a, b) => b.match_count - a.match_count);
    const withSamples = fileEntries.slice(0, 12);
    const countOnly = fileEntries.slice(12, 12 + 15)
      .map((f) => ({ file: f.file, match_count: f.match_count }));
    const hiddenFiles = Math.max(0, fileEntries.length - 12 - countOnly.length);
    const build = () => {
      const flat = [];
      withSamples.forEach((f) => f.samples.forEach((s) => {
        if (flat.length < 15) {
          const mark = s.text.split("\n").find((l) => l.startsWith("▶ "));
          const t = mark ? mark.slice(2) : s.text;
          flat.push({ file: f.file, line: s.line, text: t.length > 60 ? t.slice(0, 57) + "…" : t });
        }
      }));
      return {
        query: q,
        total_matches: total,
        total_files: fileEntries.length,
        note: total === 0
          ? "매치 없음 — 정보 부재이지 부정 증거가 아니다."
          : (fileEntries.length > withSamples.length
            ? "표시는 일부다(샘플 " + withSamples.length + "파일 + 카운트만 " + countOnly.length + "파일" + (hiddenFiles > 0 ? " + 미표시 " + hiddenFiles + "파일" : "") + "). 질의를 좁히거나 유망 파일을 read_file 로 조준하라. 정의(선언) 를 찾는 거라면 find_refs 가 낫다."
            : "전체 파일 표시됨."),
        files: withSamples,
        more_files: countOnly.length ? countOnly : undefined,
        matches: flat, count: total, // 하위호환 (file 필드 검사용)
      };
    };
    // 예산: 최종 응답 5500자 이내가 될 때까지 뒤에서부터 덜어냄 (userPrompt 최신 한도 6000 이내 보장)
    let out = build();
    while (JSON.stringify(out).length > 5500 &&
           (withSamples.length > 3 || countOnly.length > 0)) {
      if (countOnly.length > 0) countOnly.pop();
      else withSamples.pop();
      out = build();
    }
    return out;
  }

  // 읽기: 줄 범위 조준. 절단은 정직하게.
  function read_file(args) {
    const p = args && args.path;
    if (!p) return { error: "path 필요" };
    let key = null;
    if (corpus[p] != null) key = p;
    else key = Object.keys(corpus).find((x) => x.endsWith("/" + p) || x.endsWith(p)) || null;
    if (!key) return { error: "파일 없음: " + p };
    const lines = linesOf(key);
    const totalLines = lines.length;
    let from = (args && args.from_line) ? Math.max(1, args.from_line) : 1;
    let to = (args && args.to_line) ? Math.min(totalLines, args.to_line) : totalLines;
    const MAX_LINES = 120;
    let truncated = false;
    if (to - from + 1 > MAX_LINES) { to = from + MAX_LINES - 1; truncated = true; }
    return {
      path: key, total_lines: totalLines, from_line: from, to_line: to,
      truncated,
      note: truncated
        ? "총 " + totalLines + "줄 중 " + from + "–" + to + "줄만 표시. 이어 읽으려면 {from_line:" + (to + 1) + "} 로 재호출. grep_code/find_refs 의 줄 번호로 조준하면 더 빠르다."
        : undefined,
      content: lines.slice(from - 1, to).join("\n"),
    };
  }

  // 참조 추적: 정의로 보이는 것과 사용을 갈라서 준다(휴리스틱).
  function find_refs(args) {
    const s = (args && args.symbol || "").trim();
    if (!s) return { error: "symbol 필요" };
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("\\b" + esc + "\\b");
    const defRe = new RegExp("\\b(class|enum|interface|record)\\s+" + esc + "\\b|\\b(private|protected|public)\\b[^=;(]*\\b" + esc + "\\s*[;=]");
    const defs = [];
    const useByFile = new Map();
    let totalUses = 0;
    for (const path of Object.keys(corpus)) {
      const lines = linesOf(path);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!re.test(line)) continue;
        if (defRe.test(line) && defs.length < 10) {
          defs.push({ file: path, line: i + 1, text: line.trim().slice(0, 160) });
        } else {
          totalUses++;
          useByFile.set(path, (useByFile.get(path) || 0) + 1);
        }
      }
    }
    const useFiles = [...useByFile.entries()].sort((a, b) => b[1] - a[1])
      .map(([file, count]) => ({ file, count }));
    return {
      symbol: s,
      definitions_note: defs.length ? "선언 패턴으로 보이는 위치(휴리스틱)." : "선언 패턴 미발견 — 사용만 있거나 다른 형태의 정의일 수 있다.",
      definitions: defs,
      usage_total: totalUses,
      usage_files: useFiles.slice(0, 12),
      usage_files_total: useFiles.length,
      matches: defs.slice(0, 30), count: defs.length + totalUses, // 하위호환
    };
  }

  return { peek_orm, peek_profile, peek_reftable, list_files, grep_code, read_file, find_refs };
}

// ── 시드/매니페스트 ──────────────────────────────────────────────────────────
function manifest(store, cid) {
  const r = store.columns[cid]; if (!r) return [];
  const m = [];
  if (r.orm && r.orm.present) m.push("orm");
  if (r.profile && r.profile.present) m.push("profile");
  m.push("reftable_dump"); // 전역 덤프는 항상 조회 가능
  return m;
}

function seedText(store, cid) {
  const r = store.columns[cid];
  const s = r.schema;
  return [
    `[대상 컬럼] ${cid}`,
    `[스키마] table=${s.table} type=${s.type} nullable=${s.nullable} pk=${s.pk} fk=${s.fk || "-"}`,
    `[매니페스트 — 당길 수 있는 tier-1 신호] ${manifest(store, cid).join(", ")}`,
    `[tier-2] 정적 신호로 라벨/계보/연결이 안 풀리면 grep_code·read_file·find_refs 로 코드를 뒤질 수 있다.`,
  ].join("\n");
}

// 캐시 블록 구조 — 블록1(시드+과거 로그 1200자 고정 절단, append-only, cache_control) +
// 블록2(직전 결과 8000자 + 푸터). 과거 절단폭이 고정이라 블록1 접두가 턴 간 불변 → 증분 캐시 히트.
function userBlocks(store, cid, log, left) {
  const fmt = (e, cap) => {
    let body = JSON.stringify(e.result);
    if (body.length > cap) body = body.slice(0, cap) + "…(생략)";
    return `${e.op}(${JSON.stringify(e.args || {})}) → ${body}`;
  };
  const head = [seedText(store, cid)];
  if (log.length > 1) {
    head.push("", "[조회/탐색 기록]");
    log.slice(0, -1).forEach((e, i) => head.push(`${i + 1}. ${fmt(e, 1200)}`));
  }
  const tail = [];
  if (log.length) {
    if (log.length === 1) tail.push("", "[조회/탐색 기록]");
    tail.push(`${log.length}. ${fmt(log[log.length - 1], 8000)}`);
  }
  tail.push("", `[남은 횟수] ${left}`, "", "JSON 하나로 답하라.");
  return [
    { type: "text", text: head.join("\n"), cache_control: { type: "ephemeral" } },
    { type: "text", text: tail.join("\n") },
  ];
}

// 단일 문자열 조립 — 노드 하니스·시뮬 호환용.
function userPrompt(store, cid, log, left) {
  return userBlocks(store, cid, log, left).map((b) => b.text).join("\n");
}

// ── 루프 ─────────────────────────────────────────────────────────────────────
// callModel({system, user}) → 모델의 원문 텍스트(JSON 하나). 주입식.
async function run(cid, { store, corpus, callModel, onStep, system }) {
  if (!system) throw new Error("system 프롬프트 미주입");
  const sys = system;
  const tools = makeTools(store, corpus);
  const log = [];
  const seen = new Set();
  const trace = [];

  for (let t = 0; t < MAX_OPS; t++) {
    const left = MAX_OPS - t;
    const user = userBlocks(store, cid, log, left);
    const raw = await callModel({ system: sys, user });
    let action;
    try {
      action = JSON.parse(stripFences(raw));
    } catch (e) {
      // 파싱 실패 → 한 번 더 기회를 주되 기록
      trace.push({ kind: "parse_error", raw });
      if (onStep) await onStep({ kind: "parse_error", raw });
      continue;
    }

    if (action.action === "answer") {
      trace.push({ kind: "answer", ...action });
      if (onStep) await onStep({ kind: "answer", ...action });
      return { cid, answer: action, trace, ops: log.length };
    }

    if (action.action === "op") {
      const op = action.op;
      const args = action.args || {};
      if (action.thinking && onStep) await onStep({ kind: "think", text: action.thinking });
      if (onStep) await onStep({ kind: "op_request", op, args });
      const key = op + ":" + JSON.stringify(args);
      let result;
      if (seen.has(key)) {
        result = { note: "이미 같은 인자로 호출함(무시)" };
      } else {
        seen.add(key);
        result = dispatch(tools, op, cid, args);
      }
      log.push({ op, args, result });
      const step = { kind: "op", op, args, thinking: action.thinking, result };
      trace.push(step);
      if (onStep) await onStep({ kind: "op_done", op, args, result });
      continue;
    }

    // 알 수 없는 액션 → 기록 후 계속
    trace.push({ kind: "unknown", action });
    if (onStep) await onStep({ kind: "unknown", action });
  }

  // 상한 도달 — 강제 종결 신호를 마지막 한 번 더 요청
  const user = userBlocks(store, cid, log, 0);
  const raw = await callModel({ system: sys, user });
  let action;
  try { action = JSON.parse(stripFences(raw)); } catch (e) { action = null; }
  if (action && action.action === "answer") {
    trace.push({ kind: "answer", ...action });
    if (onStep) await onStep({ kind: "answer", ...action });
    return { cid, answer: action, trace, ops: log.length };
  }
  const forced = { action: "answer", description: "신호 소진, 권위 미확인.",
    confidence: "LOW", evidence: log.map((l) => l.op), conflicts: [],
    route_to_human: { needed: true, reason: "상한 도달·미해소" }, thinking: "강제 종결" };
  trace.push({ kind: "answer", ...forced, forced: true });
  if (onStep) await onStep({ kind: "answer", ...forced, forced: true });
  return { cid, answer: forced, trace, ops: log.length, forced: true };
}

function dispatch(tools, op, cid, args) {
  switch (op) {
    case "peek_orm": return tools.peek_orm(cid, args);
    case "peek_profile": return tools.peek_profile(cid, args);
    case "peek_reftable": return tools.peek_reftable(cid, args);
    case "list_files": return tools.list_files(args);
    case "grep_code": return tools.grep_code(args);
    case "read_file": return tools.read_file(args);
    case "find_refs": return tools.find_refs(args);
    default: return { error: "알 수 없는 op: " + op };
  }
}

function stripFences(s) {
  if (typeof s !== "string") return s;
  return s.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
}

const API = { MAX_OPS, makeTools, manifest, seedText, userBlocks, userPrompt, run, dispatch, stripFences };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else root.RenderAgent = API;

})(typeof window !== "undefined" ? window : globalThis);
