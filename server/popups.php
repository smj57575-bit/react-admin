<?php
// 팝업 공통 — 조회, 입력 검증. 노출 일정(ON/OFF, 기간, 순서, 링크)은 schedule.php

const POPUP_TITLE_MAX   = 100;
const POPUP_CONTENT_MAX = 2000;

// 홈페이지에 지금 띄울 팝업 (ON + 기간 안)
function live_popups(): array
{
    return live_rows('popups');
}

function find_popup(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM popups WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function popup_form_from_post(): array
{
    return ['title' => param($_POST, 'title'), 'content' => param($_POST, 'content')] + schedule_form_from_post();
}

// 검증. 오류 메시지 배열을 돌려주며 비어 있으면 통과. $hasImage: 저장될 이미지가 있는지
function popup_errors(array $form, bool $hasImage): array
{
    $errors = [];
    if ($form['title'] === '')                           $errors[] = '제목을 입력하세요.';
    if (mb_strlen($form['title']) > POPUP_TITLE_MAX)     $errors[] = '제목은 ' . POPUP_TITLE_MAX . '자 이내로 입력하세요.';
    if (mb_strlen($form['content']) > POPUP_CONTENT_MAX) $errors[] = '내용은 ' . number_format(POPUP_CONTENT_MAX) . '자 이내로 입력하세요.';
    if ($form['content'] === '' && !$hasImage)           $errors[] = '내용이나 이미지 중 하나는 있어야 합니다.';
    return array_merge($errors, schedule_errors($form));
}
