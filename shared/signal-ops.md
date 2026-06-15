# signal-ops — 증강 에이전트의 공유 입력 인터페이스 (layer-ops의 거울상)

NL 에이전트가 큐레이션된 레이어를 `layer-ops` 8연산으로 청구하듯, 증강 에이전트(Render·Link)는
**raw 신호**를 아래 연산으로 청구한다. 둘은 같은 저장소를 때린다. 각 연산은 진짜 데이터
**또는 명시적 부재 객체**를 반환한다 — 이 부재·잡음이 "청구→불만→재청구"를 만든다.

| op | 반환 | 부재 시 | 출처(슬라이스) |
|---|---|---|---|
| `peek_schema(col)`  | 이름·타입·NULL·PK·FK | (항상 존재, 시드) | world.db |
| `peek_catalog(col)` | 도메인·기존 Description·연결 Term·분류 | `{present:false}` 항목별 "정보 부재" | 희소 저작(레이어는 생산 대상) |
| `peek_code(col)`    | enum 리터럴·어노테이션(@PersonalInfo 등) | `{present:false}` | codedict 역산 + classification |
| `peek_bi(col)`      | 표시명·지표·대시보드·공동참조 | `{present:false}` | metrics·질문 일부 + 의도적 잡음 |
| `peek_lineage(col)` | 상류·공동파생 컬럼 | `{present:false}` | 일부 저작 |
| `peek_fk(col)`      | FK 대상 컬럼의 정체 | `{present:false}`(FK 아니면) | world.db FK |
| `peek_term(name)`   | 글로서리 Term 상세(허용값·도메인·연결) | `{present:false}`(없는 이름→정직한 "없음") | 글로서리(Mirror 입력) |
| `search_terms(q)`   | 후보 Term 목록(근접오답 포함, 점수 비노출) | 빈 목록 | 글로서리 |
| `cluster_signals(cols)` | 잔여 군집의 usage·lineage 묶음 | — | Discoverer 1단계 |

## 부재 = 부정의 증거가 아님
빈 항목은 그 소스가 그 정보를 *관리하지 않음*이다. 에이전트는 이걸로 신뢰도를 낮추지 않는다.
신뢰도는 **입수한 증거**에만 달려 있다.

## 에이전트별 노출
- Render: peek_schema(시드)·peek_catalog·peek_code·peek_bi·peek_lineage·peek_fk
- Link Matcher: search_terms(시드)·peek_term·peek_fk·peek_bi·(peek_lineage 추가 여부 = 열린 결정)
- Link Discoverer: cluster_signals·peek_bi·peek_lineage·peek_term
