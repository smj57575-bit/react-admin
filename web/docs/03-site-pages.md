# 03. 사용자 화면 (홈 · 게시판 · 글)

PHP 화면(`board/index.php`, `list.php`, `view.php`, `write.php`, `delete.php` — 지금은 지웠고 첫 커밋에 남아 있어요)을 React 로 옮긴 부분이에요.
마크업과 클래스 이름은 PHP 와 똑같이 두었기 때문에 `src/styles/site.css` 를 그대로 써서 디자인이 1:1 로 같아요.

## 1. 파일 지도

| 주소 | 파일 | 하는 일 |
| --- | --- | --- |
| `/` | `src/pages/site/HomePage.tsx` | 배너(없으면 히어로) · 구역 탭 · 소개 숫자 · 기능 · 최근 글 · FAQ · 바로가기 · 팝업 |
| | `home/BannerSlider.tsx` | 자동 넘김 슬라이더 (마우스·포커스가 올라가면 멈춤, "동작 줄이기" 설정 존중) |
| | `home/SectionTabs.tsx` | 구역 탭 + scrollspy |
| | `home/PopupLayer.tsx` | 겹쳐 쌓인 팝업 카드, "오늘 하루 보지 않기" |
| | `home/FaqSection.tsx` | `<details>` 로 여닫는 FAQ |
| | `home/Multiline.tsx` | 줄바꿈을 `<br>` 로 (PHP 의 `nl2br`) |
| `/boards`, `/boards/:key` | `BoardListPage.tsx` | 게시판 탭 · 검색 · 목록 · 페이지 번호 |
| `/posts/:id` | `PostViewPage.tsx` | 글 보기, 목록/수정/삭제 버튼 |
| `/boards/:key/write`, `/posts/:id/edit` | `PostFormPage.tsx` | 글쓰기·수정 (같은 폼을 함께 씀) |
| `/posts/:id/delete` | `PostDeletePage.tsx` | 비밀번호 확인 후 삭제 |
| | `urls.ts` | 목록 주소 만들기 `boardUrl('free', { q, page })` |
| | `src/api/site.ts` | 위 화면들이 쓰는 데이터 훅 (useHome, useBoardPosts, usePost, useCreatePost …) |

머리글·띠배너·푸터는 `src/layouts/SiteLayout.tsx` 가 그리고, 각 화면은 그 안의 `<Outlet />` 자리에 들어가요.

## 2. 데이터 흐름: API → react-query → 컴포넌트

화면은 `fetch` 를 직접 부르지 않아요. 세 단계를 거쳐요.

```
PHP API (/api/boards/free/posts)
   ↓  api<T>()            src/api/client.ts   — JSON 변환, 오류를 ApiError 로 통일
   ↓  useQuery 훅          src/api/site.ts     — 캐시 키를 정하고 결과를 캐시에 보관
   ↓  컴포넌트              BoardListPage.tsx   — isPending / error / data 에 따라 그리기만
```

```ts
// src/api/site.ts
export function usePost(id: number, { enabled = true } = {}) {
  return useQuery({ queryKey: siteKeys.post(id), queryFn: () => api<PostResponse>(`/posts/${id}`), enabled })
}
```

```tsx
// src/pages/site/PostViewPage.tsx
const { data, isPending, error, refetch } = usePost(id)
if (isPending) return <Loading />
if (error) {
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage message={error.message} />
  return <ErrorState error={error} onRetry={refetch} buttonClass="button button--sm button--ghost" />
}
// 여기부터는 data 가 반드시 있다 (TypeScript 도 안다)
```

캐시 키는 `siteKeys` 한곳에 모아 두었어요. 배열 앞부분이 같으면 한 번에 무효화할 수 있어요.

```ts
export const siteKeys = {
  home: ['home'],
  boards: ['boards'],                                         // 모든 게시판의 모든 목록
  boardPosts: (key) => ['boards', key, 'posts'],              // 한 게시판의 모든 페이지·검색
  boardPostsPage: (key, page, q) => ['boards', key, 'posts', { page, q }],
  post: (id) => ['posts', id],
}
```

## 3. 검색어·페이지를 주소에 두는 이유

`/boards/free?q=테스트&page=2` 처럼 검색어와 페이지를 `useState` 가 아니라 **주소(쿼리스트링)** 에 둬요.

- 새로고침해도 같은 화면 (state 는 새로고침하면 사라져요)
- 뒤로 가기가 "이전 검색 결과"로 돌아가요
- 주소를 복사해서 보내면 상대도 같은 결과를 봐요

```tsx
// src/pages/site/BoardListPage.tsx
const [searchParams] = useSearchParams()
const q = searchParams.get('q')?.trim() ?? ''
const page = Math.max(1, Number(searchParams.get('page')) || 1)
const { data } = useBoardPosts(boardKey, page, q)   // 주소가 바뀌면 → 키가 바뀌고 → 새로 불러온다
```

입력칸에 치는 글자(`draft`)만 state 로 들고 있다가, 검색 버튼을 누를 때 `setSearchParams({ q })` 로 주소에 반영해요.
뒤로 가기로 주소의 `q` 가 바뀌면 `<BoardSearch key={boardKey + q} />` 의 `key` 가 바뀌어 입력칸이 새 값으로 다시 만들어져요.

페이지를 넘길 때 화면이 깜빡이지 않도록 `placeholderData` 로 새 목록이 올 때까지 이전 목록을 보여줘요.
다른 게시판으로 옮길 때는 이전 게시판 글이 섞여 보이면 헷갈리니 비워요.

```ts
placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[1] === key ? previous : undefined),
```

## 4. 팝업 겹쳐 쌓기 (PopupLayer)

- 처음 한 번 `localStorage` 를 보고 "오늘 하루 보지 않기"한 팝업을 뺀 목록을 `open` state 로 들고 있어요.
- 남은 카드에 순서대로 `data-depth="0..3"` 을 붙이면 CSS 가 앞 카드는 그대로, 뒤 카드는 조금씩 비켜서 그려요.
- 뒤 카드(`i > 0`)는 `inert` → 클릭도 키보드 포커스도 안 돼요. 카운터는 `1 / 3`.
- 뒤 카드가 앞 카드보다 길게 삐져나오지 않도록 앞 카드 높이를 `--front-h` 로 레이어에 적어요. 화면 폭이 바뀌면 높이도 바뀌니 `resize` 때 다시 재요.

```tsx
useLayoutEffect(() => {
  syncFrontHeight()                                   // 그리기 전에 재야 깜빡임이 없다
  window.addEventListener('resize', syncFrontHeight)
  return () => window.removeEventListener('resize', syncFrontHeight)
}, [open, syncFrontHeight])
```

- "오늘 하루 보지 않기" → `popup-hide-{id}-{수정시각 숫자}` 키에 오늘 날짜(`YYYY-MM-DD`)를 저장. 관리자가 팝업을 고치면 수정시각이 바뀌어 키도 바뀌므로 다시 보여요.
- "닫기" → 저장 없이 `open` 에서만 빼요. 다 닫으면 `return null` 로 레이어 자체가 없어져요 (모바일의 어두운 배경이 화면을 막지 않게).
- `localStorage` 는 사생활 보호 모드 등에서 오류가 날 수 있어 `try/catch` 로 감쌌어요.

## 5. scrollspy (SectionTabs)

스크롤할 때마다 "화면 높이 45% 기준선을 지난 구역 중 마지막 것"을 지금 구역으로 봐요.

```ts
const line = window.innerHeight * 0.45
for (const el of sections) if (el.getBoundingClientRect().top <= line) id = el.id
// 맨 아래까지 내렸는데 마지막 구역이 기준선에 못 미치면 마지막 구역으로
if (atBottom && last.getBoundingClientRect().top < window.innerHeight) id = last.id
setCurrent(id)
```

- 기준선을 화면 맨 위가 아니라 가운데쯤에 둬야 바닥 근처의 짧은 구역(FAQ)도 건너뛰지 않아요.
- 현재 탭이 바뀌면 탭 줄만 `bar.scrollTo({ left })` 로 가로 스크롤해요. `scrollIntoView` 는 페이지 전체를 세로로도 움직여서 스크롤하던 사용자를 방해하니 쓰지 않아요.
- 탭 목록(`TABS`)은 컴포넌트 밖 상수예요. 렌더할 때마다 새 배열을 만들면 effect 가 매번 리스너를 다시 달기 때문이에요.

## 6. 글을 쓰면 목록이 바로 바뀌는 이유 (invalidateQueries)

목록은 30초 동안 캐시돼요(`main.tsx` 의 `staleTime`). 그래서 글을 쓰고 목록으로 돌아왔을 때 아무것도 안 하면 **새 글이 없는 옛 목록**이 보여요.
그래서 쓰기·수정·삭제가 성공하면 관련 캐시를 "낡았음"으로 표시해요.

```ts
// src/api/site.ts
export function useCreatePost(boardKey: string) {
  const invalidateLists = useInvalidateLists()
  return useMutation({
    mutationFn: (input: UserPostInput) => api(`/boards/${boardKey}/posts`, { method: 'POST', json: input }),
    onSuccess: () => invalidateLists(boardKey),   // ['boards', key, 'posts'] 아래 모든 페이지 + ['home']
  })
}
```

| 동작 | 무효화하는 키 | 이유 |
| --- | --- | --- |
| 글쓰기 | `['boards', key, 'posts']`, `['home']` | 그 게시판 목록, 홈의 최근 글·"공개된 글" 숫자 |
| 수정 | `['posts', id]`, `['boards']`, `['home']` | 글 보기, 제목이 보이는 모든 목록 |
| 삭제 | `['posts', id]` 제거, `['boards', key, 'posts']`, `['home']` | 지운 글은 캐시에서 아예 빼야 뒤로 가기로 돌아와도 안 보여요 |

`layoutKey`(메뉴의 게시판 목록·띠배너)는 글과 상관없어서 건드리지 않아요.

화면 쪽은 성공했을 때 어디로 갈지만 정해요.

```tsx
// src/pages/site/PostFormPage.tsx
create.mutate(input, { onSuccess: (res) => navigate(`/posts/${res.id}`, { replace: true }) })
```

`replace: true` 라서 뒤로 가기를 눌러도 방금 쓴 폼으로 돌아가지 않아요 (PHP 의 "POST 후 리다이렉트"와 같은 효과).

삭제 화면은 삭제가 끝난 뒤 그 글을 다시 불러오면 404 가 나니까 `usePost(id, { enabled: !remove.isSuccess })` 로 막아 둬요.

## 7. 서버 오류 보여주기

입력 검사는 두 겹이에요.

1. 브라우저: `required`, `maxLength`(제목 100 · 작성자 20 · 내용 20000 — 서버와 같은 값)
2. 서버: 422 검증 오류나 403 "비밀번호가 일치하지 않아요." → `ApiError.errors` / `message`

2번은 `<FormErrors error={mutation.error} className="alert" />` 한 줄로 폼 위에 보여줘요. 화면 코드는 오류 모양을 몰라도 돼요.
