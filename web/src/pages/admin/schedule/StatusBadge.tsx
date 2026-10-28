// 노출 상태 배지 (노출 중 · 예약 · 기간 종료 · OFF)
import type { ScheduleStatus } from '../../../api/types'
import { STATUS_LABELS } from './scheduleData'

export function StatusBadge({ status }: { status: ScheduleStatus }) {
  const [label, className] = STATUS_LABELS[status]
  return <span className={`badge ${className}`}>{label}</span>
}
