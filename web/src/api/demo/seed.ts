// 데모 처음 데이터 — 처음 방문했을 때와 "데모 데이터 초기화"를 눌렀을 때 이 내용으로 시작한다
// 게시판 3개는 server/schema.sql 과 같다. 날짜는 "오늘" 기준으로 만들어서 언제 열어도 최근 글처럼 보인다
// 방문자 글 비밀번호는 모두 1234 — 평문 대신 '솔트$sha256(솔트+비밀번호)' 로 저장한다 (handler.ts 의 hashPassword)
import type { DemoDb, PostRow } from './db'
import { toDateTime } from './db'

const DEMO_PASSWORD_HASH = 'c0ffee42$ce5540acd4fb1035e7fb5b366f9af4cd41e0a086d15df682bb0863dc0ac14bdb'   // 1234

/** n 일 전 (시·분까지 정해서 목록 순서가 자연스럽게) */
function daysAgo(days: number, hour = 10, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return toDateTime(d)
}

type PostSeed = Pick<PostRow, 'board_id' | 'title' | 'author' | 'content'> & Partial<PostRow>

function post(id: number, seed: PostSeed): PostRow {
  return { id, password: null, is_published: true, is_notice: false, priority: 0, hits: 0, created_at: daysAgo(0), updated_at: null, ...seed }
}

export function createSeed(): DemoDb {
  const posts = [
    post(1, {
      board_id: 2,
      title: '데모 사이트에 오신 걸 환영해요',
      author: '관리자',
      content: '이 사이트는 서버 없이 브라우저 안에서 돌아가는 데모예요.\n관리자 화면(admin / admin1234)에서 배너·팝업·띠배너·FAQ를 바꾸면 홈에 바로 반영돼요.\n바꾼 내용은 지금 쓰는 브라우저에만 저장되고, 다른 사람에게는 보이지 않아요.',
      is_notice: true,
      hits: 128,
      created_at: daysAgo(6, 9, 30),
    }),
    post(2, {
      board_id: 2,
      title: '관리자 기능 한눈에 보기',
      author: '관리자',
      content: '글 관리: 검색, 게시판 필터, 일괄 공개·비공개·이동·삭제\n게시판 관리: 방문자 글쓰기 허용, ON/OFF, 표시 순서\n배너·팝업·띠배너: 노출 기간과 ON/OFF, 이미지 업로드\nFAQ: 분류별 관리와 노출 순서',
      is_notice: true,
      hits: 74,
      created_at: daysAgo(5, 14, 10),
    }),
    post(3, {
      board_id: 2,
      title: '게시판 이용 규칙',
      author: '관리자',
      content: '자유게시판에는 누구나 글을 쓸 수 있어요. 글을 쓸 때 정한 비밀번호로 나중에 수정하거나 지울 수 있어요.\n"관리자", "admin" 같은 작성자명은 쓸 수 없어요.',
      hits: 41,
      created_at: daysAgo(4, 11, 0),
    }),
    post(4, {
      board_id: 3,
      title: '띠배너 색 바꿔 보기',
      author: '관리자',
      content: '관리자 > 띠배너 관리에서 배경색을 골라 보세요.\n글자색은 배경 밝기에 맞춰 자동으로 정해져요. (WCAG 명도 대비 계산)',
      hits: 23,
      created_at: daysAgo(3, 16, 20),
    }),
    post(5, {
      board_id: 3,
      title: '팝업 예약 노출 체험 (준비 중)',
      author: '관리자',
      content: '시작일을 내일로 정한 팝업은 "예약" 상태가 되고, 그 시각이 되면 홈에 나타나요.\n이 글은 아직 비공개라 관리자만 볼 수 있어요.',
      is_published: false,
      created_at: daysAgo(1, 13, 0),
    }),
    post(6, {
      board_id: 1,
      title: '자유게시판 사용법',
      author: '관리자',
      content: '오른쪽 위 "글쓰기"로 글을 남길 수 있어요. 비밀번호는 수정·삭제할 때 다시 물어봐요.\n데모에 미리 들어 있는 방문자 글의 비밀번호는 모두 1234예요.',
      priority: 1,
      hits: 57,
      created_at: daysAgo(5, 10, 0),
    }),
    post(7, {
      board_id: 1,
      title: '첫 글 남겨요',
      author: '새싹',
      content: '데모라서 마음 편히 이것저것 눌러 보고 있어요.\n글쓰기가 생각보다 빠르네요!',
      password: DEMO_PASSWORD_HASH,
      hits: 12,
      created_at: daysAgo(3, 20, 45),
    }),
    post(8, {
      board_id: 1,
      title: '검색 기능 테스트',
      author: '테스터',
      content: '제목·내용·작성자 어디에 있어도 검색돼요. "테스트"로 검색해 보세요.',
      password: DEMO_PASSWORD_HASH,
      hits: 9,
      created_at: daysAgo(2, 15, 5),
    }),
    post(9, {
      board_id: 1,
      title: '모바일에서도 잘 보이네요',
      author: '모바일러',
      content: '휴대폰으로 열어 보니 팝업이 아래에서 올라오는 시트로 바뀌어요.\n관리자 메뉴도 아래쪽 탭으로 바뀌고요.',
      password: DEMO_PASSWORD_HASH,
      hits: 6,
      created_at: daysAgo(1, 9, 40),
    }),
    post(10, {
      board_id: 1,
      title: '이미지는 어디에 저장되나요?',
      author: '궁금해요',
      content: '데모에서 올린 이미지는 서버가 아니라 브라우저 저장소에 글자(data URL)로 들어간대요.\n그래서 2MB 이하 작은 이미지만 올릴 수 있어요.',
      password: DEMO_PASSWORD_HASH,
      hits: 3,
      created_at: daysAgo(0, 8, 15),
    }),
  ]

  return {
    boards: [
      { id: 1, board_key: 'free', name: '자유게시판', description: '누구나 글을 남길 수 있는 게시판입니다.', allow_user_write: true, is_active: true, sort_order: 3, created_at: daysAgo(30) },
      { id: 2, board_key: 'notice', name: '공지사항', description: '공지사항 게시판입니다.', allow_user_write: false, is_active: true, sort_order: 1, created_at: daysAgo(30) },
      { id: 3, board_key: 'event', name: '이벤트', description: '진행 중인 이벤트와 프로모션입니다.', allow_user_write: false, is_active: true, sort_order: 2, created_at: daysAgo(30) },
    ],
    posts,
    banners: [
      {
        id: 1,
        title: '관리자에서 바꾸면, 홈에 바로 보여요',
        subtitle: '배너·팝업·띠배너·FAQ를 관리자 화면에서 직접 바꿔 보세요.',
        button_text: null,
        image_path: 'demo/banner-1.svg',
        link_url: null,
        link_new_tab: false,
        is_active: true,
        starts_at: null,
        ends_at: null,
        sort_order: 0,
        created_at: daysAgo(7),
        updated_at: null,
      },
      {
        id: 2,
        title: '노출 기간만 정하면 알아서 켜지고 꺼져요',
        subtitle: '시작일·종료일을 정해 두면 예약 → 노출 중 → 기간 종료로 상태가 바뀌어요.',
        button_text: null,
        image_path: 'demo/banner-2.svg',
        link_url: null,
        link_new_tab: false,
        is_active: true,
        starts_at: null,
        ends_at: null,
        sort_order: 1,
        created_at: daysAgo(7),
        updated_at: null,
      },
    ],
    popups: [
      {
        id: 1,
        title: '데모 모드로 보고 있어요',
        content: '이 사이트는 서버 없이 브라우저 안에서 돌아가요.\n관리자(admin / admin1234)로 로그인해서 팝업을 바꿔 보세요.',
        image_path: null,
        link_url: null,
        link_new_tab: false,
        is_active: true,
        starts_at: null,
        ends_at: null,
        sort_order: 0,
        created_at: daysAgo(2),
        updated_at: null,
      },
      {
        id: 2,
        title: '가을 업데이트 미리 보기',
        content: null,
        image_path: 'demo/popup-1.svg',
        link_url: null,
        link_new_tab: false,
        is_active: true,
        starts_at: null,
        ends_at: null,
        sort_order: 1,
        created_at: daysAgo(2),
        updated_at: null,
      },
    ],
    notice_bars: [
      {
        id: 1,
        message: '데모 사이트예요. 바꾼 내용은 이 브라우저에만 저장돼요.',
        bg_color: '#6D5AE6',
        dismissible: true,
        link_url: null,
        link_new_tab: false,
        is_active: true,
        starts_at: null,
        ends_at: null,
        sort_order: 0,
        created_at: daysAgo(2),
        updated_at: null,
      },
    ],
    faqs: [
      { id: 1, category: '일반', question: '이 사이트는 무엇인가요?', answer: '관리자 화면에서 바꾼 내용이 홈페이지에 바로 반영되는 연습용 사이트예요.\nReact 화면과 PHP API로 나뉘어 있고, 지금은 데모 모드로 돌아가고 있어요.', is_active: true, sort_order: 0, created_at: daysAgo(10), updated_at: null },
      { id: 2, category: '일반', question: '데이터는 어디에 저장되나요?', answer: '데모에서는 브라우저 저장소(localStorage)에 저장돼요. 원래 버전은 PHP API가 MySQL에 저장해요.', is_active: true, sort_order: 1, created_at: daysAgo(10), updated_at: null },
      { id: 3, category: '일반', question: '다른 사람도 제가 바꾼 내용을 보나요?', answer: '아니요. 데모 데이터는 지금 쓰는 브라우저에만 있어요. 관리자 화면의 "데모 데이터 초기화"로 처음 상태로 되돌릴 수 있어요.', is_active: true, sort_order: 2, created_at: daysAgo(10), updated_at: null },
      { id: 4, category: '이용 방법', question: '관리자 화면에는 어떻게 들어가나요?', answer: '맨 아래 "관리자" 링크를 누르고 admin / admin1234 로 로그인하세요.', is_active: true, sort_order: 0, created_at: daysAgo(10), updated_at: null },
      { id: 5, category: '이용 방법', question: '제가 쓴 글을 고치거나 지우려면?', answer: '글 아래 "수정"이나 "삭제"를 누르고, 글을 쓸 때 정한 비밀번호를 입력하세요.', is_active: true, sort_order: 1, created_at: daysAgo(10), updated_at: null },
    ],
    lastId: { boards: 3, posts: posts.length, banners: 2, popups: 2, notice_bars: 1, faqs: 5 },
  }
}
