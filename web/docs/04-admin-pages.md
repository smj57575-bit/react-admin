# 04. 관리자 화면 (React)

예전 PHP 관리자(`board/admin/*.php` — 지금은 지웠고 첫 커밋에 남아 있어요)를 React 로 옮긴 부분이에요. 디자인은 `src/styles/admin.css`(예전 style.css 복사본)의 클래스 이름을 그대로 써서 1:1 로 맞췄어요.

## 1. 흐름 한눈에 보기: 화면 → 훅 → API

```
FaqsPage.tsx ──useAdminFaqs(category)──▶ src/api/admin.ts ──api('/admin/faqs')──▶ PHP server/api/admin.php
     ▲                                         │
     └──────── 캐시(TanStack Query) ◀───────────┘
```

- **화면**(`src/pages/admin/*Page.tsx`)은 `fetch` 를 직접 쓰지 않아요. `src/api/admin.ts` 의 훅만 불러요.
- **훅**은 주소·캐시 키·저장 뒤 갱신 규칙을 한곳에서 정해요.
- **`api()`**(`src/api/client.ts`)가 CSRF 헤더, JSON 변환, 오류(`ApiError`) 통일을 맡아요.

```ts
// src/api/admin.ts
export function useAdminFaqs(category: string | null) {
  return useQuery({
    queryKey: adminKeys.faqList(category),          // ['admin', 'faqs', 'list', category]
    queryFn: () => api<AdminFaqsResponse>('/admin/faqs', { query: { category } }),
  })
}
```

캐시 키는 `['admin', 자원, 'list' | 'detail', …]` 모양이에요. 앞부분이 같으면 한 번에 무효화할 수 있어서, `['admin', 'faqs']` 하나로 FAQ 목록·상세를 모두 새로 받게 할 수 있어요.

필터·검색·페이지는 **주소(URL)** 에 둬요(`?board_id=`, `?q=`, `?page=`, `?category=`). 그래서 새로고침·뒤로 가기·주소 공유가 그대로 돼요.

```ts
// src/pages/admin/PostsPage.tsx
const [params] = useSearchParams()
const q = params.get('q')?.trim() ?? ''
const { data } = useAdminPosts({ q, boardId, page })
```

## 2. 같이 쓰는 조각들

| 조각 | 파일 | 쓰는 곳 |
| --- | --- | --- |
| 폼 틀(패널 + 오류 + 아래 고정 [취소][저장]) | `pages/admin/AdminForm.tsx` | 모든 등록/수정 화면 |
| 입력값 상태 + 바뀌었는지(dirty) | `pages/admin/useFormValues.ts` | 모든 폼 |
| 저장 안 한 변경 경고 | `pages/admin/useUnsavedChanges.ts` | 모든 폼 |
| `:id` 읽기, 없는 항목(404)이면 목록으로 | `pages/admin/editPage.ts` | 모든 수정 화면 |
| 삭제 확인 시트 + 삭제 + 알림 | `pages/admin/DeleteConfirm.tsx` (안에서 `ConfirmSheet`) | 모든 목록 |
| 상태 카드·배지·일정 입력칸·이미지 칸 | `pages/admin/schedule/*` | 팝업·배너·띠배너 |

팝업·배너·띠배너는 API 주소 모양이 같아서 훅도 **slug 하나**로 같이 써요.

```ts
const { data } = useScheduleList('popups')       // GET /api/admin/popups
const toggle = useToggleSchedule('banners')      // PATCH /api/admin/banners/:id/toggle
const save = useSaveSchedule('notice-bars', id)  // POST /api/admin/notice-bars(/:id), FormData
```

폼 화면은 "불러오기"와 "입력"을 두 컴포넌트로 나눠요. 데이터가 온 뒤에 폼을 그리면 `useState` 의 처음 값으로 바로 넣을 수 있어서, 값을 옮겨 담는 `useEffect` 가 필요 없어요.

```tsx
// src/pages/admin/FaqFormPage.tsx
if (id !== null) {
  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} />
}
return <FaqForm key={id ?? 'new'} id={id} row={data?.row ?? null} />
```

저장에 성공하면 `알림 → 목록으로` 가 기본 흐름이에요. 이때 `markSaved()` 를 먼저 불러야 "저장 안 한 변경" 경고에 걸리지 않아요(`useUnsavedChanges.ts` 주석 참고).

```ts
save.mutate(values, {
  onSuccess: (result) => {
    markSaved()
    toast(result.message)   // 서버가 준 문구 ('저장했어요', 'FAQ를 등록했어요')
    navigate(LIST)
  },
})
```

서버 검증 오류(422)는 `ApiError.errors` 에 담겨 오고, `AdminForm` 안의 `<FormErrors />` 가 폼 위에 목록으로 보여줘요.

## 3. ON/OFF 스위치: 바로 바뀌고, 알림이 뜨는 이유

`src/api/admin.ts` 의 `useToggle` 이 세 단계로 처리해요.

1. **누르자마자**(`onMutate`) 캐시 속 그 행의 `is_active` 를 뒤집어요 → 화면 스위치가 즉시 바뀌어요(낙관적 업데이트).
2. **서버가 답하면**(`onSuccess`) 서버 값(`active`, `status`)으로 다시 맞추고, 서버 문구를 알림으로 띄워요. 기간이 끝난 항목을 켰다면 `type: 'warning'` 이라 노란 알림이에요.
3. **실패하면**(`onError`) 1번 전에 저장해 둔 값으로 되돌리고 오류 알림을 띄워요.

```ts
onMutate: async (row) => {
  await queryClient.cancelQueries({ queryKey: listKey })
  const before = queryClient.getQueriesData<TData>({ queryKey: listKey })
  patchRow(row.id, { is_active: !row.is_active })
  return { before }                       // 실패하면 이걸로 되돌린다
},
onSuccess: (result, row) => {
  patchRow(row.id, { is_active: result.active, status: result.status })
  toast(result.message, result.type)
},
```

마지막(`onSettled`)에 목록을 다시 받아서 상태별 개수 카드, "● 지금 홈에 표시" 같은 파생 값도 맞춰요.

## 4. 관리자에서 바꾸면 홈에도 바로 보이는 이유

캐시는 30초 동안 "신선"하다고 보고 다시 요청하지 않아요(`main.tsx` 의 `staleTime`). 그래서 관리자에서 띠배너를 꺼도, 그냥 두면 홈은 30초 동안 옛 캐시를 보여줄 수 있어요.

그래서 모든 저장·삭제·ON/OFF 뒤에 **사이트 캐시도 오래됨(invalidate)** 으로 표시해요.

```ts
// src/api/admin.ts
const isSiteQuery = (key: QueryKey) => key[0] !== 'admin' && key[0] !== 'session'

queryClient.invalidateQueries({ queryKey })                                   // 바뀐 관리자 목록
queryClient.invalidateQueries({ predicate: (q) => isSiteQuery(q.queryKey) })  // ['home'], ['layout'], ['boards', …], ['posts', …]
```

- 지금 화면에 떠 있는 쿼리는 바로 다시 받아요.
- 화면에 없는 쿼리(예: 관리자 화면에 있을 때의 `['home']`)는 표시만 해 두고, 홈으로 돌아가는 순간 새로 받아요.

## 5. 권한은 왜 서버에서 확인할까

`AdminLayout` 은 로그인하지 않았으면 로그인 화면으로 보내고, 메뉴도 관리자에게만 보여줘요. 하지만 이건 **편의**일 뿐이에요. 브라우저 코드는 누구나 고치거나 건너뛸 수 있고, `curl` 로 API 를 바로 부를 수도 있거든요.

```
$ curl http://localhost:5173/api/admin/posts
{"ok":false,"message":"로그인이 필요해요."}   ← 401
```

그래서 실제 문지기는 서버예요. `server/api/index.php` 가 `/admin` 으로 시작하는 모든 요청에서 `api_require_admin()` 으로 세션을 확인하고, GET 이 아닌 요청은 CSRF 토큰(`X-CSRF-Token`)도 확인해요. 화면에서 버튼을 숨기는 것과 서버에서 막는 것은 **둘 다** 필요하고, 보안은 서버 쪽이 책임져요.
