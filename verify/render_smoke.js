// render_smoke.js — jsdom 으로 app.jsx 실제 마운트 검증.
const { JSDOM } = require("jsdom");
const babel = require("@babel/core");
const fs = require("fs"), path = require("path");

const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { url: "http://localhost/" });
global.window = dom.window; global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.React = require("react");
global.ReactDOM = require("react-dom/client");

// 데이터 번들 주입 (JSON 직접)
const ROOT = path.join(__dirname, "..");
const store = JSON.parse(fs.readFileSync(path.join(ROOT, "data/signal_store.json"), "utf8"));
window.SIGNAL_STORE = store;
window.CORPUS = {};  // 정적 렌더엔 불필요
window.RenderSnapshot = {};
window.RenderAgent = require(path.join(ROOT, "js/agent.js"));
// RenderAPI mock (fetch/localStorage 회피)
window.RenderAPI = { MODELS: [{ id: "claude-sonnet-4-6", label: "Sonnet 4.6" }],
  getModel: () => "claude-sonnet-4-6", setModel: () => {}, getKey: () => "", setKey: () => {},
  callModel: async () => "{}" };

const code = babel.transformFileSync(path.join(ROOT, "app.jsx"),
  { presets: [require("@babel/preset-react")] }).code;
eval(code);

setTimeout(() => {
  const d = dom.window.document;
  let pass = 0, fail = 0;
  const a = (n, c) => c ? (pass++, console.log("  [PASS] " + n)) : (fail++, console.log("  [FAIL] " + n));
  a("헤더 렌더", /Render/.test((d.querySelector(".hdr-title") || {}).textContent || ""));
  a("컬럼 목록 10행", d.querySelectorAll(".col-row").length === 10);
  a("아키타입 표시", /충돌-크럭스|floor/.test(d.body.textContent));
  a("활성 컬럼 트레이스 헤드", !!d.querySelector(".th-cid"));
  a("매니페스트 시드 노출", /매니페스트/.test(d.body.textContent));
  a("실행 버튼", !!d.querySelector(".run"));
  console.log(`\n${pass}/${pass + fail} PASS`);
  process.exit(fail ? 1 : 0);
}, 300);
