import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/router'
import AppShell from './components/AppShell'
import ReadingNotifier from './components/ReadingNotifier'
import { NavContext, type Nav } from './components/nav'
import { SCREENS } from './components/screens'
import {
  getProfileSnapshot,
  getServerProfileSnapshot,
  saveProfile,
  subscribeProfile,
  type Profile,
} from './profile'

type Workspace = {
  profile: Profile
  setProfile: (profile: Profile) => void
}
const WorkspaceContext = createContext<Workspace | null>(null)
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('WorkspaceContext가 없어요')
  return context
}

export default function App({ children }: { children: ReactNode }) {
  const router = useRouter()
  // 서버 렌더링·하이드레이션 때는 기본 프로필, 그 뒤에는 브라우저에 저장된 프로필을 쓴다.
  const profile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getServerProfileSnapshot,
  )
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  useEffect(() => {
    const start = (url: string) => setPendingPath(url.split('?')[0])
    const finish = () => setPendingPath(null)
    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', finish)
    router.events.on('routeChangeError', finish)
    return () => {
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', finish)
      router.events.off('routeChangeError', finish)
    }
  }, [router.events])
  const nav: Nav = {
    goHome: () => {
      void router.push('/')
    },
    navigate: (screen) => {
      void router.push(`/${screen}`)
    },
    openSupplier: (id) => {
      void router.push(`/suppliers/${encodeURIComponent(id)}`)
    },
  }
  const visiblePath = pendingPath ?? router.pathname
  const current = visiblePath.startsWith('/suppliers')
    ? 'suppliers'
    : (SCREENS.find((screen) => visiblePath === `/${screen.key}`)?.key ?? null)
  const loading = pendingPath !== null && pendingPath !== router.asPath.split('?')[0]
  const content = loading ? (
    <section role="status" aria-live="polite" aria-busy="true">
      <h1>{SCREENS.find((screen) => screen.key === current)?.label ?? '화면'} 불러오는 중</h1>
      <div className="card skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  ) : children
  return (
    <WorkspaceContext.Provider
      value={{ profile, setProfile: saveProfile }}
    >
      <NavContext.Provider value={nav}>
        {visiblePath === '/' ? (
          content
        ) : (
          <AppShell
            current={current}
            onNavigate={nav.navigate}
            onHome={nav.goHome}
            profile={profile}
            onProfile={() => {
              void router.push('/profile')
            }}
          >
            {content}
          </AppShell>
        )}
        <ReadingNotifier />
      </NavContext.Provider>
    </WorkspaceContext.Provider>
  )
}
