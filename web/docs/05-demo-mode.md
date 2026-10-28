# 05. 데모 모드 (GitHub Pages)

> 이 문서를 읽고 나면: PHP 서버 없이 화면만 올라가는 곳에서 앱이 어떻게 돌아가는지, 그리고 화면 코드를 한 줄도 안 바꾸고 서버를 갈아 끼울 수 있었던 이유를 설명할 수 있어요.

## 1. 왜 필요한가

이 앱은 원래 `React 화면 ── fetch ──▶ PHP API ──▶ MySQL` 구조예요.
포트폴리오 링크로 보여 주려면 누구나 열 수 있는 주소가 필요한데, GitHub Pages 는 **정적 파일(HTML·JS·CSS·이미지)만** 올려 줘요. PHP 도 MySQL 도 없어요.

그래서 빌드할 때 `VITE_DEMO=true` 를 주면, API 요청을 **브라우저 안의 가짜 서버**가 받도록 했어요.

```
일반:  화면 ── api() ── fetch('/api/...') ──▶ PHP API ──▶ MySQL
데모:  화면 ── api() ── demoRequest(...)  ──▶ api/demo/handler.ts ──▶ localStorage
```

- 주소: https://smj57575-bit.github.io/react-admin/
- 데모 계정: `admin` / `admin1234`
- 미리 들어 있는 방문자 글의 비밀번호: `1234`

## 2. 어디서 갈라지나: `src/api/client.ts` 한 곳

화면은 원래도 `fetch` 를 직접 쓰지 않고 `api()` 만 불렀어요(노트 02의 2장). 그래서 갈림길도 `api()` 안에 하나만 두면 돼요.

```ts
export const IS_DEMO = import.meta.env.VITE_DEMO === 'true'

if (IS_DEMO) {
  const { demoRequest } = await import('./demo/handler')   // 처음 한 번만 내려받는다
  res = await demoRequest({ method, path, search, json, form })
} else {
  res = await httpRequest('/api' + path + ..., method, json, form)
}
```

- `import.meta.env.VITE_DEMO` 는 **빌드할 때** 글자 그대로 바뀌어요. 일반 빌드에서는 `if (false)` 가 되고, 번들러가 그 안의 코드와 `import('./demo/handler')` 를 통째로 지워요. 그래서 일반 빌드 결과(`dist/`)에는 데모 코드가 한 줄도 없어요.
- `import()` (dynamic import)는 파일을 따로 떼어 두었다가 필요할 때 내려받아요. 데모 빌드에서도 첫 화면 JS 가 무거워지지 않아요.
- 데모 코드를 부르는 곳을 `client.ts` 한 파일로 모았어요(`resetDemoData()` 포함). 다른 파일에서 `import('./demo/...')` 를 하면 일반 빌드에도 쓰이지 않는 조각 파일이 남을 수 있거든요.

## 3. 가짜 서버가 PHP 를 어떻게 흉내 내나: `src/api/demo/`

| 파일 | 하는 일 | 짝이 되는 PHP |
|---|---|---|
| `handler.ts` | 경로표, 상태 코드, 응답 모양, 핸들러 | `server/api/index.php`, `lib.php`, `public.php`, `admin.php` |
| `rules.ts` | 입력 검증 문구·글자 수, 노출 상태(live/scheduled/ended/off), ON/OFF 문구, 띠배너 글자색(WCAG 대비) | `posts.php`, `boards.php`, `schedule.php`, `notice_bars.php`, `faqs.php`, `upload.php`, `common.php` |
| `db.ts` | 테이블을 JSON 하나로 localStorage(`react-admin-demo-v1`)에 저장, 세션 | MySQL, `$_SESSION` |
| `seed.ts` | 처음 데이터 (게시판 3개는 `schema.sql` 과 같다) | `schema.sql` |

맞춰 둔 것:
- **응답 모양** `{ ok: true, ... }` / `{ ok: false, message, errors? }`, **상태 코드** 200·201·401·403·404·405·409·422 가 PHP 와 같아요. 화면의 `ApiError`, `<FormErrors>` 가 그대로 동작하는 이유예요.
- **입력 읽는 법**: PHP 의 `api_load_input()` 처럼 `true → '1'`, `false·null → 빼기`, 체크박스는 "보내면 ON". FormData 의 파일은 `$_FILES` 자리로.
- **정렬**: SQL 의 `ORDER BY` 를 `sort()` 로 (`is_notice DESC, priority DESC, id DESC` 등).
- **노출 판단**: `is_active` 이고 시작일 ≤ 지금 < 종료일일 때만 홈에 보여요. 날짜는 MySQL 처럼 `'2026-10-28 15:02:07'` 문자열이라 문자열 비교로 앞뒤를 재요.
- 이미지 업로드는 서버에 파일로 저장하는 대신 **data URL**(이미지를 글자로 바꾼 것)로 행 안에 넣어요. 2MB·형식 검사는 같고, 저장 공간이 꽉 차면 413 으로 "데모 저장 공간이 부족해요" 를 돌려줘요.
- 요청마다 약 150ms 기다려요. 로딩 표시가 실제처럼 잠깐 보이게요.

> 핵심: 화면 코드(pages/, components/)는 데모인지 몰라요. "API 약속(모양)"만 지키면 뒤에 무엇이 있든 화면은 그대로 — 노트 01의 "서버를 바꿔도 api/ 폴더만 고치면 된다"를 직접 해 본 셈이에요.

## 4. 하위 경로(/react-admin/)에서 동작하게

GitHub Pages 주소는 `/` 가 아니라 `/react-admin/` 아래예요.

- `vite.config.ts`: `base: process.env.BASE_PATH ?? '/'` → JS·CSS 경로가 `/react-admin/assets/...` 로 빌드돼요.
- `router.tsx`: `createBrowserRouter(routes, { basename })` — 주소표는 그대로 `'/boards/:key'` 처럼 쓰고, 라우터가 앞에 `/react-admin` 을 붙여요. `<Link to="/">` 도 알아서 맞춰져요.
- 라우터를 거치지 않는 `<a href>`, `<img src>` 는 `lib/format.ts` 의 `appUrl()`, `uploadUrl()` 로 만들어요. `data:` 와 `http(s)://` 주소는 손대지 않아요.
- **새로고침·직접 링크**: `/react-admin/boards/free` 같은 파일은 실제로 없어서 Pages 가 `404.html` 을 줘요. 빌드 후 `index.html` 을 `404.html` 로 복사해 두면, 그 페이지가 React 앱을 띄우고 라우터가 주소를 읽어 알맞은 화면을 그려요. (플러그인 대신 `cp` 한 줄을 고른 이유: 무슨 일이 일어나는지 workflow 에서 바로 보이니까요)

## 5. 데모에서만 보이는 것

- 헤더·사이드바의 작은 **데모** 배지
- 로그인 화면의 데모 계정 안내 (데모에서는 "기본 비밀번호 경고" 대신 이걸 보여요)
- 관리자 사이드바 아래 **데모 데이터 초기화** — 확인 후 localStorage 를 처음 데이터로 되돌리고 react-query 캐시도 비워요(로그인 상태는 유지)

## 6. 한계 — 꼭 알아 둘 것

- **데이터는 브라우저마다 따로**예요. 내가 바꾼 팝업은 다른 사람에게 안 보여요. 사생활 보호 모드나 저장소 삭제 시 처음 데이터로 돌아가요.
- **로그인은 데모용 표시일 뿐**이에요. localStorage 는 누구나 개발자 도구로 고칠 수 있어요. 진짜 보안(세션, CSRF, 비밀번호 시도 제한, 파일 내용으로 이미지 판별)은 **PHP API 에만** 있어요. 데모는 CSRF 확인·시도 제한을 생략했어요.
- 방문자 글 비밀번호는 `솔트 + SHA-256` 으로 저장해요. 평문보다는 낫지만, 실제 서버가 쓰는 bcrypt(일부러 느린 해시)와는 달라요.
- 띠배너 "오늘 하루 닫기", 팝업 "오늘 하루 보지 않기" 같은 기록도 같은 브라우저 저장소에 있어요.

## 7. 직접 해 보기

```bash
cd web
npm run dev:demo      # 데모 모드로 개발 서버 (PHP 없이) → http://localhost:5173/
npm run build:demo    # GitHub Pages 와 같은 빌드 (dist/ 에 404.html 까지)
```

배포는 `.github/workflows/deploy.yml` 이 해요. `main` 에 push 하면 데모 빌드 → Pages 업로드까지 자동이에요.
