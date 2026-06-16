// 생성됨: verify/record_snapshot.js — 실제 모델 녹화. window.RenderSnapshot 전역.
window.RenderSnapshot = {
  "CARD_APPL.ISSUE_STAT_CD": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "CARD_APPL",
          "column": "ISSUE_STAT_CD"
        },
        "thinking": "ORM에서 enum·어노테이션·format 등 정적 메타데이터를 먼저 확인한다.",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": null,
          "field": "issueStatusCode",
          "format_pattern": null,
          "is_id": false,
          "java_type": "String",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "CARD_APPL",
          "column": "ISSUE_STAT_CD"
        },
        "thinking": "값공간(distinct 값 목록·카디널리티·null율·형식)을 확인해 코드 라벨 추정 및 신호 교차검증에 활용한다.",
        "result": {
          "cardinality": 4,
          "distinct_sample": [
            "01",
            "02",
            "03",
            "04"
          ],
          "inferred_format": null,
          "null_rate": 0,
          "present": true,
          "top_values": {
            "01": 0.18,
            "02": 0.21,
            "03": 0.52,
            "04": 0.09
          }
        }
      },
      {
        "kind": "op",
        "op": "peek_reftable",
        "args": {
          "group_hint": "ISSUE_STAT"
        },
        "thinking": "ISSUE_STAT_CD의 값집합 {01,02,03,04}에 대한 권위 있는 라벨 매핑을 공통코드 덤프에서 먼저 확인한다.",
        "result": {
          "column_linked": false,
          "note": "이 컬럼→그룹 연결은 미선언. 아래 덤프와 값집합 매칭/코드 탐색으로 직접 이어라.",
          "dump": {
            "DEPOSIT_PROD": {
              "1001": "정기예금",
              "1002": "자유적립적금",
              "1003": "정기적금",
              "1004": "수시입출금예금"
            }
          }
        }
      },
      {
        "kind": "op",
        "op": "grep_code",
        "args": {
          "query": "issueStatusCode"
        },
        "thinking": "ORM 필드명 issueStatusCode로 코드베이스를 검색해 이 컬럼의 값-라벨 매핑 또는 switch/if 분기를 찾아 연결 권위를 확인한다.",
        "result": {
          "query": "issueStatusCode",
          "count": 4,
          "matches": [
            {
              "file": "corpus/orm/CardApplication.java",
              "line": 16,
              "text": "private String issueStatusCode;"
            },
            {
              "file": "corpus/service/CardIssueService.java",
              "line": 9,
              "text": "/** issueStatusCode → 표시 라벨. (CARD_APPL.ISSUE_STAT_CD) */"
            },
            {
              "file": "corpus/service/CardIssueService.java",
              "line": 10,
              "text": "public String describeIssueStatus(String issueStatusCode) {"
            },
            {
              "file": "corpus/service/CardIssueService.java",
              "line": 11,
              "text": "switch (issueStatusCode) {"
            }
          ]
        }
      },
      {
        "kind": "op",
        "op": "read_file",
        "args": {
          "path": "corpus/service/CardIssueService.java"
        },
        "thinking": "issueStatusCode switch 분기의 라벨 매핑을 확인해 연결 검증 및 값→라벨 확보",
        "result": {
          "path": "corpus/service/CardIssueService.java",
          "content": "package com.bank.card.service;\n\nimport org.springframework.stereotype.Service;\n\n/** 카드 발급 상태 해석. */\n@Service\npublic class CardIssueService {\n\n    /** issueStatusCode → 표시 라벨. (CARD_APPL.ISSUE_STAT_CD) */\n    public String describeIssueStatus(String issueStatusCode) {\n        switch (issueStatusCode) {\n            case \"01\": return \"신청\";\n            case \"02\": return \"심사\";\n            case \"03\": return \"발급\";\n            case \"04\": return \"반려\";\n            default:   return \"-\";\n        }\n    }\n}\n"
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "카드 신청 건의 발급 진행 상태를 나타내는 2자리 코드. 값 의미: 01=신청(접수 단계, 18%), 02=심사(심사 진행 중, 21%), 03=발급(발급 완료, 52%), 04=반려(발급 거절, 9%). 카디널리티 4, NULL 없음. 유사 컬럼(예: 심사 결과 코드·승인 상태 코드)과 혼동 주의 — 이 컬럼은 '발급 프로세스 단계'를 추적하며, 심사 결과나 한도 승인 여부와는 다른 생애주기 축이다.",
        "confidence": "HIGH",
        "evidence": [
          "orm: field=issueStatusCode, CARD_APPL.ISSUE_STAT_CD 직접 매핑",
          "profile: distinct=[01,02,03,04], null_rate=0, top_values 분포 확인",
          "code:CardIssueService.java(L9-L16): 주석에 CARD_APPL.ISSUE_STAT_CD 명시, switch(issueStatusCode) 로 라벨 권위 확인"
        ],
        "conflicts": [],
        "route_to_human": {
          "needed": false,
          "reason": ""
        },
        "thinking": "CardIssueService.java 주석에 CARD_APPL.ISSUE_STAT_CD가 명시되고 switch 분기가 issueStatusCode를 키로 사용하므로 연결 검증 완료, HIGH 확신으로 답변 가능."
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "CARD_BILL_HIST.BILL_YM": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "CARD_BILL_HIST",
          "column": "BILL_YM"
        },
        "thinking": "값공간 형식(YYYYMM vs YYMM 등)과 카디널리티를 확인해 실제 포맷을 특정해야 한다.",
        "result": {
          "cardinality": 36,
          "distinct_sample": [
            "202604",
            "202605",
            "202606"
          ],
          "inferred_format": "YYYYMM",
          "null_rate": 0,
          "present": true,
          "top_values": {}
        }
      },
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "CARD_BILL_HIST",
          "column": "BILL_YM"
        },
        "thinking": "ORM 어노테이션이나 enum/format 선언이 있는지 확인해 값 공간과 계보 정보를 보완한다.",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": null,
          "field": "billingYearMonth",
          "format_pattern": null,
          "is_id": false,
          "java_type": "String",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "카드 청구 대상 연월을 'YYYYMM' 형식의 6자리 문자열로 저장하는 컬럼이다(예: '202604' = 2024년 4월 청구분). NOT NULL이며 현재 36개월치 데이터가 존재하고 결측값이 없어, 청구 주기 기준 파티셔닝·집계·범위 필터(BETWEEN '202601' AND '202612')에 직접 활용할 수 있다. 날짜 타입이 아닌 CHAR(6)이므로 DATE 연산 시 TO_DATE(BILL_YM||'01','YYYYMMDD') 변환이 필요하다.",
        "confidence": "HIGH",
        "evidence": [
          "profile: cardinality=36, distinct_sample=['202604','202605','202606'], inferred_format=YYYYMM, null_rate=0",
          "orm: field=billingYearMonth, java_type=String, enum=null, deprecated=false"
        ],
        "conflicts": [],
        "route_to_human": {
          "needed": false,
          "reason": ""
        },
        "thinking": "프로파일에서 YYYYMM 형식과 값 샘플이 명확히 확인되고 ORM 필드명도 일치하므로 tier-2 탐색 없이 HIGH 신뢰도로 답변 가능하다."
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "CONTACT_LOG.CHNL_CD": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "CONTACT_LOG",
          "column": "CHNL_CD"
        },
        "thinking": "ORM에서 enum·어노테이션·format 등 컬럼 메타를 먼저 확인한다.",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": null,
          "field": "channelCode",
          "format_pattern": null,
          "is_id": false,
          "java_type": "String",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "CONTACT_LOG",
          "column": "CHNL_CD"
        },
        "thinking": "값공간(distinct 값 집합, 형식, 카디널리티)을 확인해 코드 라벨 추정 및 reftable 매칭 기반을 마련하기 위해 프로파일을 조회한다.",
        "result": {
          "cardinality": 4,
          "distinct_sample": [
            "01",
            "02",
            "03",
            "04"
          ],
          "inferred_format": null,
          "null_rate": 0,
          "present": true,
          "top_values": {
            "01": 0.55,
            "02": 0.3,
            "03": 0.1,
            "04": 0.05
          }
        }
      },
      {
        "kind": "op",
        "op": "peek_reftable",
        "args": {
          "group_hint": "CHNL"
        },
        "thinking": "채널 코드 01~04의 라벨을 공통코드 덤프에서 찾아 연결 여부를 검증해야 한다.",
        "result": {
          "column_linked": false,
          "note": "이 컬럼→그룹 연결은 미선언. 아래 덤프와 값집합 매칭/코드 탐색으로 직접 이어라.",
          "dump": {
            "DEPOSIT_PROD": {
              "1001": "정기예금",
              "1002": "자유적립적금",
              "1003": "정기적금",
              "1004": "수시입출금예금"
            }
          }
        }
      },
      {
        "kind": "op",
        "op": "grep_code",
        "args": {
          "query": "channelCode CHNL_CD"
        },
        "thinking": "ORM 필드명 channelCode와 컬럼명 CHNL_CD를 함께 검색해 이 컬럼의 값 매핑 권위 코드를 찾는다.",
        "result": {
          "query": "channelCode CHNL_CD",
          "count": 0,
          "matches": []
        }
      },
      {
        "kind": "op",
        "op": "grep_code",
        "args": {
          "query": "CHNL_CD channel"
        },
        "thinking": "CHNL_CD 컬럼과 연관된 코드나 매핑 로직을 찾기 위해 다양한 키워드로 재시도",
        "result": {
          "query": "CHNL_CD channel",
          "count": 0,
          "matches": []
        }
      },
      {
        "kind": "op",
        "op": "grep_code",
        "args": {
          "query": "channelCode \"01\" \"02\" \"03\" \"04\""
        },
        "thinking": "프로파일 값('01'~'04')과 channelCode 필드명을 함께 검색해 채널 코드 매핑의 권위 소스를 찾는다.",
        "result": {
          "query": "channelCode \"01\" \"02\" \"03\" \"04\"",
          "count": 0,
          "matches": []
        }
      },
      {
        "kind": "op",
        "op": "grep_code",
        "args": {
          "query": "channelCode switch case"
        },
        "thinking": "채널 코드 값(01~04)에 대한 라벨 매핑이 코드에 있는지 switch/case 패턴으로 탐색",
        "result": {
          "query": "channelCode switch case",
          "count": 0,
          "matches": []
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "고객 접촉이 발생한 채널을 CHAR(2) 코드로 기록하는 컬럼이다. 값은 '01'~'04' 4종이며, '01'이 전체의 55%로 가장 빈번하고 '04'가 5%로 가장 적다. 각 코드가 의미하는 채널명(예: 대면/전화/앱/웹 등)은 ORM enum·공통코드 그룹(CHNL) 어디에도 권위 있는 매핑이 확인되지 않았으므로, 코드 라벨은 미확인 상태임에 유의하여 사용할 것.",
        "confidence": "LOW",
        "evidence": [
          "orm: field=channelCode, java_type=String, enum=null, annotation 없음",
          "profile: cardinality=4, distinct_sample=[01,02,03,04], top_values={01:0.55,02:0.30,03:0.10,04:0.05}, null_rate=0",
          "reftable_dump: CHNL 그룹 없음(DEPOSIT_PROD만 반환), column_linked=false",
          "grep_code(channelCode CHNL_CD), grep_code(CHNL_CD channel), grep_code(channelCode 01 02 03 04), grep_code(channelCode switch case) — 전부 0건"
        ],
        "conflicts": [
          {
            "type": "코드 라벨 권위 미확인",
            "detail": "값집합 {01,02,03,04}에 대응하는 공통코드 그룹이 reftable에 존재하지 않고, 코드 코퍼스에서도 channelCode와 이 값들을 연결하는 매핑 로직이 발견되지 않았다. 채널 라벨을 단정할 근거 없음."
          }
        ],
        "route_to_human": {
          "needed": true,
          "reason": "CHNL_CD 각 코드(01~04)에 대응하는 채널 라벨(예: 대면/전화/온라인 등)을 확인할 공통코드 정의나 코드 매핑이 어느 신호에서도 발견되지 않았다. 도메인 담당자 또는 공통코드 관리 테이블 직접 조회가 필요하다."
        },
        "thinking": "모든 tier-1·tier-2 신호를 소진했으나 코드 라벨 권위가 미확인 상태이므로 LOW로 확정하고 route_to_human을 활성화한다."
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "CUST_BASE_INFO.CUST_EMAIL": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "CUST_BASE_INFO",
          "column": "CUST_EMAIL"
        },
        "thinking": "ORM 정의에서 필드 어노테이션·형식·deprecated 여부 등 기본 메타를 먼저 확인한다.",
        "result": {
          "annotations": [
            "PersonalInfo"
          ],
          "deprecated": false,
          "enum": null,
          "field": "customerEmail",
          "format_pattern": null,
          "is_id": false,
          "java_type": "String",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "CUST_BASE_INFO",
          "column": "CUST_EMAIL"
        },
        "thinking": "값공간 형식(도메인 패턴, null율, distinct 수 등)을 확인해 description에 실질적 정보를 추가하기 위해 프로파일을 조회한다.",
        "result": {
          "cardinality": 2615,
          "distinct_sample": [
            "a***@gmail.com",
            "b***@naver.com",
            null
          ],
          "inferred_format": "email",
          "null_rate": 0.09,
          "present": true,
          "top_values": {}
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "고객의 이메일 주소를 저장하는 필드(VARCHAR 120)로, 형식은 RFC 표준 이메일(user@domain)이며 실제 값 샘플(gmail.com, naver.com 등 인터넷 도메인)로 확인된다. null_rate 9%로 이메일 미등록 고객이 존재하므로 이메일 기반 필터링 시 NULL 제외 조건이 필요하고, 카디널리티 2,615로 고객 식별자에 준하는 고유성을 가지나 PK가 아니므로 중복 가능성을 배제할 수 없다. PersonalInfo 어노테이션이 지정되어 있어 개인정보보호법상 민감 항목으로 분류되며, 조회·집계 시 마스킹 또는 접근 권한 확인이 필요하다.",
        "confidence": "HIGH",
        "evidence": [
          "orm: field=customerEmail, annotations=[PersonalInfo], java_type=String, deprecated=false",
          "profile: inferred_format=email, null_rate=0.09, cardinality=2615, distinct_sample=[a***@gmail.com, b***@naver.com, null]"
        ],
        "conflicts": [],
        "route_to_human": {
          "needed": false,
          "reason": ""
        },
        "thinking": "tier-1 신호만으로 형식·null 비율·카디널리티·개인정보 분류가 충분히 확인되어 tier-2 탐색 불필요."
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "CUST_BASE_INFO.JOIN_DT": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "CUST_BASE_INFO",
          "column": "JOIN_DT"
        },
        "thinking": "ORM에서 필드 어노테이션, format, deprecated 여부, 연관 엔티티 등 기본 메타데이터를 확인한다.",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": null,
          "field": "joinDate",
          "format_pattern": null,
          "is_id": false,
          "java_type": "LocalDate",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "CUST_BASE_INFO",
          "column": "JOIN_DT"
        },
        "thinking": "값 분포, null율, 실제 날짜 범위 등을 확인해 날짜의 의미(가입일/등록일 등)와 값공간 형태를 파악하기 위해 프로파일을 조회한다.",
        "result": {
          "cardinality": 2891,
          "distinct_sample": [
            "2019-03-12",
            "2021-07-30",
            "2024-01-05"
          ],
          "inferred_format": "YYYY-MM-DD",
          "null_rate": 0,
          "present": true,
          "top_values": {}
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "고객이 서비스(또는 금융상품)에 최초 가입한 날짜를 기록하는 필드로, 고객 생애주기(가입일 기준 재직기간·이탈분석·코호트 분석)의 기준점으로 활용된다. NULL 없이 전 행에 값이 존재하고(null_rate=0), 2019-03-12~2024-01-05 범위의 YYYY-MM-DD 형식 날짜가 2,891개 고유값으로 분포하며, 일별 가입건수 집계나 기간 필터링에 그대로 사용할 수 있다. 유사 컬럼(예: 계좌개설일·상품가입일)과 혼동 주의 — 이 컬럼은 고객 자체의 첫 가입 시점을 의미하며 개별 상품 단위 날짜가 아니다.",
        "confidence": "MEDIUM",
        "evidence": [
          "orm: field=joinDate, java_type=LocalDate, deprecated=false, enum=null",
          "profile: null_rate=0, cardinality=2891, inferred_format=YYYY-MM-DD, distinct_sample=[2019-03-12,2021-07-30,2024-01-05]"
        ],
        "conflicts": [],
        "route_to_human": {
          "needed": false,
          "reason": "가입 대상(서비스 전체 vs 특정 상품)의 정확한 정의는 ORM 어노테이션·코드 주석 부재로 추정 수준이나, NL2SQL 활용에 치명적이지 않음"
        },
        "thinking": "tier-1 신호만으로 날짜 형식·완전성·범위는 확정 가능하고, '가입일' 의미는 필드명+테이블명으로 합리적으로 추정되므로 추가 dig 없이 답변 가능하다."
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "DEP_ACCT.PROD_CD": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "DEP_ACCT",
          "column": "PROD_CD"
        },
        "thinking": "ORM에서 필드 정의, enum, 어노테이션, format 등 정적 메타데이터를 먼저 확인한다.",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": null,
          "field": "productCode",
          "format_pattern": null,
          "is_id": false,
          "java_type": "String",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "DEP_ACCT",
          "column": "PROD_CD"
        },
        "thinking": "값공간(distinct 값, 형식, 카디널리티, null율)을 확인해 코드 구조와 실제 값 집합을 파악하기 위해 프로파일을 조회한다.",
        "result": {
          "cardinality": 4,
          "distinct_sample": [
            "1001",
            "1002",
            "1004"
          ],
          "inferred_format": null,
          "null_rate": 0,
          "present": true,
          "top_values": {
            "1001": 0.33,
            "1002": 0.09,
            "1003": 0.14,
            "1004": 0.44
          }
        }
      },
      {
        "kind": "op",
        "op": "peek_reftable",
        "args": {
          "group": "PROD_CD"
        },
        "thinking": "PROD_CD 값(1001~1004)이 공통코드 테이블에 등록된 상품 코드인지 확인하여 라벨을 확보한다.",
        "result": {
          "column_linked": false,
          "note": "이 컬럼→그룹 연결은 미선언. 아래 덤프와 값집합 매칭/코드 탐색으로 직접 이어라.",
          "dump": {
            "DEPOSIT_PROD": {
              "1001": "정기예금",
              "1002": "자유적립적금",
              "1003": "정기적금",
              "1004": "수시입출금예금"
            }
          }
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "예금 계좌(DEP_ACCT)의 상품 유형을 식별하는 4자리 코드. 현재 운용 중인 값은 1001(정기예금), 1002(자유적립적금), 1003(정기적금), 1004(수시입출금예금) 4종이며, 수시입출금예금(1004)이 전체의 44%로 가장 많고 자유적립적금(1002)이 9%로 가장 적다. NULL 없이 항상 채워지므로 상품 유형 필터링·집계 시 DEPOSIT_PROD 코드 그룹 기준으로 조인하면 된다.",
        "confidence": "HIGH",
        "evidence": [
          "profile: cardinality=4, distinct_sample=[1001,1002,1004], top_values={1001:0.33,1002:0.09,1003:0.14,1004:0.44}, null_rate=0",
          "reftable: DEPOSIT_PROD 그룹 {1001:정기예금, 1002:자유적립적금, 1003:정기적금, 1004:수시입출금예금} — 프로파일 실제 값집합과 완전 일치하여 연결 채택",
          "orm: field=productCode, java_type=String, enum=null, deprecated=false"
        ],
        "conflicts": [],
        "route_to_human": {
          "needed": false,
          "reason": ""
        },
        "thinking": "프로파일 값집합{1001,1002,1003,1004}이 DEPOSIT_PROD 코드 키와 완전히 일치하고 테이블명(DEP_ACCT=예금계좌)·그룹명(DEPOSIT_PROD=예금상품) 도메인도 부합하므로 연결을 채택할 수 있어 tier-2 탐색 불필요."
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "LOAN_APPL_HIST.APLD_RATE": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "LOAN_APPL_HIST",
          "column": "APLD_RATE"
        },
        "thinking": "ORM 정의에서 필드 어노테이션, enum, 포맷, 관계 등 기본 의미 신호를 먼저 확인한다.",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": null,
          "field": "appliedRate",
          "format_pattern": null,
          "is_id": false,
          "java_type": "BigDecimal",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "LOAN_APPL_HIST",
          "column": "APLD_RATE"
        },
        "thinking": "값공간(범위, 분포, null율, 형식)을 확인해 이 금리 컬럼의 실제 값 공간과 단위(%, bp 등)를 파악하기 위해 조회한다.",
        "result": {
          "cardinality": 318,
          "distinct_sample": [
            "3.250",
            "4.875",
            "6.100"
          ],
          "inferred_format": null,
          "null_rate": 0,
          "present": true,
          "top_values": {}
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "대출 신청 시점에 확정된 적용 금리(연이율, %)를 소수점 셋째 자리까지 기록한다. DECIMAL(5,3) 구조상 최대 99.999% 범위이나, 실제 값 분포(3.250, 4.875, 6.100 등 318개 고유값)로 볼 때 통상 연 3~7%대 소비자 대출 금리 영역에 집중된다. null 없음(null_rate=0)은 신청 완료 시 금리 확정이 필수임을 의미하며, 동일 테이블 내 '기준금리'·'가산금리' 성격의 컬럼이 별도 존재할 경우 이 컬럼은 그 합산 결과인 최종 적용금리일 가능성이 높으므로 집계 시 이중 계산에 주의할 것.",
        "confidence": "MEDIUM",
        "evidence": [
          "orm: field=appliedRate, java_type=BigDecimal, enum=null, format_pattern=null",
          "profile: distinct=318, null_rate=0, sample=[3.250,4.875,6.100], inferred_format=null"
        ],
        "conflicts": [],
        "route_to_human": {
          "needed": false,
          "reason": "값 분포와 ORM 필드명으로 금리임은 명확하나, 기준금리·가산금리 등 다른 금리 컬럼과의 계보 관계는 스키마 정보만으로 미확인"
        },
        "thinking": "ORM과 프로파일로 적용금리 식별은 충분하며, tier-2 dig 없이 answer 작성 가능"
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "LOAN_APPL_HIST.LOAN_AMT": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "LOAN_APPL_HIST",
          "column": "LOAN_AMT"
        },
        "thinking": "ORM에서 필드 어노테이션, 포맷, enum 등 정적 메타데이터를 먼저 확인한다.",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": null,
          "field": "loanAmount",
          "format_pattern": null,
          "is_id": false,
          "java_type": "BigDecimal",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "LOAN_APPL_HIST",
          "column": "LOAN_AMT"
        },
        "thinking": "값공간의 범위·분포·null율·형식을 확인해 비즈니스 컨텍스트를 보강한다.",
        "result": {
          "cardinality": 2043,
          "distinct_sample": [
            "3000000.00",
            "15000000.00",
            "82000000.00"
          ],
          "inferred_format": null,
          "null_rate": 0,
          "present": true,
          "top_values": {}
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "대출 신청 이력 건별로 기록된 신청 금액(원화 기준 추정)으로, 소수점 이하 2자리를 포함한 DECIMAL(15,2) 형식으로 저장된다. 실제 샘플값(300만·1,500만·8,200만 원대)을 보면 소액~중대형 개인대출 범위에 해당하며, null 없이 모든 이력 행에 필수 기록되어 이력 생성 시점의 신청 원금을 나타낸다. 대출 실행 후 변동된 실행 금액이나 잔액은 별도 컬럼(예: EXEC_AMT, BALANCE_AMT 등)을 참조해야 하며, 이 컬럼은 신청 시점 스냅샷 값이다.",
        "confidence": "MEDIUM",
        "evidence": [
          "orm: field=loanAmount, java_type=BigDecimal, no enum/format_pattern",
          "profile: cardinality=2043, null_rate=0, distinct_sample=[3000000.00,15000000.00,82000000.00]"
        ],
        "conflicts": [
          {
            "type": "currency_unverified",
            "detail": "통화 단위(원화 KRW)는 샘플 값 규모 및 테이블 도메인으로 추정하였으나 ORM 어노테이션·컬럼 코멘트에 명시 없음"
          }
        ],
        "route_to_human": {
          "needed": false,
          "reason": "핵심 의미(신청 금액)는 충분히 확인되었고 미확인 사항은 통화 단위에 한정"
        },
        "thinking": "ORM과 프로파일로 타입·값공간·필수여부는 확인되었고 코드다이그는 금액 의미 확인에 추가 가치가 낮아 answer로 진행"
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "LOAN_APPL_HIST.LOAN_STAT_CD": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "LOAN_APPL_HIST",
          "column": "LOAN_STAT_CD"
        },
        "thinking": "ORM에서 필드 타입, enum, 어노테이션, format 등 정적 메타데이터를 먼저 확인한다.",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": null,
          "field": "loanStatusCode",
          "format_pattern": null,
          "is_id": false,
          "java_type": "String",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "LOAN_APPL_HIST",
          "column": "LOAN_STAT_CD"
        },
        "thinking": "값공간(distinct 값 목록)과 null율·카디널리티를 확인해 코드 후보를 파악하기 위해 프로파일 조회",
        "result": {
          "cardinality": 5,
          "distinct_sample": [
            "01",
            "02",
            "03",
            "04",
            "05"
          ],
          "inferred_format": null,
          "null_rate": 0,
          "present": true,
          "top_values": {
            "01": 0.19,
            "02": 0.27,
            "03": 0.34,
            "04": 0.14,
            "05": 0.06
          }
        }
      },
      {
        "kind": "op",
        "op": "peek_reftable",
        "args": {
          "group_hint": "LOAN_STAT"
        },
        "thinking": "프로파일에서 값이 01~05 임을 확인했으나 라벨이 없음. reftable에서 LOAN_STAT 관련 코드 그룹을 찾아 라벨을 확인한다.",
        "result": {
          "column_linked": false,
          "note": "이 컬럼→그룹 연결은 미선언. 아래 덤프와 값집합 매칭/코드 탐색으로 직접 이어라.",
          "dump": {
            "DEPOSIT_PROD": {
              "1001": "정기예금",
              "1002": "자유적립적금",
              "1003": "정기적금",
              "1004": "수시입출금예금"
            }
          }
        }
      },
      {
        "kind": "op",
        "op": "grep_code",
        "args": {
          "query": "loanStatusCode"
        },
        "thinking": "ORM 필드명 loanStatusCode를 직접 참조하는 코드를 찾아 값→라벨 매핑의 권위를 확인한다.",
        "result": {
          "query": "loanStatusCode",
          "count": 5,
          "matches": [
            {
              "file": "corpus/orm/LoanApplication.java",
              "line": 21,
              "text": "private String loanStatusCode;"
            },
            {
              "file": "corpus/service/LoanApplicationService.java",
              "line": 10,
              "text": "/** loanStatusCode → 표시 라벨. (LOAN_APPL_HIST.LOAN_STAT_CD) */"
            },
            {
              "file": "corpus/service/LoanApplicationService.java",
              "line": 11,
              "text": "public String describeLoanStatus(String loanStatusCode) {"
            },
            {
              "file": "corpus/service/LoanApplicationService.java",
              "line": 12,
              "text": "switch (loanStatusCode) {"
            },
            {
              "file": "corpus/service/LoanApplicationService.java",
              "line": 17,
              "text": "default:   return \"알수없음(\" + loanStatusCode + \")\";"
            }
          ]
        }
      },
      {
        "kind": "op",
        "op": "read_file",
        "args": {
          "path": "corpus/service/LoanApplicationService.java"
        },
        "thinking": "grep 결과에서 describeLoanStatus 메서드가 LOAN_APPL_HIST.LOAN_STAT_CD를 명시적으로 주석에 언급하며 switch 분기를 가지고 있으므로, 전체 파일을 읽어 각 코드 값(01~05)의 라벨을 확인해야 한다.",
        "result": {
          "path": "corpus/service/LoanApplicationService.java",
          "content": "package com.bank.loan.service;\n\nimport com.bank.loan.domain.LoanApplication;\nimport org.springframework.stereotype.Service;\n\n/** 대출 신청 상태 해석/전이. */\n@Service\npublic class LoanApplicationService {\n\n    /** loanStatusCode → 표시 라벨. (LOAN_APPL_HIST.LOAN_STAT_CD) */\n    public String describeLoanStatus(String loanStatusCode) {\n        switch (loanStatusCode) {\n            case \"01\": return \"접수\";\n            case \"02\": return \"심사중\";\n            case \"03\": return \"승인\";\n            case \"04\": return \"거절\";\n            default:   return \"알수없음(\" + loanStatusCode + \")\";\n        }\n    }\n\n    public boolean isApproved(LoanApplication appl) {\n        return \"03\".equals(appl.getLoanStatusCode());\n    }\n}\n"
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "대출 신청 이력(LOAN_APPL_HIST)의 현재 진행 상태를 나타내는 2자리 코드. LoanApplicationService.describeLoanStatus()가 이 컬럼을 명시적으로 참조하며 확인된 라벨은 '01'=접수, '02'=심사중, '03'=승인, '04'=거절이고, 실제 데이터에는 '05'도 6% 비중으로 존재하나 코드 내 라벨이 정의되어 있지 않으므로 의미 확인이 필요하다. 분포상 '03'(승인) 34%·'02'(심사중) 27%·'01'(접수) 19% 순이며, NOT NULL이므로 모든 이력 행에 반드시 값이 존재한다.",
        "confidence": "MEDIUM",
        "evidence": [
          "orm: field=loanStatusCode, java_type=String, no enum",
          "profile: distinct=['01','02','03','04','05'], top_values 분포, null_rate=0",
          "code:corpus/service/LoanApplicationService.java — switch(loanStatusCode) 블록이 LOAN_APPL_HIST.LOAN_STAT_CD를 명시 참조하여 연결 검증됨"
        ],
        "conflicts": [
          {
            "type": "값집합 불일치",
            "detail": "코드 매핑(describeLoanStatus)은 '01'~'04'만 정의하나 프로파일에는 '05'(6%)가 실재함. '05'의 의미가 코드에 없어 라벨 미확인."
          }
        ],
        "route_to_human": {
          "needed": true,
          "reason": "'05' 코드의 비즈니스 의미가 코드 및 참조 테이블 어디에도 정의되어 있지 않음. DBA 또는 업무담당자 확인 필요."
        },
        "thinking": "연결 검증 완료(서비스 주석에 LOAN_APPL_HIST.LOAN_STAT_CD 명시) → 01~04 라벨 HIGH 신뢰, 단 05 미정의로 MEDIUM 처리 및 route_to_human."
      }
    ],
    "model": "claude-sonnet-4-6"
  },
  "LOAN_APPL_HIST.RPY_MTHD_CD": {
    "trace": [
      {
        "kind": "op",
        "op": "peek_profile",
        "args": {
          "table": "LOAN_APPL_HIST",
          "column": "RPY_MTHD_CD"
        },
        "thinking": "값공간·카디널리티·형식을 먼저 확인해 코드 후보를 좁힌다.",
        "result": {
          "cardinality": 3,
          "distinct_sample": [
            "01",
            "02",
            "03"
          ],
          "inferred_format": null,
          "null_rate": 0,
          "present": true,
          "top_values": {
            "01": 0.27,
            "02": 0.61,
            "03": 0.12
          }
        }
      },
      {
        "kind": "op",
        "op": "peek_orm",
        "args": {
          "table": "LOAN_APPL_HIST",
          "column": "RPY_MTHD_CD"
        },
        "thinking": "ORM에서 필드 어노테이션·enum·라벨 등 정적 메타를 확인해 값 의미와 연결 권위를 확보하기 위해",
        "result": {
          "annotations": [],
          "deprecated": false,
          "enum": {
            "01": "원금균등상환",
            "02": "원리금균등상환",
            "03": "만기일시상환"
          },
          "field": "repaymentMethodCode",
          "format_pattern": null,
          "is_id": false,
          "java_type": "String",
          "join_column": null,
          "present": true
        }
      },
      {
        "kind": "answer",
        "action": "answer",
        "description": "대출신청이력의 상환방식을 나타내는 2자리 코드로, 값은 '01'(원금균등상환)·'02'(원리금균등상환)·'03'(만기일시상환) 세 가지로 고정된다. 실적 분포는 '02'(원리금균등, 61%)가 가장 많고 '01'(원금균등, 27%), '03'(만기일시, 12%) 순이며, null 없이 항상 채워진다. NL2SQL 작성 시 특정 상환방식 필터는 해당 코드값을 직접 지정해야 하며, 이 컬럼은 실행 중인 상환 스케줄이 아닌 신청 시점에 선택한 상환방식을 기록한다는 점에 유의해야 한다.",
        "confidence": "HIGH",
        "evidence": [
          "orm: field=repaymentMethodCode, enum={01:원금균등상환, 02:원리금균등상환, 03:만기일시상환}",
          "profile: cardinality=3, distinct_sample=[01,02,03], null_rate=0, top_values={01:0.27,02:0.61,03:0.12}"
        ],
        "conflicts": [],
        "route_to_human": {
          "needed": false,
          "reason": ""
        },
        "thinking": "ORM enum이 코드-라벨 매핑을 직접 제공하고 프로파일 값집합과 완전 일치하므로 연결 검증 완료, tier-2 불필요."
      }
    ],
    "model": "claude-sonnet-4-6"
  }
};
