package com.bank.deposit.service;

import com.bank.deposit.domain.DepositAccount;
import org.springframework.stereotype.Service;

/** 계좌 상태 해석. 주의: 값집합이 대출상태와 겹치나 의미가 전혀 다름. */
@Service
public class AccountStatusService {

    /** accountStatusCode → 표시 라벨. (DEP_ACCT.ACCT_STAT_CD) */
    public String describeAccountStatus(String accountStatusCode) {
        switch (accountStatusCode) {
            case "01": return "정상";
            case "02": return "휴면";
            case "03": return "해지";
            case "04": return "압류";
            default:   return "미정의";
        }
    }
}
