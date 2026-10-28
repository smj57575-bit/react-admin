// 관리자 레이아웃 — 사이드바 + 상단바 + 콘텐츠, 알림(토스트)
// 로그인하지 않았으면 로그인 화면으로 보낸다. (화면 보호는 편의일 뿐, 실제 권한은 API 가 요청마다 확인한다)
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { IS_DEMO } from '../api/client'
import { useLogout, useSession } from '../api/session'
import { DemoResetButton } from '../components/DemoReset'
import { Icon, type IconName } from '../components/Icon'
import { Loading } from '../components/QueryState'
import { ToastProvider } from '../components/Toast'
import { appUrl } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'
import { useStylesheet } from '../lib/useStylesheet'
import adminCss from '../styles/admin.css?inline'

// 관리자 메뉴 — 새 관리 기능은 여기에 한 줄 추가 [아이콘, 이름, 주소]
// 등록·수정 화면(/admin/popups/new 등)도 주소가 메뉴 주소로 시작하면 그 메뉴가 선택돼 보인다
const MENUS: [IconName, string, string][] = [
  ['list', '글 관리', '/admin/posts'],
  ['boards', '게시판 관리', '/admin/boards'],
  ['banner', '배너 관리', '/admin/banners'],
  ['popup', '팝업 관리', '/admin/popups'],
  ['faq', 'FAQ 관리', '/admin/faqs'],
  ['notice', '띠배너 관리', '/admin/notice-bars'],
]

// 상단바 제목 — 각 화면이 useAdminTitle('팝업 관리') 로 정한다
const TitleContext = createContext<(title: string) => void>(() => {})

export function useAdminTitle(title: string) {
  const setTitle = useContext(TitleContext)
  usePageTitle(title, '관리자')
  useEffect(() => setTitle(title), [title, setTitle])
}

export default function AdminLayout() {
  const { data: session, isPending } = useSession()
  const location = useLocation()
  const [title, setTitle] = useState('관리자')

  if (isPending) return <AdminShell title="관리자"><Loading /></AdminShell>
  if (!session?.admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />

  return (
    <TitleContext.Provider value={setTitle}>
      <AdminShell title={title} adminName={session.adminName} defaultPassword={session.defaultPassword}>
        <Outlet />
      </AdminShell>
    </TitleContext.Provider>
  )
}

interface AdminShellProps {
  title: string
  /** 없으면 로그인 전 화면 (메뉴 대신 '로그인'만) */
  adminName?: string | null
  defaultPassword?: boolean
  children: ReactNode
}

export function AdminShell({ title, adminName, defaultPassword, children }: AdminShellProps) {
  useStylesheet(adminCss)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const logout = useLogout()
  const [params] = useSearchParams()

  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')?.toString().trim()
    navigate(q ? `/admin/posts?q=${encodeURIComponent(q)}` : '/admin/posts')
  }

  return (
    <ToastProvider>
      <div className="app">
        <div className="app__shell">
          <aside className="sidebar">
            <Link className="sidebar__logo" to="/">
              <Icon name="logo" /> 관리자
              {IS_DEMO && <span className="demo-badge">데모</span>}
            </Link>
            <nav className="sidebar__nav">
              {adminName ? (
                MENUS.map(([icon, label, to]) => (
                  <NavLink key={to} to={to} className={`nav-item${pathname.startsWith(to) ? ' is-active' : ''}`}>
                    <Icon name={icon} /> {label}
                  </NavLink>
                ))
              ) : (
                <Link className="nav-item is-active" to="/admin/login">
                  <Icon name="shield" /> 로그인
                </Link>
              )}
            </nav>
            <div className="sidebar__foot">
              <a className="nav-item" href={appUrl()} target="_blank" rel="noopener">
                <Icon name="home" /> 홈페이지 보기
              </a>
              {IS_DEMO && adminName && <DemoResetButton />}
              {adminName && (
                <button type="button" className="nav-item" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/admin/login') })}>
                  <Icon name="logout" /> 로그아웃
                </button>
              )}
            </div>
          </aside>

          <main className="main">
            <header className="topbar">
              <h1 className="topbar__title">{title}</h1>
              {adminName && (
                <form className="topbar__search" role="search" onSubmit={search}>
                  <Icon name="search" />
                  {/* key: 주소의 검색어가 바뀌면 입력칸도 새 값으로 */}
                  <input key={params.get('q') ?? ''} type="search" name="q" placeholder="글 검색 (제목·내용·작성자)" defaultValue={params.get('q') ?? ''} />
                </form>
              )}
              <div className="topbar__user">
                <div>
                  <strong>{adminName ?? '방문자'}</strong>
                  <small>{adminName ? '관리자' : '로그인하지 않음'}</small>
                </div>
                <div className="avatar">{adminName ? adminName.slice(0, 1).toUpperCase() : '?'}</div>
              </div>
            </header>

            {defaultPassword && (
              <div className="alert alert--warning" style={{ margin: 0 }}>
                관리자 기본 비밀번호(admin1234)를 사용 중입니다. 운영 환경에서는 <code>BOARD_ADMIN_HASH</code> 환경변수로 반드시 바꾸세요.
              </div>
            )}

            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
