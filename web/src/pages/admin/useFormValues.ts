// 폼 입력값 상태 — 모든 관리자 폼이 같은 방식으로 값을 들고, 처음 값과 비교해 "바뀌었는지(dirty)"를 안다
import { useState } from 'react'

export function useFormValues<T extends object>(initial: T) {
  const [values, setValues] = useState(initial)

  /** 칸 하나 바꾸기 — set('title', '새 제목') */
  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((prev) => ({ ...prev, [key]: value }))

  /** 여러 칸을 한 번에 — update({ link_url: '…' }). 공통 입력칸 묶음(ScheduleFields)이 쓴다 */
  const update = (patch: Partial<T>) => setValues((prev) => ({ ...prev, ...patch }))

  // 칸마다 처음 값과 비교한다. 지웠다가 다시 쓰면 원래대로(바뀌지 않음)로 본다
  const dirty = (Object.keys(initial) as (keyof T)[]).some((key) => values[key] !== initial[key])

  return { values, set, update, dirty }
}
