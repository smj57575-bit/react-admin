<?php
// 띠배너(홈페이지 맨 위 한 줄 공지) 공통 — 조회, 입력 검증, 색상. 노출 일정(ON/OFF, 기간, 순서, 링크)은 schedule.php
// 테이블: notice_bars (migrations/2026-10-27_notice_bars.sql, 2026-10-27_notice_bar_colors.sql)
// 한 번에 한 줄만 보여준다. 노출 중인 것이 여러 개면 순서가 가장 앞선 하나만 (짧고 하나일 때 읽힌다)

const NOTICE_BAR_MESSAGE_MAX = 120;
const NOTICE_BAR_DEFAULT_COLOR = '#1E1B2E';

// 관리자 팔레트 — 자주 쓰는 배경색. 여기 없는 색은 "직접 고르기"로
const NOTICE_BAR_PALETTE = [
    '#1E1B2E' => '잉크',
    '#6D5AE6' => '보라',
    '#3182F6' => '블루',
    '#0CA678' => '그린',
    '#F76707' => '오렌지',
    '#E03131' => '레드',
    '#FFE8A3' => '버터',
    '#EDE9FE' => '라벤더',
    '#F0EEE9' => '클라우드 댄서',   // 팬톤 2026 올해의 색
];

// 사용자 화면 맨 위에 지금 보여줄 띠배너 하나 (없으면 null)
function current_notice_bar(): ?array
{
    return live_rows('notice_bars')[0] ?? null;
}

function find_notice_bar(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM notice_bars WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function notice_bar_form_from_post(): array
{
    return [
        'message'     => param($_POST, 'message'),
        'bg_color'    => '#' . strtoupper(ltrim(param($_POST, 'bg_color'), '#')),   // '#' 없이 입력해도 받아준다
        'dismissible' => isset($_POST['dismissible']) ? 1 : 0,
    ] + schedule_form_from_post();
}

// 검증. 오류 메시지 배열을 돌려주며 비어 있으면 통과
function notice_bar_errors(array $form): array
{
    $errors = [];
    if ($form['message'] === '')                                $errors[] = '문구를 입력하세요.';
    if (mb_strlen($form['message']) > NOTICE_BAR_MESSAGE_MAX)   $errors[] = '문구는 ' . NOTICE_BAR_MESSAGE_MAX . '자 이내로 입력하세요. 한 줄로 읽혀야 해요.';
    if (!is_hex_color($form['bg_color']))                       $errors[] = '배경색을 고르세요. (#RRGGBB 형식)';
    return array_merge($errors, schedule_errors($form));
}

function is_hex_color(string $value): bool
{
    return preg_match('/^#[0-9A-Fa-f]{6}$/', $value) === 1;
}

// ---------- 색 대비 (WCAG) ----------
// 글자색은 관리자가 고르지 않는다. 배경에 대해 흰 글자와 진한 글자 중 더 잘 읽히는 쪽을 자동으로 쓴다
const NOTICE_BAR_LIGHT_TEXT = '#FFFFFF';
const NOTICE_BAR_DARK_TEXT  = '#1E1B2E';

function relative_luminance(string $hex): float
{
    $channel = function (string $h): float {
        $c = hexdec($h) / 255;
        return $c <= 0.04045 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * $channel(substr($hex, 1, 2)) + 0.7152 * $channel(substr($hex, 3, 2)) + 0.0722 * $channel(substr($hex, 5, 2));
}

function contrast_ratio(string $a, string $b): float
{
    [$hi, $lo] = [max(relative_luminance($a), relative_luminance($b)), min(relative_luminance($a), relative_luminance($b))];
    return ($hi + 0.05) / ($lo + 0.05);
}

// 배경색에 맞는 글자색
function notice_bar_text_color(string $bg): string
{
    return contrast_ratio($bg, NOTICE_BAR_LIGHT_TEXT) >= contrast_ratio($bg, NOTICE_BAR_DARK_TEXT) ? NOTICE_BAR_LIGHT_TEXT : NOTICE_BAR_DARK_TEXT;
}
