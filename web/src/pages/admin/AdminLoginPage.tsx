// 관리자 로그인 — 성공하면 원래 가려던 관리자 화면(없으면 글 관리)으로
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { IS_DEMO } from '../../api/client'
import { useLogin, useSession } from '../../api/session'
import { FormErrors } from '../../components/FormErrors'
import { AdminShell } from '../../layouts/AdminLayout'
import { usePageTitle } from '../../lib/usePageTitle'

export default function AdminLoginPage() {
  usePageTitle('로그인', '관리자')
  const { data: session } = useSession()
  const login = useLogin()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin/posts'
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')

  if (session?.admin) return <Navigate to={from} replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ id, password }, { onSuccess: () => navigate(from, { replace: true }) })
  }

  return (
    <AdminShell title="관리자 로그인">
      <div className="login">
        <form className="panel" onSubmit={submit}>
          <h2 className="login__title">관리자 로그인</h2>
          {IS_DEMO && <div className="alert alert--info">데모 계정: admin / admin1234 (데이터는 이 브라우저에만 저장돼요)</div>}
          <FormErrors error={login.error} />
          <div className="field">
            <label htmlFor="loginId">아이디</label>
            <input id="loginId" type="text" value={id} onChange={(e) => setId(e.target.value)} required autoFocus autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="loginPw">비밀번호</label>
            <input id="loginPw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn btn--primary btn--block" disabled={login.isPending}>
            {login.isPending ? '확인하는 중…' : '로그인'}
          </button>
        </form>
      </div>
    </AdminShell>
  )
}
