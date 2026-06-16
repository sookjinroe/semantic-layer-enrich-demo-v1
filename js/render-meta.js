// render-meta.js — 아키타입 메타(마커·색·검증 포인트) + 그룹핑. window.RenderMeta.
window.RenderMeta = (function () {
  // 마커: NL의 함정/경계 칩과 동형. 각 아키타입이 '무엇을 검증하는가'.
  const ARCH = {
    "자명":          { marker: "자명",   color: "var(--dim)",    expect: "dig 0 · HIGH",
      tip: "이름+타입으로 정체가 섬 — dig 불필요. 과탐색하면 비효율." },
    "enum-clean":   { marker: "enum",   color: "var(--high)",   expect: "dig 0 · HIGH",
      tip: "ORM enum이 라벨을 직접 운반 — tier-1로 끝, dig 불필요." },
    "PII":          { marker: "분류",   color: "var(--lin)",    expect: "HIGH · 분류 참조",
      tip: "분류(PII)가 ORM 어노테이션에 — tier-1에서 읽어 description에 참조." },
    "형식":          { marker: "형식",   color: "var(--med)",    expect: "HIGH · 형식 명시",
      tip: "형식(YYYYMM 등)은 데이터 프로파일에서만 — 안 보면 NL이 0행." },
    "tier2-success":{ marker: "dig",    color: "var(--sig)",    expect: "dig≥1 · 검증 후 HIGH",
      tip: "라벨이 코드에 단일 연결 — grep→read로 권위 확보 기대." },
    "충돌-크럭스":    { marker: "크럭스", color: "var(--low)",    expect: "연결 검증 · 05 conflict",
      tip: "값 겹치는 오귀속 후보 존재 — 필드명 연결 검증 필수. 값만 겹치면 채택 금지." },
    "lineage":      { marker: "계보",   color: "var(--lin)",    expect: "ETL dig · 파생식 교정",
      tip: "파생식이 ETL/뷰에 — 이름에서 추정 말고 retrieve. '이름은 X 실제 Y' 교정." },
    "reftable-link":{ marker: "코드표", color: "var(--accent)", expect: "라벨 매핑 · 연결 한정",
      tip: "공통코드 덤프 + 연결 추론 — 값매칭은 검증 아님(연결 미선언이면 한정)." },
    "floor":        { marker: "바닥",   color: "var(--low)",    expect: "LOW · route_to_human",
      tip: "라벨이 코드·공통코드·카탈로그 어디에도 없음 — LOW + 사람 라우팅이 정답." },
  };
  const TABLE_LABEL = {
    CUST_BASE_INFO: "고객 기본", LOAN_APPL_HIST: "대출 신청이력", CARD_APPL: "카드 신청",
    CARD_BILL_HIST: "카드 청구이력", DEP_ACCT: "예금 계좌", CONTACT_LOG: "접촉 로그",
  };
  const TABLE_ORDER = ["CUST_BASE_INFO", "LOAN_APPL_HIST", "CARD_APPL", "CARD_BILL_HIST", "DEP_ACCT", "CONTACT_LOG"];

  function arch(cid) { return ARCH[(window.SIGNAL_STORE.columns[cid] || {}).archetype] || {}; }
  function groupByTable() {
    const store = window.SIGNAL_STORE;
    const byT = {};
    for (const cid of Object.keys(store.columns)) {
      const t = store.columns[cid].schema.table;
      (byT[t] = byT[t] || []).push(cid);
    }
    return TABLE_ORDER.filter((t) => byT[t]).map((t) => ({ table: t, label: TABLE_LABEL[t] || t, cols: byT[t].sort() }));
  }
  // 매니페스트: 당길 수 있는 tier-1 신호
  function manifest(cid) {
    const r = window.SIGNAL_STORE.columns[cid]; const m = [];
    if (r.orm && r.orm.present) m.push("orm");
    if (r.profile && r.profile.present) m.push("profile");
    m.push("reftable_dump");
    return m;
  }
  return { ARCH, TABLE_LABEL, TABLE_ORDER, arch, groupByTable, manifest };
})();
