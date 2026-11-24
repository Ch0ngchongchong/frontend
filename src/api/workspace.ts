import useSWR from 'swr'
import { fetchProducts } from './products'
import { request } from './client'
import { userKey } from '../session'

export type PurchaseOrder = {
  id: number
  supplier: string | null
  status: string
  lines: { product_id: number; quantity: number }[]
  // 금액 한도(원). 입고 확인의 최종 금액(final_amount)이 이 값을 넘으면 예외 건이 된다 (R7).
  // 비워 두면 보지 않는다. 이 필드를 아직 보내지 않는 서버도 있어 선택으로 둔다
  amount_alert_threshold?: number | null
}

// 브라우저 메모리 캐시 키에 로그인한 사용자 ID를 넣는다. 매장 데이터는 HTML에 담지 않는다.
export function useProducts() {
  return useSWR(['products', userKey()], fetchProducts, {
    revalidateOnMount: true,
  })
}

export function useOrders() {
  return useSWR(
    ['purchase-orders', userKey()],
    () => request<PurchaseOrder[]>('/purchase-orders'),
    { revalidateOnMount: true },
  )
}

export function useOrder(id: number | null) {
  return useSWR(
    id === null ? null : ['purchase-order', userKey(), id],
    () => request<PurchaseOrder>(`/purchase-orders/${id}`),
    { revalidateOnMount: true },
  )
}

// amount_alert_threshold는 0보다 큰 정수(원)여야 한다. 아니면 서버가
// INVALID_AMOUNT_ALERT_THRESHOLD로 거절한다
export function createOrder(input: {
  supplier: string | null
  lines: PurchaseOrder['lines']
  amount_alert_threshold: number | null
}) {
  return request<PurchaseOrder>('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function changeOrderStatus(
  id: number,
  action: 'mark-delivered' | 'cancel',
) {
  return request<PurchaseOrder>(`/purchase-orders/${id}/${action}`, {
    method: 'POST',
  })
}

// 서버가 발주 한도를 검사한다. 넘은 상품이 있으면 QUANTITY_LIMIT_EXCEEDED로 거절하고,
// 사장님이 경고를 확인한 뒤에는 acknowledge_quantity_limit: true를 보내 승인한다 (US-01 R7).
export const QUANTITY_LIMIT_EXCEEDED = 'QUANTITY_LIMIT_EXCEEDED'

export function approveOrder(id: number, acknowledgeQuantityLimit = false) {
  return request<PurchaseOrder>(`/purchase-orders/${id}/approve`, {
    method: 'POST',
    ...(acknowledgeQuantityLimit && {
      body: JSON.stringify({ acknowledge_quantity_limit: true }),
    }),
  })
}
