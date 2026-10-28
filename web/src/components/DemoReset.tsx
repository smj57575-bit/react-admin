// 데모 데이터 초기화 버튼 — 데모 모드(GitHub Pages)에서만 관리자 사이드바 아래에 보인다
// 브라우저에 저장된 데모 DB 를 처음 데이터로 되돌리고, 화면이 들고 있던 캐시(react-query)도 비운다
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { resetDemoData } from '../api/client'
import { Icon } from './Icon'
import { useToast } from './Toast'

export function DemoResetButton() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [pending, setPending] = useState(false)

  const reset = async () => {
    if (!window.confirm('데모 데이터를 처음 상태로 되돌릴까요?\n이 브라우저에서 바꾼 글·배너·팝업·FAQ가 모두 사라져요.')) return
    setPending(true)
    await resetDemoData()
    // 캐시를 비우고, 지금 화면에 떠 있는 데이터는 바로 다시 받는다 (그대로 두면 지운 데이터가 계속 보인다)
    // 로그인 상태(session)는 초기화와 상관없어서 남긴다 — 비우면 관리자 화면 전체가 로딩으로 바뀌며 깜빡인다
    await queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
    setPending(false)
    toast('데모 데이터를 처음 상태로 되돌렸어요')
  }

  return (
    <button type="button" className="nav-item" onClick={reset} disabled={pending}>
      <Icon name="reset" /> {pending ? '되돌리는 중…' : '데모 데이터 초기화'}
    </button>
  )
}
