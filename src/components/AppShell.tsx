import type { ReactNode } from 'react'
import { SCREENS, type ScreenKey } from './screens.ts'

// 모든 매장 화면이 함께 쓰는 틀: 흰 배경 + 위쪽 바(로고 · 화면 탭 · 매장/사용자) + 본문
// 탭은 PRD 5절 화면 목록 그대로. 상품 화면만 API와 이어져 있고 나머지는 디자인 시안이다.

type AppShellProps = {
  // 탭이 아닌 화면(거래처 페이지)이면 null
  current: ScreenKey | null
  onNavigate: (screen: ScreenKey) => void
  // 로고를 누르면 시작 화면(우리 가게 지도)으로 돌아간다
  onHome: () => void
  children: ReactNode
}

function AppShell({ current, onNavigate, onHome, children }: AppShellProps) {
  const role =
    SCREENS.find((screen) => screen.key === current)?.role ?? '사장님'

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="brand brand-button"
          onClick={onHome}
          aria-label="시작 화면으로"
        >
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand-text">
            <strong>딱 재고</strong>
            <small>카페 1호점</small>
          </span>
        </button>

        <nav className="tabs" aria-label="화면">
          {SCREENS.map((screen) => {
            const active = screen.key === current
            return (
              <button
                type="button"
                key={screen.key}
                className={`tab${active ? ' tab-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(screen.key)}
              >
                {screen.label}
              </button>
            )
          })}
        </nav>

        <div className="topbar-user">
          <span className="icon-circle" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="user-chip">
            <span className="avatar" aria-hidden="true">
              {role.slice(0, 1)}
            </span>
            {role}
          </span>
        </div>
      </header>

      <main className={`page${role === '직원' ? ' page-staff' : ''}`}>
        {children}
      </main>
    </>
  )
}

export default AppShell
