// 생성됨: build/build_signals.py — 직접 수정 금지. window.SIGNAL_STORE 전역.
window.SIGNAL_STORE = {
  "columns": {
    "CARD_APPL.ISSUE_STAT_CD": {
      "archetype": "tier2-success",
      "orm": {
        "annotations": [],
        "deprecated": false,
        "enum": null,
        "field": "issueStatusCode",
        "format_pattern": null,
        "is_id": false,
        "java_type": "String",
        "join_column": null,
        "present": true
      },
      "profile": {
        "cardinality": 4,
        "distinct_sample": [
          "01",
          "02",
          "03",
          "04"
        ],
        "inferred_format": null,
        "null_rate": 0.0,
        "present": true,
        "top_values": {
          "01": 0.18,
          "02": 0.21,
          "03": 0.52,
          "04": 0.09
        }
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "ISSUE_STAT_CD",
        "nullable": false,
        "pk": false,
        "table": "CARD_APPL",
        "type": "CHAR(2)"
      }
    },
    "CARD_BILL_HIST.BILL_YM": {
      "archetype": "형식",
      "orm": {
        "annotations": [],
        "deprecated": false,
        "enum": null,
        "field": "billingYearMonth",
        "format_pattern": null,
        "is_id": false,
        "java_type": "String",
        "join_column": null,
        "present": true
      },
      "profile": {
        "cardinality": 36,
        "distinct_sample": [
          "202604",
          "202605",
          "202606"
        ],
        "inferred_format": "YYYYMM",
        "null_rate": 0.0,
        "present": true,
        "top_values": {}
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "BILL_YM",
        "nullable": false,
        "pk": false,
        "table": "CARD_BILL_HIST",
        "type": "CHAR(6)"
      }
    },
    "CONTACT_LOG.CHNL_CD": {
      "archetype": "floor",
      "orm": {
        "annotations": [],
        "deprecated": false,
        "enum": null,
        "field": "channelCode",
        "format_pattern": null,
        "is_id": false,
        "java_type": "String",
        "join_column": null,
        "present": true
      },
      "profile": {
        "cardinality": 4,
        "distinct_sample": [
          "01",
          "02",
          "03",
          "04"
        ],
        "inferred_format": null,
        "null_rate": 0.0,
        "present": true,
        "top_values": {
          "01": 0.55,
          "02": 0.3,
          "03": 0.1,
          "04": 0.05
        }
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "CHNL_CD",
        "nullable": false,
        "pk": false,
        "table": "CONTACT_LOG",
        "type": "CHAR(2)"
      }
    },
    "CUST_BASE_INFO.CUST_EMAIL": {
      "archetype": "PII",
      "orm": {
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
      },
      "profile": {
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
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "CUST_EMAIL",
        "nullable": true,
        "pk": false,
        "table": "CUST_BASE_INFO",
        "type": "VARCHAR(120)"
      }
    },
    "CUST_BASE_INFO.JOIN_DT": {
      "archetype": "자명",
      "orm": {
        "annotations": [],
        "deprecated": false,
        "enum": null,
        "field": "joinDate",
        "format_pattern": null,
        "is_id": false,
        "java_type": "LocalDate",
        "join_column": null,
        "present": true
      },
      "profile": {
        "cardinality": 2891,
        "distinct_sample": [
          "2019-03-12",
          "2021-07-30",
          "2024-01-05"
        ],
        "inferred_format": "YYYY-MM-DD",
        "null_rate": 0.0,
        "present": true,
        "top_values": {}
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "JOIN_DT",
        "nullable": false,
        "pk": false,
        "table": "CUST_BASE_INFO",
        "type": "DATE"
      }
    },
    "DEP_ACCT.PROD_CD": {
      "archetype": "reftable-link",
      "orm": {
        "annotations": [],
        "deprecated": false,
        "enum": null,
        "field": "productCode",
        "format_pattern": null,
        "is_id": false,
        "java_type": "String",
        "join_column": null,
        "present": true
      },
      "profile": {
        "cardinality": 4,
        "distinct_sample": [
          "1001",
          "1002",
          "1004"
        ],
        "inferred_format": null,
        "null_rate": 0.0,
        "present": true,
        "top_values": {
          "1001": 0.33,
          "1002": 0.09,
          "1003": 0.14,
          "1004": 0.44
        }
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "PROD_CD",
        "nullable": false,
        "pk": false,
        "table": "DEP_ACCT",
        "type": "CHAR(4)"
      }
    },
    "LOAN_APPL_HIST.APLD_RATE": {
      "archetype": "lineage",
      "orm": {
        "annotations": [],
        "deprecated": false,
        "enum": null,
        "field": "appliedRate",
        "format_pattern": null,
        "is_id": false,
        "java_type": "BigDecimal",
        "join_column": null,
        "present": true
      },
      "profile": {
        "cardinality": 318,
        "distinct_sample": [
          "3.250",
          "4.875",
          "6.100"
        ],
        "inferred_format": null,
        "null_rate": 0.0,
        "present": true,
        "top_values": {}
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "APLD_RATE",
        "nullable": false,
        "pk": false,
        "table": "LOAN_APPL_HIST",
        "type": "DECIMAL(5,3)"
      }
    },
    "LOAN_APPL_HIST.LOAN_AMT": {
      "archetype": "자명",
      "orm": {
        "annotations": [],
        "deprecated": false,
        "enum": null,
        "field": "loanAmount",
        "format_pattern": null,
        "is_id": false,
        "java_type": "BigDecimal",
        "join_column": null,
        "present": true
      },
      "profile": {
        "cardinality": 2043,
        "distinct_sample": [
          "3000000.00",
          "15000000.00",
          "82000000.00"
        ],
        "inferred_format": null,
        "null_rate": 0.0,
        "present": true,
        "top_values": {}
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "LOAN_AMT",
        "nullable": false,
        "pk": false,
        "table": "LOAN_APPL_HIST",
        "type": "DECIMAL(15,2)"
      }
    },
    "LOAN_APPL_HIST.LOAN_STAT_CD": {
      "archetype": "충돌-크럭스",
      "orm": {
        "annotations": [],
        "deprecated": false,
        "enum": null,
        "field": "loanStatusCode",
        "format_pattern": null,
        "is_id": false,
        "java_type": "String",
        "join_column": null,
        "present": true
      },
      "profile": {
        "cardinality": 5,
        "distinct_sample": [
          "01",
          "02",
          "03",
          "04",
          "05"
        ],
        "inferred_format": null,
        "null_rate": 0.0,
        "present": true,
        "top_values": {
          "01": 0.19,
          "02": 0.27,
          "03": 0.34,
          "04": 0.14,
          "05": 0.06
        }
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "LOAN_STAT_CD",
        "nullable": false,
        "pk": false,
        "table": "LOAN_APPL_HIST",
        "type": "CHAR(2)"
      }
    },
    "LOAN_APPL_HIST.RPY_MTHD_CD": {
      "archetype": "enum-clean",
      "orm": {
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
      },
      "profile": {
        "cardinality": 3,
        "distinct_sample": [
          "01",
          "02",
          "03"
        ],
        "inferred_format": null,
        "null_rate": 0.0,
        "present": true,
        "top_values": {
          "01": 0.27,
          "02": 0.61,
          "03": 0.12
        }
      },
      "reftable": {
        "present": false
      },
      "schema": {
        "fk": null,
        "name": "RPY_MTHD_CD",
        "nullable": false,
        "pk": false,
        "table": "LOAN_APPL_HIST",
        "type": "CHAR(2)"
      }
    }
  },
  "reftable_dump": {
    "DEPOSIT_PROD": {
      "1001": "정기예금",
      "1002": "자유적립적금",
      "1003": "정기적금",
      "1004": "수시입출금예금"
    }
  }
};
