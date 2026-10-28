<?php
// 공통 부트스트랩 — API(api/index.php)가 가장 먼저 require
// 설정, 보안 헤더, 오류 처리, 세션, DB, 입력·JSON 헬퍼, 관리자 인증, CSRF, 비밀번호 시도 제한

// ---------- 설정 ----------
function config(): array
{
    static $config = null;
    return $config ??= require __DIR__ . '/config.php';
}

// ---------- 보안 헤더 ----------
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

// ---------- 예상하지 못한 오류 ----------
// 스택/파일 경로는 서버 로그에만 남기고, 사용자에게는 일반 메시지만 보여준다
set_exception_handler(function (Throwable $e): void {
    error_log((string)$e);
    http_response_code(500);
    exit('일시적인 오류가 발생했습니다. 잠시 후 다시 시도하세요.');
});

// ---------- 세션 ----------
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => !empty($_SERVER['HTTPS']),
]);
session_start();

// ---------- DB (MySQL) ----------
// 테이블은 schema.sql 로 미리 만들어 둔다 (mysql -uroot board < schema.sql)
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $db  = config()['db'];
    $dsn = "mysql:host={$db['host']};dbname={$db['name']};charset=utf8mb4";

    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,   // LIMIT/OFFSET 을 정수로 바인딩하려면 필요
    ]);

    return $pdo;
}

// ---------- 입력 ----------
// 요청 파라미터를 문자열로 읽는다. 배열 등 문자열이 아닌 값(?q[]=1)은 빈 문자열로 취급
function param(array $source, string $key): string
{
    $value = $source[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

// ---------- 관리자 인증 ----------
function is_admin(): bool
{
    return !empty($_SESSION['admin']);
}

// ---------- CSRF ----------
// 세션마다 토큰 하나. GET /api/session 으로 화면에 주고, 쓰기 요청의 X-CSRF-Token 헤더와 비교한다 (api/lib.php)
function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(16));
}

// ---------- JSON 응답 ----------
function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ON/OFF 전환 결과 안내 — 토스트에 보여줄 문구와 종류(success/warning)
// $schedule(schedule_row() 결과)를 주면, 켰는데도 홈에 안 보이는 이유(예약·기간 종료)까지 알려준다
function toggle_result(string $name, bool $active, ?array $schedule = null): array
{
    $name    = '‘' . mb_strimwidth($name, 0, 40, '…') . '’';
    $status  = $schedule['status'] ?? ($active ? 'live' : 'off');
    $message = match ($status) {
        'off'       => "{$name} 노출을 껐어요",
        'scheduled' => "{$name} 노출을 켰어요. " . date('n월 j일 H:i', strtotime($schedule['starts_at'])) . '부터 홈에 보여요',
        'ended'     => "{$name} 노출을 켰지만 기간이 끝나서 홈에는 안 보여요. 종료일을 바꿔 주세요",
        default     => "{$name} 노출을 켰어요",
    };
    return ['active' => $active, 'status' => $status, 'message' => $message, 'type' => $status === 'ended' ? 'warning' : 'success'];
}

// ---------- 비밀번호 시도 제한 ----------
// 같은 대상(관리자 로그인, 특정 글)에 같은 IP 가 15분 안에 5회 실패하면 그 창이 끝날 때까지 차단
const THROTTLE_MAX_FAILS = 5;
const THROTTLE_WINDOW    = 900;

function throttle_key(string $target): string
{
    return $target . ':' . ($_SERVER['REMOTE_ADDR'] ?? '');
}

function is_throttled(string $key): bool
{
    $stmt = db()->prepare('SELECT fails, first_at FROM login_attempts WHERE attempt_key = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    return $row && time() - $row['first_at'] < THROTTLE_WINDOW && $row['fails'] >= THROTTLE_MAX_FAILS;
}

function record_failure(string $key): void
{
    // 창이 지났으면 1부터 다시 센다
    db()->prepare("
        INSERT INTO login_attempts (attempt_key, fails, first_at) VALUES (:key, 1, :now)
        ON DUPLICATE KEY UPDATE
            fails    = IF(:now2 - first_at >= :window,  1,    fails + 1),
            first_at = IF(:now3 - first_at >= :window2, :now4, first_at)
    ")->execute([
        ':key'  => $key,
        ':now'  => time(), ':now2' => time(), ':now3' => time(), ':now4' => time(),
        ':window' => THROTTLE_WINDOW, ':window2' => THROTTLE_WINDOW,
    ]);
}

function clear_failures(string $key): void
{
    db()->prepare('DELETE FROM login_attempts WHERE attempt_key = ?')->execute([$key]);
}

// 기능별 모듈 — 새 관리 기능은 여기에 한 줄 추가
require_once __DIR__ . '/boards.php';
require_once __DIR__ . '/posts.php';
require_once __DIR__ . '/schedule.php';
require_once __DIR__ . '/upload.php';
require_once __DIR__ . '/popups.php';
require_once __DIR__ . '/banners.php';
require_once __DIR__ . '/faqs.php';
require_once __DIR__ . '/notice_bars.php';
