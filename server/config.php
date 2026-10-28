<?php
// 설정 — 환경변수가 있으면 우선, 없으면 로컬 개발용 기본값
// 관리자 비밀번호 해시 생성: php -r "echo password_hash('원하는비밀번호', PASSWORD_DEFAULT);"

$defaultHash = '$2y$12$EhX5Qub6g4wHom4dkzyzvOaueNV5MaZqTaTZE.amd4LjTDXwjmOxu';   // admin1234 (로컬 개발용)
$hash        = getenv('BOARD_ADMIN_HASH') ?: $defaultHash;

// DB 비밀번호: 환경변수 > 웹 루트 밖의 파일 > 빈 값
$passwordFile = dirname(__DIR__, 2) . '/php_test_data/.mysql_board_password';
$dbPassword   = getenv('BOARD_DB_PASS');
if ($dbPassword === false || $dbPassword === '') {
    $dbPassword = is_readable($passwordFile) ? trim(file_get_contents($passwordFile)) : '';
}

return [
    'admin_id'            => getenv('BOARD_ADMIN_ID') ?: 'admin',
    'admin_password_hash' => $hash,
    'is_default_password' => $hash === $defaultHash,   // true 면 관리자 화면에 경고 표시

    // MySQL 접속 정보. 스키마는 schema.sql 참고
    'db' => [
        'host' => getenv('BOARD_DB_HOST') ?: '127.0.0.1',
        'name' => getenv('BOARD_DB_NAME') ?: 'board',
        'user' => getenv('BOARD_DB_USER') ?: 'board',
        'pass' => $dbPassword,
    ],
];
