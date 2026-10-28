// 사용자 홈 (원페이지) — 배너(없으면 기본 히어로) · 구역 탭 · 소개 숫자 · 기능 · 최근 글 · FAQ · 바로가기 · 팝업
// 데이터는 GET /api/home 한 번으로 받는다. 관리자에서 바꾼 결과가 바로 보이는지 확인하는 화면
import { Link } from 'react-router'
import { useHome } from '../../api/site'
import { ErrorState, Loading } from '../../components/QueryState'
import { formatDate } from '../../lib/format'
import { usePageTitle } from '../../lib/usePageTitle'
import { BannerSlider } from './home/BannerSlider'
import { FaqSection } from './home/FaqSection'
import { PopupLayer } from './home/PopupLayer'
import { SectionTabs, type SectionTab } from './home/SectionTabs'

const FEATURES = [
  ['팝업 관리', '제목·내용·이미지·링크와 노출 기간을 정하고 ON/OFF 로 켜고 끕니다. 이 페이지에 뜨는 팝업이 그 결과예요.'],
  ['배너 관리', '메인 상단 배너를 등록하면 이 소개 영역 대신 슬라이드로 바뀝니다. 노출 중인 배너가 없으면 지금 화면이 보여요.'],
  ['FAQ 관리', '자주 묻는 질문을 등록하고 관리할 수 있습니다. 사용자들이 쉽게 찾을 수 있도록 정리해보세요.'],
  ['게시판 관리', '게시판을 추가하고 노출 여부, 방문자 글쓰기 허용, 글 순서를 관리합니다. 아래 최근 글도 여기서 옵니다.'],
] as const

// 탭 목록은 컴포넌트 밖 상수 → 렌더마다 새 배열이 생기지 않아 SectionTabs 의 effect 가 다시 돌지 않는다
const TABS: SectionTab[] = [
  { id: 'about', label: '소개' },
  { id: 'features', label: '기능' },
  { id: 'news', label: '최근 글' },
  { id: 'faq', label: 'FAQ' },
  { id: 'links', label: '바로가기' },
]
const TABS_WITHOUT_FAQ = TABS.filter((t) => t.id !== 'faq')

export default function HomePage() {
  usePageTitle(null)
  const { data, isPending, error, refetch } = useHome()

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} buttonClass="button button--sm button--ghost" />

  const { banners, popups, faqs, news, numbers } = data

  return (
    <>
      {banners.length ? (
        <BannerSlider banners={banners} />
      ) : (
        <section className="hero">
          <div className="container">
            <p className="eyebrow">PHP · MySQL 개발 연습</p>
            <h1 className="hero__title">
              관리자에서 바꾸면,
              <br />
              여기에 바로 보입니다.
            </h1>
            <p className="hero__lead">팝업·배너·게시판을 관리자 페이지에서 관리하고, 그 결과가 홈페이지에 어떻게 반영되는지 확인하는 테스트 사이트입니다.</p>
            <div className="hero__actions">
              <Link to="/admin/login" className="button button--primary">
                관리자 페이지
              </Link>
              <Link to="/boards" className="button button--ghost">
                게시판 보기
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 노출할 FAQ 가 없으면 FAQ 탭도 뺀다 */}
      <SectionTabs tabs={faqs.length ? TABS : TABS_WITHOUT_FAQ} />

      <section className="section" id="about">
        <div className="container about">
          <div>
            <p className="eyebrow">소개</p>
            <h2 className="section__title">
              관리하는 쪽과
              <br />
              보여주는 쪽을 나눴습니다.
            </h2>
          </div>
          <div className="about__text">
            <p>관리자 페이지는 로그인한 관리자만 들어갈 수 있고, 등록·수정한 내용은 모두 데이터베이스에 저장됩니다.</p>
            <p>이 홈페이지는 저장된 데이터를 읽어서 보여주기만 합니다. 아래 숫자도 지금 DB 에 있는 값이에요.</p>
          </div>
        </div>
        <div className="container numbers">
          {numbers.map((n) => (
            <div key={n.label} className="numbers__item">
              <strong>{n.value}</strong>
              <span>{n.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--tint" id="features">
        <div className="container">
          <p className="eyebrow">기능</p>
          <h2 className="section__title">지금 테스트할 수 있는 것들</h2>
          <div className="cards">
            {FEATURES.map(([title, desc], i) => (
              <article key={title} className="card">
                <span className="card__num">0{i + 1}</span>
                <h3 className="card__title">{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="news">
        <div className="container">
          <div className="section__head">
            <div>
              <p className="eyebrow">게시판</p>
              <h2 className="section__title">최근 글</h2>
            </div>
            <Link to="/boards" className="link-more">
              전체 보기 →
            </Link>
          </div>
          {news.length === 0 ? (
            <p className="empty">아직 공개된 글이 없습니다.</p>
          ) : (
            <ul className="news">
              {news.map((n) => (
                <li key={n.id}>
                  <Link to={`/posts/${n.id}`} className="news__item">
                    <span className={`news__tag${n.is_notice ? ' news__tag--notice' : ''}`}>{n.board_name}</span>
                    <span className="news__title">{n.title}</span>
                    <span className="news__excerpt">{n.excerpt}</span>
                    <time className="news__date" dateTime={formatDate(n.created_at)}>
                      {formatDate(n.created_at)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {faqs.length > 0 && <FaqSection groups={faqs} />}

      <section className="section section--dark" id="links">
        <div className="container contact">
          <div>
            <p className="eyebrow">바로가기</p>
            <h2 className="section__title">
              관리자에서 하나 바꿔 보고,
              <br />
              새로고침해 보세요.
            </h2>
            <p className="contact__lead">팝업을 OFF 로 돌리거나 배너를 하나 등록하면 이 페이지가 바로 달라집니다.</p>
          </div>
          <dl className="contact__list">
            <div>
              <dt>관리자</dt>
              <dd>
                <Link to="/admin/login">/admin/login</Link>
              </dd>
            </div>
            <div>
              <dt>게시판</dt>
              <dd>
                <Link to="/boards">/boards</Link>
              </dd>
            </div>
            <div>
              <dt>스택</dt>
              <dd>React · TypeScript · PHP 8 JSON API · MySQL</dd>
            </div>
          </dl>
        </div>
      </section>

      {popups.length > 0 && <PopupLayer popups={popups} />}
    </>
  )
}
