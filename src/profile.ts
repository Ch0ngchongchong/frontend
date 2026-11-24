import type { Role, Session } from './session'

export type Profile = {
  name: string
  store: string
  contact: string
  email: string
  photo: string
}

export function defaultProfile(role: Role): Profile {
  return { name: role, store: '카페 1호점', contact: '', email: '', photo: '' }
}

export const DEFAULT_PROFILE: Profile = defaultProfile('사장님')

// 프로필은 계정마다 이 브라우저에 따로 저장한다.
// 로그인 전에 쓰던 저장값(ddakjaego-profile)은 사장님(1) 계정 것으로 이어 쓴다.
const LEGACY_KEY = 'ddakjaego-profile'
const keyFor = (userId: string) => `ddakjaego-profile:${userId}`

function parse(raw: string | null, fallback: Profile): Profile | null {
  try {
    const saved: unknown = JSON.parse(raw ?? 'null')
    if (
      saved &&
      typeof saved === 'object' &&
      'name' in saved &&
      'store' in saved &&
      'contact' in saved &&
      typeof saved.name === 'string' &&
      typeof saved.store === 'string' &&
      typeof saved.contact === 'string'
    )
      return {
        name: saved.name || fallback.name,
        store: saved.store || fallback.store,
        contact: saved.contact,
        email:
          'email' in saved && typeof saved.email === 'string'
            ? saved.email
            : '',
        photo:
          'photo' in saved &&
          typeof saved.photo === 'string' &&
          saved.photo.startsWith('data:image/png;base64,') &&
          saved.photo.length <= 1_500_000
            ? saved.photo
            : '',
      }
  } catch {
    /* 저장된 값이 없거나 사용할 수 없는 경우 기본값을 쓴다. */
  }
  return null
}

export function loadProfile(session: Session): Profile {
  const fallback = defaultProfile(session.role)
  try {
    return (
      parse(localStorage.getItem(keyFor(session.userId)), fallback) ??
      (session.userId === '1'
        ? parse(localStorage.getItem(LEGACY_KEY), fallback)
        : null) ??
      fallback
    )
  } catch {
    return fallback
  }
}

// 브라우저 저장소를 외부 스토어로 다룬다(useSyncExternalStore용).
// 스냅샷은 저장할 때만 새로 읽어, 렌더링마다 같은 객체를 돌려준다.
const listeners = new Set<() => void>()
const snapshots = new Map<string, Profile>()

export function subscribeProfile(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getProfileSnapshot(session: Session | null | undefined) {
  if (!session) return DEFAULT_PROFILE
  let profile = snapshots.get(session.userId)
  if (!profile) {
    profile = loadProfile(session)
    snapshots.set(session.userId, profile)
  }
  return profile
}

// 저장에 실패하면(저장 공간 부족 등) 예외를 그대로 던진다.
export function saveProfile(userId: string, profile: Profile) {
  localStorage.setItem(keyFor(userId), JSON.stringify(profile))
  snapshots.delete(userId)
  listeners.forEach((listener) => listener())
}
