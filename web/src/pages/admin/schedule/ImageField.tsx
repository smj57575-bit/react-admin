// 이미지 업로드 칸 — 지금 저장된 이미지, 새로 고른 파일 미리보기, (팝업만) 이미지 삭제
import { useEffect, useRef, useState } from 'react'
import { uploadUrl } from '../../../lib/format'
import { Switch } from '../../../components/Switch'

const UPLOAD_MB = 2   // 서버 UPLOAD_IMAGE_MAX

interface ImageFieldProps {
  /** 칸 이름 (기본 '이미지') */
  label?: string
  /** 칸 이름 옆 안내 (예: '필수 · 가로로 긴 이미지 권장') */
  hint?: string
  /** 지금 저장된 이미지 경로 (등록 화면은 null) */
  currentPath: string | null
  file: File | null
  onFileChange: (file: File | null) => void
  /** 저장된 이미지가 없을 때 파일이 꼭 있어야 하는지 (배너) */
  required?: boolean
  /** 이미지 삭제 스위치 (팝업처럼 이미지가 선택 사항일 때만) */
  remove?: { checked: boolean; onChange: (checked: boolean) => void }
  /** 현재 이미지 미리보기 폭 (배너는 넓게) */
  previewWidth?: number
}

export function ImageField({ label = '이미지', hint, currentPath, file, onFileChange, required, remove, previewWidth }: ImageFieldProps) {
  // 고른 파일을 브라우저 안의 임시 주소(blob:)로 바꿔 미리 본다. 다른 파일을 고르거나 화면을 떠나면 주소를 돌려준다(메모리 해제)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  const choose = (picked: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = picked ? URL.createObjectURL(picked) : null
    setPreviewUrl(urlRef.current)
    onFileChange(picked)
  }

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const imgStyle = previewWidth ? { width: previewWidth } : undefined

  return (
    <div className="field">
      <label htmlFor="imageFile">
        {label}{' '}
        <small>
          ({hint ? `${hint} · ` : ''}JPG·PNG·GIF·WEBP, {UPLOAD_MB}MB 이하)
        </small>
      </label>
      {currentPath && (
        <div className="image-current">
          <img src={uploadUrl(currentPath)} alt="현재 이미지" style={imgStyle} />
          {remove && (
            <Switch checked={remove.checked} onChange={remove.onChange}>
              이미지 삭제
            </Switch>
          )}
        </div>
      )}
      {file && previewUrl && (
        <div className="image-current">
          <img src={previewUrl} alt="새로 고른 이미지 미리보기" style={imgStyle} />
          <span className="text-sm text-muted">새 이미지 · {file.name}</span>
        </div>
      )}
      <input
        id="imageFile"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        required={required && !currentPath}
        onChange={(e) => choose(e.target.files?.[0] ?? null)}
      />
      {currentPath && <small className="text-muted">새 파일을 선택하면 기존 이미지를 교체합니다.</small>}
    </div>
  )
}
