<?php
// 게시판 정의 공통 — 조회, 입력 검증
// 게시판을 끄면(is_active = 0) 사용자 화면에서 게시판과 그 글이 모두 숨겨진다. 관리자는 계속 볼 수 있다.

const BOARD_KEY_PATTERN = '/^[a-z0-9][a-z0-9-]{1,29}$/';   // URL 용 식별자: 영문 소문자·숫자·-, 2~30자
const BOARD_NAME_MAX    = 50;
const BOARD_DESC_MAX    = 200;

// 게시판 목록 (탭·메뉴 순서). $activeOnly: 사용자에게 보이는 것만
function all_boards(bool $activeOnly = false): array
{
    static $cache = [];
    return $cache[(int)$activeOnly] ??= db()->query(
        'SELECT * FROM boards ' . ($activeOnly ? 'WHERE is_active = 1 ' : '') . 'ORDER BY sort_order, id'
    )->fetchAll();
}

function find_board(int $id): ?array
{
    foreach (all_boards() as $b) if ((int)$b['id'] === $id) return $b;
    return null;
}

function find_board_by_key(string $key): ?array
{
    foreach (all_boards() as $b) if ($b['board_key'] === $key) return $b;
    return null;
}

// 사용자가 이 게시판(과 그 글)을 볼 수 있는지
function can_view_board(?array $board): bool
{
    return $board !== null && ($board['is_active'] || is_admin());
}

// 방문자가 이 게시판에 글을 쓸 수 있는지 (관리자는 admin/write.php 사용)
function can_user_write(?array $board): bool
{
    return $board !== null && $board['is_active'] && $board['allow_user_write'];
}

function board_form_from_post(): array
{
    return [
        'board_key'        => strtolower(param($_POST, 'board_key')),
        'name'             => param($_POST, 'name'),
        'description'      => param($_POST, 'description'),
        'allow_user_write' => isset($_POST['allow_user_write']) ? 1 : 0,
        'is_active'        => isset($_POST['is_active']) ? 1 : 0,
        'sort_order'       => param($_POST, 'sort_order'),
    ];
}

// 검증. $id: 수정 중인 게시판 (식별자 중복 검사에서 자기 자신 제외)
function board_errors(array $form, int $id = 0): array
{
    $errors = [];
    if (!preg_match(BOARD_KEY_PATTERN, $form['board_key'])) {
        $errors[] = '식별자는 영문 소문자·숫자·하이픈(-)으로 2~30자, 첫 글자는 영문 소문자나 숫자여야 합니다.';
    } else {
        $other = find_board_by_key($form['board_key']);
        if ($other && (int)$other['id'] !== $id) $errors[] = '이미 사용 중인 식별자입니다.';
    }
    if ($form['name'] === '')                              $errors[] = '게시판 이름을 입력하세요.';
    if (mb_strlen($form['name']) > BOARD_NAME_MAX)         $errors[] = '게시판 이름은 ' . BOARD_NAME_MAX . '자 이내로 입력하세요.';
    if (mb_strlen($form['description']) > BOARD_DESC_MAX)  $errors[] = '설명은 ' . BOARD_DESC_MAX . '자 이내로 입력하세요.';
    if ($form['sort_order'] !== '' && !is_int_in_range($form['sort_order'], -9999, 9999)) {
        $errors[] = '표시 순서는 -9999 ~ 9999 사이의 정수로 입력하세요.';
    }
    return $errors;
}
