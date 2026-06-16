// ============================================================
// app.jsx — Render v2 화면 (핵심 기능만).
//   좌: 컬럼 목록(아키타입·판정점). 우: 활성 컬럼의 에이전트 트레이스 + 산출 카드.
//   nl2sql 의 '추론 스레드' 리듬 계승: 행동(op) → 생각 → 결과 → 최종.
// ============================================================
const { useState, useEffect, useRef } = React;

const STORE = window.SIGNAL_STORE;
const COLS = Object.keys(STORE.columns).sort();

const CONF = {
  HIGH: { c: "var(--high)", t: "HIGH" },
  MEDIUM: { c: "var(--med)", t: "MEDIUM" },
  LOW: { c: "var(--low)", t: "LOW" },
};
const ARCH = {
  "자명": "정체가 이름+타입으로 섬 — dig 불필요",
  "enum-clean": "ORM enum 이 라벨 운반 — dig 불필요",
  "PII": "분류가 어노테이션에 — tier-1",
  "형식": "형식은 데이터에서만 (YYYYMM)",
  "tier2-success": "라벨이 코드에 단일 연결 — dig 성공 기대",
  "충돌-크럭스": "값 겹치는 오귀속 후보 존재 — 연결 검증 필수",
  "lineage": "파생식이 ETL 에 — 이름 교정",
  "reftable-link": "공통코드 덤프 + 연결 추론",
  "floor": "라벨 어디에도 없음 — LOW+사람이 정답",
};
const TIER2 = new Set(["grep_code", "read_file", "find_refs"]);

function Dot({ color, ring }) {
  return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9,
    background: color || "transparent", border: ring ? "1.5px solid var(--rule)" : "none",
    flexShrink: 0 }} />;
}

function Header({ model, onModel, onKey, snapshot, onSnapshot, onRunAll, running, hasSnap }) {
  return (
    <div className="hdr">
      <div className="hdr-title">Render <span className="v">v2</span>
        <span className="sub">시맨틱 레이어 증강 · 신호 dig + 연결 검증</span></div>
      <div className="hdr-tools">
        {hasSnap && <label className="snap"><input type="checkbox" checked={snapshot}
          onChange={(e) => onSnapshot(e.target.checked)} /> 스냅샷</label>}
        <select value={model} onChange={(e) => onModel(e.target.value)} disabled={snapshot}>
          {window.RenderAPI.MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <button className="ghost" onClick={onKey} disabled={snapshot}>⚙ key</button>
        <button className="run-all" onClick={onRunAll} disabled={running}>
          {running ? "실행 중…" : "전체 실행"}</button>
      </div>
    </div>
  );
}

function ColumnRow({ cid, rec, res, active, onClick }) {
  const a = res && res.answer;
  const color = a ? CONF[a.confidence].c : null;
  return (
    <div className={"col-row" + (active ? " active" : "")} onClick={onClick}>
      <div className="col-row-top">
        <Dot color={color || "var(--bg)"} ring={!color} />
        <span className="cid">{cid}</span>
        {a && a.route_to_human && a.route_to_human.needed &&
          <span className="rh">사람</span>}
      </div>
      <div className="arch">{rec.archetype}</div>
    </div>
  );
}

function StepCard({ step }) {
  if (step.kind === "answer") return null;
  if (step.kind === "parse_error")
    return <div className="step err">파싱 실패 — 재시도</div>;
  const tier2 = TIER2.has(step.op);
  const verify = step.op === "read_file"; // 연결 검증 순간 강조
  let summary = "";
  const r = step.result || {};
  if (step.op === "peek_orm") summary = `field=${r.field || "-"} enum=${r.enum ? "있음" : "없음"} ann=${(r.annotations||[]).join(",")||"-"}`;
  else if (step.op === "peek_profile") summary = `값=${(r.distinct_sample||[]).join("·")} fmt=${r.inferred_format||"-"}`;
  else if (step.op === "peek_reftable") summary = `덤프 그룹=${Object.keys(r.dump||{}).join(",")||"-"} 연결=${r.column_linked?"선언됨":"미선언"}`;
  else if (step.op === "grep_code") summary = `'${(step.args||{}).query}' → ${r.count}건 ${(r.matches||[]).slice(0,4).map(m=>m.file.split("/").pop()).join(", ")}`;
  else if (step.op === "find_refs") summary = `'${(step.args||{}).symbol}' → ${r.count}건`;
  else if (step.op === "read_file") summary = `${(r.path||"").split("/").pop()} 읽음`;
  return (
    <div className={"step" + (tier2 ? " t2" : "") + (verify ? " verify" : "")}>
      <div className="step-head">
        <span className={"badge " + (tier2 ? "t2" : "t1")}>{tier2 ? "dig" : "peek"}</span>
        <span className="op">{step.op}</span>
        {verify && <span className="vtag">연결 검증</span>}
      </div>
      {step.thinking && <div className="think">{step.thinking}</div>}
      <div className="result">{summary}</div>
    </div>
  );
}

function AnswerCard({ a }) {
  const conf = CONF[a.confidence];
  return (
    <div className="answer">
      <div className="answer-head">
        <span className="conf" style={{ background: conf.c }}>{conf.t}</span>
        {a.route_to_human && a.route_to_human.needed &&
          <span className="rh-banner">사람 확인 필요 — {a.route_to_human.reason}</span>}
      </div>
      <div className="desc">{a.description}</div>
      <div className="meta">
        <div className="ev">
          {(a.evidence || []).map((e, i) => <span key={i} className="chip">{e}</span>)}
        </div>
        {(a.conflicts || []).length > 0 &&
          <div className="conflicts">
            {a.conflicts.map((c, i) => <div key={i} className="conflict">
              <b>{c.type}</b> {c.detail}</div>)}
          </div>}
      </div>
    </div>
  );
}

function TracePanel({ cid, rec, res, onRun, snapshot }) {
  const s = rec.schema;
  const man = ["orm", "profile", "reftable_dump"].filter((k) =>
    k === "reftable_dump" || (rec[k.replace("_dump","")] && rec[k.replace("_dump","")].present));
  return (
    <div className="trace">
      <div className="trace-head">
        <div className="th-cid">{cid}</div>
        <div className="th-arch">{rec.archetype} — {ARCH[rec.archetype]}</div>
        <div className="seed">
          <span>type {s.type}</span><span>nullable {String(s.nullable)}</span>
          <span>매니페스트 {man.join(", ")}</span>
        </div>
        {!res && <button className="run" onClick={onRun}>{snapshot ? "재생" : "실행"}</button>}
        {res && res.status === "running" && <span className="spin">에이전트 작동 중…</span>}
      </div>
      <div className="steps">
        {res && res.steps.map((st, i) => <StepCard key={i} step={st} />)}
        {res && res.answer && <AnswerCard a={res.answer} />}
        {res && res.error && <div className="step err">오류: {res.error}</div>}
      </div>
    </div>
  );
}

function App() {
  const [active, setActive] = useState(COLS[0]);
  const [results, setResults] = useState({}); // cid → {steps, answer, status, error}
  const [model, setModel] = useState(window.RenderAPI.getModel());
  const [running, setRunning] = useState(false);
  const hasSnap = !!(window.RenderSnapshot && Object.keys(window.RenderSnapshot).length);
  const [snapshot, setSnapshot] = useState(hasSnap);

  function onModel(m) { setModel(m); window.RenderAPI.setModel(m); }
  function onKey() {
    const cur = window.RenderAPI.getKey();
    const k = window.prompt("Anthropic API 키 (브라우저에만 저장):", cur);
    if (k != null) window.RenderAPI.setKey(k.trim());
  }

  async function runOne(cid) {
    if (snapshot && window.RenderSnapshot && window.RenderSnapshot[cid]) {
      const snap = window.RenderSnapshot[cid];
      setResults((r) => ({ ...r, [cid]: { steps: [], answer: null, status: "running" } }));
      for (const st of snap.trace) {
        await new Promise((res) => setTimeout(res, 220));
        setResults((r) => {
          const cur = r[cid] || { steps: [] };
          if (st.kind === "answer")
            return { ...r, [cid]: { ...cur, answer: st, status: "done" } };
          return { ...r, [cid]: { ...cur, steps: [...cur.steps, st] } };
        });
      }
      return;
    }
    // 라이브
    if (!window.RenderAPI.getKey()) { onKey(); if (!window.RenderAPI.getKey()) return; }
    setResults((r) => ({ ...r, [cid]: { steps: [], answer: null, status: "running" } }));
    try {
      const out = await window.RenderAgent.run(cid, {
        store: STORE, corpus: window.CORPUS, callModel: window.RenderAPI.callModel,
        onStep: (step) => setResults((r) => {
          const cur = r[cid] || { steps: [] };
          if (step.kind === "answer")
            return { ...r, [cid]: { ...cur, answer: step, status: "done" } };
          return { ...r, [cid]: { ...cur, steps: [...cur.steps, step] } };
        }),
      });
      setResults((r) => ({ ...r, [cid]: { ...(r[cid]||{steps:[]}), answer: out.answer, status: "done", _full: out } }));
    } catch (e) {
      setResults((r) => ({ ...r, [cid]: { ...(r[cid]||{steps:[]}), status: "error", error: e.message } }));
    }
  }

  async function runAll() {
    setRunning(true);
    for (const cid of COLS) { setActive(cid); await runOne(cid); }
    setRunning(false);
  }

  function saveSnapshot() {
    const snap = {};
    for (const cid of COLS) {
      const r = results[cid];
      if (r && r._full) snap[cid] = { trace: r._full.trace };
      else if (r && (r.steps.length || r.answer))
        snap[cid] = { trace: [...r.steps, ...(r.answer ? [r.answer] : [])] };
    }
    const blob = new Blob(["// 생성됨: 스냅샷 저장. window.RenderSnapshot 전역.\nwindow.RenderSnapshot = " +
      JSON.stringify(snap, null, 2) + ";\n"], { type: "text/javascript" });
    const u = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = u; a.download = "render-snapshot-data.js"; a.click(); URL.revokeObjectURL(u);
  }

  const rec = STORE.columns[active];
  const doneCount = Object.values(results).filter((r) => r && r.status === "done").length;

  return (
    <div className="app">
      <Header model={model} onModel={onModel} onKey={onKey} snapshot={snapshot}
        onSnapshot={setSnapshot} onRunAll={runAll} running={running} hasSnap={hasSnap} />
      <div className="body">
        <div className="left">
          <div className="left-head">컬럼 {COLS.length} · 완료 {doneCount}
            <button className="save" onClick={saveSnapshot} title="현재 결과를 스냅샷으로 저장">스냅샷 저장</button>
          </div>
          {COLS.map((cid) => <ColumnRow key={cid} cid={cid} rec={STORE.columns[cid]}
            res={results[cid]} active={cid === active} onClick={() => setActive(cid)} />)}
        </div>
        <div className="right">
          <TracePanel cid={active} rec={rec} res={results[active]}
            onRun={() => runOne(active)} snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
