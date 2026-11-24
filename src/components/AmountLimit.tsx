import type { Inspection } from '../api/inspections'
import { useOrder } from '../api/workspace'
import { Icon } from './ui.tsx'

// 금액 한도 (R7, 2026-11-16 멘토 데모 피드백 팀 결정: "최종 금액이 한도를 넘으면 알람을 준다").
// 사장님이 발주 작성 때 금액 한도(amount_alert_threshold)를 정하고, 입고 확인의 최종 금액
// (final_amount)이 그 값을 넘으면 서버가 amount_over_limit: true로 예외 건으로 분류한다.

export const AMOUNT_OVER_LIMIT_LABEL = '금액 한도 초과'

export function won(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

// 금액 한도를 넘은 검수 건에 최종 금액과 한도를 보여 준다. 한도 값은 검수 응답에 없어 발주에서 읽는다.
export function AmountOverLimitNotice({
  inspection,
}: {
  inspection: Inspection
}) {
  const { data: order } = useOrder(
    inspection.amount_over_limit ? inspection.purchase_order_id : null,
  )
  if (!inspection.amount_over_limit) return null
  const finalAmount = inspection.final_amount ?? null
  const limit = order?.amount_alert_threshold ?? null
  return (
    <p className="field-warning amount-over-limit">
      <Icon name="alert" size={16} />
      <span>
        최종 금액{finalAmount !== null && ` ${won(finalAmount)}`}이 발주 금액
        한도{limit !== null ? ` ${won(limit)}을` : '를'} 넘었어요
        {finalAmount !== null &&
          limit !== null &&
          ` (${won(finalAmount - limit)} 초과)`}
      </span>
    </p>
  )
}
