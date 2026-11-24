import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useRouter, type NextRouter } from 'next/router'
import { useSWRConfig } from 'swr'
import AppShell from './components/AppShell'
import ReadingNotifier from './components/ReadingNotifier'
import { NavContext, type Nav } from './components/nav'
import { SCREENS, canOpen } from './components/screens'
import {
  DEFAULT_PROFILE,
  getProfileSnapshot,
  saveProfile,
  subscribeProfile,
  type Profile,
} from './profile'
import {
  homePath,
  logout,
  signedOutByUser,
  useSession,
  type Session,
} from './session'
import { resetReadingNotifications } from './readingNotifications'

type Workspace = {
  profile: Profile
  setProfile: (profile: Profile) => void
  // 로그인 화면이 아닌 곳에서는 항상 있다 (App이 로그인 전에는 화면을 그리지 않는다)
  session: Session | null
  signOut: () => void
}
const WorkspaceContext = createContext<Workspace | null>(null)
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('WorkspaceContext가 없어요')
  return context
}

// 로그인 뒤 돌아갈 곳. 같은 사이트 안의 경로이고 그 역할이 열 수 있는 화면일 때만 따른다.
function nextPath(router: NextRouter, session: Session) {
  const raw = Array.isArray(router.query.next)
    ? router.query.next[0]
    : router.query.next
  if (
    raw &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.startsWith('/login') &&
    canOpen(raw.split(/[?#]/)[0], session.role)
  )
    return raw
  return homePath(session.role)
}

// 지금 경로에서 다른 곳으로 보내야 하면 그 경로, 아니면 null
function redirectTarget(
  router: NextRouter,
  session: Session | null | undefined,
) {
  if (session === undefined || !router.isReady) return null
  const path = router.pathname
  if (path === '/login') return session ? nextPath(router, session) : null
  if (!session)
    return signedOutByUser() || router.asPath === '/'
      ? '/login'
      : `/login?next=${encodeURIComponent(router.asPath)}`
  // 첫 화면은 역할마다 다르다: 사장님은 가게 지도, 직원은 휴대폰용 오늘 할 일
  if (path === '/' && session.role === '직원') return '/staff'
  if (path === '/staff' && session.role === '사장님') return '/'
  return null
}

export default function App({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const session = useSession()
  // 서버 렌더링·하이드레이션 때는 기본 프로필, 그 뒤에는 이 계정의 저장된 프로필을 쓴다.
  const profile = useSyncExternalStore(
    subscribeProfile,
    () => getProfileSnapshot(session),
    () => DEFAULT_PROFILE,
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

  const target = redirectTarget(router, session)
  useEffect(() => {
    if (target) void router.replace(target)
  }, [router, target])

  // 직원 화면은 아래 탭이 있어 알림 위치 등을 바꾼다 (CSS: body[data-role])
  const role = session?.role
  useEffect(() => {
    if (role) document.body.dataset.role = role === '직원' ? 'staff' : 'owner'
    else delete document.body.dataset.role
  }, [role])

  const nav: Nav = {
    goHome: () => {
      void router.push(role ? homePath(role) : '/')
    },
    navigate: (screen) => {
      void router.push(`/${screen}`)
    },
    openSupplier: (id) => {
      void router.push(`/suppliers/${encodeURIComponent(id)}`)
    },
  }
  const workspace: Workspace = {
    profile,
    session: session ?? null,
    setProfile: (next) => {
      if (session) saveProfile(session.userId, next)
    },
    signOut: () => {
      logout()
      resetReadingNotifications()
      // 앞 사용자의 매장 데이터를 메모리에서 지운다.
      void mutate(() => true, undefined, { revalidate: false })
    },
  }

  const visiblePath = pendingPath ?? router.pathname
  const current = visiblePath.startsWith('/suppliers')
    ? 'suppliers'
    : (SCREENS.find((screen) => visiblePath === `/${screen.key}`)?.key ?? null)
  const loading =
    pendingPath !== null && pendingPath !== router.asPath.split('?')[0]

  let page: ReactNode
  if (router.pathname === '/login') {
    page = children
  } else if (!session || target) {
    // 로그인 상태를 확인하거나 다른 화면으로 옮기는 동안
    page = (
      <div className="app-splash" role="status" aria-live="polite">
        <span className="brand-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p>딱 재고를 여는 중이에요…</p>
      </div>
    )
  } else {
    const content = loading ? (
      <section role="status" aria-live="polite" aria-busy="true">
        <h1>
          {SCREENS.find((screen) => screen.key === current)?.label ?? '화면'}{' '}
          불러오는 중
        </h1>
        <div className="card skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    ) : canOpen(router.pathname, session.role) ? (
      children
    ) : (
      <section className="card access-denied" aria-labelledby="denied-title">
        <h1 id="denied-title">이 화면은 사장님만 볼 수 있어요</h1>
        <p>
          지금 {session.role} 계정으로 로그인했어요. 사장님 계정으로 다시
          로그인하거나 내 화면으로 돌아가 주세요.
        </p>
        <button type="button" className="button-primary" onClick={nav.goHome}>
          내 화면으로
        </button>
      </section>
    )
    page =
      visiblePath === '/' && session.role === '사장님' ? (
        content
      ) : (
        <AppShell
          current={current}
          path={visiblePath}
          role={session.role}
          onNavigate={nav.navigate}
          onHome={nav.goHome}
          profile={profile}
          onProfile={() => {
            void router.push('/profile')
          }}
        >
          {content}
        </AppShell>
      )
  }

  return (
    <WorkspaceContext.Provider value={workspace}>
      <NavContext.Provider value={nav}>
        {page}
        {session && !target && router.pathname !== '/login' && (
          <ReadingNotifier />
        )}
      </NavContext.Provider>
    </WorkspaceContext.Provider>
  )
}
