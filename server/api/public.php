<?php
// 사용자 화면용 API — 세션·로그인, 홈, 게시판, 글 (방문자 글은 글 비밀번호로 수정·삭제)
// 규칙은 기존 PHP 화면(index.php, list.php, view.php, write.php, delete.php)과 같다

const POST_BOOLS = ['is_published', 'is_notice', 'by_admin'];

// 지금 로그인 상태와 CSRF 토큰. React 앱이 처음 뜰 때 한 번 부른다
function api_session(): void
{
    api_ok(['admin' => is_admin(), 'adminName' => $_SESSION['admin'] ?? null, 'csrf' => csrf_token(), 'defaultPassword' => is_admin() && config()['is_default_password']]);
}

function api_login(): void
{
    $config      = config();
    $id          = param($_POST, 'id');
    $throttleKey = throttle_key('admin');

    if (is_throttled($throttleKey)) api_error('로그인 시도 횟수를 초과했어요. 15분 후 다시 시도해 주세요.', 429);
    if ($id !== $config['admin_id'] || !password_verify(raw_param('password'), $config['admin_password_hash'])) {
        record_failure($throttleKey);
        api_error('아이디 또는 비밀번호가 올바르지 않아요.', 401);
    }
    clear_failures($throttleKey);
    session_regenerate_id(true);   // 세션 고정 공격 방지
    $_SESSION['admin'] = $id;
    api_ok(['admin' => true, 'adminName' => $id, 'csrf' => csrf_token(), 'defaultPassword' => $config['is_default_password']]);
}

function api_logout(): void
{
    $_SESSION = [];
    session_regenerate_id(true);
    api_ok(['admin' => false, 'csrf' => csrf_token()]);
}

// ---------- 홈 ----------
function api_home(): void
{
    $popups  = live_popups();
    $banners = live_banners();
    $boards  = all_boards(true);

    $news = db()->query('
        SELECT p.id, p.title, p.content, p.is_notice, p.created_at, b.name AS board_name
        FROM posts p JOIN boards b ON b.id = p.board_id
        WHERE p.is_published = 1 AND b.is_active = 1
        ORDER BY p.is_notice DESC, p.id DESC
        LIMIT 4
    ')->fetchAll();
    $publicPosts = (int)db()->query('SELECT COUNT(*) FROM posts p JOIN boards b ON b.id = p.board_id WHERE p.is_published = 1 AND b.is_active = 1')->fetchColumn();

    $faqs = [];
    foreach (live_faqs() as $category => $items) $faqs[] = ['category' => $category, 'items' => $items];

    api_ok([
        'banners' => api_rows($banners, SCHEDULE_BOOLS),
        'popups'  => api_rows($popups, SCHEDULE_BOOLS),
        'faqs'    => $faqs,
        'news'    => array_map(fn($p) => api_row($p, ['is_notice']) + ['excerpt' => mb_strimwidth(preg_replace('/\s+/', ' ', $p['content']), 0, 120, '…')], $news),
        'numbers' => [
            ['value' => count($popups),  'label' => '노출 중인 팝업'],
            ['value' => count($banners), 'label' => '노출 중인 배너'],
            ['value' => count($boards),  'label' => '열린 게시판'],
            ['value' => $publicPosts,    'label' => '공개된 글'],
        ],
    ]);
}

// 모든 사용자 화면 공통 — 맨 위 띠배너와 메뉴의 게시판 목록
function api_layout(): void
{
    $bar = current_notice_bar();
    if ($bar) {
        $bg  = is_hex_color($bar['bg_color']) ? $bar['bg_color'] : NOTICE_BAR_DEFAULT_COLOR;
        $bar = api_row($bar, SCHEDULE_BOOLS) + [
            'fg'  => notice_bar_text_color($bg),
            'key' => $bar['id'] . '-' . preg_replace('/\D/', '', $bar['updated_at'] ?? $bar['created_at']),   // 수정하면 "오늘 하루 닫기"가 풀린다
        ];
        $bar['bg_color'] = $bg;
    }
    api_ok(['noticeBar' => $bar, 'boards' => array_map('public_board', all_boards(true))]);
}

function public_board(array $b): array
{
    return [
        'id'          => $b['id'],
        'board_key'   => $b['board_key'],
        'name'        => $b['name'],
        'description' => $b['description'],
        'can_write'   => can_user_write($b),
    ];
}

// ---------- 게시판 ----------
function api_board_posts(string $key): void
{
    $board = find_board_by_key($key);
    if (!can_view_board($board)) api_error('존재하지 않는 게시판이에요.', 404);

    $perPage = 10;
    $page    = max(1, (int)param($_GET, 'page'));
    $q       = param($_GET, 'q');

    $where  = 'WHERE board_id = :board AND is_published = 1';
    $params = [':board' => $board['id']];
    if ($q !== '') {
        // MySQL 네이티브 prepare 는 같은 이름의 플레이스홀더를 재사용할 수 없어 3개로 나눈다
        $where .= ' AND (title LIKE :q1 OR content LIKE :q2 OR author LIKE :q3)';
        $params[':q1'] = $params[':q2'] = $params[':q3'] = "%{$q}%";
    }

    $stmt = db()->prepare("SELECT COUNT(*) FROM posts {$where}");
    $stmt->execute($params);
    $total      = (int)$stmt->fetchColumn();
    $totalPages = max(1, (int)ceil($total / $perPage));
    $page       = min($page, $totalPages);

    $stmt = db()->prepare("SELECT id, title, author, password IS NULL AS by_admin, is_notice, hits, created_at FROM posts {$where} ORDER BY is_notice DESC, priority DESC, id DESC LIMIT :limit OFFSET :offset");
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', ($page - 1) * $perPage, PDO::PARAM_INT);
    $stmt->execute();

    api_ok([
        'board'      => public_board($board),
        'posts'      => api_rows($stmt->fetchAll(), POST_BOOLS),
        'total'      => $total,
        'page'       => $page,
        'totalPages' => $totalPages,
        'perPage'    => $perPage,
    ]);
}

// ---------- 글 ----------
// 사용자가 볼 수 있는 글과 그 게시판. 없거나 숨겨진 글이면 404 로 끝낸다
function viewable_post(int $id): array
{
    $post  = find_post($id);
    $board = $post ? find_board((int)$post['board_id']) : null;
    if (!$post || !can_view_board($board) || (!$post['is_published'] && !is_admin())) {
        api_error('존재하지 않는 글이에요.', 404);
    }
    return [$post, $board];
}

// 방문자 글이고 그 게시판이 방문자 글쓰기를 허용할 때만 비밀번호로 수정·삭제할 수 있다
function user_editable(array $post, array $board): bool
{
    return $post['password'] !== null && $post['is_published'] && can_user_write($board);
}

function api_post(int $id): void
{
    [$post, $board] = viewable_post($id);
    if (!is_admin()) {   // 관리자가 볼 때는 조회수를 올리지 않는다
        db()->prepare('UPDATE posts SET hits = hits + 1 WHERE id = ?')->execute([$id]);
        $post['hits']++;
    }
    $post['by_admin'] = $post['password'] === null;
    api_ok([
        'post'     => api_row($post, POST_BOOLS, ['password']),
        'board'    => public_board($board),
        'editable' => user_editable($post, $board),
    ]);
}

function user_post_form(): array
{
    $form = ['title' => param($_POST, 'title'), 'author' => param($_POST, 'author'), 'content' => param($_POST, 'content')];
    $errors = post_errors($form);
    if (raw_param('password') === '')        $errors[] = '비밀번호를 입력하세요.';
    if (is_reserved_author($form['author'])) $errors[] = '사용할 수 없는 작성자명입니다.';
    if ($errors) api_validation($errors);
    return $form;
}

function api_create_post(string $key): void
{
    $board = find_board_by_key($key);
    if (!can_user_write($board)) api_error('이 게시판에는 글을 쓸 수 없어요.', 403);
    $form = user_post_form();

    db()->prepare('INSERT INTO posts (board_id, title, author, content, password) VALUES (?, ?, ?, ?, ?)')
        ->execute([$board['id'], $form['title'], $form['author'], $form['content'], password_hash(raw_param('password'), PASSWORD_DEFAULT)]);
    api_ok(['id' => (int)db()->lastInsertId(), 'message' => '글을 등록했어요'], 201);
}

// 글 비밀번호 확인 (15분에 5회까지)
function check_post_password(array $post): void
{
    $throttleKey = throttle_key("post:{$post['id']}");
    if (is_throttled($throttleKey)) api_error('비밀번호 시도 횟수를 초과했어요. 15분 후 다시 시도해 주세요.', 429);
    if (!password_verify(raw_param('password'), $post['password'])) {
        record_failure($throttleKey);
        api_error('비밀번호가 일치하지 않아요.', 403);
    }
    clear_failures($throttleKey);
}

function api_update_post(int $id): void
{
    [$post, $board] = viewable_post($id);
    if (!user_editable($post, $board)) api_error('이 글은 수정할 수 없어요.', 403);
    $form = user_post_form();
    check_post_password($post);

    db()->prepare('UPDATE posts SET title = ?, author = ?, content = ?, updated_at = NOW() WHERE id = ?')
        ->execute([$form['title'], $form['author'], $form['content'], $id]);
    api_ok(['id' => $id, 'message' => '저장했어요']);
}

function api_delete_post(int $id): void
{
    [$post, $board] = viewable_post($id);
    if (!user_editable($post, $board)) api_error('이 글은 삭제할 수 없어요.', 403);
    check_post_password($post);

    db()->prepare('DELETE FROM posts WHERE id = ?')->execute([$id]);
    api_ok(['board_key' => $board['board_key'], 'message' => '삭제했어요']);
}
