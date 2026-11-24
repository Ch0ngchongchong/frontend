import Head from 'next/head'
import LoginScreen from '../src/pages/LoginScreen'

export default function Login() {
  return (
    <>
      <Head>
        <title>로그인 · 딱 재고</title>
      </Head>
      <LoginScreen />
    </>
  )
}
