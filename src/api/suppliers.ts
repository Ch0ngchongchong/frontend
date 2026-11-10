import useSWR from 'swr'
import { request } from './client'

export type Supplier = {
  id: string | number
  name: string
  category: string
  deliveryDays: string
  orderCutoff: string
  since: string
}
export type SupplierInput = Omit<Supplier, 'id'>
export const supplierKey = ['suppliers', '1']

export function useSuppliers() {
  return useSWR(supplierKey, () => request<Supplier[]>('/suppliers'), {
    revalidateOnMount: true,
  })
}

export function saveSupplier(id: Supplier['id'] | null, input: SupplierInput) {
  return request<Supplier>(
    id === null ? '/suppliers' : `/suppliers/${encodeURIComponent(String(id))}`,
    {
      method: id === null ? 'POST' : 'PATCH',
      body: JSON.stringify(input),
    },
  )
}

export function deleteSupplier(id: Supplier['id']) {
  return request<void>(`/suppliers/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  })
}
