// 사용자 화면 주소 만들기 — 여러 화면이 같은 규칙으로 링크를 만들도록 한곳에 둔다

/** 게시판 목록 주소 — 1페이지와 빈 검색어는 주소에서 뺀다 (/boards/free?q=테스트&page=2) */
export function boardUrl(key: string, { page = 1, q = '' }: { page?: number; q?: string } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  return `/boards/${key}` + (params.size ? '?' + params : '')
}
