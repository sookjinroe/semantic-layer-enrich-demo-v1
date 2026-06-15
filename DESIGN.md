# v2 설계 노트

## 합의된 결정 (재작성 안 함)
- **추론 규율은 1차 유지**: 근거 vs 추정 / confidence=입수 증거 기반(어떤 소스를 봤는지가 아님) / 사람 검토 전제 / 정직한 부재("정보 부재"는 부정의 증거가 아님).
- **결합**: Render·Link는 분리. 출력→입력 직접 체인 금지. 레이어 + 검증 게이트로만 간접 결합.
  - 이유: ①신뢰도 전파(A2) — Render의 LOW/MEDIUM을 날것으로 흘리면 Link이 불확실성을 상속 ②오류 귀속 — 누구 탓인지 구분 ③"검증된 Description" 전제 보존.
- **어휘 통합**: 1차의 Render(catalog/code)와 Link(fk/usage/term_detail)를 단일 `signal-ops`로. 같은 저장소, 같은 반환 모양. 에이전트별 프롬프트는 자기 일에 맞는 op만 노출.
- **데이터**: 24MB world.db는 빌드 출력. 공유 대상은 생성기(inventory.py, seed=42). 핀해서 재생성, 바이너리 무복제.

## 스코프
- 전수(296컬럼) 아님. **아키타입마다 2~3컬럼 + 도메인 두셋 이상** 걸친 대표 슬라이스(~30-50컬럼). 충돌(F패밀리)이 실제로 보이게.

## 아키타입 (★=corpus에 이미 있음, ☆=일부 저작)
### Render
- 자명(식별자·날짜·금액·이름): schema 충분 ★
- 코드·문서화됨: schema 불충분→code 존재 ★
- 코드·미문서화(CHNL_CD·CNTC_TYPE_CD): code·catalog 부재→정직한 LOW ★
- PII: code 어노테이션이 분류 근거 ★
- FK로 정체 해소: 무의미 코드명인데 FK 대상이 뜻 줌 ★  [신규 가지]
- 기존 catalog 부분 문서 존재: Mirror vs 재유도 ☆  [신규 가지]
- catalog vs code 충돌: 어느 쪽 신뢰 + 신뢰도 반영 ☆  [신규 가지, 가장 까다로움]
### Link — Matcher
- 깨끗한 match ★ / collision reject(F패밀리) ★ / scope reject(G패밀리 입도) ★
### Link — Discoverer
- 발견·깨끗(new_term HIGH) ☆ / 오해유발 라벨(dim_07→관계로) ☆ / 충돌 신호(lineage A vs usage B→신뢰도↓) ☆ / 신호 부재(candidate LOW) ☆
### 전처리
- 기술 컬럼 스킵(CREATED_AT·UUID) ★

## 진짜 신규 설계가 몰린 곳
- Render의 3가지(특히 catalog↔code 충돌). Link은 need 어휘에 lineage 추가 여부 하나.
