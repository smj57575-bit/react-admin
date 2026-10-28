# Test Dev — 관리자에서 바꾸면 홈페이지에 바로 반영되는 사이트

관리자 페이지에서 공지·이벤트·팝업·배너·띠배너·FAQ를 등록하면, 그 결과가 홈페이지에 바로 반영되는 통합 프로젝트예요.
처음에는 PHP 서버 렌더링으로 만들었고, 이후 **React + TypeScript 화면**과 **PHP JSON API**로 나눴어요. 커밋 이력에 그 과정이 단계별로 남아 있어요. (예전 PHP 화면은 첫 커밋 `기존 PHP 버전`에서 볼 수 있어요)

| 영역 | 보여 주는 것 |
|---|---|
| 홈페이지 | 원페이지 홈, 게시판 서브 페이지, 반응형, 공통 헤더·푸터, 메뉴 2뎁스, 섹션 탭(스크롤스파이), 팝업(카드 쌓기), 배너 슬라이더, 띠배너 |
| 게시판·관리자 | 글 CRUD, 검색·필터·페이지네이션, 일괄 처리, 이미지 업로드, 관리자 로그인, ON/OFF·노출 기간 |
| 데이터 연동 | REST API 조회·저장, 로딩·오류·빈 상태, 폼 검증(클라이언트 + 서버), TypeScript 타입, 캐시 무효화 |

## 기술

| | |
|---|---|
| 프론트엔드 | React 19, TypeScript, Vite |
| 라우팅 | React Router (화면별 지연 로딩) |
| 서버 데이터 | TanStack Query (캐시, 무효화, 낙관적 업데이트) |
| 스타일 | 일반 CSS (사용자·관리자 레이아웃별로 붙였다 뗌) |
| 백엔드 | PHP 8 JSON API (프레임워크 없이), MySQL 8 (PDO) |

## 구조

```
React (web/)  ──fetch /api/...──▶  PHP API (server/api/)  ──▶  MySQL
  화면만 그린다     ◀──── JSON ────    로그인·CSRF·검증·DB
```

```
server/       PHP API 서버: JSON API(api/), 검증·보안·DB 로직, DB 스키마
web/src/
  api/        타입 정의, fetch 래퍼, 데이터 훅 (site.ts, admin.ts, session.ts)
  components/ 공통 부품: 로딩·오류, 폼 오류, 페이지네이션, 토스트, 삭제 확인, 스위치
  layouts/    사용자 레이아웃, 관리자 레이아웃(로그인 확인)
  pages/      site/ 사용자 화면, admin/ 관리자 화면
web/docs/     학습 노트 01~05
```

## 데모

**https://smj57575-bit.github.io/react-admin/** — PHP·MySQL 없이 브라우저 안에서 돌아가는 데모예요.

- 관리자 계정: `admin` / `admin1234` (데모에 미리 있는 방문자 글 비밀번호는 `1234`)
- 바꾼 데이터는 그 브라우저(localStorage)에만 저장돼요. 관리자 사이드바의 "데모 데이터 초기화"로 처음 상태로 되돌릴 수 있어요
- `main` 에 push 하면 GitHub Actions(`.github/workflows/deploy.yml`)가 데모 모드로 빌드해서 올려요. 처음 한 번만 저장소 **Settings → Pages → Source: GitHub Actions** 로 바꿔 두세요
- 어떻게 동작하는지: `web/docs/05-demo-mode.md`. 로컬에서는 `cd web && npm run dev:demo`

## 실행

필요한 것: PHP 8.2+, MySQL 8, Node 20+

```bash
# 1) DB 만들기 (한 번)
mysql -uroot -e "CREATE DATABASE board CHARACTER SET utf8mb4"
mysql -uroot board < server/schema.sql
# DB 접속 정보는 server/config.php (환경변수 BOARD_DB_USER 등) 참고

# 2) React 의존성 설치 (한 번)
cd web && npm install && cd ..

# 3) 실행 — PHP API(8150) + React(5173)
./start.sh
```

- 홈페이지: http://localhost:5173/
- 관리자: http://localhost:5173/admin (기본 계정 admin / admin1234 — 운영에서는 `BOARD_ADMIN_HASH` 로 반드시 변경)

## API

| 메서드 | 주소 | 설명 |
|---|---|---|
| GET | `/api/session` | 로그인 상태, CSRF 토큰 |
| POST | `/api/login`, `/api/logout` | 관리자 로그인·로그아웃 |
| GET | `/api/layout`, `/api/home` | 띠배너·메뉴, 홈 데이터 |
| GET/POST | `/api/boards/{key}/posts` | 게시판 글 목록(검색·페이지), 방문자 글쓰기 |
| GET/PUT/DELETE | `/api/posts/{id}` | 글 보기, 비밀번호로 수정·삭제 |
| GET/POST/PUT/DELETE | `/api/admin/posts…`, `/api/admin/boards…`, `/api/admin/faqs…` | 관리자 CRUD, 일괄 처리, ON/OFF(`PATCH …/toggle`) |
| GET/POST/DELETE | `/api/admin/popups…`, `/api/admin/banners…`, `/api/admin/notice-bars…` | 이미지 업로드(multipart), 노출 기간, ON/OFF |

응답은 `{ ok: true, … }` / `{ ok: false, message, errors? }` 하나의 모양. 상태 코드: 401 로그인 필요, 403 CSRF·비밀번호 불일치, 404 없음, 409 삭제 불가(글이 남은 게시판), 422 입력 오류.

## 보안에서 신경 쓴 것

- **권한은 서버에서**: 관리자 화면을 숨기는 건 편의일 뿐, `/api/admin/*` 는 요청마다 세션을 확인해 401 을 돌려준다
- **CSRF**: GET 이 아닌 모든 요청은 세션 토큰을 `X-CSRF-Token` 헤더로 확인
- **XSS**: 사용자 입력은 React 가 문자열로만 그린다 (`dangerouslySetInnerHTML` 사용 안 함). 링크는 http(s) 만 허용
- **업로드**: 확장자가 아니라 파일 내용(MIME)으로 이미지 판별, 2MB 제한, 랜덤 파일명
- **비밀번호 시도 제한**: 관리자 로그인·방문자 글 비밀번호 15분 5회
- **SQL**: 모든 쿼리 prepared statement

## 공부 가이드 — 이 질문에 답할 수 있으면 된다

| 질문 | 볼 곳 |
|---|---|
| 컴포넌트와 props 가 무엇인가 | `components/Pager.tsx` (props: page, totalPages, to), `components/ConfirmSheet.tsx` |
| useState, useEffect 를 왜 쓰나 | `pages/site/home/PopupLayer.tsx`(닫은 팝업 상태), `pages/site/home/SectionTabs.tsx`(스크롤 감지), 노트 02 |
| type 과 interface 는 어떻게 쓰나 | `api/types.ts`, 노트 02 의 1장 |
| API 데이터를 어떻게 화면에 표시하나 | `api/client.ts` → `api/site.ts` → `pages/site/BoardListPage.tsx`, 노트 02 |
| 글을 수정하면 화면이 왜 갱신되나 | `api/site.ts` 의 `invalidateQueries`, `api/admin.ts` 의 `useToggle`, 노트 02 의 4장 |
| 공통 컴포넌트로 분리하면 뭐가 좋아지나 | `components/QueryState.tsx`, `pages/admin/schedule/` (팝업·배너·띠배너가 같이 씀), 노트 04 |
