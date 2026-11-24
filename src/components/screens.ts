import type { Role } from '../session'

// 매장 화면 목록 (PRD 5절 화면 그대로). 위쪽 탭·아래 탭과 App이 함께 쓴다

export type ScreenKey =
  | 'products'
  | 'orders'
  | 'upload'
  | 'suppliers'
  | 'inspection'
  | 'approval'
  | 'calendar'
  | 'history'

// role: 이 화면을 주로 쓰는 사람. 직원 화면은 본문 16px·버튼 48px, 사장님 화면은 18px·56px (DESIGN.md)
// roles: 이 화면을 열 수 있는 역할 (client-meeting-2 피드백 7·8). 사장님은 매장 전체를 다루고,
// 직원은 명세서 업로드·입고 확인만 쓴다. 서버도 역할로 막는 동작은 따로 거절한다.
export const SCREENS: {
  key: ScreenKey
  label: string
  role: Role
  roles: Role[]
}[] = [
  { key: 'products', label: '상품', role: '사장님', roles: ['사장님'] },
  { key: 'orders', label: '발주', role: '사장님', roles: ['사장님'] },
  {
    key: 'upload',
    label: '명세서 업로드',
    role: '직원',
    roles: ['사장님', '직원'],
  },
  { key: 'suppliers', label: '거래처', role: '사장님', roles: ['사장님'] },
  {
    key: 'inspection',
    label: '입고 확인',
    role: '직원',
    roles: ['사장님', '직원'],
  },
  { key: 'approval', label: '예외 승인', role: '사장님', roles: ['사장님'] },
  { key: 'calendar', label: '입고 달력', role: '사장님', roles: ['사장님'] },
  { key: 'history', label: '변경 이력', role: '사장님', roles: ['사장님'] },
]

export function screensFor(role: Role) {
  return SCREENS.filter((screen) => screen.roles.includes(role))
}

// 경로를 이 역할이 열 수 있는지. 모르는 경로(404 등)는 Next.js가 처리하도록 연다.
export function canOpen(pathname: string, role: Role) {
  if (pathname === '/profile') return true
  if (pathname === '/') return role === '사장님'
  if (pathname === '/staff') return role === '직원'
  if (pathname.startsWith('/suppliers')) return role === '사장님'
  const screen = SCREENS.find((item) => pathname === `/${item.key}`)
  return screen ? screen.roles.includes(role) : true
}
