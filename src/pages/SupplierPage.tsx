import {
  CardHead,
  Icon,
  PageHeader,
  StatusPill,
  StatusSummary,
} from '../components/ui.tsx'
import { useNav } from '../components/nav.ts'
import { SUPPLIERS } from '../mocks/sample.ts'

// 거래처 페이지 (사장님) — 디자인 시안. PRD 5절 화면 목록에 없는 화면이다 (팀 확인 필요)
// 거래처 탭의 목록이나 시작 화면의 '거래처 N곳과 연결' 목록에서 거래처 이름을 누르면 열린다.
// 거래처 기본 정보 + 이 거래처와 거래하는 품목 + 주문 일정·상태를 보여 준다. 담당자 이름·연락처는 보여 주지 않는다

function won(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

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

function SupplierPage({ supplierId }: { supplierId: string }) {
  const nav = useNav()
  const supplier =
    SUPPLIERS.find((item) => item.id === supplierId) ?? SUPPLIERS[0]
  const open = supplier.schedule.filter((row) =>
    OPEN_STATUSES.includes(row.status),
  )
  const next = supplier.schedule.find((row) => row.status === '입고 대기')

  return (
    <>
      <PageHeader
        title={supplier.name}
        onSelf={() => nav.openSupplier(supplier.id)}
        parents={[{ label: '거래처', screen: 'suppliers' }]}
      />

      <section className="supplier-info card" aria-label="거래처 기본 정보">
        <span className="supplier-badge" aria-hidden="true">
          <Icon name="store" size={28} />
        </span>
        <dl className="info-grid">
          <div>
            <dt>분류</dt>
            <dd>{supplier.category}</dd>
          </div>
          <div>
            <dt>배송 요일</dt>
            <dd>{supplier.deliveryDays}</dd>
          </div>
          <div>
            <dt>주문 마감</dt>
            <dd>{supplier.orderCutoff}</dd>
          </div>
          <div>
            <dt>거래 시작</dt>
            <dd>{supplier.since}</dd>
          </div>
          <div>
            <dt>다음 입고 예정</dt>
            <dd className={next ? 'accent-text' : 'muted'}>
              {next ? next.date : '없음'}
            </dd>
          </div>
        </dl>
      </section>

      <StatusSummary
        items={[
          {
            label: '거래 품목',
            value: supplier.items.length,
            tone: 'done',
            icon: 'box',
          },
          { label: '진행 중', value: open.length, status: '입고 대기' },
        ]}
      />

      <div className="layout-main">
        <section className="card" aria-labelledby="supplier-items-title">
          <CardHead
            id="supplier-items-title"
            icon={<Icon name="box" />}
            title="거래 품목"
            note="이 거래처에서 받는 상품과 기준 단가예요"
            right={<span className="chip">{supplier.items.length}개</span>}
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">상품</th>
                  <th scope="col">규격</th>
                  <th scope="col">단위</th>
                  <th scope="col" className="numeric">
                    기준 단가
                  </th>
                  <th scope="col">최근 발주</th>
                </tr>
              </thead>
              <tbody>
                {supplier.items.map((item) => (
                  <tr key={item.product}>
                    <td className="code">{item.product}</td>
                    <td>{item.spec}</td>
                    <td>{item.unit}</td>
                    <td className="numeric">{won(item.price)}</td>
                    <td className="muted">{item.lastOrdered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" aria-labelledby="supplier-schedule-title">
          <CardHead
            id="supplier-schedule-title"
            icon={<Icon name="clock" />}
            title="주문 일정"
            note="최근 순서예요"
          />
          <ol className="schedule-list">
            {supplier.schedule.map((row) => (
              <li key={row.id + row.status} className="schedule-item">
                <div className="schedule-date">{row.date}</div>
                <div className="schedule-body">
                  <span>
                    <strong>{row.items}</strong>
                    <small>{row.id}</small>
                  </span>
                  <StatusPill status={row.status} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  )
}

export default SupplierPage
