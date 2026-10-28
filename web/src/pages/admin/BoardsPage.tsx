// 게시판 관리 — 게시판별 글 수, 사용자 노출 ON/OFF, 삭제 (글이 남은 게시판은 서버가 거절한다)
import { useState } from 'react'
import { Link } from 'react-router'
import { useAdminBoards, useDeleteBoard, useToggleBoard } from '../../api/admin'
import type { AdminBoard } from '../../api/types'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { DeleteConfirm, type DeleteTarget } from './DeleteConfirm'

export default function BoardsPage() {
  useAdminTitle('게시판 관리')
  const toast = useToast()
  const { data, error, isPending, refetch } = useAdminBoards()
  const toggle = useToggleBoard()
  const remove = useDeleteBoard()
  const [target, setTarget] = useState<DeleteTarget | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  // 글이 있는 게시판은 확인을 받아도 어차피 지울 수 없으니 바로 서버에 물어 이유(409 메시지)를 보여준다 (예전 화면과 같은 흐름)
  const askDelete = (b: AdminBoard) => {
    if (!b.post_count) return setTarget({ id: b.id, name: b.name })
    remove.mutate(b.id, { onSuccess: () => toast('삭제했어요'), onError: (e) => toast(e.message, 'error') })
  }

  return (
    <>
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            게시판 목록 <small>순서가 작은 게시판부터 메뉴·탭에 표시됩니다</small>
          </h2>
          <Link to="/admin/boards/new" className="btn btn--primary">
            게시판 추가
          </Link>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>순서</th>
                <th>이름</th>
                <th style={{ width: 140 }}>주소</th>
                <th style={{ width: 130 }}>글쓰기</th>
                <th style={{ width: 110 }}>글 (공개/전체)</th>
                <th style={{ width: 90 }}>노출</th>
                <th style={{ width: 120 }} aria-label="관리" />
              </tr>
            </thead>
            <tbody>
              {data.boards.map((b) => (
                <tr key={b.id} className={b.is_active ? '' : 'is-hidden'}>
                  <td className="num">{b.sort_order}</td>
                  <td>
                    <Link to={`/admin/boards/${b.id}`} className="link">
                      {b.name}
                    </Link>
                    {b.description && <div className="text-muted text-sm text-ellipsis">{b.description}</div>}
                  </td>
                  <td>
                    <a href={`/boards/${b.board_key}`} className="text-muted" target="_blank" rel="noopener">
                      {b.board_key}
                    </a>
                  </td>
                  <td>{b.allow_user_write ? <span className="badge badge--primary">방문자 가능</span> : <span className="badge badge--dark">관리자만</span>}</td>
                  <td className="num">
                    <Link to={`/admin/posts?board_id=${b.id}`} className="link">
                      {b.published_count ?? 0} / {b.post_count ?? 0}
                    </Link>
                  </td>
                  <td>
                    <Switch checked={b.is_active} onChange={() => toggle.mutate(b)} label={`${b.name} 노출`} disabled={toggle.isPending && toggle.variables.id === b.id} />
                  </td>
                  <td className="actions">
                    <Link to={`/admin/boards/${b.id}`} className="btn btn--ghost btn--sm">
                      수정
                    </Link>{' '}
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => askDelete(b)} disabled={remove.isPending && remove.variables === b.id}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted text-sm mt-16">
          노출을 OFF 로 바꾸면 홈페이지·게시판 메뉴에서 사라지고 그 게시판의 글도 방문자에게 보이지 않습니다. 관리자는 계속 볼 수 있습니다.
        </p>
      </section>

      <DeleteConfirm target={target} title="게시판을 삭제할까요?" mutation={remove} onClose={() => setTarget(null)} />
    </>
  )
}
