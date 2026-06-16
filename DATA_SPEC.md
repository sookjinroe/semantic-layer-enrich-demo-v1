# Render v2 — 데이터 설계 명세 (검증 가능한 속성 기준)

> 목적: 탐색용 코퍼스가 우리의 **유일한 진짜 미지수** — "부산물 신호만으로 라벨-권위를
> *검증 가능하게* 근거 지을 수 있나" — 를 실제로 시험하도록, 어려운 케이스를 의도적으로 심는다.
> 각 컬럼은 *검증기가 기계로 확인할 invariant*를 가진다. invariant가 안 서면 데이터가 가설을
> 시험하지 못하는 것이므로 되돌아가 고친다.

## 두 데이터 아티팩트
- **(A) tier-1 store** (`data/signal_store.json`) — 미리 파싱된 정적 신호. 컬럼별
  `schema · orm · reftable(덤프 히트) · profile`. 에이전트가 공짜로 받는 매니페스트.
- **(B) tier-2 corpus** (`corpus/**`) — 에이전트가 *뒤지는* 날것. ORM 엔티티 / 서비스·상수 /
  ETL·뷰 SQL / 공통코드 덤프. 라벨·lineage·연결이 *흩어져* 있다.

## 신호 위치 규약 (어디에 무엇을 둘 수 있나)
- **값공간**(어떤 코드가 존재하나): 항상 `profile`(데이터)에서. = 부산물, 무조건 가용.
- **정체**(이름·타입·FK·PII): `schema` + `orm`에서. = tier-1.
- **라벨**(01=접수): `orm.enum`(있을 때만) / 서비스 case·상수 / i18n / reftable / **또는 아무 데도 없음**.
- **lineage**(파생식): ETL·뷰 SQL에서. = tier-2.
- **reftable 연결**(이 컬럼 → 어느 공통코드 그룹): ORM 어노에 *없고*, 앱 쿼리 `WHERE group_cd=…`
  또는 값집합 매칭으로만. = tier-2.

---

## 슬라이스 (10 컬럼)

| # | 컬럼 | 아키타입 | 시험 | 라벨/의미 위치 | 기대 행동 |
|---|---|---|---|---|---|
| 1 | `CUST_BASE_INFO.JOIN_DT` | 자명(control) | dig 안 함이 정답 | orm 필드명+타입 | tier-1 only, HIGH, dig 0 |
| 2 | `LOAN_APPL_HIST.LOAN_AMT` | 자명(control) | dig 안 함이 정답 | orm 필드명+타입 | tier-1 only, HIGH, dig 0 |
| 3 | `LOAN_APPL_HIST.RPY_MTHD_CD` | enum-clean(control) | tier-1이 라벨 운반 | **orm.enum** | tier-1 only, HIGH, dig 0 |
| 4 | `CUST_BASE_INFO.CUST_EMAIL` | PII(control) | 분류는 어노에서 | orm.@PersonalInfo | tier-1 only, HIGH(분류), dig 0 |
| 5 | `CARD_BILL_HIST.BILL_YM` | 형식(control-ish) | 형식은 데이터에서만 | profile.YYYYMM | tier-1(profile), HIGH(형식) |
| 6 | `CARD_APPL.ISSUE_STAT_CD` | tier-2 성공 | dig로 라벨 발견·검증 | 서비스 case (단일 연결) | dig→검증 OK→라벨 참조, HIGH/MED |
| 7 | `LOAN_APPL_HIST.LOAN_STAT_CD` | **충돌(크럭스)** | 연결 검증 vs 오귀속 | 서비스 case (값집합 충돌 + 05 미매핑) | dig→**검증 필수**, conflict, MED |
| 8 | `LOAN_APPL_HIST.APLD_RATE` | lineage | 파생식 추적·이름 교정 | ETL 뷰 SQL | dig SQL→교정, MED/HIGH |
| 9 | `DEP_ACCT.PROD_CD` | reftable-연결추론 | 연결을 dig로 | reftable 덤프 + 연결은 앱쿼리/값매칭 | peek_reftable+dig 연결→HIGH/MED |
| 10 | `CONTACT_LOG.CHNL_CD` | **회수 불가 floor** | 정직한 미상+사람 | **아무 데도 없음** | dig 소진→LOW+route_to_human |

---

## 컬럼별 invariant (검증기가 assert)

### 1. JOIN_DT (자명)
- INV-1a: store.orm.field == "joinDate", type DATE-ish.
- INV-1b: 코퍼스 dig 없이 정체가 섬 (라벨·코드 개념 자체가 없음).

### 2. LOAN_AMT (자명)
- INV-2a: store.orm.field == "loanAmount", DECIMAL.
- INV-2b: enum/코드 개념 없음.

### 3. RPY_MTHD_CD (enum-clean)
- INV-3a: **store.orm.enum 가 라벨을 직접 가짐** (예: EQUAL_PRINCIPAL=원금균등 …).
- INV-3b: profile 값집합 ⊆ enum 키 (충돌 없음).
- 의미: tier-1이 라벨을 운반하는 control. dig 불필요.

### 4. CUST_EMAIL (PII)
- INV-4a: store.orm.annotations 에 PersonalInfo 포함.
- INV-4b: 분류 근거가 tier-1에 있음 (추정 아님).

### 5. BILL_YM (형식)
- INV-5a: store.orm.enum == null, store.orm.format_pattern == null (코드/형식 어노 없음).
- INV-5b: **profile.inferred_format == "YYYYMM"** (형식은 데이터에서만).

### 6. ISSUE_STAT_CD (tier-2 성공)
- INV-6a: store.orm.enum == null (tier-1에 라벨 없음).
- INV-6b: **코퍼스에 라벨 매핑 존재**, 이 컬럼 필드(issueStatusCode)에 *유일하게* 연결.
- INV-6c: profile 값집합 ⊆ 코퍼스 매핑 키 (전부 라벨 있음 → 깨끗한 성공).
- 의미: dig→연결 검증→완전 해소. tier-2 성공의 baseline.

### 7. LOAN_STAT_CD (충돌 크럭스) ★ 가설 핵심
- INV-7a: store.orm.enum == null.
- INV-7b: **코퍼스에 값집합이 겹치는 *다른* 매핑 존재** (AccountStatus 01/02/03…)
  — 이 컬럼이 아닌 다른 필드에 연결 (오귀속 함정).
- INV-7c: 이 컬럼의 *올바른* 매핑은 loanStatusCode 에 연결되어 있고 값 {01–04} 커버.
- INV-7d: **profile 값집합에 '05'가 있으나 올바른 매핑엔 '05' 없음** (부분 해소 + conflict).
- 의미: 단순 grep으로 첫 매핑 잡으면 오귀속. *연결 검증*해야 옳음. + 05 미매핑 conflict.

### 8. APLD_RATE (lineage)
- INV-8a: orm 이름(appliedRate)이 모호 (interest rate 와 구분 불가).
- INV-8b: **ETL/뷰 SQL에 파생식 존재** (APLD_RATE = f(INT_RATE, …)).
- INV-8c: store.lineage 는 present:false (lineage는 tier-2에서만).
- 의미: dig SQL→이름 교정.

### 9. PROD_CD (reftable-연결추론)
- INV-9a: **store.reftable 덤프에 DEPOSIT_PROD 그룹 존재** (코드→라벨).
- INV-9b: store.orm 에 group_cd 어노 *없음* (연결 미선언).
- INV-9c: profile 값집합 ⊆ reftable DEPOSIT_PROD 키 (값매칭으로 연결 추론 가능)
  **그리고** 코퍼스 앱쿼리에 `WHERE group_cd='DEPOSIT_PROD'` 존재 (연결 확증 경로).
- 의미: 덤프는 tier-1, 연결은 tier-2.

### 10. CHNL_CD (회수 불가 floor) ★ 가설 핵심
- INV-10a: store.orm.enum == null.
- INV-10b: **코퍼스 어디에도 이 컬럼의 라벨 매핑 없음** (서비스·상수·i18n·reftable 전부 부재).
- INV-10c: profile 값집합만 존재 (값+빈도, 라벨 0).
- 의미: dig 소진해도 권위 없음 → LOW + route_to_human, 잔여=값공간만.

---

## 코퍼스 트랩 구조 (검증기가 확인할 전역 속성)
- GINV-1: floor 컬럼(CHNL_CD)의 값 리터럴이 *어떤* 서비스/상수에도 라벨과 함께 등장하지 않음.
- GINV-2: 충돌 컬럼(LOAN_STAT_CD)의 값집합과 겹치는 *오귀속 후보*(AccountStatus)가
  실제로 코퍼스에 존재하고, 올바른 매핑과 *연결 키가 다름*.
- GINV-3: tier-2 성공/충돌/lineage/reftable-연결 컬럼은 store 단독으로 라벨/의미가 *안* 풀림
  (= dig 강제). control 컬럼은 store 단독으로 풀림 (= dig 불필요).
