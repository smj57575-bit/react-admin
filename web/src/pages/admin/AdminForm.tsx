// 관리자 등록/수정 폼 틀 — 패널, 서버 검증 오류, 화면 아래에 붙는 [취소] [저장] 바
// 화면은 입력칸(children)과 저장 동작(onSubmit)만 넣으면 된다
import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router'
import { FormErrors } from '../../components/FormErrors'

interface AdminFormProps {
  /** 저장 버튼 글자 ('등록', '수정 완료' …) */
  submitLabel: string
  /** [취소] 를 누르면 갈 목록 주소 */
  cancelTo: string
  /** 저장 요청의 오류 (mutation.error) */
  error: unknown
  pending: boolean
  onSubmit: () => void
  children: ReactNode
}

export function AdminForm({ submitLabel, cancelTo, error, pending, onSubmit, children }: AdminFormProps) {
  const formRef = useRef<HTMLFormElement>(null)

  // 저장 버튼은 화면 아래에 있어서, 오류가 나면 폼 맨 위(오류 목록)가 보이게 올린다
  useEffect(() => {
    if (error) formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [error])

  return (
    <form
      ref={formRef}
      className="panel"
      onSubmit={(e) => {
        e.preventDefault()   // 브라우저 기본 제출(페이지 새로고침) 대신 API 로 보낸다
        onSubmit()
      }}
    >
      <FormErrors error={error} />
      {children}
      <div className="form-actions">
        <Link to={cancelTo} className="btn btn--ghost">
          취소
        </Link>
        <button className="btn btn--primary" disabled={pending}>
          {pending ? '저장하는 중…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
