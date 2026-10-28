// 배너 등록 / 수정 — 주소에 :id 가 있으면 수정. 배경 이미지는 필수
import { useNavigate } from 'react-router'
import { useSaveSchedule, useScheduleRow } from '../../api/admin'
import type { Banner } from '../../api/types'
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

const LIST = '/admin/banners'

export default function BannerFormPage() {
  const id = useEditId()
  useAdminTitle(id ? '배너 수정' : '배너 등록')
  const { data, error, isPending, refetch } = useScheduleRow('banners', id)
  useMissingRedirect(error, LIST)

  if (id !== null) {
    if (isPending) return <Loading />
    if (error) return <ErrorState error={error} onRetry={refetch} />
  }
  return <BannerForm key={id ?? 'new'} id={id} row={data?.row ?? null} />
}

function BannerForm({ id, row }: { id: number | null; row: Banner | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveSchedule('banners', id)
  const { values, set, update, dirty } = useFormValues({
    title: row?.title ?? '',
    subtitle: row?.subtitle ?? '',
    button_text: row?.button_text ?? '',
    ...(row ? scheduleInputFromRow(row) : SCHEDULE_DEFAULTS),
    image: null as File | null,
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
        <label htmlFor="bannerTitle">
          제목 <small>(배너 위에 크게 표시)</small>
        </label>
        <input id="bannerTitle" type="text" maxLength={100} value={values.title} onChange={(e) => set('title', e.target.value)} required autoFocus />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="bannerSubtitle">
            부제목 <small>(선택)</small>
          </label>
          <input id="bannerSubtitle" type="text" maxLength={200} value={values.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bannerButton">
            버튼 문구 <small>(선택 · 비우면 배너 전체가 링크)</small>
          </label>
          <input id="bannerButton" type="text" maxLength={30} placeholder="자세히 보기" value={values.button_text} onChange={(e) => set('button_text', e.target.value)} />
        </div>
      </div>

      <ImageField
        label="배경 이미지"
        hint="필수 · 가로로 긴 이미지 권장, 1920×800 정도"
        currentPath={row?.image_path ?? null}
        file={values.image}
        onFileChange={(file) => set('image', file)}
        required
        previewWidth={240}
      />

      <ScheduleFields values={values} onChange={update} />
    </AdminForm>
  )
}
