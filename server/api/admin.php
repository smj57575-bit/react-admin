<?php
// 관리자 API — 글, 게시판, 팝업·배너·띠배너(노출 일정), FAQ. 모든 핸들러는 로그인한 관리자만 (index.php 에서 확인)
// 규칙은 기존 admin/ 화면과 같다. 검증 함수는 boards.php, posts.php, popups.php … 를 그대로 쓴다

// ---------- 글 ----------
function api_admin_posts(): void
{
    $perPage = 15;
    $page    = max(1, (int)param($_GET, 'page'));
    $q       = param($_GET, 'q');
    $board   = find_board((int)param($_GET, 'board_id'));   // null 이면 전체 게시판

    $conds  = [];
    $params = [];
    if ($board) {
        $conds[] = 'board_id = :board';
        $params[':board'] = $board['id'];
    }
    if ($q !== '') {
        $conds[] = '(title LIKE :q1 OR content LIKE :q2 OR author LIKE :q3)';
        $params[':q1'] = $params[':q2'] = $params[':q3'] = "%{$q}%";
    }
    $where = $conds ? 'WHERE ' . implode(' AND ', $conds) : '';

    $stmt = db()->prepare("SELECT COUNT(*) FROM posts {$where}");
    $stmt->execute($params);
    $total      = (int)$stmt->fetchColumn();
    $totalPages = max(1, (int)ceil($total / $perPage));
    $page       = min($page, $totalPages);

    $stmt = db()->prepare("SELECT id, board_id, title, author, password IS NULL AS by_admin, is_published, is_notice, priority, hits, created_at FROM posts {$where} ORDER BY is_notice DESC, priority DESC, id DESC LIMIT :limit OFFSET :offset");
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', ($page - 1) * $perPage, PDO::PARAM_INT);
    $stmt->execute();

    $stats = db()->query('
        SELECT COUNT(*) AS total, COALESCE(SUM(is_published = 1), 0) AS published,
               COALESCE(SUM(is_published = 0), 0) AS hidden, COALESCE(SUM(DATE(created_at) = CURDATE()), 0) AS today
        FROM posts
    ')->fetch();

    api_ok([
        'posts'      => api_rows($stmt->fetchAll(), POST_BOOLS),
        'boards'     => api_rows(all_boards(), ['is_active', 'allow_user_write']),
        'stats'      => array_map('intval', $stats),
        'total'      => $total,
        'page'       => $page,
        'totalPages' => $totalPages,
        'perPage'    => $perPage,
    ]);
}

function admin_post_or_404(int $id): array
{
    return find_post($id) ?? api_error('없는 글이에요.', 404);
}

function api_admin_post(int $id): void
{
    $post = admin_post_or_404($id);
    $post['by_admin'] = $post['password'] === null;
    api_ok(['post' => api_row($post, POST_BOOLS, ['password'])]);
}

function admin_post_form(): array
{
    $form = [
        'title'        => param($_POST, 'title'),
        'author'       => param($_POST, 'author'),
        'content'      => param($_POST, 'content'),
        'is_published' => isset($_POST['is_published']) ? 1 : 0,
        'is_notice'    => isset($_POST['is_notice']) ? 1 : 0,
        'board_id'     => (int)param($_POST, 'board_id'),
        'priority'     => param($_POST, 'priority'),
    ];
    $errors = post_errors($form);
    if (!find_board($form['board_id']))                                               $errors[] = '게시판을 선택하세요.';
    if ($form['priority'] !== '' && !is_int_in_range($form['priority'], -9999, 9999)) $errors[] = '노출 순서는 -9999 ~ 9999 사이의 정수로 입력하세요.';
    if ($errors) api_validation($errors);
    return $form;
}

function api_admin_create_post(): void
{
    $f = admin_post_form();
    db()->prepare('INSERT INTO posts (board_id, title, author, content, is_published, is_notice, priority) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$f['board_id'], $f['title'], $f['author'], $f['content'], $f['is_published'], $f['is_notice'], (int)$f['priority']]);
    api_ok(['id' => (int)db()->lastInsertId(), 'message' => '글을 등록했어요'], 201);
}

function api_admin_update_post(int $id): void
{
    admin_post_or_404($id);
    $f = admin_post_form();
    db()->prepare('UPDATE posts SET board_id = ?, title = ?, author = ?, content = ?, is_published = ?, is_notice = ?, priority = ?, updated_at = NOW() WHERE id = ?')
        ->execute([$f['board_id'], $f['title'], $f['author'], $f['content'], $f['is_published'], $f['is_notice'], (int)$f['priority'], $id]);
    api_ok(['id' => $id, 'message' => '저장했어요']);
}

function api_admin_delete_post(int $id): void
{
    admin_post_or_404($id);
    db()->prepare('DELETE FROM posts WHERE id = ?')->execute([$id]);
    api_ok(['message' => '삭제했어요']);
}

// 일괄 처리 { ids: [1,2], action: publish|unpublish|move|delete, target_board }
function api_admin_bulk_posts(): void
{
    $ids    = array_values(array_filter(array_map('intval', (array)($_POST['ids'] ?? []))));
    $action = param($_POST, 'action');
    if (!$ids) api_error('글을 선택하세요.', 422);

    $in     = implode(',', array_fill(0, count($ids), '?'));
    $target = find_board((int)param($_POST, 'target_board'));
    $n      = count($ids);

    [$sql, $params, $message] = match ($action) {
        'publish'   => ["UPDATE posts SET is_published = 1 WHERE id IN ($in)", $ids, "글 {$n}개를 공개했어요"],
        'unpublish' => ["UPDATE posts SET is_published = 0 WHERE id IN ($in)", $ids, "글 {$n}개를 비공개로 바꿨어요"],
        'move'      => $target ? ["UPDATE posts SET board_id = ? WHERE id IN ($in)", [$target['id'], ...$ids], "글 {$n}개를 ‘{$target['name']}’(으)로 옮겼어요"]
                               : api_error('옮길 게시판을 선택하세요.', 422),
        'delete'    => ["DELETE FROM posts WHERE id IN ($in)", $ids, "글 {$n}개를 삭제했어요"],
        default     => api_error('알 수 없는 작업이에요.', 422),
    };
    db()->prepare($sql)->execute($params);
    api_ok(['message' => $message]);
}

// ---------- 게시판 ----------
const BOARD_BOOLS = ['is_active', 'allow_user_write'];

function api_admin_boards(): void
{
    $counts = db()->query('SELECT board_id, COUNT(*) AS total, SUM(is_published = 1) AS published FROM posts GROUP BY board_id')->fetchAll(PDO::FETCH_UNIQUE);
    $boards = array_map(fn($b) => api_row($b, BOARD_BOOLS) + [
        'post_count'      => (int)($counts[$b['id']]['total'] ?? 0),
        'published_count' => (int)($counts[$b['id']]['published'] ?? 0),
    ], all_boards());
    api_ok(['boards' => $boards]);
}

function admin_board_or_404(int $id): array
{
    return find_board($id) ?? api_error('없는 게시판이에요.', 404);
}

function api_admin_board(int $id): void
{
    api_ok(['board' => api_row(admin_board_or_404($id), BOARD_BOOLS)]);
}

function save_board(int $id = 0): void
{
    $f = board_form_from_post();
    if ($errors = board_errors($f, $id)) api_validation($errors);
    $values = [$f['board_key'], $f['name'], $f['description'] !== '' ? $f['description'] : null, $f['allow_user_write'], $f['is_active'], (int)$f['sort_order']];
    if ($id) {
        db()->prepare('UPDATE boards SET board_key = ?, name = ?, description = ?, allow_user_write = ?, is_active = ?, sort_order = ? WHERE id = ?')->execute([...$values, $id]);
        api_ok(['id' => $id, 'message' => '저장했어요']);
    }
    db()->prepare('INSERT INTO boards (board_key, name, description, allow_user_write, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)')->execute($values);
    api_ok(['id' => (int)db()->lastInsertId(), 'message' => '게시판을 만들었어요'], 201);
}

function api_admin_create_board(): void { save_board(); }

function api_admin_update_board(int $id): void
{
    admin_board_or_404($id);
    save_board($id);
}

function api_admin_toggle_board(int $id): void
{
    admin_board_or_404($id);
    db()->prepare('UPDATE boards SET is_active = 1 - is_active WHERE id = ?')->execute([$id]);
    $board = find_board_fresh($id);
    api_ok(toggle_result($board['name'], (bool)$board['is_active']));
}

// all_boards() 는 요청 안에서 캐시되므로 바뀐 직후에는 직접 읽는다
function find_board_fresh(int $id): array
{
    $stmt = db()->prepare('SELECT * FROM boards WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch();
}

function api_admin_delete_board(int $id): void
{
    $board = admin_board_or_404($id);
    $stmt  = db()->prepare('SELECT COUNT(*) FROM posts WHERE board_id = ?');
    $stmt->execute([$id]);
    $count = (int)$stmt->fetchColumn();
    if ($count > 0) {
        api_error("「{$board['name']}」에 글이 {$count}개 남아 있어 삭제할 수 없어요. 글을 옮기거나 지운 뒤 다시 시도해 주세요.", 409);
    }
    db()->prepare('DELETE FROM boards WHERE id = ?')->execute([$id]);
    api_ok(['message' => '삭제했어요']);
}

// ---------- 노출 일정이 있는 콘텐츠: 팝업, 배너, 띠배너 ----------
// 테이블마다 다른 것(필드, 검증, 이미지)만 여기 적고, 목록·조회·저장·ON/OFF·삭제는 아래 함수가 같이 처리한다
const SCHEDULE_RESOURCES = [
    'popups' => [
        'name'    => '팝업',
        'created' => '팝업을 등록했어요',
        'fields'  => ['title', 'content'],
        'image'   => 'optional',   // 없어도 됨 (내용이나 이미지 중 하나)
        'label'   => 'title',
    ],
    'banners' => [
        'name'    => '배너',
        'created' => '배너를 등록했어요',
        'fields'  => ['title', 'subtitle', 'button_text'],
        'image'   => 'required',
        'label'   => 'title',
    ],
    'notice_bars' => [
        'name'    => '띠배너',
        'created' => '띠배너를 등록했어요',
        'fields'  => ['message', 'bg_color', 'dismissible'],
        'image'   => null,
        'label'   => 'message',
    ],
];

function schedule_resource(string $table): array
{
    return SCHEDULE_RESOURCES[$table];
}

function schedule_row_or_404(string $table, int $id): array
{
    return schedule_row($table, $id) ?? api_error('없는 ' . schedule_resource($table)['name'] . '예요.', 404);
}

function api_schedule_list(string $table): void
{
    [$rows, $counts] = rows_with_status($table);
    $extra = $table === 'notice_bars'
        ? ['palette' => array_map(fn($hex, $name) => ['hex' => $hex, 'name' => $name], array_keys(NOTICE_BAR_PALETTE), NOTICE_BAR_PALETTE), 'shownId' => current_notice_bar()['id'] ?? null]
        : [];
    api_ok(['rows' => api_rows($rows, SCHEDULE_BOOLS), 'counts' => $counts] + $extra);
}

function api_schedule_get(string $table, int $id): void
{
    api_ok(['row' => api_row(schedule_row_or_404($table, $id), SCHEDULE_BOOLS)]);
}

// 테이블별 폼 값과 검증 오류
function schedule_form_and_errors(string $table, bool $hasImage): array
{
    return match ($table) {
        'popups'      => [$f = popup_form_from_post(), popup_errors($f, $hasImage)],
        'banners'     => [$f = banner_form_from_post(), banner_errors($f, $hasImage)],
        'notice_bars' => [$f = notice_bar_form_from_post(), notice_bar_errors($f)],
    };
}

// 등록·수정 공통. 이미지는 multipart/form-data 의 image 칸, 지우기는 remove_image=1
function save_schedule(string $table, int $id = 0): void
{
    $res       = schedule_resource($table);
    $current   = $id ? schedule_row_or_404($table, $id) : null;
    $imagePath = $current['image_path'] ?? null;
    $newImage  = $res['image'] && has_upload('image');
    $remove    = $res['image'] === 'optional' && isset($_POST['remove_image']);

    $errors = [];
    if ($newImage && ($uploadError = image_upload_error('image')) !== '') $errors[] = $uploadError;
    [$form, $formErrors] = schedule_form_and_errors($table, $newImage || ($imagePath && !$remove));
    if ($errors = array_merge($errors, $formErrors)) api_validation($errors);

    // 새 이미지를 먼저 저장하고, DB 반영이 끝난 뒤 이전 이미지를 지운다
    $oldImage = $imagePath;
    if ($newImage)   $imagePath = save_image_upload('image', $table);
    elseif ($remove) $imagePath = null;

    $columns = $res['fields'];
    $values  = array_map(fn($c) => $form[$c] === '' && $c !== 'title' && $c !== 'message' ? null : $form[$c], $columns);
    if ($res['image']) {
        $columns[] = 'image_path';
        $values[]  = $imagePath;
    }
    $columns = [...$columns, 'link_url', 'link_new_tab', 'is_active', 'starts_at', 'ends_at', 'sort_order'];
    $values  = [...$values, ...schedule_values($form)];

    if ($id) {
        $set = implode(', ', array_map(fn($c) => "{$c} = ?", $columns));
        db()->prepare("UPDATE {$table} SET {$set}, updated_at = NOW() WHERE id = ?")->execute([...$values, $id]);
    } else {
        $marks = implode(', ', array_fill(0, count($columns), '?'));
        db()->prepare("INSERT INTO {$table} (" . implode(', ', $columns) . ") VALUES ({$marks})")->execute($values);
        $id = (int)db()->lastInsertId();
    }
    if ($oldImage !== $imagePath) delete_upload($oldImage);

    api_ok(['id' => $id, 'message' => $current ? '저장했어요' : $res['created']], $current ? 200 : 201);
}

function api_schedule_toggle(string $table, int $id): void
{
    schedule_row_or_404($table, $id);
    toggle_active($table, $id);
    $row = schedule_row($table, $id);
    api_ok(toggle_result($row[schedule_resource($table)['label']], (bool)$row['is_active'], $row));
}

function api_schedule_delete(string $table, int $id): void
{
    $row = schedule_row_or_404($table, $id);
    db()->prepare("DELETE FROM {$table} WHERE id = ?")->execute([$id]);
    delete_upload($row['image_path'] ?? null);
    api_ok(['message' => '삭제했어요']);
}

// ---------- FAQ ----------
function api_admin_faqs(): void
{
    $categories = faq_categories();
    $category   = param($_GET, 'category');
    $category   = isset($categories[$category]) ? $category : null;   // 없는 분류면 전체
    api_ok([
        'rows'       => api_rows(all_faqs($category), ['is_active']),
        'categories' => array_map(fn($name, $count) => ['name' => (string)$name, 'count' => (int)$count], array_keys($categories), $categories),
        'category'   => $category,
    ]);
}

function admin_faq_or_404(int $id): array
{
    return find_faq($id) ?? api_error('없는 FAQ예요.', 404);
}

function api_admin_faq(int $id): void
{
    api_ok(['row' => api_row(admin_faq_or_404($id), ['is_active'])]);
}

function save_faq(int $id = 0): void
{
    $f = faq_form_from_post();
    if ($errors = faq_errors($f)) api_validation($errors);
    $values = [$f['category'], $f['question'], $f['answer'], $f['is_active'], (int)$f['sort_order']];
    if ($id) {
        db()->prepare('UPDATE faqs SET category = ?, question = ?, answer = ?, is_active = ?, sort_order = ?, updated_at = NOW() WHERE id = ?')->execute([...$values, $id]);
        api_ok(['id' => $id, 'message' => '저장했어요']);
    }
    db()->prepare('INSERT INTO faqs (category, question, answer, is_active, sort_order) VALUES (?, ?, ?, ?, ?)')->execute($values);
    api_ok(['id' => (int)db()->lastInsertId(), 'message' => 'FAQ를 등록했어요'], 201);
}

function api_admin_create_faq(): void { save_faq(); }

function api_admin_update_faq(int $id): void
{
    admin_faq_or_404($id);
    save_faq($id);
}

function api_admin_toggle_faq(int $id): void
{
    admin_faq_or_404($id);
    db()->prepare('UPDATE faqs SET is_active = 1 - is_active, updated_at = NOW() WHERE id = ?')->execute([$id]);
    $faq = find_faq($id);
    api_ok(toggle_result($faq['question'], (bool)$faq['is_active']));
}

function api_admin_delete_faq(int $id): void
{
    admin_faq_or_404($id);
    db()->prepare('DELETE FROM faqs WHERE id = ?')->execute([$id]);
    api_ok(['message' => '삭제했어요']);
}
