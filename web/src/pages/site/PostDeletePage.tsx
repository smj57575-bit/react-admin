// 방문자 글 삭제 — 작성할 때 넣은 비밀번호를 확인한 뒤 지우고 그 게시판 목록으로
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useDeletePost, usePost } from '../../api/site'
import { FormErrors } from '../../components/FormErrors'
import { ErrorState, Loading } from '../../components/QueryState'
import { usePageTitle } from '../../lib/usePageTitle'
import NotFoundPage from './NotFoundPage'
import { boardUrl } from './urls'

export default function PostDeletePage() {
  usePageTitle('글 삭제')
  const id = Number(useParams().id)
  const remove = useDeletePost(id)
  // 삭제가 끝나면 이 글을 다시 불러오지 않는다 (이미 없는 글이라 404 가 난다)
  const { data, isPending, error, refetch } = usePost(id, { enabled: !remove.isSuccess })
  const navigate = useNavigate()
  const [password, setPassword] = useState('')

  if (isPending) return <Loading />
  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFoundPage message={error.message} />
    return <ErrorState error={error} onRetry={refetch} buttonClass="button button--sm button--ghost" />
  }
  // 관리자 글 등 비밀번호로 지울 수 없는 글 → 글 보기로
  if (!data.editable) return <Navigate to={`/posts/${id}`} replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    remove.mutate(password, { onSuccess: (res) => navigate(boardUrl(res.board_key), { replace: true }) })
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Link to={`/posts/${id}`} className="eyebrow">
            ← 글로 돌아가기
          </Link>
          <h1 className="page-hero__title">글 삭제</h1>
        </div>
      </section>

      <section className="page-body">
        <div className="container">
          <form className="form-card form-card--narrow" onSubmit={submit}>
            <p className="form-card__text">
              「<strong>{data.post.title}</strong>」 글을 삭제합니다.
              <br />
              작성할 때 입력한 비밀번호를 입력하세요.
            </p>

            <FormErrors error={remove.error} className="alert" />

            <label className="form-field">
              <span>비밀번호</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus autoComplete="current-password" />
            </label>

            <div className="action-row">
              <button className="button button--sm button--danger-solid" disabled={remove.isPending || remove.isSuccess}>
                {remove.isPending ? '삭제하는 중…' : '삭제'}
              </button>
              <Link to={`/posts/${id}`} className="button button--sm button--ghost">
                취소
              </Link>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
