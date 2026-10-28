// ON/OFF 스위치 — 체크박스를 스위치 모양으로 (관리자 목록·폼 공통)
import type { ReactNode } from 'react'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** 스크린리더용 이름 (옆에 글자가 없을 때 꼭 넣는다) */
  label?: string
  disabled?: boolean
  children?: ReactNode
}

export function Switch({ checked, onChange, label, disabled, children }: SwitchProps) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" />
      {children}
    </label>
  )
}
