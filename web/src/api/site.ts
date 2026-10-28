// 사용자 화면 데이터 — 홈 · 게시판 목록 · 글 보기/쓰기/수정/삭제
// 화면은 이 훅만 부르고, 어떤 주소를 부르는지·캐시를 언제 비우는지는 여기서 정한다
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { BoardPostsResponse, HomeResponse, MutationResult, PostResponse, UserPostInput } from './types'

// 캐시 키 — 배열 앞부분이 같으면 한 번에 무효화할 수 있다 (예: ['boards'] → 모든 게시판의 모든 페이지)
export const siteKeys = {
  home: ['home'] as const,
  boards: ['boards'] as const,
  boardPosts: (key: string) => ['boards', key, 'posts'] as const,
  boardPostsPage: (key: string, page: number, q: string) => ['boards', key, 'posts', { page, q }] as const,
  post: (id: number) => ['posts', id] as const,
}

export function useHome() {
  return useQuery({ queryKey: siteKeys.home, queryFn: () => api<HomeResponse>('/home') })
}

export function useBoardPosts(key: string, page: number, q: string) {
  return useQuery({
    queryKey: siteKeys.boardPostsPage(key, page, q),
    queryFn: () => api<BoardPostsResponse>(`/boards/${encodeURIComponent(key)}/posts`, { query: { page, q } }),
    // 같은 게시판에서 페이지·검색어만 바뀔 때는 새 목록이 올 때까지 이전 목록을 그대로 둔다 (화면이 깜빡이지 않게)
    // 다른 게시판으로 옮길 때는 이전 게시판 글이 잠깐 보이면 헷갈리므로 비운다
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[1] === key ? previous : undefined),
  })
}

/** enabled: false 면 불러오지 않는다 (삭제가 끝난 글을 다시 부르지 않게) */
export function usePost(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: siteKeys.post(id), queryFn: () => api<PostResponse>(`/posts/${id}`), enabled })
}

// 글이 늘거나 줄면 홈의 "최근 글"·"공개된 글" 숫자도 바뀐다
function useInvalidateLists() {
  const queryClient = useQueryClient()
  return (boardKey?: string) => {
    queryClient.invalidateQueries({ queryKey: boardKey ? siteKeys.boardPosts(boardKey) : siteKeys.boards })
    queryClient.invalidateQueries({ queryKey: siteKeys.home })
  }
}

export function useCreatePost(boardKey: string) {
  const invalidateLists = useInvalidateLists()
  return useMutation({
    mutationFn: (input: UserPostInput) =>
      api<MutationResult & { id: number }>(`/boards/${encodeURIComponent(boardKey)}/posts`, { method: 'POST', json: input }),
    onSuccess: () => invalidateLists(boardKey),
  })
}

export function useUpdatePost(id: number) {
  const queryClient = useQueryClient()
  const invalidateLists = useInvalidateLists()
  return useMutation({
    mutationFn: (input: UserPostInput) => api<MutationResult>(`/posts/${id}`, { method: 'PUT', json: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.post(id) })
      invalidateLists()   // 제목·작성자는 모든 목록 페이지에 보일 수 있다
    },
  })
}

export function useDeletePost(id: number) {
  const queryClient = useQueryClient()
  const invalidateLists = useInvalidateLists()
  return useMutation({
    mutationFn: (password: string) =>
      api<MutationResult & { board_key: string }>(`/posts/${id}`, { method: 'DELETE', json: { password } }),
    onSuccess: (result) => {
      // 지운 글의 캐시를 남겨 두면 뒤로 가기로 돌아왔을 때 지운 글이 보인다
      queryClient.removeQueries({ queryKey: siteKeys.post(id) })
      invalidateLists(result.board_key)
    },
  })
}
