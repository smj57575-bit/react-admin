// 앱 시작점 — 서버 데이터 캐시(TanStack Query)와 라우터를 연결한다
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { ApiError } from './api/client'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,   // 30초 안에 같은 화면으로 돌아오면 다시 요청하지 않는다
      // 404·401 같은 "다시 해도 같은" 오류는 재시도하지 않고, 네트워크 오류만 한 번 더
      retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
