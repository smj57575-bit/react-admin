// 글 보기 — 공지·비공개 표시, 작성자·날짜·조회수, 본문, 목록/수정/삭제 버튼
// 본문은 글자 그대로 넣고 줄바꿈은 CSS(.post-body 의 white-space: pre-wrap)가 살린다 → HTML 로 해석하지 않아 안전
import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useSession } from '../../api/session'
import { usePost } from '../../api/site'
import { ErrorState, Loading } from '../../components/QueryState'
import { formatDateTime } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import NotFoundPage from './NotFoundPage'
import { boardUrl } from './urls'

export default function PostViewPage() {
  const id = Number(useParams().id)
  const { data, isPending, error, refetch } = usePost(id)
  const { data: session } = useSession()
  usePageTitle(data?.post.title ?? null)

  if (isPending) return <Loading />
  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFoundPage message={error.message} />
    return <ErrorState error={error} onRetry={refetch} buttonClass="button button--sm button--ghost" />
  }

  const { post, board, editable } = data
  const listUrl = boardUrl(board.board_key)

  return (
    <>
      <section className="page-hero page-hero--post">
        <div className="container">
          <Link to={listUrl} className="eyebrow">
            ← {board.name}
          </Link>
          <h1 className="page-hero__title">
            {post.is_notice && <span className="tag tag--notice">공지</span>}
            {!post.is_published && <span className="tag tag--muted">비공개</span>}
            {post.title}
          </h1>
          <div className="post-meta">
            <span>
              {post.author}
              {post.by_admin && (
                <>
                  {' '}
                  <span className="tag tag--dark">관리자</span>
                </>
              )}
            </span>
            <span>{formatDateTime(post.created_at)}</span>
            {post.updated_at && <span>수정 {formatDateTime(post.updated_at)}</span>}
            <span>조회 {post.hits}</span>
          </div>
        </div>
      </section>

      <section className="page-body">
        <div className="container">
          <article className="post-body">{post.content}</article>

          <div className="action-row">
            <Link to={listUrl} className="button button--sm button--ghost">
              목록
            </Link>
            {session?.admin ? (
              <Link to={`/admin/posts/${post.id}`} className="button button--sm button--primary">
                관리자에서 수정
              </Link>
            ) : (
              editable && (
                <>
                  <Link to={`/posts/${post.id}/edit`} className="button button--sm button--primary">
                    수정
                  </Link>
                  <Link to={`/posts/${post.id}/delete`} className="button button--sm button--danger">
                    삭제
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </section>
    </>
  )
}
