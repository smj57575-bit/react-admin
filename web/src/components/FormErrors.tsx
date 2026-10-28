// 폼 위에 보여주는 오류 목록 — 서버가 준 검증 오류(422 errors)나 일반 오류 메시지
import { ApiError } from '../api/client'

interface FormErrorsProps {
  error: unknown
  /** 관리자 화면은 'alert alert--danger', 사용자 화면은 'alert' */
  className?: string
}

export function FormErrors({ error, className = 'alert alert--danger' }: FormErrorsProps) {
  if (!error) return null
  const messages = error instanceof ApiError ? (error.errors.length ? error.errors : [error.message]) : ['요청을 처리하지 못했어요.']
  return (
    <div className={className} role="alert">
      <ul>
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  )
}
