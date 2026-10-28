// 노출 일정 입력칸 (링크 · 새 창 · 기간 · 순서 · ON/OFF) — 팝업·배너·띠배너 폼이 같이 쓴다
import type { ScheduleInput } from '../../../api/types'
import { Switch } from '../../../components/Switch'

const LINK_URL_MAX = 500

interface ScheduleFieldsProps {
  values: ScheduleInput
  /** 바뀐 칸만 담아 알린다 — onChange({ link_url: '…' }) */
  onChange: (patch: Partial<ScheduleInput>) => void
}

export function ScheduleFields({ values, onChange }: ScheduleFieldsProps) {
  return (
    <>
      <div className="field-row">
        <div className="field">
          <label htmlFor="linkUrl">
            링크 <small>(선택 · 클릭 시 이동)</small>
          </label>
          <input id="linkUrl" type="url" maxLength={LINK_URL_MAX} placeholder="https://" value={values.link_url} onChange={(e) => onChange({ link_url: e.target.value })} />
        </div>
        <div className="field" role="group" aria-labelledby="linkTabLabel">
          <label id="linkTabLabel">링크 열기</label>
          <div style={{ paddingTop: 8 }}>
            <Switch checked={values.link_new_tab} onChange={(v) => onChange({ link_new_tab: v })}>
              새 창으로 열기
            </Switch>
          </div>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="startsAt">
            노출 시작일 <small>(비우면 즉시)</small>
          </label>
          <input id="startsAt" type="datetime-local" value={values.starts_at} onChange={(e) => onChange({ starts_at: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="endsAt">
            노출 종료일 <small>(비우면 무기한)</small>
          </label>
          <input id="endsAt" type="datetime-local" value={values.ends_at} onChange={(e) => onChange({ ends_at: e.target.value })} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="sortOrder">
            표시 순서 <small>(작을수록 먼저)</small>
          </label>
          <input id="sortOrder" type="number" min={-9999} max={9999} step={1} value={values.sort_order} onChange={(e) => onChange({ sort_order: e.target.value })} />
        </div>
        <div className="field" role="group" aria-labelledby="activeLabel">
          <label id="activeLabel">노출</label>
          <div style={{ paddingTop: 8 }}>
            <Switch checked={values.is_active} onChange={(v) => onChange({ is_active: v })}>
              ON <small className="text-muted">(OFF 면 기간과 상관없이 숨김)</small>
            </Switch>
          </div>
        </div>
      </div>
    </>
  )
}
