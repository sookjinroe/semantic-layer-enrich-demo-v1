# Render v2 — 시맨틱 레이어 증강 에이전트 (부산물 신호 + 연결 검증)

DB 컬럼 하나에 대해, **부산물 신호만으로** NL2SQL 에이전트가 쓸 비즈니스 Description 을 합성하는
에이전트. 1차 PoC를 *설계부터 재구성*했다.

## 검증하려는 가설
> **부산물 신호(스키마·코드·데이터·reftable)만으로 라벨-권위를 *검증 가능하게* 근거 지을 수 있나.**

핵심은 "라벨을 찾기"가 아니라 **"찾은 매핑이 *이 컬럼의 권위*인지 검증"**이다. 값집합이 겹친다고
권위가 아니다 — 연결(ORM 필드명 매칭 등)을 확인해야 한다.

## 두 티어
- **tier-1 (미리 구축, 싼 조회)** — `peek_orm · peek_profile · peek_reftable`. 스키마·파싱된 ORM·
  데이터 프로파일·전역 공통코드 덤프. 결정적 전수 추출.
- **tier-2 (on-demand dig, 비쌈)** — `grep_code · read_file · find_refs`. 라벨·계보·연결이
  흩어진 코드 코퍼스를 *뒤진다*. 컬럼명에서 출발해 타고 들어가 **연결을 검증**.

## 산출물
`description · confidence · evidence(출처 포함) · conflicts · route_to_human`. codedict·format 같은
구조화 슬롯은 *읽어서 참조*만(저작 안 함). 권위가 어디에도 없으면 → **LOW + 사람-라우팅**(정직한 floor).

## 데이터 슬라이스 (가설 시험용)
10컬럼이 control(dig 불필요) / tier-2 성공 / **충돌 크럭스**(값 겹치는 오귀속 후보 → 연결 검증 필수) /
**floor**(라벨 전무 → 사람) 을 덮는다. 설계·invariant: [`DATA_SPEC.md`](DATA_SPEC.md).

## 구조
```
build/build_signals.py   tier-1 store 결정적 생성기  → data/signal_store.json + data/signal-store.js
build/build_corpus.py    tier-2 코퍼스 번들러        → data/corpus-index.js
corpus/**                tier-2 코드 코퍼스 (ORM·서비스·ETL·공통코드)
data/                    생성된 번들 (store · corpus · 스냅샷)
js/agent.js              에이전트 코어 (도구·루프·시스템 프롬프트)
js/live-api.js           Anthropic API 어댑터 (브라우저 직접 호출)
app.jsx · index.html     UI (컬럼 목록 + 에이전트 트레이스 + 산출 카드)
verify/                  검증 (invariant 29 · 하니스 19 · 렌더 스모크)
```

## 실행
**GitHub Pages (라이브):** 페이지 상단 `⚙ key`로 본인 Anthropic 키 입력(브라우저에만 저장) →
모델 선택 → 컬럼의 `실행`. 라이브 실행이 곧 가설 검증.
- 키는 리포에 커밋 금지(시크릿 스캐닝 대상). `local-config.example.js` → `local-config.js`(gitignore) 로 로컬 주입 가능.
- 라이브 실행 후 `스냅샷 저장` → `data/render-snapshot-data.js` 교체 시 키 없이 재생 가능.

**로컬 dev:** `python3 -m http.server 8080` 후 접속.

## 빌드 / 검증
```
python3 build/build_signals.py    # tier-1 store
python3 build/build_corpus.py     # tier-2 코퍼스 번들
python3 verify/check_data.py      # invariant 29
node    verify/harness_test.js    # 하니스 19 (도구·루프·경로 도달성)
```
