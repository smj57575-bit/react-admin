// 알림(토스트) — 저장·삭제 결과를 오른쪽 아래에 잠깐 보여준다 (관리자 화면)
// 어느 컴포넌트에서든 const toast = useToast(); toast('저장했어요') 로 띄운다
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type ToastType = 'success' | 'warning' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

type ShowToast = (message: string, type?: ToastType) => void

const ToastContext = createContext<ShowToast | null>(null)

export function useToast(): ShowToast {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast 는 <ToastProvider> 안에서만 쓸 수 있어요')
  return show
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback<ShowToast>((message, type = 'success') => {
    setToasts((list) => [...list, { id: nextId.current++, message, type }])
  }, [])

  const remove = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// 성공은 4초, 경고·오류는 8초 뒤 사라진다. 마우스를 올리면 멈춘다
function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const [paused, setPaused] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => setLeaving(true), toast.type === 'success' ? 4000 : 8000)
    return () => clearTimeout(timer)
  }, [paused, toast.type])

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(onClose, 200)   // 사라지는 애니메이션 뒤에 목록에서 뺀다
    return () => clearTimeout(timer)
  }, [leaving, onClose])

  return (
    <div
      className={`toast toast--${toast.type}${leaving ? ' is-leaving' : ''}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span>{toast.message}</span>
      <button type="button" className="toast__close" aria-label="알림 닫기" onClick={() => setLeaving(true)}>
        ×
      </button>
    </div>
  )
}
