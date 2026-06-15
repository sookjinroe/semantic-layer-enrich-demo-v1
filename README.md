# Render v2 — 시맨틱 레이어 증강 에이전트 (디스크립션 합성)

DB 컬럼 하나에 대해, **미리 구축한 신호 스토어**에서 신호를 당겨 **비즈니스 Description을 합성**하는 에이전트. 1차 PoC를 설계부터 새로 썼고, 실행/키/스냅샷 처리는 **NL 에이전트 앱(`live-api.js` + 스냅샷) 패턴에 정렬**했다.

핵심: Render는 **합성기 + 판단기**다 — `description · confidence · evidence · conflicts`를 *저작*한다. `codedict · classification · format`은 **추출이 소유**하므로 Render는 *저작하지 않고* 신호에서 읽어 *참조·충돌 플래그*만 한다.

> 설계 전문: [`docs/render-v2-design.md`](docs/render-v2-design.md) — 정의·역할 범위·데이터 아키텍처·산출 형태·차별점·근거를 코드 근거(`파일:라인`)와 함께.

## 북극성 (요약)
- **좋은 디스크립션 = 이름+타입 *너머로* NL이 쓸 정보.** 이름 되풀이는 가치 0(소비자가 이미 봄).
- **이름은 *저신뢰 신호*** — 데이터·lineage로 교차검증, 오도하면 *교정*.
- **카탈로그 저비중**(부실 가정) — 주력은 *소스 인덱스 + 데이터 프로파일링*.
- **LOW = 접근 가능한 *모든* 신호 소진 후 미해소.** 못 풀어도 *잔여정보 최대화*.
- **충돌(catalog↔data 등)은 1급** — 플래그·신뢰도↓·사람 라우팅.

## 구조 (NL 앱 패턴: 모듈 + 번들 데이터)
```
build/build_signals.py        결정적 생성기 → data/signal_store.json + app/data/signal-store.js
data/signal_store.json        신호 스토어 (정본 빌드 산출물)
app/
  index.html                  실행 앱 (라이브/스냅샷 모드, 모델 피커, 두 차선 산출)
  js/live-api.js              RenderAPI — 키 3단 해석 · 모델 피커 · 재시도 (NL live-api.js 정렬)
  data/signal-store.js        번들 스토어 (window.SIGNAL_STORE; 생성됨)
  data/render-snapshot-data.js 스냅샷 데이터 (window.RenderSnapshot; 플레이스홀더 → 녹화로 교체)
docs/render-v2-design.md      설계 문서
local-config.example.js       → local-config.js 로 복사(gitignore) 시 로컬 키 주입
.gitignore                    local-config.js, .env
```

## 실행
**GitHub Pages (공유용):** Settings → Pages → `main` / `/(root)` → 빌드 후 `…/app/`.
- **스냅샷 모드 (키 불필요):** `app/data/render-snapshot-data.js`에 녹화가 있으면 상단 `모드: 스냅샷`으로 키 없이 재생.
- **라이브 모드 (키 필요):** 상단 `⚙ key`로 본인 Anthropic 키 입력(브라우저에만 저장) → 모델 선택 → 컬럼 클릭.

**아티팩트 런타임:** 키 없이 라이브 호출됨(런타임이 인증 주입).

**로컬 dev:** `cp local-config.example.js local-config.js` 후 키 기입 → 폴더를 정적 서버로 서빙.

### 키 해석 순서 (NL 정렬)
`window.ANTHROPIC_KEY`(`local-config.js`, gitignore) → `.env`(gitignore) → `localStorage`(⚙ key 입력).
**키는 리포에 절대 커밋하지 않는다** — public 리포의 키는 시크릿 스캐닝으로 자동 비활성화됨.

### 모델 피커
상단 드롭다운(Haiku 4.5 / Sonnet 4.6 / Opus 4.8 / Fable 5), `localStorage('render_model')`에 유지.

## 스냅샷 워크플로 (키 없는 공개 데모)
1. 라이브 모드(키 설정)로 원하는 컬럼들을 돌린다.
2. 상단 **[스냅샷 저장]** → `render-snapshot-data.js` 다운로드(녹화된 트레이스).
3. 그 파일을 `app/data/render-snapshot-data.js`로 넣고 커밋.
4. 공개 Pages는 `모드: 스냅샷`으로 **키 없이 재생**.

## 신호 스토어 재생성
```bash
python3 build/build_signals.py        # → data/signal_store.json + app/data/signal-store.js (결정적)
```

## 아키타입 슬라이스 (8컬럼)
| 컬럼 | 아키타입 | 시험하는 거동 |
|---|---|---|
| `CUST_BASE_INFO.JOIN_DT` | 자명 | 스키마+필드명으로 정체 → 추가 청구 없이 HIGH |
| `LOAN_APPL_HIST.LOAN_AMT` | 자명(금액) | 이름·타입이 곧 의미 |
| `LOAN_APPL_HIST.LOAN_STAT_CD` | **catalog↔data 충돌** | 등재값 {01–04} vs 실데이터 {01–05} → 충돌 플래그·신뢰도↓ |
| `CONTACT_LOG.CHNL_CD` | 코드·미문서 | enum·catalog 없음, data로 값공간만 → `observed_only` |
| `CUST_BASE_INFO.CUST_EMAIL` | PII | 소스 `@PersonalInfo` → classification(추출 소유) |
| `LOAN_ACCT_MST.CLTRL_ID` | FK로 정체 | FK 대상이 정체, NULL 다수=무담보(추정·미확정) |
| `CARD_BILL_HIST.BILL_YM` | 데이터-형식 | 타입만으론 모름 → data가 `YYYYMM`을 드러냄 |
| `LOAN_APPL_HIST.APLD_RATE` | 이름-교정/구분 | lineage(`derived_with INT_RATE`)로 "실제 적용 금리"임을 세워 INT_RATE와 구분 |

## 산출 — 두 차선
- **Render 저작**: `description`(특징화 프로즈) · `confidence` · `evidence` · `conflicts`.
- **추출 소유(참조)**: `classification` · `codedict`(status: resolved·observed_only·conflicted) · `format`.
앱은 둘을 분리 표시 — Render가 후자를 *저작하지 않음*을 드러낸다.

## 상태
- 데모 스토어는 authored 아키타입 슬라이스. 운영에선 각 신호가 *파서/임포트/라이브 쿼리*로 대체(인터페이스 동일).
- 열린 결정: `docs/render-v2-design.md` §8.
