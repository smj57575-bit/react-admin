// 없는 주소·없는 글 — 사용자 화면 404
import { Link } from 'react-router'
import { usePageTitle } from '../../lib/usePageTitle'

interface NotFoundPageProps {
  message?: string
  backTo?: string
  backLabel?: string
}

export default function NotFoundPage({ message = '찾을 수 없는 페이지예요.', backTo = '/', backLabel = '홈으로' }: NotFoundPageProps) {
  usePageTitle('찾을 수 없음')
  return (
    <section className="page-hero">
      <div className="container">
        <p className="eyebrow">404</p>
        <h1 className="page-hero__title">{message}</h1>
        <div className="action-row">
          <Link to={backTo} className="button button--sm button--ghost">
            {backLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
