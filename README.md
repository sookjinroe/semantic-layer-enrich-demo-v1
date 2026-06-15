# Render v2 — 시맨틱 레이어 증강 에이전트 (디스크립션 합성)

DB 컬럼 하나에 대해, **미리 구축한 신호 스토어**에서 신호를 당겨 **비즈니스 Description을 합성**하는 에이전트. 1차 PoC(`semantic-layer-enrich-demo`)를 설계부터 새로 쓴 버전.

핵심 전환: Render는 **합성기 + 판단기**다 — `description · confidence · evidence · conflicts`를 *저작*한다. `codedict · classification · format`은 **추출이 소유**하므로 Render는 *저작하지 않고* 신호에서 읽어 *참조·충돌 플래그*만 한다.

> 설계 전문: [`docs/render-v2-design.md`](docs/render-v2-design.md) — 정의·역할 범위·데이터 아키텍처·산출 형태·차별점·근거를 코드 근거(`파일:라인`)와 함께.

## 북극성 (요약)
- **좋은 디스크립션 = 이름+타입 *너머로* NL이 쓸 정보.** 소비자는 이미 이름·타입을 본다 → 이름 되풀이는 가치 0.
- **이름은 *저신뢰 신호*.** 데이터·lineage로 교차검증하고, 오도하면 *교정*한다.
- **카탈로그 저비중**(부실 가정) — 있으면 교차검증용. 주력 신호는 *소스 인덱스 + 데이터 프로파일링*.
- **LOW = 접근 가능한 *모든* 신호 소진 후 미해소.** 못 풀어도 *잔여정보 최대화*(값공간·계보·아는 것 + 명시적 미상).
- **충돌(catalog↔data 등)은 1급** — 조용히 가리지 않고 플래그·신뢰도↓·사람 라우팅.

## 구조
```
build/build_signals.py   결정적 생성기 → data/signal_store.json
data/signal_store.json   신호 스토어 (빌드 산출물; 부분 커버리지 아키타입 슬라이스)
app/index.html           실행 앱 — 라이브 에이전틱 루프 + 다크 UI (Claude API 호출)
docs/render-v2-design.md 설계 문서
```

## 실행
- **Claude 아티팩트/앱 프리뷰**에서 `app/index.html`을 열면 바로 돈다(런타임이 Claude API 인증을 처리 — 키 불필요). 왼쪽 컬럼 클릭 → 신호 당김·추론·최종 레코드 트레이스가 라이브로.
- 일반 브라우저(`file://`)로 열면 UI는 뜨지만 모델 호출은 별도 프록시가 필요(아티팩트 런타임 밖에선 `api.anthropic.com` 직접 호출이 막힘).

## 신호 스토어 재생성
```bash
python3 build/build_signals.py        # → data/signal_store.json (결정적: 재실행 시 바이트 동일)
```
`app/index.html`은 standalone 실행을 위해 스토어 사본을 *인라인*한다. 스토어를 바꾸면 재주입:
```bash
python3 - <<'PY'
import re
s=open('data/signal_store.json').read().rstrip()
h=open('app/index.html').read()
h=re.sub(r'const SIGNAL_STORE = .*?;\n', 'const SIGNAL_STORE = '+s+';\n', h, count=1, flags=re.S)
open('app/index.html','w').write(h)
PY
```

## 아키타입 슬라이스 (8컬럼) — 각자 무엇을 시험하나
| 컬럼 | 아키타입 | 시험하는 거동 |
|---|---|---|
| `CUST_BASE_INFO.JOIN_DT` | 자명 | 스키마+필드명으로 정체 → 추가 청구 없이 HIGH |
| `LOAN_APPL_HIST.LOAN_AMT` | 자명(금액) | 이름·타입이 곧 의미 |
| `LOAN_APPL_HIST.LOAN_STAT_CD` | **catalog↔data 충돌** | 등재값 {01–04} vs 실데이터 {01–05} → 충돌 플래그·신뢰도↓ |
| `CONTACT_LOG.CHNL_CD` | 코드·미문서 | enum·catalog 없음, data로 값공간만 → `observed_only`·정직한 한정 |
| `CUST_BASE_INFO.CUST_EMAIL` | PII | 소스 `@PersonalInfo` → classification(추출 소유) |
| `LOAN_ACCT_MST.CLTRL_ID` | FK로 정체 | FK 대상이 정체, NULL 다수=무담보(추정·미확정) |
| `CARD_BILL_HIST.BILL_YM` | 데이터-형식 | 타입 CHAR(6)만으론 모름 → data가 `YYYYMM`을 드러냄 |
| `LOAN_APPL_HIST.APLD_RATE` | 이름-교정/구분 | lineage(`derived_with INT_RATE`)로 "실제 적용 금리"임을 세워 INT_RATE와 구분 |

## 산출 — 두 차선
- **Render 저작**: `description`(특징화 프로즈) · `confidence` · `evidence`(쓴 신호) · `conflicts`(감지된 긴장).
- **추출 소유(참조)**: `classification`(소스 어노/카탈로그) · `codedict`(소스 enum/카탈로그/데이터, status: resolved·observed_only·conflicted) · `format`(데이터/`@Pattern`).
앱은 둘을 분리해 표시 — Render가 후자를 *저작하지 않음*을 시각적으로 드러낸다.

## 상태
- 데모 스토어는 authored 아키타입 슬라이스. 실제 운영에선 `build_signals.py`의 각 신호가 *파서/임포트/라이브 쿼리*로 대체된다(인터페이스 동일).
- 열린 결정: `reftable` 포함, codedict 충돌의 사람-라우팅 vs 정책, 데이터 프로파일링 표현 범위 — `docs/render-v2-design.md` §8 참조.
