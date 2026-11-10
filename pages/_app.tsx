import type { AppProps } from 'next/app'
import Head from 'next/head'
import App from '../src/App'
import '../src/index.css'

export default function Application({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>딱 재고</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <App>
        <Component {...pageProps} />
      </App>
    </>
  )
}
