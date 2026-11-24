import useSWR from 'swr'
import { fetchProducts } from './products'
import { request } from './client'
import { userKey } from '../session'

export type PurchaseOrder = {
  id: number
  supplier: string | null
  status: string
  lines: { product_id: number; quantity: number }[]
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

export function createOrder(input: {
  supplier: string | null
  lines: PurchaseOrder['lines']
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
