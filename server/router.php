<?php
// 개발 서버 라우터 — 공개해도 되는 경로만 통과시키고 나머지는 404
//   실행: php -S localhost:8150 -t server server/router.php   (php_test 폴더에서)
// 열어 두는 것: JSON API(/api/...)와 업로드된 이미지뿐. 화면은 React 앱(web/)이 그린다
// 막는 것: 숨김 폴더(.omc 등), 설정·공통 PHP 파일, SQL·마이그레이션, 업로드 폴더의 이미지 외 파일
// Apache 로 배포할 때는 .htaccess 가 같은 역할을 한다

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');

// JSON API — 모든 /api/... 요청은 api/index.php 가 받는다
if (preg_match('#^/api(/|$)#', $path)) {
    require __DIR__ . '/api/index.php';
    return true;
}

// upload.php 가 저장한 이미지만
if (preg_match('#^/uploads/(popups|banners)/[a-f0-9]{32}\.(jpg|png|gif|webp)$#', $path)) {
    return false;   // 내장 서버가 파일을 그대로 보낸다
}

http_response_code(404);
header('Content-Type: text/plain; charset=UTF-8');
echo $path === '/' ? "API 서버예요. 화면은 React 앱(http://localhost:5173)에서 보세요.\n" : "Not Found\n";
