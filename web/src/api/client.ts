// API 호출 공통 — 모든 화면은 fetch 를 직접 쓰지 않고 이 함수를 거친다
// 하는 일: JSON 변환, CSRF 토큰 헤더, 오류를 ApiError 로 통일 (화면은 error.message / error.errors 만 보면 된다)

/** 서버가 ok:false 로 답했거나 네트워크가 끊겼을 때 */
export class ApiError extends Error {
  readonly status: number
  /** 입력 검증 오류 목록 (422). 폼 위에 그대로 보여준다 */
  readonly errors: string[]

  constructor(message: string, status: number, errors: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

// CSRF 토큰 — GET /api/session 응답에서 받아 두고, GET 이 아닌 모든 요청 헤더에 붙인다 (session.ts 가 채운다)
let csrfToken = ''
export function setCsrfToken(token: string) {
  csrfToken = token
}

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * 데모 모드 (GitHub Pages 처럼 PHP 서버가 없는 곳) — 빌드할 때 VITE_DEMO=true 를 주면 켜진다
 * 빌드 시점에 true/false 로 바뀌는 상수라서, 일반 빌드에서는 아래 데모 코드(import)가 통째로 빠진다
 */
export const IS_DEMO = import.meta.env.VITE_DEMO === 'true'

interface RequestOptions {
  method?: Method
  /** JSON 본문 */
  json?: unknown
  /** 파일이 있는 폼 (multipart/form-data) */
  form?: FormData
  /** 검색어·페이지 같은 쿼리스트링. 빈 값은 빠진다 */
  query?: Record<string, string | number | null | undefined>
}

/** 서버(또는 데모 서버)가 돌려준 상태 코드와 JSON 본문 */
export interface RawResponse {
  status: number
  data: { ok?: boolean; message?: string; errors?: string[] } | null
}

export async function api<T>(path: string, { method = 'GET', json, form, query }: RequestOptions = {}): Promise<T> {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== null && v !== undefined && v !== '') search.set(k, String(v))
  }

  let res: RawResponse
  if (IS_DEMO) {
    // 데모: fetch 대신 브라우저 안의 가짜 서버에 같은 요청을 넘긴다. 처음 한 번만 데모 코드를 내려받는다(dynamic import)
    const { demoRequest } = await import('./demo/handler')
    res = await demoRequest({ method, path, search, json, form })
  } else {
    res = await httpRequest('/api' + path + (search.size ? '?' + search : ''), method, json, form)
  }

  const { status, data } = res
  if (status < 200 || status >= 300 || !data?.ok) {
    throw new ApiError(data?.message ?? '요청을 처리하지 못했어요.', status, data?.errors ?? [])
  }
  return data as T
}

/** 데모 데이터를 처음 상태로 (관리자 사이드바의 "데모 데이터 초기화"). 데모 코드를 부르는 곳을 이 파일 하나로 모아야 일반 빌드에서 깔끔히 빠진다 */
export async function resetDemoData() {
  if (!IS_DEMO) return
  const { resetDemoDb } = await import('./demo/db')
  resetDemoDb()
}

async function httpRequest(url: string, method: Method, json: unknown, form: FormData | undefined): Promise<RawResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken
  if (json !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('서버에 연결하지 못했어요. 인터넷 연결이나 API 서버를 확인해 주세요.', 0)
  }
  return { status: res.status, data: await res.json().catch(() => null) }
}

/**
 * 객체 → FormData (이미지 업로드가 있는 폼용)
 * 서버 규칙(체크박스는 보내면 ON)에 맞춰 true 는 '1', false·null·빈 파일은 빼고 보낸다
 */
export function toFormData(values: Record<string, string | number | boolean | File | null | undefined>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) {
    if (v === false || v === null || v === undefined) continue
    if (v === true) fd.append(k, '1')
    else if (v instanceof File) fd.append(k, v)
    else fd.append(k, String(v))
  }
  return fd
}
