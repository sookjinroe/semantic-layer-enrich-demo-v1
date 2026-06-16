package com.bank.deposit.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.HashMap;

/** 예금 상품 조회. PROD_CD 의미는 공통코드 그룹 DEPOSIT_PROD 로 푼다. */
@Service
public class DepositService {

    private final JdbcTemplate jdbc;

    public DepositService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** productCode(DEP_ACCT.PROD_CD) → 상품명. 공통코드 테이블에서 해석. */
    public Map<String, String> loadProductNames() {
        Map<String, String> m = new HashMap<>();
        jdbc.query(
            "SELECT cd, cd_nm FROM TB_COMMON_CODE WHERE group_cd = 'DEPOSIT_PROD'",
            rs -> { m.put(rs.getString("cd"), rs.getString("cd_nm")); });
        return m;
    }
}
