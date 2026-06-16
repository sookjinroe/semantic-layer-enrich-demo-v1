package com.bank.deposit.domain;

import javax.persistence.*;

/** 예금 계좌 (DEP_ACCT). */
@Entity
@Table(name = "DEP_ACCT")
public class DepositAccount {

    @Id
    @Column(name = "ACCT_NO")
    private String accountNo;

    /** 상품 코드. 공통코드 그룹 매핑은 DepositService 참조. */
    @Column(name = "PROD_CD", nullable = false, length = 4)
    private String productCode;

    /** 계좌 상태 코드. */
    @Column(name = "ACCT_STAT_CD", nullable = false, length = 2)
    private String accountStatusCode;
}
