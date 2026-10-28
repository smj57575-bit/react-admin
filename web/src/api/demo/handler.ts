// 데모 서버 — PHP API(server/api/)를 브라우저 안에서 흉내 낸다. GitHub Pages 처럼 PHP 가 없는 곳에서 쓴다
// client.ts 의 api() 가 VITE_DEMO=true 일 때 fetch 대신 demoRequest() 를 부른다
// 경로표·상태 코드·응답 모양·오류 문구를 server/api/index.php, public.php, admin.php 와 같게 맞췄다 → 화면 코드는 데모인지 모른다
import type { Method, RawResponse } from '../client'
import type { ScheduleStatus } from '../types'
import {
  DemoQuotaError,
  loadDb,
  loadSession,
  nextId,
  now,
  randomHex,
  saveDb,
  saveSession,
  type BannerRow,
  type DemoDb,
  type DemoSession,
  type NoticeBarRow,
  type PopupRow,
  type PostRow,
} from './db'
import {
  ADMIN_ID,
  allBoards,
  bannerErrors,
  boardErrors,
  boardFormFromInput,
  byText,
  canUserWrite,
  canViewBoard,
  faqErrors,
  faqFormFromInput,
  findBoard,
  findBoardByKey,
  imageUploadError,
  isChecked,
  isHexColor,
  isIntInRange,
  isReservedAuthor,
  liveRows,
  NOTICE_BAR_DEFAULT_COLOR,
  NOTICE_BAR_PALETTE,
  noticeBarErrors,
  noticeBarTextColor,
  param,
  popupErrors,
  postErrors,
  rawParam,
  scheduleFormFromInput,
  scheduleOrder,
  scheduleStatus,
  scheduleValues,
  strimWidth,
  toggleResult,
  toInt,
  type Input,
} from './rules'

const ADMIN_PASSWORD = 'admin1234'   // 데모 계정 — 화면에 그대로 안내하는 공개 비밀번호라 해시로 숨길 이유가 없다
const LATENCY = 150                  // 로딩 표시가 잠깐 보이도록 아주 짧게 기다린다 (실제 네트워크 느낌)

export interface DemoRequestInit {
  method: Method
  path: string
  search: URLSearchParams
  json: unknown
  form: FormData | undefined
}

// ---------- 응답 (api/lib.php 의 api_ok / api_error) ----------
interface Reply {
  status: number
  data: Record<string, unknown>
}

const ok = (data: Record<string, unknown> = {}, status = 200): Reply => ({ status, data: { ok: true, ...data } })

/** PHP 의 api_error() 는 exit 로 바로 끝난다. 여기서는 예외를 던져서 같은 효과를 낸다 */
class ApiFail extends Error {
  readonly status: number
  readonly errors: string[]

  constructor(message: string, status = 400, errors: string[] = []) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

const fail = (message: string, status = 400): never => {
  throw new ApiFail(message, status)
}

/** api_validation() — 첫 오류를 message 로, 전체를 errors 로 (422) */
function validate(errors: string[]) {
  if (errors.length) throw new ApiFail(errors[0], 422, errors)
}

// ---------- 요청 하나의 상태 (PHP 의 $_GET, $_POST, $_FILES, $_SESSION) ----------
interface Ctx {
  db: DemoDb
  session: DemoSession
  query: URLSearchParams
  input: Input
  files: Record<string, File>
  now: string
  isAdmin: boolean
  /** GET 인데도 DB 를 바꿨을 때 (조회수 +1) */
  dirty: boolean
}

type Handler = (ctx: Ctx, params: string[]) => Reply | Promise<Reply>
type Route = [Method, string, Handler]

export async function demoRequest(req: DemoRequestInit): Promise<RawResponse> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY))
  const session = loadSession()
  const ctx: Ctx = { db: loadDb(), session, query: req.search, input: {}, files: {}, now: now(), isAdmin: session.admin !== null, dirty: false }

  try {
    const reply = await dispatch(ctx, req)
    if (req.method !== 'GET' || ctx.dirty) saveDb(ctx.db)
    return reply
  } catch (e) {
    if (e instanceof ApiFail) return { status: e.status, data: { ok: false, message: e.message, ...(e.errors.length ? { errors: e.errors } : {}) } }
    if (e instanceof DemoQuotaError) return { status: 413, data: { ok: false, message: '데모 저장 공간이 부족해요. 더 작은 이미지를 써 주세요.' } }
    console.error(e)   // PHP 의 error_log 자리 — 자세한 내용은 개발자 도구 콘솔에만
    return { status: 500, data: { ok: false, message: '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.' } }
  }
}

// ---------- 입력 (api_load_input) ----------
// JSON 본문과 FormData 를 PHP 가 읽는 모양($_POST, $_FILES)으로 바꾼다
// 체크박스 규칙(보내면 ON)에 맞춰 true 는 '1', false·null 은 빼고, 숫자는 문자열로
function loadInput(ctx: Ctx, json: unknown, form: FormData | undefined) {
  if (form) {
    for (const [key, value] of form) {
      if (typeof value === 'string') ctx.input[key] = value
      else if (value.size > 0 || value.name !== '') ctx.files[key] = value   // 빈 파일 칸은 "선택 안 함"
    }
    return
  }
  if (json === undefined) return
  if (typeof json !== 'object' || json === null || Array.isArray(json)) fail('요청 형식이 올바르지 않아요.')

  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (value === false || value === null || value === undefined) continue
    ctx.input[key] = value === true ? '1' : typeof value === 'number' ? String(value) : value
  }
}

// ---------- 라우팅 (api/index.php, api_dispatch) ----------
async function dispatch(ctx: Ctx, req: DemoRequestInit): Promise<Reply> {
  const path = '/' + req.path.replace(/^\/+|\/+$/g, '')

  // 권한은 화면이 아니라 서버에서 막는다: 관리자 경로는 로그인 안 했으면 401
  if (path.startsWith('/admin')) {
    if (!ctx.isAdmin) fail('로그인이 필요해요.', 401)
    return route(ADMIN_ROUTES, ctx, req, path)
  }
  return route(PUBLIC_ROUTES, ctx, req, path)
}

async function route(routes: Route[], ctx: Ctx, req: DemoRequestInit, path: string): Promise<Reply> {
  const allowed: Method[] = []
  for (const [method, pattern, handler] of routes) {
    const regex = new RegExp('^' + pattern.replace('{id}', '(\\d+)').replace('{key}', '([a-z0-9-]+)') + '$')
    const match = regex.exec(path)
    if (!match) continue
    if (method !== req.method) {
      allowed.push(method)
      continue
    }
    if (req.method !== 'GET') loadInput(ctx, req.json, req.form)   // CSRF 확인은 데모에서 생략 (지킬 서버 세션이 없다)
    return handler(ctx, match.slice(1))
  }
  if (allowed.length) fail('지원하지 않는 요청 방식이에요.', 405)
  return fail('없는 주소예요.', 404)
}

const PUBLIC_ROUTES: Route[] = [
  ['GET', '/session', apiSession],
  ['POST', '/login', apiLogin],
  ['POST', '/logout', apiLogout],
  ['GET', '/layout', apiLayout],
  ['GET', '/home', apiHome],
  ['GET', '/boards/{key}/posts', (c, [key]) => apiBoardPosts(c, key)],
  ['POST', '/boards/{key}/posts', (c, [key]) => apiCreatePost(c, key)],
  ['GET', '/posts/{id}', (c, [id]) => apiPost(c, Number(id))],
  ['PUT', '/posts/{id}', (c, [id]) => apiUpdatePost(c, Number(id))],
  ['DELETE', '/posts/{id}', (c, [id]) => apiDeletePost(c, Number(id))],
]

// 팝업·배너·띠배너는 같은 모양의 경로 6개씩 (주소의 이름 → 테이블)
type ScheduleTable = 'popups' | 'banners' | 'notice_bars'
const SCHEDULE_SLUGS: [string, ScheduleTable][] = [['popups', 'popups'], ['banners', 'banners'], ['notice-bars', 'notice_bars']]

const SCHEDULE_ROUTES: Route[] = SCHEDULE_SLUGS.flatMap(([slug, table]): Route[] => [
  ['GET', `/admin/${slug}`, (c) => apiScheduleList(c, table)],
  ['POST', `/admin/${slug}`, (c) => saveSchedule(c, table)],
  ['GET', `/admin/${slug}/{id}`, (c, [id]) => apiScheduleGet(c, table, Number(id))],
  ['POST', `/admin/${slug}/{id}`, (c, [id]) => saveSchedule(c, table, Number(id))],   // 이미지 업로드(multipart) 때문에 PUT 대신 POST
  ['PATCH', `/admin/${slug}/{id}/toggle`, (c, [id]) => apiScheduleToggle(c, table, Number(id))],
  ['DELETE', `/admin/${slug}/{id}`, (c, [id]) => apiScheduleDelete(c, table, Number(id))],
])

const ADMIN_ROUTES: Route[] = [
  ['GET', '/admin/posts', apiAdminPosts],
  ['POST', '/admin/posts', (c) => saveAdminPost(c)],
  ['POST', '/admin/posts/bulk', apiAdminBulkPosts],
  ['GET', '/admin/posts/{id}', (c, [id]) => apiAdminPost(c, Number(id))],
  ['PUT', '/admin/posts/{id}', (c, [id]) => saveAdminPost(c, Number(id))],
  ['DELETE', '/admin/posts/{id}', (c, [id]) => apiAdminDeletePost(c, Number(id))],
  ['GET', '/admin/boards', apiAdminBoards],
  ['POST', '/admin/boards', (c) => saveBoard(c)],
  ['GET', '/admin/boards/{id}', (c, [id]) => ok({ board: adminBoardOr404(c, Number(id)) })],
  ['PUT', '/admin/boards/{id}', (c, [id]) => saveBoard(c, Number(id))],
  ['PATCH', '/admin/boards/{id}/toggle', (c, [id]) => apiAdminToggleBoard(c, Number(id))],
  ['DELETE', '/admin/boards/{id}', (c, [id]) => apiAdminDeleteBoard(c, Number(id))],
  ...SCHEDULE_ROUTES,
  ['GET', '/admin/faqs', apiAdminFaqs],
  ['POST', '/admin/faqs', (c) => saveFaq(c)],
  ['GET', '/admin/faqs/{id}', (c, [id]) => ok({ row: adminFaqOr404(c, Number(id)) })],
  ['PUT', '/admin/faqs/{id}', (c, [id]) => saveFaq(c, Number(id))],
  ['PATCH', '/admin/faqs/{id}/toggle', (c, [id]) => apiAdminToggleFaq(c, Number(id))],
  ['DELETE', '/admin/faqs/{id}', (c, [id]) => apiAdminDeleteFaq(c, Number(id))],
]

// ========== 사용자 화면용 (api/public.php) ==========

// ---------- 세션·로그인 ----------
// defaultPassword 는 데모에서 늘 false — 대신 로그인 화면이 데모 계정을 안내한다
function apiSession(c: Ctx) {
  return ok({ admin: c.isAdmin, adminName: c.session.admin, csrf: c.session.csrf, defaultPassword: false })
}

function apiLogin(c: Ctx) {
  // 데모는 로그인 시도 횟수 제한(15분 5회)을 흉내 내지 않는다
  if (param(c.input, 'id') !== ADMIN_ID || rawParam(c.input, 'password') !== ADMIN_PASSWORD) fail('아이디 또는 비밀번호가 올바르지 않아요.', 401)
  c.session = { admin: ADMIN_ID, csrf: randomHex(16) }   // 로그인하면 새 세션 (session_regenerate_id 처럼)
  saveSession(c.session)
  return ok({ admin: true, adminName: ADMIN_ID, csrf: c.session.csrf, defaultPassword: false })
}

function apiLogout(c: Ctx) {
  c.session = { admin: null, csrf: randomHex(16) }
  saveSession(c.session)
  return ok({ admin: false, csrf: c.session.csrf })
}

// ---------- 홈 ----------
function apiHome(c: Ctx) {
  const popups = liveRows(c.db.popups, c.now)
  const banners = liveRows(c.db.banners, c.now)
  const boards = allBoards(c.db, true)

  // 공개된 글 + 켜진 게시판 (JOIN boards ... WHERE p.is_published = 1 AND b.is_active = 1)
  const publicPosts = c.db.posts.filter((p) => p.is_published && findBoard(c.db, p.board_id)?.is_active)
  const news = [...publicPosts]
    .sort((a, b) => Number(b.is_notice) - Number(a.is_notice) || b.id - a.id)
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      is_notice: p.is_notice,
      created_at: p.created_at,
      board_name: findBoard(c.db, p.board_id)?.name ?? '',
      excerpt: strimWidth(p.content.replace(/\s+/g, ' '), 120, '…'),
    }))

  return ok({
    banners,
    popups,
    faqs: liveFaqs(c.db),
    news,
    numbers: [
      { value: popups.length, label: '노출 중인 팝업' },
      { value: banners.length, label: '노출 중인 배너' },
      { value: boards.length, label: '열린 게시판' },
      { value: publicPosts.length, label: '공개된 글' },
    ],
  })
}

/** live_faqs() — 노출 중인 FAQ 를 분류별로 묶는다 (ORDER BY category, sort_order, id) */
function liveFaqs(db: DemoDb) {
  const rows = db.faqs.filter((f) => f.is_active).sort((a, b) => byText(a.category, b.category) || a.sort_order - b.sort_order || a.id - b.id)
  const groups: { category: string; items: { id: number; category: string; question: string; answer: string }[] }[] = []
  for (const { id, category, question, answer } of rows) {
    let group = groups.find((g) => g.category === category)
    if (!group) {
      group = { category, items: [] }
      groups.push(group)
    }
    group.items.push({ id, category, question, answer })
  }
  return groups
}

// 모든 사용자 화면 공통 — 맨 위 띠배너와 메뉴의 게시판 목록
function apiLayout(c: Ctx) {
  const bar = liveRows(c.db.notice_bars, c.now)[0] ?? null
  let noticeBar = null
  if (bar) {
    const bg = isHexColor(bar.bg_color) ? bar.bg_color : NOTICE_BAR_DEFAULT_COLOR
    // 수정하면 "오늘 하루 닫기"가 풀린다
    noticeBar = { ...bar, bg_color: bg, fg: noticeBarTextColor(bg), key: bar.id + '-' + (bar.updated_at ?? bar.created_at).replace(/\D/g, '') }
  }
  return ok({ noticeBar, boards: allBoards(c.db, true).map(publicBoard) })
}

function publicBoard(b: DemoDb['boards'][number]) {
  return { id: b.id, board_key: b.board_key, name: b.name, description: b.description, can_write: canUserWrite(b) }
}

// ---------- 게시판 ----------
/** 목록 검색 — LIKE '%q%' (대소문자 구분 없음) */
const matches = (p: PostRow, q: string) => [p.title, p.content, p.author].some((v) => v.toLowerCase().includes(q.toLowerCase()))

/** ORDER BY is_notice DESC, priority DESC, id DESC */
const postOrder = (a: PostRow, b: PostRow) => Number(b.is_notice) - Number(a.is_notice) || b.priority - a.priority || b.id - a.id

/** 페이지 나누기 — 없는 페이지를 달라고 하면 마지막 페이지 */
function paginate<T>(rows: T[], query: URLSearchParams, perPage: number) {
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(Math.max(1, toInt(param(query, 'page'))), totalPages)
  return { rows: rows.slice((page - 1) * perPage, page * perPage), total, page, totalPages, perPage }
}

function apiBoardPosts(c: Ctx, key: string) {
  const board = findBoardByKey(c.db, key)
  if (!canViewBoard(board, c.isAdmin)) return fail('존재하지 않는 게시판이에요.', 404)

  const q = param(c.query, 'q')
  const rows = c.db.posts.filter((p) => p.board_id === board.id && p.is_published && (q === '' || matches(p, q))).sort(postOrder)
  const { rows: posts, ...paging } = paginate(rows, c.query, 10)

  return ok({
    board: publicBoard(board),
    posts: posts.map((p) => ({ id: p.id, title: p.title, author: p.author, by_admin: p.password === null, is_notice: p.is_notice, hits: p.hits, created_at: p.created_at })),
    ...paging,
  })
}

// ---------- 글 ----------
/** 사용자가 볼 수 있는 글과 그 게시판. 없거나 숨겨진 글이면 404 */
function viewablePost(c: Ctx, id: number) {
  const post = c.db.posts.find((p) => p.id === id)
  const board = post ? findBoard(c.db, post.board_id) : null
  if (!post || !canViewBoard(board, c.isAdmin) || (!post.is_published && !c.isAdmin)) return fail('존재하지 않는 글이에요.', 404)
  return { post, board }
}

/** 방문자 글이고 그 게시판이 방문자 글쓰기를 허용할 때만 비밀번호로 수정·삭제할 수 있다 */
const userEditable = (post: PostRow, board: DemoDb['boards'][number]) => post.password !== null && post.is_published && canUserWrite(board)

/** 비밀번호 칸을 빼고 by_admin 을 붙인 글 (api_row($post, POST_BOOLS, ['password'])) */
function postOut(post: PostRow) {
  const { password, ...rest } = post
  return { ...rest, by_admin: password === null }
}

function apiPost(c: Ctx, id: number) {
  const { post, board } = viewablePost(c, id)
  if (!c.isAdmin) {
    // 관리자가 볼 때는 조회수를 올리지 않는다
    post.hits++
    c.dirty = true
  }
  return ok({ post: postOut(post), board: publicBoard(board), editable: userEditable(post, board) })
}

function userPostForm(c: Ctx) {
  const form = { title: param(c.input, 'title'), author: param(c.input, 'author'), content: param(c.input, 'content') }
  const errors = postErrors(form)
  if (rawParam(c.input, 'password') === '') errors.push('비밀번호를 입력하세요.')
  if (isReservedAuthor(form.author)) errors.push('사용할 수 없는 작성자명입니다.')
  validate(errors)
  return form
}

async function apiCreatePost(c: Ctx, key: string) {
  const board = findBoardByKey(c.db, key)
  if (!canUserWrite(board)) return fail('이 게시판에는 글을 쓸 수 없어요.', 403)
  const form = userPostForm(c)

  const id = nextId(c.db, 'posts')
  c.db.posts.push({
    id,
    board_id: board.id,
    ...form,
    password: await hashPassword(rawParam(c.input, 'password')),
    is_published: true,
    is_notice: false,
    priority: 0,
    hits: 0,
    created_at: c.now,
    updated_at: null,
  })
  return ok({ id, message: '글을 등록했어요' }, 201)
}

// 글 비밀번호 — 평문 대신 '솔트$sha256(솔트+비밀번호)' 로 저장한다 (서버의 password_hash() 자리)
// 데모용으로 단순하게 만든 것. 실제 서버는 일부러 느린 bcrypt 를 쓴다
async function hashPassword(password: string, salt = randomHex(4)) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + password))
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return `${salt}$${hex}`
}

async function checkPostPassword(c: Ctx, post: PostRow) {
  const salt = post.password?.split('$')[0] ?? ''
  if ((await hashPassword(rawParam(c.input, 'password'), salt)) !== post.password) fail('비밀번호가 일치하지 않아요.', 403)
}

async function apiUpdatePost(c: Ctx, id: number) {
  const { post, board } = viewablePost(c, id)
  if (!userEditable(post, board)) return fail('이 글은 수정할 수 없어요.', 403)
  const form = userPostForm(c)
  await checkPostPassword(c, post)

  Object.assign(post, form, { updated_at: c.now })
  return ok({ id, message: '저장했어요' })
}

async function apiDeletePost(c: Ctx, id: number) {
  const { post, board } = viewablePost(c, id)
  if (!userEditable(post, board)) return fail('이 글은 삭제할 수 없어요.', 403)
  await checkPostPassword(c, post)

  c.db.posts = c.db.posts.filter((p) => p.id !== id)
  return ok({ board_key: board.board_key, message: '삭제했어요' })
}

// ========== 관리자 (api/admin.php) ==========

// ---------- 글 ----------
function apiAdminPosts(c: Ctx) {
  const q = param(c.query, 'q')
  const board = findBoard(c.db, toInt(param(c.query, 'board_id')))   // null 이면 전체 게시판

  const rows = c.db.posts.filter((p) => (!board || p.board_id === board.id) && (q === '' || matches(p, q))).sort(postOrder)
  const { rows: posts, ...paging } = paginate(rows, c.query, 15)
  const today = c.now.slice(0, 10)

  return ok({
    posts: posts.map((p) => ({
      id: p.id,
      board_id: p.board_id,
      title: p.title,
      author: p.author,
      by_admin: p.password === null,
      is_published: p.is_published,
      is_notice: p.is_notice,
      priority: p.priority,
      hits: p.hits,
      created_at: p.created_at,
    })),
    boards: allBoards(c.db),
    stats: {
      total: c.db.posts.length,
      published: c.db.posts.filter((p) => p.is_published).length,
      hidden: c.db.posts.filter((p) => !p.is_published).length,
      today: c.db.posts.filter((p) => p.created_at.startsWith(today)).length,
    },
    ...paging,
  })
}

function adminPostOr404(c: Ctx, id: number) {
  return c.db.posts.find((p) => p.id === id) ?? fail('없는 글이에요.', 404)
}

function apiAdminPost(c: Ctx, id: number) {
  return ok({ post: postOut(adminPostOr404(c, id)) })
}

function adminPostForm(c: Ctx) {
  const form = {
    title: param(c.input, 'title'),
    author: param(c.input, 'author'),
    content: param(c.input, 'content'),
    is_published: isChecked(c.input, 'is_published'),
    is_notice: isChecked(c.input, 'is_notice'),
    board_id: toInt(param(c.input, 'board_id')),
    priority: param(c.input, 'priority'),
  }
  const errors = postErrors(form)
  if (!findBoard(c.db, form.board_id)) errors.push('게시판을 선택하세요.')
  if (form.priority !== '' && !isIntInRange(form.priority, -9999, 9999)) errors.push('노출 순서는 -9999 ~ 9999 사이의 정수로 입력하세요.')
  validate(errors)
  return { ...form, priority: toInt(form.priority) }
}

/** 등록·수정 공통. 수정할 때 password 칸은 건드리지 않는다 (방문자 글은 방문자 글로 남는다) */
function saveAdminPost(c: Ctx, id = 0) {
  const current = id ? adminPostOr404(c, id) : null
  const form = adminPostForm(c)
  if (current) {
    Object.assign(current, form, { updated_at: c.now })
    return ok({ id, message: '저장했어요' })
  }
  const newId = nextId(c.db, 'posts')
  c.db.posts.push({ id: newId, ...form, password: null, hits: 0, created_at: c.now, updated_at: null })
  return ok({ id: newId, message: '글을 등록했어요' }, 201)
}

function apiAdminDeletePost(c: Ctx, id: number) {
  adminPostOr404(c, id)
  c.db.posts = c.db.posts.filter((p) => p.id !== id)
  return ok({ message: '삭제했어요' })
}

// 일괄 처리 { ids: [1,2], action: publish|unpublish|move|delete, target_board }
function apiAdminBulkPosts(c: Ctx) {
  const raw = c.input.ids
  const ids = (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).map((v) => toInt(String(v))).filter((v) => v !== 0)
  const action = param(c.input, 'action')
  if (!ids.length) fail('글을 선택하세요.', 422)

  const target = findBoard(c.db, toInt(param(c.input, 'target_board')))
  const n = ids.length
  const selected = c.db.posts.filter((p) => ids.includes(p.id))

  switch (action) {
    case 'publish':
      selected.forEach((p) => (p.is_published = true))
      return ok({ message: `글 ${n}개를 공개했어요` })
    case 'unpublish':
      selected.forEach((p) => (p.is_published = false))
      return ok({ message: `글 ${n}개를 비공개로 바꿨어요` })
    case 'move':
      if (!target) return fail('옮길 게시판을 선택하세요.', 422)
      selected.forEach((p) => (p.board_id = target.id))
      return ok({ message: `글 ${n}개를 ‘${target.name}’(으)로 옮겼어요` })
    case 'delete':
      c.db.posts = c.db.posts.filter((p) => !ids.includes(p.id))
      return ok({ message: `글 ${n}개를 삭제했어요` })
    default:
      return fail('알 수 없는 작업이에요.', 422)
  }
}

// ---------- 게시판 ----------
function apiAdminBoards(c: Ctx) {
  const boards = allBoards(c.db).map((b) => {
    const posts = c.db.posts.filter((p) => p.board_id === b.id)
    return { ...b, post_count: posts.length, published_count: posts.filter((p) => p.is_published).length }
  })
  return ok({ boards })
}

function adminBoardOr404(c: Ctx, id: number) {
  return findBoard(c.db, id) ?? fail('없는 게시판이에요.', 404)
}

function saveBoard(c: Ctx, id = 0) {
  const current = id ? adminBoardOr404(c, id) : null
  const form = boardFormFromInput(c.input)
  validate(boardErrors(c.db, form, id))
  const values = { ...form, description: form.description !== '' ? form.description : null, sort_order: toInt(form.sort_order) }

  if (current) {
    Object.assign(current, values)
    return ok({ id, message: '저장했어요' })
  }
  const newId = nextId(c.db, 'boards')
  c.db.boards.push({ id: newId, ...values, created_at: c.now })
  return ok({ id: newId, message: '게시판을 만들었어요' }, 201)
}

function apiAdminToggleBoard(c: Ctx, id: number) {
  const board = adminBoardOr404(c, id)
  board.is_active = !board.is_active
  return ok(toggleResult(board.name, board.is_active))
}

function apiAdminDeleteBoard(c: Ctx, id: number) {
  const board = adminBoardOr404(c, id)
  const count = c.db.posts.filter((p) => p.board_id === id).length
  if (count > 0) fail(`「${board.name}」에 글이 ${count}개 남아 있어 삭제할 수 없어요. 글을 옮기거나 지운 뒤 다시 시도해 주세요.`, 409)
  c.db.boards = c.db.boards.filter((b) => b.id !== id)
  return ok({ message: '삭제했어요' })
}

// ---------- 노출 일정이 있는 콘텐츠: 팝업, 배너, 띠배너 ----------
// 테이블마다 다른 것(이름, 이미지 규칙, 토스트에 쓸 칸)만 여기 적고, 나머지는 아래 함수가 같이 처리한다
const SCHEDULE_RESOURCES = {
  popups: { name: '팝업', created: '팝업을 등록했어요', image: 'optional', label: 'title' },
  banners: { name: '배너', created: '배너를 등록했어요', image: 'required', label: 'title' },
  notice_bars: { name: '띠배너', created: '띠배너를 등록했어요', image: null, label: 'message' },
} as const

type ScheduleRow = PopupRow | BannerRow | NoticeBarRow

const scheduleRows = (c: Ctx, table: ScheduleTable): ScheduleRow[] => c.db[table]
const withStatus = <T extends ScheduleRow>(row: T, now: string): T & { status: ScheduleStatus } => ({ ...row, status: scheduleStatus(row, now) })
const scheduleLabel = (row: ScheduleRow) => ('message' in row ? row.message : row.title)

/** PHP 문구를 그대로 — '없는 팝업예요.' */
function scheduleRowOr404(c: Ctx, table: ScheduleTable, id: number) {
  return scheduleRows(c, table).find((r) => r.id === id) ?? fail(`없는 ${SCHEDULE_RESOURCES[table].name}예요.`, 404)
}

function apiScheduleList(c: Ctx, table: ScheduleTable) {
  const rows = [...scheduleRows(c, table)].sort(scheduleOrder).map((r) => withStatus(r, c.now))
  const counts: Record<ScheduleStatus, number> = { live: 0, scheduled: 0, ended: 0, off: 0 }
  rows.forEach((r) => counts[r.status]++)

  const extra =
    table === 'notice_bars'
      ? {
          palette: Object.entries(NOTICE_BAR_PALETTE).map(([hex, name]) => ({ hex, name })),
          shownId: liveRows(c.db.notice_bars, c.now)[0]?.id ?? null,
        }
      : {}
  return ok({ rows, counts, ...extra })
}

function apiScheduleGet(c: Ctx, table: ScheduleTable, id: number) {
  return ok({ row: withStatus(scheduleRowOr404(c, table, id), c.now) })
}

/** 업로드 파일 → data URL 문자열 (서버라면 파일로 저장하고 경로를 넣는 자리) */
function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** 테이블별 폼 값과 검증 오류 (schedule_form_and_errors). '' 인 선택 칸은 null 로 저장한다 */
function scheduleFormAndErrors(c: Ctx, table: ScheduleTable, hasImage: boolean) {
  const schedule = scheduleFormFromInput(c.input)
  const orNull = (v: string) => (v !== '' ? v : null)

  if (table === 'popups') {
    const form = { ...schedule, title: param(c.input, 'title'), content: param(c.input, 'content') }
    return { fields: { title: form.title, content: orNull(form.content) }, schedule, errors: popupErrors(form, hasImage) }
  }
  if (table === 'banners') {
    const form = { ...schedule, title: param(c.input, 'title'), subtitle: param(c.input, 'subtitle'), button_text: param(c.input, 'button_text') }
    return { fields: { title: form.title, subtitle: orNull(form.subtitle), button_text: orNull(form.button_text) }, schedule, errors: bannerErrors(form, hasImage) }
  }
  // 띠배너: '#' 없이 입력해도 받아준다
  const form = { ...schedule, message: param(c.input, 'message'), bg_color: '#' + param(c.input, 'bg_color').replace(/^#+/, '').toUpperCase(), dismissible: isChecked(c.input, 'dismissible') }
  return { fields: { message: form.message, bg_color: form.bg_color, dismissible: form.dismissible }, schedule, errors: noticeBarErrors(form) }
}

// 등록·수정 공통. 이미지는 multipart/form-data 의 image 칸, 지우기는 remove_image=1
async function saveSchedule(c: Ctx, table: ScheduleTable, id = 0) {
  const res = SCHEDULE_RESOURCES[table]
  const current = id ? scheduleRowOr404(c, table, id) : null
  const currentImage = current && 'image_path' in current ? current.image_path : null
  const file = res.image ? c.files.image : undefined
  const remove = res.image === 'optional' && isChecked(c.input, 'remove_image')

  const errors: string[] = []
  const uploadError = file ? imageUploadError(file) : ''
  if (uploadError) errors.push(uploadError)
  const { fields, schedule, errors: formErrors } = scheduleFormAndErrors(c, table, Boolean(file) || (currentImage !== null && !remove))
  validate([...errors, ...formErrors])

  const imagePath = file ? await readAsDataUrl(file) : remove ? null : currentImage
  const values = { ...fields, ...(res.image ? { image_path: imagePath } : {}), ...scheduleValues(schedule) }

  if (current) {
    Object.assign(current, values, { updated_at: c.now })
    return ok({ id, message: '저장했어요' })
  }
  const newId = nextId(c.db, table)
  // 테이블마다 칸이 달라서 TypeScript 가 하나로 묶어 추론하지 못한다 — 위 scheduleFormAndErrors 가 테이블에 맞는 칸을 만든다
  scheduleRows(c, table).push({ id: newId, ...values, created_at: c.now, updated_at: null } as ScheduleRow)
  return ok({ id: newId, message: res.created }, 201)
}

function apiScheduleToggle(c: Ctx, table: ScheduleTable, id: number) {
  const row = scheduleRowOr404(c, table, id)
  row.is_active = !row.is_active
  row.updated_at = c.now
  return ok(toggleResult(scheduleLabel(row), row.is_active, withStatus(row, c.now)))
}

function apiScheduleDelete(c: Ctx, table: ScheduleTable, id: number) {
  const row = scheduleRowOr404(c, table, id)
  const rows = scheduleRows(c, table)
  rows.splice(rows.indexOf(row), 1)   // 이미지는 data URL 로 행 안에 있어서 행과 함께 사라진다
  return ok({ message: '삭제했어요' })
}

// ---------- FAQ ----------
/** faq_categories() — 지금 쓰이는 분류 이름과 개수 (ORDER BY category) */
function faqCategories(db: DemoDb) {
  const counts = new Map<string, number>()
  for (const f of db.faqs) counts.set(f.category, (counts.get(f.category) ?? 0) + 1)
  return [...counts].sort(([a], [b]) => byText(a, b)).map(([name, count]) => ({ name, count }))
}

function apiAdminFaqs(c: Ctx) {
  const categories = faqCategories(c.db)
  const requested = param(c.query, 'category')
  const category = categories.some((g) => g.name === requested) ? requested : null   // 없는 분류면 전체

  const rows = c.db.faqs
    .filter((f) => category === null || f.category === category)
    .sort((a, b) => (category === null ? byText(a.category, b.category) : 0) || a.sort_order - b.sort_order || a.id - b.id)
  return ok({ rows, categories, category })
}

function adminFaqOr404(c: Ctx, id: number) {
  return c.db.faqs.find((f) => f.id === id) ?? fail('없는 FAQ예요.', 404)
}

function saveFaq(c: Ctx, id = 0) {
  const current = id ? adminFaqOr404(c, id) : null
  const form = faqFormFromInput(c.input)
  validate(faqErrors(form))
  const values = { ...form, sort_order: toInt(form.sort_order) }

  if (current) {
    Object.assign(current, values, { updated_at: c.now })
    return ok({ id, message: '저장했어요' })
  }
  const newId = nextId(c.db, 'faqs')
  c.db.faqs.push({ id: newId, ...values, created_at: c.now, updated_at: null })
  return ok({ id: newId, message: 'FAQ를 등록했어요' }, 201)
}

function apiAdminToggleFaq(c: Ctx, id: number) {
  const faq = adminFaqOr404(c, id)
  faq.is_active = !faq.is_active
  faq.updated_at = c.now
  return ok(toggleResult(faq.question, faq.is_active))
}

function apiAdminDeleteFaq(c: Ctx, id: number) {
  adminFaqOr404(c, id)
  c.db.faqs = c.db.faqs.filter((f) => f.id !== id)
  return ok({ message: '삭제했어요' })
}
