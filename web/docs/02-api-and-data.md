# 02. API 연동과 데이터 흐름

> 이 문서를 읽고 나면: API 에서 받은 데이터가 어떻게 화면에 그려지고, 수정하면 화면이 왜 다시 갱신되는지 설명할 수 있어요.

## 1. 타입 먼저: `src/api/types.ts`

서버가 주는 JSON 모양을 TypeScript 로 적어 둔 파일이에요. 화면 코드에서 `post.titel` 처럼 오타를 내면 실행 전에 빨간 줄이 생겨요.

```ts
export interface PostSummary {
  id: number
  title: string
  is_notice: boolean
  created_at: string
}

export interface BoardPostsResponse extends ApiOk, Paged {   // 공통 모양을 extends 로 합친다
  board: Board
  posts: PostSummary[]
}

export type ScheduleStatus = 'live' | 'scheduled' | 'ended' | 'off'   // 정해진 값 중 하나
```

**type 과 interface, 언제 뭘 쓰나?**
- 객체 모양(필드가 있는 것) → `interface`. `extends` 로 확장하기 편하다.
- 값 몇 개 중 하나(유니언), 함수 모양 → `type`. interface 로는 못 쓴다.
- 이 프로젝트는 그 기준을 따랐어요. 둘 다 써도 되는 경우가 많아서, "팀 규칙을 정하고 일관되게"가 정답이에요.

## 2. 모든 요청의 입구: `src/api/client.ts`

화면은 `fetch` 를 직접 쓰지 않고 `api()` 하나만 써요.

```ts
const data = await api<BoardPostsResponse>('/boards/free/posts', { query: { page: 2, q: '공지' } })
```

`api()` 가 대신 해 주는 일:
1. 주소 앞에 `/api` 붙이기, 빈 검색어는 빼고 쿼리스트링 만들기
2. GET 이 아니면 `X-CSRF-Token` 헤더 붙이기 (토큰은 로그인 세션 훅이 받아 둔다)
3. 응답이 실패면(`ok:false` 또는 4xx/5xx) **`ApiError` 를 던진다** — `status`(401, 404, 422…)와 `errors`(입력 오류 목록)를 담아서
4. 네트워크가 끊겨도 `ApiError('서버에 연결하지 못했어요…', 0)` 로 통일

그래서 화면은 오류 종류를 하나만 알면 돼요. `<FormErrors error={mutation.error} />` 가 422 면 오류 목록을, 아니면 메시지 하나를 보여줘요.

## 3. 서버 데이터는 react-query 에게: 왜 useState + useEffect 로 안 하나

직접 하면 이렇게 돼요.

```tsx
const [data, setData] = useState<BoardPostsResponse>()
const [loading, setLoading] = useState(true)
const [error, setError] = useState<unknown>()
useEffect(() => {
  setLoading(true)
  api<BoardPostsResponse>(`/boards/${key}/posts`).then(setData, setError).finally(() => setLoading(false))
}, [key])   // key 가 바뀔 때마다 다시
```

- `useState`: 화면에 영향을 주는 값(데이터, 로딩 여부, 오류)을 기억한다. 값이 바뀌면 컴포넌트가 다시 그려진다.
- `useEffect`: 그리기가 끝난 뒤 "바깥 세상"(서버 요청, 타이머, localStorage)과 맞추는 일을 한다. `[key]` 가 바뀔 때만 다시 실행된다.

이 방식도 동작하지만, 화면마다 같은 코드를 반복하고 **캐시·중복 요청·이전 요청 응답이 늦게 와서 덮어쓰기** 같은 문제를 직접 막아야 해요. 그래서 서버 데이터는 TanStack Query(react-query)에 맡겼어요.

```tsx
// src/api/site.ts — 화면은 useBoardPosts(key, page, q) 한 줄로 쓴다
const { data, isPending, error, refetch } = useQuery({
  queryKey: ['boards', key, 'posts', { page, q }],   // 이 데이터의 이름(캐시 열쇠)
  queryFn: () => api<BoardPostsResponse>(`/boards/${key}/posts`, { query: { page, q } }),
})
if (isPending) return <Loading />
if (error) return <ErrorState error={error} onRetry={refetch} />
return <PostTable posts={data.posts} />
```

`useState`/`useEffect` 는 여전히 써요. **서버에서 온 데이터가 아닌 것**에요.
- 폼 입력값, 팝업을 닫았는지, 슬라이더가 몇 번째인지 → `useState`
- 스크롤 위치 따라 탭 표시(스크롤스파이), 자동 슬라이드 타이머, 창 크기 변화 → `useEffect`

## 4. 수정하면 화면이 왜 갱신되나

```ts
// src/api/site.ts (간추림)
export function useUpdatePost(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UserPostInput) => api<MutationResult>(`/posts/${id}`, { method: 'PUT', json: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', id] })   // 이 글
      queryClient.invalidateQueries({ queryKey: ['boards'] })      // ['boards', …] 로 시작하는 모든 게시판 목록
      queryClient.invalidateQueries({ queryKey: ['home'] })        // 홈 최근 글
    },
  })
}
```

쿼리 키는 **앞부분이 같으면 한꺼번에** 무효화돼요. `['boards']` 하나로 `['boards', 'free', 'posts', { page: 2 }]` 같은 모든 목록이 갱신 대상이 돼요.

1. 저장 성공 → `invalidateQueries` 로 관련 캐시에 "오래됨" 표시
2. 지금 화면에 떠 있는 쿼리는 바로 다시 요청, 안 떠 있는 건 다음에 그 화면을 열 때 다시 요청
3. 새 데이터가 오면 그 데이터를 쓰는 컴포넌트가 다시 그려진다

관리자 화면의 저장·ON/OFF 는 `admin` 으로 시작하지 않는 키(홈, 띠배너, 게시판 목록…)를 모두 무효화해요 (`src/api/admin.ts` 의 `useAdminMutation`). 그래서 다른 탭의 홈 화면도 다음 요청부터 바뀐 팝업을 보여 줘요.

## 5. 로딩·오류·빈 상태

모든 목록·상세 화면은 같은 순서로 그려요.

| 상태 | 화면 | 컴포넌트 |
|---|---|---|
| 불러오는 중 | 스피너 + "불러오는 중이에요" | `<Loading />` |
| 실패 | 서버 메시지 + "다시 시도" 버튼 | `<ErrorState error onRetry />` |
| 비어 있음 | "등록된 팝업이 없어요…" 안내 | 각 표의 빈 행 |
| 저장 중 | 버튼 비활성 + "저장하는 중…" | `mutation.isPending` |

같은 모양을 컴포넌트로 뽑아 두면 문구나 디자인을 한 곳에서 바꿀 수 있고, 화면마다 빠뜨리는 일이 없어요. 이게 **공통 컴포넌트로 분리하는 이유**예요.

## 6. 직접 해 보기

1. `curl -i http://localhost:8150/api/home` — 홈 데이터 JSON 을 눈으로 확인
2. `curl -i http://localhost:8150/api/admin/posts` — 로그인 없이 401 이 오는지
3. 브라우저 개발자 도구 Network 탭에서 글을 저장하고, PUT 요청 뒤에 GET 요청이 다시 나가는지(무효화) 확인
4. `types.ts` 에서 `PostSummary.title` 을 `name` 으로 바꿔 보고 `npm run build` — 어디가 깨지는지 보면 타입의 역할이 보여요 (확인 후 되돌리기)
