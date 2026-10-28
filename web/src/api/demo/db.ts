// 데모 "DB" — MySQL 테이블 대신 브라우저 localStorage 에 JSON 하나로 저장한다
// 키 하나(STORAGE_KEY)에 모든 테이블을 담는다. 모양이 바뀌면 키의 버전(v1 → v2)을 올려서 예전 데이터와 섞이지 않게 한다
// 0/1 컬럼은 처음부터 boolean 으로 둔다 (PHP API 가 응답할 때 하는 변환을 미리 해 둔 셈)
import type { AdminBoard, Banner, Faq, NoticeBar, Popup, Post } from '../types'
import { createSeed } from './seed'

const STORAGE_KEY = 'react-admin-demo-v1'
const SESSION_KEY = 'react-admin-demo-session'

// ---------- 테이블 행 (server/schema.sql 과 같은 컬럼) ----------
export type BoardRow = Omit<AdminBoard, 'post_count' | 'published_count'>
/** password: 방문자 글은 '솔트$해시', 관리자 글은 null (by_admin 은 저장하지 않고 이것으로 계산한다) */
export type PostRow = Omit<Post, 'by_admin'> & { password: string | null }
export type PopupRow = Omit<Popup, 'status'>
export type BannerRow = Omit<Banner, 'status'>
export type NoticeBarRow = Omit<NoticeBar, 'status'>
export type FaqRow = Required<Faq> & { created_at: string; updated_at: string | null }

export interface DemoDb {
  boards: BoardRow[]
  posts: PostRow[]
  popups: PopupRow[]
  banners: BannerRow[]
  notice_bars: NoticeBarRow[]
  faqs: FaqRow[]
  /** AUTO_INCREMENT 대신 — 테이블별 마지막 id */
  lastId: Record<TableName, number>
}

export type TableName = Exclude<keyof DemoDb, 'lastId'>

/** 저장 공간(localStorage 약 5MB)이 꽉 찼을 때 — 핸들러가 413 으로 바꿔서 돌려준다 */
export class DemoQuotaError extends Error {}

/** 요청마다 새로 읽는다 → 저장에 실패한 요청의 변경은 메모리에만 있다가 버려진다 (트랜잭션 롤백처럼) */
export function loadDb(): DemoDb {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as DemoDb
  } catch {
    /* 깨진 데이터거나 저장소를 못 쓰면 처음 상태로 */
  }
  const seed = createSeed()
  trySave(seed)
  return seed
}

export function saveDb(db: DemoDb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') throw new DemoQuotaError()
    throw e
  }
}

function trySave(db: DemoDb) {
  try {
    saveDb(db)
  } catch {
    /* 사생활 보호 모드 등 — 저장은 못 해도 이번 화면은 시드로 보여 준다 */
  }
}

/** 관리자 사이드바의 "데모 데이터 초기화" — 시드로 되돌린다 (로그인 상태는 그대로) */
export function resetDemoDb() {
  localStorage.removeItem(STORAGE_KEY)
  trySave(createSeed())
}

/** INSERT 할 때 새 id */
export function nextId(db: DemoDb, table: TableName) {
  db.lastId[table] += 1
  return db.lastId[table]
}

// ---------- 세션 (PHP 의 $_SESSION 대신) ----------
// 데모 전용 로그인 표시일 뿐, 보안 장치가 아니다. 누구나 브라우저 저장소를 고칠 수 있다 (진짜 권한 확인은 PHP API 몫)
export interface DemoSession {
  admin: string | null
  csrf: string
}

export function loadSession(): DemoSession {
  try {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) return JSON.parse(saved) as DemoSession
  } catch {
    /* 없거나 깨졌으면 새 세션 */
  }
  const session = { admin: null, csrf: randomHex(16) }
  saveSession(session)
  return session
}

export function saveSession(session: DemoSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* 저장 못 하면 새로고침할 때 로그아웃된다 */
  }
}

export function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------- 시각 ----------
// MySQL DATETIME 과 같은 모양('2026-10-28 15:02:07', 브라우저 시간대). 문자열 비교로 앞뒤를 잴 수 있다
export function toDateTime(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export const now = () => toDateTime(new Date())
