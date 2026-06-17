// render-meta.js — 아키타입 메타(마커·색·검증 포인트) + 그룹핑. window.RenderMeta.
window.RenderMeta = (function () {
  // 마커: NL의 함정/경계 칩과 동형. 각 아키타입이 '무엇을 검증하는가'.
  const ARCH = {
    "자명":          { marker: "자명",   color: "var(--dim)",    expect: "안 캐고 바로 · 확신 높음",
      tip: "이름과 타입만으로 뜻이 분명한 컬럼. 더 캐지 않고 바로 설명하면 됨." },
    "enum-clean":   { marker: "코드표내장", color: "var(--high)", expect: "그대로 읽기 · 확신 높음",
      tip: "코드값↔뜻 대응표가 이미 ORM 코드 안에 들어 있음 — 그대로 읽어 쓰면 끝, 따로 찾을 필요 없음." },
    "PII":          { marker: "개인정보", color: "var(--lin)",    expect: "표시 반영 · 확신 높음",
      tip: "이 컬럼이 개인정보라는 표시(어노테이션)가 코드에 달려 있음 — 그 표시를 설명에 반영하면 됨." },
    "형식":          { marker: "형식",   color: "var(--med)",    expect: "데이터 보기 · 확신 높음",
      tip: "값의 생김새(예: 202401 = 연월 YYYYMM)는 데이터를 봐야만 알 수 있음 — 안 보면 질의가 형식을 틀려 0건이 됨." },
    "tier2-success":{ marker: "코드찾기성공", color: "var(--sig)", expect: "코드 찾아 읽기 · 확신 높음",
      tip: "뜻이 코드 안에 적혀 있고 출처가 하나뿐 — 코드를 찾아 읽으면 확실하게 풀림." },
    "충돌-크럭스":    { marker: "값겹침함정", color: "var(--low)",  expect: "이름으로 맞추기 · 미매핑 경고",
      tip: "값이 똑같이 01~04인 다른 컬럼이 있어 값만 보면 헷갈림 — 어느 코드표가 '이 컬럼' 것인지 필드 이름으로 맞춰 확인. 값 겹친다고 아무거나 쓰면 오답." },
    "lineage":      { marker: "계산식",  color: "var(--lin)",    expect: "계산식 확인 · 이름 교정",
      tip: "값이 다른 값들로 계산돼 만들어짐(예: 적용금리 = 기준금리 − 할인) — 이름만 보고 단정 말고 계산식을 찾아 확인." },
    "reftable-link":{ marker: "연결미선언", color: "var(--accent)", expect: "연결 확인 · 확신 한정",
      tip: "코드 뜻을 적은 공통표는 있는데 '이 컬럼이 그 표를 쓴다'는 연결은 명시 안 됨 — 값 겹친다고 단정 말고 연결을 확인, 확인 전엔 확신을 낮춤." },
    "floor":        { marker: "근거없음", color: "var(--low)",    expect: "확신 낮음 · 사람 확인",
      tip: "뜻을 적어둔 곳이 코드·공통표 어디에도 없음 — 지어내지 말고 '모름 + 사람이 확인 필요'로 두는 게 정답." },
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
