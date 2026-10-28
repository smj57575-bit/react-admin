// 빌드할 때 넣는 환경변수의 타입 — import.meta.env.VITE_DEMO 를 쓰면 string | undefined 로 보인다
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' 면 데모 모드: PHP API 대신 브라우저 안의 가짜 서버(api/demo/)가 답한다 (GitHub Pages 용) */
  readonly VITE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
