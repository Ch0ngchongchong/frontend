import {
  CardHead,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import { REVIEW_LINES, type ReviewLine } from '../mocks/sample.ts'

// 입고 확인 (직원) 화면 — 디자인 시안 (PRD 5절 / US-03·US-04·US-05 / F-03·F-04·F-05)
// 판독 결과와 발주를 줄 단위로 대조한다. AI가 확신하지 못한 값·규칙 검증 실패·후보 없음/2개 이상·환산 불가는
// 추측값 없이 강조하고, 확인되지 않은 칸이 남아 있으면 확정할 수 없다 (DESIGN.md 'LLM 결과를 사람이 확인하기 전')

function won(value: number | null) {
  return value === null ? '' : `${value.toLocaleString('ko-KR')}원`
}

// 줄 하나에서 직원이 확인해야 할 칸 수
function checksOf(line: ReviewLine) {
  let n = line.uncertain.length
  if (line.ruleFail) n += 1
  if (line.candidates.length !== 1) n += 1
  return n
}

function CheckLabel() {
  return <span className="check-label">확인 필요</span>
}

function InspectionReview() {
  const remaining = REVIEW_LINES.reduce((sum, line) => sum + checksOf(line), 0)
  const differs = REVIEW_LINES.filter((line) => line.differs).length

  return (
    <>
      <PageHeader title="입고 확인" screen="inspection" />

      <p className="banner banner-warning" role="status">
        <Icon name="alert" size={18} />
        AI가 읽은 초안이에요. 확인한 뒤 확정해 주세요
      </p>

      <StatusSummary
        items={[
          {
            label: '확인할 칸',
            value: remaining,
            tone: 'accent',
            icon: 'review',
          },
          {
            label: '발주와 다른 줄',
            value: differs,
            tone: 'danger',
            icon: 'alert',
          },
        ]}
      />
      <div className="layout-review">
        <section className="card" aria-labelledby="review-title">
          <CardHead
            id="review-title"
            icon={<Icon name="scan" />}
            title="명세서와 발주 대조"
            note="(가상) 식자재 공급처 B · 발주 PO-0006 · 08:05 올림"
            right={<StatusPill status="직원 확인 대기" />}
          />
          <div className="table-scroll">
            <table className="data-table review-table">
              <thead>
                <tr>
                  <th scope="col">명세서 품목</th>
                  <th scope="col">우리 상품</th>
                  <th scope="col" className="numeric">
                    발주
                  </th>
                  <th scope="col" className="numeric">
                    명세서
                  </th>
                  <th scope="col">기준 단위 환산</th>
                  <th scope="col" className="numeric">
                    단가
                  </th>
                  <th scope="col" className="numeric">
                    금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {REVIEW_LINES.map((line) => {
                  const pickNeeded = line.candidates.length !== 1
                  const priceUnsure = line.uncertain.includes('unit_price')
                  const unitUnsure = line.uncertain.includes('unit')
                  return (
                    <tr
                      key={line.rawName}
                      className={line.differs ? 'row-differs' : undefined}
                    >
                      <td className="code">{line.rawName}</td>
                      <td className={pickNeeded ? 'cell-check' : undefined}>
                        {line.candidates.length === 0 ? (
                          <>
                            <CheckLabel />
                            <span className="cell-hint">
                              맞는 상품이 없어요 · 고르거나 새로 등록
                            </span>
                          </>
                        ) : (
                          <div className="candidates">
                            {pickNeeded && <CheckLabel />}
                            {line.candidates.map((candidate, index) => (
                              <span
                                key={candidate.name}
                                className={`candidate${!pickNeeded && index === 0 ? ' is-picked' : ''}`}
                                title={candidate.reason}
                              >
                                {candidate.name}
                                <small>{candidate.reason}</small>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="numeric muted">
                        {line.orderedQty === null ? '없음' : line.orderedQty}
                      </td>
                      <td
                        className={`numeric${unitUnsure ? ' cell-check' : ''}`}
                      >
                        {line.quantity}
                        {line.unit ? ` ${line.unit}` : ''}
                        {unitUnsure && <CheckLabel />}
                      </td>
                      <td
                        className={
                          line.conversion === null && !unitUnsure
                            ? 'muted'
                            : undefined
                        }
                      >
                        {line.conversion ?? '같은 단위'}
                      </td>
                      <td
                        className={`numeric${priceUnsure ? ' cell-check' : ''}`}
                      >
                        {priceUnsure ? <CheckLabel /> : won(line.unitPrice)}
                      </td>
                      <td
                        className={`numeric${line.ruleFail ? ' cell-fail' : ''}`}
                      >
                        {won(line.amount)}
                        {line.ruleFail && (
                          <span className="cell-hint">{line.ruleFail}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="legend">
            <span className="legend-item legend-check">확인 필요</span>
            <span className="legend-item legend-fail">규칙 검증 실패</span>
            <span className="legend-item legend-differs">발주와 다른 줄</span>
          </p>
        </section>

        <aside className="card card-form" aria-labelledby="confirm-title">
          <CardHead
            id="confirm-title"
            icon={<Icon name="check" />}
            title="확정하기"
            note="확정하기 전에는 재고가 바뀌지 않아요"
          />
          <div className="remaining">
            <strong>{remaining}</strong>
            <span>확인할 칸이 남았어요</span>
          </div>
          <p className="card-note">
            발주와 다른 줄이 있어 확정하면 <b>사장님 승인</b>으로 넘어가요. 예외
            사유를 적어 주세요
          </p>
          <div className="field">
            <label htmlFor="exception-reason">
              예외 사유 <span className="required">(필수)</span>
            </label>
            <textarea
              id="exception-reason"
              rows={3}
              placeholder="예: 바닐라 시럽이 1병 더 왔어요"
            />
          </div>
          <button type="button" className="button-secondary button-icon">
            <Icon name="photo" size={18} />
            사진 붙이기
          </button>
          <button type="button" className="button-primary" disabled>
            확인할 칸 {remaining}개 남음
          </button>
        </aside>
      </div>
    </>
  )
}

export default InspectionReview
