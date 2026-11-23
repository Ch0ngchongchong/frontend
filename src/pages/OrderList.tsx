import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import {
  CardHead,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import {
  changeOrderStatus,
  createOrder,
  useOrder,
  useOrders,
  useProducts,
  type PurchaseOrder,
} from '../api/workspace'
import OrderLimits, {
  findOverLimits,
  type OrderLimit,
  type OverLimit,
} from '../components/OrderLimits.tsx'

// 상태별로 사장님이 다음에 할 수 있는 일 (US-01·US-02). 취소는 '발주 초안'에서만
const NEXT_ACTION: Record<string, string | undefined> = {
  '발주 초안': '승인',
  '발주 확인 완료': '전달 완료 표시',
}

function OrderList() {
  const [limits, setLimits] = useState<OrderLimit[]>([])
  // 한도를 넘은 발주 초안을 승인하려 할 때 다시 확인받는 내용 (US-01 R7)
  const [limitReview, setLimitReview] = useState<{
    orderId: number
    items: OverLimit[]
  } | null>(null)
  const limitDialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (limitReview) limitDialogRef.current?.showModal()
  }, [limitReview])
  const { mutate } = useSWRConfig()
  const { data: orderData, error: orderError } = useOrders()
  const { data: productData, error: productError } = useProducts()
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const {
    data: selectedOrder,
    error: detailError,
    isValidating: detailLoading,
  } = useOrder(selectedOrderId)
  const [supplier, setSupplier] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const orders = orderData ?? []
  const products = productData ?? []
  const loading = !orderData && !orderError
  const error = orderError
    ? orderError instanceof Error
      ? orderError.message
      : '발주 목록을 불러오지 못했어요'
    : null

  const [lines, setLines] = useState([{ id: 0, productId: '', quantity: '' }])
  const [nextLineId, setNextLineId] = useState(1)
  const draftOverLimits = findOverLimits(
    lines.flatMap((line) => {
      const quantity = Number(line.quantity)
      return line.productId && Number.isFinite(quantity) && quantity > 0
        ? [{ product_id: Number(line.productId), quantity }]
        : []
    }),
    products,
    limits,
  )

  function updateLine(id: number, values: Partial<(typeof lines)[number]>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...values } : line)),
    )
  }

  async function updateOrderCache(order: PurchaseOrder) {
    await mutate<PurchaseOrder[]>(
      ['purchase-orders', '1'],
      (current) => {
        const existing = current ?? []
        return existing.some((item) => item.id === order.id)
          ? existing.map((item) => (item.id === order.id ? order : item))
          : [...existing, order].sort((a, b) => a.id - b.id)
      },
      { revalidate: false },
    )
    await mutate(['purchase-order', '1', order.id], order, {
      revalidate: false,
    })
    void mutate(['purchase-orders', '1'])
  }

  async function saveOrder() {
    setActionError(null)
    setSuccess(null)
    if (
      lines.some(
        (line) =>
          !products.some((product) => product.id === Number(line.productId)),
      )
    ) {
      setActionError('모든 줄에서 등록된 상품을 선택해 주세요')
      return
    }
    if (
      lines.some(
        (line) =>
          !Number.isSafeInteger(Number(line.quantity)) ||
          Number(line.quantity) < 1,
      )
    ) {
      setActionError('수량은 1 이상의 정수로 입력해 주세요')
      return
    }
    setPending('create')
    try {
      const order = await createOrder({
        supplier: supplier.trim() || null,
        lines: lines.map((line) => ({
          product_id: Number(line.productId),
          quantity: Number(line.quantity),
        })),
      })
      await updateOrderCache(order)
      setSupplier('')
      setLines([{ id: nextLineId, productId: '', quantity: '' }])
      setNextLineId((current) => current + 1)
      setSuccess(`발주 #${order.id}을 저장했어요`)
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : '발주를 저장하지 못했어요',
      )
    } finally {
      setPending(null)
    }
  }

  async function runAction(
    id: number,
    action: 'approve' | 'mark-delivered' | 'cancel',
  ) {
    setPending(`${id}:${action}`)
    setActionError(null)
    setSuccess(null)
    try {
      const order = await changeOrderStatus(id, action)
      await updateOrderCache(order)
      if (action === 'mark-delivered') void mutate(['inspections', '1'])
      setSuccess(`발주 #${order.id}: ${order.status}`)
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : '발주 상태를 변경하지 못했어요',
      )
    } finally {
      setPending(null)
    }
  }
  // 한도를 넘은 상품이 있으면 바로 승인하지 않고 경고 창에서 다시 확인받는다.
  function requestApprove(order: PurchaseOrder) {
    const items = findOverLimits(order.lines, products, limits)
    if (items.length === 0) {
      void runAction(order.id, 'approve')
      return
    }
    setActionError(null)
    setSuccess(null)
    setLimitReview({ orderId: order.id, items })
  }

  const count = (status: string) =>
    loading || (!orderData && error)
      ? '—'
      : orders.filter((order) => order.status === status).length

  return (
    <div className="order-page">
      <PageHeader title="발주" screen="orders" />
      {actionError && (
        <p className="banner banner-error" role="alert">
          {actionError}
        </p>
      )}
      {success && (
        <p className="banner" role="status">
          {success}
        </p>
      )}

      <StatusSummary
        items={[
          {
            label: '발주 초안',
            value: count('발주 초안'),
            status: '발주 초안',
          },
          {
            label: '입고 대기',
            value: count('입고 대기'),
            status: '입고 대기',
          },
        ]}
      />
      <div className="layout-main">
        <section className="card" aria-labelledby="orders-title">
          <CardHead
            id="orders-title"
            icon={<Icon name="list" />}
            title="발주 목록"
            note="공급처에 보내기 전(발주 초안)에만 취소할 수 있어요"
            right={
              <span className="chip">
                {loading || (!orderData && error) ? '—' : orders.length}건
              </span>
            }
          />
          {loading && <p role="status">발주 목록을 불러오는 중이에요…</p>}
          {error && (
            <p className="banner banner-error" role="alert">
              {error}
            </p>
          )}
          {!loading && orders.length === 0 && !error && (
            <p>등록된 발주가 없어요</p>
          )}
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">발주 번호</th>
                  <th scope="col">공급처</th>
                  <th scope="col">품목</th>
                  <th scope="col">상태</th>
                  <th scope="col">
                    <span className="visually-hidden">할 일</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const next = NEXT_ACTION[order.status]
                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="code-cell">{order.id}</span>
                        <small className="sub-text">발주 #{order.id}</small>
                      </td>
                      <td className="wrap">{order.supplier ?? '—'}</td>
                      <td className="wrap">
                        {order.lines[0]
                          ? (products.find(
                              (item) => item.id === order.lines[0].product_id,
                            )?.name ?? `상품 #${order.lines[0].product_id}`)
                          : '—'}
                        {order.lines.length > 1 &&
                          ` 외 ${order.lines.length - 1}개`}
                      </td>
                      <td>
                        <StatusPill status={order.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="button-small"
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            상세
                          </button>
                          {next && (
                            <button
                              type="button"
                              className="button-small"
                              disabled={pending !== null}
                              onClick={() =>
                                order.status === '발주 초안'
                                  ? requestApprove(order)
                                  : void runAction(order.id, 'mark-delivered')
                              }
                            >
                              {next}
                            </button>
                          )}
                          {order.status === '발주 초안' && (
                            <button
                              type="button"
                              className="button-small button-danger-text"
                              disabled={pending !== null}
                              onClick={() => void runAction(order.id, 'cancel')}
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {selectedOrderId !== null && (
            <section aria-labelledby="order-detail-title">
              <h3 id="order-detail-title">발주 #{selectedOrderId} 상세</h3>
              <button
                type="button"
                className="button-small"
                onClick={() => setSelectedOrderId(null)}
              >
                닫기
              </button>
              {detailLoading && !selectedOrder && (
                <p role="status">발주 상세를 불러오는 중이에요…</p>
              )}
              {detailError && (
                <p className="banner banner-error" role="alert">
                  {detailError instanceof Error
                    ? detailError.message
                    : '발주 상세를 불러오지 못했어요'}
                </p>
              )}
              {selectedOrder && (
                <>
                  <p>공급처: {selectedOrder.supplier ?? '—'}</p>
                  <StatusPill status={selectedOrder.status} />
                  <ul>
                    {selectedOrder.lines.map((line, index) => {
                      const product = products.find(
                        (item) => item.id === line.product_id,
                      )
                      return (
                        <li key={`${line.product_id}:${index}`}>
                          {product?.name ?? product?.product_code ?? '상품'} (#
                          {line.product_id}): {line.quantity}{' '}
                          {product?.base_unit ?? ''}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </section>
          )}
        </section>

        <section className="card card-form" aria-labelledby="new-order-title">
          <CardHead
            id="new-order-title"
            icon={<Icon name="plus" />}
            title="발주 작성"
            note="저장하면 발주 초안이 돼요. 재고는 바뀌지 않아요"
          />
          <div className="field">
            <label htmlFor="order-supplier">공급처</label>
            <input
              id="order-supplier"
              value={supplier}
              disabled={pending !== null}
              onChange={(event) => setSupplier(event.target.value)}
            />
          </div>

          {productError && (
            <p className="banner banner-error" role="alert">
              {productError instanceof Error
                ? productError.message
                : '상품 목록을 불러오지 못했어요'}
            </p>
          )}
          <div className="order-lines">
            <p className="field-label">상품과 수량</p>
            {lines.map((line, index) => {
              const product = products.find(
                (item) => item.id === Number(line.productId),
              )
              // 수량을 넣은 줄만 경고한다. 같은 상품 줄은 합계로 비교한다.
              const over =
                Number(line.quantity) > 0
                  ? draftOverLimits.find(
                      (item) => item.productId === Number(line.productId),
                    )
                  : undefined
              const overLimit = over !== undefined
              return (
                <div key={line.id}>
                  <div className="order-line">
                    <select
                      className="order-product-select"
                      aria-label={`상품 ${index + 1}`}
                      value={line.productId}
                      disabled={pending !== null}
                      onChange={(event) =>
                        updateLine(line.id, { productId: event.target.value })
                      }
                    >
                      <option value="">상품 고르기</option>
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name ?? item.product_code} ({item.product_code},
                          #{item.id})
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`수량 ${index + 1}`}
                      className={`input-qty${overLimit ? ' input-warning' : ''}`}
                      type="number"
                      disabled={pending !== null}
                      min="1"
                      step="1"
                      placeholder="0"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.id, { quantity: event.target.value })
                      }
                    />
                    <input
                      aria-label={`기본 단위 ${index + 1}`}
                      value={product?.base_unit ?? '—'}
                      readOnly
                    />
                    <button
                      type="button"
                      className="button-small"
                      aria-label={`상품 ${index + 1} 삭제`}
                      disabled={lines.length === 1 || pending !== null}
                      onClick={() =>
                        setLines((current) =>
                          current.filter((item) => item.id !== line.id),
                        )
                      }
                    >
                      −
                    </button>
                  </div>
                  {over && (
                    <p className="field-warning">
                      <Icon name="alert" size={16} /> 발주 한도{' '}
                      {over.limit.limit}
                      {over.limit.unit}를 넘었어요
                      {over.quantity !== Number(line.quantity) &&
                        ` (같은 상품 합계 ${over.quantity}${over.limit.unit})`}
                      . 다시 확인해 주세요.
                    </p>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              className="button-text"
              disabled={pending !== null}
              onClick={() => {
                setLines((current) => [
                  ...current,
                  { id: nextLineId, productId: '', quantity: '' },
                ])
                setNextLineId((current) => current + 1)
              }}
            >
              + 상품 추가
            </button>
          </div>

          <button
            type="button"
            className="button-primary"
            disabled={pending !== null || !productData || products.length === 0}
            onClick={() => void saveOrder()}
          >
            {pending === 'create' ? '저장 중…' : '저장'}
          </button>
        </section>
      </div>
      <OrderLimits onChange={setLimits} />
      {limitReview && (
        <dialog
          ref={limitDialogRef}
          className="confirm-dialog"
          aria-labelledby="limit-review-title"
          aria-describedby="limit-review-note"
          onClose={() => setLimitReview(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget)
              event.currentTarget.close()
          }}
        >
          <h2 id="limit-review-title" className="confirm-dialog-title">
            <Icon name="alert" size={22} />
            발주 한도를 넘은 상품이 있어요
          </h2>
          <p id="limit-review-note">
            발주 #{limitReview.orderId}을 승인하기 전에 수량을 다시 확인해
            주세요.
          </p>
          <ul className="limit-review-list">
            {limitReview.items.map((item) => (
              <li key={item.productId}>
                <strong>
                  {item.product?.name ?? `상품 #${item.productId}`}
                </strong>
                <span className="field-warning">
                  발주 {item.quantity}
                  {item.limit.unit} · 한도 {item.limit.limit}
                  {item.limit.unit} · {item.quantity - item.limit.limit}
                  {item.limit.unit} 초과
                </span>
              </li>
            ))}
          </ul>
          <div className="row-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => limitDialogRef.current?.close()}
            >
              돌아가기
            </button>
            <button
              type="button"
              className="button-primary"
              disabled={pending !== null}
              onClick={() => {
                const { orderId } = limitReview
                limitDialogRef.current?.close()
                void runAction(orderId, 'approve')
              }}
            >
              확인했어요, 승인
            </button>
          </div>
        </dialog>
      )}
    </div>
  )
}

export default OrderList
