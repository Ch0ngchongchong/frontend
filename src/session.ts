import { useSyncExternalStore } from 'react'

// 로그인한 사용자 (client-meeting-2 피드백 7: 로그인한 역할에 따라 보이는 화면이 다르다).
// 서버에는 아직 로그인 API가 없어서(API.md 공통 규칙 [제안]), 시드 계정 중 하나를 고르면
// 그 사용자 ID를 이 브라우저에 저장하고 모든 요청의 `X-User-Id` 헤더로 보낸다.
// 서버가 그 사용자의 매장(store_id)과 역할(role)로 권한을 판단한다.

export type Role = '사장님' | '직원'

export type Session = { userId: string; role: Role }

export type Account = Session & { description: string }

// 백엔드 시드: 1 = 사장님, 2 = 같은 매장 직원 (DATA-MODEL.md 시드)
export const ACCOUNTS: Account[] = [
  {
    userId: '1',
    role: '사장님',
    description: '상품·발주·거래처 관리, 예외 승인, 변경 이력',
  },
  {
    userId: '2',
    role: '직원',
    description: '명세서 촬영·업로드, 입고 확인·확정',
  },
]

const KEY = 'ddakjaego-session'

function read(): Session | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved && typeof saved === 'object' && 'userId' in saved) {
      const account = ACCOUNTS.find((item) => item.userId === saved.userId)
      if (account) return { userId: account.userId, role: account.role }
    }
  } catch {
    /* 저장소를 쓸 수 없거나 값이 깨졌으면 로그인하지 않은 것으로 본다. */
  }
  return null
}

// 브라우저 저장소를 외부 스토어로 다룬다. 스냅샷은 바뀔 때만 새로 읽는다.
const listeners = new Set<() => void>()
let snapshot: Session | null | undefined

function emit() {
  snapshot = undefined
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // 다른 탭에서 로그인·로그아웃하면 이 탭도 따라간다.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) emit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  if (snapshot === undefined) snapshot = read()
  return snapshot
}

// 서버 렌더링·하이드레이션 중에는 아직 모른다(undefined). 그 뒤 로그인 상태 또는 null.
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, getSession, () => undefined)
}

// 직접 로그아웃했는지. 그때는 로그인 뒤 보던 화면으로 돌아가지 않고 역할별 첫 화면으로 간다.
let signedOut = false
export function signedOutByUser() {
  return signedOut
}

export function login(userId: string) {
  const account = ACCOUNTS.find((item) => item.userId === userId)
  if (!account) throw new Error('없는 계정이에요')
  signedOut = false
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ userId: account.userId, role: account.role }),
    )
  } catch {
    /* 저장할 수 없어도 이 탭에서는 로그인한 상태로 둔다. */
    snapshot = { userId: account.userId, role: account.role }
    listeners.forEach((listener) => listener())
    return
  }
  emit()
}

export function logout() {
  signedOut = true
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* 지우지 못해도 이 탭에서는 로그아웃한다. */
  }
  snapshot = null
  listeners.forEach((listener) => listener())
}

// 요청 헤더와 SWR 캐시 키에 쓰는 현재 사용자 ID. 로그인하지 않았으면 null.
export function currentUserId() {
  return getSession()?.userId ?? null
}

// SWR 캐시 키의 사용자 자리. 사용자마다 캐시를 따로 두어 계정을 바꿔도 섞이지 않는다.
export function userKey() {
  return currentUserId() ?? 'guest'
}

// 역할별 첫 화면: 사장님은 우리 가게 지도, 직원은 휴대폰용 오늘 할 일
export function homePath(role: Role) {
  return role === '직원' ? '/staff' : '/'
}
