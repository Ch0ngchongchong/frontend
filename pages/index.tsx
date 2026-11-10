import StartScreen from '../src/pages/StartScreen'
import { useNav } from '../src/components/nav'

export default function Home() {
  const nav = useNav()
  return <StartScreen onEnter={() => nav.navigate('products')} />
}

export function getStaticProps() {
  return { props: {} }
}
