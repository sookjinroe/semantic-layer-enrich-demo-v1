// ============================================================
// agent.js — Render v2 에이전트 코어 (브라우저/노드 공용).
//   - 도구: tier-1 peek_orm·peek_profile·peek_reftable (SIGNAL_STORE 위)
//           tier-2 grep_code·read_file·find_refs (CORPUS 위)
//   - 루프: 매니페스트 시드 → 결손 타입화 → tier-1 → 남으면 tier-2 dig → 검증 → answer
//   - callModel 주입식: 브라우저=Anthropic API, 노드=mock 하니스
//   window.RenderAgent 로 노출. (노드에서는 module.exports)
// ============================================================
(function (root) {

const MAX_OPS = 12;

// ── 시스템 프롬프트 — 규율이 곧 에이전트 로직 ───────────────────────────────
const RENDER_SYS = `너는 "Render"라는 시맨틱 레이어 증강 에이전트다. DB 컬럼 하나에 대해, NL2SQL 에이전트가 쓸 비즈니스 Description 을 합성한다.

[너의 소유 vs 추출의 소유]
- 너는 description·confidence·evidence·conflicts·route_to_human 만 저작한다.
- codedict(값→라벨)·classification·format 은 추출이 소유한다 — 저작하지 말고, 신호에서 *읽어서* 프로즈에 참조하고 충돌을 감지하는 데만 쓴다.

[Description — 담을 것만, 짧게]
- 소비자(NL)는 get_column 으로 이름·타입·nullable·pk·fk 를 *이미* 본다. description = 거기서 못 얻는 사실만.
- 담아라(해당하면, 짧게 만들려고 버리지 마라): 값공간의 *의미*(라벨·단계), 형식, 분류(PII 등), 유사 컬럼과의 *구분*, 계보, 주의·gap.
- 빼라(반드시): 이미 아는 것(타입·null·"N자리 코드" 재서술), 분포·퍼센트·빈도 나열, 일반 SQL 코칭, 출처(→ evidence 에만).
- 상한 2문장(미해소 충돌 설명이 꼭 필요할 때만 3). 상한을 맞출 땐 *'빼라' 항목부터* 버려라 — '담아라'는 마지막까지 지킨다.
- 이름은 *의미·파생에 대해서도* 저신뢰다 — 예: 'appliedRate' 는 그게 기준금리−할인인지 이름만으론 모른다. 이름만 근거인 주장은 *검증(retrieve)하거나 한정(hedge)*하고, 어긋나면 교정하라("이름은 X 시사하나 실제 Y").

[신호 — 두 티어. 싼 것부터, dig 는 결손이 남을 때만]
tier-1 (미리 구축된 store 조회, 쌈):
- peek_orm      : 파싱된 ORM(필드명·타입·enum·어노테이션·format·join·deprecated). enum 이 있으면 라벨을 직접 줌.
- peek_profile  : 데이터 프로파일(값공간 distinct·형식·카디널리티·null율). 값공간·형식은 여기서.
- peek_reftable : 전역 공통코드 덤프(그룹별 코드→라벨). 이 컬럼과의 *연결은 미선언* — 값집합 매칭이나 코드 탐색으로 직접 이어야 한다.
tier-2 (코드 코퍼스 dig, 비쌈 — 정적 신호로 라벨/의미/계보가 안 풀릴 때만):
- grep_code {query} : 코퍼스 전문 검색 → {file,line,text} 목록.
- read_file {path}  : 파일 전문 읽기.
- find_refs {symbol}: 식별자 참조 위치.

[★ 연결 검증 — 가장 중요]
코드를 뒤져 라벨 매핑(예: case "01": "접수")을 찾았을 때, 그게 *이 컬럼의 권위*인지 반드시 검증하라:
- 값집합이 겹친다고 권위가 아니다. 서로 다른 코드 그룹이 같은 값({01,02,03})을 쓴다.
- 검증 신호: 그 매핑이 *이 컬럼의 ORM 필드명*을 키로 하는가(예: switch(loanStatusCode))? 같은 엔티티/도메인인가?
- 필드 연결이 확인되면 그 매핑을 근거로 채택(신뢰도↑ 가능).
- 값만 겹치고 연결이 확인 안 되면 채택하지 마라 — 추정으로 한정하거나, 후보가 여럿이면 conflicts 에 적고, 권위가 없으면 route_to_human.

[근거·충돌·신뢰도]
- 근거 없는 특정 라벨/분류를 단정 마라. 추정이면 한정("…로 추정, 미확인").
- 신호가 비어 오면 정보 부재(증거 부재)지 부정 증거가 아니다.
- 소스 간 값이 어긋나면(매핑 키 vs 실제 값집합 등) conflicts 에 적고 신뢰도↓.
- LOW = 접근 가능한 모든 신호(tier-1+tier-2)를 소진하고도 권위 미확인. 못 풀어도 잔여정보(값공간·빈도·아는 것 + 명시적 미상) 최대화. "불명"으로 붕괴 금지.
- 권위가 어디에도 없고 결과가 중요하면 route_to_human.needed=true.

[Confidence]
- HIGH : 단정한 주장이 *검증*됨 (값매칭·이름추정 같은 추론은 검증이 아니다). 미해소 충돌 없음.
- MEDIUM: 정체는 서나 값/라벨/연결이 추정·미검증, 또는 경미한 충돌을 한정.
- LOW : 정체부터 불확실하거나 권위 미확인.

[출력 — JSON 하나. 마크다운/펜스 금지]
op:     {"action":"op","op":"<도구명>","args":{...},"thinking":"왜 이 조회가 필요한지 1문장"}
answer: {"action":"answer","description":"NL이 get_column 으로 못 얻는 사실만, 상한 2문장 (담아라 우선, 빼라 항목 버림)","confidence":"HIGH|MEDIUM|LOW","evidence":["쓴 신호+출처 예: orm, profile, code:LoanApplicationService.java"],"conflicts":[{"type":"…","detail":"…"}],"route_to_human":{"needed":false,"reason":""},"thinking":"1문장"}
같은 op 를 같은 인자로 반복하지 마라. [남은 횟수] 0 이면 반드시 answer.`;

// ── 도구 구현 (순수 함수, store/corpus 주입) ────────────────────────────────
function makeTools(store, corpus) {
  const col = (cid) => (store.columns[cid] || null);

  function peek_orm(cid) {
    const r = col(cid); if (!r) return { error: "unknown column" };
    return r.orm && r.orm.present ? r.orm : { present: false, note: "orm 신호 없음(정보 부재)" };
  }
  function peek_profile(cid) {
    const r = col(cid); if (!r) return { error: "unknown column" };
    return r.profile && r.profile.present ? r.profile : { present: false, note: "프로파일 없음" };
  }
  function peek_reftable(cid) {
    const r = col(cid); if (!r) return { error: "unknown column" };
    return {
      column_linked: !!(r.reftable && r.reftable.present), // 데모: 전 컬럼 미선언
      note: "이 컬럼→그룹 연결은 미선언. 아래 덤프와 값집합 매칭/코드 탐색으로 직접 이어라.",
      dump: store.reftable_dump || {},
    };
  }
  function grep_code(args) {
    const q = (args && args.query || "").trim();
    if (!q) return { error: "query 필요" };
    const hits = [];
    for (const [path, text] of Object.entries(corpus)) {
      text.split("\n").forEach((line, i) => {
        if (line.includes(q)) hits.push({ file: path, line: i + 1, text: line.trim() });
      });
    }
    return { query: q, count: hits.length, matches: hits.slice(0, 30) };
  }
  function read_file(args) {
    const p = args && args.path;
    if (!p) return { error: "path 필요" };
    if (corpus[p] != null) return { path: p, content: corpus[p] };
    // 경로 느슨 매칭(파일명만 줘도)
    const k = Object.keys(corpus).find((x) => x.endsWith("/" + p) || x.endsWith(p));
    return k ? { path: k, content: corpus[k] } : { error: "파일 없음: " + p };
  }
  function find_refs(args) {
    const s = (args && args.symbol || "").trim();
    if (!s) return { error: "symbol 필요" };
    const re = new RegExp("\\b" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
    const hits = [];
    for (const [path, text] of Object.entries(corpus)) {
      text.split("\n").forEach((line, i) => {
        if (re.test(line)) hits.push({ file: path, line: i + 1, text: line.trim() });
      });
    }
    return { symbol: s, count: hits.length, matches: hits.slice(0, 30) };
  }

  return { peek_orm, peek_profile, peek_reftable, grep_code, read_file, find_refs };
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

function userPrompt(store, cid, log, left) {
  const parts = [seedText(store, cid)];
  if (log.length) {
    parts.push("", "[조회/탐색 기록]");
    log.forEach((e, i) => {
      let body = JSON.stringify(e.result);
      if (body.length > 1200) body = body.slice(0, 1200) + "…(생략)";
      parts.push(`${i + 1}. ${e.op}(${JSON.stringify(e.args || {})}) → ${body}`);
    });
  }
  parts.push("", `[남은 횟수] ${left}`, "", "JSON 하나로 답하라.");
  return parts.join("\n");
}

// ── 루프 ─────────────────────────────────────────────────────────────────────
// callModel({system, user}) → 모델의 원문 텍스트(JSON 하나). 주입식.
async function run(cid, { store, corpus, callModel, onStep }) {
  const tools = makeTools(store, corpus);
  const log = [];
  const seen = new Set();
  const trace = [];

  for (let t = 0; t < MAX_OPS; t++) {
    const left = MAX_OPS - t;
    const user = userPrompt(store, cid, log, left);
    const raw = await callModel({ system: RENDER_SYS, user });
    let action;
    try {
      action = JSON.parse(stripFences(raw));
    } catch (e) {
      // 파싱 실패 → 한 번 더 기회를 주되 기록
      trace.push({ kind: "parse_error", raw });
      if (onStep) onStep({ kind: "parse_error", raw });
      continue;
    }

    if (action.action === "answer") {
      trace.push({ kind: "answer", ...action });
      if (onStep) onStep({ kind: "answer", ...action });
      return { cid, answer: action, trace, ops: log.length };
    }

    if (action.action === "op") {
      const op = action.op;
      const args = action.args || {};
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
      if (onStep) onStep(step);
      continue;
    }

    // 알 수 없는 액션 → 기록 후 계속
    trace.push({ kind: "unknown", action });
    if (onStep) onStep({ kind: "unknown", action });
  }

  // 상한 도달 — 강제 종결 신호를 마지막 한 번 더 요청
  const user = userPrompt(store, cid, log, 0);
  const raw = await callModel({ system: RENDER_SYS, user });
  let action;
  try { action = JSON.parse(stripFences(raw)); } catch (e) { action = null; }
  if (action && action.action === "answer") {
    trace.push({ kind: "answer", ...action });
    if (onStep) onStep({ kind: "answer", ...action });
    return { cid, answer: action, trace, ops: log.length };
  }
  const forced = { action: "answer", description: "신호 소진, 권위 미확인.",
    confidence: "LOW", evidence: log.map((l) => l.op), conflicts: [],
    route_to_human: { needed: true, reason: "상한 도달·미해소" }, thinking: "강제 종결" };
  trace.push({ kind: "answer", ...forced, forced: true });
  if (onStep) onStep({ kind: "answer", ...forced, forced: true });
  return { cid, answer: forced, trace, ops: log.length, forced: true };
}

function dispatch(tools, op, cid, args) {
  switch (op) {
    case "peek_orm": return tools.peek_orm(cid);
    case "peek_profile": return tools.peek_profile(cid);
    case "peek_reftable": return tools.peek_reftable(cid);
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

const API = { RENDER_SYS, MAX_OPS, makeTools, manifest, seedText, userPrompt, run, dispatch, stripFences };
if (typeof module !== "undefined" && module.exports) module.exports = API;
else root.RenderAgent = API;

})(typeof window !== "undefined" ? window : globalThis);
