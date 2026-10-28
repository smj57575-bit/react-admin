// 등록/수정 화면 공통 — 주소의 :id 로 모드를 정하고, 없는 항목(404)이면 목록으로 돌려보낸다
import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useToast } from '../../components/Toast'

/** /admin/faqs/12 → 12, /admin/faqs/new → null(등록) */
export function useEditId(): number | null {
  const { id } = useParams()
  return id === undefined ? null : Number(id)
}

/** 불러오기 오류가 404 면 오류 알림을 띄우고 목록으로 (예전 화면의 header('Location: …') 와 같은 동작) */
export function useMissingRedirect(error: unknown, listPath: string) {
  const navigate = useNavigate()
  const toast = useToast()
  const doneRef = useRef(false)   // 개발 모드(StrictMode)에서 effect 가 두 번 돌아도 알림은 한 번만

  useEffect(() => {
    if (doneRef.current || !(error instanceof ApiError) || error.status !== 404) return
    doneRef.current = true
    toast(error.message, 'error')
    navigate(listPath, { replace: true })
  }, [error, listPath, navigate, toast])
}
