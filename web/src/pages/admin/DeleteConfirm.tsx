// 목록의 [삭제] 공통 — 확인 시트를 띄우고, 확인하면 삭제 API 를 부른 뒤 결과를 알림으로 보여준다
// 화면은 "무엇을 지울지(target)"만 정하면 된다. 실패(예: 글이 남은 게시판 409)는 서버 메시지를 그대로 오류 알림으로
import type { UseMutationResult } from '@tanstack/react-query'
import type { ApiError } from '../../api/client'
import type { MutationResult } from '../../api/types'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { useToast } from '../../components/Toast'

export interface DeleteTarget {
  id: number
  /** 시트에 보여줄 이름 (제목·문구) */
  name: string
}

interface DeleteConfirmProps {
  target: DeleteTarget | null
  /** 시트 제목 — '팝업을 삭제할까요?' */
  title: string
  detail?: string
  mutation: UseMutationResult<MutationResult, ApiError, number>
  onClose: () => void
}

export function DeleteConfirm({ target, title, detail, mutation, onClose }: DeleteConfirmProps) {
  const toast = useToast()

  const confirm = () => {
    if (!target) return
    mutation.mutate(target.id, {
      onSuccess: () => toast('삭제했어요'),
      onError: (error) => toast(error.message, 'error'),
      onSettled: onClose,
    })
  }

  return <ConfirmSheet open={target !== null} title={title} name={target?.name} detail={detail} pending={mutation.isPending} onConfirm={confirm} onClose={onClose} />
}
