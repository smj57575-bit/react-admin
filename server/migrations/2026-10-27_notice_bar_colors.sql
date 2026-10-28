-- 띠배너 색상: 정해진 3가지(tone) → 원하는 색(bg_color, #RRGGBB). 글자색은 배경 밝기로 자동 결정(notice_bars.php)
-- 실행: mysql -uroot board < migrations/2026-10-27_notice_bar_colors.sql   (한 번만)

ALTER TABLE notice_bars ADD COLUMN bg_color CHAR(7) NOT NULL DEFAULT '#1E1B2E' AFTER message;

-- 기존 tone 값을 색으로 옮긴다
UPDATE notice_bars SET bg_color = CASE tone
    WHEN 'accent'  THEN '#6D5AE6'
    WHEN 'warning' THEN '#FFE8A3'
    ELSE '#1E1B2E'
END;

ALTER TABLE notice_bars DROP COLUMN tone;
