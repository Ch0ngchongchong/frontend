import {
  CardHead,
  Pill,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import { EXCEPTIONS } from '../mocks/sample.ts'

// 예외 건 승인 (사장님) 화면 — 디자인 시안 (PRD 5절 / US-06 / F-06)
// 사장 승인 대기 → 승인 → 재고 반영 완료 / 사장 승인 대기 → 반려(사유 필수) → 직원 재검수 또는 검수 종료

function ExceptionApproval() {
  const selected = EXCEPTIONS[0]

  return (
    <>
      <PageHeader title="예외 승인" screen="approval" />

      <StatusSummary
        items={[
          {
            label: '사장 승인 대기',
            value: EXCEPTIONS.length,
            status: '사장 승인 대기',
          },
        ]}
      />
      <div className="layout-split">
        <section className="card" aria-labelledby="exception-list-title">
          <CardHead
            id="exception-list-title"
            icon={<Icon name="list" />}
            title="승인할 건"
            right={<span className="chip">{EXCEPTIONS.length}건</span>}
          />
          <ul className="pick-list">
            {EXCEPTIONS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`pick-item${item.id === selected.id ? ' is-selected' : ''}`}
                  aria-pressed={item.id === selected.id}
                >
                  <span>
                    <strong>{item.supplier}</strong>
                    <small>
                      {item.id} · {item.submittedAt}
                    </small>
                    <span className="kind-row">
                      {item.kinds.map((kind) => (
                        <Pill key={kind} tone="owner" icon="alert">
                          {kind}
                        </Pill>
                      ))}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="exception-detail-title">
          <CardHead
            id="exception-detail-title"
            icon={<Icon name="alert" />}
            title={`${selected.id} · ${selected.supplier}`}
            note={`직원이 ${selected.submittedAt}에 확정했어요. 재고는 아직 바뀌지 않았어요`}
            right={<StatusPill status="사장 승인 대기" />}
          />

          <div className="kind-row">
            {selected.kinds.map((kind) => (
              <Pill key={kind} tone="owner" icon="alert">
                {kind}
              </Pill>
            ))}
          </div>

          <figure className="staff-reason">
            <figcaption>직원이 적은 예외 사유</figcaption>
            <blockquote>{selected.staffReason}</blockquote>
          </figure>

          <div className="photo-row">
            <span className="photo-thumb" aria-label="직원이 붙인 사진 1">
              <Icon name="photo" size={28} />
            </span>
            <span className="photo-thumb" aria-label="직원이 붙인 사진 2">
              <Icon name="photo" size={28} />
            </span>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">품목</th>
                  <th scope="col">발주</th>
                  <th scope="col">들어온 것</th>
                </tr>
              </thead>
              <tbody>
                {selected.rows.map((row) => (
                  <tr
                    key={row.item}
                    className={
                      row.ordered !== row.received ? 'row-differs' : undefined
                    }
                  >
                    <td className="code">{row.item}</td>
                    <td className="muted">{row.ordered}</td>
                    <td>
                      <strong>{row.received}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="card-note">
            승인하면 들어온 수량·단가로 재고에 반영돼요. 모자란 수량은 발주에
            미입고로 남아요
          </p>

          <div className="field">
            <label htmlFor="reject-reason">
              반려 사유 <span className="muted">(반려할 때 필수)</span>
            </label>
            <textarea
              id="reject-reason"
              rows={2}
              placeholder="예: 단가 변경을 공급처에 먼저 확인할게요"
            />
          </div>

          <div className="action-row">
            <button type="button" className="button-primary">
              승인
            </button>
            <button type="button" className="button-secondary button-danger">
              반려
            </button>
          </div>
        </section>
      </div>
    </>
  )
}

export default ExceptionApproval
