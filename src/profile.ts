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

export function saveProfile(profile: Profile) {
  localStorage.setItem(KEY, JSON.stringify(profile))
}
