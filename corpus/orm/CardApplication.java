package com.bank.card.domain;

import javax.persistence.*;

/** 카드 발급 신청 (CARD_APPL). */
@Entity
@Table(name = "CARD_APPL")
public class CardApplication {

    @Id
    @Column(name = "CARD_APPL_ID")
    private String cardApplId;

    /** 발급 상태 코드. 의미는 CardIssueService 참조. */
    @Column(name = "ISSUE_STAT_CD", nullable = false, length = 2)
    private String issueStatusCode;
}
