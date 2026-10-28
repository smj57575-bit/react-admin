// 띠배너 관리 — 홈 맨 위 한 줄 공지. 노출 중인 것이 여러 개면 순서가 가장 앞선 하나(shownId)만 홈에 보인다
import { useState } from 'react'
import { Link } from 'react-router'
import { useDeleteSchedule, useScheduleList, useToggleSchedule } from '../../api/admin'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { appUrl, schedulePeriod } from '../../lib/format'
import { DeleteConfirm, type DeleteTarget } from './DeleteConfirm'
import { ScheduleStats } from './schedule/ScheduleStats'
import { StatusBadge } from './schedule/StatusBadge'

export default function NoticeBarsPage() {
  useAdminTitle('띠배너 관리')
  const { data, error, isPending, refetch } = useScheduleList('notice-bars')
  const toggle = useToggleSchedule('notice-bars')
  const remove = useDeleteSchedule('notice-bars')
  const [target, setTarget] = useState<DeleteTarget | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  // 색 코드 → 팔레트 이름 (팔레트에 없는 색은 코드 그대로)
  const colorName = (hex: string) => data.palette.find((c) => c.hex === hex)?.name ?? hex

  return (
    <>
      <ScheduleStats counts={data.counts} />

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            띠배너 목록 <small>노출 중인 것이 여러 개면 순서가 가장 앞선 하나만 홈 맨 위에 보여요</small>
          </h2>
          <div className="btn-row">
            <a href={appUrl()} className="btn btn--ghost" target="_blank" rel="noopener">
              홈페이지 보기
            </a>
            <Link to="/admin/notice-bars/new" className="btn btn--primary">
              띠배너 등록
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>순서</th>
                <th>문구</th>
                <th style={{ width: 150 }}>배경색</th>
                <th style={{ width: 260 }}>노출 기간</th>
                <th style={{ width: 120 }}>상태</th>
                <th style={{ width: 90 }}>ON/OFF</th>
                <th style={{ width: 120 }} aria-label="관리" />
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    등록된 띠배너가 없어요. 짧은 공지 한 줄을 홈 맨 위에 띄울 수 있어요.
                  </td>
                </tr>
              )}
              {data.rows.map((b) => (
                <tr key={b.id} className={b.status === 'live' ? '' : 'is-hidden'}>
                  <td className="num">{b.sort_order}</td>
                  <td>
                    <Link to={`/admin/notice-bars/${b.id}`} className="link">
                      {b.message}
                    </Link>
                    {b.link_url && <div className="text-muted text-sm text-ellipsis">{b.link_url}</div>}
                  </td>
                  <td>
                    <span className="color-chip" style={{ background: b.bg_color }} title={b.bg_color} /> <span className="text-sm text-muted">{colorName(b.bg_color)}</span>
                  </td>
                  <td className="num">{schedulePeriod(b)}</td>
                  <td>
                    <StatusBadge status={b.status} />
                    {b.id === data.shownId && (
                      <div className="text-sm" style={{ marginTop: 4, color: 'var(--success)' }}>
                        ● 지금 홈에 표시
                      </div>
                    )}
                  </td>
                  <td>
                    <Switch checked={b.is_active} onChange={() => toggle.mutate(b)} label={`${b.message} 노출`} disabled={toggle.isPending && toggle.variables.id === b.id} />
                  </td>
                  <td className="actions">
                    <Link to={`/admin/notice-bars/${b.id}`} className="btn btn--ghost btn--sm">
                      수정
                    </Link>{' '}
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setTarget({ id: b.id, name: b.message })}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DeleteConfirm target={target} title="띠배너를 삭제할까요?" mutation={remove} onClose={() => setTarget(null)} />
    </>
  )
}
