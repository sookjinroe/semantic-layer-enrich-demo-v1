// app.jsx — 통합 셸: 해시 키 부트스트랩 + 데이터셋 셀렉터 + 모델 선택 + 탭.
//   '#k=sk-ant-...' 로 접속하면 localStorage 저장 후 주소에서 즉시 제거(서버 미전송).
//
// 탭 구성:
//   intro     · 소개
//   agent_v2  · Render v2 (Description) — 프롬프트 셀렉터 노출
//   agent_v3  · Render v3 (구조화 슬롯) — 프롬프트 셀렉터 없음(단일)
//   explorer  · 데이터 · 코드 탐색
// v2 와 v3 는 뷰가 다르기 때문에 탭으로 분리. RenderScreen 이 mode props 로 받음.
//
// 데이터셋:
//   mock       — 한국 금융권 6테이블 10컬럼 (자체 mock, PoC)
//   fineract   — Apache Fineract 24테이블 135컬럼 (외부 자연 발생물, 검증)
//   좌측 상단 셀렉터로 전환. localStorage 유지, 전환 시 페이지 리로드.
(function () {
  const m = location.hash.match(/^#k=(sk-ant-[A-Za-z0-9_\-]+)/);
  if (m) { localStorage.setItem("anthropic_key", m[1]); history.replaceState(null, "", location.pathname + location.search); }
})();

const DATASETS = {
  mock: {
    id: "mock", label: "Mock",
    tag: "한국 금융권 PoC",
    color: "var(--sig)",  // 파랑 계열
    stats: "6테이블 · 10컬럼",
    desc: "자체 제작 mock — Render 로직 시연·debugging.",
  },
  fineract: {
    id: "fineract", label: "Fineract",
    tag: "Apache Fineract",
    color: "var(--accent)",  // 앰버
    stats: "24테이블 · 135컬럼",
    desc: "Apache Fineract 코어뱅킹 자연 발생 데이터 — 외부 검증 환경.",
  },
};

const { useState: aUseState, useRef: aUseRef, useEffect: aUseEffect } = React;

function DatasetSelector({ current, onChange }) {
  const [open, setOpen] = aUseState(false);
  const ref = aUseRef(null);
  aUseEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const ds = DATASETS[current];
  return (
    <div ref={ref} style={{ position: "relative", marginRight: 12, paddingBottom: 7 }}>
      <div onClick={() => setOpen(!open)}
        style={{ fontFamily: "var(--mono)", fontSize: 13, cursor: "pointer",
          border: `1px solid ${ds.color}66`, borderRadius: 4,
          padding: "4px 10px", background: "rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 7, background: ds.color, flexShrink: 0 }} />
        <span style={{ color: ds.color, fontWeight: 600 }}>{ds.label}</span>
        <span style={{ color: "var(--dim)", fontSize: 11.5 }}>{ds.stats}</span>
        <span style={{ color: "var(--dim)", fontSize: 10, marginLeft: 2 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 100,
          background: "#14171c", border: "1px solid var(--rule)", borderRadius: 5,
          boxShadow: "0 6px 20px rgba(0,0,0,0.5)", width: 320, padding: 6 }}>
          {Object.values(DATASETS).map((d) => {
            const active = d.id === current;
            return (
              <div key={d.id} onClick={() => { if (!active) onChange(d.id); }}
                style={{ padding: "10px 12px", borderRadius: 4, cursor: active ? "default" : "pointer",
                  background: active ? "rgba(255,255,255,0.05)" : "transparent",
                  transition: "background .12s",
                  ...(active ? {} : { ":hover": { background: "rgba(255,255,255,0.03)" } }) }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 8, background: d.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 13.5, color: d.color, fontWeight: 600 }}>{d.label}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>{d.tag}</span>
                  {active && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginLeft: "auto" }}>현재</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginLeft: 16 }}>
                  {d.desc}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--faint)", marginLeft: 16, marginTop: 2 }}>
                  {d.stats}
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid var(--rule)", marginTop: 4, padding: "8px 12px",
            fontSize: 11, color: "var(--dim)", lineHeight: 1.5 }}>
            데이터셋 전환 시 페이지가 새로고침되고 실행 결과가 초기화됩니다.
          </div>
        </div>
      )}
    </div>
  );
}

function switchDataset(newId) {
  localStorage.setItem("render_dataset", newId);
  location.reload();
}

function AppShell() {
  const [tab, setTab] = aUseState("intro");
  const [model, setModelState] = aUseState(window.RenderAPI.getModel());
  const [prompt, setPromptState] = aUseState(window.RenderPrompts.getSelectedId());
  const dataset = window.RENDER_DATASET || "mock";
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
        <DatasetSelector current={dataset} onChange={switchDataset} />
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
