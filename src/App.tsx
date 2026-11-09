import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react'
import AppShell from './components/AppShell.tsx'
import DeliveryTruck from './components/DeliveryTruck.tsx'
import { NavContext, type Nav } from './components/nav.ts'
import type { ScreenKey } from './components/screens.ts'
import ChangeHistory from './pages/ChangeHistory.tsx'
import DeliveryCalendar from './pages/DeliveryCalendar.tsx'
import ExceptionApproval from './pages/ExceptionApproval.tsx'
import InspectionReview from './pages/InspectionReview.tsx'
import OrderList from './pages/OrderList.tsx'
import ProductList from './pages/ProductList.tsx'
import ReceiptUpload from './pages/ReceiptUpload.tsx'
import StartScreen from './pages/StartScreen.tsx'
import SupplierList from './pages/SupplierList.tsx'
import SupplierPage from './pages/SupplierPage.tsx'

// 시작 화면(우리 가게 지도) → '우리 매장으로 가기' 또는 거래처 이름 → 매장 화면.
// 시작 화면에서 들어갈 때만 매장 화면이 오른쪽에서 밀려 들어온다 (앱 안 탭 이동은 바로 바뀜).
// 그동안 배달 트럭이 매장 화면 앞(왼쪽 가장자리)에서 같은 속도로 달리며 화면을 끌고 온다
// 라우터 없이 위쪽 탭으로 화면을 바꾼다. 상품 화면(US-08)만 API와 이어져 있고 나머지는 디자인 시안이다.
const PAGES: Record<ScreenKey, () => JSX.Element> = {
  products: ProductList,
  orders: OrderList,
  upload: ReceiptUpload,
  suppliers: SupplierList,
  inspection: InspectionReview,
  approval: ExceptionApproval,
  calendar: DeliveryCalendar,
  history: ChangeHistory,
}

// 전환 시간 (index.css .app-slide-in / .app-slide-out 과 같게)
const SLIDE_MS = 1000

// 시작 화면 ↔ 매장 화면 전환 애니메이션(트럭·주황 차도) 켜기/끄기. 지금은 꺼 둠 — true로 바꾸면 다시 나온다
const SLIDE_ENABLED = false

// 시작 화면 ↔ 매장 화면 전환: 'in' = 매장 화면이 오른쪽에서 들어옴, 'out' = 매장 화면이 오른쪽으로 빠짐
type Transition = 'in' | 'out' | null

function App() {
  const [entered, setEntered] = useState(false)
  const [screen, setScreen] = useState<ScreenKey>('products')
  // 거래처 페이지는 탭이 아니라 시작 화면의 거래처 목록에서 연다
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [transition, setTransition] = useState<Transition>(null)
  const slideTimer = useRef<number | undefined>(undefined)
  // 빠져나갈 때 매장 화면을 고정 상자로 옮기므로, 보던 스크롤 위치를 그대로 이어 간다
  const exitScrollY = useRef(0)
  const appRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => window.clearTimeout(slideTimer.current), [])

  useLayoutEffect(() => {
    if (transition === 'out' && appRef.current) {
      appRef.current.scrollTop = exitScrollY.current
    }
  }, [transition])

  // 애니메이션을 끄거나 사용자가 '움직임 줄이기'를 켰으면 바로 바꾼다
  const reduceMotion = () =>
    !SLIDE_ENABLED ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function slideInFromStart() {
    if (entered || reduceMotion()) return
    setTransition('in')
    window.clearTimeout(slideTimer.current)
    slideTimer.current = window.setTimeout(() => setTransition(null), SLIDE_MS)
  }

  function leaveStore() {
    setEntered(false)
    setSupplierId(null)
    setTransition(null)
  }

  const nav: Nav = {
    goHome: () => {
      if (!entered || reduceMotion()) {
        leaveStore()
        return
      }
      exitScrollY.current = window.scrollY
      setTransition('out')
      window.clearTimeout(slideTimer.current)
      slideTimer.current = window.setTimeout(leaveStore, SLIDE_MS)
    },
    navigate: (next) => {
      slideInFromStart()
      setEntered(true)
      setSupplierId(null)
      setScreen(next)
      window.scrollTo(0, 0)
    },
    openSupplier: (id) => {
      slideInFromStart()
      setEntered(true)
      setSupplierId(id)
      window.scrollTo(0, 0)
    },
  }

  const Page = PAGES[screen]
  const moving = transition !== null

  return (
    <NavContext.Provider value={nav}>
      {(!entered || moving) && (
        <StartScreen
          onEnter={() => nav.navigate('products')}
          leaving={transition === 'in'}
          returning={transition === 'out'}
        />
      )}
      {moving && (
        <div className={`slide-edge slide-${transition}`} aria-hidden="true" />
      )}
      {moving && (
        <div className={`slide-truck slide-${transition}`}>
          {/* 들어올 때는 왼쪽으로, 빠질 때는 오른쪽으로 달린다 */}
          <DeliveryTruck
            facing={transition === 'in' ? 'left' : 'right'}
            width={280}
          />
        </div>
      )}
      {entered && (
        <div
          ref={appRef}
          className={
            transition === 'in'
              ? 'app-slide-in'
              : transition === 'out'
                ? 'app-slide-out'
                : undefined
          }
        >
          <AppShell
            current={supplierId ? 'suppliers' : screen}
            onNavigate={nav.navigate}
            onHome={nav.goHome}
          >
            {supplierId ? <SupplierPage supplierId={supplierId} /> : <Page />}
          </AppShell>
        </div>
      )}
    </NavContext.Provider>
  )
}

export default App
