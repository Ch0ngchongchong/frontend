import { useState } from 'react'
import { useSWRConfig } from 'swr'
import {
  CardHead,
  Pill,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import {
  approveInspection,
  rejectInspection,
  useExceptionInspections,
  useExceptionPhotos,
  type Inspection,
} from '../api/inspections'
import { useProducts } from '../api/workspace'
import type { Product } from '../api/products'
import { ExceptionPhotoList } from '../components/InspectionPhotos.tsx'
import {
  AMOUNT_OVER_LIMIT_LABEL,
  AmountOverLimitNotice,
} from '../components/AmountLimit.tsx'
import { userKey } from '../session'

// 예외 건 승인 (사장님) 화면 (PRD 5절 / US-06 / F-06)
// 사장 승인 대기 → 승인 → 재고 반영 완료 / 사장 승인 대기 → 반려(사유 필수) → 직원 재검수 또는 검수 종료

// 줄 단위 match_status를 화면에 보여 줄 예외 종류로 바꾼다 (API.md에 "예외 종류" 필드가
// 따로 없어, 이미 받은 match_status·missing_order_lines에서 도출한다)
const KIND_LABELS: Record<string, string> = {
  '수량 다름': '수량 차이',
  '단가 다름': '단가 변경',
  '발주에 없음': '발주에 없는 품목',
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : '요청을 처리하지 못했어요. 다시 시도해 주세요.'
}

function kindsOf(inspection: Inspection) {
  const kinds = new Set<string>()
  for (const line of inspection.lines) {
    const label = KIND_LABELS[line.match_status]
    if (label) kinds.add(label)
  }
  if (inspection.missing_order_lines.length > 0) kinds.add('미입고')
  // 줄 단위가 아니라 검수 건 전체의 최종 금액으로 정해지는 예외 (R7)
  if (inspection.amount_over_limit) kinds.add(AMOUNT_OVER_LIMIT_LABEL)
  return [...kinds]
}

// 직원이 입고 확인에서 이 건에 올린 예외 사진
function AttachedPhotos({ inspectionId }: { inspectionId: number }) {
  const { data, error } = useExceptionPhotos(inspectionId)
  return (
    <section className="exception-photos" aria-labelledby="attachments-title">
      <h3 id="attachments-title" className="card-note">
        직원이 올린 예외 사진{data ? ` ${data.length}장` : ''}
      </h3>
      {error && (
        <p className="field-error" role="alert">
          사진 목록을 불러오지 못했어요: {errorMessage(error)}
        </p>
      )}
      {!data && !error && <p role="status">사진을 불러오고 있어요.</p>}
      {data?.length === 0 && <p className="muted">올린 사진이 없어요</p>}
      {data && data.length > 0 && (
        <ExceptionPhotoList inspectionId={inspectionId} photos={data} />
      )}
    </section>
  )
}

function ExceptionApproval() {
  const { mutate } = useSWRConfig()
  const { data, error: listError } = useExceptionInspections()
  const { data: productData } = useProducts()
  const products: Product[] = productData ?? []
  const exceptions = data ?? []
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null)
  const [actionError, setActionError] = useState('')

  // selectedId가 없거나 방금 승인·반려·확정 취소돼 목록에서 빠졌으면 첫 건으로 돌아간다
  const selected =
    exceptions.find((item) => item.id === selectedId) ?? exceptions[0] ?? null

  function productName(id: number | null) {
    if (id === null) return '미등록 품목'
    const product = products.find((item) => item.id === id)
    return product
      ? `${product.product_code} · ${product.name ?? '이름 없음'}`
      : `상품 #${id}`
  }

  async function removeFromList(updated: Inspection) {
    await mutate<Inspection[]>(
      ['inspections', userKey(), '사장 승인 대기'],
      (current) => current?.filter((item) => item.id !== updated.id),
      { revalidate: false },
    )
    void mutate(['inspections', userKey(), '사장 승인 대기'])
    void mutate(['inspections', userKey()])
    void mutate(['inspection-history', userKey(), updated.id])
  }

  async function approve() {
    if (!selected || pending !== null) return
    setPending('approve')
    setActionError('')
    try {
      const updated = await approveInspection(selected.id)
      await removeFromList(updated)
      setRejectReason('')
    } catch (failure) {
      setActionError(errorMessage(failure))
    } finally {
      setPending(null)
    }
  }

  async function reject() {
    if (!selected || pending !== null) return
    if (!rejectReason.trim()) {
      setActionError('반려 사유를 입력해 주세요')
      return
    }
    setPending('reject')
    setActionError('')
    try {
      const updated = await rejectInspection(selected.id, rejectReason.trim())
      await removeFromList(updated)
      setRejectReason('')
    } catch (failure) {
      setActionError(errorMessage(failure))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="approval-page">
      <PageHeader title="예외 승인" screen="approval" />

      {listError && (
        <p className="field-error" role="alert">
          {errorMessage(listError)}
        </p>
      )}

      {!listError && exceptions.length === 0 && (
        <div className="empty-state">
          <p>승인을 기다리는 예외 건이 없어요</p>
        </div>
      )}

      {selected && (
        <div className="layout-split">
          <section className="card" aria-labelledby="exception-list-title">
            <CardHead
              id="exception-list-title"
              icon={<Icon name="list" />}
              title="승인할 건"
              right={<span className="chip">{exceptions.length}건</span>}
            />
            <ul className="pick-list">
              {exceptions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`pick-item${item.id === selected.id ? ' is-selected' : ''}`}
                    aria-pressed={item.id === selected.id}
                    onClick={() => {
                      setSelectedId(item.id)
                      setRejectReason('')
                      setActionError('')
                    }}
                  >
                    <span>
                      <strong>발주 #{item.purchase_order_id}</strong>
                      <small>검수 #{item.id}</small>
                      <span className="kind-row">
                        {kindsOf(item).map((kind) => (
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
              title={`검수 #${selected.id} · 발주 #${selected.purchase_order_id}`}
              note="직원이 확정했어요. 재고는 아직 바뀌지 않았어요"
              right={<StatusPill status="사장 승인 대기" />}
            />

            <div className="kind-row">
              {kindsOf(selected).map((kind) => (
                <Pill key={kind} tone="owner" icon="alert">
                  {kind}
                </Pill>
              ))}
            </div>

            <AmountOverLimitNotice inspection={selected} />

            <figure className="staff-reason">
              <figcaption>직원이 적은 예외 사유</figcaption>
              <blockquote>
                {selected.exception_reason ?? '(적힌 사유가 없어요)'}
              </blockquote>
            </figure>

            <AttachedPhotos key={selected.id} inspectionId={selected.id} />

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
                  {selected.lines.map((line) => (
                    <tr
                      key={line.id}
                      className={
                        line.match_status !== '일치' ? 'row-differs' : undefined
                      }
                    >
                      <td className="code">{productName(line.product_id)}</td>
                      <td className="muted">
                        {line.order_quantity ?? '발주에 없음'}
                      </td>
                      <td>
                        <strong>{line.quantity ?? '-'}</strong>
                        {line.read.unit_price !== null && (
                          <>
                            {' '}
                            · {line.read.unit_price.toLocaleString('ko-KR')}원
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {selected.missing_order_lines.map((missing) => (
                    <tr
                      key={`missing-${missing.product_id}`}
                      className="row-differs"
                    >
                      <td className="code">
                        {productName(missing.product_id)}
                      </td>
                      <td className="muted">{missing.order_quantity}</td>
                      <td>미입고</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="card-note">
              승인하면 들어온 수량·단가로 재고에 반영돼요. 모자란 수량은 발주에
              미입고로 남아요
            </p>

            {actionError && (
              <p className="field-error" role="alert">
                {actionError}
              </p>
            )}

            <div className="field">
              <label htmlFor="reject-reason">
                반려 사유 <span className="muted">(반려할 때 필수)</span>
              </label>
              <textarea
                key={selected.id}
                id="reject-reason"
                rows={2}
                placeholder="예: 단가 변경을 공급처에 먼저 확인할게요"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
            </div>

            <div className="action-row">
              <button
                type="button"
                className="button-primary"
                onClick={approve}
                disabled={pending !== null}
              >
                {pending === 'approve' ? '승인 중…' : '승인'}
              </button>
              <button
                type="button"
                className="button-secondary button-danger"
                onClick={reject}
                disabled={pending !== null}
              >
                {pending === 'reject' ? '반려 중…' : '반려'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default ExceptionApproval
