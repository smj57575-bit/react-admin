// 주소 → 화면 연결표. 화면 파일은 처음 열 때 불러온다(lazy) → 첫 화면이 가볍다
import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import AdminLayout from './layouts/AdminLayout'
import SiteLayout from './layouts/SiteLayout'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import NotFoundPage from './pages/site/NotFoundPage'

const page = (load: () => Promise<{ default: ComponentType }>) => ({
  lazy: async () => ({ Component: (await load()).default }),
})

// 화면 파일을 처음 불러오는 아주 짧은 순간에는 아무것도 그리지 않는다 (각 레이아웃이 로딩 표시를 따로 한다)
const HydrateFallback = () => null

// 앱이 하위 경로(/react-admin/)에 올라가도 아래 주소표는 '/' 기준 그대로 쓴다. 라우터가 앞에 basename 을 붙여 준다
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const router = createBrowserRouter([
  {
    // 사용자 화면
    element: <SiteLayout />,
    HydrateFallback,
    children: [
      { path: '/', ...page(() => import('./pages/site/HomePage')) },
      { path: '/boards', ...page(() => import('./pages/site/BoardListPage')) },   // 첫 번째 게시판
      { path: '/boards/:key', ...page(() => import('./pages/site/BoardListPage')) },
      { path: '/boards/:key/write', ...page(() => import('./pages/site/PostFormPage')) },
      { path: '/posts/:id', ...page(() => import('./pages/site/PostViewPage')) },
      { path: '/posts/:id/edit', ...page(() => import('./pages/site/PostFormPage')) },
      { path: '/posts/:id/delete', ...page(() => import('./pages/site/PostDeletePage')) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin/login', element: <AdminLoginPage />, HydrateFallback },
  {
    // 관리자 화면 (로그인 필요)
    path: '/admin',
    element: <AdminLayout />,
    HydrateFallback,
    children: [
      { index: true, element: <Navigate to="/admin/posts" replace /> },
      { path: 'posts', ...page(() => import('./pages/admin/PostsPage')) },
      { path: 'posts/new', ...page(() => import('./pages/admin/PostFormPage')) },
      { path: 'posts/:id', ...page(() => import('./pages/admin/PostFormPage')) },
      { path: 'boards', ...page(() => import('./pages/admin/BoardsPage')) },
      { path: 'boards/new', ...page(() => import('./pages/admin/BoardFormPage')) },
      { path: 'boards/:id', ...page(() => import('./pages/admin/BoardFormPage')) },
      { path: 'banners', ...page(() => import('./pages/admin/BannersPage')) },
      { path: 'banners/new', ...page(() => import('./pages/admin/BannerFormPage')) },
      { path: 'banners/:id', ...page(() => import('./pages/admin/BannerFormPage')) },
      { path: 'popups', ...page(() => import('./pages/admin/PopupsPage')) },
      { path: 'popups/new', ...page(() => import('./pages/admin/PopupFormPage')) },
      { path: 'popups/:id', ...page(() => import('./pages/admin/PopupFormPage')) },
      { path: 'faqs', ...page(() => import('./pages/admin/FaqsPage')) },
      { path: 'faqs/new', ...page(() => import('./pages/admin/FaqFormPage')) },
      { path: 'faqs/:id', ...page(() => import('./pages/admin/FaqFormPage')) },
      { path: 'notice-bars', ...page(() => import('./pages/admin/NoticeBarsPage')) },
      { path: 'notice-bars/new', ...page(() => import('./pages/admin/NoticeBarFormPage')) },
      { path: 'notice-bars/:id', ...page(() => import('./pages/admin/NoticeBarFormPage')) },
      { path: '*', element: <Navigate to="/admin/posts" replace /> },
    ],
  },
], { basename })
