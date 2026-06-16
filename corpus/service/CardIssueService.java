package com.bank.card.service;

import org.springframework.stereotype.Service;

/** 카드 발급 상태 해석. */
@Service
public class CardIssueService {

    /** issueStatusCode → 표시 라벨. (CARD_APPL.ISSUE_STAT_CD) */
    public String describeIssueStatus(String issueStatusCode) {
        switch (issueStatusCode) {
            case "01": return "신청";
            case "02": return "심사";
            case "03": return "발급";
            case "04": return "반려";
            default:   return "-";
        }
    }
}
