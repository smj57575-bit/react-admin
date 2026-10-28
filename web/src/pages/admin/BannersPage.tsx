// 배너 관리 — 홈 상단 슬라이드 배너. 상태별 개수, 목록, 새로고침 없는 ON/OFF, 삭제
import { useState } from 'react'
import { Link } from 'react-router'
import { useDeleteSchedule, useScheduleList, useToggleSchedule } from '../../api/admin'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { appUrl, schedulePeriod, uploadUrl } from '../../lib/format'
import { DeleteConfirm, type DeleteTarget } from './DeleteConfirm'
import { ScheduleStats } from './schedule/ScheduleStats'
import { StatusBadge } from './schedule/StatusBadge'

export default function BannersPage() {
  useAdminTitle('배너 관리')
  const { data, error, isPending, refetch } = useScheduleList('banners')
  const toggle = useToggleSchedule('banners')
  const remove = useDeleteSchedule('banners')
  const [target, setTarget] = useState<DeleteTarget | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  return (
    <>
      <ScheduleStats counts={data.counts} />

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            메인 배너 <small>노출 중인 배너가 홈페이지 상단에서 순서대로 넘어갑니다 · 없으면 기본 소개 문구가 보입니다</small>
          </h2>
          <div className="btn-row">
            <a href={appUrl()} className="btn btn--ghost" target="_blank" rel="noopener">
              홈페이지 보기
            </a>
            <Link to="/admin/banners/new" className="btn btn--primary">
              배너 등록
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>순서</th>
                <th style={{ width: 120 }}>이미지</th>
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
                    등록된 배너가 없습니다.
                  </td>
                </tr>
              )}
              {data.rows.map((b) => (
                <tr key={b.id} className={b.status === 'live' ? '' : 'is-hidden'}>
                  <td className="num">{b.sort_order}</td>
                  <td>
                    <img className="thumb thumb--wide" src={uploadUrl(b.image_path)} alt="" />
                  </td>
                  <td>
                    <Link to={`/admin/banners/${b.id}`} className="link">
                      {b.title}
                    </Link>
                    {b.subtitle && <div className="text-muted text-sm text-ellipsis">{b.subtitle}</div>}
                  </td>
                  <td className="num">{schedulePeriod(b)}</td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td>
                    <Switch checked={b.is_active} onChange={() => toggle.mutate(b)} label={`${b.title} 노출`} disabled={toggle.isPending && toggle.variables.id === b.id} />
                  </td>
                  <td className="actions">
                    <Link to={`/admin/banners/${b.id}`} className="btn btn--ghost btn--sm">
                      수정
                    </Link>{' '}
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setTarget({ id: b.id, name: b.title })}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DeleteConfirm target={target} title="배너를 삭제할까요?" detail="배너 이미지 파일도 함께 지워져요." mutation={remove} onClose={() => setTarget(null)} />
    </>
  )
}
