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

/**
 * 앱 안의 주소 — 라우터를 거치지 않는 <a href>, <img src> 용. 앱이 하위 경로에 있으면 그 경로를 앞에 붙인다
 * appUrl('#faq') → '/#faq' (보통) / '/react-admin/#faq' (GitHub Pages)
 */
export const appUrl = (path = '') => import.meta.env.BASE_URL + path.replace(/^\//, '')

/**
 * 업로드 이미지 경로 'uploads/popups/ab.png' → '/uploads/popups/ab.png'
 * 데모 모드의 data: 주소(브라우저에 저장한 이미지)와 http(s) 주소는 그대로 둔다
 */
export const uploadUrl = (path: string) => (/^(data:|https?:\/\/)/i.test(path) ? path : appUrl(path))
