// 게시판 목록 — /boards/:key?q=검색어&page=2
// 검색어와 페이지를 컴포넌트 state 가 아니라 주소(쿼리스트링)에 둔다 → 새로고침·뒤로 가기·주소 공유가 그대로 된다
// /boards 처럼 게시판을 고르지 않고 오면 첫 번째 게시판으로 보낸다
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useBoardPosts } from '../../api/site'
import { DemoNote } from '../../components/DemoNote'
import { Pager } from '../../components/Pager'
import { ErrorState, Loading } from '../../components/QueryState'
import { useLayoutData } from '../../layouts/SiteLayout'
import { formatDate } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import NotFoundPage from './NotFoundPage'
import { boardUrl } from './urls'

export default function BoardListPage() {
  const { key } = useParams()
  return key ? <BoardList boardKey={key} /> : <FirstBoardRedirect />
}

function FirstBoardRedirect() {
  const { data, isPending, error, refetch } = useLayoutData()
  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} buttonClass="button button--sm button--ghost" />
  const first = data.boards[0]
  return first ? <Navigate to={boardUrl(first.board_key)} replace /> : <NotFoundPage message="존재하지 않는 게시판이에요." />
}

function BoardList({ boardKey }: { boardKey: string }) {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q')?.trim() ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const { data: layout } = useLayoutData()
  const { data, isPending, isPlaceholderData, error, refetch } = useBoardPosts(boardKey, page, q)
  usePageTitle(data?.board.name ?? null)

  if (isPending) return <Loading />
  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <NotFoundPage message={error.message} backTo="/boards" backLabel="게시판으로" />
    }
    return <ErrorState error={error} onRetry={refetch} buttonClass="button button--sm button--ghost" />
  }

  const { board, posts, total, totalPages, perPage } = data
  const offset = (data.page - 1) * perPage   // 서버가 범위를 넘는 페이지를 마지막 페이지로 고쳐 주므로 응답의 page 를 쓴다

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow">게시판</p>
          <h1 className="page-hero__title">{board.name}</h1>
          {board.description && <p className="page-hero__lead">{board.description}</p>}
        </div>
      </section>

      <section className="page-body">
        <div className="container">
          <div className="board-toolbar">
            <nav className="board-tabs" aria-label="게시판">
              {layout?.boards.map((b) => (
                <Link key={b.id} to={boardUrl(b.board_key)} className={b.id === board.id ? 'is-active' : undefined}>
                  {b.name}
                </Link>
              ))}
            </nav>
            {/* key: 주소의 검색어가 바뀌면(뒤로 가기 등) 입력칸을 새로 만들어 그 값으로 맞춘다 */}
            <BoardSearch key={boardKey + q} q={q} />
          </div>

          {/* 방문자가 글을 쓸 수 있는 게시판(자유게시판 등)에서만 안내 */}
          {board.can_write && <DemoNote />}
          <div className="board-meta">
            <span>
              총 <strong>{total}</strong>건{q && ` · "${q}" 검색 결과`}
            </span>
            <div className="board-meta__actions">
              {q && (
                <Link to={boardUrl(boardKey)} className="button button--sm button--ghost">
                  검색 초기화
                </Link>
              )}
              {board.can_write && (
                <Link to={`/boards/${boardKey}/write`} className="button button--sm button--primary">
                  글쓰기
                </Link>
              )}
            </div>
          </div>

          <table className="board-table" aria-busy={isPlaceholderData}>
            <thead>
              <tr>
                <th className="col-num">번호</th>
                <th>제목</th>
                <th className="col-author">작성자</th>
                <th className="col-date">작성일</th>
                <th className="col-hits">조회</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="board-table__empty">
                    {q ? '검색 결과가 없습니다.' : '아직 글이 없습니다.'}
                  </td>
                </tr>
              )}
              {posts.map((p, i) => (
                <tr key={p.id} className={p.is_notice ? 'is-notice' : undefined}>
                  <td className="col-num">{p.is_notice ? <span className="tag tag--notice">공지</span> : total - offset - i}</td>
                  <td className="col-title">
                    <Link to={`/posts/${p.id}`}>{p.title}</Link>
                  </td>
                  <td className="col-author">
                    {p.author}
                    {p.by_admin && (
                      <>
                        {' '}
                        <span className="tag tag--dark">관리자</span>
                      </>
                    )}
                  </td>
                  <td className="col-date">{formatDate(p.created_at)}</td>
                  <td className="col-hits">{p.hits}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pager page={data.page} totalPages={totalPages} to={(n) => boardUrl(boardKey, { page: n, q })} />
        </div>
      </section>
    </>
  )
}

// 검색창 — 입력 중인 글자는 state 로 들고 있다가, 제출할 때만 주소에 반영한다 (검색하면 1페이지부터)
function BoardSearch({ q }: { q: string }) {
  const [, setSearchParams] = useSearchParams()
  const [draft, setDraft] = useState(q)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = draft.trim()
    setSearchParams(next ? { q: next } : {})
  }

  return (
    <form className="board-search" role="search" onSubmit={submit}>
      <input type="search" name="q" placeholder="제목·내용·작성자 검색" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="검색어" />
      {/* 검색은 보조 동작 → 입력칸 안의 아이콘 버튼. 채운 버튼은 이 화면의 주 동작(글쓰기) 하나만 */}
      <button className="board-search__submit" aria-label="검색">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  )
}
