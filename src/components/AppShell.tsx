import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SCREENS, type ScreenKey } from './screens.ts'
import type { Profile } from '../profile.ts'

// 모든 매장 화면이 함께 쓰는 틀: 흰 배경 + 위쪽 바(로고 · 화면 탭 · 매장/사용자) + 본문
// URL 경로별 화면은 Next.js가 렌더링하고, 이 틀은 탐색·알림·사용자 상태를 유지한다.

type AppShellProps = {
  // 탭이 아닌 화면(거래처 페이지)이면 null
  current: ScreenKey | null
  onNavigate: (screen: ScreenKey) => void
  // 로고를 누르면 시작 화면(우리 가게 지도)으로 돌아간다
  onHome: () => void
  onProfile: () => void
  profile: Profile
  children: ReactNode
}

const SAMPLE_NOTIFICATIONS = [
  {
    id: 1,
    title: '확인이 필요한 입고가 있어요',
    detail: '입고 확인 화면에서 명세서를 확인해 주세요.',
    screen: 'inspection' as const,
  },
  {
    id: 2,
    title: '승인을 기다리는 예외 건이 있어요',
    detail: '예외 승인 화면에서 내용을 살펴봐 주세요.',
    screen: 'approval' as const,
  },
]

function AppShell({
  current,
  onNavigate,
  onHome,
  onProfile,
  profile,
  children,
}: AppShellProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [readIds, setReadIds] = useState<number[]>([])
  const dialogRef = useRef<HTMLDialogElement>(null)
  const unread = SAMPLE_NOTIFICATIONS.filter(
    (item) => !readIds.includes(item.id),
  ).length
  useEffect(() => {
    if (notificationsOpen) dialogRef.current?.showModal()
  }, [notificationsOpen])
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
            <small>{profile.store}</small>
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
          <button
            type="button"
            className="icon-circle notification-trigger"
            onClick={() => setNotificationsOpen(true)}
            aria-label={`알림${unread ? `, 읽지 않은 알림 ${unread}개` : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {unread > 0 && (
              <span className="notification-dot" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="user-chip"
            onClick={onProfile}
            aria-label="마이페이지"
          >
            <span className="avatar" aria-hidden="true">
              {profile.photo ? (
                <img src={profile.photo} alt="" />
              ) : (
                profile.name.slice(0, 1)
              )}
            </span>
            <span className="user-name">{profile.name}</span>
          </button>
        </div>
      </header>

      {notificationsOpen && (
        <dialog
          ref={dialogRef}
          className="notification-dialog"
          aria-labelledby="notification-title"
          onClose={() => setNotificationsOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget)
              event.currentTarget.close()
          }}
        >
          <div className="notification-heading">
            <div>
              <h2 id="notification-title">예시 알림</h2>
              <p>읽지 않은 알림 {unread}개</p>
            </div>
            <button
              type="button"
              className="notification-close"
              aria-label="알림 닫기"
              onClick={() => dialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="notification-list">
            {SAMPLE_NOTIFICATIONS.map((item) => (
              <button
                type="button"
                className={`notification-item${readIds.includes(item.id) ? '' : ' notification-unread'}`}
                key={item.id}
                onClick={() => {
                  setReadIds((ids) =>
                    ids.includes(item.id) ? ids : [...ids, item.id],
                  )
                  dialogRef.current?.close()
                  onNavigate(item.screen)
                }}
              >
                <span className="notification-item-dot" aria-hidden="true" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="notification-read-all"
            disabled={!unread}
            onClick={() =>
              setReadIds(SAMPLE_NOTIFICATIONS.map((item) => item.id))
            }
          >
            모두 읽음으로 표시
          </button>
        </dialog>
      )}

      <main className={`page${role === '직원' ? ' page-staff' : ''}`}>
        {children}
      </main>
    </>
  )
}

export default AppShell
