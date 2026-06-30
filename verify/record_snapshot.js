// ============================================================
// record_snapshot.js — 실제 모델로 전 컬럼 실행 → 스냅샷 녹화 + 결과 요약.
//
// 환경변수:
//   ANTHROPIC_KEY    : 필수
//   RENDER_MODEL     : 모델 (기본 claude-sonnet-4-6)
//   RENDER_PROMPT_ID : "balanced_v3" (기본) | "compact" | "balanced" | "verbose"
//                      v3 외의 값은 v2 prompts.js 의 셋. compact 는 agent.js 의 RENDER_SYS.
//   RENDER_RAW_LOG   : "1" 이면 각 컬럼의 raw 모델 응답을 data/_raw_<cid>.txt 로 덤프.
//
// 산출물:
//   data/render-snapshot-data.js — window.RenderSnapshot.
//     헤더 메타: version·kind·model·prompt_id·created.
//     results[cid]: { trace, answer, model }.
//   data/_summary.json — 컬럼별 요약(아키타입·신뢰도·ops·dig·human·conflicts·v3 슬롯 채움).
//
// ★ BALANCED_V3 텍스트는 js/prompts.js 의 BALANCED_V3 와 *반드시* 일치해야 한다.
//   둘 다 손봐야 한다 — 별도 모듈 분리는 적용 파일 수를 줄이려 의도적으로 안 했다.
// ============================================================
const fs = require("fs"), path = require("path");
global.window = {};
require("../data/signal-store.js");
require("../data/corpus-index.js");
const store = global.window.SIGNAL_STORE;
const corpus = global.window.CORPUS;
const Agent = require("../js/agent.js");

const KEY = process.env.ANTHROPIC_KEY;
const MODEL = process.env.RENDER_MODEL || "claude-sonnet-4-6";
const PROMPT_ID = process.env.RENDER_PROMPT_ID || "balanced_v3";
const RAW_LOG = process.env.RENDER_RAW_LOG === "1";
if (!KEY) { console.error("ANTHROPIC_KEY 필요"); process.exit(1); }

// ─── BALANCED_V3 — js/prompts.js 의 BALANCED_V3 와 일치 ─────────────────────
const BALANCED_V3 = `너는 "Render"라는 시맨틱 레이어 증강 에이전트다. DB 컬럼 하나에 대해, NL2SQL 에이전트가 소비할 시맨틱 레이어 슬롯들을 합성한다.

[네가 쓰는 것 vs 추출이 쓰는 것]
- 너는 description·capability·codedict·format·aggregation·confidence·evidence·conflicts·route_to_human 을 작성한다.
- classification(PII 등 민감도)은 추출 담당이다 — 네가 새로 만들지 말고, 신호에서 읽어서 description 에 인용하고 충돌을 잡는 데만 써라.

[슬롯 — 무엇을, 언제, 어떻게]

(1) description — 항상 작성. 2문장 이내(미해소 충돌 설명이 꼭 필요할 때만 3).
- 소비자(NL)는 get_column 으로 이름·타입·nullable·pk·fk 를 이미 본다. description 은 거기서 못 얻는 사실만.
- 담아라(해당하면): 비슷한 컬럼과의 구분, 값의 출처(계보), 주의점·빈틈, 분류(PII 등 — 추출 신호 인용).
- 빼라(반드시): 이미 아는 것(타입·null·"N자리 코드" 재서술), 분포·퍼센트·빈도 나열, 일반 SQL 설명, 출처(→ evidence 에만), 다른 슬롯이 구조화로 담는 것(코드값 라벨·날짜 형식·집계 방식 — 그건 codedict/format/aggregation 슬롯의 일).
- 컬럼 이름은 뜻·계산식까지 그대로 믿지 마라. 'appliedRate' 가 기준금리−할인인지는 이름만으론 모른다. 이름만 근거인 주장은 코드/데이터로 확인하거나 추정이라고 표시하고, 다르면 바로잡아라("이름은 X 같지만 실제로는 Y").

(2) capability.primary — 컬럼이 시맨틱 레이어에서 어떤 역할로 쓰이는가. 다섯 값 중 하나:
- "entity" : 행을 식별하는 키(PK 또는 그에 준하는 식별자). FK 로 참조되거나, ORM 의 @Id, 필드명이 *Id·*No·*Cd 같은 식별자 패턴.
- "categorical_dimension" : 묶고 거르는 범주축. 코드 컬럼(_CD·_FLG·_YN), distinct 가 작고 값이 코드 형태, ORM enum/외부 코드표 매칭.
- "time_dimension" : 시점 축. DATE/TIMESTAMP 타입, 또는 문자열인데 값 형식이 날짜(YYYYMMDD·YYYY-MM 등), 컬럼명 *_DT·*_YM·*_TS.
- "measure" : 집계되는 수치. 숫자 타입에 분포가 연속·금액·카운트, 컬럼명 *_AMT·*_BAL·*_CNT·*_RATE.
- null : 신호로 어느 분류인지 못 가른다 — 두 후보가 다 정당하고 결정 신호가 없거나, 분류 어휘에 안 맞는 메타데이터적 성격일 때. "LOW 로 붕괴" 가 아니라 정직한 미분류로 두고 alternatives 에 후보들, reasoning 에 못 정한 이유를 적는다.

(3) capability 결정 규칙
- 한 분류로 명확히 가리키는 신호가 둘 이상이면 → primary 그 분류, alternatives 빈 배열.
- 한 분류만 가리키지만 신호가 하나뿐이면 → primary 그 분류, alternatives 빈 배열, reasoning 에 약한 근거임을 명시.
- 두 분류가 다 정당해 보이고(예: 등급 코드를 그룹 축으로도 집계 대상으로도 씀) 결정 신호가 없으면 → primary null, alternatives 에 두 후보, reasoning 에 둘 다 정당한 이유.
- alternatives 가 비어 있지 않으면 top-level confidence 는 자동으로 HIGH 가 될 수 없다(MEDIUM 이하).

(4) codedict — capability.primary 가 "categorical_dimension" 일 때만 의미값. 그 외엔 빈 배열.
- 권위 있는 매핑이 확인되면 [{value, label}, ...] 로 채운다.
- 권위 미확인이면 빈 배열 + conflicts/route_to_human 으로 흘려라. 추정으로 채우지 마라.
- ★ 권위 검증: 코드에서 라벨 매핑을 찾았다고 그게 이 컬럼의 권위인 건 아니다. 서로 다른 코드 그룹이 같은 값({01,02,03})을 쓴다. 확인 방법은 그 매핑이 이 컬럼의 ORM 필드명을 키로 쓰는가(switch(loanStatusCode))·같은 엔티티/도메인인가. 값만 겹치고 연결 미확인이면 채택 금지.
- ORM enum 이 직접 매핑을 주면 1차 권위. peek_reftable 후보는 grep_code/read_file 로 연결 검증해야 채택.

(5) format — capability.primary 가 "time_dimension" 일 때만 의미값. 그 외엔 null.
- 데이터에 나타나는 실제 형식을 그대로 적는다(예: "YYYYMM", "YYYY-MM-DD", "YYYYMMDD").
- peek_profile 의 inferred_format 이 1차 신호, peek_orm 의 format_pattern 이 보강.
- 못 정하면 null.

(6) aggregation — capability.primary 가 "measure" 일 때만 의미값. 그 외엔 additive null, suggested/observed_in_etl 빈 배열, reasoning 빈 문자열.
- additive : "yes" (금액·카운트 — 전 차원에서 SUM 가능), "semi" (잔액·스냅샷 — 동시점 SUM 가능, 시계열 SUM 무의미), "no" (비율·평균 — SUM 의미 없음). 결정 못 하면 null.
- suggested : 자연 집계 후보를 우선순위 순으로(["SUM"], ["AVG", "SUM"] 등). 권위 신호 없으면 빈 배열.
- observed_in_etl : grep_code 로 잡힌 실제 사용 패턴을 "SUM(LOAN_AMT) in v_loan_summary.sql line 12" 형태로 모은다. measure 일 땐 최소 1회 grep 시도. 없으면 빈 배열(= "찾았지만 없음").
- aggregation 은 일반적으로 description·capability 보다 신호가 간접적이라 confidence 를 흔들 수 있다 — 그건 자연스럽다.

(7) confidence — 관리자 검수용 top-level 하나. 슬롯별로 갈리지 않는다.
- 정의는 *작성한 슬롯 전체*를 종합:
  HIGH : 작성한 모든 슬롯의 단정 주장이 실제로 검증됨(값 우연 일치·이름 추정은 검증 아님). alternatives 빈 배열. 미해소 충돌 없음.
  MEDIUM : 정체는 분명하나 어떤 슬롯에서 권위·연결·라벨 중 하나가 추정·미검증, 또는 alternatives 가 채워짐, 또는 경미한 충돌을 한정해 흘림.
  LOW : description 의 정체부터 불확실, 또는 어느 슬롯이든 권위 미확인이 본질적으로 남음.
- 어느 슬롯이 끌어내렸는지는 thinking 또는 해당 슬롯의 reasoning 에 적는다. 슬롯별 confidence 필드는 두지 않는다.

(8) evidence / conflicts / route_to_human
- evidence : 쓴 신호+출처를 항상 "orm: ...", "profile: ...", "code:파일명" 형태로. 슬롯별 분리 안 하고 한 배열에 모은다.
- conflicts : 소스 간 값이 어긋나면 {type, detail}. capability 두 후보가 정당해 alternatives 에 둔 건 충돌이 아니라 모호이므로 conflicts 가 아니라 capability.reasoning 으로.
- route_to_human.needed = true : 어느 슬롯의 권위가 신호 소진 후에도 미확인이고 그 슬롯이 NL2SQL 동작에 중요할 때. reason 에 어느 슬롯의 어떤 권위가 안 잡혔는지 명시.

[신호 — 두 단계. 싼 것 먼저, 코드 파기는 부족할 때만]
1단계 (미리 구축된 store 조회, 쌈):
- peek_orm      : 파싱된 ORM(필드명·타입·enum·어노테이션·format·join·deprecated). enum 이 있으면 codedict 1차 권위.
- peek_profile  : 데이터 프로파일(값 종류 distinct·형식·카디널리티·null 비율). format·additive 판단의 1차 신호.
- peek_reftable : 전역 공통코드 표(그룹별 코드→라벨). 컬럼과의 연결은 미선언 — 값 일치나 코드 탐색으로 직접 이어야 한다.
2단계 (코드 코퍼스 파기, 비쌈 — 1단계로 안 풀릴 때):
- grep_code {query} : 코퍼스 검색 → {file,line,text} 목록. codedict 연결 검증, aggregation 사용 패턴.
- read_file {path}  : 파일 전체 읽기.
- find_refs {symbol}: 식별자 참조 위치.

[★ 핵심 원칙 — 모든 슬롯에 공통]
- 근거 없이 단정하지 마라. 추측이면 표시("…로 추정, 미확인") 또는 슬롯을 비운다.
- 신호가 비어서 돌아오면 "정보 없음"이지 "반대 사실의 증거"가 아니다.
- 모든 신호 소진 후에도 권위를 못 찾으면 그 슬롯은 비우거나 null. 추정으로 채우는 게 더 나쁘다.
- 슬롯 사이에 confidence 가 *서로 전염되지 않게* 한다 — aggregation 의 약함이 description 의 강함을 끌어내리거나 그 반대가 되지 않도록, 각 슬롯의 단정 강도는 그 슬롯의 자체 권위만 보고 판단한다. top-level confidence 는 마지막에 슬롯들을 종합해 정한다.

[출력 — JSON 하나. 마크다운/펜스 금지]
op:     {"action":"op","op":"<도구명>","args":{...},"thinking":"왜 이 조회가 필요한지 1문장"}
answer: {
  "action":"answer",
  "description":"...",
  "capability":{"primary":"...","alternatives":[],"reasoning":"..."},
  "codedict":[{"value":"...","label":"..."}],
  "format":"...",
  "aggregation":{"additive":"...","suggested":[],"observed_in_etl":[],"reasoning":"..."},
  "confidence":"HIGH|MEDIUM|LOW",
  "evidence":["orm: ...","profile: ...","code: ..."],
  "conflicts":[{"type":"...","detail":"..."}],
  "route_to_human":{"needed":false,"reason":""},
  "thinking":"1문장"
}
같은 op 를 같은 인자로 반복하지 마라. [남은 횟수] 0 이면 반드시 answer.`;

// PROMPT_ID 에 따라 system 선택. compact 면 미지정 → Agent.run 이 자체 RENDER_SYS 사용.
const SYSTEM_PROMPT = PROMPT_ID === "balanced_v3" ? BALANCED_V3 : null;
if (PROMPT_ID !== "balanced_v3" && PROMPT_ID !== "compact") {
  console.error(`[경고] PROMPT_ID="${PROMPT_ID}" 는 노드 측에서 지원 안 함 (balanced_v3 / compact 만). compact 로 폴백.`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// raw 응답 누적 — 컬럼별로 모인다. RAW_LOG 켜져 있으면 파일로 덤프.
const rawByCol = {};

async function callModel({ system, user }, cid) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 2048, system, messages: [{ role: "user", content: user }] }),
      });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      const d = await res.json();
      if (!d.content) throw new Error(JSON.stringify(d).slice(0, 200));
      const text = d.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      if (cid && RAW_LOG) {
        rawByCol[cid] = rawByCol[cid] || [];
        rawByCol[cid].push(text);
      }
      return text;
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(1200);
    }
  }
}

// v3 슬롯 채움 — answer 에서 추출.
function v3Filled(a) {
  if (!a) return { cap: false, codedict: false, format: false, agg: false };
  const cap = a.capability;
  const codedict = a.codedict;
  const fmt = a.format;
  const agg = a.aggregation;
  return {
    cap: !!(cap && (cap.primary || (cap.alternatives && cap.alternatives.length > 0) || cap.reasoning)),
    codedict: Array.isArray(codedict) && codedict.length > 0,
    format: !!fmt,
    agg: !!(agg && (agg.additive || (agg.suggested && agg.suggested.length > 0) || (agg.observed_in_etl && agg.observed_in_etl.length > 0) || agg.reasoning)),
  };
}

(async () => {
  const cols = Object.keys(store.columns).sort();
  const snapshot = {};
  const summary = [];
  let parseErrTotal = 0;

  for (const cid of cols) {
    process.stdout.write(`▶ ${cid} … `);
    try {
      const runOpts = { store, corpus, callModel: (msg) => callModel(msg, cid) };
      if (SYSTEM_PROMPT) runOpts.system = SYSTEM_PROMPT;
      const out = await Agent.run(cid, runOpts);
      snapshot[cid] = { trace: out.trace, answer: out.answer, model: MODEL };

      const a = out.answer;
      const digOps = out.trace.filter((s) => s.kind === "op" && ["grep_code","read_file","find_refs"].includes(s.op)).length;
      const parseErrs = out.trace.filter((s) => s.kind === "parse_error").length;
      parseErrTotal += parseErrs;
      const filled = v3Filled(a);

      summary.push({
        cid,
        arch: store.columns[cid].archetype,
        conf: a.confidence,
        ops: out.ops,
        dig: digOps,
        human: !!(a.route_to_human && a.route_to_human.needed),
        conflicts: (a.conflicts || []).length,
        parse_errs: parseErrs,
        v3: filled,
        desc: a.description,
      });
      const slot = [filled.cap?"C":"-", filled.codedict?"D":"-", filled.format?"F":"-", filled.agg?"A":"-"].join("");
      console.log(`${a.confidence.padEnd(6)} ops=${out.ops} dig=${digOps} human=${a.route_to_human && a.route_to_human.needed ? "Y" : "-"} conflicts=${(a.conflicts||[]).length} v3=[${slot}] parse_err=${parseErrs}`);
    } catch (e) {
      console.log("ERROR " + e.message);
      summary.push({ cid, error: e.message });
    }
    await sleep(400);
  }

  // ─── 스냅샷 헤더 (브라우저 뷰어 호환: results 키 + 메타) ──────────────────
  const header = {
    version: 1,
    kind: "render",
    model: MODEL,
    prompt_id: PROMPT_ID,
    created: new Date().toISOString(),
    results: snapshot,
  };

  const outFile = path.join(__dirname, "..", "data", "render-snapshot-data.js");
  fs.writeFileSync(
    outFile,
    "// 생성됨: verify/record_snapshot.js — 실제 모델 녹화. window.RenderSnapshot 전역.\n" +
    "window.RenderSnapshot = " + JSON.stringify(header, null, 2) + ";\n"
  );
  console.log(`\n=== 스냅샷 저장: ${cols.length}컬럼 → ${path.relative(process.cwd(), outFile)} ===`);
  console.log(`    prompt_id=${PROMPT_ID} model=${MODEL} parse_err_total=${parseErrTotal}`);

  // ─── 결과 요약 ──────────────────────────────────────────────────────────
  console.log("\n=== 결과 요약 ===");
  for (const s of summary) {
    if (s.error) { console.log(`  ${s.cid.padEnd(34)} ERROR ${s.error}`); continue; }
    const slot = [s.v3.cap?"C":"-", s.v3.codedict?"D":"-", s.v3.format?"F":"-", s.v3.agg?"A":"-"].join("");
    console.log(`  ${s.cid.padEnd(34)} [${(s.arch||"-").padEnd(14)}] ${s.conf.padEnd(6)} ops=${s.ops} dig=${s.dig} human=${s.human?"Y":"-"} cf=${s.conflicts} v3=[${slot}]`);
  }

  // ─── v3 슬롯 채움 분포 ──────────────────────────────────────────────────
  const filledCnt = { cap: 0, codedict: 0, format: 0, agg: 0 };
  let answered = 0;
  for (const s of summary) {
    if (s.error || !s.v3) continue;
    answered++;
    if (s.v3.cap) filledCnt.cap++;
    if (s.v3.codedict) filledCnt.codedict++;
    if (s.v3.format) filledCnt.format++;
    if (s.v3.agg) filledCnt.agg++;
  }
  console.log("\n=== v3 슬롯 채움 (응답 받은 컬럼 기준) ===");
  console.log(`  capability  : ${filledCnt.cap}/${answered}`);
  console.log(`  codedict    : ${filledCnt.codedict}/${answered}`);
  console.log(`  format      : ${filledCnt.format}/${answered}`);
  console.log(`  aggregation : ${filledCnt.agg}/${answered}`);

  // ─── 가설-핵심 컬럼 디스크립션 ──────────────────────────────────────────
  console.log("\n=== 크럭스/floor 디스크립션 (육안 검증) ===");
  for (const s of summary) {
    if (["LOAN_APPL_HIST.LOAN_STAT_CD","CONTACT_LOG.CHNL_CD","LOAN_APPL_HIST.APLD_RATE","DEP_ACCT.PROD_CD"].includes(s.cid) && s.desc)
      console.log(`\n[${s.cid}]\n  ${s.desc}`);
  }

  fs.writeFileSync(path.join(__dirname, "..", "data", "_summary.json"), JSON.stringify(summary, null, 2));

  // ─── raw 로그 ────────────────────────────────────────────────────────────
  if (RAW_LOG) {
    for (const [cid, texts] of Object.entries(rawByCol)) {
      const safe = cid.replace(/[^\w.]/g, "_");
      fs.writeFileSync(path.join(__dirname, "..", "data", `_raw_${safe}.txt`), texts.join("\n\n--- TURN BOUNDARY ---\n\n"));
    }
    console.log(`\n[raw 로그] ${Object.keys(rawByCol).length} 컬럼의 raw 응답을 data/_raw_*.txt 로 덤프.`);
  }
})();
