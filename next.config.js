import { fileURLToPath } from 'node:url'

export default {
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://chongchongchongchong.vercel.app/:path*',
      },
    ]
  },
}
