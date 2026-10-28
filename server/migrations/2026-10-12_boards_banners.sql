-- 기존 DB 업그레이드: 게시판 분리(boards) + 게시글 노출 순서 + 메인 배너
-- 실행: mysql -uroot board < migrations/2026-10-12_boards_banners.sql   (한 번만)
-- 새로 설치할 때는 schema.sql 만 실행하면 된다

CREATE TABLE boards (
    id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    board_key        VARCHAR(30)   NOT NULL,
    name             VARCHAR(50)   NOT NULL,
    description      VARCHAR(200)  DEFAULT NULL,
    allow_user_write TINYINT(1)    NOT NULL DEFAULT 0,
    is_active        TINYINT(1)    NOT NULL DEFAULT 1,
    sort_order       INT           NOT NULL DEFAULT 0,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_board_key (board_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기존 글은 모두 자유게시판(id 1)으로
INSERT INTO boards (id, board_key, name, description, allow_user_write, sort_order) VALUES
    (1, 'free',   '자유게시판', '누구나 글을 남길 수 있는 게시판입니다.', 1, 3),
    (2, 'notice', '공지사항',   '공지사항 게시판입니다.',                0, 1),
    (3, 'event',  '이벤트',     '진행 중인 이벤트와 프로모션입니다.',     0, 2);

ALTER TABLE posts
    ADD COLUMN board_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id,
    ADD COLUMN priority INT          NOT NULL DEFAULT 0 AFTER is_notice,
    DROP INDEX idx_list,
    ADD KEY idx_list (board_id, is_published, is_notice, priority, id),
    ADD CONSTRAINT fk_posts_board FOREIGN KEY (board_id) REFERENCES boards (id);

CREATE TABLE banners (
    id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    title        VARCHAR(100)  NOT NULL,
    subtitle     VARCHAR(200)  DEFAULT NULL,
    image_path   VARCHAR(255)  NOT NULL,
    link_url     VARCHAR(500)  DEFAULT NULL,
    button_text  VARCHAR(30)   DEFAULT NULL,
    link_new_tab TINYINT(1)    NOT NULL DEFAULT 0,
    is_active    TINYINT(1)    NOT NULL DEFAULT 1,
    starts_at    DATETIME      DEFAULT NULL,
    ends_at      DATETIME      DEFAULT NULL,
    sort_order   INT           NOT NULL DEFAULT 0,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_display (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
