<?php
// 이미지 업로드 공통 — 팝업, 이후 배너 등에서 재사용
// 파일은 uploads/{하위폴더}/ 에 랜덤 이름으로 저장하고, DB 에는 웹 루트 기준 경로를 넣는다

const UPLOAD_IMAGE_MAX   = 2 * 1024 * 1024;   // 2MB
const UPLOAD_IMAGE_TYPES = [                  // 실제 파일 내용(MIME) => 저장 확장자
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
];

// 파일 입력칸이 비어 있지 않은지 (선택 안 함 = UPLOAD_ERR_NO_FILE)
function has_upload(string $field): bool
{
    return isset($_FILES[$field]['error']) && $_FILES[$field]['error'] !== UPLOAD_ERR_NO_FILE;
}

// 업로드 파일 검증. 오류 메시지를 돌려주며 빈 문자열이면 통과
function image_upload_error(string $field): string
{
    $file = $_FILES[$field] ?? null;
    if (!is_array($file) || !is_int($file['error'] ?? null)) return '잘못된 파일입니다.';   // name="image[]" 같은 배열 업로드 차단

    return match (true) {
        in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true),
        $file['size'] > UPLOAD_IMAGE_MAX              => '이미지는 ' . (UPLOAD_IMAGE_MAX / 1024 / 1024) . 'MB 이하만 올릴 수 있습니다.',
        $file['error'] !== UPLOAD_ERR_OK,
        !is_uploaded_file($file['tmp_name'])          => '이미지 업로드에 실패했습니다. 다시 시도하세요.',
        !isset(UPLOAD_IMAGE_TYPES[uploaded_mime($file['tmp_name'])]),
        @getimagesize($file['tmp_name']) === false    => 'JPG, PNG, GIF, WEBP 이미지만 올릴 수 있습니다.',
        default                                       => '',
    };
}

// 확장자·브라우저가 보낸 타입은 믿지 않고 파일 내용으로 판별
function uploaded_mime(string $path): string
{
    return (string)(new finfo(FILEINFO_MIME_TYPE))->file($path);
}

// 검증을 통과한 파일을 저장하고 웹 경로를 돌려준다 (image_upload_error() 먼저 호출)
function save_image_upload(string $field, string $subdir): string
{
    $tmp  = $_FILES[$field]['tmp_name'];
    $dir  = __DIR__ . "/uploads/{$subdir}";
    $name = bin2hex(random_bytes(16)) . '.' . UPLOAD_IMAGE_TYPES[uploaded_mime($tmp)];

    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if (!move_uploaded_file($tmp, "{$dir}/{$name}")) {
        throw new RuntimeException("업로드 파일 저장 실패: {$dir}/{$name}");
    }
    return "uploads/{$subdir}/{$name}";
}

// 저장했던 업로드 파일 삭제. uploads/ 밖의 경로는 무시
function delete_upload(?string $path): void
{
    if ($path === null || !preg_match('#^uploads/[a-z0-9_-]+/[a-f0-9]{32}\.[a-z]+$#', $path)) return;
    $full = __DIR__ . '/' . $path;
    if (is_file($full)) unlink($full);
}
