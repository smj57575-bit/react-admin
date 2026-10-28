// 데모 서버의 규칙 — server/ 의 PHP 파일(posts.php, boards.php, schedule.php …)을 TypeScript 로 옮긴 것
// 오류 문구·순서·글자 수 제한을 PHP 와 똑같이 맞춘다. 데모에서 통과한 입력은 실제 서버에서도 통과해야 하니까
import type { ScheduleStatus } from '../types'
import type { BoardRow, DemoDb } from './db'

/** PHP 의 $_POST — 문자열이 기본이고, 일괄 처리의 ids 처럼 배열이 올 수도 있다 */
export type Input = Record<string, unknown>

// ---------- 입력 (common.php · api/lib.php) ----------
/** param() — 문자열만 받아서 앞뒤 공백을 자른다. 배열 같은 값은 빈 문자열 */
export function param(input: Input | URLSearchParams, key: string) {
  const value = input instanceof URLSearchParams ? input.get(key) : input[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** raw_param() — 비밀번호처럼 자르지 않고 그대로 */
export function rawParam(input: Input, key: string) {
  const value = input[key]
  return typeof value === 'string' ? value : ''
}

/** isset($_POST[key]) — 체크박스 규칙: 보내면 ON */
export const isChecked = (input: Input, key: string) => input[key] !== undefined

/** PHP 의 (int) 변환 — '12abc' → 12, 'abc' → 0 */
export function toInt(value: string) {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? 0 : n
}

/** mb_strlen — 글자 수 (이모지 같은 4바이트 문자도 한 글자) */
export const charLength = (value: string) => [...value].length

/** number_format(20000) → '20,000' */
export const numberFormat = (n: number) => n.toLocaleString('en-US')

/** is_int_in_range() — FILTER_VALIDATE_INT 처럼 '007', '1.0' 은 정수로 보지 않는다 */
export function isIntInRange(value: string, min: number, max: number) {
  if (!/^[+-]?(0|[1-9]\d*)$/.test(value)) return false
  const n = Number(value)
  return n >= min && n <= max
}

/**
 * mb_strimwidth — 화면 폭 기준으로 자른다. 한글·한자 같은 전각 문자는 폭 2, 영문·숫자는 폭 1
 * 토스트 문구('‘제목…’ 노출을 껐어요')와 홈 "최근 글" 요약이 PHP 와 같은 길이로 잘린다
 */
export function strimWidth(value: string, width: number, marker: string) {
  const chars = [...value]
  const total = chars.reduce((sum, c) => sum + charWidth(c), 0)
  if (total <= width) return value

  const limit = width - [...marker].reduce((sum, c) => sum + charWidth(c), 0)
  let used = 0
  let result = ''
  for (const c of chars) {
    if (used + charWidth(c) > limit) break
    used += charWidth(c)
    result += c
  }
  return result + marker
}

function charWidth(c: string) {
  const code = c.codePointAt(0) ?? 0
  const wide =
    (code >= 0x1100 && code <= 0x115f) || (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) || (code >= 0xfe30 && code <= 0xfe4f) || (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) || code >= 0x20000
  return wide ? 2 : 1
}

// ---------- 글 (posts.php) ----------
const POST_TITLE_MAX = 100
const POST_AUTHOR_MAX = 20
const POST_CONTENT_MAX = 20000

export interface PostForm {
  title: string
  author: string
  content: string
}

export function postErrors(form: PostForm) {
  const errors: string[] = []
  if (form.title === '') errors.push('제목을 입력하세요.')
  if (form.author === '') errors.push('작성자를 입력하세요.')
  if (form.content === '') errors.push('내용을 입력하세요.')
  if (charLength(form.title) > POST_TITLE_MAX) errors.push(`제목은 ${POST_TITLE_MAX}자 이내로 입력하세요.`)
  if (charLength(form.author) > POST_AUTHOR_MAX) errors.push(`작성자는 ${POST_AUTHOR_MAX}자 이내로 입력하세요.`)
  if (charLength(form.content) > POST_CONTENT_MAX) errors.push(`내용은 ${numberFormat(POST_CONTENT_MAX)}자 이내로 입력하세요.`)
  return errors
}

export const ADMIN_ID = 'admin'

/** 방문자가 관리자 행세를 못 하도록 예약된 작성자명 */
export function isReservedAuthor(author: string) {
  return ['관리자', 'admin', ADMIN_ID.toLowerCase()].includes(author.toLowerCase())
}

// ---------- 게시판 (boards.php) ----------
const BOARD_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,29}$/
const BOARD_NAME_MAX = 50
const BOARD_DESC_MAX = 200

/** ORDER BY sort_order, id — $activeOnly: 사용자에게 보이는 것만 */
export function allBoards(db: DemoDb, activeOnly = false) {
  return db.boards.filter((b) => !activeOnly || b.is_active).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
}

export const findBoard = (db: DemoDb, id: number) => db.boards.find((b) => b.id === id) ?? null
export const findBoardByKey = (db: DemoDb, key: string) => db.boards.find((b) => b.board_key === key) ?? null

export const canViewBoard = (board: BoardRow | null, isAdmin: boolean): board is BoardRow => board !== null && (board.is_active || isAdmin)
export const canUserWrite = (board: BoardRow | null): board is BoardRow => board !== null && board.is_active && board.allow_user_write

export interface BoardForm {
  board_key: string
  name: string
  description: string
  allow_user_write: boolean
  is_active: boolean
  sort_order: string
}

export function boardFormFromInput(input: Input): BoardForm {
  return {
    board_key: param(input, 'board_key').toLowerCase(),
    name: param(input, 'name'),
    description: param(input, 'description'),
    allow_user_write: isChecked(input, 'allow_user_write'),
    is_active: isChecked(input, 'is_active'),
    sort_order: param(input, 'sort_order'),
  }
}

/** $id: 수정 중인 게시판 (식별자 중복 검사에서 자기 자신 제외) */
export function boardErrors(db: DemoDb, form: BoardForm, id = 0) {
  const errors: string[] = []
  if (!BOARD_KEY_PATTERN.test(form.board_key)) {
    errors.push('식별자는 영문 소문자·숫자·하이픈(-)으로 2~30자, 첫 글자는 영문 소문자나 숫자여야 합니다.')
  } else {
    const other = findBoardByKey(db, form.board_key)
    if (other && other.id !== id) errors.push('이미 사용 중인 식별자입니다.')
  }
  if (form.name === '') errors.push('게시판 이름을 입력하세요.')
  if (charLength(form.name) > BOARD_NAME_MAX) errors.push(`게시판 이름은 ${BOARD_NAME_MAX}자 이내로 입력하세요.`)
  if (charLength(form.description) > BOARD_DESC_MAX) errors.push(`설명은 ${BOARD_DESC_MAX}자 이내로 입력하세요.`)
  if (form.sort_order !== '' && !isIntInRange(form.sort_order, -9999, 9999)) errors.push('표시 순서는 -9999 ~ 9999 사이의 정수로 입력하세요.')
  return errors
}

// ---------- 노출 일정 (schedule.php) ----------
const LINK_URL_MAX = 500

interface ScheduleRowLike {
  id: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  sort_order: number
}

/** SCHEDULE_STATUS_SQL 과 같은 순서로 판단: OFF → 시작 전 → 기간 종료 → 노출 중 */
export function scheduleStatus(row: ScheduleRowLike, now: string): ScheduleStatus {
  if (!row.is_active) return 'off'
  if (row.starts_at !== null && row.starts_at > now) return 'scheduled'
  if (row.ends_at !== null && row.ends_at <= now) return 'ended'
  return 'live'
}

/** ORDER BY sort_order, id DESC */
export const scheduleOrder = (a: ScheduleRowLike, b: ScheduleRowLike) => a.sort_order - b.sort_order || b.id - a.id

/** live_rows() — 지금 노출 중인 행 (홈페이지 출력용) */
export function liveRows<T extends ScheduleRowLike>(rows: T[], now: string) {
  return rows.filter((r) => scheduleStatus(r, now) === 'live').sort(scheduleOrder)
}

export interface ScheduleForm {
  link_url: string
  link_new_tab: boolean
  is_active: boolean
  starts_at: string
  ends_at: string
  sort_order: string
}

export function scheduleFormFromInput(input: Input): ScheduleForm {
  return {
    link_url: param(input, 'link_url'),
    link_new_tab: isChecked(input, 'link_new_tab'),
    is_active: isChecked(input, 'is_active'),
    starts_at: param(input, 'starts_at'),
    ends_at: param(input, 'ends_at'),
    sort_order: param(input, 'sort_order'),
  }
}

export function scheduleErrors(form: ScheduleForm) {
  const errors: string[] = []
  if (form.link_url !== '') {
    if (!isHttpUrl(form.link_url)) errors.push('링크는 http:// 또는 https:// 로 시작하는 주소만 입력할 수 있습니다.')
    if (charLength(form.link_url) > LINK_URL_MAX) errors.push(`링크는 ${LINK_URL_MAX}자 이내로 입력하세요.`)
  }
  const start = inputToDateTime(form.starts_at)
  const end = inputToDateTime(form.ends_at)
  if (form.starts_at !== '' && start === null) errors.push('노출 시작일 형식이 올바르지 않습니다.')
  if (form.ends_at !== '' && end === null) errors.push('노출 종료일 형식이 올바르지 않습니다.')
  if (start && end && start >= end) errors.push('노출 종료일은 시작일보다 뒤여야 합니다.')
  if (form.sort_order !== '' && !isIntInRange(form.sort_order, -9999, 9999)) errors.push('표시 순서는 -9999 ~ 9999 사이의 정수로 입력하세요.')
  return errors
}

/** schedule_values() — 저장할 일정 값 */
export function scheduleValues(form: ScheduleForm) {
  return {
    link_url: form.link_url !== '' ? form.link_url : null,
    link_new_tab: form.link_new_tab,
    is_active: form.is_active,
    starts_at: inputToDateTime(form.starts_at),
    ends_at: inputToDateTime(form.ends_at),
    sort_order: toInt(form.sort_order),
  }
}

/** javascript:, data: 같은 스킴을 막기 위해 http(s) 만 허용 */
function isHttpUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return false
  try {
    return new URL(url).hostname !== ''
  } catch {
    return false
  }
}

/** <input type="datetime-local"> 값('2026-10-12T09:00') → DATETIME('2026-10-12 09:00:00'). 없는 날짜(2월 30일)는 null */
export function inputToDateTime(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const date = new Date(y, mo - 1, d, h, mi)
  const same = date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d && date.getHours() === h && date.getMinutes() === mi
  return same ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:00` : null
}

// ---------- ON/OFF 결과 안내 (common.php 의 toggle_result) ----------
export function toggleResult(name: string, active: boolean, schedule?: { status: ScheduleStatus; starts_at: string | null }) {
  const label = '‘' + strimWidth(name, 40, '…') + '’'
  const status: ScheduleStatus = schedule?.status ?? (active ? 'live' : 'off')
  const messages: Record<ScheduleStatus, string> = {
    off: `${label} 노출을 껐어요`,
    scheduled: `${label} 노출을 켰어요. ${formatStart(schedule?.starts_at ?? null)}부터 홈에 보여요`,
    ended: `${label} 노출을 켰지만 기간이 끝나서 홈에는 안 보여요. 종료일을 바꿔 주세요`,
    live: `${label} 노출을 켰어요`,
  }
  return { active, status, message: messages[status], type: status === 'ended' ? ('warning' as const) : ('success' as const) }
}

/** date('n월 j일 H:i') — '2026-11-03 09:00:00' → '11월 3일 09:00' */
function formatStart(value: string | null) {
  if (!value) return ''
  const [, mo, d, hm] = /^\d{4}-(\d{2})-(\d{2}) (\d{2}:\d{2})/.exec(value) ?? []
  return `${Number(mo)}월 ${Number(d)}일 ${hm}`
}

// ---------- 팝업·배너 (popups.php, banners.php) ----------
const POPUP_TITLE_MAX = 100
const POPUP_CONTENT_MAX = 2000
const BANNER_TITLE_MAX = 100
const BANNER_SUBTITLE_MAX = 200
const BANNER_BUTTON_MAX = 30

export function popupErrors(form: ScheduleForm & { title: string; content: string }, hasImage: boolean) {
  const errors: string[] = []
  if (form.title === '') errors.push('제목을 입력하세요.')
  if (charLength(form.title) > POPUP_TITLE_MAX) errors.push(`제목은 ${POPUP_TITLE_MAX}자 이내로 입력하세요.`)
  if (charLength(form.content) > POPUP_CONTENT_MAX) errors.push(`내용은 ${numberFormat(POPUP_CONTENT_MAX)}자 이내로 입력하세요.`)
  if (form.content === '' && !hasImage) errors.push('내용이나 이미지 중 하나는 있어야 합니다.')
  return [...errors, ...scheduleErrors(form)]
}

export function bannerErrors(form: ScheduleForm & { title: string; subtitle: string; button_text: string }, hasImage: boolean) {
  const errors: string[] = []
  if (form.title === '') errors.push('제목을 입력하세요.')
  if (charLength(form.title) > BANNER_TITLE_MAX) errors.push(`제목은 ${BANNER_TITLE_MAX}자 이내로 입력하세요.`)
  if (charLength(form.subtitle) > BANNER_SUBTITLE_MAX) errors.push(`부제목은 ${BANNER_SUBTITLE_MAX}자 이내로 입력하세요.`)
  if (charLength(form.button_text) > BANNER_BUTTON_MAX) errors.push(`버튼 문구는 ${BANNER_BUTTON_MAX}자 이내로 입력하세요.`)
  if (form.button_text !== '' && form.link_url === '') errors.push('버튼 문구를 쓰려면 링크도 입력하세요.')
  if (!hasImage) errors.push('배너 이미지를 올려 주세요.')
  return [...errors, ...scheduleErrors(form)]
}

// ---------- 띠배너 (notice_bars.php) ----------
const NOTICE_BAR_MESSAGE_MAX = 120
export const NOTICE_BAR_DEFAULT_COLOR = '#1E1B2E'

export const NOTICE_BAR_PALETTE: Record<string, string> = {
  '#1E1B2E': '잉크',
  '#6D5AE6': '보라',
  '#3182F6': '블루',
  '#0CA678': '그린',
  '#F76707': '오렌지',
  '#E03131': '레드',
  '#FFE8A3': '버터',
  '#EDE9FE': '라벤더',
  '#F0EEE9': '클라우드 댄서',
}

export function noticeBarErrors(form: ScheduleForm & { message: string; bg_color: string }) {
  const errors: string[] = []
  if (form.message === '') errors.push('문구를 입력하세요.')
  if (charLength(form.message) > NOTICE_BAR_MESSAGE_MAX) errors.push(`문구는 ${NOTICE_BAR_MESSAGE_MAX}자 이내로 입력하세요. 한 줄로 읽혀야 해요.`)
  if (!isHexColor(form.bg_color)) errors.push('배경색을 고르세요. (#RRGGBB 형식)')
  return [...errors, ...scheduleErrors(form)]
}

export const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value)

// 색 대비 (WCAG) — 배경에 대해 흰 글자와 진한 글자 중 더 잘 읽히는 쪽
const LIGHT_TEXT = '#FFFFFF'
const DARK_TEXT = '#1E1B2E'

function relativeLuminance(hex: string) {
  const channel = (h: string) => {
    const c = parseInt(h, 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(hex.slice(1, 3)) + 0.7152 * channel(hex.slice(3, 5)) + 0.0722 * channel(hex.slice(5, 7))
}

function contrastRatio(a: string, b: string) {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function noticeBarTextColor(bg: string) {
  return contrastRatio(bg, LIGHT_TEXT) >= contrastRatio(bg, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT
}

// ---------- FAQ (faqs.php) ----------
const FAQ_CATEGORY_MAX = 30
const FAQ_QUESTION_MAX = 200
const FAQ_ANSWER_MAX = 5000

export interface FaqForm {
  category: string
  question: string
  answer: string
  is_active: boolean
  sort_order: string
}

export function faqFormFromInput(input: Input): FaqForm {
  return {
    category: param(input, 'category'),
    question: param(input, 'question'),
    answer: param(input, 'answer'),
    is_active: isChecked(input, 'is_active'),
    sort_order: param(input, 'sort_order'),
  }
}

export function faqErrors(form: FaqForm) {
  const errors: string[] = []
  if (form.category === '') errors.push('분류를 입력하세요.')
  if (charLength(form.category) > FAQ_CATEGORY_MAX) errors.push(`분류는 ${FAQ_CATEGORY_MAX}자 이내로 입력하세요.`)
  if (form.question === '') errors.push('질문을 입력하세요.')
  if (charLength(form.question) > FAQ_QUESTION_MAX) errors.push(`질문은 ${FAQ_QUESTION_MAX}자 이내로 입력하세요.`)
  if (form.answer === '') errors.push('답변을 입력하세요.')
  if (charLength(form.answer) > FAQ_ANSWER_MAX) errors.push(`답변은 ${numberFormat(FAQ_ANSWER_MAX)}자 이내로 입력하세요.`)
  if (form.sort_order !== '' && !isIntInRange(form.sort_order, -9999, 9999)) errors.push('표시 순서는 -9999 ~ 9999 사이의 정수로 입력하세요.')
  return errors
}

/** ORDER BY category — MySQL 정렬처럼 문자열 순 */
export const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// ---------- 이미지 업로드 (upload.php) ----------
const UPLOAD_IMAGE_MAX = 2 * 1024 * 1024
const UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * 데모에는 파일 내용을 들여다볼 서버가 없어서 브라우저가 알려 준 File.type 과 크기로 검사한다
 * (실제 서버는 확장자·브라우저 정보를 믿지 않고 파일 내용으로 판별한다 — upload.php)
 */
export function imageUploadError(file: File) {
  if (file.size > UPLOAD_IMAGE_MAX) return `이미지는 ${UPLOAD_IMAGE_MAX / 1024 / 1024}MB 이하만 올릴 수 있습니다.`
  if (!UPLOAD_IMAGE_TYPES.includes(file.type)) return 'JPG, PNG, GIF, WEBP 이미지만 올릴 수 있습니다.'
  return ''
}
