package com.bank.crm.domain;

import javax.persistence.*;

/** 고객 접촉 로그 (CONTACT_LOG). */
@Entity
@Table(name = "CONTACT_LOG")
public class ContactLog {

    @Id
    @Column(name = "LOG_ID")
    private String logId;

    /** 채널 코드. */
    @Column(name = "CHNL_CD", nullable = false, length = 2)
    private String channelCode;
}
