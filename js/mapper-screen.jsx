// ============================================================
// mapper-screen.jsx — Mapper 실행 화면. render-screen 과 동일한 UI 문법.
//   좌: 헤더·버튼줄(전체 실행/중단/스냅샷 저장·불러오기/파일 열기)·요약·
//       kind 필터·시드 행(▷).
//   우: 60% 트레이스 스레드 + 40% 코드표 상세.
//   동시실행: 시드별 독립 상태 — ▷ 는 해당 시드만 잠그고 여러 시드 병렬 실행 가능.
//   스냅샷: kind="mapper". 내장 소스는 window.MapperSnapshot (있을 때만).
// window.MapperScreen 로 노출.
// ============================================================
(function () {
  const { useState: mUseState, useRef: mUseRef, useEffect: mUseEffect } = React;
  const mono = { fontFamily: "var(--mono)" };
  const CONFC = { HIGH: "var(--high)", MEDIUM: "var(--med)", LOW: "var(--low)" };
  const SCOPEC = { mapped: "var(--high)", out_of_scope: "var(--med)", not_db: "var(--dim)" };
  const KINDC = { int_code: "var(--sig)", string_code: "var(--lin)", reftable: "var(--accent)", mixed: "var(--low)", no_code: "var(--dim)" };
  const T = { think: 360, req: 520, done: 460 };
  const rsleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 트레이스(canonical) → 표시 이벤트 (스냅샷 즉시 재생용) — render-screen 과 동일 문법
  function traceToEvents(trace) {
    const ev = [];
    (trace || []).forEach((s) => {
      if (s.kind === "op") ev.push({ k: "op", op: s.op, args: s.args, status: "done", result: s.result, thinking: s.thinking });
      else if (s.kind === "parse_error") ev.push({ k: "perr" });
      else if (s.kind === "answer") {
        if (s.thinking) ev.push({ k: "endnote", text: s.thinking });
        ev.push({ k: "answer", answer: s });
      }
    });
    return ev;
  }
  function answerOf(trace) { const a = (trace || []).filter((s) => s.kind === "answer").pop(); return a || null; }

  function SeedRow({ s, r, active, running, onView, onRun }) {
    const [hover, setHover] = mUseState(false);
    const a = r && r.answer;
    const done = r && r.status === "done";
    return (
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onView}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", cursor: "pointer", borderRadius: 4,
          background: active ? "rgba(255,255,255,0.05)" : (hover ? "rgba(255,255,255,0.02)" : "transparent") }}>
        <span style={{ ...mono, fontSize: 10, color: KINDC[s.kind] || "var(--dim)", width: 66, flexShrink: 0 }}>{s.kind}</span>
        <span style={{ ...mono, fontSize: 12.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.name}</span>
        <span style={{ ...mono, fontSize: 10.5, color: "var(--dim)" }}>{s.entries.length}</span>
        {running && <span style={{ ...mono, fontSize: 10.5, color: "var(--accent)" }}>…</span>}
        {!running && a && <span style={{ ...mono, fontSize: 10, color: SCOPEC[a.scope] || "var(--dim)" }}>
          {a.scope}{a.mappings && a.mappings.length ? `·${a.mappings.length}` : ""}</span>}
        <span onClick={(e) => { e.stopPropagation(); if (!running) onRun(); }}
          style={{ ...mono, fontSize: 12, padding: "0 6px", borderRadius: 4,
            cursor: running ? "default" : "pointer", opacity: running ? 0.3 : (hover ? 1 : 0.5), transition: "opacity .12s",
            color: done ? "var(--sig)" : "var(--accent)", border: `1px solid ${done ? "var(--sig)" : "var(--accent)"}${hover ? "88" : "44"}` }}>▷</span>
      </div>
    );
  }

  function MapperScreen() {
    const seeds = window.MapperSeeds;
    const getSnapshotSrc = () => window.MapperSnapshot;
    const snapshotFilename = "mapper-snapshot-v0.json";
    const [results, setResults] = mUseState({});
    const [active, setActive] = mUseState(null);
    const [running, setRunning] = mUseState({});   // name → true (동시실행 — 시드별 독립)
    const [batch, setBatch] = mUseState(false);
    const [note, setNote] = mUseState(null);
    const [kindFilter, setKindFilter] = mUseState("all");
    const abortRef = mUseRef(false);
    const followRef = mUseRef(true);
    const runningRef = mUseRef(null);
    const fileRef = mUseRef(null);

    if (!seeds) return <Center>Mapper 시드가 없습니다 (data/mapper-seeds-fineract.js)</Center>;
    const store = window.SIGNAL_STORE, corpus = window.CORPUS;
    const kinds = ["all", "int_code", "string_code", "reftable", "mixed", "no_code"];
    const list = seeds.seeds.filter((s) => kindFilter === "all" || s.kind === kindFilter);
    const kindCount = (k) => k === "all" ? seeds.seeds.length : seeds.seeds.filter((s) => s.kind === k).length;

    const setRes = (id, patch) => setResults((p) => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));
    const setRun = (id, v) => setRunning((p) => { const n = { ...p }; if (v) n[id] = true; else delete n[id]; return n; });

    async function runOne(name, live) {
      if (!window.RenderAPI.hasKey()) {
        setNote("API 키가 필요합니다 — 아래에 입력하거나 '스냅샷 불러오기'로 기록을 재생하세요.");
        return;
      }
      const TT = live ? T : { think: 50, req: 70, done: 60 };
      setRun(name, true);
      runningRef.current = name;
      if (live || followRef.current) setActive(name);
      setRes(name, { status: "running", events: [], answer: null, trace: null });
      const events = [];
      const push = (e) => { events.push(e); setRes(name, { events: [...events] }); };

      const onStep = async (e) => {
        if (e.kind === "think") { push({ k: "think", text: e.text }); await rsleep(TT.think); }
        else if (e.kind === "op_request") { push({ k: "op", op: e.op, args: e.args, status: "req" }); await rsleep(TT.req); }
        else if (e.kind === "op_done") {
          const i = events.findLastIndex((x) => x.k === "op" && x.status === "req");
          if (i >= 0) { events[i] = { ...events[i], status: "done", result: e.result }; setRes(name, { events: [...events] }); }
          await rsleep(TT.done);
        } else if (e.kind === "parse_error") { push({ k: "perr" }); }
        else if (e.kind === "answer") {
          if (e.thinking) push({ k: "endnote", text: e.thinking });
          push({ k: "answer", answer: e });
        }
      };

      try {
        const out = await window.MapperAgent.run(name, {
          seeds, store, corpus, system: window.MapperPrompt.V0,
          callModel: (args) => window.RenderAPI.callModel(args, { onRetry: (a) => setNote(`재시도 ${a}회…`) }),
          onStep,
        });
        setNote(null);
        setRes(name, { status: "done", answer: out.answer, trace: out.trace, forced: out.forced });
      } catch (e) {
        setRes(name, { status: "done", answer: { scope: "not_db", mappings: [], data_note: "", confidence: "LOW", review_note: "실행 오류: " + (e.message || e), needs_review: true }, error: true });
        setNote(null);
      }
      setRun(name, false);
    }

    async function runAll() {
      abortRef.current = false; followRef.current = true; setBatch(true);
      for (const s of list) {
        if (abortRef.current) break;
        const ex = results[s.name];
        if (ex && ex.status === "done") continue;
        await runOne(s.name, false);
      }
      followRef.current = true; setBatch(false);
    }

    // ---- 스냅샷 (render-screen 과 동일 문법) ----
    function saveSnapshot() {
      const snap = { version: 1, kind: "mapper", model: window.RenderAPI.getModel(),
        prompt_id: "mapper_v0", created: new Date().toISOString(),
        results: Object.fromEntries(Object.entries(results).filter(([n, r]) => r && r.trace)
          .map(([n, r]) => [n, { trace: r.trace, answer: r.answer }])) };
      const blob = new Blob([JSON.stringify(snap)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = snapshotFilename; a.click();
    }
    function applySnapshot(snap, silent) {
      const res = snap && snap.results ? snap.results : snap;
      if (!res || typeof res !== "object") throw new Error("형식 불일치");
      const loaded = {};
      for (const [n, r] of Object.entries(res)) {
        const trace = r.trace || [];
        loaded[n] = { status: "done", events: traceToEvents(trace), trace, answer: r.answer || answerOf(trace) };
      }
      setResults(loaded);
      if (!silent) {
        const cnt = Object.keys(loaded).length;
        const model = (snap && snap.model) || "기록";
        const date = (snap && snap.created) ? snap.created.slice(0, 10) : "";
        setNote(`스냅샷 로드 — ${cnt}코드표 · ${model}${date ? " · " + date : ""}`);
        setTimeout(() => setNote(null), 4000);
      }
    }
    function loadFile(ev) {
      const f = ev.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { try { applySnapshot(JSON.parse(rd.result)); } catch (e) { setNote("스냅샷 파일 오류: " + (e.message || e)); setTimeout(() => setNote(null), 4000); } };
      rd.readAsText(f); ev.target.value = "";
    }

    // ---- 집계 ----
    const answered = seeds.seeds.map((s) => results[s.name]).filter((r) => r && r.answer && r.status === "done");
    const scopeDist = { mapped: 0, out_of_scope: 0, not_db: 0 };
    const confDist = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    let mappingTotal = 0, reviewTotal = 0;
    answered.forEach((r) => {
      scopeDist[r.answer.scope] = (scopeDist[r.answer.scope] || 0) + 1;
      confDist[r.answer.confidence] = (confDist[r.answer.confidence] || 0) + 1;
      mappingTotal += (r.answer.mappings || []).length;
      if (r.answer.needs_review) reviewTotal++;
    });
    const runningCount = Object.keys(running).length;

    const r = active ? results[active] : null;
    const activeSeed = active ? seeds.seeds.find((s) => s.name === active) : null;

    return (
      <div style={{ display: "grid", gridTemplateColumns: "390px 1fr", gap: 0, height: "calc(100vh - 50px)", overflow: "hidden" }}>
        {/* 좌 — 상단 고정 + 목록 스크롤 */}
        <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "18px 16px 8px", flexShrink: 0 }}>
            <div style={{ ...mono, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Mapper v0 · 코드표 귀속</div>
            <div style={{ fontSize: 14, color: "var(--dim)", marginBottom: 14, lineHeight: 1.5 }}>
              코드표 하나가 어느 테이블·컬럼의 값 체계인지 판정 — mapped · out_of_scope · not_db. "없다"도 근거를 갖춘 판정.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <Btn on={!batch} color="var(--accent)" onClick={runAll}>전체 실행</Btn>
              <Btn on={batch} color="var(--low)" onClick={() => (abortRef.current = true)}>중단</Btn>
              <Btn on={answered.length > 0} color="var(--sig)" onClick={saveSnapshot}>스냅샷 저장</Btn>
              <Btn on={!!getSnapshotSrc()} color="var(--sig)" onClick={() => { try { applySnapshot(getSnapshotSrc()); } catch (e) { setNote("스냅샷 로드 실패: " + (e.message || e)); } }}>스냅샷 불러오기</Btn>
              <Btn on={true} color="var(--dim)" onClick={() => fileRef.current.click()}>파일 열기</Btn>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={loadFile} style={{ display: "none" }} />
            </div>
            {note && <div style={{ ...mono, fontSize: 13.5, color: "var(--med)", marginBottom: 8 }}>{note}</div>}
            {runningCount > 1 && <div style={{ ...mono, fontSize: 12.5, color: "var(--accent)", marginBottom: 8 }}>동시 실행 중: {runningCount}</div>}
            {!window.RenderAPI.hasKey() && <MKeyBox />}
            {answered.length > 0 && <MSummary scopeDist={scopeDist} confDist={confDist} total={answered.length} mappings={mappingTotal} review={reviewTotal} />}
          </div>

          {/* 목록 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 18px", borderTop: "1px solid var(--rule)" }}>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {kinds.map((k) => (
                <div key={k} onClick={() => setKindFilter(k)}
                  style={{ ...mono, fontSize: 12, padding: "3px 12px", cursor: "pointer", borderRadius: 4,
                    color: kindFilter === k ? "#0c0e11" : "var(--dim)",
                    background: kindFilter === k ? "var(--accent)" : "rgba(0,0,0,0.25)",
                    border: `1px solid ${kindFilter === k ? "var(--accent)" : "var(--rule)"}` }}>
                  {k === "all" ? `전체 (${kindCount(k)})` : `${k} (${kindCount(k)})`}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              {list.map((s) => (
                <SeedRow key={s.name} s={s} r={results[s.name]} active={active === s.name} running={!!running[s.name]}
                  onView={() => { if (s.name !== runningRef.current) followRef.current = false; setActive(s.name); }}
                  onRun={() => runOne(s.name, true)} />))}
            </div>
          </div>
        </div>

        {/* 우 */}
        <div style={{ display: "flex", overflow: "hidden" }}>
          <div style={{ flex: "0 0 60%", padding: "20px 24px", overflowY: "auto", borderRight: "1px solid var(--rule)" }}>
            {!active && <Center>코드표를 클릭하면 단건 실행(라이브). ▷ 를 여러 개 누르면 동시 실행. 키 없이 보려면 '스냅샷 불러오기'.</Center>}
            {batch && !followRef.current && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "7px 12px",
                background: "rgba(106,169,224,0.09)", border: "1px solid var(--sig)44", borderRadius: 5 }}>
                <span style={{ ...mono, fontSize: 13, color: "var(--sig)" }}>진행 추적 멈춤 — 완료 코드표 보는 중</span>
                <span onClick={() => { followRef.current = true; if (runningRef.current) setActive(runningRef.current); }}
                  style={{ ...mono, fontSize: 13, color: "var(--accent)", border: "1px solid var(--accent)66", borderRadius: 4, padding: "2px 9px", cursor: "pointer" }}>최신으로 따라가기</span>
              </div>)}
            {active && <MThread name={active} r={r} />}
          </div>
          <div style={{ flex: "0 0 40%", padding: "20px 22px", overflowY: "auto", background: "rgba(0,0,0,0.14)" }}>
            {!active && <Center style={{ fontSize: 15 }}>코드표를 선택하면 정의·항목이 표시됩니다.</Center>}
            {activeSeed && <SeedDetail s={activeSeed} />}
          </div>
        </div>
      </div>
    );
  }

  // ---- 트레이스 스레드 ----
  function MThread({ name, r }) {
    const endRef = mUseRef(null);
    mUseEffect(() => { if (r && r.status === "running" && endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); });
    if (!r) return <Center>▷ 를 눌러 실행하세요.</Center>;
    return (
      <div>
        <div style={{ ...mono, fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{name}</div>
        {(r.events || []).map((e, i) => <MEvent key={i} e={e} />)}
        {r.status === "running" && <div style={{ ...mono, fontSize: 12.5, color: "var(--accent)", margin: "8px 0" }}>실행 중…</div>}
        <div ref={endRef} />
      </div>
    );
  }

  function MEvent({ e }) {
    if (e.k === "think") return <div style={{ fontSize: 12.5, color: "var(--dim)", fontStyle: "italic", margin: "7px 0" }}>{e.text}</div>;
    if (e.k === "endnote") return (
      <div style={{ fontSize: 12.5, color: "var(--sig)", fontStyle: "italic", margin: "10px 0 4px", padding: "6px 10px",
        borderLeft: "2px solid var(--sig)66", background: "rgba(106,169,224,0.06)" }}>종료 판단 — {e.text}</div>);
    if (e.k === "perr") return <div style={{ fontSize: 12, color: "var(--low)", margin: "6px 0" }}>parse_error — 재시도</div>;
    if (e.k === "op") {
      let body = e.result !== undefined ? JSON.stringify(e.result) : null;
      if (body && body.length > 700) body = body.slice(0, 700) + "…";
      return (
        <div style={{ margin: "8px 0", fontSize: 12.5 }}>
          <span style={{ ...mono, color: "var(--sig)" }}>{e.op}</span>
          <span style={{ ...mono, color: "var(--dim)" }}> {JSON.stringify(e.args)}</span>
          {e.status === "req" && <span style={{ ...mono, fontSize: 11, color: "var(--accent)", marginLeft: 8 }}>요청…</span>}
          {e.thinking && <div style={{ color: "var(--dim)", fontStyle: "italic", margin: "2px 0 0 8px" }}>{e.thinking}</div>}
          {body && <div style={{ ...mono, fontSize: 11.5, color: "var(--muted)", margin: "3px 0 0 8px", wordBreak: "break-all" }}>{body}</div>}
        </div>
      );
    }
    if (e.k === "answer") return <MAnswer a={e.answer} />;
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
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.55 }}>{m.evidence}</div>
          </div>
        ))}
        {a.data_note && <div style={{ fontSize: 12.5, color: "var(--med)", marginTop: 8, lineHeight: 1.55 }}>실물 대조: {a.data_note}</div>}
        {a.review_note && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 6, lineHeight: 1.55 }}>검수 노트: {a.review_note}</div>}
      </div>
    );
  }

  // ---- 우측 상세 ----
  function SeedDetail({ s }) {
    return (
      <div>
        <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{s.name}</div>
        <div style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 12 }}>
          <span style={{ ...mono, color: KINDC[s.kind] }}>{s.kind}</span> · {s.entries.length}항목
        </div>
        {s.definition_file && (
          <MDSection title="정의 위치">
            <span style={{ ...mono, fontSize: 12, wordBreak: "break-all" }}>{s.definition_file}</span>
            {s.nested_in && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>중첩: {s.nested_in} 안</div>}
          </MDSection>
        )}
        {s.note && <MDSection title="비고"><span style={{ fontSize: 12.5 }}>{s.note}</span></MDSection>}
        <MDSection title={`항목 ${s.entries.length}`}>
          <div style={{ display: "grid", gap: 3 }}>
            {s.entries.map((e, i) => (
              <div key={i} style={{ ...mono, fontSize: 12, display: "flex", gap: 8 }}>
                <span style={{ color: "var(--sig)", minWidth: 40, textAlign: "right" }}>{e.code === null ? "—" : String(e.code)}</span>
                <span style={{ color: "var(--text)" }}>{e.name}</span>
                {e.extra && e.extra.length > 0 && <span style={{ color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.extra.join(" · ")}</span>}
              </div>
            ))}
          </div>
        </MDSection>
      </div>
    );
  }

  function MDSection({ title, children }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...mono, fontSize: 11.5, letterSpacing: "0.08em", color: "var(--dim)", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>{children}</div>
      </div>
    );
  }

  function MSummary({ scopeDist, confDist, total, mappings, review }) {
    return (
      <div style={{ border: "1px solid var(--rule)", borderRadius: 6, padding: "9px 12px", marginBottom: 4, background: "rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", ...mono, fontSize: 12 }}>
          <span style={{ color: "var(--dim)" }}>판정 {total}</span>
          <span style={{ color: SCOPEC.mapped }}>mapped {scopeDist.mapped || 0}</span>
          <span style={{ color: SCOPEC.out_of_scope }}>범위밖 {scopeDist.out_of_scope || 0}</span>
          <span style={{ color: "var(--dim)" }}>not_db {scopeDist.not_db || 0}</span>
          <span style={{ color: "var(--text)" }}>매핑 {mappings}</span>
          <span style={{ color: "var(--low)" }}>검수 {review}</span>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 4, ...mono, fontSize: 12 }}>
          <span style={{ color: CONFC.HIGH }}>HIGH {confDist.HIGH || 0}</span>
          <span style={{ color: CONFC.MEDIUM }}>MED {confDist.MEDIUM || 0}</span>
          <span style={{ color: CONFC.LOW }}>LOW {confDist.LOW || 0}</span>
        </div>
      </div>
    );
  }

  function MKeyBox() {
    return (
      <div style={{ border: "1px solid var(--rule)", borderRadius: 6, padding: "9px 12px", marginBottom: 8, fontSize: 12.5, color: "var(--med)", lineHeight: 1.55 }}>
        API 키 미설정 — 주소에 <span style={mono}>#k=sk-ant-…</span> 로 접속하면 저장됩니다. 키 없이 보려면 '스냅샷 불러오기'.
      </div>
    );
  }

  function Btn({ on, color, onClick, children }) {
    return (
      <span onClick={on ? onClick : undefined}
        style={{ ...mono, fontSize: 12.5, padding: "4px 12px", borderRadius: 4, cursor: on ? "pointer" : "default",
          opacity: on ? 1 : 0.35, color, border: `1px solid ${color}66`, userSelect: "none" }}>{children}</span>
    );
  }

  function Center({ children, style }) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60%", fontSize: 13.5, color: "var(--dim)", ...style }}>{children}</div>;
  }

  window.MapperScreen = MapperScreen;
})();
