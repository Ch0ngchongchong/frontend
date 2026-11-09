import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useNav } from '../components/nav.ts'
import { Scene } from '../components/StoreMap.tsx'
import { Icon } from '../components/ui.tsx'
import { SUPPLIERS } from '../mocks/sample.ts'

// 시작 화면: 우리 가게와 거래처가 이어진 장면을 보여 주고,
// 우리 가게를 누르면 옆에 카드가 열려 '우리 매장으로 가기'로 매장 화면에 들어간다.
// 카드의 '거래처 N곳과 연결'에 커서를 올리면(또는 누르면) 거래처 목록이 열리고, 이름을 누르면 그 거래처 페이지로 간다.

const POPOVER_WIDTH = 320
const EDGE = 16

// 연결된 거래처 목록 (커서를 올리거나 키보드로 고르면 열림, 많으면 목록 안에서 스크롤)
function SupplierLink() {
  const nav = useNav()
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)

  const show = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  // 카드와 목록 사이를 지나갈 때 바로 닫히지 않게 조금 기다린다
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 180)
  }

  // 오른쪽에 자리가 없으면 아래로 연다 (열릴 때 한 번 재서 정한다)
  const placeFlyout = (element: HTMLDivElement | null) => {
    if (
      element &&
      element.getBoundingClientRect().right > window.innerWidth - EDGE
    )
      element.classList.add('is-below')
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  return (
    <div
      className="supplier-link"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          hide()
      }}
    >
      <button
        type="button"
        className="store-popover-sub"
        aria-expanded={open}
        aria-controls="supplier-flyout"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dot" aria-hidden="true" />
        사장님 · 거래처 {SUPPLIERS.length}곳과 연결
        <span className="chevron" aria-hidden="true">
          ›
        </span>
      </button>
      {open && (
        <div
          ref={placeFlyout}
          id="supplier-flyout"
          className="supplier-flyout"
          role="region"
          aria-label="연결된 거래처"
        >
          <p className="supplier-flyout-title">
            연결된 거래처 <strong>{SUPPLIERS.length}</strong>곳
          </p>
          <ul className="supplier-flyout-list">
            {SUPPLIERS.map((supplier) => (
              <li key={supplier.id}>
                <button
                  type="button"
                  onClick={() => nav.openSupplier(supplier.id)}
                >
                  <span className="supplier-avatar" aria-hidden="true">
                    <Icon name="store" size={18} />
                  </span>
                  <span className="supplier-flyout-text">
                    <strong>{supplier.name}</strong>
                    <small>
                      {supplier.category} · {supplier.deliveryDays} 배송
                    </small>
                  </span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type StartScreenProps = {
  onEnter: () => void
  // 매장 화면이 밀려 들어오는 동안 뒤로 살짝 밀리며 어두워진다
  leaving?: boolean
  // 매장 화면이 오른쪽으로 빠지는 동안 원래 자리로 돌아온다
  returning?: boolean
}

function StartScreen({
  onEnter,
  leaving = false,
  returning = false,
}: StartScreenProps) {
  const [open, setOpen] = useState(false)
  // 닫히는 중: 나타날 때와 반대로 흐려지며 왼쪽으로 밀린 뒤 사라진다
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const [position, setPosition] = useState<{ left: number; top: number }>()
  const storeRef = useRef<SVGGElement>(null)
  const enterRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLElement>(null)

  const openPopover = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    setClosing(false)
    setOpen(true)
  }, [])

  // 나타날 때와 같은 0.2초 동안 사라지는 애니메이션을 보여 준 뒤 닫는다
  const closePopover = useCallback(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.clearTimeout(closeTimer.current)
    if (reduce) {
      setOpen(false)
      return
    }
    setClosing(true)
    closeTimer.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 200)
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // 카드를 우리 가게 오른쪽에 붙인다. 오른쪽에 자리가 없으면(좁은 화면) 가게 아래에 붙인다
  const place = useCallback(() => {
    const rect = storeRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - EDGE * 2)
    if (rect.right + EDGE + width <= window.innerWidth - EDGE) {
      const top = Math.max(EDGE + 72, rect.top + rect.height / 2 - 110)
      setPosition({ left: rect.right + EDGE, top })
      return
    }
    const centered = rect.left + rect.width / 2 - width / 2
    const left = Math.min(
      Math.max(EDGE, centered),
      window.innerWidth - width - EDGE,
    )
    const top = Math.min(rect.bottom + EDGE, window.innerHeight - 260)
    setPosition({ left, top })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, place])

  useEffect(() => {
    if (open) enterRef.current?.focus()
  }, [open])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closePopover()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closePopover])

  // 카드 밖(배경)을 누르면 닫는다. 우리 가게를 다시 누른 것은 그대로 둔다
  useEffect(() => {
    if (!open) return
    function handlePointer(event: PointerEvent) {
      const target = event.target as Node
      if (popoverRef.current?.contains(target)) return
      if (storeRef.current?.contains(target)) return
      closePopover()
    }
    document.addEventListener('pointerdown', handlePointer)
    return () => document.removeEventListener('pointerdown', handlePointer)
  }, [open, closePopover])

  return (
    <main
      className={`start${leaving ? ' is-leaving' : ''}${returning ? ' is-returning' : ''}`}
    >
      <div className="start-scene">
        <Scene
          interactive
          selected={open}
          onStoreClick={openPopover}
          storeRef={storeRef}
        />
      </div>

      <header className="start-top">
        <div className="brand">
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
            <small>입고 확인 서비스</small>
          </span>
        </div>
      </header>

      {!open && (
        <p className="start-hint">
          <span className="start-hint-dot" aria-hidden="true" />
          <span>
            주황색 <strong>우리 가게</strong>를 눌러 매장으로 들어가세요
          </span>
        </p>
      )}

      {open && position && (
        <section
          ref={popoverRef}
          className={`store-popover${closing ? ' is-closing' : ''}`}
          style={{ left: position.left, top: position.top }}
          aria-labelledby="store-popover-title"
        >
          <div className="store-popover-head">
            <p className="eyebrow">MY STORE</p>
            <button
              type="button"
              className="icon-button"
              onClick={closePopover}
              aria-label="닫기"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <h2 id="store-popover-title">카페 1호점</h2>
          <SupplierLink />
          <button
            ref={enterRef}
            type="button"
            className="button-primary"
            onClick={onEnter}
          >
            우리 매장으로 가기 →
          </button>
        </section>
      )}
    </main>
  )
}

export default StartScreen
