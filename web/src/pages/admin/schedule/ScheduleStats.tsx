// 상태별 개수 카드 (노출 중 · 예약 · 기간 종료 · OFF) — 팝업·배너·띠배너 목록 위
import type { ScheduleStatus } from '../../../api/types'
import { STATUS_LABELS } from './scheduleData'

export function ScheduleStats({ counts }: { counts: Record<ScheduleStatus, number> }) {
  return (
    <div className="stats">
      {(Object.keys(STATUS_LABELS) as ScheduleStatus[]).map((status) => (
        <div className="stat" key={status}>
          <div>
            <div className="stat__label">{STATUS_LABELS[status][0]}</div>
            <div className="stat__value">{counts[status]}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
