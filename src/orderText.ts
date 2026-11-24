import type { Product } from './api/products'
import type { PurchaseOrder } from './api/workspace'

// 발주 복사 (client-meeting-2 피드백 15): 공급처마다 전화·문자·카카오톡으로 받는 방식이 달라
// 자동 전송 대신 붙여 넣기 좋은 글로 만들어 준다. 승인한 발주만 보낸다.
export const COPYABLE_STATUSES = [
  '발주 확인 완료',
  '공급처 전달 완료',
  '입고 대기',
  '입고 완료',
]

export function orderText(
  order: PurchaseOrder,
  products: Product[],
  store: { name: string; contact: string },
) {
  // 같은 상품이 여러 줄이면 공급처가 헷갈리지 않게 합쳐서 적는다.
  const totals = new Map<number, number>()
  for (const line of order.lines)
    totals.set(
      line.product_id,
      (totals.get(line.product_id) ?? 0) + line.quantity,
    )
  const items = [...totals].map(([productId, quantity], index) => {
    const product = products.find((item) => item.id === productId)
    const name = product?.name ?? product?.product_code ?? `상품 #${productId}`
    const spec = product?.spec ? ` (${product.spec})` : ''
    const amount = product?.base_unit
      ? `${quantity.toLocaleString('ko-KR')}${product.base_unit}`
      : `${quantity.toLocaleString('ko-KR')}개`
    return `${index + 1}. ${name}${spec} ${amount}`
  })
  return [
    `[발주] ${store.name}`,
    `발주 번호: ${order.id}`,
    ...(order.supplier ? [`공급처: ${order.supplier}`] : []),
    '',
    ...items,
    '',
    `총 ${items.length}개 품목입니다. 확인 부탁드립니다.`,
    ...(store.contact ? [`연락처: ${store.contact}`] : []),
  ].join('\n')
}

// 클립보드에 쓴다. 보안 연결이 아니거나 권한이 없으면 예전 방식(선택 후 복사)으로 한 번 더 해 본다.
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    /* 아래 방식으로 다시 시도한다. */
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  const copied = document.execCommand('copy')
  area.remove()
  if (!copied) throw new Error('복사하지 못했어요')
}
