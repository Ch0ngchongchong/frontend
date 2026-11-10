import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // CORS 사전 요청을 지원하지 않는 백엔드에 같은 출처로 요청한다.
    proxy: {
      '/api': {
        target: 'https://chongchongchongchong.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
