// ============================================================
// render-screen.jsx — Render 에이전트 실행 화면 (NL2SQL-Agent 'nl.jsx' 패턴 계승).
//   행동(op 요청 → 완료 + 결과) → 생각 → 최종(답변 카드). 타임드 reveal·follow/abort.
//   좌: 제어 + 요약 + 테이블별 컬럼 목록. 우: 트레이스(60%) + 컬럼 상세(40%).
//   window.RenderScreen 으로 노출.
// ============================================================
const { useState: rUseState, useRef: rUseRef, useEffect: rUseEffect, createContext: rCreateContext, useContext: rUseContext } = React;

// Render 모드(v2/v3)를 트리 하위로 전파. AnswerCard 가 이 컨텍스트를 읽어 뷰를 결정.
const RenderModeContext = rCreateContext("v2");

const R_T = { live: { think: 360, req: 520, done: 460 }, batch: { think: 50, req: 70, done: 60 } };
const CONFC = { HIGH: "var(--high)", MEDIUM: "var(--med)", LOW: "var(--low)" };
const rmono = { fontFamily: "var(--mono)" };
const rsleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIER2 = new Set(["grep_code", "read_file", "find_refs"]);

// 트레이스(canonical) → 표시 이벤트 (스냅샷 즉시 재생용)
function traceToEvents(trace) {
  const ev = [];
  for (const s of trace || []) {
    if (s.kind === "op") {
      if (s.thinking) ev.push({ k: "think", text: s.thinking });
      ev.push({ k: "op", op: s.op, args: s.args, status: "done", result: s.result });
    } else if (s.kind === "answer") {
      // 종료 판단 (answer.thinking) 을 답변 직전에 별도 이벤트로 노출.
      // op 도중의 조사 의도(think)와 시각적으로 구분 — 파일럿 관측 채널.
      if (s.thinking) ev.push({ k: "endnote", text: s.thinking });
      ev.push({ k: "answer", answer: s });
    }
  }
  return ev;
}
function answerOf(trace) { const a = (trace || []).filter((s) => s.kind === "answer").pop(); return a || null; }

function MarkerChip({ cid }) {
  const [pos, setPos] = rUseState(null);
  const ref = rUseRef(null);
  const a = window.RenderMeta.arch(cid);
  if (!a.marker) return null;
  const W = 270;
  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const above = r.top > 130;
    let cx = r.left + r.width / 2;
    cx = Math.max(8 + W / 2, Math.min(window.innerWidth - 8 - W / 2, cx));
    setPos({ x: cx, y: above ? r.top - 6 : r.bottom + 6, placement: above ? "above" : "below" });
  };
  return (
    <span ref={ref} style={{ display: "inline-block", flexShrink: 0 }}
      onMouseEnter={show} onMouseLeave={() => setPos(null)}>
      <span style={{ ...rmono, fontSize: 11, color: a.color, border: `1px solid ${a.color}55`, borderRadius: 3, padding: "0px 4px" }}>{a.marker}</span>
      {pos && (
        <span style={{ position: "fixed", left: pos.x, top: pos.y,
          transform: `translateX(-50%) ${pos.placement === "above" ? "translateY(-100%)" : ""}`,
          zIndex: 9999, background: "#13161b", border: "1px solid var(--border, var(--rule))", borderRadius: 5,
          padding: "7px 11px", width: W, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", pointerEvents: "none", whiteSpace: "normal" }}>
          <span style={{ ...rmono, fontSize: 12, color: a.color, display: "block", marginBottom: 3 }}>{a.marker} · 기대: {a.expect}</span>
          <span style={{ fontSize: 13.5, color: "var(--muted, var(--dim))", lineHeight: 1.6 }}>{a.tip}</span>
        </span>)}
    </span>);
}

function ColumnRow({ cid, r, active, busy, onView, onRun }) {
  const [hover, setHover] = rUseState(false);
  const ans = r && r.answer;
  const running = r && r.status === "running";
  const viewable = r && (r.status === "done" || running);
  const done = r && r.status === "done";
  const dotColor = ans ? CONFC[ans.confidence] : (running ? "var(--sig)" : "var(--rule)");
  const short = cid.split(".").pop();
  return (
    <div onClick={() => { if (viewable) onView(); }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: "5px 8px", borderRadius: 4, cursor: viewable ? "pointer" : "default", transition: "background .12s",
        background: active ? "rgba(255,255,255,0.05)" : (hover ? "rgba(255,255,255,0.025)" : "transparent"),
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent" }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        <span style={{ width: 7, height: 7, borderRadius: 7, flexShrink: 0, background: dotColor }} />
        <span style={{ ...rmono, fontSize: 13, color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{short}</span>
        <MarkerChip cid={cid} />
        {ans && ans.route_to_human && ans.route_to_human.needed &&
          <span style={{ ...rmono, fontSize: 10, color: "#0c0e11", background: "var(--low)", borderRadius: 8, padding: "0 6px", fontWeight: 600 }}>사람</span>}
        <span onClick={(e) => { e.stopPropagation(); onRun(); }} title={done ? "다시 실행" : "실행"}
          style={{ ...rmono, fontSize: 13, flexShrink: 0, padding: "1px 6px", borderRadius: 4,
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.3 : (hover ? 1 : 0.5), transition: "opacity .12s",
            color: done ? "var(--sig)" : "var(--accent)", border: `1px solid ${done ? "var(--sig)" : "var(--accent)"}${hover ? "88" : "44"}` }}>▷</span>
      </div>
    </div>);
}

function RenderScreen({ mode }) {
  // mode: "v2" | "v3". mode 는 트리 하위로 Context 로 전파된다.
  const isV3 = mode === "v3";
  const getSystemPrompt = () => isV3 ? window.RenderPromptV3.BALANCED : window.RenderPrompts.current();
  const getPromptId     = () => isV3 ? "balanced_v3" : window.RenderPrompts.getSelectedId();
  const getSnapshotSrc  = () => isV3 ? window.RenderSnapshotV3 : window.RenderSnapshot;
  const snapshotFilename = isV3 ? "render-snapshot-v3.json" : "render-snapshot.json";
  const headerTitle = isV3 ? "Render v3 · 구조화 슬롯" : "Render v2 · Description";
  const headerSub   = isV3
    ? "description + capability · codedict · format · aggregation 을 슬롯으로 저작 — NL2SQL 이 구조화된 슬롯을 그대로 참조"
    : "부산물 신호(스키마·코드·데이터)만으로 컬럼 Description을 합성 — 라벨 권위를 검증 가능하게 근거 짓는가";
  const [results, setResults] = rUseState({});
  const [active, setActive] = rUseState(null);
  const [busy, setBusy] = rUseState(false);
  const [note, setNote] = rUseState(null);
  const abortRef = rUseRef(false);
  const followRef = rUseRef(true);
  const runningRef = rUseRef(null);
  const fileRef = rUseRef(null);
  // 검증셋·재실행셋을 데이터셋별로 분리. Fineract는 시드 확장 이후 값 채워진 컬럼을
  // 재실행 필요셋으로 노출 (스냅샷 생성 시점 이후 데이터가 갱신됨).
  const VERIFY_SETS = {
    mock: [
      "m_client.status_enum", "m_savings_account.status_enum",
      "glim_accounts.accepting_child", "gsim_accounts.accepting_child",
      "glim_accounts.child_accounts_count", "gsim_accounts.application_id",
      "m_loan.loan_status_id", "gsim_accounts.savings_status_id",
      "m_deposit_account_term_and_preclosure.deposit_period_frequency_enum",
      "m_loan_payment_allocation_rule.transaction_type",
      "m_loan.loan_sub_status_id", "m_client.date_of_birth",
      "m_loan.client_id", "m_savings_account.sub_status_enum",
      "m_loan_charge.charge_payment_mode_enum", "m_loan.charge_off_reason_cv_id",
    ],
    // Fineract 검증셋: Render 검증용 슬라이스 133 컬럼 (columns.jsonl unique DB 컬럼)
    // archetype 균형(collision-crux · enum-clean · reftable-link) stratified sample.
    // 실무 대표성 아니라 archetype별 판단 시험 목적. 상세는 inventory 06 섹션.
    fineract: [
      "glim_accounts.accepting_child",
      "glim_accounts.account_number",
      "glim_accounts.application_id",
      "glim_accounts.child_accounts_count",
      "glim_accounts.group_id",
      "glim_accounts.loan_status_id",
      "glim_accounts.principal_amount",
      "gsim_accounts.accepting_child",
      "gsim_accounts.account_number",
      "gsim_accounts.application_id",
      "gsim_accounts.child_accounts_count",
      "gsim_accounts.group_id",
      "gsim_accounts.parent_deposit",
      "gsim_accounts.savings_status_id",
      "m_client.account_no",
      "m_client.activatedon_userid",
      "m_client.activation_date",
      "m_client.client_classification_cv_id",
      "m_client.client_type_cv_id",
      "m_client.closedon_date",
      "m_client.closedon_userid",
      "m_client.closure_reason_cv_id",
      "m_client.created_by",
      "m_client.created_on_utc",
      "m_client.date_of_birth",
      "m_client.default_savings_account",
      "m_client.default_savings_product",
      "m_client.display_name",
      "m_client.email_address",
      "m_client.firstname",
      "m_client.fullname",
      "m_client.gender_cv_id",
      "m_client.image_id",
      "m_client.is_staff",
      "m_client.last_modified_by",
      "m_client.last_modified_on_utc",
      "m_client.lastname",
      "m_client.legal_form_enum",
      "m_client.middlename",
      "m_client.mobile_no",
      "m_client.reject_reason_cv_id",
      "m_client.status_enum",
      "m_client.sub_status",
      "m_client.withdraw_reason_cv_id",
      "m_client_identifier.document_type_id",
      "m_deposit_account_on_hold_transaction.amount",
      "m_deposit_account_on_hold_transaction.created_by",
      "m_deposit_account_on_hold_transaction.created_date",
      "m_deposit_account_on_hold_transaction.created_on_utc",
      "m_deposit_account_on_hold_transaction.is_reversed",
      "m_deposit_account_on_hold_transaction.savings_account_id",
      "m_deposit_account_on_hold_transaction.transaction_date",
      "m_deposit_account_on_hold_transaction.transaction_type_enum",
      "m_deposit_account_term_and_preclosure.deposit_amount",
      "m_deposit_account_term_and_preclosure.deposit_period",
      "m_deposit_account_term_and_preclosure.deposit_period_frequency_enum",
      "m_deposit_account_term_and_preclosure.expected_firstdepositon_date",
      "m_deposit_account_term_and_preclosure.maturity_amount",
      "m_deposit_account_term_and_preclosure.maturity_date",
      "m_deposit_account_term_and_preclosure.on_account_closure_enum",
      "m_deposit_account_term_and_preclosure.savings_account_id",
      "m_deposit_account_term_and_preclosure.transfer_interest_to_linked_account",
      "m_deposit_account_term_and_preclosure.transfer_to_savings_account_id",
      "m_deposit_product_recurring_detail.savings_product_id",
      "m_loan.account_no",
      "m_loan.accrued_till",
      "m_loan.allow_full_term_for_tranche",
      "m_loan.approved_principal",
      "m_loan.approvedon_date",
      "m_loan.approvedon_userid",
      "m_loan.charge_off_reason_cv_id",
      "m_loan.charged_off_by_userid",
      "m_loan.charged_off_on_date",
      "m_loan.client_id",
      "m_loan.closedon_date",
      "m_loan.closedon_userid",
      "m_loan.create_standing_instruction_at_disbursement",
      "m_loan.created_by",
      "m_loan.created_on_utc",
      "m_loan.disbursedon_date",
      "m_loan.disbursedon_userid",
      "m_loan.expected_disbursedon_date",
      "m_loan.expected_firstrepaymenton_date",
      "m_loan.expected_maturedon_date",
      "m_loan.last_modified_by",
      "m_loan.last_modified_on_utc",
      "m_loan.loan_status_id",
      "m_loan.loan_sub_status_id",
      "m_loan.loan_type_enum",
      "m_loan.loanpurpose_cv_id",
      "m_loan.repayment_start_date_type_enum",
      "m_loan.term_period_frequency_enum",
      "m_loan.writeoff_reason_cv_id",
      "m_loan_amortization_allocation_mapping.amortization_type",
      "m_loan_charge.charge_calculation_enum",
      "m_loan_charge.charge_payment_mode_enum",
      "m_loan_charge.charge_time_enum",
      "m_loan_recalculation_details.compound_type_enum",
      "m_loan_recalculation_details.compounding_frequency_nth_day_enum",
      "m_loan_recalculation_details.compounding_frequency_type_enum",
      "m_loan_recalculation_details.compounding_frequency_weekday_enum",
      "m_loan_recalculation_details.reschedule_strategy_enum",
      "m_loan_recalculation_details.rest_frequency_nth_day_enum",
      "m_loan_recalculation_details.rest_frequency_type_enum",
      "m_loan_recalculation_details.rest_frequency_weekday_enum",
      "m_loan_reschedule_request.reschedule_reason_cv_id",
      "m_loan_reschedule_request.status_enum",
      "m_loan_term_variations.applied_on_loan_status",
      "m_loan_term_variations.term_type",
      "m_loan_transaction.transaction_type_enum",
      "m_loan_transaction_relation.relation_type_enum",
      "m_savings_account.account_type_enum",
      "m_savings_account.deposit_type_enum",
      "m_savings_account.interest_calculation_days_in_year_type_enum",
      "m_savings_account.interest_calculation_type_enum",
      "m_savings_account.interest_compounding_period_enum",
      "m_savings_account.interest_posting_period_enum",
      "m_savings_account.lockedin_until_date_derived",
      "m_savings_account.lockin_period_frequency_enum",
      "m_savings_account.on_hold_funds_derived",
      "m_savings_account.status_enum",
      "m_savings_account.sub_status_enum",
      "m_savings_account.total_savings_amount_on_hold",
      "m_savings_account_charge.amount_outstanding_derived",
      "m_savings_account_charge.charge_calculation_enum",
      "m_savings_account_charge.charge_time_enum",
      "m_savings_account_transaction.transaction_type_enum",
      "m_savings_product.accounting_type",
      "m_savings_product.interest_calculation_days_in_year_type_enum",
      "m_savings_product.interest_calculation_type_enum",
      "m_savings_product.interest_compounding_period_enum",
      "m_savings_product.interest_posting_period_enum",
      "m_savings_product.lockin_period_frequency_enum",
    ],
  };
  // 재실행 필요셋 — 스냅샷 이후 데이터/프롬프트 갱신으로 결과가 뒤집힐 수 있는 컬럼.
  const RERUN_SETS = {
    mock: [],
    fineract: [
      // ═══ 사이드 이펙트 재확진 확장 세트 — 20 컬럼 ═══
      // v3__14~15 에서 관찰된 HIGH 자기 확신·부분 권위 흔들림이
      // 프롬프트 변경(aa1d8c8+5c15d7a) 사이드 이펙트인지 시험.
      //
      // 타깃 1 · HIGH 자기 확신의 재현성 (7)
      //   status_enum 계열에서 부분 권위를 HIGH+review=False 로 자기 선언하는 패턴이
      //   재현되는가. status/sub_status 유사 컬럼에서도 발생하는가.
      "m_client.status_enum",                     // v3__14 MED/7R → v3__15 HIG/4. 재현 시 확진
      "m_savings_account.status_enum",            // v3__14 HIG/8. → v3__15 HIG/4. 반복
      "m_loan.loan_status_id",                    // 잘 되던 케이스. HIGH cd=11~12 유지 확인
      "m_loan.loan_sub_status_id",                // 지난 라운드 cd=3 HIGH. 흔들림 여부
      "m_savings_account.sub_status_enum",        // 지난 라운드 cd=7 HIGH. 흔들림 여부
      "m_loan_reschedule_request.status_enum",    // 다른 status_enum. cd=3 HIGH 유지?
      "gsim_accounts.savings_status_id",          // 정본 도달 케이스 (cd=11). 안정성
      //
      // 타깃 2 · 부분 권위 판정 일관성 (5)
      //   정본이 코퍼스에 확실히 있는데 부분 권위에서 만족하는 패턴.
      //   "정의 전체" 방침이 라운드 간에 일관되게 통하는가.
      "m_loan_transaction.transaction_type_enum", // v3__14 강제종결→v3__15 cd=35. 다시 만족스러운가
      "m_loan_charge.charge_time_enum",           // cd=17 정본 도달 유지 확인
      "m_loan_term_variations.term_type",         // cd=12 정의 전체 유지
      "m_loan_recalculation_details.compound_type_enum", // cd=4 유지
      "m_loan_recalculation_details.compounding_frequency_type_enum", // cd=5 유지
      //
      // 타깃 3 · 종료 판단이 자기 정당화 채널로 작동하는가 (4)
      //   thinking 이 확인 사실 나열용인지 미확인 발견용인지.
      //   나쁜 사례가 반복되면 종료 판단 롤백 근거.
      "m_loan_charge.charge_payment_mode_enum",   // 좋은 endnote 유지 확인 (정직 실패)
      "m_loan.charge_off_reason_cv_id",           // 좋은 endnote 유지 확인 (명확 근거)
      "m_loan.writeoff_reason_cv_id",             // 유사 CodeValue FK. endnote 어떤 성격?
      "m_client.closure_reason_cv_id",            // 좋은 사례 (cd=3 HIGH)
      //
      // 타깃 4 · 회귀 없음 확인 (4)
      "m_client.date_of_birth",                   // HIGH format 유지
      "m_loan.client_id",                         // entity ops=2 유지
      "glim_accounts.principal_amount",           // measure HIGH 유지
      "m_client.email_address",                   // null capability 판정 유지
    ],
  };
  const ds = window.RENDER_DATASET || "mock";
  const VERIFY_SET = VERIFY_SETS[ds] || [];
  const RERUN_SET = RERUN_SETS[ds] || [];
  const [colFilter, setColFilter] = rUseState("all");
  const groupsAll = window.RenderMeta.groupByTable();
  const verifySet = new Set(VERIFY_SET);
  const rerunSet = new Set(RERUN_SET);
  const filterFn = colFilter === "verify" ? (c) => verifySet.has(c)
                 : colFilter === "rerun"  ? (c) => rerunSet.has(c)
                 : null;
  const groups = filterFn
    ? groupsAll.map((g) => ({ ...g, cols: g.cols.filter(filterFn) })).filter((g) => g.cols.length > 0)
    : groupsAll;
  const allCols = groups.flatMap((g) => g.cols);
  const verifyCount = groupsAll.flatMap((g) => g.cols).filter((c) => verifySet.has(c)).length;
  const rerunCount  = groupsAll.flatMap((g) => g.cols).filter((c) => rerunSet.has(c)).length;

  const setRes = (id, patch) => setResults((p) => ({ ...p, [id]: { ...(p[id] || {}), ...patch } }));

  async function runOne(cid, live) {
    if (!window.RenderAPI.hasKey()) {
      setNote("API 키가 필요합니다 — 아래에 입력하거나 '스냅샷 불러오기'로 기록을 재생하세요.");
      return;
    }
    const T = live ? R_T.live : R_T.batch;
    runningRef.current = cid;
    if (live || followRef.current) setActive(cid);
    setRes(cid, { status: "running", events: [], answer: null, trace: null });
    const events = [];
    const push = (e) => { events.push(e); setRes(cid, { events: [...events] }); };

    const onStep = async (e) => {
      if (e.kind === "think") { push({ k: "think", text: e.text }); await rsleep(T.think); }
      else if (e.kind === "endnote") { push({ k: "endnote", text: e.text }); await rsleep(T.think); }
      else if (e.kind === "op_request") { push({ k: "op", op: e.op, args: e.args, status: "req" }); await rsleep(T.req); }
      else if (e.kind === "op_done") {
        const i = events.findLastIndex((x) => x.k === "op" && x.status === "req");
        if (i >= 0) { events[i] = { ...events[i], status: "done", result: e.result }; setRes(cid, { events: [...events] }); }
        await rsleep(T.done);
      } else if (e.kind === "answer") {
        // 라이브 스트림: answer 앞에 종료 판단(thinking) 을 endnote 로 먼저 노출.
        // 스냅샷 재생과 동일한 시각적 흐름을 만든다.
        if (e.thinking) push({ k: "endnote", text: e.thinking });
        push({ k: "answer", answer: e });
      }
    };

    try {
      const out = await window.RenderAgent.run(cid, {
        store: window.SIGNAL_STORE, corpus: window.CORPUS,
        callModel: (args) => window.RenderAPI.callModel(args, { onRetry: (a) => setNote(`재시도 ${a}회…`) }),
        onStep, system: getSystemPrompt(),
      });
      setNote(null);
      setRes(cid, { status: "done", answer: out.answer, trace: out.trace });
    } catch (e) {
      setRes(cid, { status: "done", answer: { description: "실행 오류: " + (e.message || e), confidence: "LOW", evidence: [], conflicts: [], route_to_human: { needed: false } }, error: true });
      setNote(null);
    }
  }

  async function runAll() {
    abortRef.current = false; followRef.current = true; setBusy(true);
    for (const cid of allCols) {
      if (abortRef.current) break;
      const ex = results[cid];
      if (ex && ex.status === "done") continue;
      await runOne(cid, false);
    }
    followRef.current = true; setBusy(false);
  }

  // ---- 스냅샷 ----
  function saveSnapshot() {
    // 필터는 view용이므로 저장 시 무시하고 results 전체 대상.
    const snap = { version: 1, kind: "render", mode, model: window.RenderAPI.getModel(),
      prompt_id: getPromptId(), created: new Date().toISOString(),
      results: Object.fromEntries(Object.entries(results).filter(([c, r]) => r && r.trace)
        .map(([c, r]) => [c, { trace: r.trace, answer: r.answer }])) };
    const blob = new Blob([JSON.stringify(snap)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = snapshotFilename; a.click();
  }
  function applySnapshot(snap, silent) {
    // 두 포맷 허용: {version,results:{cid:{trace,answer}}} | {cid:{trace}}(구)
    const res = snap && snap.results ? snap.results : snap;
    if (!res || typeof res !== "object") throw new Error("형식 불일치");
    const loaded = {};
    for (const [cid, r] of Object.entries(res)) {
      const trace = r.trace || [];
      loaded[cid] = { status: "done", events: traceToEvents(trace), trace, answer: r.answer || answerOf(trace) };
    }
    setResults(loaded);
    if (!silent) {
      const cnt = Object.keys(loaded).length;
      const model = (snap && snap.model) || "기록";
      const date = (snap && snap.created) ? snap.created.slice(0, 10) : "";
      const pl = (snap && snap.prompt_id === "balanced_v3")
        ? " · v3(구조화)"
        : ((snap && snap.prompt_id && window.RenderPrompts) ? " · " + window.RenderPrompts.get(snap.prompt_id).label.split(" ·")[0] : "");
      setNote(`스냅샷 로드 — ${cnt}컬럼 · ${model}${pl}${date ? " · " + date : ""}`);
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
  const answered = allCols.map((c) => results[c]).filter((r) => r && r.answer && r.status === "done");
  const dist = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let digTotal = 0, humanTotal = 0;
  answered.forEach((r) => { dist[r.answer.confidence] = (dist[r.answer.confidence] || 0) + 1;
    digTotal += (r.trace || []).filter((s) => s.kind === "op" && TIER2.has(s.op)).length;
    if (r.answer.route_to_human && r.answer.route_to_human.needed) humanTotal++; });

  return (
    <RenderModeContext.Provider value={mode}>
    <div style={{ display: "grid", gridTemplateColumns: "390px 1fr", gap: 0, height: "calc(100vh - 50px)", overflow: "hidden" }}>
      {/* 좌 — flex column: 상단(header/buttons/summary) 고정, 하단(컬럼 목록) 별도 스크롤 */}
      <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 상단 고정 영역 */}
        <div style={{ padding: "18px 16px 8px", flexShrink: 0 }}>
          <div style={{ ...rmono, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{headerTitle}</div>
          <div style={{ fontSize: 14, color: "var(--dim)", marginBottom: 14, lineHeight: 1.5 }}>
            {headerSub}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <Btn on={!busy} color="var(--accent)" onClick={runAll}>전체 실행</Btn>
            <Btn on={busy} color="var(--low)" onClick={() => (abortRef.current = true)}>중단</Btn>
            <Btn on={answered.length > 0} color="var(--sig)" onClick={saveSnapshot}>스냅샷 저장</Btn>
            <Btn on={!!getSnapshotSrc()} color="var(--sig)" onClick={() => { try { applySnapshot(getSnapshotSrc()); } catch (e) { setNote("스냅샷 로드 실패: " + (e.message || e)); } }}>스냅샷 불러오기</Btn>
            <Btn on={true} color="var(--dim)" onClick={() => fileRef.current.click()}>파일 열기</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={loadFile} style={{ display: "none" }} />
          </div>
          {note && <div style={{ ...rmono, fontSize: 13.5, color: "var(--med)", marginBottom: 8 }}>{note}</div>}
          {!window.RenderAPI.hasKey() && <KeyBox />}
          {answered.length > 0 && <Summary dist={dist} total={answered.length} dig={digTotal} human={humanTotal} />}
        </div>

        {/* 컬럼 목록 — 별도 스크롤 영역 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 18px", borderTop: "1px solid var(--rule)" }}>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {[["all", "전체"], ["verify", `검증셋 (${verifyCount})`], ["rerun", `재실행 필요 (${rerunCount})`]].map(([k, label]) => (
              <div key={k} onClick={() => setColFilter(k)}
                style={{ ...rmono, fontSize: 12, padding: "3px 12px", cursor: "pointer", borderRadius: 4,
                  color: colFilter === k ? "#0c0e11" : "var(--dim)",
                  background: colFilter === k ? "var(--accent)" : "rgba(0,0,0,0.25)",
                  border: `1px solid ${colFilter === k ? "var(--accent)" : "var(--rule)"}` }}>
                {label}
              </div>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.table} style={{ marginTop: 14 }}>
              <div style={{ ...rmono, fontSize: 12.5, letterSpacing: "0.06em", color: "var(--dim)", marginBottom: 5 }}>
                {g.label} · <span style={{ opacity: 0.6 }}>{g.table}</span>
              </div>
              {g.cols.map((cid) => (
                <ColumnRow key={cid} cid={cid} r={results[cid]} active={active === cid} busy={busy}
                  onView={() => { if (cid !== runningRef.current) followRef.current = false; setActive(cid); }}
                  onRun={() => { if (!busy) runOne(cid, true); }} />))}
            </div>
          ))}
        </div>
      </div>

      {/* 우 */}
      <div style={{ display: "flex", overflow: "hidden" }}>
        <div style={{ flex: "0 0 60%", padding: "20px 24px", overflowY: "auto", borderRight: "1px solid var(--rule)" }}>
          {!active && <Center>컬럼을 클릭하면 단건 실행(라이브). 전체 실행은 좌측 버튼. 키 없이 보려면 '스냅샷 불러오기'.</Center>}
          {busy && !followRef.current && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "7px 12px",
              background: "rgba(106,169,224,0.09)", border: "1px solid var(--sig)44", borderRadius: 5 }}>
              <span style={{ ...rmono, fontSize: 13, color: "var(--sig)" }}>진행 추적 멈춤 — 완료 컬럼 보는 중</span>
              <span onClick={() => { followRef.current = true; if (runningRef.current) setActive(runningRef.current); }}
                style={{ ...rmono, fontSize: 13, color: "var(--accent)", border: "1px solid var(--accent)66", borderRadius: 4, padding: "2px 9px", cursor: "pointer" }}>최신으로 따라가기</span>
            </div>)}
          {active && <Thread cid={active} r={results[active]} />}
        </div>
        <div style={{ flex: "0 0 40%", padding: "20px 22px", overflowY: "auto", background: "rgba(0,0,0,0.14)" }}>
          {!active && <Center style={{ fontSize: 15 }}>컬럼을 선택하면 신호·검증 포인트가 표시됩니다.</Center>}
          {active && <ColumnDetail cid={active} />}
        </div>
      </div>
    </div>
    </RenderModeContext.Provider>
  );
}

// ---- 트레이스 스레드 ----
function Thread({ cid, r }) {
  if (!r) return null;
  const a = window.RenderMeta.arch(cid);
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ ...rmono, fontSize: 13, color: "var(--dim)" }}>{cid}</div>
      <div style={{ fontSize: 17, fontWeight: 600, margin: "6px 0 4px", ...rmono }}>{cid.split(".").pop()}
        <span style={{ fontSize: 13, color: a.color, marginLeft: 10, fontWeight: 400 }}>{a.marker} · {a.expect}</span></div>
      <div style={{ marginTop: 14 }}>{(r.events || []).map((e, i) => <REvent key={i} e={e} />)}</div>
      {r.status === "running" && <div style={{ ...rmono, fontSize: 14, color: "var(--sig)" }}>실행 중…</div>}
    </div>
  );
}

function REvent({ e }) {
  if (e.k === "think")
    return <div style={{ borderLeft: "2px solid var(--med)", padding: "4px 12px", margin: "10px 0", fontSize: 14.5, color: "var(--muted, var(--dim))", fontStyle: "italic" }}>{e.text}</div>;
  if (e.k === "endnote")
    // 종료 판단 — op-중 think 와 구분되게 조금 더 강조 (실선 + 배경 없이 라벨만).
    return (
      <div style={{ borderLeft: "2px solid var(--sig)", padding: "6px 12px", margin: "14px 0 10px", fontSize: 14.5, color: "var(--text)", lineHeight: 1.55 }}>
        <span style={{ ...rmono, fontSize: 10, color: "var(--sig)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 3 }}>종료 판단</span>
        {e.text}
      </div>);
  if (e.k === "op") {
    const t2 = TIER2.has(e.op);
    return (
      <div style={{ border: "1px solid var(--rule)", borderLeft: `2px solid ${t2 ? "var(--sig)" : "var(--dim)"}`, borderRadius: 5, padding: "9px 13px", margin: "10px 0", background: "rgba(0,0,0,0.22)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ ...rmono, fontSize: 10, color: t2 ? "var(--sig)" : "var(--dim)", border: `1px solid ${t2 ? "var(--sig)" : "var(--dim)"}66`, borderRadius: 8, padding: "0 6px", textTransform: "uppercase" }}>{t2 ? "dig" : "peek"}</span>
          <span style={{ ...rmono, fontSize: 14.5, color: t2 ? "var(--sig)" : "var(--text)", fontWeight: 600 }}>{e.op}</span>
          <span style={{ ...rmono, fontSize: 13, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.args && Object.keys(e.args).length ? JSON.stringify(e.args) : ""}</span>
          <span style={{ flex: 1 }} />
          <span style={{ ...rmono, fontSize: 12, color: e.status === "done" ? "var(--high)" : "var(--med)" }}>{e.status === "done" ? "조회 완료" : "요청 중…"}</span>
        </div>
        {e.result && <pre style={{ ...rmono, fontSize: 12.5, color: "var(--text)", whiteSpace: "pre-wrap", margin: "8px 0 0", maxHeight: 150, overflowY: "auto", opacity: 0.82 }}>{JSON.stringify(e.result, null, 1).slice(0, 1100)}</pre>}
      </div>);
  }
  if (e.k === "answer") return <AnswerCard a={e.answer} />;
  return null;
}

// AnswerCard 디스패처 — mode 에 따라 V2 / V3 뷰 선택.
function AnswerCard({ a }) {
  const mode = rUseContext(RenderModeContext);
  return mode === "v3" ? <AnswerCardV3 a={a} /> : <AnswerCardV2 a={a} />;
}

// ── v2 뷰 — description·evidence·conflicts·route_to_human 만 ───────────
function AnswerCardV2({ a }) {
  if (!a) return null;
  const c = CONFC[a.confidence] || "var(--dim)";
  return (
    <div className="answer" style={{ border: `1px solid ${c}66`, borderLeft: `3px solid ${c}`, borderRadius: 6, padding: "13px 16px", margin: "16px 0 8px", background: "rgba(0,0,0,0.18)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 9 }}>
        <span className="conf" style={{ ...rmono, fontSize: 11, fontWeight: 700, color: "#0c0e11", background: c, borderRadius: 7, padding: "2px 10px", letterSpacing: "0.04em" }}>{a.confidence}</span>
        {a.route_to_human && a.route_to_human.needed &&
          <span style={{ fontSize: 12.5, color: "var(--low)", fontWeight: 500 }}>사람 확인 필요 — {a.route_to_human.reason}</span>}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.65, color: "var(--text)" }}>{a.description}</div>
      {(a.evidence || []).length > 0 &&
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 11 }}>
          {a.evidence.map((ev, i) => <span key={i} style={{ ...rmono, fontSize: 11, color: "var(--dim)", border: "1px solid var(--rule)", borderRadius: 5, padding: "1px 7px", background: "rgba(0,0,0,0.25)" }}>{ev}</span>)}
        </div>}
      {(a.conflicts || []).map((cf, i) => (
        <div key={i} className="conflict" style={{ fontSize: 12.5, color: "var(--text)", background: "rgba(224,107,94,0.10)", border: "1px solid rgba(224,107,94,0.32)", borderRadius: 5, padding: "7px 10px", marginTop: 8 }}>
          <span style={{ ...rmono, fontSize: 11, color: "var(--low)", marginRight: 6 }}>{cf.type}</span>{cf.detail}</div>))}
    </div>
  );
}

// ── v3 뷰 — description + 구조화 슬롯 + review_note ──
//   스키마: capability{primary,alternatives} · codedict · format ·
//           aggregation{additive,suggested} · confidence · review_note · needs_review
//   구 스키마(reasoning·evidence·conflicts·route_to_human) 필드가 스냅샷에 남아
//   있어도 조용히 무시하고 렌더 가능한 것만 그린다 (하위호환).
function AnswerCardV3({ a }) {
  if (!a) return null;
  const c = CONFC[a.confidence] || "var(--dim)";

  const cap = a.capability || {};
  const codedict = Array.isArray(a.codedict) ? a.codedict : [];
  const format = a.format;
  const agg = a.aggregation || {};

  const hasCodedict = codedict.length > 0;
  const hasFormat = !!format;
  const hasAgg = !!(agg.additive || (agg.suggested && agg.suggested.length > 0));

  // 신구 스키마 겸용: needs_review(신) 없으면 route_to_human.needed(구)로.
  const needsReview = a.needs_review != null ? !!a.needs_review
    : !!(a.route_to_human && a.route_to_human.needed);
  // review_note(신) 없으면 구 필드에서 합성.
  const reviewNote = a.review_note != null ? a.review_note
    : [ ...(a.conflicts || []).map((cf) => cf.detail),
        (a.route_to_human && a.route_to_human.reason) || "" ].filter(Boolean).join(" ");

  // 표준 표기(dimension_categorical/dimension_time)와 구 표기(categorical_dimension/time_dimension)를
  // 모두 받아 렌더한다. 이전 스냅샷 두 개가 구 표기로 저장돼 있어 하위호환 필요.
  const CAP_COLOR = {
    entity:                "var(--sig)",
    dimension_categorical: "var(--accent)",
    dimension_time:        "var(--med)",
    categorical_dimension: "var(--accent)",  // 구 표기
    time_dimension:        "var(--med)",     // 구 표기
    measure:               "var(--high)",
  };
  const capColor = (cap.primary && CAP_COLOR[cap.primary]) || "var(--dim)";
  const ADD_LABEL = { yes: "additive", semi: "semi-additive", no: "non-additive" };

  return (
    <div className="answer" style={{ border: `1px solid ${c}66`, borderLeft: `3px solid ${c}`, borderRadius: 6, padding: "13px 16px", margin: "16px 0 8px", background: "rgba(0,0,0,0.18)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 9 }}>
        <span className="conf" style={{ ...rmono, fontSize: 11, fontWeight: 700, color: "#0c0e11", background: c, borderRadius: 7, padding: "2px 10px", letterSpacing: "0.04em" }}>{a.confidence}</span>
        {needsReview &&
          <span style={{ ...rmono, fontSize: 11, fontWeight: 600, color: "#0c0e11", background: "var(--low)", borderRadius: 7, padding: "2px 10px" }}>검수 필요</span>}
      </div>

      {/* description — 검수 대상 1 */}
      <div style={{ fontSize: 15, lineHeight: 1.65, color: "var(--text)" }}>{a.description}</div>

      {/* 구조화 슬롯 영역 */}
      <div style={{ marginTop: 13, paddingTop: 11, borderTop: "1px dashed var(--rule)", display: "flex", flexDirection: "column", gap: 9 }}>

        {/* capability — 항상 렌더 (미분류도 명시) */}
        <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ ...rmono, fontSize: 10.5, color: "var(--dim)", letterSpacing: "0.08em", textTransform: "uppercase", flex: "0 0 90px" }}>capability</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {cap.primary
              ? <span style={{ ...rmono, fontSize: 12, fontWeight: 600, color: capColor, border: `1px solid ${capColor}66`, borderRadius: 4, padding: "1px 8px", background: "rgba(0,0,0,0.18)" }}>{cap.primary}</span>
              : <span style={{ ...rmono, fontSize: 12, color: "var(--dim)", border: "1px dashed var(--rule)", borderRadius: 4, padding: "1px 8px" }}>미분류</span>}
            {(cap.alternatives || []).map((alt, i) => (
              <span key={i} style={{ ...rmono, fontSize: 11.5, color: "var(--dim)", border: "1px solid var(--rule)", borderRadius: 4, padding: "1px 7px" }}>or {alt}</span>
            ))}
          </div>
        </div>

        {/* codedict — 검수 대상 2 */}
        {hasCodedict && (
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ ...rmono, fontSize: 10.5, color: "var(--dim)", letterSpacing: "0.08em", textTransform: "uppercase", flex: "0 0 90px", paddingTop: 3 }}>codedict</span>
            <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 12px", ...rmono, fontSize: 12.5 }}>
              {codedict.map((kv, i) => (
                <React.Fragment key={i}>
                  <span style={{ color: "var(--sig)" }}>{kv.value}</span>
                  <span style={{ color: "var(--text)" }}>{kv.label}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* format */}
        {hasFormat && (
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <span style={{ ...rmono, fontSize: 10.5, color: "var(--dim)", letterSpacing: "0.08em", textTransform: "uppercase", flex: "0 0 90px" }}>format</span>
            <span style={{ ...rmono, fontSize: 13, color: "var(--text)", border: "1px solid var(--rule)", borderRadius: 4, padding: "1px 8px", background: "rgba(0,0,0,0.18)" }}>{format}</span>
          </div>
        )}

        {/* aggregation */}
        {hasAgg && (
          <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ ...rmono, fontSize: 10.5, color: "var(--dim)", letterSpacing: "0.08em", textTransform: "uppercase", flex: "0 0 90px" }}>aggregation</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {agg.additive && <span style={{ ...rmono, fontSize: 12, color: "var(--high)", border: "1px solid var(--high)55", borderRadius: 4, padding: "1px 7px" }}>{ADD_LABEL[agg.additive] || agg.additive}</span>}
              {(agg.suggested || []).map((fn, i) => (
                <span key={i} style={{ ...rmono, fontSize: 11.5, color: "var(--sig)", border: "1px solid var(--sig)55", borderRadius: 4, padding: "1px 7px" }}>{fn}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* review_note — 검수자용 한 단락. 비어 있으면 렌더 안 함 = 검수 부담 없음 */}
      {reviewNote && (
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text)",
          background: needsReview ? "rgba(224,107,94,0.10)" : "rgba(106,169,224,0.08)",
          border: `1px solid ${needsReview ? "rgba(224,107,94,0.32)" : "rgba(106,169,224,0.25)"}`,
          borderRadius: 5, padding: "9px 12px", marginTop: 11 }}>
          <span style={{ ...rmono, fontSize: 10.5, color: needsReview ? "var(--low)" : "var(--sig)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>review note</span>
          {reviewNote}
        </div>
      )}
    </div>
  );
}
// ---- 컬럼 상세 (우 40%) ----
function ColumnDetail({ cid }) {
  const r = window.SIGNAL_STORE.columns[cid];
  const a = window.RenderMeta.arch(cid);
  const s = r.schema;
  const man = window.RenderMeta.manifest(cid);
  const Row = ({ k, v }) => (
    <div style={{ display: "flex", gap: 8, ...rmono, fontSize: 13, padding: "2px 0" }}>
      <span style={{ width: 76, color: "var(--dim)", flexShrink: 0 }}>{k}</span><span style={{ color: "var(--text)" }}>{v}</span></div>);
  return (
    <div>
      <div style={{ ...rmono, fontSize: 15, fontWeight: 600 }}>{cid.split(".").pop()}</div>
      <div style={{ display: "inline-block", ...rmono, fontSize: 11.5, color: a.color, border: `1px solid ${a.color}55`, borderRadius: 3, padding: "1px 7px", margin: "8px 0 12px" }}>{a.marker} · {a.expect}</div>
      <div style={{ fontSize: 13.5, color: "var(--muted, var(--dim))", lineHeight: 1.6, marginBottom: 16 }}>{a.tip}</div>

      <DSection title="스키마 (NL이 이미 보는 것)">
        <Row k="table" v={s.table} /><Row k="type" v={s.type} /><Row k="nullable" v={String(s.nullable)} />
        <Row k="pk" v={String(s.pk)} /><Row k="fk" v={s.fk || "—"} />
      </DSection>

      <DSection title={`매니페스트 · tier-1 신호 (${man.join(", ")})`}>
        {r.orm && r.orm.present && <Row k="orm.field" v={r.orm.field} />}
        {r.orm && r.orm.present && <Row k="orm.enum" v={r.orm.enum ? JSON.stringify(r.orm.enum) : "없음 → tier-2 필요"} />}
        {r.orm && r.orm.present && (r.orm.annotations || []).length > 0 && <Row k="ann" v={r.orm.annotations.join(", ")} />}
        {r.profile && r.profile.present && <Row k="distinct" v={(r.profile.distinct_sample || []).join(" · ")} />}
        {r.profile && r.profile.present && <Row k="format" v={r.profile.inferred_format || "—"} />}
        {r.profile && r.profile.present && <Row k="null율" v={r.profile.null_rate} />}
        {r.reftable && <Row k="reftable" v={r.reftable.present ? "연결 선언됨" : "연결 미선언"} />}
      </DSection>
      <div style={{ ...rmono, fontSize: 12, color: "var(--dim)", marginTop: 14, lineHeight: 1.6 }}>
        tier-2(코드 dig)는 정적 신호로 라벨·계보·연결이 안 풀릴 때만. 코드 원문은 '데이터·코드 탐색' 탭에서.
      </div>
    </div>
  );
}
function DSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...rmono, fontSize: 12, letterSpacing: "0.05em", color: "var(--dim)", marginBottom: 5, borderBottom: "1px solid var(--rule)", paddingBottom: 4 }}>{title}</div>
      {children}
    </div>);
}

function Summary({ dist, total, dig, human }) {
  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: 5, padding: "10px 12px", marginTop: 6 }}>
      <div style={{ ...rmono, fontSize: 12.5, letterSpacing: "0.06em", color: "var(--dim)", marginBottom: 7 }}>요약 · {total}컬럼</div>
      <div style={{ display: "flex", gap: 12, ...rmono, fontSize: 14, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ color: "var(--high)" }}>HIGH {dist.HIGH}</span>
        <span style={{ color: "var(--med)" }}>MED {dist.MEDIUM}</span>
        <span style={{ color: "var(--low)" }}>LOW {dist.LOW}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "var(--sig)" }}>dig {dig}</span>
        <span style={{ color: "var(--low)" }}>사람 {human}</span>
      </div>
    </div>);
}

function KeyBox() {
  const [k, setK] = rUseState("");
  return (
    <div style={{ border: "1px dashed var(--rule)", borderRadius: 5, padding: "8px 10px", marginBottom: 10 }}>
      <div style={{ fontSize: 13.5, color: "var(--muted, var(--dim))", marginBottom: 5 }}>라이브 실행하려면 Anthropic 키 입력 (localStorage 저장 · 리포엔 안 남음). 키 없이도 '스냅샷 불러오기'로 기록 재생 가능.</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={k} onChange={(e) => setK(e.target.value)} placeholder="sk-ant-…" type="password"
          style={{ ...rmono, flex: 1, fontSize: 14, background: "rgba(0,0,0,0.3)", border: "1px solid var(--rule)", borderRadius: 4, color: "var(--text)", padding: "4px 8px" }} />
        <Btn on={k.length > 10} color="var(--accent)" onClick={() => { localStorage.setItem("anthropic_key", k); location.reload(); }}>저장</Btn>
      </div>
    </div>);
}
function Btn({ on, color, onClick, children }) {
  return (
    <button onClick={on ? onClick : undefined} style={{ ...rmono, fontSize: 14, padding: "5px 12px", borderRadius: 4,
      cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.4, border: `1px solid ${color}66`, background: color + "18", color }}>{children}</button>);
}
function Center({ children, style }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "55vh", color: "var(--muted, var(--dim))", fontSize: 15, textAlign: "center", padding: 20, lineHeight: 1.6, ...style }}>{children}</div>;
}

window.RenderScreen = RenderScreen;
