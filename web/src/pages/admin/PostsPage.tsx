// 글 관리 — 통계, 게시판 탭(?board_id=), 검색(?q=), 페이지(?page=), 체크한 글 일괄 공개/비공개/이동/삭제
// 필터·페이지는 모두 주소에 둔다 → 새로고침·뒤로 가기·주소 공유가 그대로 된다
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAdminPosts, useBulkPosts, useDeletePost, type BulkInput } from '../../api/admin'
import type { BulkAction } from '../../api/types'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { Pager } from '../../components/Pager'
import { ErrorState, Loading } from '../../components/QueryState'
import { useToast } from '../../components/Toast'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { DeleteConfirm, type DeleteTarget } from './DeleteConfirm'

// 통계 카드 아이콘 (예전 화면과 같은 선 아이콘)
const STAT_ICONS: Record<'total' | 'published' | 'hidden' | 'today', ReactNode> = {
  total: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  published: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  hidden: <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />,
  today: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
}

const STAT_LABELS = { total: '전체 글', published: '공개 글', hidden: '비공개 글', today: '오늘 작성' } as const

/** 글 관리 주소 만들기 — 빈 값은 빼서 주소를 짧게 */
function postsUrl(params: { board_id?: number | null; q?: string; page?: number }) {
  const search = new URLSearchParams()
  if (params.board_id) search.set('board_id', String(params.board_id))
  if (params.q) search.set('q', params.q)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  return '/admin/posts' + (search.size ? '?' + search : '')
}

export default function PostsPage() {
  useAdminTitle('글 관리')
  const toast = useToast()
  const [params] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const boardId = Number(params.get('board_id')) || null
  const page = Math.max(1, Number(params.get('page')) || 1)

  const { data, error, isPending, refetch } = useAdminPosts({ q, boardId, page })
  const remove = useDeletePost()
  const bulk = useBulkPosts()
  const [target, setTarget] = useState<DeleteTarget | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [moveTo, setMoveTo] = useState<number | null>(null)

  // 체크한 글 — 필터·페이지(주소)가 바뀌면 자동으로 비워지도록 주소와 함께 기억한다
  const listKey = params.toString()
  const [selection, setSelection] = useState<{ key: string; ids: number[] }>({ key: listKey, ids: [] })
  const selected = selection.key === listKey ? selection.ids : []
  const setSelected = (ids: number[]) => setSelection({ key: listKey, ids })

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const { posts, boards, stats } = data
  const board = boards.find((b) => b.id === boardId) ?? null   // 없는 게시판 번호면 전체
  const boardName = (id: number) => boards.find((b) => b.id === id)?.name ?? '-'
  const allChecked = posts.length > 0 && posts.every((p) => selected.includes(p.id))
  const targetBoard = moveTo ?? boards[0]?.id

  const toggleOne = (id: number, checked: boolean) => setSelected(checked ? [...selected, id] : selected.filter((x) => x !== id))

  const runBulk = (action: BulkAction) => {
    if (selected.length === 0) return toast('글을 선택하세요.', 'warning')
    if (action === 'delete') return setBulkDeleteOpen(true)   // 삭제만 한 번 더 확인
    sendBulk({ ids: selected, action, target_board: action === 'move' ? targetBoard : undefined })
  }

  const sendBulk = (input: BulkInput) =>
    bulk.mutate(input, {
      onSuccess: (result) => {
        toast(result.message)
        setSelected([])
      },
      onError: (e) => toast(e.message, 'error'),
      onSettled: () => setBulkDeleteOpen(false),
    })

  return (
    <>
      <div className="stats">
        {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map((key) => (
          <div className="stat" key={key}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {STAT_ICONS[key]}
            </svg>
            <div>
              <div className="stat__label">{STAT_LABELS[key]}</div>
              <div className="stat__value">{stats[key]}</div>
            </div>
          </div>
        ))}
      </div>

      <nav className="tabs" aria-label="게시판 필터">
        <Link to="/admin/posts" className={board ? '' : 'is-active'}>
          전체
        </Link>
        {boards.map((b) => (
          <Link key={b.id} to={postsUrl({ board_id: b.id })} className={b.id === board?.id ? 'is-active' : ''}>
            {b.name}
            {!b.is_active && <span className="badge badge--muted">OFF</span>}
          </Link>
        ))}
      </nav>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            {board ? board.name : '전체 글'}{' '}
            <small>
              총 {data.total}건{q && ` · "${q}" 검색`}
            </small>
          </h2>
          <div className="btn-row">
            {q && (
              <Link to={postsUrl({ board_id: board?.id })} className="btn btn--ghost btn--sm">
                검색 초기화
              </Link>
            )}
            <Link to={'/admin/posts/new' + (board ? `?board_id=${board.id}` : '')} className="btn btn--primary">
              글쓰기
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    aria-label="전체 선택"
                    checked={allChecked}
                    // 일부만 골랐을 때는 '-' 모양 (HTML 속성이 없어 DOM 에 직접 넣는다)
                    ref={(el) => {
                      if (el) el.indeterminate = selected.length > 0 && !allChecked
                    }}
                    onChange={(e) => setSelected(e.target.checked ? posts.map((p) => p.id) : [])}
                  />
                </th>
                <th style={{ width: 60 }}>번호</th>
                <th style={{ width: 110 }}>게시판</th>
                <th>제목</th>
                <th style={{ width: 130 }}>작성자</th>
                <th style={{ width: 80 }}>상태</th>
                <th style={{ width: 150 }}>작성일</th>
                <th style={{ width: 60 }}>순서</th>
                <th style={{ width: 60 }}>조회</th>
                <th style={{ width: 120 }} aria-label="관리" />
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty">
                    게시글이 없습니다.
                  </td>
                </tr>
              )}
              {posts.map((p) => (
                <tr key={p.id} className={p.is_published ? '' : 'is-hidden'}>
                  <td>
                    <input type="checkbox" className="checkbox" aria-label={`${p.title} 선택`} checked={selected.includes(p.id)} onChange={(e) => toggleOne(p.id, e.target.checked)} />
                  </td>
                  <td className="num">{p.id}</td>
                  <td>{boardName(p.board_id)}</td>
                  <td>
                    {p.is_notice && <span className="badge badge--danger">공지</span>}{' '}
                    <Link to={`/posts/${p.id}`} className="link">
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    {p.author}
                    {p.by_admin && <> <span className="badge badge--dark">관리자</span></>}
                  </td>
                  <td>{p.is_published ? <span className="badge badge--success">공개</span> : <span className="badge badge--muted">비공개</span>}</td>
                  <td className="num">{p.created_at}</td>
                  <td className="num">{p.priority}</td>
                  <td className="num">{p.hits}</td>
                  <td className="actions">
                    <Link to={`/admin/posts/${p.id}`} className="btn btn--ghost btn--sm">
                      수정
                    </Link>{' '}
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setTarget({ id: p.id, name: p.title })}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="btn-row mt-16" role="group" aria-label="선택한 글 일괄 처리">
          <span className="text-muted">선택한 글{selected.length > 0 && ` ${selected.length}개`}:</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => runBulk('publish')} disabled={bulk.isPending}>
            공개
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => runBulk('unpublish')} disabled={bulk.isPending}>
            비공개
          </button>
          <span className="btn-group">
            <select className="select select--sm" aria-label="이동할 게시판" value={targetBoard} onChange={(e) => setMoveTo(Number(e.target.value))}>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => runBulk('move')} disabled={bulk.isPending}>
              로 이동
            </button>
          </span>
          <button type="button" className="btn btn--danger btn--sm" onClick={() => runBulk('delete')} disabled={bulk.isPending}>
            삭제
          </button>
        </div>

        <Pager page={data.page} totalPages={data.totalPages} to={(n) => postsUrl({ board_id: board?.id, q, page: n })} />
      </section>

      <DeleteConfirm target={target} title="글을 삭제할까요?" mutation={remove} onClose={() => setTarget(null)} />
      <ConfirmSheet
        open={bulkDeleteOpen}
        title="선택한 글을 삭제할까요?"
        name={`글 ${selected.length}개`}
        pending={bulk.isPending}
        onConfirm={() => sendBulk({ ids: selected, action: 'delete' })}
        onClose={() => setBulkDeleteOpen(false)}
      />
    </>
  )
}
