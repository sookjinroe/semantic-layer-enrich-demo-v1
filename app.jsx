// app.jsx — 통합 셸: 해시 키 부트스트랩 + 모델 선택 + 탭 (NL2SQL-Agent 패턴).
//   '#k=sk-ant-...' 로 접속하면 localStorage 저장 후 주소에서 즉시 제거(서버 미전송).
//
// 탭 구성:
//   intro     · 소개
//   agent_v2  · Render v2 (Description) — 프롬프트 셀렉터 노출
//   agent_v3  · Render v3 (구조화 슬롯) — 프롬프트 셀렉터 없음(단일)
//   explorer  · 데이터 · 코드 탐색
// v2 와 v3 는 뷰가 다르기 때문에 탭으로 분리. RenderScreen 이 mode props 로 받음.
(function () {
  const m = location.hash.match(/^#k=(sk-ant-[A-Za-z0-9_\-]+)/);
  if (m) { localStorage.setItem("anthropic_key", m[1]); history.replaceState(null, "", location.pathname + location.search); }
})();

const { useState: aUseState } = React;
function AppShell() {
  const [tab, setTab] = aUseState("intro");
  const [model, setModelState] = aUseState(window.RenderAPI.getModel());
  const [prompt, setPromptState] = aUseState(window.RenderPrompts.getSelectedId());
  const tabs = [
    ["intro",    "소개"],
    ["agent_v2", "Render v2"],
    ["agent_v3", "Render v3"],
    ["explorer", "데이터 · 코드 탐색"],
  ];
  const showPromptSelect = tab === "agent_v2";
  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "10px 16px 0", borderBottom: "1px solid var(--rule)", alignItems: "flex-end" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, color: "var(--accent)", paddingBottom: 8, marginRight: 8 }}>
          Render
        </div>
        {tabs.map(([k, label]) => (
          <div key={k} onClick={() => setTab(k)}
            style={{ fontFamily: "var(--mono)", fontSize: 14.5, padding: "7px 16px", cursor: "pointer",
              color: tab === k ? "var(--text)" : "var(--dim)",
              borderBottom: tab === k ? "2px solid var(--accent)" : "2px solid transparent" }}>{label}</div>))}
        <div style={{ flex: 1 }} />
        {showPromptSelect && (
          <select value={prompt} onChange={(e) => { window.RenderPrompts.setSelectedId(e.target.value); setPromptState(e.target.value); }}
            title="시스템 프롬프트 — v2 의 표현 변형 (v3 는 단일)"
            style={{ fontFamily: "var(--mono)", fontSize: 13.5, background: "rgba(0,0,0,0.3)", color: "var(--text)",
              border: "1px solid var(--rule)", borderRadius: 4, padding: "4px 8px", marginBottom: 7, marginRight: 8, maxWidth: 230 }}>
            {window.RenderPrompts.LIST.map((p) => <option key={p.id} value={p.id}>프롬프트: {p.label}</option>)}
          </select>
        )}
        <select value={model} onChange={(e) => { window.RenderAPI.setModel(e.target.value); setModelState(e.target.value); }}
          style={{ fontFamily: "var(--mono)", fontSize: 13.5, background: "rgba(0,0,0,0.3)", color: "var(--text)",
            border: "1px solid var(--rule)", borderRadius: 4, padding: "4px 8px", marginBottom: 7 }}>
          {window.RenderAPI.MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <div style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--dim)", paddingBottom: 10, marginLeft: 12 }}>corpus-v1</div>
      </div>
      {tab === "intro" && <window.RenderIntro />}
      {/* Render v2/v3 는 상태(results, active 등)를 각각 유지하도록 display:none 로 숨긴다 */}
      <div style={{ display: tab === "agent_v2" ? "block" : "none" }}><window.RenderScreen mode="v2" /></div>
      <div style={{ display: tab === "agent_v3" ? "block" : "none" }}><window.RenderScreen mode="v3" /></div>
      {tab === "explorer" && <window.RenderExplorer />}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<AppShell />);
