package com.bank.card.domain;

import javax.persistence.*;

/** 카드 청구 이력 (CARD_BILL_HIST). */
@Entity
@Table(name = "CARD_BILL_HIST")
public class CardBill {

    @Id
    @Column(name = "BILL_ID")
    private String billId;

    /** 청구 연월. */
    @Column(name = "BILL_YM", nullable = false, length = 6)
    private String billingYearMonth;
}
