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
  action: 'approve' | 'mark-delivered' | 'cancel',
) {
  return request<PurchaseOrder>(`/purchase-orders/${id}/${action}`, {
    method: 'POST',
  })
}
