<?php
// 메인 배너 공통 — 조회, 입력 검증. 노출 일정(ON/OFF, 기간, 순서, 링크)은 schedule.php

const BANNER_TITLE_MAX    = 100;
const BANNER_SUBTITLE_MAX = 200;
const BANNER_BUTTON_MAX   = 30;

// 홈페이지 상단에 지금 보여줄 배너 (ON + 기간 안)
function live_banners(): array
{
    return live_rows('banners');
}

function find_banner(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM banners WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

function banner_form_from_post(): array
{
    return [
        'title'       => param($_POST, 'title'),
        'subtitle'    => param($_POST, 'subtitle'),
        'button_text' => param($_POST, 'button_text'),
    ] + schedule_form_from_post();
}

// 검증. $hasImage: 저장될 이미지가 있는지 (배너는 이미지 필수)
function banner_errors(array $form, bool $hasImage): array
{
    $errors = [];
    if ($form['title'] === '')                                $errors[] = '제목을 입력하세요.';
    if (mb_strlen($form['title']) > BANNER_TITLE_MAX)         $errors[] = '제목은 ' . BANNER_TITLE_MAX . '자 이내로 입력하세요.';
    if (mb_strlen($form['subtitle']) > BANNER_SUBTITLE_MAX)   $errors[] = '부제목은 ' . BANNER_SUBTITLE_MAX . '자 이내로 입력하세요.';
    if (mb_strlen($form['button_text']) > BANNER_BUTTON_MAX)  $errors[] = '버튼 문구는 ' . BANNER_BUTTON_MAX . '자 이내로 입력하세요.';
    if ($form['button_text'] !== '' && $form['link_url'] === '') $errors[] = '버튼 문구를 쓰려면 링크도 입력하세요.';
    if (!$hasImage)                                           $errors[] = '배너 이미지를 올려 주세요.';
    return array_merge($errors, schedule_errors($form));
}
