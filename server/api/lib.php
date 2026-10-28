<?php
// JSON API 공통 — 응답, 입력, 인증, CSRF, 라우팅
// 화면(HTML)은 React 가 그리고, 여기서는 데이터(JSON)만 주고받는다. 검증·보안·DB 로직은 기존 모듈(common.php)을 그대로 쓴다
require_once __DIR__ . '/../common.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

// 예상하지 못한 오류도 JSON 으로 (스택은 서버 로그에만)
set_exception_handler(function (Throwable $e): void {
    error_log((string)$e);
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'], JSON_UNESCAPED_UNICODE);
});

// ---------- 응답 ----------
function api_ok(array $data = [], int $status = 200): never
{
    json_response(['ok' => true] + $data, $status);
}

// $errors: 입력 검증 오류 목록 (폼 위에 그대로 보여준다)
function api_error(string $message, int $status = 400, array $errors = []): never
{
    json_response(['ok' => false, 'message' => $message] + ($errors ? ['errors' => $errors] : []), $status);
}

function api_validation(array $errors): never
{
    api_error($errors[0], 422, $errors);
}

// ---------- 입력 ----------
// JSON 본문을 $_POST 로 옮겨서 기존 *_form_from_post() 함수를 그대로 쓴다
// 체크박스 규칙(보내면 ON)에 맞춰 true 는 '1', false·null 은 빼고, 숫자는 문자열로
function api_load_input(): void
{
    if (!str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) return;   // multipart(이미지 업로드)는 PHP 가 이미 $_POST 에 채운다
    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body)) api_error('요청 형식이 올바르지 않아요.');

    $_POST = [];
    foreach ($body as $key => $value) {
        if ($value === false || $value === null) continue;
        $_POST[$key] = match (true) {
            $value === true             => '1',
            is_int($value), is_float($value) => (string)$value,
            default                     => $value,
        };
    }
}

// 비밀번호처럼 trim 하지 않고 그대로 받아야 하는 값
function raw_param(string $key): string
{
    return is_string($_POST[$key] ?? null) ? $_POST[$key] : '';
}

// ---------- 인증·CSRF ----------
function api_require_admin(): void
{
    if (!is_admin()) api_error('로그인이 필요해요.', 401);
}

// GET 이 아닌 요청은 모두 X-CSRF-Token 헤더를 확인한다 (토큰은 GET /api/session 에서 받는다)
function api_verify_csrf(): void
{
    if (!hash_equals(csrf_token(), $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        api_error('화면이 오래됐어요. 새로고침한 뒤 다시 시도해 주세요.', 403);
    }
}

// ---------- 라우팅 ----------
// $routes: [메서드, 경로 패턴, 핸들러]. 패턴의 {id} 는 숫자, {key} 는 게시판 식별자
function api_dispatch(array $routes, string $method, string $path): never
{
    $allowed = [];
    foreach ($routes as [$m, $pattern, $handler]) {
        $regex = '#^' . strtr($pattern, ['{id}' => '(\d+)', '{key}' => '([a-z0-9-]+)']) . '$#';
        if (!preg_match($regex, $path, $match)) continue;
        if ($m !== $method) { $allowed[] = $m; continue; }

        if ($method !== 'GET') {
            api_verify_csrf();
            api_load_input();
        }
        $handler(...array_map(fn($v) => ctype_digit($v) ? (int)$v : $v, array_slice($match, 1)));
        api_ok();
    }
    if ($allowed) {
        header('Allow: ' . implode(', ', array_unique($allowed)));
        api_error('지원하지 않는 요청 방식이에요.', 405);
    }
    api_error('없는 주소예요.', 404);
}

// ---------- 출력용 변환 ----------
// 0/1 컬럼을 JSON 불리언으로 (숫자는 네이티브 prepare 라 이미 int). $drop: 내보내면 안 되는 컬럼 (비밀번호 해시 등)
function api_row(array $row, array $bools = [], array $drop = []): array
{
    foreach ($drop as $k) unset($row[$k]);
    foreach ($bools as $k) if (array_key_exists($k, $row)) $row[$k] = (bool)$row[$k];
    return $row;
}

function api_rows(array $rows, array $bools = [], array $drop = []): array
{
    return array_map(fn($r) => api_row($r, $bools, $drop), $rows);
}

const SCHEDULE_BOOLS = ['is_active', 'link_new_tab', 'dismissible'];
