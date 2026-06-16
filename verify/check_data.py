#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_data.py — 데이터 레이어 검증.

DATA_SPEC.md 의 invariant 를 기계로 확인한다. 코퍼스에서 '라벨 매핑'을 구조적으로
추출(switch(field){ case "cd": return "label" })한 뒤, store + 추출 결과로 컬럼별·전역
속성을 assert. 하나라도 실패하면 비-0 종료 → 되돌아가 고친다.
"""
import json, os, re, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")

# ── load store ──────────────────────────────────────────────────────────────
with open(os.path.join(ROOT, "data", "signal_store.json"), encoding="utf-8") as f:
    STORE = json.load(f)
COLS = STORE["columns"]
REFDUMP = STORE["reftable_dump"]

# ── load corpus ─────────────────────────────────────────────────────────────
CORPUS = {}
for p in glob.glob(os.path.join(ROOT, "corpus", "**", "*"), recursive=True):
    if os.path.isfile(p):
        with open(p, encoding="utf-8") as f:
            CORPUS[os.path.relpath(p, ROOT)] = f.read()
CORPUS_ALL = "\n".join(CORPUS.values())

# ── 라벨 매핑 추출: switch(<field>){ case "<cd>": return "<label>"; } ──────────
SWITCH_RE = re.compile(r"switch\s*\(\s*(\w+)\s*\)\s*\{(.*?)\n\s*\}", re.S)
CASE_RE   = re.compile(r'case\s+"([^"]+)"\s*:\s*return\s+"([^"]+)"')

def extract_label_maps():
    """[{field, file, map:{cd:label}}] — 코퍼스 전체에서 switch 라벨맵 수집."""
    maps = []
    for path, text in CORPUS.items():
        for m in SWITCH_RE.finditer(text):
            field, body = m.group(1), m.group(2)
            cmap = {cd: lab for cd, lab in CASE_RE.findall(body)}
            if cmap:
                maps.append({"field": field, "file": path, "map": cmap})
    return maps

LABEL_MAPS = extract_label_maps()

def maps_for_field(field):
    return [lm for lm in LABEL_MAPS if lm["field"] == field]

# ── assertion harness ───────────────────────────────────────────────────────
RESULTS = []
def check(inv, cond, detail=""):
    RESULTS.append((inv, bool(cond), detail))

def orm_of(cid):  return COLS[cid]["orm"]
def prof_of(cid): return COLS[cid]["profile"]
def vals_of(cid): return set(prof_of(cid).get("distinct_sample", []) or [])

# ── INV-1 JOIN_DT (자명) ─────────────────────────────────────────────────────
c = "CUST_BASE_INFO.JOIN_DT"
check("INV-1a", orm_of(c).get("field") == "joinDate", orm_of(c).get("field"))
check("INV-1b", not orm_of(c).get("enum"), "코드 개념 없음")

# ── INV-2 LOAN_AMT (자명) ────────────────────────────────────────────────────
c = "LOAN_APPL_HIST.LOAN_AMT"
check("INV-2a", orm_of(c).get("field") == "loanAmount", orm_of(c).get("field"))
check("INV-2b", not orm_of(c).get("enum"))

# ── INV-3 RPY_MTHD_CD (enum-clean control) ───────────────────────────────────
c = "LOAN_APPL_HIST.RPY_MTHD_CD"
enum = orm_of(c).get("enum") or {}
check("INV-3a", bool(enum) and all(enum.values()), "tier-1 enum 라벨 운반")
profvals = {v for v in vals_of(c) if v}
check("INV-3b", profvals <= set(enum.keys()), f"{profvals} ⊆ {set(enum.keys())}")

# ── INV-4 CUST_EMAIL (PII) ───────────────────────────────────────────────────
c = "CUST_BASE_INFO.CUST_EMAIL"
check("INV-4a", "PersonalInfo" in orm_of(c).get("annotations", []))

# ── INV-5 BILL_YM (형식) ─────────────────────────────────────────────────────
c = "CARD_BILL_HIST.BILL_YM"
check("INV-5a", not orm_of(c).get("enum") and not orm_of(c).get("format_pattern"),
      "코드/형식 어노 없음")
check("INV-5b", prof_of(c).get("inferred_format") == "YYYYMM")

# ── INV-6 ISSUE_STAT_CD (tier-2 성공) ────────────────────────────────────────
c = "CARD_APPL.ISSUE_STAT_CD"
check("INV-6a", not orm_of(c).get("enum"), "tier-1 라벨 없음")
ms = maps_for_field("issueStatusCode")
check("INV-6b", len(ms) == 1, f"issueStatusCode 매핑 {len(ms)}개(유일 연결)")
issue_keys = set(ms[0]["map"].keys()) if ms else set()
check("INV-6c", {v for v in vals_of(c) if v} <= issue_keys,
      f"{vals_of(c)} ⊆ {issue_keys} (전부 라벨)")

# ── INV-7 LOAN_STAT_CD (충돌 크럭스) ★ ───────────────────────────────────────
c = "LOAN_APPL_HIST.LOAN_STAT_CD"
check("INV-7a", not orm_of(c).get("enum"))
loan_ms = maps_for_field("loanStatusCode")
acct_ms = maps_for_field("accountStatusCode")
check("INV-7c", len(loan_ms) == 1, "loanStatusCode 올바른 매핑 존재")
loan_keys = set(loan_ms[0]["map"].keys()) if loan_ms else set()
acct_keys = set(acct_ms[0]["map"].keys()) if acct_ms else set()
# 오귀속 후보: 다른 필드인데 값집합이 겹침
check("INV-7b", bool(acct_ms) and (acct_keys & loan_keys),
      f"AccountStatus 값 {acct_keys} ∩ Loan {loan_keys} = {acct_keys & loan_keys} (오귀속 함정)")
# '05'가 profile 엔 있으나 올바른 매핑엔 없음 → 부분해소+conflict
pvals = {v for v in vals_of(c) if v}
check("INV-7d", "05" in pvals and "05" not in loan_keys,
      f"profile {pvals} vs 매핑키 {loan_keys}; 05 미매핑")

# ── INV-8 APLD_RATE (lineage) ────────────────────────────────────────────────
c = "LOAN_APPL_HIST.APLD_RATE"
check("INV-8c", not COLS[c].get("lineage", {}).get("present", False) and "lineage" not in COLS[c],
      "store 에 lineage 신호 없음")
etl_text = "\n".join(t for p, t in CORPUS.items() if p.startswith("corpus/etl"))
check("INV-8b", ("APLD_RATE" in etl_text and "INT_RATE" in etl_text),
      "ETL 에 APLD_RATE = f(INT_RATE) 파생식 존재")

# ── INV-9 PROD_CD (reftable-연결추론) ────────────────────────────────────────
c = "DEP_ACCT.PROD_CD"
check("INV-9a", "DEPOSIT_PROD" in REFDUMP, "전역 덤프에 DEPOSIT_PROD")
check("INV-9b", not orm_of(c).get("join_column"), "ORM 에 group 연결 어노 없음")
dep_keys = set(REFDUMP.get("DEPOSIT_PROD", {}).keys())
check("INV-9c-valmatch", {v for v in vals_of(c) if v} <= dep_keys,
      f"{vals_of(c)} ⊆ {dep_keys} (값매칭 가능)")
check("INV-9c-appquery", "group_cd = 'DEPOSIT_PROD'" in CORPUS_ALL or
                          "group_cd='DEPOSIT_PROD'" in CORPUS_ALL,
      "앱쿼리에 WHERE group_cd='DEPOSIT_PROD' 존재")

# ── INV-10 CHNL_CD (회수 불가 floor) ★ ───────────────────────────────────────
c = "CONTACT_LOG.CHNL_CD"
check("INV-10a", not orm_of(c).get("enum"))
# 라벨 매핑이 channelCode/CHNL_CD 에 *어디에도* 없어야
chnl_ms = maps_for_field("channelCode")
check("INV-10b-nomap", len(chnl_ms) == 0, f"channelCode 라벨맵 {len(chnl_ms)}개(0이어야)")
check("INV-10b-noref", not any("CHNL" in g or "CHANNEL" in g.upper() for g in REFDUMP),
      "reftable 에도 채널 그룹 없음")

# ── GINV (전역 트랩 속성) ─────────────────────────────────────────────────────
# GINV-1: floor 값 리터럴이 라벨과 함께 등장하지 않음 (channelCode 매핑 0 으로 이미 커버)
check("GINV-1", len(maps_for_field("channelCode")) == 0)
# GINV-2: 충돌 후보 존재 + 연결 키가 다름
check("GINV-2", bool(loan_ms) and bool(acct_ms) and
                loan_ms[0]["field"] != acct_ms[0]["field"],
      "loanStatusCode ≠ accountStatusCode (연결로 변별 가능)")
# GINV-3: tier-2 컬럼은 store 단독 라벨/의미 안 풀림; control 은 풀림
tier2 = ["CARD_APPL.ISSUE_STAT_CD", "LOAN_APPL_HIST.LOAN_STAT_CD",
         "DEP_ACCT.PROD_CD", "CONTACT_LOG.CHNL_CD"]
control_codes = ["LOAN_APPL_HIST.RPY_MTHD_CD"]
check("GINV-3a", all(not (orm_of(x).get("enum")) for x in tier2),
      "tier-2 코드컬럼은 store enum 없음(dig 강제)")
check("GINV-3b", all(orm_of(x).get("enum") for x in control_codes),
      "control 코드컬럼은 store enum 있음(dig 불필요)")

# ── report ──────────────────────────────────────────────────────────────────
print(f"\n추출된 라벨맵: {len(LABEL_MAPS)}개")
for lm in LABEL_MAPS:
    print(f"  {lm['field']:20s} {os.path.basename(lm['file']):28s} {lm['map']}")
print()
fails = [r for r in RESULTS if not r[1]]
for inv, ok, detail in RESULTS:
    print(f"  [{'PASS' if ok else 'FAIL'}] {inv:18s} {detail}")
print(f"\n{len(RESULTS)-len(fails)}/{len(RESULTS)} PASS")
sys.exit(1 if fails else 0)
