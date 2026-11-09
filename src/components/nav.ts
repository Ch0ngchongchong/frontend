import { createContext, useContext } from 'react'
import type { ScreenKey } from './screens.ts'

// 화면 이동: 경로(홈 › 화면)·시작 화면 거래처 목록 등 여러 곳에서 쓴다

export type Nav = {
  goHome: () => void
  navigate: (screen: ScreenKey) => void
  openSupplier: (supplierId: string) => void
}

export const NavContext = createContext<Nav | null>(null)

export function useNav() {
  const nav = useContext(NavContext)
  if (!nav) throw new Error('NavContext가 없어요')
  return nav
}
