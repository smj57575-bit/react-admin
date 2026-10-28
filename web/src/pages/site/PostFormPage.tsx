// 방문자 글쓰기 / 수정 — /boards/:key/write 는 새 글, /posts/:id/edit 는 수정 (작성할 때 넣은 비밀번호 필요)
// 수정은 글을 먼저 불러온 뒤 폼을 그린다. 폼(PostForm)은 두 경우가 같이 쓴다
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useCreatePost, usePost, useUpdatePost } from '../../api/site'
import type { Board, UserPostInput } from '../../api/types'
import { FormErrors } from '../../components/FormErrors'
import { ErrorState, Loading } from '../../components/QueryState'
import { useLayoutData } from '../../layouts/SiteLayout'
import { usePageTitle } from '../../lib/usePageTitle'
import NotFoundPage from './NotFoundPage'
import { boardUrl } from './urls'

// 서버(post_errors)와 같은 글자 수 제한
const TITLE_MAX = 100
const AUTHOR_MAX = 20
const CONTENT_MAX = 20000

export default function PostFormPage() {
  const { key, id } = useParams()
  return id ? <EditPost id={Number(id)} /> : <CreatePost boardKey={key ?? ''} />
}

function CreatePost({ boardKey }: { boardKey: string }) {
  const { data, isPending, error, refetch } = useLayoutData()
  const create = useCreatePost(boardKey)
  const navigate = useNavigate()

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} buttonClass="button button--sm button--ghost" />

  const board = data.boards.find((b) => b.board_key === boardKey)
  if (!board) return <NotFoundPage message="존재하지 않는 게시판이에요." backTo="/boards" backLabel="게시판으로" />
  // 방문자 글쓰기를 막은 게시판이면 목록으로 (서버도 403 으로 막는다)
  if (!board.can_write) return <Navigate to={boardUrl(board.board_key)} replace />

  return (
    <PostForm
      board={board}
      initial={{ title: '', author: '', content: '' }}
      mutation={create}
      cancelTo={boardUrl(board.board_key)}
      onSubmit={(input) => create.mutate(input, { onSuccess: (res) => navigate(`/posts/${res.id}`, { replace: true }) })}
    />
  )
}

function EditPost({ id }: { id: number }) {
  const { data, isPending, error, refetch } = usePost(id)
  const update = useUpdatePost(id)
  const navigate = useNavigate()

  if (isPending) return <Loading />
  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFoundPage message={error.message} />
    return <ErrorState error={error} onRetry={refetch} buttonClass="button button--sm button--ghost" />
  }
  // 관리자 글이거나 방문자 글쓰기가 꺼진 게시판의 글은 수정할 수 없다 → 글 보기로
  if (!data.editable) return <Navigate to={`/posts/${id}`} replace />

  const { post, board } = data
  return (
    <PostForm
      board={board}
      initial={{ title: post.title, author: post.author, content: post.content }}
      mutation={update}
      cancelTo={`/posts/${id}`}
      onSubmit={(input) => update.mutate(input, { onSuccess: () => navigate(`/posts/${id}`, { replace: true }) })}
      isEdit
    />
  )
}

interface PostFormProps {
  board: Board
  initial: Omit<UserPostInput, 'password'>
  /** 등록/수정 요청 상태 — 보내는 중 표시와 서버 오류 표시에 쓴다 */
  mutation: { isPending: boolean; error: unknown }
  cancelTo: string
  onSubmit: (input: UserPostInput) => void
  isEdit?: boolean
}

function PostForm({ board, initial, mutation, cancelTo, onSubmit, isEdit = false }: PostFormProps) {
  usePageTitle(`${isEdit ? '글 수정' : '글쓰기'} · ${board.name}`)
  const [form, setForm] = useState({ ...initial, password: '' })
  // 입력칸 하나 바꾸기 — name 으로 어느 칸인지 알 수 있어 칸마다 함수를 따로 만들 필요가 없다
  const change = (e: { target: { name: string; value: string } }) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()   // 브라우저 기본 제출(새로고침) 대신 API 로 보낸다. required·maxLength 는 그 전에 브라우저가 검사한다
    onSubmit(form)
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <Link to={boardUrl(board.board_key)} className="eyebrow">
            ← {board.name}
          </Link>
          <h1 className="page-hero__title">{isEdit ? '글 수정' : '글쓰기'}</h1>
        </div>
      </section>

      <section className="page-body">
        <div className="container">
          <form className="form-card" onSubmit={submit}>
            <FormErrors error={mutation.error} className="alert" />

            <label className="form-field">
              <span>제목</span>
              <input type="text" name="title" maxLength={TITLE_MAX} value={form.title} onChange={change} required autoFocus />
            </label>

            <div className="form-row">
              <label className="form-field">
                <span>작성자</span>
                <input type="text" name="author" maxLength={AUTHOR_MAX} value={form.author} onChange={change} required autoComplete="nickname" />
              </label>
              <label className="form-field">
                <span>
                  비밀번호 <small>{isEdit ? '작성할 때 입력한 비밀번호' : '수정·삭제할 때 필요해요'}</small>
                </span>
                <input type="password" name="password" value={form.password} onChange={change} required autoComplete={isEdit ? 'current-password' : 'new-password'} />
              </label>
            </div>

            <label className="form-field">
              <span>내용</span>
              <textarea name="content" maxLength={CONTENT_MAX} value={form.content} onChange={change} required />
            </label>

            <div className="action-row">
              <button className="button button--sm button--primary" disabled={mutation.isPending}>
                {mutation.isPending ? '저장하는 중…' : isEdit ? '수정 완료' : '등록'}
              </button>
              <Link to={cancelTo} className="button button--sm button--ghost">
                취소
              </Link>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
