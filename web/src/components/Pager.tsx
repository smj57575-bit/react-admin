// 페이지 번호 — 주소(?page=)를 바꾸는 링크라서 새로고침·뒤로 가기·주소 공유가 그대로 된다
import { Link } from 'react-router'

interface PagerProps {
  page: number
  totalPages: number
  /** n 페이지로 가는 주소 */
  to: (page: number) => string
}

export function Pager({ page, totalPages, to }: PagerProps) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  return (
    <nav className="pager" aria-label="페이지">
      <Link className={page <= 1 ? 'is-disabled' : ''} to={to(page - 1)} aria-disabled={page <= 1}>
        이전
      </Link>
      {pages.map((n) => (
        <Link key={n} className={n === page ? 'is-active' : ''} to={to(n)} aria-current={n === page ? 'page' : undefined}>
          {n}
        </Link>
      ))}
      <Link className={page >= totalPages ? 'is-disabled' : ''} to={to(page + 1)} aria-disabled={page >= totalPages}>
        다음
      </Link>
    </nav>
  )
}
