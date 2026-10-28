// 홈 메인 배너 슬라이더 — 6초마다 자동 넘김, 이전/다음 · 점 버튼
// 마우스를 올리거나 키보드 포커스가 안에 있으면 멈추고, "동작 줄이기" 설정이면 자동 넘김을 하지 않는다
import { useEffect, useState } from 'react'
import type { Banner } from '../../../api/types'
import { uploadUrl } from '../../../lib/format'

const INTERVAL = 6000

const linkTarget = (b: Banner) => (b.link_new_tab ? { target: '_blank', rel: 'noopener noreferrer' } : {})

export function BannerSlider({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const count = banners.length

  // current 가 바뀔 때마다 타이머를 새로 건다 → 버튼으로 넘기면 거기서부터 다시 6초
  useEffect(() => {
    if (paused || reduceMotion || count < 2) return
    const timer = setTimeout(() => setCurrent((c) => (c + 1) % count), INTERVAL)
    return () => clearTimeout(timer)
  }, [current, paused, reduceMotion, count])

  const show = (n: number) => setCurrent((n + count) % count)

  return (
    <section
      className="banner"
      id="banner"
      aria-roledescription="carousel"
      aria-label="메인 배너"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {banners.map((b, i) => {
        const active = i === current
        const slideProps = {
          className: `banner__slide${active ? ' is-active' : ''}`,
          'aria-roledescription': 'slide',
          'aria-label': `${i + 1} / ${count}`,
          'aria-hidden': !active || undefined,
        }
        const content = (
          <>
            <img className="banner__image" src={uploadUrl(b.image_path)} alt="" {...(i === 0 ? { fetchPriority: 'high' } : { loading: 'lazy' })} />
            <div className="container banner__content">
              <h1 className="banner__title">{b.title}</h1>
              {b.subtitle && <p className="banner__subtitle">{b.subtitle}</p>}
              {b.link_url && b.button_text && (
                <a href={b.link_url} className="button button--light" tabIndex={active ? undefined : -1} {...linkTarget(b)}>
                  {b.button_text}
                </a>
              )}
            </div>
          </>
        )
        // 버튼 문구가 없으면 배너 전체가 링크
        return b.link_url && !b.button_text ? (
          <a key={b.id} href={b.link_url} tabIndex={active ? undefined : -1} {...linkTarget(b)} {...slideProps}>
            {content}
          </a>
        ) : (
          <div key={b.id} {...slideProps}>
            {content}
          </div>
        )
      })}

      {count > 1 && (
        <div className="container banner__controls">
          <button type="button" className="banner__arrow" aria-label="이전 배너" onClick={() => show(current - 1)}>
            ‹
          </button>
          <div className="banner__dots">
            {banners.map((b, i) => (
              <button key={b.id} type="button" className={`banner__dot${i === current ? ' is-active' : ''}`} aria-label={`${i + 1}번 배너`} onClick={() => show(i)} />
            ))}
          </div>
          <button type="button" className="banner__arrow" aria-label="다음 배너" onClick={() => show(current + 1)}>
            ›
          </button>
        </div>
      )}
    </section>
  )
}
