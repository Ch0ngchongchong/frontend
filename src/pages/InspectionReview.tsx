import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useSWRConfig } from 'swr'
import {
  CardHead,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import { request } from '../api/client'
import {
  useInspection,
  useInspections,
  useInventory,
  type Inspection,
  type InventoryItem,
} from '../api/inspections'
import { useProducts } from '../api/workspace'
import type { Product } from '../api/products'

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : '요청을 처리하지 못했어요. 다시 시도해 주세요.'
}

type LineDraft = { product: string; quantity: string }

function ReviewDetail({
  inspection,
  products,
  catalogAvailable,
}: {
  inspection: Inspection
  products: Product[]
  catalogAvailable: boolean
}) {
  const { mutate } = useSWRConfig()
  const inventory = useInventory()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false })
  const [drafts, setDrafts] = useState<Record<number, LineDraft>>({})
  const [pending, setPending] = useState<number | 'confirm' | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [beforeInventory, setBeforeInventory] = useState<
    InventoryItem[] | null
  >(null)
  const ready = inspection.status === '직원 확인 대기'
  const compared =
    ready ||
    inspection.status === '재고 반영 완료' ||
    inspection.status === '사장 승인 대기'
  const differs = inspection.lines.filter(
    (line) => line.match_status !== '일치' && line.match_status !== '확인 필요',
  ).length
  const productName = (id: number) => {
    const product = products.find((item) => item.id === id)
    return product
      ? `${product.product_code} · ${product.name ?? '이름 없음'}`
      : `상품 #${id}`
  }
  const draftFor = (line: Inspection['lines'][number]) =>
    drafts[line.id] ?? {
      product: line.product_id === null ? '' : String(line.product_id),
      quantity: line.quantity === null ? '' : String(line.quantity),
    }
  const isDirty = (line: Inspection['lines'][number]) => {
    const draft = draftFor(line)
    return (
      draft.product !==
        (line.product_id === null ? '' : String(line.product_id)) ||
      draft.quantity !== (line.quantity === null ? '' : String(line.quantity))
    )
  }
  const hasUnsaved = inspection.lines.some(isDirty)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const update = () =>
      setScrollEdges({
        left: element.scrollLeft > 1,
        right:
          element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      })
    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => {
      element.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])

  async function cacheInspection(updated: Inspection) {
    await mutate(['inspection', '1', updated.id], updated, {
      revalidate: false,
    })
    await mutate<Inspection[]>(
      ['inspections', '1'],
      (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)),
      { revalidate: false },
    )
    void mutate(['inspections', '1'])
  }

  async function saveLine(line: Inspection['lines'][number]) {
    const draft = draftFor(line)
    const quantity =
      draft.quantity.trim() === '' ? null : Number(draft.quantity)
    if (
      quantity !== null &&
      (!Number.isSafeInteger(quantity) || quantity < 1)
    ) {
      setError('수량은 1 이상의 정수로 입력하거나 비워 주세요.')
      return
    }
    setPending(line.id)
    setError('')
    setResult('')
    try {
      const updated = await request<Inspection>(
        `/inspections/${inspection.id}/lines/${line.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            product_id: draft.product === '' ? null : Number(draft.product),
            quantity,
          }),
        },
      )
      await cacheInspection(updated)
      setDrafts((current) => {
        const next = { ...current }
        delete next[line.id]
        return next
      })
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setPending(null)
    }
  }

  async function confirm() {
    if (
      !ready ||
      inspection.check_count !== 0 ||
      hasUnsaved ||
      pending !== null
    )
      return
    setPending('confirm')
    setError('')
    setResult('')
    const before = inventory.data ?? null
    try {
      const updated = await request<Inspection>(
        `/inspections/${inspection.id}/confirm`,
        { method: 'POST' },
      )
      await cacheInspection(updated)
      setBeforeInventory(before)
      setResult(
        updated.status === '재고 반영 완료'
          ? '재고 반영이 완료되었어요. 연결된 발주도 입고 완료로 바뀌었어요.'
          : updated.status === '사장 승인 대기'
            ? '사장님 승인 대기로 넘어갔어요. 재고는 바뀌지 않았어요.'
            : `확정 결과: ${updated.status}`,
      )
      void mutate(['purchase-orders', '1'])
      void mutate(['purchase-order', '1', updated.purchase_order_id])
      void inventory.mutate()
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      {inspection.ai_draft && (
        <p className="banner" role="status">
          AI가 읽은 초안이에요. 확인한 뒤 확정해 주세요.
        </p>
      )}
      {inspection.document?.read_error && (
        <p className="field-error" role="alert">
          {inspection.document.read_error}{' '}
          <a href={`/upload?id=${inspection.id}`}>명세서 다시 올리기</a>
        </p>
      )}
      {inspection.status === '판독 중' && (
        <p role="status">
          명세서를 판독하고 있어요. 완료되면 자동으로 결과를 보여 드려요.
        </p>
      )}
      {inspection.status === '업로드 대기' &&
        !inspection.document?.read_error && (
          <p className="card-note">
            아직 명세서가 없어요.{' '}
            <a href={`/upload?id=${inspection.id}`}>명세서 올리기</a>
          </p>
        )}
      {compared && (
        <StatusSummary
          items={[
            {
              label: '확인할 칸',
              value: inspection.check_count,
              tone: 'accent',
              icon: 'review',
            },
            {
              label: '발주와 다른 줄',
              value: differs + inspection.missing_order_lines.length,
              tone: 'danger',
              icon: 'alert',
            },
          ]}
        />
      )}
      <div className="layout-review">
        <section className="card" aria-labelledby="review-title">
          <CardHead
            id="review-title"
            icon={<Icon name="scan" />}
            title="명세서와 발주 대조"
            note={`검수 #${inspection.id} · 발주 #${inspection.purchase_order_id}${inspection.document ? ` · ${inspection.document.filename}` : ''}`}
            right={<StatusPill status={inspection.status} />}
          />
          <div
            className={`review-scroll-wrap${scrollEdges.left ? ' fade-left' : ''}${scrollEdges.right ? ' fade-right' : ''}`}
          >
            <div className="table-scroll" ref={scrollRef}>
              <table className="data-table review-table">
                <thead>
                  <tr>
                    <th scope="col">명세서 원본 값 (OCR)</th>
                    <th scope="col">우리 상품 · 후보</th>
                    <th scope="col" className="numeric">
                      발주
                    </th>
                    <th scope="col">확인 수량</th>
                    <th scope="col">기준 단위 환산</th>
                    <th scope="col">대조 결과 · 저장</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.lines.map((line) => {
                    const draft = draftFor(line)
                    return (
                      <tr
                        key={line.id}
                        className={
                          line.match_status !== '일치'
                            ? 'row-differs'
                            : undefined
                        }
                      >
                        <td>
                          <strong>
                            {line.line_no}. {line.read.name}
                          </strong>
                          <div>
                            {line.read.quantity ?? '—'}{' '}
                            {line.read.unit ?? '단위 없음'}
                          </div>
                          <div>
                            단가{' '}
                            {line.read.unit_price === null
                              ? '—'
                              : `${line.read.unit_price.toLocaleString('ko-KR')}원`}{' '}
                            · 금액{' '}
                            {line.read.amount === null
                              ? '—'
                              : `${line.read.amount.toLocaleString('ko-KR')}원`}
                          </div>
                          <small className="muted">
                            읽은 값은 수정되지 않아요
                          </small>
                        </td>
                        <td
                          className={
                            line.product_id === null ? 'cell-check' : undefined
                          }
                        >
                          <select
                            aria-label={`${line.line_no}행 상품`}
                            value={draft.product}
                            disabled={
                              !ready || pending !== null || !catalogAvailable
                            }
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [line.id]: {
                                  ...draft,
                                  product: event.target.value,
                                },
                              }))
                            }
                          >
                            <option value="">상품 선택 안 함</option>
                            {draft.product &&
                              !products.some(
                                (product) =>
                                  String(product.id) === draft.product,
                              ) && (
                                <option value={draft.product}>
                                  상품 #{draft.product}
                                </option>
                              )}
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.product_code} ·{' '}
                                {product.name ?? '이름 없음'}
                                {product.spec ? ` · ${product.spec}` : ''}
                              </option>
                            ))}
                          </select>
                          <div className="candidates">
                            {line.candidates.length === 0 && (
                              <small className="cell-hint">
                                후보가 없어요. 전체 상품에서 골라 주세요.
                              </small>
                            )}
                            {line.candidates.map((candidate) => (
                              <span
                                key={candidate.product_id}
                                className={`candidate${line.product_id === candidate.product_id ? ' is-picked' : ''}`}
                              >
                                {productName(candidate.product_id)} ·{' '}
                                {Math.round(candidate.score * 100)}%
                                <small>{candidate.reason}</small>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="numeric muted">
                          {line.order_quantity ?? '없음'}
                        </td>
                        <td
                          className={
                            line.quantity === null ? 'cell-check' : undefined
                          }
                        >
                          <input
                            type="number"
                            min="1"
                            step="1"
                            aria-label={`${line.line_no}행 수량`}
                            value={draft.quantity}
                            disabled={!ready || pending !== null}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [line.id]: {
                                  ...draft,
                                  quantity: event.target.value,
                                },
                              }))
                            }
                          />
                          <small>
                            {line.unit ?? '단위 없음'} · 비우면 미확인
                          </small>
                        </td>
                        <td className="conversion-cell">
                          {line.base_quantity === null
                            ? '환산값 없음'
                            : `${line.base_quantity} ${products.find((product) => product.id === line.product_id)?.base_unit ?? '기준 단위'}`}
                        </td>
                        <td>
                          <span>{line.match_status}</span>
                          {ready && (
                            <button
                              type="button"
                              className="button-secondary"
                              disabled={pending !== null || !isDirty(line)}
                              onClick={() => void saveLine(line)}
                            >
                              {pending === line.id ? '저장 중…' : '이 줄 저장'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {inspection.lines.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        {inspection.status === '판독 중'
                          ? '판독 결과를 기다리고 있어요.'
                          : '판독된 줄이 없어요.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="legend">
            <span className="legend-item legend-check">확인 필요</span>
            <span className="legend-item legend-differs">발주와 다른 줄</span>
          </p>
          {compared && inspection.missing_order_lines.length > 0 && (
            <div className="card-note">
              <strong>발주에는 있지만 명세서에는 없는 상품</strong>
              <ul>
                {inspection.missing_order_lines.map((line) => (
                  <li key={line.product_id}>
                    {productName(line.product_id)} · 발주 {line.order_quantity}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <aside className="card card-form" aria-labelledby="confirm-title">
          <CardHead
            id="confirm-title"
            icon={<Icon name="check" />}
            title="확정하기"
            note="확정하기 전에는 재고가 바뀌지 않아요"
          />
          {compared && (
            <>
              <div className="remaining">
                <strong>{inspection.check_count}</strong>
                <span>확인할 칸이 남았어요</span>
              </div>
              <p className="card-note">
                {inspection.all_match
                  ? '발주와 모두 일치해요. 확정하면 재고에 반영돼요.'
                  : '발주와 다른 내용이 있어요. 확정하면 사장님 승인 대기로 넘어가고 재고는 유지돼요.'}
              </p>
            </>
          )}
          {hasUnsaved && (
            <p className="card-note">변경한 줄을 먼저 저장해 주세요.</p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {result && <p role="status">{result}</p>}
          <button
            type="button"
            className="button-primary"
            disabled={
              !ready ||
              inspection.check_count !== 0 ||
              hasUnsaved ||
              pending !== null
            }
            onClick={() => void confirm()}
          >
            {pending === 'confirm'
              ? '확정 중…'
              : !ready
                ? inspection.status
                : inspection.check_count > 0
                  ? `확인할 칸 ${inspection.check_count}개 남음`
                  : '확인 후 확정'}
          </button>
        </aside>
      </div>
      <section className="card" aria-labelledby="inventory-title">
        <CardHead
          id="inventory-title"
          icon={<Icon name="box" />}
          title="현재 재고"
          note="기준 단위 수량 · 모두 일치하는 검수 건을 확정할 때만 반영돼요"
          right={
            <button
              type="button"
              className="button-secondary"
              onClick={() => void inventory.mutate()}
            >
              재고 새로고침
            </button>
          }
        />
        {inventory.error && (
          <p className="field-error" role="alert">
            재고를 불러오지 못했어요: {errorMessage(inventory.error)}
          </p>
        )}
        {!inventory.data && !inventory.error && (
          <p role="status">재고를 불러오고 있어요.</p>
        )}
        {inventory.data && (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">상품 코드</th>
                  <th scope="col">상품명</th>
                  {beforeInventory && (
                    <th scope="col" className="numeric">
                      확정 전
                    </th>
                  )}
                  <th scope="col" className="numeric">
                    현재 재고
                  </th>
                  <th scope="col">단위</th>
                </tr>
              </thead>
              <tbody>
                {inventory.data.map((item) => (
                  <tr key={item.product_id}>
                    <td className="code">{item.product_code}</td>
                    <td>{item.name ?? '이름 없음'}</td>
                    {beforeInventory && (
                      <td className="numeric">
                        {beforeInventory.find(
                          (before) => before.product_id === item.product_id,
                        )?.quantity ?? '—'}
                      </td>
                    )}
                    <td className="numeric">{item.quantity}</td>
                    <td>{item.base_unit ?? '—'}</td>
                  </tr>
                ))}
                {inventory.data.length === 0 && (
                  <tr>
                    <td colSpan={beforeInventory ? 5 : 4}>
                      등록된 상품 재고가 없어요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function InspectionReview() {
  const router = useRouter()
  const inspections = useInspections()
  const products = useProducts()
  const rawId = Array.isArray(router.query.id)
    ? router.query.id[0]
    : router.query.id
  const parsedId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : null
  const invalidId =
    rawId !== undefined &&
    (parsedId === null || !Number.isSafeInteger(parsedId) || parsedId < 1)
  const fallback =
    inspections.data?.find((item) => item.status === '직원 확인 대기') ??
    inspections.data?.[0]
  const selectedId =
    !router.isReady || invalidId ? null : (parsedId ?? fallback?.id ?? null)
  const detail = useInspection(selectedId)

  useEffect(() => {
    if (router.isReady && rawId === undefined && selectedId !== null) {
      void router.replace(
        { pathname: '/inspection', query: { id: selectedId } },
        undefined,
        { shallow: true },
      )
    }
  }, [router, rawId, selectedId])

  return (
    <div className="inspection-page">
      <PageHeader title="입고 확인" screen="inspection" />
      <div className="field">
        <label htmlFor="inspection-selector">검수 건 선택</label>
        <select
          id="inspection-selector"
          value={selectedId ?? ''}
          disabled={!inspections.data}
          onChange={(event) => {
            if (event.target.value)
              void router.push({
                pathname: '/inspection',
                query: { id: event.target.value },
              })
          }}
        >
          <option value="" disabled>
            검수 건을 선택해 주세요
          </option>
          {selectedId !== null &&
            !inspections.data?.some((item) => item.id === selectedId) && (
              <option value={selectedId}>검수 #{selectedId}</option>
            )}
          {inspections.data?.map((item) => (
            <option key={item.id} value={item.id}>
              검수 #{item.id} · 발주 #{item.purchase_order_id} · {item.status}
            </option>
          ))}
        </select>
      </div>
      {inspections.error && (
        <p className="field-error" role="alert">
          검수 목록을 불러오지 못했어요: {errorMessage(inspections.error)}{' '}
          <button type="button" onClick={() => void inspections.mutate()}>
            다시 시도
          </button>
        </p>
      )}
      {products.error && (
        <p className="field-error" role="alert">
          상품 목록을 불러오지 못했어요: {errorMessage(products.error)}{' '}
          <button type="button" onClick={() => void products.mutate()}>
            다시 시도
          </button>
        </p>
      )}
      {invalidId && (
        <p className="field-error" role="alert">
          올바른 검수 건 ID가 아니에요. 목록에서 선택해 주세요.
        </p>
      )}
      {!inspections.data && !inspections.error && (
        <p role="status">검수 목록을 불러오고 있어요.</p>
      )}
      {inspections.data?.length === 0 &&
        !inspections.error &&
        selectedId === null && (
          <p className="card-note">
            검수 건이 없어요. 발주를 도착 처리하면 검수 건이 생겨요.
          </p>
        )}
      {detail.error && (
        <p className="field-error" role="alert">
          검수 결과를 불러오지 못했어요: {errorMessage(detail.error)}{' '}
          <button type="button" onClick={() => void detail.mutate()}>
            다시 시도
          </button>
        </p>
      )}
      {selectedId !== null && !detail.data && !detail.error && (
        <p role="status">검수 결과를 불러오고 있어요.</p>
      )}
      {detail.data && (
        <ReviewDetail
          key={detail.data.id}
          inspection={detail.data}
          products={products.data ?? []}
          catalogAvailable={products.data !== undefined}
        />
      )}
    </div>
  )
}

export default InspectionReview
