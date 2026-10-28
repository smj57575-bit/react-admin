// 사용자 화면 공통 레이아웃 — 띠배너 · 헤더(홈 · 게시판▾) · 관리자 모드 표시 · 푸터
// 홈과 게시판 화면이 함께 쓴다. 각 화면은 <Outlet /> 자리에 들어간다
import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useParams } from 'react-router'
import { api } from '../api/client'
import { useSession } from '../api/session'
import type { LayoutResponse, LiveNoticeBar } from '../api/types'
import { useStylesheet } from '../lib/useStylesheet'
import siteCss from '../styles/site.css?inline'

export const layoutKey = ['layout'] as const
const YEAR = new Date().getFullYear()

export function useLayoutData() {
  return useQuery({ queryKey: layoutKey, queryFn: () => api<LayoutResponse>('/layout') })
}

export default function SiteLayout() {
  useStylesheet(siteCss)
  const { data } = useLayoutData()
  const { data: session } = useSession()
  const { pathname } = useLocation()
  const { key } = useParams()
  const isHome = pathname === '/'
  const isBoard = pathname.startsWith('/boards') || pathname.startsWith('/posts')

  return (
    <>
      {data?.noticeBar && <NoticeBar bar={data.noticeBar} />}
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="brand" onClick={() => isHome && window.scrollTo({ top: 0 })}>
            <span className="brand__mark" />
            Test Dev
          </Link>
          <nav className="site-nav" aria-label="주 메뉴">
            <NavLink to="/" end className={({ isActive }) => `site-nav__link${isActive ? ' is-current' : ''}`}>
              홈
            </NavLink>
            <div className="site-nav__group">
              <Link to="/boards" className={`site-nav__link${isBoard ? ' is-current' : ''}`} aria-haspopup="true" aria-current={isBoard ? 'page' : undefined}>
                게시판
                <svg className="site-nav__chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </Link>
              {/* 2뎁스: 마우스를 올리거나 키보드로 포커스하면 펼쳐진다 (터치 기기는 게시판 화면의 탭으로) */}
              <div className="site-nav__menu">
                {data?.boards.map((b) => (
                  <Link key={b.id} to={`/boards/${b.board_key}`} className={b.board_key === key ? 'is-current' : ''}>
                    <strong>{b.name}</strong>
                    {b.description && <small>{b.description}</small>}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {session?.admin && (
        // 관리자 모드 표시: 공지 띠배너와 구분되도록 왼쪽 아래에 떠 있는 작은 버튼
        <div className="admin-chip" role="status" title="관리자로 로그인되어 있어서 비공개 글도 보여요">
          <span className="admin-chip__dot" aria-hidden="true" />
          <span className="admin-chip__label">관리자 모드</span>
          <Link to="/admin">관리자 페이지 →</Link>
        </div>
      )}

      <main id="top">
        <Outlet />
      </main>
      {/* 다른 화면으로 가면 맨 위에서, 뒤로 가기면 보던 위치에서 시작 */}
      <ScrollRestoration />

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span>© {YEAR} Test Dev · 개발 연습용 페이지</span>
          <Link to="/admin/login">관리자</Link>
        </div>
      </footer>
    </>
  )
}

// 맨 위 띠배너 — 방문자가 ✕ 로 닫으면 그날은 안 보인다 (localStorage). 관리자가 수정하면 키가 바뀌어 다시 보인다
const today = () => new Date().toLocaleDateString('sv')   // YYYY-MM-DD

function readHidden(key: string) {
  try {
    return localStorage.getItem(key) === today()
  } catch {
    return false
  }
}

function NoticeBar({ bar }: { bar: LiveNoticeBar }) {
  const storageKey = 'notice-hide-' + bar.key
  const [hidden, setHidden] = useState(() => readHidden(storageKey))
  if (hidden) return null

  const close = () => {
    setHidden(true)
    try {
      localStorage.setItem(storageKey, today())
    } catch {
      /* 저장 못 해도 이번 화면에서는 닫힌다 */
    }
  }

  const style = { '--nb-bg': bar.bg_color, '--nb-fg': bar.fg } as CSSProperties
  return (
    <div className="notice-bar" style={style} role="region" aria-label="공지">
      <div className="container notice-bar__inner">
        {bar.link_url ? (
          <a className="notice-bar__text" href={bar.link_url} {...(bar.link_new_tab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {bar.message} <span aria-hidden="true">→</span>
          </a>
        ) : (
          <p className="notice-bar__text">{bar.message}</p>
        )}
        {bar.dismissible && (
          <button type="button" className="notice-bar__close" aria-label="공지 닫기" onClick={close}>
            ×
          </button>
        )}
      </div>
    </div>
  )
}
