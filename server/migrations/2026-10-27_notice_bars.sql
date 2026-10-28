-- 띠배너(홈페이지 맨 위 한 줄 공지) — 관리자 > 띠배너 관리
-- 실행: phpMyAdmin > board > SQL 탭에 붙여넣고 실행  (또는 mysql -uroot board < migrations/2026-10-27_notice_bars.sql)
-- 노출 일정 컬럼(link_url ~ sort_order)은 팝업·배너와 같다 → schedule.php 를 그대로 쓴다

CREATE TABLE IF NOT EXISTS notice_bars (
    id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    message      VARCHAR(120)  NOT NULL,                   -- 한 줄 문구
    tone         VARCHAR(10)   NOT NULL DEFAULT 'default', -- default(진한 남색) / accent(보라) / warning(주황)
    dismissible  TINYINT       NOT NULL DEFAULT 1,         -- 1: 방문자가 ✕ 로 닫을 수 있음 (그날 하루)
    link_url     VARCHAR(500)  DEFAULT NULL,
    link_new_tab TINYINT       NOT NULL DEFAULT 0,
    is_active    TINYINT       NOT NULL DEFAULT 1,         -- 1: ON, 0: OFF
    starts_at    DATETIME      DEFAULT NULL,               -- 비우면 즉시
    ends_at      DATETIME      DEFAULT NULL,               -- 비우면 무기한
    sort_order   INT           NOT NULL DEFAULT 0,         -- 작을수록 먼저 (홈에는 노출 중인 것 중 맨 앞 하나만)
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_display (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
