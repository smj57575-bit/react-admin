import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 개발 서버: 화면은 Vite(5173), 데이터는 PHP API(8150)
// /api 와 /uploads 를 PHP 서버로 넘겨서 같은 주소(origin)처럼 쓴다 → 로그인 세션 쿠키가 그대로 동작
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8150'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API_ORIGIN,
      '/uploads': API_ORIGIN,
    },
  },
})
