// 띠배너 등록 / 수정 — 팔레트·색 선택기·색 코드가 서로 맞춰지고, 미리보기와 글자 대비(WCAG)를 바로 보여준다
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useNoticeBarPalette, useSaveSchedule, useScheduleRow } from '../../api/admin'
import type { NoticeBar } from '../../api/types'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { AdminForm } from './AdminForm'
import { useEditId, useMissingRedirect } from './editPage'
import { ScheduleFields } from './schedule/ScheduleFields'
import { SCHEDULE_DEFAULTS, scheduleInputFromRow } from './schedule/scheduleData'
import { useFormValues } from './useFormValues'
import { useUnsavedChanges } from './useUnsavedChanges'

const LIST = '/admin/notice-bars'
const MESSAGE_MAX = 120

type Palette = { hex: string; name: string }[]

export default function NoticeBarFormPage() {
  const id = useEditId()
  useAdminTitle(id ? '띠배너 수정' : '띠배너 등록')
  const row = useScheduleRow('notice-bars', id)
  const palette = useNoticeBarPalette()
  useMissingRedirect(row.error, LIST)

  if (palette.isPending || (id !== null && row.isPending)) return <Loading />
  if (palette.error) return <ErrorState error={palette.error} onRetry={palette.refetch} />
  if (id !== null && row.error) return <ErrorState error={row.error} onRetry={row.refetch} />
  return <NoticeBarForm key={id ?? 'new'} id={id} row={row.data?.row ?? null} palette={palette.data} />
}

// ---------- 글자색·대비 (WCAG 2) ----------
// 서버(notice_bars.php)와 같은 공식이라 미리보기 글자색이 실제 홈 화면과 같다
const LIGHT = '#FFFFFF'
const DARK = '#1E1B2E'
const HEX = /^#[0-9A-Fa-f]{6}$/

/** 상대 휘도: 0(검정) ~ 1(흰색) */
function luminance(hex: string) {
  return [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
}

/** 두 색의 대비 (1:1 ~ 21:1). 본문 글자는 4.5:1 이상이면 잘 읽힌다 */
function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** 배경색 → 더 잘 읽히는 글자색과 그 대비 */
function textColorFor(bg: string) {
  const light = contrastRatio(bg, LIGHT)
  const dark = contrastRatio(bg, DARK)
  return light >= dark ? { fg: LIGHT, ratio: light } : { fg: DARK, ratio: dark }
}

/** 입력한 색 코드 → '#RRGGBB' (틀리면 null). '#' 없이 써도 받아준다 (서버와 같은 규칙) */
function normalizeHex(value: string) {
  const hex = value.startsWith('#') ? value : '#' + value
  return HEX.test(hex) ? hex.toUpperCase() : null
}

function NoticeBarForm({ id, row, palette }: { id: number | null; row: NoticeBar | null; palette: Palette }) {
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveSchedule('notice-bars', id)
  const initialColor = (row && normalizeHex(row.bg_color)) ?? palette[0].hex
  const { values, set, update, dirty } = useFormValues({
    message: row?.message ?? '',
    bg_color: initialColor,
    dismissible: row?.dismissible ?? true,
    ...(row ? scheduleInputFromRow(row) : SCHEDULE_DEFAULTS),
  })
  const markSaved = useUnsavedChanges(dirty)

  // 미리보기 색 — 색 코드 칸을 고치는 중이라 형식이 틀려도 마지막으로 맞았던 색을 유지한다
  const [color, setColor] = useState(initialColor)
  // "직접 고르기"를 눌렀는지 — 팔레트에 있는 색이어도 직접 고르기 상태를 유지하려고
  const [customPicked, setCustomPicked] = useState(false)

  const selectedSwatch = customPicked || !palette.some((c) => c.hex === color) ? 'custom' : color
  const hexValid = normalizeHex(values.bg_color) !== null
  const { fg, ratio } = textColorFor(color)

  const applyColor = (hex: string, custom: boolean) => {
    setColor(hex)
    set('bg_color', hex)
    setCustomPicked(custom)
  }

  const typeHex = (value: string) => {
    set('bg_color', value)
    const hex = normalizeHex(value)
    if (hex) {
      setColor(hex)
      setCustomPicked(false)   // 팔레트에 있는 색을 입력하면 그 견본이 선택된다
    }
  }

  const submit = () =>
    save.mutate(values, {
      onSuccess: (result) => {
        markSaved()
        toast(result.message)
        navigate(LIST)
      },
    })

  return (
    <AdminForm submitLabel={id ? '수정 완료' : '등록'} cancelTo={LIST} error={save.error} pending={save.isPending} onSubmit={submit}>
      <div className="field">
        <label htmlFor="nbMessage">
          문구 <small>(홈 맨 위에 한 줄로 · {MESSAGE_MAX}자 이내, 짧을수록 잘 읽혀요)</small>
        </label>
        <input
          id="nbMessage"
          type="text"
          maxLength={MESSAGE_MAX}
          placeholder="예: 추석 연휴(9/30~10/3)에는 문의 답변이 늦어져요"
          value={values.message}
          onChange={(e) => set('message', e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="field" role="group" aria-labelledby="nbColorLabel">
        <label id="nbColorLabel">
          배경색 <small>(팔레트에서 고르거나 직접 찍기 · 글자색은 배경에 맞춰 자동)</small>
        </label>
        <div className="palette-picker" role="radiogroup" aria-label="배경색 팔레트">
          {palette.map((c) => (
            <label key={c.hex} className="swatch" title={`${c.name} ${c.hex}`}>
              <input type="radio" name="bg_swatch" value={c.hex} checked={selectedSwatch === c.hex} onChange={() => applyColor(c.hex, false)} />
              <span className="swatch__color" style={{ background: c.hex }} />
              <span className="swatch__name">{c.name}</span>
            </label>
          ))}
          <label className="swatch swatch--custom" title="직접 고르기">
            <input type="radio" name="bg_swatch" value="custom" checked={selectedSwatch === 'custom'} onChange={() => setCustomPicked(true)} />
            <input
              type="color"
              className="swatch__picker"
              value={color.toLowerCase()}
              onChange={(e) => applyColor(e.target.value.toUpperCase(), true)}
              onClick={() => setCustomPicked(true)}
              aria-label="배경색 직접 고르기"
            />
            <span className="swatch__name">직접 고르기</span>
          </label>
        </div>
        <div className="palette-hex">
          <input
            type="text"
            value={values.bg_color}
            onChange={(e) => typeHex(e.target.value)}
            maxLength={7}
            pattern="#?[0-9A-Fa-f]{6}"
            spellCheck={false}
            aria-label="배경색 코드"
          />
          <span className="text-sm text-muted" aria-live="polite" style={hexValid && ratio < 4.5 ? { color: 'var(--danger)' } : undefined}>
            {hexValid
              ? `글자색 ${fg === LIGHT ? '흰색' : '진한색'} · 대비 ${ratio.toFixed(1)}:1 ${ratio >= 4.5 ? '✓ 잘 읽혀요' : '⚠ 잘 안 읽힐 수 있어요'}`
              : '#RRGGBB 형식으로 입력하세요'}
          </span>
        </div>
      </div>

      <div className="field" role="group" aria-labelledby="nbPreviewLabel">
        <label id="nbPreviewLabel">미리보기</label>
        <div className="nb-preview" style={{ background: color, color: fg }}>
          <span>{values.message || '띠배너 문구가 여기에 보여요'}</span>
          <span className="nb-preview__close" aria-hidden="true">
            ×
          </span>
        </div>
      </div>

      <div className="field-row">
        <div className="field" role="group" aria-labelledby="nbDismissLabel">
          <label id="nbDismissLabel">닫기 버튼</label>
          <div style={{ paddingTop: 8 }}>
            <Switch checked={values.dismissible} onChange={(v) => set('dismissible', v)}>
              방문자가 ✕ 로 닫을 수 있게 <small className="text-muted">(닫으면 그날은 안 보여요)</small>
            </Switch>
          </div>
        </div>
        <div className="field" />
      </div>

      <ScheduleFields values={values} onChange={update} />
    </AdminForm>
  )
}
