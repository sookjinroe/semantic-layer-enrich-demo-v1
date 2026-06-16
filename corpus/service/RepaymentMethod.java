package com.bank.loan.domain;

/** 상환 방식. RPY_MTHD_CD 코드↔라벨 (ORM @Convert 로 직접 매핑됨). */
public enum RepaymentMethod {
    EQUAL_PRINCIPAL("01", "원금균등상환"),
    EQUAL_INSTALLMENT("02", "원리금균등상환"),
    BULLET("03", "만기일시상환");

    private final String code;
    private final String label;
    RepaymentMethod(String code, String label) { this.code = code; this.label = label; }
    public String getCode() { return code; }
    public String getLabel() { return label; }
}
