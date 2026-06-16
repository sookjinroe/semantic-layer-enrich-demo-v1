package com.bank.cust.domain;

import javax.persistence.*;
import java.time.LocalDate;
import com.bank.common.security.PersonalInfo;

/** 고객 기본 정보 (CUST_BASE_INFO). */
@Entity
@Table(name = "CUST_BASE_INFO")
public class Customer {

    @Id
    @Column(name = "CUST_NO")
    private String customerNo;

    @Column(name = "JOIN_DT", nullable = false)
    private LocalDate joinDate;

    @PersonalInfo
    @Column(name = "CUST_EMAIL", length = 120)
    private String customerEmail;
}
