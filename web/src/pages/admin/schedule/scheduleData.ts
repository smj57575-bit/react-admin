// 노출 일정 공통 값 — 상태 이름, 새 항목의 기본값, DB 행 → 폼 값 변환
import type { Schedule, ScheduleInput, ScheduleStatus } from '../../../api/types'
import { toDateTimeInput } from '../../../lib/format'

/** 상태 → [이름, 배지 클래스] (서버 SCHEDULE_STATUS_LABELS 와 같다). 순서가 곧 상태 카드 순서 */
export const STATUS_LABELS: Record<ScheduleStatus, [string, string]> = {
  live: ['노출 중', 'badge--success'],
  scheduled: ['예약', 'badge--primary'],
  ended: ['기간 종료', 'badge--muted'],
  off: ['OFF', 'badge--muted'],
}

/** 새 항목의 기본값 (서버 SCHEDULE_FORM_DEFAULTS 와 같다) */
export const SCHEDULE_DEFAULTS: ScheduleInput = { link_url: '', link_new_tab: false, is_active: true, starts_at: '', ends_at: '', sort_order: '0' }

/** 수정 화면의 처음 값 — null 은 빈 칸으로, 날짜는 datetime-local 형식으로 */
export function scheduleInputFromRow(row: Schedule): ScheduleInput {
  return {
    link_url: row.link_url ?? '',
    link_new_tab: row.link_new_tab,
    is_active: row.is_active,
    starts_at: toDateTimeInput(row.starts_at),
    ends_at: toDateTimeInput(row.ends_at),
    sort_order: String(row.sort_order),
  }
}
