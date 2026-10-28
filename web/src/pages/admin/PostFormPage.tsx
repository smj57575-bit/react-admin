// 관리자 글쓰기 / 수정 — 주소에 :id 가 있으면 수정. 새 글은 ?board_id= 의 게시판을 미리 고른다
import { useNavigate, useSearchParams } from 'react-router'
import { useAdminBoards, useAdminPost, useSavePost } from '../../api/admin'
import type { AdminBoard, Post } from '../../api/types'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { AdminForm } from './AdminForm'
import { useEditId, useMissingRedirect } from './editPage'
import { useFormValues } from './useFormValues'
import { useUnsavedChanges } from './useUnsavedChanges'

const LIST = '/admin/posts'

export default function PostFormPage() {
  const id = useEditId()
  useAdminTitle(id ? '글 수정' : '글쓰기')
  const post = useAdminPost(id)
  const boards = useAdminBoards()   // 게시판 선택 목록
  useMissingRedirect(post.error, LIST)

  if (boards.isPending || (id !== null && post.isPending)) return <Loading />
  if (boards.error) return <ErrorState error={boards.error} onRetry={boards.refetch} />
  if (id !== null && post.error) return <ErrorState error={post.error} onRetry={post.refetch} />
  return <PostForm key={id ?? 'new'} id={id} post={post.data?.post ?? null} boards={boards.data.boards} />
}

function PostForm({ id, post, boards }: { id: number | null; post: Post | null; boards: AdminBoard[] }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const save = useSavePost(id)
  const { values, set, dirty } = useFormValues({
    board_id: post?.board_id ?? (Number(params.get('board_id')) || boards[0]?.id || 0),
    title: post?.title ?? '',
    author: post?.author ?? '관리자',
    content: post?.content ?? '',
    is_published: post?.is_published ?? true,
    is_notice: post?.is_notice ?? false,
    priority: String(post?.priority ?? 0),
  })
  const markSaved = useUnsavedChanges(dirty)

  const submit = () =>
    save.mutate(values, {
      onSuccess: (result) => {
        markSaved()
        toast(result.message)
        navigate(`${LIST}?board_id=${values.board_id}`)   // 저장한 게시판 탭으로
      },
    })

  return (
    <AdminForm submitLabel={id ? '수정 완료' : '등록'} cancelTo={LIST} error={save.error} pending={save.isPending} onSubmit={submit}>
      <div className="field-row">
        <div className="field">
          <label htmlFor="postBoard">게시판</label>
          <select id="postBoard" className="select" value={values.board_id} onChange={(e) => set('board_id', Number(e.target.value))} required>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.is_active ? '' : ' (OFF)'}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="postPriority">
            노출 순서 <small>(클수록 위 · 기본 0이면 최신순)</small>
          </label>
          <input id="postPriority" type="number" min={-9999} max={9999} step={1} value={values.priority} onChange={(e) => set('priority', e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="postTitle">제목</label>
        <input id="postTitle" type="text" maxLength={100} value={values.title} onChange={(e) => set('title', e.target.value)} required autoFocus />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="postAuthor">작성자</label>
          <input id="postAuthor" type="text" maxLength={20} value={values.author} onChange={(e) => set('author', e.target.value)} required />
        </div>
        <div className="field" role="group" aria-labelledby="postSettingsLabel">
          <label id="postSettingsLabel">설정</label>
          <div className="btn-row" style={{ gap: 24, paddingTop: 8 }}>
            <Switch checked={values.is_published} onChange={(v) => set('is_published', v)}>
              공개
            </Switch>
            <Switch checked={values.is_notice} onChange={(v) => set('is_notice', v)}>
              공지로 고정
            </Switch>
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="postContent">내용</label>
        <textarea id="postContent" value={values.content} onChange={(e) => set('content', e.target.value)} required />
      </div>
    </AdminForm>
  )
}
