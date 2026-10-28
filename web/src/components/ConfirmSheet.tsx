// 삭제 확인 시트 — 되돌릴 수 없는 작업만 확인을 받는다. 무엇이 지워지는지 이름을 보여주고, 숨기기(OFF)라는 대안을 알려준다
// 네이티브 <dialog> 를 써서 포커스 가두기·Esc 닫기·배경 클릭 막기를 브라우저가 처리한다
import { useEffect, useRef } from 'react'

interface ConfirmSheetProps {
  open: boolean
  title: string
  /** 지워질 대상의 이름 (제목, 문구 등) */
  name?: string
  /** 추가 설명 (예: "이미지 파일도 함께 지워져요.") */
  detail?: string
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmSheet({ open, title, name, detail, confirmLabel = '삭제하기', pending, onConfirm, onClose }: ConfirmSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // open 값에 맞춰 dialog 를 열고 닫는다 (React 상태 → 브라우저 dialog)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus()   // 기본 포커스는 안전한 쪽(취소)
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="confirmTitle"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()   // 바깥(배경) 누르면 닫기
      }}
    >
      <div className="sheet__body">
        <h2 className="sheet__title" id="confirmTitle">{title}</h2>
        {name && <p className="sheet__name">{name}</p>}
        <p className="sheet__text">
          삭제하면 되돌릴 수 없어요. {detail}
          <br />
          잠시 숨기려면 삭제 대신 노출을 끄세요.
        </p>
        <div className="sheet__actions">
          <button type="button" className="btn btn--ghost" ref={cancelRef} onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn btn--danger-solid" onClick={onConfirm} disabled={pending}>
            {pending ? '삭제하는 중…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
