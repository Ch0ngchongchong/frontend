import useSWR from 'swr'
import { fetchProducts } from './products'
import { request } from './client'

export type PurchaseOrder = {
  id: number
  supplier: string | null
  status: string
  lines: { product_id: number; quantity: number }[]
}

// Browser-memory keys include the temporary user. No store data is cached in HTML.
export function useProducts() {
  return useSWR(['products', '1'], fetchProducts, { revalidateOnMount: true })
}

export function useOrders() {
  return useSWR(
    ['purchase-orders', '1'],
    () => request<PurchaseOrder[]>('/purchase-orders'),
    { revalidateOnMount: true },
  )
}

export function useOrder(id: number | null) {
  return useSWR(
    id === null ? null : ['purchase-order', '1', id],
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
