-- FAQ(자주 묻는 질문) — 관리자 > FAQ 관리, 홈페이지 FAQ 섹션
-- 실행: mysql -uroot board < migrations/2026-10-26_faqs.sql   (한 번만. 2026-10-26 phpMyAdmin 에서 실행함)

CREATE TABLE IF NOT EXISTS faqs (
    id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    category   VARCHAR(30)   NOT NULL DEFAULT '일반',   -- 분류 (같은 분류끼리 묶어서 표시)
    question   VARCHAR(200)  NOT NULL,
    answer     TEXT          NOT NULL,
    is_active  TINYINT(1)    NOT NULL DEFAULT 1,       -- 1: 노출, 0: 숨김
    sort_order INT           NOT NULL DEFAULT 0,       -- 같은 분류 안에서 작을수록 먼저
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME      DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_list (is_active, category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
