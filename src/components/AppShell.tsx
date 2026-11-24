import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { SCREENS, screensFor, type ScreenKey } from './screens.ts'
import { Icon } from './ui.tsx'
import type { Profile } from '../profile.ts'
import type { Role } from '../session.ts'
import {
  describeReadingNotification,
  markAllReadingNotificationsRead,
  markReadingNotificationRead,
  useReadingNotifications,
} from '../readingNotifications.ts'

// 모든 매장 화면이 함께 쓰는 틀: 흰 배경 + 위쪽 바(로고 · 화면 탭 · 매장/사용자) + 본문
// URL 경로별 화면은 Next.js가 렌더링하고, 이 틀은 탐색·알림·사용자 상태를 유지한다.
// 탭은 로그인한 역할이 열 수 있는 화면만 보인다 (client-meeting-2 피드백 7).
// 직원은 휴대폰을 한 손으로 쓰므로(피드백 6·9) 위쪽 탭 대신 엄지가 닿는 아래 탭을 두고,
// 본문을 휴대폰 폭 한 줄로 놓는다.

const STAFF_TABS: {
  key: string
  label: string
  icon: 'home' | 'camera' | 'review' | 'user'
}[] = [
  { key: '/staff', label: '오늘 할 일', icon: 'home' },
  { key: '/upload', label: '명세서 촬영', icon: 'camera' },
  { key: '/inspection', label: '입고 확인', icon: 'review' },
  { key: '/profile', label: '내 정보', icon: 'user' },
]

type AppShellProps = {
  // 탭이 아닌 화면(거래처 페이지)이면 null
  current: ScreenKey | null
  // 지금 보이는 경로 (직원 아래 탭의 현재 위치 표시)
  path: string
  role: Role
  onNavigate: (screen: ScreenKey) => void
  // 로고를 누르면 시작 화면(우리 가게 지도)으로 돌아간다
  onHome: () => void
  onProfile: () => void
  profile: Profile
  children: ReactNode
}

function AppShell({
  current,
  path,
  role,
  onNavigate,
  onHome,
  onProfile,
  profile,
  children,
}: AppShellProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  // 판독 완료·실패 알림 (US-03). ReadingNotifier가 검수 목록을 지켜보며 채운다.
  const { items: notifications } = useReadingNotifications()
  const unread = notifications.filter((item) => !item.read).length
  useEffect(() => {
    if (notificationsOpen) dialogRef.current?.showModal()
  }, [notificationsOpen])
  // 좁은 화면에서 탭 줄은 가로로 밀어 보므로, 현재 화면 탭이 잘려 있으면 가운데로 끌어온다.
  const tabsRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const tabs = tabsRef.current
    const active = tabs?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!tabs || !active) return
    const tabsBox = tabs.getBoundingClientRect()
    const activeBox = active.getBoundingClientRect()
    if (
      activeBox.left >= tabsBox.left - 1 &&
      activeBox.right <= tabsBox.right + 1
    )
      return
    tabs.scrollLeft +=
      activeBox.left - tabsBox.left - (tabsBox.width - activeBox.width) / 2
  }, [current])
  const staff = role === '직원'
  // 직원이 쓰는 화면이면 본문 16px·버튼 48px (사장님이 열어도 같다)
  const staffSizing =
    staff || SCREENS.find((screen) => screen.key === current)?.role === '직원'
  function openStaffTab(key: string) {
    if (key === '/staff') onHome()
    else if (key === '/profile') onProfile()
    else onNavigate(key.slice(1) as ScreenKey)
  }

  return (
    <>
      <header className={`topbar${staff ? ' topbar-staff' : ''}`}>
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

        {!staff && (
          <nav className="tabs" aria-label="화면" ref={tabsRef}>
            {screensFor(role).map((screen) => {
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
        )}

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
            aria-label={`마이페이지 (${role} 계정)`}
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
              <h2 id="notification-title">알림</h2>
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
            {notifications.length === 0 && (
              <p className="notification-empty">
                새 알림이 없어요. 명세서 판독이 끝나면 여기에 알려 드려요.
              </p>
            )}
            {notifications.map((item) => {
              const text = describeReadingNotification(item)
              return (
                <Link
                  className={`notification-item${item.read ? '' : ' notification-unread'}`}
                  key={item.id}
                  href={text.href}
                  onClick={() => {
                    markReadingNotificationRead(item.id)
                    dialogRef.current?.close()
                  }}
                >
                  <span className="notification-item-dot" aria-hidden="true" />
                  <span>
                    <strong>{text.title}</strong>
                    <small>{text.detail}</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </Link>
              )
            })}
          </div>
          <button
            type="button"
            className="notification-read-all"
            disabled={!unread}
            onClick={markAllReadingNotificationsRead}
          >
            모두 읽음으로 표시
          </button>
        </dialog>
      )}

      <main
        className={`page${staffSizing ? ' page-staff' : ''}${staff ? ' page-mobile' : ''}`}
      >
        {children}
      </main>

      {staff && (
        <nav className="bottom-nav" aria-label="직원 화면">
          {STAFF_TABS.map((tab) => {
            const active = path === tab.key
            return (
              <button
                type="button"
                key={tab.key}
                className={`bottom-tab${active ? ' bottom-tab-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => openStaffTab(tab.key)}
              >
                <Icon name={tab.icon} size={24} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </>
  )
}

export default AppShell
