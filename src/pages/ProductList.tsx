import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchProducts, type Product } from '../api/products.ts'
import ProductForm from '../components/ProductForm.tsx'
import { PageHeader, Pill, StatusSummary } from '../components/ui.tsx'

// 상품 목록·등록 (사장님) 화면 (PRD 5절, DESIGN.md 화면 목록 / US-08 / F-01)

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: Product[] }

function showText(value: string | null) {
  return value ?? '—'
}

function showNumber(value: number | null, suffix = '') {
  return value === null ? '—' : `${value.toLocaleString('ko-KR')}${suffix}`
}

// 요약 카드 숫자: 이미 불러온 목록에서 세기만 한다 (새 API 없음)
function summarize(products: Product[]) {
  return {
    total: products.length,
    withConversion: products.filter((p) => p.conversion_qty !== null).length,
    withPrice: products.filter((p) => p.base_unit_price !== null).length,
  }
}

function ratio(part: number, total: number) {
  return total === 0 ? 0 : part / total
}

// 카드 머리·빈 화면 아이콘 (DESIGN.md: 주황 선 아이콘, 빈 화면은 검정 원 아이콘)
const ICON_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...ICON_PROPS}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

function BoxIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ICON_PROPS}>
      <path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10" />
    </svg>
  )
}

function ScaleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_PROPS}>
      <path d="M4 7h16M7 7l-3 7h6zM17 7l-3 7h6zM12 4v16M8 20h8" />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_PROPS}>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

const DOTS = 12

function ProductList() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [notice, setNotice] = useState<string | null>(null)
  const formRef = useRef<HTMLElement>(null)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const products = await fetchProducts()
      setState({ status: 'ready', products })
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : '상품 목록을 불러오지 못했어요',
      })
    }
  }, [])

  useEffect(() => {
    // 화면을 열 때 서버에서 목록을 한 번 불러온다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function handleCreated(product: Product) {
    setNotice(`${product.product_code} 상품을 등록했어요`)
    load()
  }

  function goToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
    formRef.current?.querySelector('input')?.focus()
  }

  const summary = state.status === 'ready' ? summarize(state.products) : null
  const loading = state.status === 'loading'
  const missingConversion = summary ? summary.total - summary.withConversion : 0
  const conversionRatio = summary
    ? ratio(summary.withConversion, summary.total)
    : 0
  const priceRatio = summary ? ratio(summary.withPrice, summary.total) : 0

  return (
    <>
      <PageHeader title="상품 목록" screen="products" />

      <section className="stats" aria-label="상품 요약">
        <article className="card stat">
          <div className="stat-top">
            <span>등록된 상품</span>
            <span className="stat-icon">
              <BoxIcon size={18} />
            </span>
          </div>
          <p className={`stat-value${loading ? ' is-loading' : ''}`}>
            {summary ? summary.total : '—'}
            <small>개</small>
          </p>
          <p className="stat-sub">판독할 때 품목 후보가 되는 상품</p>
        </article>

        <article className="card stat">
          <div className="stat-top">
            <span>환산값 등록</span>
            <span className="stat-icon">
              <ScaleIcon />
            </span>
          </div>
          <p className={`stat-value${loading ? ' is-loading' : ''}`}>
            {summary ? summary.withConversion : '—'}
            <small>/ {summary ? summary.total : '—'}개</small>
          </p>
          <div
            className="dot-meter"
            role="img"
            aria-label={`환산값 등록 비율 ${Math.round(conversionRatio * 100)}%`}
          >
            {Array.from({ length: DOTS }, (_, i) => (
              <span
                key={i}
                className={i < Math.round(conversionRatio * DOTS) ? 'on' : ''}
              />
            ))}
          </div>
        </article>

        <article className="card stat">
          <div className="stat-top">
            <span>기준 단가 등록</span>
            <span className="stat-icon">
              <CoinIcon />
            </span>
          </div>
          <p className={`stat-value${loading ? ' is-loading' : ''}`}>
            {summary ? summary.withPrice : '—'}
            <small>/ {summary ? summary.total : '—'}개</small>
          </p>
          <div
            className="bar-meter"
            role="img"
            aria-label={`기준 단가 등록 비율 ${Math.round(priceRatio * 100)}%`}
          >
            <span style={{ width: `${priceRatio * 100}%` }} />
          </div>
        </article>
      </section>

      {summary && (
        <StatusSummary
          items={[
            {
              label: '등록 상품',
              value: summary.total,
              tone: 'done',
              icon: 'box',
            },
            {
              label: '환산 확인 필요',
              value: missingConversion,
              tone: 'accent',
              icon: 'alert',
            },
          ]}
        />
      )}
      <div className="layout-main">
        <section className="card" aria-labelledby="list-title">
          <div className="card-head">
            <div>
              <h2 id="list-title" className="card-title">
                <ListIcon />
                등록된 상품
              </h2>
              <p className="card-note">
                환산값이 없는 상품은 입고 확인 때 수량을 직접 적어야 해요
              </p>
            </div>
            {summary && <span className="chip">{summary.total}개</span>}
          </div>

          {notice && (
            <p className="banner banner-success" role="status">
              {notice}
            </p>
          )}

          {loading && (
            <div className="skeleton" role="status">
              <span className="visually-hidden">
                상품 목록을 불러오는 중이에요…
              </span>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </div>
          )}

          {state.status === 'error' && (
            <div className="banner banner-danger" role="alert">
              <p>{state.message}</p>
              <button type="button" className="button-secondary" onClick={load}>
                다시 불러오기
              </button>
            </div>
          )}

          {state.status === 'ready' && state.products.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                <BoxIcon />
              </span>
              <p>아직 등록한 상품이 없어요</p>
              <button
                type="button"
                className="button-secondary"
                onClick={goToForm}
              >
                상품 등록
              </button>
            </div>
          )}

          {state.status === 'ready' && state.products.length > 0 && (
            <div className="table-scroll">
              <table className="product-table">
                <thead>
                  <tr>
                    <th scope="col">상품 코드</th>
                    <th scope="col">상품명</th>
                    <th scope="col">규격</th>
                    <th scope="col">기준 단위</th>
                    <th scope="col">포장 단위</th>
                    <th scope="col" className="numeric">
                      환산값
                    </th>
                    <th scope="col" className="numeric">
                      기준 단가
                    </th>
                    <th scope="col">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {state.products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.product_code}</td>
                      <td>{showText(product.name)}</td>
                      <td>{showText(product.spec)}</td>
                      <td>{showText(product.base_unit)}</td>
                      <td>{showText(product.pack_unit)}</td>
                      <td className="numeric">
                        {showNumber(product.conversion_qty)}
                      </td>
                      <td className="numeric">
                        {showNumber(product.base_unit_price, '원')}
                      </td>
                      <td>
                        {product.conversion_qty === null ? (
                          <Pill tone="warning" icon="alert">
                            환산 확인 필요
                          </Pill>
                        ) : (
                          <Pill tone="done" icon="checkCircle">
                            정상
                          </Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          className="card card-form"
          aria-labelledby="form-title"
          ref={formRef}
        >
          <div className="card-head">
            <div>
              <h2 id="form-title" className="card-title">
                <PlusIcon />
                상품 등록
              </h2>
              <p className="card-note">
                상품 코드는 꼭 적고, 나머지는 아는 만큼 적어 주세요
              </p>
            </div>
          </div>
          <ProductForm
            onSubmitStart={() => setNotice(null)}
            onCreated={handleCreated}
          />
        </section>
      </div>
    </>
  )
}

export default ProductList
