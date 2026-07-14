// ============================================================
// mapper-screen.jsx — Mapper 실행 화면.
//   좌: 코드표 목록(kind 필터). 우: 트레이스 + 판정 카드.
//   결과는 세션 내 메모리 유지 + JSON 다운로드.
// window.MapperScreen 로 노출.
// ============================================================
(function () {
  const { useState: mUseState, useRef: mUseRef, useEffect: mUseEffect } = React;
  const mono = { fontFamily: "var(--mono)" };
  const CONFC = { HIGH: "var(--high)", MEDIUM: "var(--med)", LOW: "var(--low)" };
  const SCOPEC = { mapped: "var(--high)", out_of_scope: "var(--med)", not_db: "var(--dim)" };
  const KINDC = { int_code: "var(--sig)", string_code: "var(--lin)", reftable: "var(--accent)", mixed: "var(--low)", no_code: "var(--dim)" };

  function MapperScreen() {
    const seeds = window.MapperSeeds;
    const [results, setResults] = mUseState({});   // name → {answer, trace, ops, forced}
    const [active, setActive] = mUseState(null);
    const [busy, setBusy] = mUseState(null);
    const [note, setNote] = mUseState("");
    const [live, setLive] = mUseState([]);          // 실행 중 스텝 스트림
    const [kindFilter, setKindFilter] = mUseState("all");
    const liveRef = mUseRef(null);
    mUseEffect(() => { if (liveRef.current) liveRef.current.scrollTop = liveRef.current.scrollHeight; }, [live]);

    if (!seeds) return <Center>Mapper 시드가 없습니다 (data/mapper-seeds-fineract.js)</Center>;
    const list = seeds.seeds.filter((s) => kindFilter === "all" || s.kind === kindFilter);
    const store = window.SIGNAL_STORE, corpus = window.CORPUS;

    async function runOne(name) {
      if (busy) return;
      if (!window.RenderAPI.hasKey()) { setNote("API 키가 없습니다 — 상단 안내 참조"); return; }
      setBusy(name); setActive(name); setLive([]); setNote("");
      try {
        const out = await window.MapperAgent.run(name, {
          seeds, store, corpus,
          system: window.MapperPrompt.V0,
          callModel: (args) => window.RenderAPI.callModel(args, { onRetry: (a) => setNote(`재시도 ${a}회…`) }),
          onStep: async (s) => { setLive((prev) => [...prev, s]); },
        });
        setResults((prev) => ({ ...prev, [name]: out }));
      } catch (e) {
        setNote("오류: " + e.message);
      }
      setBusy(null);
    }

    function download() {
      const blob = new Blob([JSON.stringify({ version: 1, kind: "mapper", prompt_id: "mapper_v0",
        model: window.RenderAPI.getModel(), created: new Date().toISOString(), results }, null, 1)],
        { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mapper-results.json";
      a.click();
    }

    const done = Object.keys(results).length;
    const r = active ? results[active] : null;
    const activeSeed = active ? seeds.seeds.find((s) => s.name === active) : null;

    return (
      <div style={{ display: "grid", gridTemplateColumns: "390px 1fr", gap: 0, height: "calc(100vh - 50px)", overflow: "hidden" }}>
        {/* 좌: 코드표 목록 */}
        <div style={{ borderRight: "1px solid var(--rule)", overflow: "auto", padding: "14px 0" }}>
          <div style={{ padding: "0 16px 10px" }}>
            <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Mapper v0 · 코드표 → 컬럼 귀속</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>
              시드 {seeds.seed_count} · 스코프 {seeds.scope_stats.tables}테이블 {seeds.scope_stats.columns}컬럼 · 완료 {done}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
              {["all", "int_code", "string_code", "reftable", "mixed", "no_code"].map((k) => (
                <span key={k} onClick={() => setKindFilter(k)}
                  style={{ ...mono, fontSize: 10.5, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                    border: `1px solid ${kindFilter === k ? "var(--accent)" : "var(--rule)"}`,
                    color: kindFilter === k ? "var(--accent)" : "var(--dim)" }}>{k}</span>))}
              {done > 0 && <span onClick={download}
                style={{ ...mono, fontSize: 10.5, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                  border: "1px solid var(--sig)", color: "var(--sig)", marginLeft: "auto" }}>결과 JSON ↓</span>}
            </div>
            {note && <div style={{ fontSize: 12, color: "var(--low)", marginTop: 6 }}>{note}</div>}
            {!window.RenderAPI.hasKey() && <div style={{ fontSize: 12, color: "var(--med)", marginTop: 6 }}>
              API 키 미설정 — 주소에 #k=sk-ant-… 로 접속하면 저장됩니다.</div>}
          </div>
          {list.map((s) => {
            const res = results[s.name];
            const a = res && res.answer;
            return (
              <div key={s.name} onClick={() => setActive(s.name)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", cursor: "pointer",
                  background: active === s.name ? "rgba(255,255,255,0.04)" : "transparent" }}>
                <span style={{ ...mono, fontSize: 10, color: KINDC[s.kind] || "var(--dim)", width: 68, flexShrink: 0 }}>{s.kind}</span>
                <span style={{ ...mono, fontSize: 12.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.name}</span>
                <span style={{ ...mono, fontSize: 10.5, color: "var(--dim)" }}>{s.entries.length}</span>
                {a && <span style={{ ...mono, fontSize: 10, color: SCOPEC[a.scope] || "var(--dim)" }}>
                  {a.scope}{a.mappings && a.mappings.length ? `·${a.mappings.length}` : ""}</span>}
                <button onClick={(e) => { e.stopPropagation(); runOne(s.name); }} disabled={!!busy}
                  style={{ ...mono, fontSize: 10.5, padding: "1px 7px", borderRadius: 4, cursor: busy ? "default" : "pointer",
                    border: "1px solid var(--rule)", background: "transparent",
                    color: busy === s.name ? "var(--accent)" : "var(--dim)" }}>
                  {busy === s.name ? "…" : (res ? "재실행" : "실행")}</button>
              </div>
            );
          })}
        </div>

        {/* 우: 트레이스 + 판정 */}
        <div ref={liveRef} style={{ overflow: "auto", padding: "18px 24px" }}>
          {!active && <Center style={{ color: "var(--dim)" }}>좌측에서 코드표를 선택해 실행하세요. 판정: 이 표는 어느 컬럼의 값 체계인가.</Center>}
          {active && (
            <div>
              <div style={{ ...mono, fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{active}</div>
              {activeSeed && <div style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 12 }}>
                {activeSeed.kind} · {activeSeed.entries.length}항목
                {activeSeed.definition_file ? ` · ${activeSeed.definition_file.split("/").pop()}` : ""} ·
                항목: {activeSeed.entries.slice(0, 8).map((e) => e.code === null ? e.name : `${e.code}=${e.name}`).join(", ")}
                {activeSeed.entries.length > 8 ? " …" : ""}</div>}
              {busy === active && live.map((s, i) => <MStep key={i} s={s} />)}
              {busy !== active && r && r.trace.map((s, i) => <MStep key={i} s={s} />)}
              {busy !== active && r && r.answer && <MAnswer a={r.answer} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  function MStep({ s }) {
    if (s.kind === "think") return <div style={{ fontSize: 12.5, color: "var(--dim)", fontStyle: "italic", margin: "6px 0" }}>{s.text}</div>;
    if (s.kind === "op" || s.kind === "op_done") {
      let body = JSON.stringify(s.result);
      if (body && body.length > 700) body = body.slice(0, 700) + "…";
      return (
        <div style={{ margin: "7px 0", fontSize: 12.5 }}>
          <span style={{ ...mono, color: "var(--sig)" }}>{s.op}</span>
          <span style={{ ...mono, color: "var(--dim)" }}> {JSON.stringify(s.args)}</span>
          {s.thinking && <div style={{ color: "var(--dim)", fontStyle: "italic", margin: "2px 0 0 8px" }}>{s.thinking}</div>}
          <div style={{ ...mono, fontSize: 11.5, color: "var(--muted)", margin: "3px 0 0 8px", wordBreak: "break-all" }}>{body}</div>
        </div>
      );
    }
    if (s.kind === "op_request") return null;
    if (s.kind === "parse_error") return <div style={{ fontSize: 12, color: "var(--low)", margin: "6px 0" }}>parse_error — 재시도</div>;
    if (s.kind === "answer") return null; // MAnswer 로 렌더
    return null;
  }

  function MAnswer({ a }) {
    const c = CONFC[a.confidence] || "var(--dim)";
    return (
      <div style={{ border: `1px solid ${c}66`, borderLeft: `3px solid ${c}`, borderRadius: 6, padding: "13px 16px", margin: "16px 0 8px", background: "rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "#0c0e11", background: c, borderRadius: 7, padding: "2px 10px" }}>{a.confidence}</span>
          <span style={{ ...mono, fontSize: 12, color: SCOPEC[a.scope] || "var(--text)", fontWeight: 700 }}>{a.scope}</span>
          {a.forced && <span style={{ fontSize: 12, color: "var(--low)" }}>강제 종결</span>}
          {a.needs_review && <span style={{ fontSize: 12, color: "var(--low)" }}>검수 필요</span>}
        </div>
        {(a.mappings || []).map((m, i) => (
          <div key={i} style={{ margin: "6px 0", padding: "8px 10px", border: "1px solid var(--rule)", borderRadius: 5 }}>
            <span style={{ ...mono, fontSize: 13, color: "var(--text)" }}>{m.table}.{m.column}</span>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{m.evidence}</div>
          </div>
        ))}
        {a.data_note && <div style={{ fontSize: 12.5, color: "var(--med)", marginTop: 8 }}>실물 대조: {a.data_note}</div>}
        {a.review_note && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 6 }}>검수 노트: {a.review_note}</div>}
      </div>
    );
  }

  function Center({ children, style }) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60%", fontSize: 13.5, ...style }}>{children}</div>;
  }

  window.MapperScreen = MapperScreen;
})();
