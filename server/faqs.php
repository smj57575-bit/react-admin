<?php
// FAQ(자주 묻는 질문) 공통 — 조회(홈 출력용 / 관리자용), 입력 검증
// 테이블: faqs (migrations/2026-10-26_faqs.sql)

const FAQ_CATEGORY_MAX = 30;
const FAQ_QUESTION_MAX = 200;
const FAQ_ANSWER_MAX   = 5000;

// 홈페이지에 보여줄 FAQ — 노출 중인 것만, 분류별로 묶어서 ['일반' => [행, 행], '이용 방법' => [...]]
function live_faqs(): array
{
    $rows = db()->query('SELECT id, category, question, answer FROM faqs WHERE is_active = 1 ORDER BY category, sort_order, id')->fetchAll();

    $grouped = [];
    foreach ($rows as $row) $grouped[$row['category']][] = $row;
    return $grouped;
}

// 관리자 목록 — $category 를 주면 그 분류만
function all_faqs(?string $category = null): array
{
    if ($category === null) {
        return db()->query('SELECT * FROM faqs ORDER BY category, sort_order, id')->fetchAll();
    }
    $stmt = db()->prepare('SELECT * FROM faqs WHERE category = ? ORDER BY sort_order, id');
    $stmt->execute([$category]);
    return $stmt->fetchAll();
}

// 지금 쓰이는 분류 이름과 개수 ['일반' => 2, ...] — 관리자 탭, 입력칸 자동완성용
function faq_categories(): array
{
    return db()->query('SELECT category, COUNT(*) FROM faqs GROUP BY category ORDER BY category')->fetchAll(PDO::FETCH_KEY_PAIR);
}

function find_faq(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM faqs WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function faq_form_from_post(): array
{
    return [
        'category'   => param($_POST, 'category'),
        'question'   => param($_POST, 'question'),
        'answer'     => param($_POST, 'answer'),
        'is_active'  => isset($_POST['is_active']) ? 1 : 0,
        'sort_order' => param($_POST, 'sort_order'),
    ];
}

// 검증. 오류 메시지 배열을 돌려주며 비어 있으면 통과
function faq_errors(array $form): array
{
    $errors = [];
    if ($form['category'] === '')                           $errors[] = '분류를 입력하세요.';
    if (mb_strlen($form['category']) > FAQ_CATEGORY_MAX)    $errors[] = '분류는 ' . FAQ_CATEGORY_MAX . '자 이내로 입력하세요.';
    if ($form['question'] === '')                           $errors[] = '질문을 입력하세요.';
    if (mb_strlen($form['question']) > FAQ_QUESTION_MAX)    $errors[] = '질문은 ' . FAQ_QUESTION_MAX . '자 이내로 입력하세요.';
    if ($form['answer'] === '')                             $errors[] = '답변을 입력하세요.';
    if (mb_strlen($form['answer']) > FAQ_ANSWER_MAX)        $errors[] = '답변은 ' . number_format(FAQ_ANSWER_MAX) . '자 이내로 입력하세요.';
    if ($form['sort_order'] !== '' && !is_int_in_range($form['sort_order'], -9999, 9999)) {
        $errors[] = '표시 순서는 -9999 ~ 9999 사이의 정수로 입력하세요.';
    }
    return $errors;
}
