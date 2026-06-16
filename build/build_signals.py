#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_signals.py — Render v2 tier-1 신호 스토어 결정적 생성기.

v1 패턴 계승: 입력은 authored fixture, 출력 signal_store.json 은 빌드 산출물.
핵심 차이: tier-2 컬럼(라벨이 코퍼스에 흩어진 것)은 store 에서 라벨을 *일부러 뺀다*
           (orm.enum=null) → dig 강제. control 컬럼만 enum 으로 라벨 운반.

store = {
  "columns":      { "TABLE.COL": { archetype, schema, orm, reftable, profile } },
  "reftable_dump":{ GROUP: { code: label } }   # 전역 공통코드 덤프. 컬럼→그룹 연결은 *미선언*.
}
  orm     : 미리 파싱된 ORM 신호 (필드명·타입·enum·어노·format·join·deprecated). LLM 없음.
            enum 은 *@Enumerated 가 코드→라벨을 직접 줄 때만* 채움 (control). 나머진 null.
  profile : 데이터 프로파일 (값공간·형식·카디널리티·null율). 값공간은 항상 부산물.
  reftable: 컬럼별 연결은 *미선언*(present:false) — 연결은 tier-2 dig 의 몫.
            덤프 자체는 store 의 reftable_dump(전역)에 있음.
"""
import json, os

# ── helpers ─────────────────────────────────────────────────────────────────
def orm(field, java_type, *, is_id=False, enum=None, annotations=None,
        format_pattern=None, join_column=None, deprecated=False):
    return {"present": True, "field": field, "java_type": java_type, "is_id": is_id,
            "enum": enum, "annotations": annotations or [],
            "format_pattern": format_pattern, "join_column": join_column,
            "deprecated": deprecated}

def col(table, name, type_, nullable, *, archetype, pk=False, fk=None,
        orm_sig=None, profile=None):
    return f"{table}.{name}", {
        "archetype": archetype,
        "schema": {"table": table, "name": name, "type": type_,
                   "nullable": nullable, "pk": pk, "fk": fk},
        "orm": orm_sig if orm_sig else {"present": False},
        # 컬럼별 reftable 연결은 데모 전 컬럼에서 미선언 (연결=tier-2). 덤프는 전역.
        "reftable": {"present": False},
        "profile": ({"present": True, **profile} if profile else {"present": False}),
    }

# ── 전역 공통코드 덤프 (reftable) ────────────────────────────────────────────
# DEPOSIT_PROD 그룹만 둔다. PROD_CD 와 *연결은 선언 안 함* — 값매칭/앱쿼리로만 이어짐.
# (대조군으로 LOAN_STAT 같은 건 일부러 *덤프에 없음* → 그건 서비스 코드에만 있어 dig 필요)
REFTABLE_DUMP = {
    "DEPOSIT_PROD": {
        "1001": "정기예금",
        "1002": "자유적립적금",
        "1003": "정기적금",
        "1004": "수시입출금예금",
    }
}

# ── 컬럼 ─────────────────────────────────────────────────────────────────────
COLUMNS = [
    # 1. 자명 — 스키마+필드명으로 정체. dig 불필요.
    col("CUST_BASE_INFO", "JOIN_DT", "DATE", nullable=False, archetype="자명",
        orm_sig=orm("joinDate", "LocalDate"),
        profile={"distinct_sample": ["2019-03-12", "2021-07-30", "2024-01-05"],
                 "cardinality": 2891, "null_rate": 0.0, "inferred_format": "YYYY-MM-DD",
                 "top_values": {}}),

    # 2. 자명(금액)
    col("LOAN_APPL_HIST", "LOAN_AMT", "DECIMAL(15,2)", nullable=False, archetype="자명",
        orm_sig=orm("loanAmount", "BigDecimal"),
        profile={"distinct_sample": ["3000000.00", "15000000.00", "82000000.00"],
                 "cardinality": 2043, "null_rate": 0.0, "inferred_format": None,
                 "top_values": {}}),

    # 3. enum-clean(control) — @Enumerated 가 코드→라벨을 직접 줌. tier-1 이 라벨 운반.
    col("LOAN_APPL_HIST", "RPY_MTHD_CD", "CHAR(2)", nullable=False, archetype="enum-clean",
        orm_sig=orm("repaymentMethodCode", "String",
                    enum={"01": "원금균등상환", "02": "원리금균등상환", "03": "만기일시상환"}),
        profile={"distinct_sample": ["01", "02", "03"], "cardinality": 3,
                 "null_rate": 0.0, "inferred_format": None,
                 "top_values": {"02": 0.61, "01": 0.27, "03": 0.12}}),

    # 4. PII(control) — 분류 근거가 어노에.
    col("CUST_BASE_INFO", "CUST_EMAIL", "VARCHAR(120)", nullable=True, archetype="PII",
        orm_sig=orm("customerEmail", "String", annotations=["PersonalInfo"]),
        profile={"distinct_sample": ["a***@gmail.com", "b***@naver.com", None],
                 "cardinality": 2615, "null_rate": 0.09, "inferred_format": "email",
                 "top_values": {}}),

    # 5. 형식 — 코드/형식 어노 없음. YYYYMM 은 데이터에서만.
    col("CARD_BILL_HIST", "BILL_YM", "CHAR(6)", nullable=False, archetype="형식",
        orm_sig=orm("billingYearMonth", "String"),  # enum=null, format_pattern=null
        profile={"distinct_sample": ["202604", "202605", "202606"], "cardinality": 36,
                 "null_rate": 0.0, "inferred_format": "YYYYMM", "top_values": {}}),

    # 6. tier-2 성공 — enum null. 라벨은 코퍼스 서비스 case 에 *유일 연결*로 존재.
    col("CARD_APPL", "ISSUE_STAT_CD", "CHAR(2)", nullable=False, archetype="tier2-success",
        orm_sig=orm("issueStatusCode", "String"),  # enum=null → dig 강제
        profile={"distinct_sample": ["01", "02", "03", "04"], "cardinality": 4,
                 "null_rate": 0.0, "inferred_format": None,
                 "top_values": {"03": 0.52, "02": 0.21, "01": 0.18, "04": 0.09}}),

    # 7. 충돌(크럭스) — enum null. 값집합 {01..05}, 코퍼스에 *겹치는 다른 매핑*(AccountStatus)
    #    이 함정으로 존재. 올바른 매핑은 loanStatusCode 연결, {01..04}만 커버('05' 미매핑).
    col("LOAN_APPL_HIST", "LOAN_STAT_CD", "CHAR(2)", nullable=False, archetype="충돌-크럭스",
        orm_sig=orm("loanStatusCode", "String"),  # enum=null → dig 강제
        profile={"distinct_sample": ["01", "02", "03", "04", "05"], "cardinality": 5,
                 "null_rate": 0.0, "inferred_format": None,
                 "top_values": {"03": 0.34, "02": 0.27, "01": 0.19, "04": 0.14, "05": 0.06}}),

    # 8. lineage — 이름 모호(appliedRate). 파생식은 ETL 뷰 SQL 에만. store.lineage 없음.
    col("LOAN_APPL_HIST", "APLD_RATE", "DECIMAL(5,3)", nullable=False, archetype="lineage",
        orm_sig=orm("appliedRate", "BigDecimal"),
        profile={"distinct_sample": ["3.250", "4.875", "6.100"], "cardinality": 318,
                 "null_rate": 0.0, "inferred_format": None, "top_values": {}}),

    # 9. reftable-연결추론 — 덤프(DEPOSIT_PROD)는 전역 store 에. 연결은 미선언.
    #    값집합 ⊆ DEPOSIT_PROD 키 (값매칭 가능) + 코퍼스 앱쿼리에 WHERE group_cd 존재.
    col("DEP_ACCT", "PROD_CD", "CHAR(4)", nullable=False, archetype="reftable-link",
        orm_sig=orm("productCode", "String"),  # group_cd 어노 없음
        profile={"distinct_sample": ["1001", "1002", "1004"], "cardinality": 4,
                 "null_rate": 0.0, "inferred_format": None,
                 "top_values": {"1004": 0.44, "1001": 0.33, "1003": 0.14, "1002": 0.09}}),

    # 10. 회수 불가 floor — enum null. 라벨이 *아무 데도* 없음. 값공간만.
    col("CONTACT_LOG", "CHNL_CD", "CHAR(2)", nullable=False, archetype="floor",
        orm_sig=orm("channelCode", "String"),  # enum=null
        profile={"distinct_sample": ["01", "02", "03", "04"], "cardinality": 4,
                 "null_rate": 0.0, "inferred_format": None,
                 "top_values": {"01": 0.55, "02": 0.30, "03": 0.10, "04": 0.05}}),
]

def build():
    columns = {}
    for cid, rec in COLUMNS:
        columns[cid] = rec
    return {"columns": columns, "reftable_dump": REFTABLE_DUMP}

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.join(here, "..")
    store = build()

    out = os.path.join(root, "data", "signal_store.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    print(f"[signal_store] {len(store['columns'])} columns + "
          f"{len(store['reftable_dump'])} reftable groups → {os.path.normpath(out)}")

    # 브라우저 번들 (window.SIGNAL_STORE)
    js_out = os.path.join(root, "data", "signal-store.js")
    with open(js_out, "w", encoding="utf-8") as f:
        f.write("// 생성됨: build/build_signals.py — 직접 수정 금지. window.SIGNAL_STORE 전역.\n")
        f.write("window.SIGNAL_STORE = ")
        json.dump(store, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write(";\n")
    print(f"[bundle]       → {os.path.normpath(js_out)}")

    for cid, rec in sorted(store["columns"].items()):
        o = rec["orm"]
        has_enum = "enum" if (o.get("present") and o.get("enum")) else "-"
        prof = "data" if rec["profile"].get("present") else "-"
        print(f"  {cid:30s} [{rec['archetype']:14s}] orm-enum={has_enum:4s} profile={prof}")
