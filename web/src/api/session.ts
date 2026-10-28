// 로그인 상태 — 앱 어디서든 useSession() 으로 "지금 관리자인가?"를 묻는다
// 화면에서 버튼을 숨기는 건 편의일 뿐이고, 실제 권한은 서버(API)가 요청마다 다시 확인한다
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, setCsrfToken } from './client'
import type { Session } from './types'

export const sessionKey = ['session'] as const

async function fetchSession() {
  const session = await api<Session>('/session')
  setCsrfToken(session.csrf)
  return session
}

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: fetchSession, staleTime: 5 * 60_000 })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; password: string }) => api<Session>('/login', { method: 'POST', json: input }),
    onSuccess: (session) => {
      setCsrfToken(session.csrf)
      queryClient.setQueryData(sessionKey, session)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api<Session>('/logout', { method: 'POST' }),
    onSuccess: (session) => {
      setCsrfToken(session.csrf)
      queryClient.clear()   // 관리자 데이터 캐시를 남기지 않는다
      queryClient.setQueryData(sessionKey, { ...session, adminName: null })
    },
  })
}
