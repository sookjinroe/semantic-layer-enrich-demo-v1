// app.jsx — 통합 셸: 해시 키 부트스트랩 + 모델 선택 + 탭 (NL2SQL-Agent 패턴).
//   '#k=sk-ant-...' 로 접속하면 localStorage 저장 후 주소에서 즉시 제거(서버 미전송).
(function () {
  const m = location.hash.match(/^#k=(sk-ant-[A-Za-z0-9_\-]+)/);
  if (m) { localStorage.setItem("anthropic_key", m[1]); history.replaceState(null, "", location.pathname + location.search); }
})();

const { useState: aUseState } = React;
function AppShell() {
  const [tab, setTab] = aUseState("agent");
  const [model, setModelState] = aUseState(window.RenderAPI.getModel());
  const tabs = [["agent", "에이전트"], ["explorer", "데이터 · 코드 탐색"]];
  return (
    <div>
      <div style={{ display: "flex", gap: 4, padding: "10px 16px 0", borderBottom: "1px solid var(--rule)", alignItems: "flex-end" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, color: "var(--accent)", paddingBottom: 8, marginRight: 8 }}>
          Render<span style={{ color: "var(--dim)", fontWeight: 400 }}>·v2</span>
        </div>
        {tabs.map(([k, label]) => (
          <div key={k} onClick={() => setTab(k)}
            style={{ fontFamily: "var(--mono)", fontSize: 14.5, padding: "7px 16px", cursor: "pointer",
              color: tab === k ? "var(--text)" : "var(--dim)",
              borderBottom: tab === k ? "2px solid var(--accent)" : "2px solid transparent" }}>{label}</div>))}
        <div style={{ flex: 1 }} />
        <select value={model} onChange={(e) => { window.RenderAPI.setModel(e.target.value); setModelState(e.target.value); }}
          style={{ fontFamily: "var(--mono)", fontSize: 13.5, background: "rgba(0,0,0,0.3)", color: "var(--text)",
            border: "1px solid var(--rule)", borderRadius: 4, padding: "4px 8px", marginBottom: 7 }}>
          {window.RenderAPI.MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <div style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--dim)", paddingBottom: 10, marginLeft: 12 }}>corpus-v1</div>
      </div>
      <div style={{ display: tab === "agent" ? "block" : "none" }}><window.RenderScreen /></div>
      {tab === "explorer" && <window.RenderExplorer />}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<AppShell />);
