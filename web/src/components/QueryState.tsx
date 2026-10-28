// 데이터 불러오는 중 / 실패 화면 — 모든 목록·상세 화면이 같은 모양을 쓴다
import { ApiError } from '../api/client'

export function Loading({ label = '불러오는 중이에요' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="state__spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  /** 다시 시도 버튼 (react-query 의 refetch) */
  onRetry?: () => void
  /** 사용자 화면은 'button', 관리자는 'btn' 클래스를 쓴다 */
  buttonClass?: string
}

export function ErrorState({ error, onRetry, buttonClass = 'btn btn--ghost' }: ErrorStateProps) {
  const message = error instanceof ApiError ? error.message : '데이터를 불러오지 못했어요.'
  return (
    <div className="state state--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={buttonClass} onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}
