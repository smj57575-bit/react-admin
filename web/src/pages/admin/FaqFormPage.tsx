// FAQ 등록 / 수정 — 분류는 기존 분류를 고르거나(datalist) 새로 입력. 새 FAQ 는 주소의 ?category= 로 분류를 미리 채운다
import { useNavigate, useSearchParams } from 'react-router'
import { useAdminFaq, useAdminFaqs, useSaveFaq } from '../../api/admin'
import type { Faq } from '../../api/types'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { AdminForm } from './AdminForm'
import { useEditId, useMissingRedirect } from './editPage'
import { useFormValues } from './useFormValues'
import { useUnsavedChanges } from './useUnsavedChanges'

const LIST = '/admin/faqs'

export default function FaqFormPage() {
  const id = useEditId()
  useAdminTitle(id ? 'FAQ 수정' : 'FAQ 등록')
  const { data, error, isPending, refetch } = useAdminFaq(id)
  useMissingRedirect(error, LIST)

  if (id !== null) {
    if (isPending) return <Loading />
    if (error) return <ErrorState error={error} onRetry={refetch} />
  }
  return <FaqForm key={id ?? 'new'} id={id} row={data?.row ?? null} />
}

function FaqForm({ id, row }: { id: number | null; row: Required<Faq> | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const save = useSaveFaq(id)
  // 분류 추천 목록 — 전체 FAQ 목록의 분류. 늦게 와도 폼은 먼저 쓸 수 있다
  const categories = useAdminFaqs(null).data?.categories ?? []
  const { values, set, dirty } = useFormValues({
    category: row?.category ?? (params.get('category') || '일반'),
    question: row?.question ?? '',
    answer: row?.answer ?? '',
    is_active: row?.is_active ?? true,
    sort_order: String(row?.sort_order ?? 0),
  })
  const markSaved = useUnsavedChanges(dirty)

  const submit = () =>
    save.mutate(values, {
      onSuccess: (result) => {
        markSaved()
        toast(result.message)
        navigate(`${LIST}?${new URLSearchParams({ category: values.category.trim() })}`)   // 저장한 분류 탭으로
      },
    })

  return (
    <AdminForm submitLabel={id ? '수정 완료' : '등록'} cancelTo={LIST} error={save.error} pending={save.isPending} onSubmit={submit}>
      <div className="field-row">
        <div className="field">
          <label htmlFor="faqCategory">
            분류 <small>(기존 분류를 고르거나 새로 입력)</small>
          </label>
          <input id="faqCategory" type="text" list="faqCategories" maxLength={30} value={values.category} onChange={(e) => set('category', e.target.value)} required />
          <datalist id="faqCategories">
            {categories.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="faqSort">
            표시 순서 <small>(같은 분류 안에서 작을수록 먼저)</small>
          </label>
          <input id="faqSort" type="number" min={-9999} max={9999} step={1} value={values.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="faqQuestion">질문</label>
        <input id="faqQuestion" type="text" maxLength={200} value={values.question} onChange={(e) => set('question', e.target.value)} required autoFocus />
      </div>

      <div className="field">
        <label htmlFor="faqAnswer">
          답변 <small>(줄바꿈 그대로 표시)</small>
        </label>
        <textarea id="faqAnswer" className="textarea--short" maxLength={5000} value={values.answer} onChange={(e) => set('answer', e.target.value)} required />
      </div>

      <div className="field">
        <Switch checked={values.is_active} onChange={(v) => set('is_active', v)}>
          홈페이지에 노출
        </Switch>
      </div>
    </AdminForm>
  )
}
