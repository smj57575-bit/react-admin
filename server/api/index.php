<?php
// JSON API 진입점 — /api/... 요청은 모두 여기로 온다 (router.php, .htaccess)
// 경로표를 보면 어떤 주소가 어떤 함수로 가는지 한눈에 보인다. 관리자 경로(/api/admin/...)는 로그인 확인 후에만 연결
require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/public.php';
require_once __DIR__ . '/admin.php';

$method = $_SERVER['REQUEST_METHOD'];
$path   = '/' . trim(substr(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), strlen('/api')), '/');

$public = [
    ['GET',    '/session',                 'api_session'],
    ['POST',   '/login',                   'api_login'],
    ['POST',   '/logout',                  'api_logout'],
    ['GET',    '/layout',                  'api_layout'],
    ['GET',    '/home',                    'api_home'],
    ['GET',    '/boards/{key}/posts',      'api_board_posts'],
    ['POST',   '/boards/{key}/posts',      'api_create_post'],
    ['GET',    '/posts/{id}',              'api_post'],
    ['PUT',    '/posts/{id}',              'api_update_post'],
    ['DELETE', '/posts/{id}',              'api_delete_post'],
];

// 팝업·배너·띠배너는 같은 모양의 경로 6개씩 (주소의 이름 → 테이블)
$schedule = [];
foreach (['popups' => 'popups', 'banners' => 'banners', 'notice-bars' => 'notice_bars'] as $slug => $table) {
    $schedule[] = ['GET',    "/admin/{$slug}",             fn()        => api_schedule_list($table)];
    $schedule[] = ['POST',   "/admin/{$slug}",             fn()        => save_schedule($table)];
    $schedule[] = ['GET',    "/admin/{$slug}/{id}",        fn(int $id) => api_schedule_get($table, $id)];
    $schedule[] = ['POST',   "/admin/{$slug}/{id}",        fn(int $id) => save_schedule($table, $id)];   // 이미지 업로드(multipart) 때문에 PUT 대신 POST
    $schedule[] = ['PATCH',  "/admin/{$slug}/{id}/toggle", fn(int $id) => api_schedule_toggle($table, $id)];
    $schedule[] = ['DELETE', "/admin/{$slug}/{id}",        fn(int $id) => api_schedule_delete($table, $id)];
}

$admin = [
    ['GET',    '/admin/posts',             'api_admin_posts'],
    ['POST',   '/admin/posts',             'api_admin_create_post'],
    ['POST',   '/admin/posts/bulk',        'api_admin_bulk_posts'],
    ['GET',    '/admin/posts/{id}',        'api_admin_post'],
    ['PUT',    '/admin/posts/{id}',        'api_admin_update_post'],
    ['DELETE', '/admin/posts/{id}',        'api_admin_delete_post'],
    ['GET',    '/admin/boards',            'api_admin_boards'],
    ['POST',   '/admin/boards',            'api_admin_create_board'],
    ['GET',    '/admin/boards/{id}',       'api_admin_board'],
    ['PUT',    '/admin/boards/{id}',       'api_admin_update_board'],
    ['PATCH',  '/admin/boards/{id}/toggle','api_admin_toggle_board'],
    ['DELETE', '/admin/boards/{id}',       'api_admin_delete_board'],
    ...$schedule,
    ['GET',    '/admin/faqs',              'api_admin_faqs'],
    ['POST',   '/admin/faqs',              'api_admin_create_faq'],
    ['GET',    '/admin/faqs/{id}',         'api_admin_faq'],
    ['PUT',    '/admin/faqs/{id}',         'api_admin_update_faq'],
    ['PATCH',  '/admin/faqs/{id}/toggle',  'api_admin_toggle_faq'],
    ['DELETE', '/admin/faqs/{id}',         'api_admin_delete_faq'],
];

// 권한은 화면이 아니라 서버에서 막는다: 관리자 경로는 로그인 안 했으면 401
if (str_starts_with($path, '/admin')) {
    api_require_admin();
    api_dispatch($admin, $method, $path);
}
api_dispatch($public, $method, $path);
