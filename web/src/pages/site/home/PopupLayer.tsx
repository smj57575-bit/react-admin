// 홈 팝업 — 한 자리에 카드처럼 겹쳐 쌓고 맨 앞 카드만 조작할 수 있다 (데스크톱: 왼쪽 위, 모바일: 바텀시트)
// 겹치는 모양은 CSS 가 data-depth(0~3)와 --front-h(앞 카드 높이)로 그린다
// "오늘 하루 보지 않기"는 서버가 아니라 브라우저 localStorage 에 오늘 날짜를 적어 둔다
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { Popup } from '../../../api/types'
import { uploadUrl } from '../../../lib/format'
import { Multiline } from './Multiline'

const today = () => new Date().toLocaleDateString('sv')   // YYYY-MM-DD (브라우저 시간대)

// 키에 마지막 수정 시각을 넣어서, 관리자가 팝업을 고치면 숨김 기록이 저절로 무효가 된다
const storageKey = (p: Popup) => `popup-hide-${p.id}-${(p.updated_at ?? p.created_at).replace(/\D/g, '')}`

function isHiddenToday(p: Popup) {
  try {
    return localStorage.getItem(storageKey(p)) === today()
  } catch {
    return false   // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)는 그냥 보여준다
  }
}

export function PopupLayer({ popups }: { popups: Popup[] }) {
  const [open, setOpen] = useState(() => popups.filter((p) => !isHiddenToday(p)))
  const layerRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLElement>(null)

  // 뒤 카드는 앞 카드 높이만큼만 보이게 (키 큰 카드가 아래로 삐져나오지 않도록)
  const syncFrontHeight = useCallback(() => {
    if (layerRef.current && frontRef.current) {
      layerRef.current.style.setProperty('--front-h', frontRef.current.offsetHeight + 'px')
    }
  }, [])

  // 그리기 전에 재야 뒤 카드가 한 번 길게 보였다가 줄어드는 깜빡임이 없다
  useLayoutEffect(() => {
    syncFrontHeight()
    window.addEventListener('resize', syncFrontHeight)   // 화면 폭이 바뀌면 카드 높이도 바뀐다
    return () => window.removeEventListener('resize', syncFrontHeight)
  }, [open, syncFrontHeight])

  const close = (popup: Popup, forToday: boolean) => {
    if (forToday) {
      try {
        localStorage.setItem(storageKey(popup), today())
      } catch {
        /* 저장 못 해도 이번 화면에서는 닫힌다 */
      }
    }
    setOpen((list) => list.filter((p) => p.id !== popup.id))
  }

  // 모두 닫으면 레이어 자체를 없앤다 (모바일에서 어두운 배경이 화면 클릭을 막지 않도록)
  if (!open.length) return null

  return (
    <div className="popup-layer" ref={layerRef}>
      {open.map((p, i) => {
        const link = p.link_url ? { href: p.link_url, ...(p.link_new_tab ? { target: '_blank', rel: 'noopener noreferrer' } : {}) } : null
        const body = (
          <>
            {/* 이미지가 늦게 도착하면 앞 카드 높이가 바뀌므로 다시 잰다 */}
            {p.image_path && <img className="popup__image" src={uploadUrl(p.image_path)} alt={p.title} onLoad={i === 0 ? syncFrontHeight : undefined} />}
            {p.content !== null && (
              <div className="popup__text">
                <h2 className="popup__title">{p.title}</h2>
                <p>
                  <Multiline text={p.content} />
                </p>
              </div>
            )}
          </>
        )
        return (
          <section
            key={p.id}
            ref={i === 0 ? frontRef : undefined}
            className="popup"
            role="dialog"
            aria-label={p.title}
            data-depth={Math.min(i, 3)}
            inert={i > 0}   // 뒤 카드는 클릭·키보드 포커스 제외
          >
            <span className="popup__count" aria-hidden="true">
              {open.length > 1 ? `${i + 1} / ${open.length}` : ''}
            </span>
            {link ? (
              <a className="popup__body" {...link}>
                {body}
              </a>
            ) : (
              <div className="popup__body">{body}</div>
            )}
            <div className="popup__foot">
              <button type="button" data-popup-close="today" onClick={() => close(p, true)}>
                오늘 하루 보지 않기
              </button>
              <button type="button" data-popup-close="once" onClick={() => close(p, false)}>
                닫기
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
