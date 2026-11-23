export type Profile = {
  name: string
  store: string
  contact: string
  email: string
  photo: string
}

export const DEFAULT_PROFILE: Profile = {
  name: '사장님',
  store: '카페 1호점',
  contact: '',
  email: '',
  photo: '',
}
const KEY = 'ddakjaego-profile'

export function loadProfile(): Profile {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
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
        name: saved.name,
        store: saved.store,
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
  return DEFAULT_PROFILE
}

// 브라우저 저장소를 외부 스토어로 다룬다(useSyncExternalStore용).
// 스냅샷은 저장할 때만 새로 읽어, 렌더링마다 같은 객체를 돌려준다.
const listeners = new Set<() => void>()
let snapshot: Profile | null = null

export function subscribeProfile(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getProfileSnapshot(): Profile {
  return (snapshot ??= loadProfile())
}

export function getServerProfileSnapshot(): Profile {
  return DEFAULT_PROFILE
}

// 저장에 실패하면(저장 공간 부족 등) 예외를 그대로 던진다.
export function saveProfile(profile: Profile) {
  localStorage.setItem(KEY, JSON.stringify(profile))
  snapshot = null
  listeners.forEach((listener) => listener())
}
