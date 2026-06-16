const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const fs = require("fs"), path = require("path");
const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { url: "http://localhost/" });
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator;
global.location = dom.window.location; global.history = dom.window.history;
global.React = require("react"); global.ReactDOM = require("react-dom/client");
const ROOT = path.join(__dirname, "..");
// 번들
global.window.SIGNAL_STORE = JSON.parse(fs.readFileSync(path.join(ROOT, "data/signal_store.json"), "utf8"));
function evalFile(p) { eval(fs.readFileSync(path.join(ROOT, p), "utf8")); }
evalFile("data/corpus-index.js");         // window.CORPUS
evalFile("data/render-snapshot-data.js"); // window.RenderSnapshot
evalFile("js/render-meta.js");            // window.RenderMeta
global.window.RenderAgent = require(path.join(ROOT, "js/agent.js"));
global.window.RenderAPI = { hasKey: () => false, getKey: () => null, getModel: () => "claude-sonnet-4-6",
  setModel: () => {}, MODELS: [{ id: "claude-sonnet-4-6", label: "S" }], callModel: async () => "{}", ready: Promise.resolve() };
function evalJsx(p) { const code = babel.transformFileSync(path.join(ROOT, p), { presets: [require("@babel/preset-react")] }).code; eval(code); }
evalJsx("js/render-screen.jsx"); evalJsx("js/explorer.jsx"); evalJsx("app.jsx");

setTimeout(() => {
  const d = dom.window.document; let pass = 0, fail = 0;
  const a = (n, c, x) => c ? (pass++, console.log("  [PASS] " + n)) : (fail++, console.log("  [FAIL] " + n + " " + (x || "")));
  const txt = () => d.body.textContent;
  // 1) 셸 + 탭
  a("탭: 에이전트", /에이전트/.test(txt()));
  a("탭: 데이터·코드 탐색", /데이터 · 코드 탐색/.test(txt()));
  a("모델 셀렉트", !!d.querySelector("select"));
  // 2) 컬럼 목록
  a("테이블 그룹(대출 신청이력)", /대출 신청이력/.test(txt()));
  a("컬럼 LOAN_STAT_CD", /LOAN_STAT_CD/.test(txt()));
  a("컬럼 CHNL_CD", /CHNL_CD/.test(txt()));
  a("전체 실행 버튼", /전체 실행/.test(txt()));
  a("스냅샷 불러오기 버튼", /스냅샷 불러오기/.test(txt()));
  a("KeyBox(키 없음)", /Anthropic 키 입력/.test(txt()));
  // 3) 스냅샷 불러오기 클릭 → 결과 채워짐
  const btns = [...d.querySelectorAll("button")];
  const loadBtn = btns.find((b) => /스냅샷 불러오기/.test(b.textContent));
  loadBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  setTimeout(() => {
    a("스냅샷 로드 노트", /스냅샷 로드/.test(d.body.textContent));
    a("요약 패널(HIGH/MED/LOW)", /HIGH \d/.test(d.body.textContent));
    const target = [...d.querySelectorAll("div")].find((e) => /^LOAN_STAT_CD/.test(e.textContent.trim()) && e.onclick);
    if (target) target.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    setTimeout(() => {
      const t = d.body.textContent;
      a("트레이스 op 렌더", /peek_orm|grep_code|조회 완료|peek|dig/.test(t));
      a("답변 카드 신뢰도", /HIGH|MEDIUM|LOW/.test(t));
      a("컬럼 상세 패널(매니페스트)", /매니페스트|스키마/.test(t));
      // 4) 탐색 탭
      const tab = [...d.querySelectorAll("div")].find((e) => e.textContent.trim() === "데이터 · 코드 탐색" && e.onclick);
      tab.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      setTimeout(() => {
        const e = d.body.textContent;
        a("탐색: 아키타입 개요", /아키타입 · 각 컬럼이 검증하는 것/.test(e));
        a("탐색: 신호 탭 존재", /신호 · 매니페스트/.test(e));
        a("탐색: 코퍼스 탭 존재", /코퍼스 · 코드베이스/.test(e));
        console.log(`\n${pass}/${pass + fail} PASS`);
        process.exit(fail ? 1 : 0);
      }, 60);
    }, 60);
  }, 60);
}, 300);
