import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/router'
import AppShell from './components/AppShell'
import { NavContext, type Nav } from './components/nav'
import { SCREENS } from './components/screens'
import { DEFAULT_PROFILE, loadProfile, type Profile } from './profile'
import type { InspectionPhoto } from './components/InspectionPhotos'

type Workspace = {
  profile: Profile
  setProfile: (profile: Profile) => void
  photos: InspectionPhoto[]
  setPhotos: Dispatch<SetStateAction<InspectionPhoto[]>>
}
const WorkspaceContext = createContext<Workspace | null>(null)
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('WorkspaceContext가 없어요')
  return context
}

export default function App({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [photos, setPhotos] = useState<InspectionPhoto[]>([])
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
  useEffect(() => {
    setProfile(loadProfile())
  }, [])
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
      value={{ profile, setProfile, photos, setPhotos }}
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
      </NavContext.Provider>
    </WorkspaceContext.Provider>
  )
}
