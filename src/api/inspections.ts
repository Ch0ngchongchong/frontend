import useSWR from 'swr'
import { request, requestBlob, STAFF_USER_ID } from './client'

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
  // 'staff'면 판독에 없던 줄을 직원이 추가한 것이다 (US-04). 서버가 보내지 않으면 판독 줄로 본다.
  source?: 'ocr' | 'staff'
  // 판독이 확신하지 못한 읽은 값 필드 이름 (`quantity`, `unit_price` 등). 서버가 아직 보내지 않는다.
  uncertain_fields?: string[]
}
export type Inspection = {
  id: number
  purchase_order_id: number
  status: string
  ai_draft: boolean
  exception_reason: string | null
  reject_reason: string | null
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

// 판독 결과에 없는 줄 추가 (US-04, `직원 확인 대기`에서만). 명세서에 적힌 값을 그대로 보낸다.
// 서버 계약은 README 참고. 성공하면 갱신된 검수 건 전체를 돌려받는다.
export type InspectionLineInput = {
  name: string
  product_id: number | null
  quantity: number | null
  unit: string | null
  unit_price: number | null
}

export function addInspectionLine(id: number, input: InspectionLineInput) {
  return request<Inspection>(`/inspections/${id}/lines`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// 예외 건 목록 (US-06). 새 엔드포인트가 아니라 기존 목록 조회를 상태로 거른다.
export function useExceptionInspections() {
  return useSWR(['inspections', '1', '사장 승인 대기'], () =>
    request<Inspection[]>('/inspections?status=사장 승인 대기'),
  )
}

// 사장 승인·반려와 그 밖의 상태 전이 (US-06, docs/api/US-06-07-inspections.md)
export function approveInspection(id: number) {
  return request<Inspection>(`/inspections/${id}/approve`, { method: 'POST' })
}

export function rejectInspection(id: number, reason: string) {
  return request<Inspection>(`/inspections/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

// 직원 확정. 발주와 다른 건(all_match가 false)은 서버가 예외 사유를 필수로 받는다.
export function confirmInspection(id: number, reason: string | null) {
  return request<Inspection>(`/inspections/${id}/confirm`, {
    method: 'POST',
    body: reason === null ? undefined : JSON.stringify({ reason }),
  })
}

// 사장 처리 전 직원 확정 취소 (`사장 승인 대기` → `직원 확인 대기`). 서버가 직원만 허용한다.
export function cancelConfirmation(id: number) {
  return request<Inspection>(`/inspections/${id}/cancel-confirmation`, {
    method: 'POST',
    userId: STAFF_USER_ID,
  })
}

// 반려 건 재검수 시작 (`반려` → `직원 확인 대기`). 서버가 직원만 허용한다.
export function reinspect(id: number) {
  return request<Inspection>(`/inspections/${id}/reinspect`, {
    method: 'POST',
    userId: STAFF_USER_ID,
  })
}

// 예외 사진 (US-04·US-06). 업로드는 `직원 확인 대기`에서만 되고, 목록·원본은 언제든 조회할 수 있다.
export type ExceptionPhoto = {
  id: number
  filename: string
  content_type: string
  uploaded_at: string
}

export const EXCEPTION_PHOTO_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
}
export const EXCEPTION_PHOTO_MAX_BYTES = 10 * 1024 * 1024

export function useExceptionPhotos(id: number | null) {
  return useSWR(id === null ? null : ['exception-photos', '1', id], () =>
    request<ExceptionPhoto[]>(`/inspections/${id}/exception-photos`),
  )
}

export function uploadExceptionPhoto(id: number, file: File) {
  const body = new FormData()
  body.append('file', file)
  return request<Omit<ExceptionPhoto, 'uploaded_at'>>(
    `/inspections/${id}/exception-photos`,
    { method: 'POST', body },
  )
}

export function fetchExceptionPhoto(id: number, photoId: number) {
  return requestBlob(`/inspections/${id}/exception-photos/${photoId}`)
}

// 반려 건 검수 종료 (사장님)
export function closeInspection(id: number) {
  return request<Inspection>(`/inspections/${id}/close`, { method: 'POST' })
}

// 변경 이력 (US-07). 응답은 `{ inspection_id, changes, reading_logs }`이고 화면은 changes만 쓴다
// (판독 로그는 아래 `/reading-logs`로 따로 받는다).
// - action: 무슨 일인지 (`판독`, `줄 수정`, `확정`, `확정 취소`, `재고 반영` 등)
// - field: 바뀐 곳 (`status`, `line 3`, `line 3 quantity`, `inventory P-001`, `exception_reason` 등).
//   예전 이력은 null이고 action에 예전 kind가 들어 있다
// - old_value·new_value: 문자열. 숫자·객체는 JSON 문자열로 온다
export type HistoryEntryRaw = {
  id: number
  changed_by: number | null
  changed_at: string
  action: string
  field: string | null
  old_value: string | null
  new_value: string | null
}

export function useInspectionHistory(id: number | null) {
  return useSWR(id === null ? null : ['inspection-history', '1', id], () =>
    request<{ changes: HistoryEntryRaw[] }>(`/inspections/${id}/history`).then(
      (data) => data.changes,
    ),
  )
}

// 판독 로그: 토큰·비용·처리 시간 (US-03, US-07)
export type ReadingLogRaw = {
  id: number
  document_id: number
  input_tokens: number | null
  output_tokens: number | null
  cost: number | null
  elapsed_seconds: number
  outcome: string
}

export function useReadingLogs(id: number | null) {
  return useSWR(id === null ? null : ['reading-logs', '1', id], () =>
    request<ReadingLogRaw[]>(`/inspections/${id}/reading-logs`),
  )
}
