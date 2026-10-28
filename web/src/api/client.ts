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

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: Method
  /** JSON 본문 */
  json?: unknown
  /** 파일이 있는 폼 (multipart/form-data) */
  form?: FormData
  /** 검색어·페이지 같은 쿼리스트링. 빈 값은 빠진다 */
  query?: Record<string, string | number | null | undefined>
}

export async function api<T>(path: string, { method = 'GET', json, form, query }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken
  if (json !== undefined) headers['Content-Type'] = 'application/json'

  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== null && v !== undefined && v !== '') search.set(k, String(v))
  }
  const url = '/api' + path + (search.size ? '?' + search : '')

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

  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.ok) {
    throw new ApiError(data?.message ?? '요청을 처리하지 못했어요.', res.status, data?.errors ?? [])
  }
  return data as T
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
