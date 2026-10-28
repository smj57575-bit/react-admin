// 홈 안의 구역 이동 탭 + scrollspy (스크롤 위치에 맞춰 지금 보고 있는 구역의 탭을 표시)
// 탭은 평범한 #앵커 링크라서 이동·뒤로 가기는 브라우저가 처리한다 (헤더 높이는 CSS scroll-padding-top 이 비켜 준다)
import { useEffect, useRef, useState } from 'react'

export interface SectionTab {
  id: string
  label: string
}

export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const [current, setCurrent] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 기준선(화면 높이의 45%)을 지난 구역 중 마지막 것이 "지금 보고 있는 구역"
    // 기준선을 화면 위쪽 끝이 아니라 가운데쯤에 두어야, 페이지 바닥 근처의 짧은 구역(FAQ)도 건너뛰지 않는다
    const update = () => {
      const sections = tabs.map((t) => document.getElementById(t.id)).filter((el) => el !== null)
      const last = sections.at(-1)
      if (!last) return
      const line = window.innerHeight * 0.45
      let id: string | null = null
      for (const el of sections) if (el.getBoundingClientRect().top <= line) id = el.id
      // 맨 아래까지 내렸는데 마지막 구역이 기준선에 못 미치면 마지막 구역으로
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom && last.getBoundingClientRect().top < window.innerHeight) id = last.id
      setCurrent(id)   // 같은 값이면 React 가 다시 그리지 않는다
    }
    update()
    window.addEventListener('scroll', update, { passive: true })   // 구역 몇 개 위치만 재는 가벼운 계산이라 바로 실행
    return () => window.removeEventListener('scroll', update)
  }, [tabs])

  // 모바일에서 탭 줄이 가로로 넘칠 때 현재 탭이 보이게 — 페이지는 건드리지 않고 탭 줄만 가로로 스크롤
  // (scrollIntoView 는 페이지 전체를 세로로도 움직여서 쓰지 않는다)
  useEffect(() => {
    const bar = barRef.current
    const tab = current ? bar?.querySelector<HTMLElement>(`[data-section="${current}"]`) : null
    if (bar && tab) bar.scrollTo({ left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' })
  }, [current])

  return (
    <nav className="section-tabs" aria-label="홈 구역">
      <div className="container section-tabs__inner" ref={barRef}>
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            data-section={t.id}
            className={t.id === current ? 'is-current' : undefined}
            aria-current={t.id === current ? 'location' : undefined}
          >
            {t.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
