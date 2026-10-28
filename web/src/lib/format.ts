// 날짜·숫자 표시 도우미 — API 는 MySQL DATETIME 문자열('2026-10-28 15:02:07')을 준다

/** '2026-10-28 15:02:07' → '2026-10-28 15:02' */
export const formatDateTime = (value: string | null) => (value ? value.slice(0, 16) : '')

/** '2026-10-28 15:02:07' → '2026-10-28' */
export const formatDate = (value: string | null) => (value ? value.slice(0, 10) : '')

/** DB 값 → <input type="datetime-local"> 값 ('2026-10-28T15:02') */
export const toDateTimeInput = (value: string | null) => (value ? value.slice(0, 16).replace(' ', 'T') : '')

/** 노출 기간 문구 (관리자 목록) */
export function schedulePeriod(row: { starts_at: string | null; ends_at: string | null }) {
  if (!row.starts_at && !row.ends_at) return '상시'
  return `${formatDateTime(row.starts_at)} ~ ${formatDateTime(row.ends_at)}`
}

/** 업로드 이미지 경로 'uploads/popups/ab.png' → '/uploads/popups/ab.png' */
export const uploadUrl = (path: string) => '/' + path
