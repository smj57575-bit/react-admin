-- 전체 스키마 (MySQL 8+ / utf8mb4)
-- 새 DB 에 한 번 실행:  mysql -uroot board < schema.sql
-- 이미 쓰던 DB 는 migrations/ 의 파일을 날짜순으로 실행

-- 게시판 정의 (관리자 > 게시판 관리). 게시글은 board_id 로 소속을 가진다
CREATE TABLE IF NOT EXISTS boards (
    id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    board_key        VARCHAR(30)   NOT NULL,           -- URL 용 식별자 (list.php?board=notice), 영문 소문자·숫자·-
    name             VARCHAR(50)   NOT NULL,
    description      VARCHAR(200)  DEFAULT NULL,
    allow_user_write TINYINT(1)    NOT NULL DEFAULT 0, -- 1: 방문자도 글쓰기 가능 / 0: 관리자만
    is_active        TINYINT(1)    NOT NULL DEFAULT 1, -- 0 이면 사용자 화면에서 게시판과 글 모두 숨김
    sort_order       INT           NOT NULL DEFAULT 0, -- 작을수록 먼저 (게시판 탭 순서)
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_board_key (board_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO boards (id, board_key, name, description, allow_user_write, sort_order) VALUES
    (1, 'free',   '자유게시판', '누구나 글을 남길 수 있는 게시판입니다.', 1, 3),
    (2, 'notice', '공지사항',   '공지사항 게시판입니다.',                0, 1),
    (3, 'event',  '이벤트',     '진행 중인 이벤트와 프로모션입니다.',     0, 2);

CREATE TABLE IF NOT EXISTS posts (
    id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    board_id     INT UNSIGNED  NOT NULL DEFAULT 1,
    title        VARCHAR(100)  NOT NULL,
    author       VARCHAR(20)   NOT NULL,
    content      TEXT          NOT NULL,
    password     VARCHAR(255)  DEFAULT NULL,           -- 사용자 글: password_hash() 결과 / 관리자 글: NULL
    is_published TINYINT(1)    NOT NULL DEFAULT 1,     -- 1: 공개, 0: 비공개(관리자만 열람)
    is_notice    TINYINT(1)    NOT NULL DEFAULT 0,     -- 1: 공지(목록 상단 고정)
    priority     INT           NOT NULL DEFAULT 0,     -- 노출 순서: 클수록 위 (같으면 최신순)
    hits         INT UNSIGNED  NOT NULL DEFAULT 0,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      DEFAULT NULL,
    PRIMARY KEY (id),
    -- 게시판별 목록 정렬(공지 → 우선순위 → 최신순)과 공개 글 필터를 한 인덱스로 처리
    KEY idx_list (board_id, is_published, is_notice, priority, id),
    KEY idx_created_at (created_at),
    CONSTRAINT fk_posts_board FOREIGN KEY (board_id) REFERENCES boards (id)   -- 글이 남은 게시판은 삭제 불가
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_key VARCHAR(100) NOT NULL,                 -- '대상:IP' (예: admin:1.2.3.4, post:7:1.2.3.4)
    fails       INT UNSIGNED NOT NULL,
    first_at    INT UNSIGNED NOT NULL,                 -- 첫 실패 시각 (unix time)
    PRIMARY KEY (attempt_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 홈페이지 팝업 (관리자 > 팝업 관리)
-- 노출 조건: is_active = 1 이고 현재 시각이 [starts_at, ends_at) 안 (NULL 은 제한 없음)
CREATE TABLE IF NOT EXISTS popups (
    id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    title        VARCHAR(100)  NOT NULL,
    content      TEXT          DEFAULT NULL,           -- 일반 텍스트 (출력 시 이스케이프)
    image_path   VARCHAR(255)  DEFAULT NULL,           -- 웹 루트 기준 경로 (예: uploads/popups/ab12.jpg)
    link_url     VARCHAR(500)  DEFAULT NULL,           -- http(s) 주소만 허용
    link_new_tab TINYINT(1)    NOT NULL DEFAULT 0,
    is_active    TINYINT(1)    NOT NULL DEFAULT 1,     -- 1: ON, 0: OFF
    starts_at    DATETIME      DEFAULT NULL,           -- NULL: 즉시
    ends_at      DATETIME      DEFAULT NULL,           -- NULL: 무기한
    sort_order   INT           NOT NULL DEFAULT 0,     -- 작을수록 먼저 표시
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_display (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 홈페이지 메인 배너 (관리자 > 배너 관리). 노출 조건은 팝업과 같다
CREATE TABLE IF NOT EXISTS banners (
    id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    title        VARCHAR(100)  NOT NULL,
    subtitle     VARCHAR(200)  DEFAULT NULL,
    image_path   VARCHAR(255)  NOT NULL,               -- 배경 이미지 (필수)
    link_url     VARCHAR(500)  DEFAULT NULL,
    button_text  VARCHAR(30)   DEFAULT NULL,           -- 비우면 버튼 없이 배너 전체가 링크
    link_new_tab TINYINT(1)    NOT NULL DEFAULT 0,
    is_active    TINYINT(1)    NOT NULL DEFAULT 1,
    starts_at    DATETIME      DEFAULT NULL,
    ends_at      DATETIME      DEFAULT NULL,
    sort_order   INT           NOT NULL DEFAULT 0,     -- 작을수록 먼저
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_display (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FAQ (관리자 > FAQ 관리, 홈 FAQ 섹션)
CREATE TABLE IF NOT EXISTS faqs (
    id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    category   VARCHAR(30)   NOT NULL DEFAULT '일반',
    question   VARCHAR(200)  NOT NULL,
    answer     TEXT          NOT NULL,
    is_active  TINYINT       NOT NULL DEFAULT 1,
    sort_order INT           NOT NULL DEFAULT 0,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME      DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_list (is_active, category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 띠배너 (관리자 > 띠배너 관리, 사용자 화면 맨 위 한 줄). 글자색은 bg_color 밝기로 자동
CREATE TABLE IF NOT EXISTS notice_bars (
    id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    message      VARCHAR(120)  NOT NULL,
    bg_color     CHAR(7)       NOT NULL DEFAULT '#1E1B2E',
    dismissible  TINYINT       NOT NULL DEFAULT 1,
    link_url     VARCHAR(500)  DEFAULT NULL,
    link_new_tab TINYINT       NOT NULL DEFAULT 0,
    is_active    TINYINT       NOT NULL DEFAULT 1,
    starts_at    DATETIME      DEFAULT NULL,
    ends_at      DATETIME      DEFAULT NULL,
    sort_order   INT           NOT NULL DEFAULT 0,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_display (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
