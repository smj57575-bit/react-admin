<?php
// 노출 일정 공통 — ON/OFF(is_active) + 기간(starts_at ~ ends_at)을 가진 콘텐츠 (팝업, 배너 …)
// 기간 판단은 DB 시각(NOW()) 기준. PHP 와 MySQL 의 시간대가 달라도 어긋나지 않도록.

// 현재 상태: off(OFF) / scheduled(시작 전) / ended(기간 종료) / live(노출 중)
const SCHEDULE_STATUS_SQL = "
    CASE
        WHEN is_active = 0                                THEN 'off'
        WHEN starts_at IS NOT NULL AND starts_at > NOW()  THEN 'scheduled'
        WHEN ends_at   IS NOT NULL AND ends_at  <= NOW()  THEN 'ended'
        ELSE 'live'
    END";

const SCHEDULE_STATUS_LABELS = [
    'live'      => ['노출 중',   'badge--success'],
    'scheduled' => ['예약',      'badge--primary'],
    'ended'     => ['기간 종료', 'badge--muted'],
    'off'       => ['OFF',       'badge--muted'],
];

const LINK_URL_MAX = 500;

// 지금 노출 중인 행 (홈페이지 출력용). $table 은 코드에서 정한 상수만 넘긴다
function live_rows(string $table): array
{
    return db()->query("SELECT * FROM {$table} WHERE (" . SCHEDULE_STATUS_SQL . ") = 'live' ORDER BY sort_order, id DESC")->fetchAll();
}

// 관리자 목록: 전체 행 + status 컬럼, 상태별 개수
function rows_with_status(string $table): array
{
    $rows   = db()->query("SELECT *, " . SCHEDULE_STATUS_SQL . " AS status FROM {$table} ORDER BY sort_order, id DESC")->fetchAll();
    $counts = array_count_values(array_column($rows, 'status')) + array_fill_keys(array_keys(SCHEDULE_STATUS_LABELS), 0);
    return [$rows, $counts];
}

// 행 하나 + 현재 상태 (ON/OFF 전환 직후 결과 안내용)
function schedule_row(string $table, int $id): ?array
{
    $stmt = db()->prepare("SELECT *, " . SCHEDULE_STATUS_SQL . " AS status FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

// ON/OFF 뒤집기
function toggle_active(string $table, int $id): void
{
    db()->prepare("UPDATE {$table} SET is_active = 1 - is_active, updated_at = NOW() WHERE id = ?")->execute([$id]);
}

// 일정 관련 폼 값 (is_active, starts_at, ends_at, sort_order, link_url, link_new_tab)
function schedule_form_from_post(): array
{
    return [
        'link_url'     => param($_POST, 'link_url'),
        'link_new_tab' => isset($_POST['link_new_tab']) ? 1 : 0,
        'is_active'    => isset($_POST['is_active']) ? 1 : 0,
        'starts_at'    => param($_POST, 'starts_at'),
        'ends_at'      => param($_POST, 'ends_at'),
        'sort_order'   => param($_POST, 'sort_order'),
    ];
}

// 링크·기간·순서 검증
function schedule_errors(array $form): array
{
    $errors = [];
    if ($form['link_url'] !== '') {
        if (!is_http_url($form['link_url']))            $errors[] = '링크는 http:// 또는 https:// 로 시작하는 주소만 입력할 수 있습니다.';
        if (mb_strlen($form['link_url']) > LINK_URL_MAX) $errors[] = '링크는 ' . LINK_URL_MAX . '자 이내로 입력하세요.';
    }

    $start = input_to_datetime($form['starts_at']);
    $end   = input_to_datetime($form['ends_at']);
    if ($form['starts_at'] !== '' && $start === null) $errors[] = '노출 시작일 형식이 올바르지 않습니다.';
    if ($form['ends_at'] !== '' && $end === null)     $errors[] = '노출 종료일 형식이 올바르지 않습니다.';
    if ($start && $end && $start >= $end)             $errors[] = '노출 종료일은 시작일보다 뒤여야 합니다.';

    if ($form['sort_order'] !== '' && !is_int_in_range($form['sort_order'], -9999, 9999)) {
        $errors[] = '표시 순서는 -9999 ~ 9999 사이의 정수로 입력하세요.';
    }
    return $errors;
}

// DB 에 넣을 일정 값 [link_url, link_new_tab, is_active, starts_at, ends_at, sort_order]
function schedule_values(array $form): array
{
    return [
        $form['link_url'] !== '' ? $form['link_url'] : null,
        $form['link_new_tab'],
        $form['is_active'],
        input_to_datetime($form['starts_at']),
        input_to_datetime($form['ends_at']),
        (int)$form['sort_order'],
    ];
}

// javascript:, data: 같은 스킴을 막기 위해 http(s) 만 허용
function is_http_url(string $url): bool
{
    return filter_var($url, FILTER_VALIDATE_URL) !== false && preg_match('#^https?://#i', $url) === 1;
}

function is_int_in_range(string $value, int $min, int $max): bool
{
    return filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => $min, 'max_range' => $max]]) !== false;
}

// <input type="datetime-local"> 값(2026-10-12T09:00) → DB DATETIME. 빈 값이나 잘못된 값은 null
function input_to_datetime(string $value): ?string
{
    if ($value === '') return null;
    $dt = DateTime::createFromFormat('!Y-m-d\TH:i', $value);
    return $dt && $dt->format('Y-m-d\TH:i') === $value ? $dt->format('Y-m-d H:i:s') : null;
}
