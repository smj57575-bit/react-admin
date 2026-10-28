// 팝업 관리 — 상태별 개수, 목록, 새로고침 없는 ON/OFF, 삭제
import { useState } from 'react'
import { Link } from 'react-router'
import { useDeleteSchedule, useScheduleList, useToggleSchedule } from '../../api/admin'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { schedulePeriod, uploadUrl } from '../../lib/format'
import { DeleteConfirm, type DeleteTarget } from './DeleteConfirm'
import { ScheduleStats } from './schedule/ScheduleStats'
import { StatusBadge } from './schedule/StatusBadge'

export default function PopupsPage() {
  useAdminTitle('팝업 관리')
  const { data, error, isPending, refetch } = useScheduleList('popups')
  const toggle = useToggleSchedule('popups')
  const remove = useDeleteSchedule('popups')
  const [target, setTarget] = useState<DeleteTarget | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  return (
    <>
      <ScheduleStats counts={data.counts} />

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            팝업 목록 <small>총 {data.rows.length}개 · 순서가 작은 팝업부터 홈페이지에 표시됩니다</small>
          </h2>
          <div className="btn-row">
            <a href="/" className="btn btn--ghost" target="_blank" rel="noopener">
              홈페이지 보기
            </a>
            <Link to="/admin/popups/new" className="btn btn--primary">
              팝업 등록
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>순서</th>
                <th style={{ width: 76 }}>이미지</th>
                <th>제목</th>
                <th style={{ width: 280 }}>노출 기간</th>
                <th style={{ width: 90 }}>상태</th>
                <th style={{ width: 90 }}>ON/OFF</th>
                <th style={{ width: 120 }} aria-label="관리" />
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    등록된 팝업이 없습니다.
                  </td>
                </tr>
              )}
              {data.rows.map((p) => (
                <tr key={p.id} className={p.status === 'live' ? '' : 'is-hidden'}>
                  <td className="num">{p.sort_order}</td>
                  <td>{p.image_path ? <img className="thumb" src={uploadUrl(p.image_path)} alt="" /> : <span className="thumb thumb--empty">텍스트</span>}</td>
                  <td>
                    <Link to={`/admin/popups/${p.id}`} className="link">
                      {p.title}
                    </Link>
                    {p.link_url && <div className="text-muted text-sm text-ellipsis">{p.link_url}</div>}
                  </td>
                  <td className="num">{schedulePeriod(p)}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    <Switch checked={p.is_active} onChange={() => toggle.mutate(p)} label={`${p.title} 노출`} disabled={toggle.isPending && toggle.variables.id === p.id} />
                  </td>
                  <td className="actions">
                    <Link to={`/admin/popups/${p.id}`} className="btn btn--ghost btn--sm">
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
      </section>

      <DeleteConfirm target={target} title="팝업을 삭제할까요?" mutation={remove} onClose={() => setTarget(null)} />
    </>
  )
}
