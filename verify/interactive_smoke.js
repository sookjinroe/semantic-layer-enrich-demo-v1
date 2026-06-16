const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const fs = require("fs"), path = require("path");
const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { url: "http://localhost/" });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator;
global.React = require("react"); global.ReactDOM = require("react-dom/client");
const ROOT = path.join(__dirname, "..");
window.SIGNAL_STORE = JSON.parse(fs.readFileSync(path.join(ROOT, "data/signal_store.json"), "utf8"));
// 실제 코퍼스 로드
global.window.CORPUS = undefined;
eval(fs.readFileSync(path.join(ROOT, "data/corpus-index.js"), "utf8")); // sets window.CORPUS
window.RenderSnapshot = {};
window.RenderAgent = require(path.join(ROOT, "js/agent.js"));

// 크럭스 올바른 경로 스크립트
const steps = [
  { action: "op", op: "peek_orm", thinking: "enum 확인" },
  { action: "op", op: "peek_profile", thinking: "값공간" },
  { action: "op", op: "grep_code", args: { query: "loanStatusCode" }, thinking: "필드명으로 권위 탐색" },
  { action: "op", op: "read_file", args: { path: "LoanApplicationService.java" }, thinking: "매핑+연결 검증" },
  { action: "answer", description: "대출 신청 상태 코드. 01=접수·02=심사중·03=승인·04=거절(loanStatusCode 매핑으로 검증). 데이터에 '05' 추가 관측되나 매핑에 없음.",
    confidence: "MEDIUM", evidence: ["orm", "profile", "code:LoanApplicationService.java"],
    conflicts: [{ type: "mapping_vs_data", detail: "매핑 {01-04} vs 데이터 {01-05}" }],
    route_to_human: { needed: false, reason: "" }, thinking: "연결 검증됨" },
];
let si = 0;
window.RenderAPI = { MODELS: [{ id: "claude-sonnet-4-6", label: "S" }], getModel: () => "x",
  setModel: () => {}, getKey: () => "dummy-key", setKey: () => {},
  callModel: async () => JSON.stringify(steps[Math.min(si++, steps.length - 1)]) };

const code = babel.transformFileSync(path.join(ROOT, "app.jsx"), { presets: [require("@babel/preset-react")] }).code;
eval(code);

setTimeout(async () => {
  const d = dom.window.document;
  // LOAN_STAT_CD 행을 클릭해 활성화
  const rows = [...d.querySelectorAll(".col-row")];
  const target = rows.find(r => /LOAN_STAT_CD/.test(r.textContent));
  target.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await new Promise(r => setTimeout(r, 50));
  // 실행 버튼 클릭
  const runBtn = d.querySelector(".run");
  runBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  // 루프 완료 대기
  await new Promise(r => setTimeout(r, 1200));
  let pass = 0, fail = 0;
  const a = (n, c) => c ? (pass++, console.log("  [PASS] " + n)) : (fail++, console.log("  [FAIL] " + n));
  a("dig 스텝 렌더(grep_code)", /grep_code/.test(d.body.textContent));
  a("연결 검증 태그 렌더", /연결 검증/.test(d.body.textContent));
  a("answer 카드 렌더", !!d.querySelector(".answer"));
  a("MEDIUM 신뢰도", /MEDIUM/.test((d.querySelector(".conf") || {}).textContent || ""));
  a("conflict 렌더(05)", /05|mapping_vs_data/.test((d.querySelector(".conflict") || {}).textContent || ""));
  a("evidence 출처 칩(code:)", /code:/.test(d.body.textContent));
  console.log(`\n${pass}/${pass + fail} PASS`);
  process.exit(fail ? 1 : 0);
}, 300);
