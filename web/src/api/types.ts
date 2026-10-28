// API 응답 타입 — PHP API(server/api/)가 돌려주는 JSON 모양을 그대로 적는다
// 날짜는 MySQL DATETIME 문자열 ('2026-10-28 15:02:07'), 0/1 컬럼은 API 에서 boolean 으로 바꿔서 온다

/** 모든 성공 응답에 붙는 공통 필드 */
export interface ApiOk {
  ok: true
}

/** 등록·수정·삭제 결과 (message 는 토스트로 보여준다) */
export interface MutationResult extends ApiOk {
  id?: number
  message: string
}

// ---------- 세션 ----------
export interface Session extends ApiOk {
  admin: boolean
  adminName: string | null
  csrf: string
  defaultPassword?: boolean
}

// ---------- 게시판·글 ----------
export interface Board {
  id: number
  board_key: string
  name: string
  description: string | null
  can_write: boolean
}

/** 목록에 나오는 글 (본문 없음) */
export interface PostSummary {
  id: number
  title: string
  author: string
  by_admin: boolean
  is_notice: boolean
  hits: number
  created_at: string
}

export interface Post extends PostSummary {
  board_id: number
  content: string
  is_published: boolean
  priority: number
  updated_at: string | null
}

export interface Paged {
  total: number
  page: number
  totalPages: number
  perPage: number
}

export interface BoardPostsResponse extends ApiOk, Paged {
  board: Board
  posts: PostSummary[]
}

export interface PostResponse extends ApiOk {
  post: Post
  board: Board
  /** 방문자 글이라 비밀번호로 수정·삭제할 수 있는지 */
  editable: boolean
}

/** 방문자 글쓰기·수정 폼 */
export interface UserPostInput {
  title: string
  author: string
  content: string
  password: string
}

// ---------- 노출 일정 (팝업·배너·띠배너 공통) ----------
export type ScheduleStatus = 'live' | 'scheduled' | 'ended' | 'off'

export interface Schedule {
  id: number
  link_url: string | null
  link_new_tab: boolean
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  sort_order: number
  created_at: string
  updated_at: string | null
  /** 관리자 목록에서만 온다 */
  status?: ScheduleStatus
}

export interface Popup extends Schedule {
  title: string
  content: string | null
  image_path: string | null
}

export interface Banner extends Schedule {
  title: string
  subtitle: string | null
  button_text: string | null
  image_path: string
}

export interface NoticeBar extends Schedule {
  message: string
  bg_color: string
  dismissible: boolean
}

/** 사용자 화면 맨 위 띠배너 — 글자색(fg)과 "오늘 하루 닫기" 키가 붙어서 온다 */
export interface LiveNoticeBar extends NoticeBar {
  fg: string
  key: string
}

// ---------- FAQ ----------
export interface Faq {
  id: number
  category: string
  question: string
  answer: string
  is_active?: boolean
  sort_order?: number
}

export interface FaqGroup {
  category: string
  items: Faq[]
}

// ---------- 사용자 화면 ----------
export interface LayoutResponse extends ApiOk {
  noticeBar: LiveNoticeBar | null
  boards: Board[]
}

export interface NewsItem {
  id: number
  title: string
  excerpt: string
  is_notice: boolean
  created_at: string
  board_name: string
}

export interface HomeResponse extends ApiOk {
  banners: Banner[]
  popups: Popup[]
  faqs: FaqGroup[]
  news: NewsItem[]
  numbers: { value: number; label: string }[]
}

// ---------- 관리자 ----------
export interface AdminBoard {
  id: number
  board_key: string
  name: string
  description: string | null
  allow_user_write: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  /** 관리자 게시판 목록에서만 온다 */
  post_count?: number
  published_count?: number
}

export interface AdminPostSummary extends PostSummary {
  board_id: number
  is_published: boolean
  priority: number
}

export interface AdminPostsResponse extends ApiOk, Paged {
  posts: AdminPostSummary[]
  boards: AdminBoard[]
  stats: { total: number; published: number; hidden: number; today: number }
}

export type BulkAction = 'publish' | 'unpublish' | 'move' | 'delete'

export interface AdminPostInput {
  board_id: number
  title: string
  author: string
  content: string
  is_published: boolean
  is_notice: boolean
  priority: string
}

export interface AdminBoardInput {
  board_key: string
  name: string
  description: string
  allow_user_write: boolean
  is_active: boolean
  sort_order: string
}

/** ON/OFF 결과 — message 는 토스트로, status 로 목록의 상태 배지를 바꾼다 */
export interface ToggleResult extends ApiOk {
  active: boolean
  status: ScheduleStatus
  message: string
  type: 'success' | 'warning'
}

export interface ScheduleListResponse<T extends Schedule> extends ApiOk {
  rows: (T & { status: ScheduleStatus })[]
  counts: Record<ScheduleStatus, number>
}

export interface NoticeBarListResponse extends ScheduleListResponse<NoticeBar> {
  palette: { hex: string; name: string }[]
  shownId: number | null
}

/** 일정 입력값 (폼 공통). 날짜는 <input type="datetime-local"> 값 그대로 '2026-10-28T09:00' */
export interface ScheduleInput {
  link_url: string
  link_new_tab: boolean
  is_active: boolean
  starts_at: string
  ends_at: string
  sort_order: string
}

export interface AdminFaqsResponse extends ApiOk {
  rows: Required<Faq>[]
  categories: { name: string; count: number }[]
  category: string | null
}

export interface FaqInput {
  category: string
  question: string
  answer: string
  is_active: boolean
  sort_order: string
}
