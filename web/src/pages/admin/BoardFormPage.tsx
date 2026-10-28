// 게시판 추가 / 수정 — 주소에 :id 가 있으면 수정. 식별자는 사용자 화면 주소(/boards/식별자)에 쓰인다
import { useNavigate } from 'react-router'
import { useAdminBoard, useSaveBoard } from '../../api/admin'
import type { AdminBoard } from '../../api/types'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { AdminForm } from './AdminForm'
import { useEditId, useMissingRedirect } from './editPage'
import { useFormValues } from './useFormValues'
import { useUnsavedChanges } from './useUnsavedChanges'

const LIST = '/admin/boards'

export default function BoardFormPage() {
  const id = useEditId()
  useAdminTitle(id ? '게시판 수정' : '게시판 추가')
  const { data, error, isPending, refetch } = useAdminBoard(id)
  useMissingRedirect(error, LIST)

  if (id !== null) {
    if (isPending) return <Loading />
    if (error) return <ErrorState error={error} onRetry={refetch} />
  }
  return <BoardForm key={id ?? 'new'} id={id} board={data?.board ?? null} />
}

function BoardForm({ id, board }: { id: number | null; board: AdminBoard | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveBoard(id)
  const { values, set, dirty } = useFormValues({
    board_key: board?.board_key ?? '',
    name: board?.name ?? '',
    description: board?.description ?? '',
    allow_user_write: board?.allow_user_write ?? false,
    is_active: board?.is_active ?? true,
    sort_order: String(board?.sort_order ?? 0),
  })
  const markSaved = useUnsavedChanges(dirty)

  const submit = () =>
    save.mutate(values, {
      onSuccess: (result) => {
        markSaved()
        toast(result.message)
        navigate(LIST)
      },
    })

  return (
    <AdminForm submitLabel={id ? '수정 완료' : '추가'} cancelTo={LIST} error={save.error} pending={save.isPending} onSubmit={submit}>
      <div className="field-row">
        <div className="field">
          <label htmlFor="boardName">게시판 이름</label>
          <input id="boardName" type="text" maxLength={50} value={values.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="boardKey">
            식별자{' '}
            <small>
              (주소에 쓰임: /boards/<b>식별자</b> · 영문 소문자·숫자·-)
            </small>
          </label>
          <input
            id="boardKey"
            type="text"
            maxLength={30}
            pattern="[a-z0-9][a-z0-9\-]{1,29}"
            value={values.board_key}
            onChange={(e) => set('board_key', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="boardDesc">
          설명 <small>(선택 · 게시판 상단에 표시)</small>
        </label>
        <input id="boardDesc" type="text" maxLength={200} value={values.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="boardSort">
            표시 순서 <small>(작을수록 먼저)</small>
          </label>
          <input id="boardSort" type="number" min={-9999} max={9999} step={1} value={values.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
        </div>
        <div className="field" role="group" aria-labelledby="boardSettingsLabel">
          <label id="boardSettingsLabel">설정</label>
          <div className="btn-row" style={{ gap: 24, paddingTop: 8 }}>
            <Switch checked={values.is_active} onChange={(v) => set('is_active', v)}>
              노출
            </Switch>
            <Switch checked={values.allow_user_write} onChange={(v) => set('allow_user_write', v)}>
              방문자 글쓰기 허용
            </Switch>
          </div>
        </div>
      </div>
    </AdminForm>
  )
}
