// 저장하지 않은 변경 경고 — 예전 관리자 화면의 <form data-dirty-check> 와 같은 역할
// 두 갈래로 막는다: 앱 안의 이동(메뉴·취소 링크)은 라우터의 useBlocker, 새로고침·탭 닫기는 브라우저의 beforeunload
import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

/**
 * @param dirty 처음 값과 달라졌는지
 * @returns 저장에 성공해서 떠나도 될 때 부르는 함수 (부른 뒤 navigate)
 */
export function useUnsavedChanges(dirty: boolean) {
  // 저장 직후 navigate 는 같은 이벤트 안에서 일어나 dirty 상태가 아직 true 다 → ref 로 "이번 이동은 통과"를 알린다
  const savedRef = useRef(false)

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !savedRef.current && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('저장하지 않은 내용이 있어요. 이 화면을 떠날까요?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!dirty) return
    // preventDefault 만 하면 브라우저가 자체 문구로 "사이트에서 나가시겠습니까?"를 묻는다
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return () => {
    savedRef.current = true
  }
}
