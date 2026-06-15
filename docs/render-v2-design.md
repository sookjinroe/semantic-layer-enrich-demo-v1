# Render v2 — 설계 문서

> **이 문서의 위상.** 오늘 대화에서 나(Claude)는 코드를 확인하지 않고 단정해 여러 번 틀렸다. 그래서 이 문서는 **검증-우선** 원칙으로 쓴다 — 현재 상태에 관한 *모든* 주장에 `파일:라인` 근거를 단다. 결정은 "깨보기(self-critique)" 루프를 거친 것만 확정으로 표기한다. 저장소: `semantic-layer-enrich-demo-v1`.

---

## 0. 회고 — 오늘의 오류와 근본 원인

| # | 내가 한 주장 | 사실 | 근거 |
|---|---|---|---|
| 1 | "1차 Render는 사실상 소스코드뿐" | `db`(스키마)+`{catalog, code}` 2개 fetchable | `render.jsx:102` |
| 2 | "lineage가 Render 옆에 있었는데 안 썼다" | lineage는 **Link**의 신호. Render엔 접근 자체가 없음 ("못 썼다") | `render.jsx:68-70` (Render는 db/catalog/code만 dispatch) vs `link-data.jsx`(lineage) |
| 3 | "codedict는 Render의 산출물" | codedict는 **정적 추출**(`CODE_SYSTEMS[cs].map`)이고 소비자는 `resolve_code`로 *별도* 소비 | `build_layer.py:60-61`, `layer-ops.js:74-81` |

**공통 근본 원인 두 가지:** (a) *코드 확인 전 단정*, (b) *부분 증거에서 과일반화*(충돌 케이스 하나로 codedict 소유권 전체를 끌어옴).

**재발 방지 규율 (이 문서에 적용):**
1. 현재-상태 주장은 `grep`/`read`로 *검증 후* `파일:라인`을 단다.
2. 설계 결정은 *반례로 깨보는 루프*를 한 번 돌린 뒤에만 "확정"으로 적는다.
3. 두 시스템(NL2SQL 레이어 / enrich PoC)과 두 에이전트(Render / Link)의 신호 집합을 *절대 섞지 않는다*.

---

## 1. 검증된 현재 상태 (baseline)

### 1.1 두 시스템은 분리돼 있다 — 이게 v2 정체성의 출발점
- **NL2SQL 검증 레이어**는 Render/Link가 만든 게 아니라 `build_layer.py`가 **손으로 authored** 한다:
  - description = `c["d"]`(저작) 또는 `auto_desc()`(자동), `{text, confidence: HIGH if authored else MEDIUM, source: "authored"|"auto"}` — `build_layer.py:45-56`
  - codedict = `CODE_SYSTEMS[c["cs"]]["map"]`(코드시스템 추출/지정) — `build_layer.py:60-61`
  - classification = `c.get("cls")`(태그) — `build_layer.py:57`
  - 이 "풀 커버리지 레이어"가 NL 검증의 *낙관적 A2 가정*이다.
- **Render/Link (enrich-1 레포)** 는 *그런 레이어를 어떻게 생산할 수 있는가*를 보이는 **별개 2-신호 PoC**다.

> **따라서 v2 Render의 일** = `build_layer.py`가 지금 *손으로 박는* description을, **신호 근거로 생성**하는 것. codedict·classification은 거기서도 *별도 추출*이므로 Render의 산출이 아니다(0절 #3과 일치).

### 1.2 1차 Render의 실제 능력
- 신호: `db`(스키마, 항상 시드) + fetchable `{catalog, code}` 2개 — `render.jsx:68-70`, `:102`. 루프 상한 4회 — `:100`.
- `catalog`의 실효 payload: `도메인` + (드물게) `glossary term`. **분류·기존 Description은 함수에서 하드코딩 빈값** — `render-data.jsx:80` (`RENDER_CATALOG` 데이터는 3개 컬럼뿐, 허용값 든 건 1개).
- 결과로 나온 description의 증상: `"…소스만으로 명확하지 않다"`가 5개 중 4개 (`link-data.jsx:10,13,14,18`) — 신호 사정거리가 짧아 *조기 LOW*. (게다가 그 픽스처는 손으로 박은 것이라, catalog에 값이 있는 LOAN_STAT_CD조차 "불명"으로 적힘 — 시스템이 자기 출력을 불충실하게 대표.)

### 1.3 소비자 계약 (NL이 레이어에서 받는 것)
- `get_column(id)` → `{id, table, type, nullable, pk, fk, description, classification}` — `layer-ops.js:88-89`
- `resolve_code(column, query)` → `{dict_available, matches, all_values}` — `layer-ops.js:74-81`
- `get_metric(metric)` → `{expr, base filters, …}` — `layer-ops.js:127-130`

→ **description · classification · codedict · metric은 *서로 다른 아티팩트*다.** 소비자가 각각 다른 op로 읽는다. 이 사실이 v2의 "차선 분리"와 "codedict는 Render 산출 아님"을 *코드 단에서* 확정한다.

---

## 2. v2 정의 — "좋은 디스크립션"이란

**기준:** 디스크립션의 가치 = **이름+타입 *너머로* 더해, 소비자(NL)가 *그것 없이는 못 하던 행동*을 하게 만드는 정보.** 소비자는 `get_column`으로 이미 이름·타입을 본다(`layer-ops.js:88`) — 이름을 되풀이하면 가치 0(중복).

**핵심 재정의 — 이름은 *저신뢰 신호*다.** 프로덕션에선 컬럼명이 암호적·비표준·때로 오도한다. 좋은 이름과 오도하는 이름은 *교차검증 전까지 똑같이 생겼다.* 그래서:
- 이름은 catalog와 같은 "교차검증 대상" 바구니에. 타입·제약만 신뢰 baseline.
- schema-only의 실패 모드는 "설명 없음"이 아니라 **"confident-but-wrong"**(이름에서 그럴듯하게 추측해 틀림). 신호의 역할 = **추정 → 근거** (정확성 + 신뢰도 보정).
- 디스크립션의 일에 *이름 교정*이 포함된다: "이름은 X를 시사하나 실제 Y" — 프로덕션에서 최고 가치.

**수락 게이트:** 매 디스크립션은 "*NL이 이름+타입만으론 못 하던 무언가를 이걸로 할 수 있는가?*"를 통과해야 한다. 못 하면 패러프레이즈 → 신호를 더 캐라.

---

## 3. 역할 범위 — Render = 합성기 + 판단기 (추출기 아님)

> **self-critique 통과.** 처음엔 Render가 codedict/classification/format까지 *산출*한다고 했다가, 그건 정적 추출을 LLM 산출로 끌어올린 오류임을 1.1·1.3으로 확인하고 정정함.

**추출 레이어 (업스트림 · LLM 없음)** 가 *구조화 사실*을 소유:
- codedict (소스 enum 파싱 / catalog·reftable 임포트), classification (어노테이션/태그), format (데이터 패턴매칭 / `@Pattern`), 관계(`@JoinColumn`/FK), 신선도(`@Deprecated`).

**Render (LLM 에이전트)** 가 *합성·판단*을 소유:
- `description`(프로즈 합성: 특징화·구분·이름교정·추정 한정·잔여미상)
- `confidence`(라우팅 판단)
- `conflicts`(후보들 사이 *감지된* 긴장)
- `evidence`(쓴 신호 목록)

Render는 구조화 사실을 **읽어서 프로즈에 *참조*하고**(codedict가 5값 → "5단계"라 씀), **충돌을 *감지·플래그*** 하되, codedict·classification·format을 *저작하지 않는다.* 값-의미 소스 충돌(catalog↔code↔reftable, 이름↔데이터)은 **사람 큐레이션으로 라우팅**(B/C 라우팅: 고결과·불확실 → 사람). Render는 "lineage상 현행은 4값으로 보임" 같은 *보조 의견*만 남긴다.

---

## 4. 데이터 아키텍처 — 미리 구축 + 땡겨오기 (핵심)

### 4.1 무엇을 미리 구축하나
원리: **비싼 건 LLM 해석이지 파싱이 아니다.** 파싱·임포트는 정적·싸므로 *한 번 배치로* 인덱싱하고, 에이전트는 *조회*만 한다(런타임 재파싱 없음).

- **정적 신호 (미리 구축 = 매니페스트):** `source`(ORM·enum·어노·format·관계·신선도), `schema`, `fk`, `lineage`, `bi-meta`, `catalog`(임포트), `reftable`(임포트).
- **런타임 프로브 (게이트):** `data`(프로파일링). 프로덕션은 라이브 쿼리, 데모/프로토는 *미리 계산해 store에 동봉* — 단일 인터페이스 뒤로 격리(D1).

### 4.2 스토어 스키마 (`signal_store.json`) — 샘플 2컬럼

```json
{
  "LOAN_APPL_HIST.LOAN_STAT_CD": {
    "schema": {"table":"LOAN_APPL_HIST","name":"LOAN_STAT_CD","type":"CHAR(2)","nullable":false,"pk":false,"fk":null},
    "static": {
      "source":   {"present":true,"field":"loanStatusCode","java_type":"String","is_id":false,
                   "enum":null,"annotations":[],"format_pattern":null,"join_column":null,"deprecated":false},
      "fk":       {"present":false},
      "lineage":  {"present":true,"upstream":"LOAN_WORKFLOW","derived_with":[]},
      "bi":       {"present":false},
      "catalog":  {"present":true,"domain":"LOAN","description":null,"classification":null,
                   "term":{"name":"대출상태","def":"대출 신청 건의 현재 처리 상태",
                           "values":{"01":"접수","02":"심사중","03":"승인","04":"거절"}}},
      "reftable": {"present":false}
    },
    "profile": {"present":true,"distinct_sample":["01","02","03","04","05"],"cardinality":5,
                "null_rate":0.0,"inferred_format":null,"top_values":{"01":0.41,"02":0.23}}
  },

  "CARD_BILL_HIST.BILL_YM": {
    "schema": {"table":"CARD_BILL_HIST","name":"BILL_YM","type":"CHAR(6)","nullable":false,"pk":false,"fk":null},
    "static": {
      "source":   {"present":true,"field":"billingYearMonth","java_type":"String","is_id":false,
                   "enum":null,"annotations":[],"format_pattern":null,"join_column":null,"deprecated":false},
      "fk":{"present":false},"lineage":{"present":false},"bi":{"present":false},
      "catalog":{"present":false},"reftable":{"present":false}
    },
    "profile": {"present":true,"distinct_sample":["202604","202605","202606"],"cardinality":36,
                "null_rate":0.0,"inferred_format":"YYYYMM","top_values":{}}
  }
}
```

> 설계 포인트가 데이터에 박혀 있다: LOAN_STAT_CD는 `catalog.term.values`가 **{01–04}**인데 `profile.distinct_sample`엔 **05**가 있다 → *catalog↔data 충돌*을 Render가 감지해야 함. BILL_YM은 정적 신호가 `source`뿐(이름·catalog 빈약)인데 `profile.inferred_format="YYYYMM"`이 *데이터에서만* 형식을 준다 → 데이터 프로파일링의 존재 이유.

### 4.3 구축 방법 — `build_signals.py` (기존 `build_*.py` 패턴)
`build_db.py → world.db`, `build_layer.py → layer/*.json`와 같은 결정적 생성기 패턴을 따른다. `signal_store.json`은 *빌드 산출물*(world.db처럼)이라 레포에 바이너리로 중복 저장하지 않고 핀된 생성기 + seed로 재생산.

```
build_signals.py (deterministic, seed 고정):
  1. source  ← 레포 정적 분석: @Entity/@Column/@Enumerated/@PersonalInfo/@Pattern/@JoinColumn/@Deprecated 파싱
                (데모: authored fixture로 대체, 실제: 파서)
  2. schema  ← DDL / information_schema
  3. fk      ← schema FK 선언 + ORM @JoinColumn
  4. lineage ← lineage 도구 export (또는 authored)
  5. bi-meta ← BI 도구 메타 export (라벨·지표·공동참조)
  6. catalog ← 기존 카탈로그 임포트 (부분 커버리지 — 대부분 비어 있음)
  7. reftable← DB 공통코드 테이블 스냅샷 (있으면)
  8. profile ← (실제) 라이브 SELECT DISTINCT/COUNT  /  (데모) 미리 계산 동봉
  → signal_store.json
```

### 4.4 땡겨오는 로직 (pull) — 에이전트가 store를 소비

```js
// 매니페스트 = 정적 신호의 presence 투영 (쌈, 시드로 프롬프트에 주입)
function manifest(col) {
  return Object.entries(store[col].static)
    .filter(([k, v]) => v.present).map(([k]) => k);          // 예: ["source","lineage","catalog"]
}

// peek_<signal> — 조회만, 절대 재파싱 안 함
function peek(col, signal) {
  if (signal === "data") {                                    // 게이트형: 에이전트가 호출 여부 판단
    return store[col].profile || { present: false };          // 실제=라이브쿼리 / 데모=동봉, 인터페이스 동일
  }
  const s = store[col].static[signal];
  return (s && s.present) ? s
                          : { present: false, note: `${signal} 신호 없음(정보 부재)` };
}
```

- **매니페스트**(정적 신호 presence)는 프롬프트에 미리 주어진다 → 잘 색인된 컬럼은 *원샷 근접*.
- **`peek_data`는 비용 게이트**: Render의 정책은 "싼 정적 신호로 안 풀릴 때만" 데이터 쿼리 → *자율성이 빈곳에 집중*.
- `present:false`는 *정보 부재*(증거의 부재)지 *부정 증거*가 아니다 — 신뢰도를 낮추지 않는다(1차 골격 보존).

---

## 5. 산출물 형태

`columns.json`의 기존 스키마(`build_layer.py:54-57`)에 정박하고 확장한다:

```json
{
  "LOAN_APPL_HIST.LOAN_STAT_CD": {
    "description": {
      "text": "대출 신청 건의 처리 상태 코드. 실데이터상 5개 값('01'~'05')이 관측되며, 카탈로그 등재값(01~04)에 '05'가 추가로 존재(미해소). 각 코드의 의미 라벨은 codedict 참조.",
      "confidence": "MEDIUM",
      "evidence": ["catalog", "data", "lineage"]
    },
    "conflicts": [
      {"type": "catalog_vs_data", "detail": "catalog values {01-04} vs data {01-05}; '05' 미등재"}
    ]
  }
}
```

- **Render 저작:** `description.text`, `description.confidence`, `description.evidence`, `conflicts`.
- **추출 소유(링크):** `codedict`, `classification`, `format` — 별도 아티팩트(소비자는 `resolve_code`/`get_column.classification`으로 읽음).
- 기존 `source: "authored"|"auto"`를 **`evidence: [신호…]`** 로 확장하고 **`conflicts`** 를 추가한 것 외엔 *소비자 계약과 호환*.

---

## 6. 기존(1차)과의 차별점 + 근거

| 축 | 1차 | v2 | 근거 |
|---|---|---|---|
| 신호 수 | `db + {catalog, code}` 2개 (`render.jsx:102`) | source-index · data · lineage · fk · bi · catalog · reftable | "비싼 건 해석, 파싱은 싸다" → 정적 인덱스 다신호화 |
| 소스코드 | "런타임 코드 신호" 뉘앙스 | **미리 파싱된 source-index 조회**(재파싱 없음) | 파싱=정적 batch, 에이전트=조회 |
| 데이터 | 없음 | **프로파일링**(형식·값공간·카디널리티) | catalog-독립 신호; YYYYMM은 데이터에서만 |
| catalog | 분류·기존desc 하드코딩 빈값 (`render-data.jsx:80`) | 데이터구동 *부분 커버리지*, 저비중·교차검증 | catalog-부실 가정 |
| 이름 | 신뢰 baseline 취급 | **저신뢰 신호 + 교정** | 비표준·오도 가능 |
| LOW의 의미 | "소스 침묵" | **"전 신호 소진 후 미해소"**; fallback=잔여정보 최대화 | 사정거리 확장 |
| 산출 | 한 문장 | description+confidence+conflicts+evidence (codedict는 추출 소유) | 소비자 계약(`layer-ops.js:74,88`) |
| 충돌 | 처리 없음 | **1급**: 무강제·lineage 가림·미해소 시 사람 라우팅 | B/C 라우팅 |
| 성격 | 전 컬럼 동일 루프 | 매니페스트→원샷 / 빈곳→데이터 프로빙 | 자율성은 통제흐름 예측불가일 때만 |

---

## 7. 설계 근거 (원칙 요약)
1. **추출/해석 분리** — 파싱·임포트는 싼 정적 배치(미리 구축), LLM은 합성·판단만. (codedict가 Render 산출이 아닌 이유)
2. **자율성은 통제흐름이 예측 불가일 때만** — 매니페스트(정적 presence)로 대부분 원샷, 데이터 프로빙에만 자율성 집중.
3. **인터페이스 격리(D1)** — 데이터 신호를 `peek_data` 뒤로 숨겨 *데모 동봉 ↔ 프로드 쿼리* 무손실 스왑.
4. **근거 vs 추정 / 정보부재 ≠ 부정 증거** — 1차 프롬프트의 인식론 골격은 보존, 사정거리만 확장.
5. **소비자 효용이 품질 기준** — "이름+타입 너머로 NL 행동을 푸는가"가 수락 게이트.

---

## 8. 열린 결정 (네 몫) + 다음 단계
- **열린 결정:** (a) `reftable` 첫 빌드 포함 여부, (b) codedict 충돌의 *사람 라우팅 vs 결정적 정책* 경계, (c) `data` 프로파일링을 데모에서 어디까지 동봉할지.
- **다음 단계:** 이 store 스키마(4.2)와 산출 레코드(5절)를 `render-v2.html` 프로토에 박아 — 8컬럼(LOAN_STAT_CD의 catalog↔data 충돌, BILL_YM의 데이터-형식 포함)이 실제로 *조기 LOW를 잔여정보+충돌 플래그로* 바꾸는지 검증.
