# 01. 전체 구조

> 이 문서를 읽고 나면: 화면(React)과 서버(PHP API)가 어떻게 나뉘고, 요청 하나가 어떤 길로 오가는지 설명할 수 있어요.

## 한 장 요약

```
┌──────────── 브라우저 ────────────┐        ┌────────── 서버 ──────────┐
│ React 앱 (web/)                  │        │ PHP API (server/api/)     │
│                                  │  fetch │                          │
│  화면 컴포넌트 ─ react-query ─ api()  ──────▶  index.php 경로표          │
│      ▲                │          │  JSON  │    │ 로그인·CSRF 확인       │
│      └── 캐시 갱신 ◀───┘          ◀──────  │    ▼                      │
│                                  │        │  검증·DB (common.php 등)  │──▶ MySQL
└──────────────────────────────────┘        └──────────────────────────┘
```

- **React 앱**은 화면만 그려요. 데이터가 필요하면 API에 물어봐요.
- **PHP API**는 데이터만 줘요(JSON). 화면 모양은 몰라요.
- 둘은 "이 주소로 이렇게 물으면 이런 JSON을 준다"는 **약속(API)**으로만 연결돼요. 그래서 나중에 서버를 Node나 Supabase로 바꿔도 화면 코드는 `api/` 폴더만 고치면 돼요.

## 폴더

```
php_test/
├─ server/                PHP — JSON API 서버 (예전 PHP 화면은 첫 커밋의 board/ 에 남아 있다)
│  ├─ api/                ← React 가 부르는 API (이번에 추가)
│  │  ├─ index.php        경로표: 어떤 주소가 어떤 함수로 가는지
│  │  ├─ lib.php          JSON 응답, 입력, 로그인·CSRF 확인
│  │  ├─ public.php       방문자용: 홈, 게시판, 글
│  │  └─ admin.php        관리자용: 글, 게시판, 팝업, 배너, 띠배너, FAQ
│  ├─ common.php …        검증·보안·DB 로직 (PHP 화면 시절부터 쓰던 것을 API가 그대로 쓴다)
│  └─ schema.sql          DB 테이블
└─ web/                   React + TypeScript
   └─ src/
      ├─ main.tsx         시작점: react-query + 라우터 연결
      ├─ router.tsx       주소 → 화면 연결표
      ├─ api/             서버와 이야기하는 코드 (타입, fetch, 데이터 훅)
      ├─ components/      여러 화면이 같이 쓰는 부품 (로딩, 오류, 페이지네이션, 토스트, 삭제 확인…)
      ├─ layouts/         화면 틀: 사용자(헤더·푸터), 관리자(사이드바·상단바)
      ├─ pages/site/      사용자 화면: 홈, 게시판, 글
      ├─ pages/admin/     관리자 화면
      └─ styles/          CSS (사용자 / 관리자)
```

## 요청 하나 따라가기: "팝업 노출 끄기"

1. 관리자가 팝업 목록에서 스위치를 누른다 → `PopupsPage` 의 `onChange`
2. 데이터 훅(`api/admin.ts`)의 mutation 이 `api('/admin/popups/5/toggle', { method: 'PATCH' })` 를 부른다
3. `api/client.ts` 가 `X-CSRF-Token` 헤더를 붙여 `fetch` 한다
4. 개발 중에는 Vite 가 `/api` 요청을 PHP 서버(8150)로 넘긴다 (`vite.config.ts` 의 proxy)
5. PHP `api/index.php`: `/admin` 으로 시작하니 **로그인 확인** → CSRF 확인 → `api_schedule_toggle()` 실행
6. DB 를 바꾸고 `{"ok":true,"status":"off","message":"‘추석 팝업’ 노출을 껐어요", …}` 를 돌려준다
7. 화면: 토스트로 메시지를 띄우고, react-query 캐시를 무효화(`invalidateQueries`)해서 목록과 **홈 화면 데이터**가 새로 불러와진다

## 권한은 어디서 막나

| 위치 | 하는 일 | 왜 |
|---|---|---|
| React `AdminLayout` | 로그인 안 했으면 로그인 화면으로 보낸다 | 사용자 편의 (빈 화면 대신 안내) |
| PHP `api/index.php` | `/api/admin/...` 은 로그인 안 했으면 **401** | 진짜 보안. 화면 코드는 누구나 고칠 수 있어서 화면만 막으면 뚫린다 |
| PHP `api_verify_csrf()` | GET 이 아닌 요청은 CSRF 토큰 확인, 틀리면 **403** | 다른 사이트가 관리자 브라우저로 몰래 요청을 보내는 공격 방지 |

> 면접 포인트: "버튼을 숨기는 건 UX, 권한 검사는 서버"라고 설명할 수 있으면 돼요. `curl http://localhost:8150/api/admin/posts` 를 로그인 없이 보내 보면 401 이 와요.

## 왜 이렇게 나눴나

- **기존 PHP 로직 재사용**: 입력 검증(`post_errors()` 등), 업로드 검사, 로그인 시도 제한을 API 가 그대로 부른다. 같은 규칙을 두 번 짜지 않는다.
- **같은 주소(origin)처럼 보이게**: 개발 땐 Vite 프록시, 배포 땐 같은 도메인 아래 `/api` 로 두면 로그인 세션 쿠키가 그대로 동작한다. 다른 도메인이면 CORS·쿠키 설정이 추가로 필요하다.
- **레이아웃별 CSS**: 사용자 화면과 관리자 화면의 CSS 가 `body`, `:root` 를 서로 다르게 정의한다. 둘을 동시에 두면 덮어써서, 레이아웃이 화면에 있을 때만 붙이도록 했다 (`lib/useStylesheet.ts`).
