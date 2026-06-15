# semantic-layer-enrich-demo-v1

증강 에이전트(Render/Link) **v2** — 1차 PoC(`semantic-layer-enrich-demo`)의 후속.

## v2가 바꾸는 것 (한 줄)
1차의 에이전트 *요청 루프*는 이미 진짜였다. v2는 그 루프에 **world.db·corpus 위의 진짜(그리고 의도적으로 불완전한) 신호 백엔드**를 붙인다 — 하니스가 필요한 정보만 쏙쏙 주는 fixture를 걷어내고, 에이전트가 신호를 청구·재청구하게 한다.

## 구조 (요지)
- 두 에이전트(Render·Link)는 **그대로 분리**. 공유하는 건 입력 측 `signal-ops`(주방 하나, 손님 둘)뿐.
- Render 출력→Link 입력은 **직접 체인 아님**. 레이어 + 검증 게이트를 매개로만 간접 결합(스펙의 "레이어=인터페이스, 생산/소비 분리").
- world.db는 `inventory.py`(seed=42)의 결정적 빌드 출력 — 바이너리 복제 없이 corpus를 핀해 재생성. signal-store는 inventory.py의 신규 타깃.

## 상태
- [x] 설계: 결합 방식·signal-ops 표면·아키타입 (DESIGN.md)
- [ ] **Render v2 프롬프트/루프** (agents/render/) ← 지금 여기, 깎는 중
- [ ] Link v2
- [ ] signal-store 생성기 + signal-ops 구현 (인프라)
