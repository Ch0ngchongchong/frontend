import useSWR from 'swr'
import { request } from './client'

export type InspectionLine = {
  id: number
  line_no: number
  read: {
    name: string
    quantity: number | null
    unit: string | null
    unit_price: number | null
    amount: number | null
  }
  candidates: { product_id: number; score: number; reason: string }[]
  product_id: number | null
  quantity: number | null
  unit: string | null
  base_quantity: number | null
  order_quantity: number | null
  match_status: string
}
export type Inspection = {
  id: number
  purchase_order_id: number
  status: string
  ai_draft: boolean
  document: {
    id: number
    filename: string
    content_type: string
    uploaded_at: string
    read_error: string | null
  } | null
  lines: InspectionLine[]
  missing_order_lines: { product_id: number; order_quantity: number }[]
  check_count: number
  all_match: boolean
}
export type InventoryItem = {
  product_id: number
  product_code: string
  name: string | null
  base_unit: string | null
  quantity: number
}

export function useInspections() {
  return useSWR(
    ['inspections', '1'],
    () => request<Inspection[]>('/inspections'),
    {
      revalidateOnMount: true,
      refreshInterval: (data) =>
        data?.some((item) => item.status === '판독 중') ? 1500 : 0,
    },
  )
}

export function useInspection(id: number | null) {
  return useSWR(
    id === null ? null : ['inspection', '1', id],
    () => request<Inspection>(`/inspections/${id}`),
    {
      revalidateOnMount: true,
      refreshInterval: (data) => (data?.status === '판독 중' ? 1500 : 0),
    },
  )
}

export function useInventory() {
  return useSWR(
    ['inventory', '1'],
    () => request<InventoryItem[]>('/inventory'),
    { revalidateOnMount: true },
  )
}
