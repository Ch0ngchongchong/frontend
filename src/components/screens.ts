// 매장 화면 목록 (PRD 5절 화면 그대로). 위쪽 탭과 App이 함께 쓴다

export type ScreenKey =
  | 'products'
  | 'orders'
  | 'upload'
  | 'suppliers'
  | 'inspection'
  | 'approval'
  | 'calendar'
  | 'history'

type Role = '사장님' | '직원'

// 화면마다 쓰는 사람 (PRD 5절). 직원 화면은 본문 16px·버튼 48px, 사장님 화면은 18px·56px (DESIGN.md)
export const SCREENS: { key: ScreenKey; label: string; role: Role }[] = [
  { key: 'products', label: '상품', role: '사장님' },
  { key: 'orders', label: '발주', role: '사장님' },
  { key: 'upload', label: '명세서 업로드', role: '직원' },
  { key: 'suppliers', label: '거래처', role: '사장님' },
  { key: 'inspection', label: '입고 확인', role: '직원' },
  { key: 'approval', label: '예외 승인', role: '사장님' },
  { key: 'calendar', label: '입고 달력', role: '사장님' },
  { key: 'history', label: '변경 이력', role: '사장님' },
]
