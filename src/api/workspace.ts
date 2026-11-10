import useSWR from 'swr'
import { fetchProducts } from './products'

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
    async () => {
      const response = await fetch('/api/purchase-orders', {
        headers: { 'X-User-Id': '1' },
        cache: 'no-store',
      })
      if (!response.ok)
        throw new Error(
          '발주 목록을 불러오지 못했어요 (' + response.status + ')',
        )
      return response.json() as Promise<PurchaseOrder[]>
    },
    { revalidateOnMount: true },
  )
}
