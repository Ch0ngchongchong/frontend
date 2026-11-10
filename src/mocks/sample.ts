// 디자인 시안용 가상 데이터. API를 잇기 전까지 화면 모양을 보기 위해서만 쓴다.
// 필드 이름·상태값은 DATA-MODEL.md를 따르고, 상품·발주는 DATA-MODEL.md 시드(#2~#5)를 바탕으로 했다.
// 실제 개인정보·실제 거래처 이름은 쓰지 않는다.

export type OrderLine = { product: string; quantity: number; unit: string }

export type PurchaseOrder = {
  id: string
  supplier: string
  status: string
  createdAt: string
  lines: OrderLine[]
  overLimit?: boolean
}

export const ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-0014',
    supplier: '(가상) 유제품 공급처 A',
    status: '발주 초안',
    createdAt: '11월 3일 09:10',
    lines: [{ product: '서울우유 1000ml', quantity: 30, unit: '개' }],
    overLimit: true,
  },
  {
    id: 'PO-0013',
    supplier: '(가상) 포장재 공급처 E',
    status: '발주 확인 완료',
    createdAt: '11월 2일 17:40',
    lines: [{ product: '종이컵 12oz', quantity: 4, unit: '박스' }],
  },
  {
    id: 'PO-0012',
    supplier: '(가상) 식자재 공급처 B',
    status: '입고 대기',
    createdAt: '11월 2일 10:05',
    lines: [
      { product: '바닐라 시럽', quantity: 2, unit: '병' },
      { product: '서울우유 1000ml', quantity: 10, unit: '개' },
    ],
  },
  {
    id: 'PO-0011',
    supplier: '(가상) 원두 공급처 D',
    status: '공급처 전달 완료',
    createdAt: '11월 1일 15:20',
    lines: [{ product: '원두 1kg', quantity: 3, unit: '봉' }],
  },
  {
    id: 'PO-0010',
    supplier: '(가상) 유제품 공급처 A',
    status: '입고 완료',
    createdAt: '10월 31일 09:00',
    lines: [{ product: '서울우유 1000ml', quantity: 10, unit: '개' }],
  },
  {
    id: 'PO-0009',
    supplier: '(가상) 식자재 공급처 C',
    status: '발주 취소',
    createdAt: '10월 30일 11:30',
    lines: [{ product: '바닐라 시럽', quantity: 1, unit: '병' }],
  },
]

export type Inspection = {
  id: string
  orderId: string
  supplier: string
  status: string
  uploadedAt?: string
  lineCount: number
  note?: string
}

export const INSPECTIONS: Inspection[] = [
  {
    id: 'IN-1053',
    orderId: 'PO-0012',
    supplier: '(가상) 식자재 공급처 B',
    status: '업로드 대기',
    lineCount: 2,
  },
  {
    id: 'IN-1052',
    orderId: 'PO-0008',
    supplier: '(가상) 포장재 공급처 E',
    status: '업로드 대기',
    lineCount: 1,
    note: '사진이 흐려 판독하지 못했어요. 다시 올려 주세요',
  },
  {
    id: 'IN-1051',
    orderId: 'PO-0007',
    supplier: '(가상) 원두 공급처 D',
    status: '판독 중',
    uploadedAt: '09:12',
    lineCount: 3,
  },
  {
    id: 'IN-1049',
    orderId: 'PO-0006',
    supplier: '(가상) 식자재 공급처 B',
    status: '직원 확인 대기',
    uploadedAt: '08:05',
    lineCount: 4,
  },
]

// 입고 확인: 판독 결과 줄과 발주 내용 대조 (US-03·US-04·US-05)
export type ReviewLine = {
  rawName: string
  candidates: { name: string; reason: string }[]
  orderedQty: number | null
  quantity: number | null
  unit: string | null
  conversion: string | null
  unitPrice: number | null
  amount: number | null
  uncertain: string[]
  ruleFail?: string
  differs?: boolean
}

export const REVIEW_LINES: ReviewLine[] = [
  {
    rawName: '서울우유1L',
    candidates: [{ name: '서울우유 1000ml', reason: '이름·규격이 같아요' }],
    orderedQty: 10,
    quantity: 1,
    unit: '박스',
    conversion: '1박스 → 10개',
    unitPrice: 26500,
    amount: 26500,
    uncertain: [],
  },
  {
    rawName: '종이컵(12)',
    candidates: [
      { name: '종이컵 12oz', reason: '이름이 비슷하고 12가 규격으로 보여요' },
      { name: '종이컵 8oz', reason: '이름만 비슷해요' },
    ],
    orderedQty: 48,
    quantity: 2,
    unit: '박스',
    conversion: '2박스 → 48개',
    unitPrice: null,
    amount: 31000,
    uncertain: ['unit_price'],
  },
  {
    rawName: '바닐라시럽',
    candidates: [{ name: '바닐라 시럽', reason: '이름이 같아요' }],
    orderedQty: 2,
    quantity: 3,
    unit: '병',
    conversion: null,
    unitPrice: 9800,
    amount: 28400,
    uncertain: [],
    ruleFail: '수량 × 단가가 금액과 달라요',
    differs: true,
  },
  {
    rawName: '헤이즐넛 파우더',
    candidates: [],
    orderedQty: null,
    quantity: 1,
    unit: null,
    conversion: null,
    unitPrice: 12000,
    amount: 12000,
    uncertain: ['unit'],
    differs: true,
  },
]

// 예외 건 승인 (US-06)
export type ExceptionCase = {
  id: string
  supplier: string
  kinds: string[]
  staffReason: string
  submittedAt: string
  rows: { item: string; ordered: string; received: string }[]
}

export const EXCEPTIONS: ExceptionCase[] = [
  {
    id: 'IN-1048',
    supplier: '(가상) 포장재 공급처 E',
    kinds: ['초과 입고', '높은 단가'],
    staffReason:
      '종이컵이 발주보다 1박스 더 왔고, 단가가 지난번보다 올라 있어요. 기사님은 이번 달부터 단가가 바뀌었다고 했어요.',
    submittedAt: '11월 2일 17:52',
    rows: [
      {
        item: '종이컵 12oz',
        ordered: '4박스 · 15,500원',
        received: '5박스 · 16,800원',
      },
      {
        item: '컵 뚜껑 90파이',
        ordered: '2박스 · 9,000원',
        received: '2박스 · 9,000원',
      },
    ],
  },
  {
    id: 'IN-1046',
    supplier: '(가상) 식자재 공급처 C',
    kinds: ['미등록 상품'],
    staffReason: '발주에 없던 헤이즐넛 파우더 1개가 같이 왔어요.',
    submittedAt: '11월 2일 09:30',
    rows: [
      { item: '헤이즐넛 파우더', ordered: '—', received: '1개 · 12,000원' },
    ],
  },
]

// 변경 이력 (US-07) — 기록은 수정·삭제할 수 없다
export type HistoryEntry = {
  at: string
  by: string
  kind: string
  field: string
  oldValue: string
  newValue: string
}

export const HISTORY: HistoryEntry[] = [
  {
    at: '11월 2일 09:14',
    by: '시스템 (판독)',
    kind: '판독 원본값',
    field: '종이컵(12) 단가',
    oldValue: '—',
    newValue: '빈칸 (확신 없음)',
  },
  {
    at: '11월 2일 09:31',
    by: '직원',
    kind: '직원 수정값',
    field: '종이컵(12) 단가',
    oldValue: '빈칸',
    newValue: '15,500원',
  },
  {
    at: '11월 2일 09:33',
    by: '직원',
    kind: '검수 결과',
    field: '상태',
    oldValue: '직원 확인 대기',
    newValue: '사장 승인 대기',
  },
  {
    at: '11월 2일 18:05',
    by: '사장님',
    kind: '사장 승인',
    field: '상태',
    oldValue: '사장 승인 대기',
    newValue: '승인',
  },
  {
    at: '11월 2일 18:05',
    by: '시스템',
    kind: '최종 재고 반영',
    field: '종이컵 12oz 재고',
    oldValue: '72개',
    newValue: '192개',
  },
]

export const READ_LOG = {
  inspectionId: 'IN-1047',
  inputTokens: 1840,
  outputTokens: 612,
  cost: 18,
  elapsedSeconds: 33,
}

// 입고 달력 — 날짜별로 들어온 입고 검수 건과 들어올 예정인 발주(입고 대기)
export type CalendarEntry = {
  date: string // YYYY-MM-DD
  id: string
  supplier: string
  status: string
  items: string[]
}

export const CALENDAR_MONTH = { year: 2026, month: 11, today: '2026-11-03' }

export const CALENDAR: CalendarEntry[] = [
  {
    date: '2026-11-02',
    id: 'IN-1048',
    supplier: '(가상) 포장재 공급처 E',
    status: '재고 반영 완료',
    items: ['종이컵 12oz 5박스 (120개)', '컵 뚜껑 90파이 2박스'],
  },
  {
    date: '2026-11-02',
    id: 'IN-1047',
    supplier: '(가상) 식자재 공급처 C',
    status: '재고 반영 완료',
    items: ['바닐라 시럽 2병'],
  },
  {
    date: '2026-11-02',
    id: 'IN-1046',
    supplier: '(가상) 식자재 공급처 C',
    status: '사장 승인 대기',
    items: ['헤이즐넛 파우더 1개 (미등록 상품)'],
  },
  {
    date: '2026-11-03',
    id: 'IN-1049',
    supplier: '(가상) 식자재 공급처 B',
    status: '직원 확인 대기',
    items: ['서울우유 1000ml 1박스', '종이컵 12oz 2박스', '바닐라 시럽 3병'],
  },
  {
    date: '2026-11-03',
    id: 'IN-1051',
    supplier: '(가상) 원두 공급처 D',
    status: '판독 중',
    items: ['원두 1kg 3봉'],
  },
  {
    date: '2026-11-04',
    id: 'PO-0012',
    supplier: '(가상) 식자재 공급처 B',
    status: '입고 대기',
    items: ['바닐라 시럽 2병', '서울우유 1000ml 10개'],
  },
  {
    date: '2026-11-06',
    id: 'PO-0011',
    supplier: '(가상) 원두 공급처 D',
    status: '입고 대기',
    items: ['원두 1kg 3봉'],
  },
  {
    date: '2026-11-10',
    id: 'PO-0015',
    supplier: '(가상) 유제품 공급처 A',
    status: '입고 대기',
    items: ['서울우유 1000ml 30개'],
  },
  {
    date: '2026-11-13',
    id: 'PO-0016',
    supplier: '(가상) 포장재 공급처 E',
    status: '입고 대기',
    items: ['종이컵 12oz 4박스'],
  },
]
