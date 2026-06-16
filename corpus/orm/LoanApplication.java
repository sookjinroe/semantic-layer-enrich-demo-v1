package com.bank.loan.domain;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** 대출 신청 이력 (LOAN_APPL_HIST). */
@Entity
@Table(name = "LOAN_APPL_HIST")
public class LoanApplication {

    @Id
    @Column(name = "LOAN_APPL_ID")
    private String loanApplId;

    @Column(name = "LOAN_AMT", nullable = false)
    private BigDecimal loanAmount;

    /** 대출 상태 코드. 코드값 의미는 LoanApplicationService 에서 해석. */
    @Column(name = "LOAN_STAT_CD", nullable = false, length = 2)
    private String loanStatusCode;

    /** 상환 방식 코드. */
    @Column(name = "RPY_MTHD_CD", nullable = false, length = 2)
    @Convert(converter = RepaymentMethodConverter.class)
    private RepaymentMethod repaymentMethod;

    /** 적용 금리. 기준금리에서 산출됨 (산출식은 배치/뷰 참조). */
    @Column(name = "APLD_RATE", nullable = false)
    private BigDecimal appliedRate;

    @Column(name = "INT_RATE", nullable = false)
    private BigDecimal interestRate;

    // getters/setters 생략
}
