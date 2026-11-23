import type { InspectionLine } from './api/inspections'

// 입고 확인 표에서 강조할 칸 (PRD 6절, DESIGN.md 입고 확인, US-03·US-04).
// 서버는 아직 불확실한 값과 규칙 검증 결과를 보내지 않아서, 판독값(`read`)을 보고 화면에서 고른다.
// 판독값은 직원이 고쳐도 바뀌지 않으므로 강조도 그대로 남는다. 강조는 알리기만 하고
// 확정을 막는 기준은 서버의 check_count다.

export type ReadField = 'name' | 'quantity' | 'unit' | 'unit_price' | 'amount'

const FIELD_LABEL: Record<ReadField, string> = {
  name: '품목명',
  quantity: '수량',
  unit: '단위',
  unit_price: '단가',
  amount: '금액',
}

export type UncertainValue = { field: ReadField; reason: string }

export type LineChecks = {
  // 불확실한 값: 서버가 표시한 값(`uncertain_fields`)과 OCR이 읽지 못한 값
  uncertain: UncertainValue[]
  // 규칙 검증 실패 이유 한 줄. 없으면 null
  ruleFail: string | null
}

// 비어 있으면 '읽지 못한 값'으로 보는 칸. 단위는 명세서에 없을 수도 있어서 빼고,
// 품목명은 서버가 항상 채운다.
const REQUIRED_READ: ReadField[] = ['quantity', 'unit_price', 'amount']

function isReadField(value: string): value is ReadField {
  return value in FIELD_LABEL
}

// 받침이 있으면 앞, 없으면 뒤 조사 (예: 수량이·단가가, 금액을·단가를)
function particle(word: string, withFinal: string, withoutFinal: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0
  return `${word}${hasFinal ? withFinal : withoutFinal}`
}

function won(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

export function checkLine(line: InspectionLine): LineChecks {
  const uncertain: UncertainValue[] = []
  const add = (field: ReadField, reason: string) => {
    if (!uncertain.some((item) => item.field === field))
      uncertain.push({ field, reason })
  }

  for (const field of line.uncertain_fields ?? []) {
    if (isReadField(field))
      add(field, `${particle(FIELD_LABEL[field], '이', '가')} 확실하지 않아요`)
  }
  // 직원이 추가한 줄은 직원이 일부러 비워 둔 것이라 읽지 못한 값으로 보지 않는다.
  if (line.source !== 'staff') {
    for (const field of REQUIRED_READ) {
      if (line.read[field] === null)
        add(field, `${particle(FIELD_LABEL[field], '을', '를')} 읽지 못했어요`)
    }
  }

  const { quantity, unit_price: price, amount } = line.read
  const ruleFail =
    quantity !== null &&
    price !== null &&
    amount !== null &&
    quantity * price !== amount
      ? `수량 × 단가가 금액과 달라요 (${quantity} × ${won(price)} = ${won(quantity * price)}, 명세서 ${won(amount)})`
      : null

  return { uncertain, ruleFail }
}

// 강조한 칸 수. 규칙 검증 실패는 줄마다 한 칸(단가·금액 칸)으로 센다.
export function countFlagged(checks: LineChecks[]) {
  return {
    uncertain: checks.reduce((sum, item) => sum + item.uncertain.length, 0),
    ruleFail: checks.filter((item) => item.ruleFail !== null).length,
  }
}
