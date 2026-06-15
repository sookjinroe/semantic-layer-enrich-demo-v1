#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_signals.py — Render v2 신호 스토어 결정적 생성기.

기존 build_db.py / build_layer.py 와 같은 패턴: 입력은 authored 픽스처,
출력 signal_store.json 은 *빌드 산출물*(레포에 바이너리로 중복 보관할 필요 없음).

스토어 = 컬럼별 { schema, static{...}, profile }.
  static  : 미리 파싱/임포트되는 정적 신호 (= 매니페스트로 노출). LLM 없음.
            source(ORM·enum·어노·format·관계·신선도) / fk / lineage / bi / catalog / reftable
  profile : 데이터 프로파일링. 실제=라이브 쿼리, 데모=여기 미리 계산해 동봉.
            peek_data 게이트 뒤로 격리되어 Render 가 "쌀 때 안 풀리면만" 당긴다.

부분 커버리지 아키타입 슬라이스 (의도된 결손이 설계의 일부):
  - 자명(스키마+필드명으로 정체)            : JOIN_DT, LOAN_AMT
  - catalog↔data 충돌(등재값에 실값이 초과) : LOAN_STAT_CD   (catalog {01..04} vs data {01..05})
  - 코드·미문서(enum 없음, 값 의미 미상)     : CHNL_CD        (data 로 값공간만)
  - PII(소스 어노테이션 = 추출 소유 분류)    : CUST_EMAIL
  - FK 로 정체 + NULL 의미                   : CLTRL_ID
  - 데이터-only 형식                         : BILL_YM        (YYYYMM 은 data 에서만)
  - 이름-교정/구분(lineage 로 진짜 의미)      : APLD_RATE      (INT_RATE 와 구분)
"""
import json, os

# ── 정적 신호 기본값 (부재) ────────────────────────────────────────────────
def _absent():
    return {
        "source":   {"present": False},
        "fk":       {"present": False},
        "lineage":  {"present": False},
        "bi":       {"present": False},
        "catalog":  {"present": False},
        "reftable": {"present": False},
    }

def col(table, name, type_, nullable, pk=False, fk=None, *, archetype,
        source=None, fk_sig=None, lineage=None, bi=None, catalog=None,
        reftable=None, profile=None):
    static = _absent()
    if source   is not None: static["source"]   = {"present": True, **source}
    if fk_sig   is not None: static["fk"]        = {"present": True, **fk_sig}
    if lineage  is not None: static["lineage"]   = {"present": True, **lineage}
    if bi       is not None: static["bi"]        = {"present": True, **bi}
    if catalog  is not None: static["catalog"]   = {"present": True, **catalog}
    if reftable is not None: static["reftable"]  = {"present": True, **reftable}
    return f"{table}.{name}", {
        "archetype": archetype,
        "schema": {"table": table, "name": name, "type": type_,
                   "nullable": nullable, "pk": pk, "fk": fk},
        "static": static,
        "profile": ({"present": True, **profile} if profile else {"present": False}),
    }

# ── ORM 매핑 헬퍼: 모든 컬럼은 소스에 @Column 매핑이 존재(필드명·타입) ──────
def orm(field, java_type, *, is_id=False, enum=None, annotations=None,
        format_pattern=None, join_column=None, deprecated=False):
    return {"field": field, "java_type": java_type, "is_id": is_id,
            "enum": enum, "annotations": annotations or [],
            "format_pattern": format_pattern, "join_column": join_column,
            "deprecated": deprecated}

COLUMNS = [
    # 자명 — 스키마 + 필드명으로 정체가 섬. 신호 추가 청구 없이 끝나야.
    col("CUST_BASE_INFO", "JOIN_DT", "DATE", nullable=False, archetype="자명",
        source=orm("joinDate", "LocalDate"),
        profile={"distinct_sample": ["2019-03-11", "2021-08-02", "2023-12-30"],
                 "cardinality": 1487, "null_rate": 0.0,
                 "inferred_format": "DATE", "top_values": {}}),

    col("LOAN_APPL_HIST", "LOAN_AMT", "DECIMAL(15,2)", nullable=False, archetype="자명(금액)",
        source=orm("loanAmount", "BigDecimal"),
        profile={"distinct_sample": ["3000000.00", "15000000.00", "82000000.00"],
                 "cardinality": 2043, "null_rate": 0.0,
                 "inferred_format": None, "top_values": {}}),

    # catalog↔data 충돌 — 등재값 {01..04} 인데 실데이터에 05 가 더 있음.
    col("LOAN_APPL_HIST", "LOAN_STAT_CD", "CHAR(2)", nullable=False, archetype="catalog↔data 충돌",
        source=orm("loanStatusCode", "String"),  # enum 없음
        lineage={"upstream": "LOAN_WORKFLOW", "derived_with": []},
        catalog={"domain": "LOAN", "description": None, "classification": None,
                 "term": {"name": "대출상태", "def": "대출 신청 건의 현재 처리 상태",
                          "values": {"01": "접수", "02": "심사중", "03": "승인", "04": "거절"}}},
        profile={"distinct_sample": ["01", "02", "03", "04", "05"],
                 "cardinality": 5, "null_rate": 0.0, "inferred_format": None,
                 "top_values": {"01": 0.41, "02": 0.23, "03": 0.19, "04": 0.12, "05": 0.05}}),

    # 코드·미문서 — enum 없음, catalog 없음. data 로 값공간만 잡힘(의미 미상).
    col("CONTACT_LOG", "CHNL_CD", "CHAR(2)", nullable=False, archetype="코드·미문서",
        source=orm("channelCode", "String"),
        profile={"distinct_sample": ["01", "02", "03", "04"],
                 "cardinality": 4, "null_rate": 0.0, "inferred_format": None,
                 "top_values": {"01": 0.55, "02": 0.30, "03": 0.10, "04": 0.05}}),

    # PII — 소스 어노테이션 @PersonalInfo = 추출 소유 분류. Render 는 읽어서 참조만.
    col("CUST_BASE_INFO", "CUST_EMAIL", "VARCHAR(100)", nullable=True, archetype="PII",
        source=orm("customerEmail", "String", annotations=["@PersonalInfo"]),
        profile={"distinct_sample": ["a***@gmail.com", "b***@naver.com", "c***@daum.net"],
                 "cardinality": 1402, "null_rate": 0.07,
                 "inferred_format": "email", "top_values": {}}),

    # FK 로 정체 + NULL 의미 — FK 대상이 뜻을 주고, NULL 다수는 '무담보' 추정(미확정).
    col("LOAN_ACCT_MST", "CLTRL_ID", "VARCHAR(18)", nullable=True,
        fk="COLLATERAL_MST.CLTRL_ID", archetype="FK로 정체",
        source=orm("collateralId", "String", join_column="COLLATERAL_MST.CLTRL_ID"),
        fk_sig={"target": "COLLATERAL_MST.CLTRL_ID", "target_domain": "LOAN",
                "target_identity": "담보물 마스터 — 대출 담보의 식별자", "target_pk": True},
        profile={"distinct_sample": ["CLT00000183", "CLT00000771", None],
                 "cardinality": 612, "null_rate": 0.62, "inferred_format": None,
                 "top_values": {}}),

    # 데이터-only 형식 — 타입 CHAR(6) 만으론 형식 모름. data 가 YYYYMM 을 드러냄.
    col("CARD_BILL_HIST", "BILL_YM", "CHAR(6)", nullable=False, archetype="데이터-형식",
        source=orm("billingYearMonth", "String"),
        profile={"distinct_sample": ["202604", "202605", "202606"],
                 "cardinality": 36, "null_rate": 0.0,
                 "inferred_format": "YYYYMM", "top_values": {}}),

    # 이름-교정/구분 — 이름 'applied rate' 모호. lineage 가 INT_RATE 파생임을 줘 구분.
    col("LOAN_APPL_HIST", "APLD_RATE", "DECIMAL(5,3)", nullable=False, archetype="이름-교정/구분",
        source=orm("appliedRate", "BigDecimal"),
        lineage={"upstream": "RATE_ENGINE", "derived_with": ["LOAN_APPL_HIST.INT_RATE"]},
        profile={"distinct_sample": ["3.250", "4.875", "6.100"],
                 "cardinality": 318, "null_rate": 0.0, "inferred_format": None,
                 "top_values": {}}),
]

def build():
    store = {}
    for cid, rec in COLUMNS:
        store[cid] = rec
    return store

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "data", "signal_store.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    store = build()
    # sort_keys 로 결정성 보장 — 동일 입력 → 바이트 동일 출력.
    with open(out, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    print(f"[signal_store] {len(store)} columns → {os.path.normpath(out)}")
    for cid, rec in sorted(store.items()):
        present = [k for k, v in rec["static"].items() if v.get("present")]
        prof = "data" if rec["profile"].get("present") else "-"
        print(f"  {cid:32s} [{rec['archetype']}]  static={present}  profile={prof}")
