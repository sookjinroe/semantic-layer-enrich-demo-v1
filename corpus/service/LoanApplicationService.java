package com.bank.loan.service;

import com.bank.loan.domain.LoanApplication;
import org.springframework.stereotype.Service;

/** 대출 신청 상태 해석/전이. */
@Service
public class LoanApplicationService {

    /** loanStatusCode → 표시 라벨. (LOAN_APPL_HIST.LOAN_STAT_CD) */
    public String describeLoanStatus(String loanStatusCode) {
        switch (loanStatusCode) {
            case "01": return "접수";
            case "02": return "심사중";
            case "03": return "승인";
            case "04": return "거절";
            default:   return "알수없음(" + loanStatusCode + ")";
        }
    }

    public boolean isApproved(LoanApplication appl) {
        return "03".equals(appl.getLoanStatusCode());
    }
}
