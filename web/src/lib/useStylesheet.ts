// 레이아웃별 CSS 를 그 레이아웃이 화면에 있을 때만 붙인다
// 사용자 화면(site.css)과 관리자(admin.css)가 body·:root 를 서로 다르게 정의해서, 둘을 동시에 두면 덮어쓴다
import { useLayoutEffect } from 'react'

export function useStylesheet(css: string) {
  // useLayoutEffect: 화면을 그리기 전에 붙여서 스타일 없는 화면이 번쩍이지 않게
  useLayoutEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    return () => style.remove()
  }, [css])
}
