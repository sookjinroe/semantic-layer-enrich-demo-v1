-- 뷰: 대출 적용금리 산출 (APLD_RATE 의 lineage)
-- appliedRate = 기준금리(INT_RATE) - 프로모션 할인(PROMO_DR), 하한 0
-- 즉 APLD_RATE 는 'INT_RATE 에 프로모션 할인을 적용한 최종 금리'다.
CREATE OR REPLACE VIEW V_LOAN_APPLIED_RATE AS
SELECT
    a.LOAN_APPL_ID,
    a.INT_RATE,
    p.PROMO_DR,
    GREATEST(a.INT_RATE - COALESCE(p.PROMO_DR, 0), 0) AS APLD_RATE
FROM LOAN_APPL_HIST a
LEFT JOIN LOAN_PROMO p
       ON p.LOAN_APPL_ID = a.LOAN_APPL_ID;

-- 배치(RATE_ENGINE)가 위 뷰 결과를 LOAN_APPL_HIST.APLD_RATE 로 적재한다.
