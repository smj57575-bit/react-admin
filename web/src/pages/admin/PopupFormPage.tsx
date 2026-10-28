// 팝업 등록 / 수정 — 주소에 :id 가 있으면 수정. 이미지는 선택 (내용이나 이미지 중 하나는 있어야 한다)
import { useNavigate } from 'react-router'
import { useSaveSchedule, useScheduleRow } from '../../api/admin'
import type { Popup } from '../../api/types'
import { ErrorState, Loading } from '../../components/QueryState'
import { useToast } from '../../components/Toast'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { AdminForm } from './AdminForm'
import { useEditId, useMissingRedirect } from './editPage'
import { ImageField } from './schedule/ImageField'
import { ScheduleFields } from './schedule/ScheduleFields'
import { SCHEDULE_DEFAULTS, scheduleInputFromRow } from './schedule/scheduleData'
import { useFormValues } from './useFormValues'
import { useUnsavedChanges } from './useUnsavedChanges'

const LIST = '/admin/popups'

export default function PopupFormPage() {
  const id = useEditId()
  useAdminTitle(id ? '팝업 수정' : '팝업 등록')
  const { data, error, isPending, refetch } = useScheduleRow('popups', id)
  useMissingRedirect(error, LIST)

  if (id !== null) {
    if (isPending) return <Loading />
    if (error) return <ErrorState error={error} onRetry={refetch} />
  }
  // key: 다른 항목으로 옮겨 가면 폼 상태를 새로 만든다
  return <PopupForm key={id ?? 'new'} id={id} row={data?.row ?? null} />
}

function PopupForm({ id, row }: { id: number | null; row: Popup | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveSchedule('popups', id)
  const { values, set, update, dirty } = useFormValues({
    title: row?.title ?? '',
    content: row?.content ?? '',
    ...(row ? scheduleInputFromRow(row) : SCHEDULE_DEFAULTS),
    image: null as File | null,
    remove_image: false,
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
    <AdminForm submitLabel={id ? '수정 완료' : '등록'} cancelTo={LIST} error={save.error} pending={save.isPending} onSubmit={submit}>
      <div className="field">
        <label htmlFor="popupTitle">
          제목 <small>(팝업 상단과 관리 목록에 표시)</small>
        </label>
        <input id="popupTitle" type="text" maxLength={100} value={values.title} onChange={(e) => set('title', e.target.value)} required autoFocus />
      </div>

      <div className="field">
        <label htmlFor="popupContent">
          내용 <small>(선택 · 이미지가 없으면 필수)</small>
        </label>
        <textarea id="popupContent" className="textarea--short" maxLength={2000} value={values.content} onChange={(e) => set('content', e.target.value)} />
      </div>

      <ImageField
        currentPath={row?.image_path ?? null}
        file={values.image}
        onFileChange={(file) => set('image', file)}
        remove={{ checked: values.remove_image, onChange: (checked) => set('remove_image', checked) }}
      />

      <ScheduleFields values={values} onChange={update} />
    </AdminForm>
  )
}
