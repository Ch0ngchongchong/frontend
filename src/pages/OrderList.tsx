import {
  CardHead,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import { ORDERS } from '../mocks/sample.ts'

// 발주 작성·관리 (사장님) 화면 — 디자인 시안 (PRD 5절 / US-01·US-02 / F-02)
// 발주 건 상태: 발주 초안 / 발주 확인 완료 / 공급처 전달 완료 / 입고 대기 / 입고 완료 / 발주 취소

// 상태별로 사장님이 다음에 할 수 있는 일 (US-01·US-02). 취소는 '발주 초안'에서만
const NEXT_ACTION: Record<string, string | undefined> = {
  '발주 초안': '승인',
  '발주 확인 완료': '전달 완료 표시',
}

function OrderList() {
  const count = (status: string) =>
    ORDERS.filter((order) => order.status === status).length

  return (
    <>
      <PageHeader title="발주" screen="orders" />

      <StatusSummary
        items={[
          {
            label: '발주 초안',
            value: count('발주 초안'),
            status: '발주 초안',
          },
          {
            label: '입고 대기',
            value: count('입고 대기'),
            status: '입고 대기',
          },
        ]}
      />
      <div className="layout-main">
        <section className="card" aria-labelledby="orders-title">
          <CardHead
            id="orders-title"
            icon={<Icon name="list" />}
            title="발주 목록"
            note="공급처에 보내기 전(발주 초안)에만 취소할 수 있어요"
            right={<span className="chip">{ORDERS.length}건</span>}
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">발주 번호</th>
                  <th scope="col">공급처</th>
                  <th scope="col">품목</th>
                  <th scope="col">상태</th>
                  <th scope="col">
                    <span className="visually-hidden">할 일</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ORDERS.map((order) => {
                  const next = NEXT_ACTION[order.status]
                  return (
                    <tr key={order.id}>
                      <td>
                        <span className="code-cell">{order.id}</span>
                        <small className="sub-text">{order.createdAt}</small>
                      </td>
                      <td className="wrap">{order.supplier}</td>
                      <td className="wrap">
                        {order.lines[0].product}
                        {order.lines.length > 1 &&
                          ` 외 ${order.lines.length - 1}개`}
                      </td>
                      <td>
                        <StatusPill status={order.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          {next && (
                            <button type="button" className="button-small">
                              {next}
                            </button>
                          )}
                          {order.status === '발주 초안' && (
                            <button
                              type="button"
                              className="button-small button-danger-text"
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card card-form" aria-labelledby="new-order-title">
          <CardHead
            id="new-order-title"
            icon={<Icon name="plus" />}
            title="발주 작성"
            note="저장하면 발주 초안이 돼요. 재고는 바뀌지 않아요"
          />
          <div className="field">
            <label htmlFor="order-supplier">공급처</label>
            <input id="order-supplier" defaultValue="(가상) 유제품 공급처 A" />
          </div>

          <div className="order-lines">
            <p className="field-label">상품과 수량</p>
            <div className="order-line">
              <input aria-label="상품" defaultValue="서울우유 1000ml" />
              <input
                aria-label="수량"
                className="input-qty input-warning"
                type="number"
                defaultValue={30}
              />
              <span className="unit">개</span>
            </div>
            <p className="field-warning">
              <Icon name="alert" size={16} />이 상품의 수량 한도를 넘었어요.
              다시 확인해 주세요
            </p>
            <div className="order-line">
              <input aria-label="상품" placeholder="상품 고르기" />
              <input
                aria-label="수량"
                className="input-qty"
                type="number"
                placeholder="0"
              />
              <span className="unit">—</span>
            </div>
            <button type="button" className="button-text">
              + 상품 추가
            </button>
          </div>

          <button type="button" className="button-primary">
            저장
          </button>
        </section>
      </div>
    </>
  )
}

export default OrderList
