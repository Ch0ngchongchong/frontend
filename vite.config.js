import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 화면(5173)에서 /api로 부르면 백엔드(uvicorn 기본 8000)로 넘긴다.
    // 백엔드에 CORS 설정이 없어도 개발 중에 같은 주소처럼 부를 수 있다.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
