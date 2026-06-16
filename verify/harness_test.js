// harness_test.js — mock 모델로 에이전트 코어 하니스 검증 (노드 헤드리스).
// 실제 모델 없이: 도구 정확성 + 루프 구동 + 올바른/함정 경로 도달 가능성 확인.
global.window = {};
require("../data/signal-store.js");   // window.SIGNAL_STORE
require("../data/corpus-index.js");   // window.CORPUS
const store = global.window.SIGNAL_STORE;
const corpus = global.window.CORPUS;
const Agent = require("../js/agent.js");

let pass = 0, fail = 0;
function assert(name, cond, extra) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name} ${extra || ""}`); }
}

// 스크립트 모델: 단계별로 미리 정한 액션을 순서대로 반환 (op 결과는 무시하고 다음 스텝).
function scriptModel(steps) {
  let i = 0;
  return async () => JSON.stringify(steps[Math.min(i++, steps.length - 1)]);
}

(async () => {
  // ── 1) 도구 정확성 (직접 호출) ──────────────────────────────────────────
  console.log("\n== 도구 정확성 ==");
  const tools = Agent.makeTools(store, corpus);
  assert("peek_orm(JOIN_DT).field", tools.peek_orm("CUST_BASE_INFO.JOIN_DT").field === "joinDate");
  assert("peek_orm(LOAN_STAT_CD).enum null", !tools.peek_orm("LOAN_APPL_HIST.LOAN_STAT_CD").enum);
  assert("peek_profile(LOAN_STAT_CD) has 05",
    (tools.peek_profile("LOAN_APPL_HIST.LOAN_STAT_CD").distinct_sample || []).includes("05"));
  const g1 = tools.grep_code({ query: "loanStatusCode" });
  assert("grep loanStatusCode → 올바른 서비스 포함",
    g1.matches.some(m => m.file.includes("LoanApplicationService")), JSON.stringify(g1.count));
  assert("grep loanStatusCode → AccountStatus 미포함(필드 연결 깨끗)",
    !g1.matches.some(m => m.file.includes("AccountStatusService")));
  const g2 = tools.grep_code({ query: "channelCode" });
  assert("grep channelCode → 엔티티만(라벨 부재)",
    g2.matches.every(m => m.file.includes("ContactLog.java")), JSON.stringify(g2.matches));
  const rt = tools.peek_reftable("DEP_ACCT.PROD_CD");
  assert("peek_reftable → DEPOSIT_PROD 덤프", !!rt.dump.DEPOSIT_PROD && rt.column_linked === false);
  const rf = tools.read_file({ path: "LoanApplicationService.java" });
  assert("read_file 느슨매칭", rf.content && rf.content.includes("접수"));

  // ── 2) 루프 구동 + 경로 도달 가능성 ──────────────────────────────────────
  console.log("\n== 루프: control(JOIN_DT) — dig 없이 즉답 ==");
  const rCtrl = await Agent.run("CUST_BASE_INFO.JOIN_DT", { store, corpus, callModel: scriptModel([
    { action: "op", op: "peek_orm", thinking: "정체 확인" },
    { action: "answer", description: "고객 가입일자(YYYY-MM-DD).", confidence: "HIGH",
      evidence: ["orm", "profile"], conflicts: [], route_to_human: { needed: false, reason: "" },
      thinking: "이름+타입으로 정체 섬" },
  ]) });
  assert("control: answer HIGH", rCtrl.answer.confidence === "HIGH");
  assert("control: dig 0 (op 1=peek_orm만)", rCtrl.ops === 1, "ops=" + rCtrl.ops);

  console.log("\n== 루프: 크럭스(LOAN_STAT_CD) — 올바른 경로(연결 검증) ==");
  const rGood = await Agent.run("LOAN_APPL_HIST.LOAN_STAT_CD", { store, corpus, callModel: scriptModel([
    { action: "op", op: "peek_orm", thinking: "enum 확인" },
    { action: "op", op: "peek_profile", thinking: "값공간" },
    { action: "op", op: "grep_code", args: { query: "loanStatusCode" }, thinking: "필드명으로 권위 탐색" },
    { action: "op", op: "read_file", args: { path: "LoanApplicationService.java" }, thinking: "매핑+연결 검증" },
    { action: "answer",
      description: "대출 신청 상태 코드. 01=접수·02=심사중·03=승인·04=거절(LoanApplicationService 의 loanStatusCode 매핑으로 검증). 실데이터에 '05'가 추가 관측되나 매핑에 없음(미해소).",
      confidence: "MEDIUM", evidence: ["orm", "profile", "code:LoanApplicationService.java"],
      conflicts: [{ type: "mapping_vs_data", detail: "매핑 {01-04} vs 데이터 {01-05}; '05' 미매핑" }],
      route_to_human: { needed: false, reason: "" }, thinking: "필드 연결 검증됨" },
  ]) });
  assert("크럭스-good: 연결 검증 후 MEDIUM", rGood.answer.confidence === "MEDIUM");
  assert("크럭스-good: 05 conflict 명시", rGood.answer.conflicts.length === 1);
  assert("크럭스-good: 올바른 매핑 도달 가능(read_file 권위)",
    rGood.trace.some(s => s.kind === "op" && s.op === "read_file" &&
      s.result.content && s.result.content.includes("접수")));

  console.log("\n== 함정 경로 도달 가능성: 값 grep → AccountStatus 오귀속이 *가능*한가 ==");
  // 데이터가 함정을 허용하는지(나쁜 에이전트가 틀릴 수 있는지) 확인 — 검증의 의미.
  const gVal = tools.grep_code({ query: "case \"01\"" });
  assert("값 grep → 복수 후보(오귀속 가능)",
    gVal.matches.filter(m => m.file.includes("Service")).length >= 2, "count=" + gVal.count);
  const acct = tools.read_file({ path: "AccountStatusService.java" });
  assert("AccountStatus 라벨이 대출과 다름(정상/휴면…)",
    acct.content.includes("정상") && acct.content.includes("휴면"));

  console.log("\n== 루프: floor(CHNL_CD) — 권위 부재 → LOW + 사람 ==");
  const rFloor = await Agent.run("CONTACT_LOG.CHNL_CD", { store, corpus, callModel: scriptModel([
    { action: "op", op: "peek_orm", thinking: "enum 확인" },
    { action: "op", op: "peek_profile", thinking: "값공간" },
    { action: "op", op: "grep_code", args: { query: "channelCode" }, thinking: "라벨 탐색" },
    { action: "op", op: "peek_reftable", thinking: "공통코드에 있나" },
    { action: "answer",
      description: "고객 접촉 채널 코드. 실데이터에 4개 값(01~04, 01 최빈 55%)이 관측되나, 코드·공통코드·카탈로그 어디에도 라벨 매핑이 없어 각 값의 의미는 미확인.",
      confidence: "LOW", evidence: ["orm", "profile", "code:grep", "reftable"],
      conflicts: [], route_to_human: { needed: true, reason: "라벨 권위 부재 — 사람 확인 필요" },
      thinking: "dig 소진, 권위 없음" },
  ]) });
  assert("floor: LOW", rFloor.answer.confidence === "LOW");
  assert("floor: route_to_human", rFloor.answer.route_to_human.needed === true);
  assert("floor: 잔여정보 유지(값공간 언급)", /01|값/.test(rFloor.answer.description));

  console.log("\n== 상한 강제 종결 ==");
  const rCap = await Agent.run("CONTACT_LOG.CHNL_CD", { store, corpus, callModel: scriptModel([
    { action: "op", op: "grep_code", args: { query: "zzz_nomatch_" + Math.random() }, thinking: "무한 탐색" },
  ]) });
  // 매번 다른 인자가 아니라 같은 인자라 seen 가드 걸림 → 결국 상한/강제종결로 answer
  assert("상한: 강제 answer 산출", rCap.answer.action === "answer");

  console.log(`\n${pass}/${pass + fail} PASS`);
  process.exit(fail ? 1 : 0);
})();
