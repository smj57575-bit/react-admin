<?php
// 게시글 공통 — 단건 조회, 입력 검증. 목록 쿼리는 조건이 페이지마다 달라 각 페이지에 둔다.

const POST_TITLE_MAX   = 100;
const POST_AUTHOR_MAX  = 20;
const POST_CONTENT_MAX = 20000;

function find_post(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM posts WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

// 제목·작성자·내용 검증. 오류 메시지 배열을 돌려주며 비어 있으면 통과
function post_errors(array $form): array
{
    $errors = [];
    if ($form['title'] === '')   $errors[] = '제목을 입력하세요.';
    if ($form['author'] === '')  $errors[] = '작성자를 입력하세요.';
    if ($form['content'] === '') $errors[] = '내용을 입력하세요.';
    if (mb_strlen($form['title'])   > POST_TITLE_MAX)   $errors[] = '제목은 ' . POST_TITLE_MAX . '자 이내로 입력하세요.';
    if (mb_strlen($form['author'])  > POST_AUTHOR_MAX)  $errors[] = '작성자는 ' . POST_AUTHOR_MAX . '자 이내로 입력하세요.';
    if (mb_strlen($form['content']) > POST_CONTENT_MAX) $errors[] = '내용은 ' . number_format(POST_CONTENT_MAX) . '자 이내로 입력하세요.';
    return $errors;
}

// 일반 사용자가 관리자 행세를 못 하도록 예약된 작성자명
function is_reserved_author(string $author): bool
{
    $reserved = ['관리자', 'admin', mb_strtolower(config()['admin_id'])];
    return in_array(mb_strtolower($author), $reserved, true);
}
