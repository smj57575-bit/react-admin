import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 개발 서버: 화면은 Vite(5173), 데이터는 PHP API(8150)
// /api 와 /uploads 를 PHP 서버로 넘겨서 같은 주소(origin)처럼 쓴다 → 로그인 세션 쿠키가 그대로 동작
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8150'

// 앱이 올라갈 경로. 보통은 '/', GitHub Pages(https://아이디.github.io/react-admin/)는 BASE_PATH=/react-admin/ 로 빌드한다
// 화면 코드에서는 import.meta.env.BASE_URL 로 이 값을 읽는다 (router.tsx, lib/format.ts)
const BASE_PATH = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  server: {
    // 127.0.0.1 로 연다: Node 기본값(localhost)은 IPv6(::1)에만 열려서, localhost 를 IPv4 로 찾는 브라우저에서는 안 열린다
    // (브라우저는 ::1 이 안 되면 127.0.0.1 로 다시 시도하므로 http://localhost:5173 도 그대로 된다)
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': API_ORIGIN,
      '/uploads': API_ORIGIN,
    },
  },
})
