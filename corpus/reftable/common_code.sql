-- 공통코드 테이블 스냅샷 (TB_COMMON_CODE).
-- 주의: DEPOSIT_PROD 그룹만 관리됨. 대출상태/채널코드는 여기 없음(코드사전 미등재).
CREATE TABLE TB_COMMON_CODE (
    group_cd VARCHAR(20),
    cd       VARCHAR(10),
    cd_nm    VARCHAR(100),
    PRIMARY KEY (group_cd, cd)
);

INSERT INTO TB_COMMON_CODE (group_cd, cd, cd_nm) VALUES
('DEPOSIT_PROD', '1001', '정기예금'),
('DEPOSIT_PROD', '1002', '자유적립적금'),
('DEPOSIT_PROD', '1003', '정기적금'),
('DEPOSIT_PROD', '1004', '수시입출금예금');
