// 브라우저 탭 제목 — 화면마다 usePageTitle('공지사항') 처럼 부른다
import { useEffect } from 'react'

export function usePageTitle(title: string | null, suffix = 'Test Dev') {
  useEffect(() => {
    document.title = title ? `${title} — ${suffix}` : `${suffix} — 관리자 기능 테스트`
  }, [title, suffix])
}
