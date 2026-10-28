// 관리자 데이터 — 화면은 이 훅만 부르고, 주소·캐시 키·갱신 규칙은 여기 한곳에 모은다
// 캐시 키 규칙: ['admin', 자원, 'list' | 'detail', ...]. 'list'/'detail' 을 나눠 둬야 목록만 골라서 고칠 수 있다
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useToast } from '../components/Toast'
import { api, ApiError, toFormData } from './client'
import type {
  AdminBoard,
  AdminBoardInput,
  AdminFaqsResponse,
  AdminPostInput,
  AdminPostsResponse,
  ApiOk,
  Banner,
  BulkAction,
  Faq,
  FaqInput,
  MutationResult,
  NoticeBar,
  NoticeBarListResponse,
  Popup,
  Post,
  Schedule,
  ScheduleInput,
  ScheduleListResponse,
  ScheduleStatus,
  ToggleResult,
} from './types'

// ---------- 캐시 키 ----------
export interface PostListParams {
  q: string
  boardId: number | null
  page: number
}

/** 팝업·배너·띠배너 — 주소 이름(slug) 그대로 */
export type ScheduleSlug = 'popups' | 'banners' | 'notice-bars'

export const adminKeys = {
  posts: ['admin', 'posts'] as const,
  postList: (params: PostListParams) => ['admin', 'posts', 'list', params] as const,
  post: (id: number) => ['admin', 'posts', 'detail', id] as const,
  boards: ['admin', 'boards'] as const,
  boardList: ['admin', 'boards', 'list'] as const,
  board: (id: number) => ['admin', 'boards', 'detail', id] as const,
  schedule: (slug: ScheduleSlug) => ['admin', slug] as const,
  scheduleList: (slug: ScheduleSlug) => ['admin', slug, 'list'] as const,
  scheduleRow: (slug: ScheduleSlug, id: number) => ['admin', slug, 'detail', id] as const,
  faqs: ['admin', 'faqs'] as const,
  faqList: (category: string | null) => ['admin', 'faqs', 'list', category] as const,
  faq: (id: number) => ['admin', 'faqs', 'detail', id] as const,
}

// ---------- 공통: 저장 뒤 캐시 갱신 ----------
// 관리자가 바꾼 내용은 사용자 화면(홈 배너·팝업·FAQ, 맨 위 띠배너, 게시판 메뉴·글 목록)에도 보인다
// 그래서 바뀐 관리자 목록과 함께 사이트 캐시(['home'], ['layout'], 게시판·글 …)도 "오래됨"으로 표시한다
// 사이트 쪽 키 이름에 기대지 않도록 "관리자·세션이 아닌 캐시 전부"로 고른다. 지금 화면에 없는 캐시는 표시만 되고, 다음에 열 때 새로 받는다
const isSiteQuery = (key: QueryKey) => key[0] !== 'admin' && key[0] !== 'session'

function useInvalidate() {
  const queryClient = useQueryClient()
  return (...keys: QueryKey[]) =>
    Promise.all([
      ...keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      queryClient.invalidateQueries({ predicate: (query) => isSiteQuery(query.queryKey) }),
    ])
}

/** 등록·수정·삭제 공통 — 성공하면 관련 목록과 사이트 캐시를 갱신한다 */
function useAdminMutation<TInput>(mutationFn: (input: TInput) => Promise<MutationResult>, ...keys: QueryKey[]) {
  const invalidate = useInvalidate()
  return useMutation<MutationResult, ApiError, TInput>({
    mutationFn,
    onSuccess: () => invalidate(...keys),
  })
}

// ---------- 공통: ON/OFF ----------
interface Toggleable {
  id: number
  is_active: boolean
  status?: ScheduleStatus
}

/** 목록 응답에서 행 배열을 꺼내고 바꿔 넣는 방법 (게시판은 boards, 나머지는 rows) */
interface RowsLens<TData, TRow extends Toggleable> {
  get: (data: TData) => TRow[]
  set: (data: TData, rows: TRow[]) => TData
}

/**
 * ON/OFF 스위치 — 누르는 즉시 화면의 스위치를 바꾸고(낙관적 업데이트), 서버 답으로 상태 배지를 맞춘 뒤 토스트를 띄운다
 * 실패하면 원래 값으로 되돌린다. 마지막에 목록을 다시 받아 상태별 개수 같은 파생 값도 맞춘다
 */
function useToggle<TData, TRow extends Toggleable>(listKey: QueryKey, path: (id: number) => string, lens: RowsLens<TData, TRow>, ...relatedKeys: QueryKey[]) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()
  const toast = useToast()

  const patchRow = (id: number, patch: Partial<Toggleable>) =>
    queryClient.setQueriesData<TData>({ queryKey: listKey }, (data) =>
      data ? lens.set(data, lens.get(data).map((row) => (row.id === id ? { ...row, ...patch } : row))) : data,
    )

  return useMutation<ToggleResult, ApiError, Toggleable, { before: [QueryKey, TData | undefined][] }>({
    mutationFn: (row) => api<ToggleResult>(path(row.id), { method: 'PATCH' }),
    onMutate: async (row) => {
      await queryClient.cancelQueries({ queryKey: listKey })   // 진행 중인 목록 요청이 덮어쓰지 않게
      const before = queryClient.getQueriesData<TData>({ queryKey: listKey })
      patchRow(row.id, { is_active: !row.is_active })
      return { before }
    },
    onSuccess: (result, row) => {
      patchRow(row.id, { is_active: result.active, status: result.status })
      toast(result.message, result.type)
    },
    onError: (error, _row, context) => {
      context?.before.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast(error.message || '바꾸지 못했어요. 잠시 후 다시 시도해 주세요.', 'error')
    },
    onSettled: () => invalidate(listKey, ...relatedKeys),
  })
}

/** { rows: [...] } 모양 목록용 */
function rowsLens<TRow extends Toggleable>(): RowsLens<{ rows: TRow[] }, TRow> {
  return { get: (data) => data.rows, set: (data, rows) => ({ ...data, rows }) }
}

// ---------- 글 ----------
export function useAdminPosts(params: PostListParams) {
  return useQuery({
    queryKey: adminKeys.postList(params),
    queryFn: () => api<AdminPostsResponse>('/admin/posts', { query: { q: params.q, board_id: params.boardId, page: params.page } }),
    placeholderData: keepPreviousData,   // 페이지·탭을 바꾸는 동안 이전 목록을 보여 줘 화면이 깜빡이지 않게
  })
}

export function useAdminPost(id: number | null) {
  return useQuery({
    queryKey: adminKeys.post(id ?? 0),
    queryFn: () => api<ApiOk & { post: Post }>(`/admin/posts/${id}`),
    enabled: id !== null,
  })
}

export function useSavePost(id: number | null) {
  return useAdminMutation(
    (input: AdminPostInput) =>
      id ? api<MutationResult>(`/admin/posts/${id}`, { method: 'PUT', json: input }) : api<MutationResult>('/admin/posts', { method: 'POST', json: input }),
    adminKeys.posts,
    adminKeys.boards,   // 게시판 목록의 글 수
  )
}

export function useDeletePost() {
  return useAdminMutation((id: number) => api<MutationResult>(`/admin/posts/${id}`, { method: 'DELETE' }), adminKeys.posts, adminKeys.boards)
}

export interface BulkInput {
  ids: number[]
  action: BulkAction
  target_board?: number
}

export function useBulkPosts() {
  return useAdminMutation((input: BulkInput) => api<MutationResult>('/admin/posts/bulk', { method: 'POST', json: input }), adminKeys.posts, adminKeys.boards)
}

// ---------- 게시판 ----------
interface AdminBoardsResponse extends ApiOk {
  boards: AdminBoard[]
}

export function useAdminBoards() {
  return useQuery({
    queryKey: adminKeys.boardList,
    queryFn: () => api<AdminBoardsResponse>('/admin/boards'),
  })
}

export function useAdminBoard(id: number | null) {
  return useQuery({
    queryKey: adminKeys.board(id ?? 0),
    queryFn: () => api<ApiOk & { board: AdminBoard }>(`/admin/boards/${id}`),
    enabled: id !== null,
  })
}

export function useSaveBoard(id: number | null) {
  return useAdminMutation(
    (input: AdminBoardInput) =>
      id ? api<MutationResult>(`/admin/boards/${id}`, { method: 'PUT', json: input }) : api<MutationResult>('/admin/boards', { method: 'POST', json: input }),
    adminKeys.boards,
    adminKeys.posts,   // 글 관리의 게시판 탭
  )
}

export function useToggleBoard() {
  const lens: RowsLens<AdminBoardsResponse, AdminBoard> = { get: (data) => data.boards, set: (data, boards) => ({ ...data, boards }) }
  return useToggle(adminKeys.boardList, (id) => `/admin/boards/${id}/toggle`, lens, adminKeys.posts)
}

/** 글이 남은 게시판은 서버가 409 로 거절한다 (메시지를 그대로 보여준다) */
export function useDeleteBoard() {
  return useAdminMutation((id: number) => api<MutationResult>(`/admin/boards/${id}`, { method: 'DELETE' }), adminKeys.boards, adminKeys.posts)
}

// ---------- 팝업·배너·띠배너 (노출 일정) ----------
// 세 자원은 주소 모양이 같아서 slug 하나로 같은 훅을 쓴다. 행 타입만 slug 에 따라 달라진다
interface ScheduleRows {
  popups: Popup
  banners: Banner
  'notice-bars': NoticeBar
}

interface ScheduleLists {
  popups: ScheduleListResponse<Popup>
  banners: ScheduleListResponse<Banner>
  'notice-bars': NoticeBarListResponse
}

const fetchScheduleList = <S extends ScheduleSlug>(slug: S) => api<ScheduleLists[S]>(`/admin/${slug}`)

export function useScheduleList<S extends ScheduleSlug>(slug: S) {
  return useQuery({ queryKey: adminKeys.scheduleList(slug), queryFn: () => fetchScheduleList(slug) })
}

export function useScheduleRow<S extends ScheduleSlug>(slug: S, id: number | null) {
  return useQuery({
    queryKey: adminKeys.scheduleRow(slug, id ?? 0),
    queryFn: () => api<ApiOk & { row: ScheduleRows[S] }>(`/admin/${slug}/${id}`),
    enabled: id !== null,
  })
}

/** 띠배너 배경색 팔레트 — 목록 API 가 주는 값. 목록과 같은 캐시를 쓰므로 목록을 거쳐 오면 다시 요청하지 않는다 */
export function useNoticeBarPalette() {
  return useQuery({
    queryKey: adminKeys.scheduleList('notice-bars'),
    queryFn: () => fetchScheduleList('notice-bars'),
    select: (data) => data.palette,
  })
}

/** 등록·수정 입력값 — 일정 공통 칸 + 자원별 칸. 이미지가 있어서 multipart(FormData)로 보낸다 */
export interface ScheduleInputs {
  popups: ScheduleInput & { title: string; content: string; image: File | null; remove_image: boolean }
  banners: ScheduleInput & { title: string; subtitle: string; button_text: string; image: File | null }
  'notice-bars': ScheduleInput & { message: string; bg_color: string; dismissible: boolean }
}

export function useSaveSchedule<S extends ScheduleSlug>(slug: S, id: number | null) {
  return useAdminMutation(
    (input: ScheduleInputs[S]) => api<MutationResult>(id ? `/admin/${slug}/${id}` : `/admin/${slug}`, { method: 'POST', form: toFormData({ ...input }) }),
    adminKeys.schedule(slug),
  )
}

export function useToggleSchedule(slug: ScheduleSlug) {
  return useToggle(adminKeys.scheduleList(slug), (id) => `/admin/${slug}/${id}/toggle`, rowsLens<Schedule>())
}

export function useDeleteSchedule(slug: ScheduleSlug) {
  return useAdminMutation((id: number) => api<MutationResult>(`/admin/${slug}/${id}`, { method: 'DELETE' }), adminKeys.schedule(slug))
}

// ---------- FAQ ----------
export function useAdminFaqs(category: string | null) {
  return useQuery({
    queryKey: adminKeys.faqList(category),
    queryFn: () => api<AdminFaqsResponse>('/admin/faqs', { query: { category } }),
    placeholderData: keepPreviousData,
  })
}

export function useAdminFaq(id: number | null) {
  return useQuery({
    queryKey: adminKeys.faq(id ?? 0),
    queryFn: () => api<ApiOk & { row: Required<Faq> }>(`/admin/faqs/${id}`),
    enabled: id !== null,
  })
}

export function useSaveFaq(id: number | null) {
  return useAdminMutation(
    (input: FaqInput) => (id ? api<MutationResult>(`/admin/faqs/${id}`, { method: 'PUT', json: input }) : api<MutationResult>('/admin/faqs', { method: 'POST', json: input })),
    adminKeys.faqs,
  )
}

export function useToggleFaq() {
  // 분류 탭마다 캐시가 따로 있어서 ['admin','faqs','list'] 로 시작하는 목록을 모두 고친다
  return useToggle(['admin', 'faqs', 'list'], (id) => `/admin/faqs/${id}/toggle`, rowsLens<Required<Faq>>())
}

export function useDeleteFaq() {
  return useAdminMutation((id: number) => api<MutationResult>(`/admin/faqs/${id}`, { method: 'DELETE' }), adminKeys.faqs)
}
