import { useNav } from '../components/nav.ts'
import {
  CardHead,
  Icon,
  PageHeader,
  StatusPill,
  StatusSummary,
} from '../components/ui.tsx'
import { SUPPLIERS } from '../mocks/sample.ts'

// 거래처 (사장님) 화면 — 디자인 시안. PRD 5절 화면 목록에 없는 화면이다 (팀 확인 필요)
// 연결된 거래처를 목록으로 보여 주고, 하나를 누르면 그 거래처 페이지(SupplierPage)로 간다

// 아직 끝나지 않은 일정 (발주·입고가 진행 중)
const OPEN_STATUSES = [
  '발주 초안',
  '발주 확인 완료',
  '공급처 전달 완료',
  '입고 대기',
  '판독 중',
  '직원 확인 대기',
  '사장 승인 대기',
]

function SupplierList() {
  const nav = useNav()
  const rows = SUPPLIERS.map((supplier) => {
    const open = supplier.schedule.filter((row) =>
      OPEN_STATUSES.includes(row.status),
    )
    return {
      supplier,
      openCount: open.length,
      latest: supplier.schedule[0],
      next: supplier.schedule.find((row) => row.status === '입고 대기'),
    }
  })
  const openTotal = rows.reduce((sum, row) => sum + row.openCount, 0)

  return (
    <>
      <PageHeader title="거래처" screen="suppliers" />

      <StatusSummary
        items={[
          {
            label: '연결된 거래처',
            value: SUPPLIERS.length,
            tone: 'done',
            icon: 'store',
          },
          {
            label: '진행 중인 발주·입고',
            value: openTotal,
            status: '입고 대기',
          },
        ]}
      />

      <section className="card" aria-labelledby="supplier-list-title">
        <CardHead
          id="supplier-list-title"
          icon={<Icon name="store" />}
          title="연결된 거래처"
          note="거래처를 누르면 거래 품목과 주문 일정을 볼 수 있어요"
          right={<span className="chip">{SUPPLIERS.length}곳</span>}
        />
        <ul className="supplier-rows">
          {rows.map(({ supplier, openCount, latest, next }) => (
            <li key={supplier.id}>
              <button
                type="button"
                className="supplier-row"
                onClick={() => nav.openSupplier(supplier.id)}
              >
                <span
                  className="supplier-avatar supplier-avatar-lg"
                  aria-hidden="true"
                >
                  <Icon name="store" size={22} />
                </span>
                <span className="supplier-row-main">
                  <strong>{supplier.name}</strong>
                  <small>
                    {supplier.category} · {supplier.deliveryDays} 배송 · 거래
                    품목 {supplier.items.length}개
                  </small>
                </span>
                <span className="supplier-row-meta">
                  <small>다음 입고</small>
                  <span className={next ? 'accent-text' : 'muted'}>
                    {next ? next.date : '없음'}
                  </span>
                </span>
                <span className="supplier-row-meta">
                  <small>진행 중</small>
                  <span>{openCount}건</span>
                </span>
                <span className="supplier-row-status">
                  {latest && <StatusPill status={latest.status} />}
                </span>
                <span className="chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export default SupplierList
