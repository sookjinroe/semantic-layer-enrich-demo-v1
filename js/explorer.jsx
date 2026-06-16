// ============================================================
// explorer.jsx — 데이터·코드 탐색 (NL2SQL-Agent explorer 패턴 계승).
//   개요 / 신호(매니페스트 store) / 코퍼스(코드베이스) 3뷰.
//   에이전트가 무엇을 보고 무엇을 dig하는지 — 가상 신호·코드를 직접 열람.
//   window.RenderExplorer 로 노출.
// ============================================================
const { useState: xUseState } = React;
const xmono = { fontFamily: "var(--mono)" };
const X_VIEWS = [["overview", "개요"], ["signals", "신호 · 매니페스트"], ["corpus", "코퍼스 · 코드베이스"]];

function RenderExplorer() {
  const [view, setView] = xUseState("overview");
  const store = window.SIGNAL_STORE, corpus = window.CORPUS;
  const nCols = Object.keys(store.columns).length;
  const nFiles = Object.keys(corpus).length;
  const nTables = new Set(Object.values(store.columns).map((c) => c.schema.table)).size;
  return (
    <div>
      <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--rule)" }}>
        {X_VIEWS.map(([k, label]) => (
          <div key={k} onClick={() => setView(k)} style={{ ...xmono, fontSize: 14, padding: "5px 13px", cursor: "pointer", borderRadius: 4,
            color: view === k ? "var(--text)" : "var(--dim)", background: view === k ? "rgba(255,255,255,0.06)" : "transparent" }}>{label}</div>))}
        <div style={{ flex: 1 }} />
        <div style={{ ...xmono, fontSize: 12.5, color: "var(--dim)" }}>{nTables}T · {nCols}C · 코퍼스 {nFiles}파일</div>
      </div>
      {view === "overview" && <Overview store={store} corpus={corpus} go={setView} />}
      {view === "signals" && <Signals store={store} />}
      {view === "corpus" && <Corpus corpus={corpus} />}
    </div>
  );
}

function Overview({ store, corpus, go }) {
  const A = window.RenderMeta.ARCH;
  const byArch = {};
  for (const [cid, c] of Object.entries(store.columns)) (byArch[c.archetype] = byArch[c.archetype] || []).push(cid.split(".").pop());
  return (
    <div style={{ padding: "24px 30px", maxWidth: 920 }}>
      <div style={{ ...xmono, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>가상으로 구축한 신호·코드베이스</div>
      <div style={{ fontSize: 14.5, color: "var(--muted, var(--dim))", lineHeight: 1.65, marginBottom: 22 }}>
        에이전트는 <b style={{ color: "var(--text)" }}>tier-1 신호</b>(미리 구축된 store — ORM·프로파일·공통코드 덤프)를 싸게 조회하고,
        안 풀리면 <b style={{ color: "var(--sig)" }}>tier-2</b>로 <b style={{ color: "var(--sig)" }}>코퍼스(코드)</b>를 dig한다. 여기서 그 둘을 직접 열람 —
        무엇이 주어졌고, 무엇이 일부러 빠져 dig를 강제하는지.
      </div>
      <div style={{ display: "flex", gap: 18, marginBottom: 24, flexWrap: "wrap" }}>
        <Stat n={Object.keys(store.columns).length} l="컬럼" onClick={() => go("signals")} />
        <Stat n={Object.keys(corpus).length} l="코퍼스 파일" onClick={() => go("corpus")} />
        <Stat n={Object.keys(store.reftable_dump || {}).length} l="공통코드 그룹" />
      </div>
      <div style={{ ...xmono, fontSize: 13, letterSpacing: "0.06em", color: "var(--dim)", marginBottom: 10 }}>아키타입 · 각 컬럼이 검증하는 것</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Object.entries(A).map(([k, a]) => (
          <div key={k} style={{ border: "1px solid var(--rule)", borderLeft: `3px solid ${a.color}`, borderRadius: 5, padding: "9px 12px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ ...xmono, fontSize: 12, color: a.color, fontWeight: 600 }}>{a.marker}</span>
              <span style={{ ...xmono, fontSize: 11.5, color: "var(--dim)" }}>{a.expect}</span>
              <span style={{ flex: 1 }} />
              <span style={{ ...xmono, fontSize: 11, color: "var(--dim)" }}>{(byArch[k] || []).join(", ")}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted, var(--dim))", lineHeight: 1.55, marginTop: 5 }}>{a.tip}</div>
          </div>))}
      </div>
    </div>
  );
}
function Stat({ n, l, onClick }) {
  return (
    <div onClick={onClick} style={{ border: "1px solid var(--rule)", borderRadius: 6, padding: "12px 20px", cursor: onClick ? "pointer" : "default", minWidth: 110 }}>
      <div style={{ ...xmono, fontSize: 26, fontWeight: 600, color: "var(--accent)" }}>{n}</div>
      <div style={{ fontSize: 13, color: "var(--dim)" }}>{l}</div>
    </div>);
}

// ---- 신호 (매니페스트 store) ----
function Signals({ store }) {
  const groups = window.RenderMeta.groupByTable();
  const [sel, setSel] = xUseState(groups[0].cols[0]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "calc(100vh - 100px)" }}>
      <div style={{ borderRight: "1px solid var(--rule)", overflowY: "auto", padding: "12px 10px" }}>
        {groups.map((g) => (
          <div key={g.table} style={{ marginBottom: 12 }}>
            <div style={{ ...xmono, fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>{g.label}</div>
            {g.cols.map((cid) => {
              const a = window.RenderMeta.arch(cid);
              return (
                <div key={cid} onClick={() => setSel(cid)} style={{ ...xmono, fontSize: 13, padding: "4px 8px", borderRadius: 4, cursor: "pointer",
                  display: "flex", gap: 6, alignItems: "center",
                  background: sel === cid ? "rgba(255,255,255,0.06)" : "transparent",
                  borderLeft: sel === cid ? "2px solid var(--accent)" : "2px solid transparent" }}>
                  <span style={{ flex: 1, color: "var(--text)" }}>{cid.split(".").pop()}</span>
                  <span style={{ fontSize: 10.5, color: a.color, border: `1px solid ${a.color}55`, borderRadius: 3, padding: "0 4px" }}>{a.marker}</span>
                </div>);
            })}
          </div>))}
      </div>
      <div style={{ overflowY: "auto", padding: "20px 26px" }}><SignalDetail cid={sel} store={store} /></div>
    </div>
  );
}
function SignalDetail({ cid, store }) {
  const r = store.columns[cid];
  const a = window.RenderMeta.arch(cid);
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ ...xmono, fontSize: 16, fontWeight: 600 }}>{cid}</div>
      <div style={{ display: "inline-block", ...xmono, fontSize: 11.5, color: a.color, border: `1px solid ${a.color}55`, borderRadius: 3, padding: "1px 7px", margin: "8px 0 16px" }}>{a.marker} · {a.expect}</div>
      <Block title="schema">{pretty(r.schema)}</Block>
      <Block title="orm (파싱된 엔티티)">{r.orm && r.orm.present ? pretty(r.orm) : "신호 없음"}</Block>
      <Block title="profile (데이터 프로파일)">{r.profile && r.profile.present ? pretty(r.profile) : "신호 없음"}</Block>
      <Block title="reftable (이 컬럼 연결)">{pretty(r.reftable)}</Block>
      {r.orm && r.orm.present && r.orm.enum === null && (r.archetype !== "자명" && r.archetype !== "PII" && r.archetype !== "형식") &&
        <div style={{ fontSize: 13, color: "var(--med)", marginTop: 8, lineHeight: 1.6 }}>※ enum이 비어 있음 — 라벨이 store에 없으니, 에이전트가 코퍼스를 dig해야 권위를 얻는다(설계상 강제).</div>}
    </div>
  );
}
function Block({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...xmono, fontSize: 12, color: "var(--dim)", letterSpacing: "0.05em", marginBottom: 4 }}>{title}</div>
      <pre style={{ ...xmono, fontSize: 13, color: "var(--text)", background: "rgba(0,0,0,0.25)", border: "1px solid var(--rule)", borderRadius: 5, padding: "10px 12px", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{children}</pre>
    </div>);
}
function pretty(o) { return typeof o === "string" ? o : JSON.stringify(o, null, 2); }

// ---- 코퍼스 (코드베이스) ----
function Corpus({ corpus }) {
  const paths = Object.keys(corpus).sort();
  const [sel, setSel] = xUseState(paths.find((p) => p.includes("LoanApplicationService")) || paths[0]);
  // 디렉터리 그룹핑
  const byDir = {};
  for (const p of paths) { const d = p.split("/").slice(0, -1).join("/"); (byDir[d] = byDir[d] || []).push(p); }
  const dirLabel = { "corpus/orm": "ORM 엔티티", "corpus/service": "서비스 (앱 로직 · 라벨)", "corpus/etl": "ETL · 뷰 (계보)", "corpus/reftable": "공통코드 테이블" };
  const TRAP = ["LoanApplicationService.java", "AccountStatusService.java"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "calc(100vh - 100px)" }}>
      <div style={{ borderRight: "1px solid var(--rule)", overflowY: "auto", padding: "12px 10px" }}>
        {Object.keys(byDir).sort().map((d) => (
          <div key={d} style={{ marginBottom: 12 }}>
            <div style={{ ...xmono, fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>{dirLabel[d] || d}</div>
            {byDir[d].map((p) => {
              const name = p.split("/").pop();
              const trap = TRAP.includes(name);
              return (
                <div key={p} onClick={() => setSel(p)} style={{ ...xmono, fontSize: 12.5, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                  display: "flex", gap: 6, alignItems: "center",
                  background: sel === p ? "rgba(255,255,255,0.06)" : "transparent",
                  borderLeft: sel === p ? "2px solid var(--accent)" : "2px solid transparent",
                  color: "var(--text)" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  {trap && <span title="값 겹침 함정" style={{ fontSize: 10, color: "var(--low)", border: "1px solid var(--low)55", borderRadius: 3, padding: "0 4px" }}>함정</span>}
                </div>);
            })}
          </div>))}
      </div>
      <div style={{ overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ ...xmono, fontSize: 13, color: "var(--dim)", marginBottom: 8 }}>{sel}</div>
        {TRAP.includes(sel.split("/").pop()) &&
          <div style={{ fontSize: 12.5, color: "var(--low)", background: "rgba(224,107,94,0.08)", border: "1px solid rgba(224,107,94,0.3)", borderRadius: 5, padding: "7px 11px", marginBottom: 10, lineHeight: 1.55 }}>
            충돌 함정 — LoanStatus와 AccountStatus가 같은 값집합(01~04)을 다른 라벨로 매핑한다. 에이전트가 값만 보고 아무 서비스나 채택하면 오귀속. 필드명(loanStatusCode vs accountStatusCode) 연결 검증으로 가려야 한다.
          </div>}
        <CodeView text={corpus[sel] || ""} />
      </div>
    </div>
  );
}
function CodeView({ text }) {
  const lines = text.split("\n");
  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: 6, overflow: "auto", background: "rgba(0,0,0,0.28)" }}>
      <pre style={{ ...xmono, fontSize: 13, margin: 0, padding: "12px 0", lineHeight: 1.55 }}>
        {lines.map((ln, i) => (
          <div key={i} style={{ display: "flex" }}>
            <span style={{ width: 42, flexShrink: 0, textAlign: "right", paddingRight: 12, color: "var(--dim)", opacity: 0.55, userSelect: "none" }}>{i + 1}</span>
            <span style={{ color: "var(--text)", whiteSpace: "pre-wrap", flex: 1, paddingRight: 12 }}>{ln || " "}</span>
          </div>))}
      </pre>
    </div>);
}

window.RenderExplorer = RenderExplorer;
