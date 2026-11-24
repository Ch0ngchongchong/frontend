import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSWRConfig } from 'swr'
import {
  CardHead,
  StatusSummary,
  Icon,
  PageHeader,
  Pill,
  StatusPill,
} from '../components/ui.tsx'
import { request } from '../api/client'
import {
  addInspectionLine,
  cancelConfirmation,
  confirmInspection,
  EXCEPTION_PHOTO_MAX_BYTES,
  EXCEPTION_PHOTO_TYPES,
  reinspect,
  uploadExceptionPhoto,
  useExceptionPhotos,
  useInspection,
  useInspections,
  useInventory,
  type Inspection,
  type InspectionLineInput,
  type InventoryItem,
} from '../api/inspections'
import { useProducts } from '../api/workspace'
import type { Product } from '../api/products'
import { checkLine, countFlagged, type ReadField } from '../inspectionChecks'
import { ExceptionPhotoList } from '../components/InspectionPhotos.tsx'
import {
  AMOUNT_OVER_LIMIT_LABEL,
  AmountOverLimitNotice,
} from '../components/AmountLimit.tsx'
import { userKey } from '../session'
import { useWorkspace } from '../App'

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : '요청을 처리하지 못했어요. 다시 시도해 주세요.'
}

type LineDraft = { product: string; quantity: string }

// 불확실한 읽은 값 하나를 칸 안에서 짚어 준다. 이유는 칸 아래 "확인 필요" 줄에 글자로 적는다.
function ReadValue({
  flagged,
  children,
}: {
  flagged: boolean
  children: ReactNode
}) {
  return flagged ? <mark className="value-check">{children}</mark> : children
}

// 판독 결과에 없는 줄을 직원이 명세서를 보고 추가한다 (US-04 줄 누락).
// 열 때마다 새로 마운트되어 입력값이 비워진다.
function AddLineForm({
  products,
  catalogAvailable,
  busy,
  onAdd,
  onClose,
}: {
  products: Product[]
  catalogAvailable: boolean
  busy: boolean
  onAdd: (input: InspectionLineInput) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsedQuantity = quantity.trim() === '' ? null : Number(quantity)
    const parsedPrice = unitPrice.trim() === '' ? null : Number(unitPrice)
    if (!name.trim()) {
      setError('명세서에 적힌 품목명을 입력해 주세요.')
      return
    }
    if (
      parsedQuantity !== null &&
      (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1)
    ) {
      setError('수량은 1 이상의 정수로 입력하거나 비워 주세요.')
      return
    }
    if (
      parsedPrice !== null &&
      (!Number.isSafeInteger(parsedPrice) || parsedPrice < 0)
    ) {
      setError('단가는 0 이상의 정수(원)로 입력하거나 비워 주세요.')
      return
    }
    setError('')
    try {
      await onAdd({
        name: name.trim(),
        product_id: product === '' ? null : Number(product),
        quantity: parsedQuantity,
        unit: unit.trim() || null,
        unit_price: parsedPrice,
      })
      onClose()
    } catch (failure) {
      setError(`줄을 추가하지 못했어요. ${errorMessage(failure)}`)
    }
  }

  return (
    <form
      className="product-form line-add-form"
      aria-labelledby="line-add-title"
      onSubmit={submit}
    >
      <div>
        <h3 id="line-add-title">판독에 없는 줄 추가</h3>
        <p className="card-note">
          명세서에 적힌 그대로 입력해 주세요. 추가한 줄은 변경 이력에 직원이
          추가한 줄로 남아요.
        </p>
      </div>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="line-add-name">
            명세서 품목명 <span className="required">필수</span>
          </label>
          <input
            id="line-add-name"
            required
            autoFocus
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="line-add-product">우리 상품</label>
          <select
            id="line-add-product"
            value={product}
            disabled={busy || !catalogAvailable}
            onChange={(event) => setProduct(event.target.value)}
          >
            <option value="">상품 선택 안 함</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product_code} · {item.name ?? '이름 없음'}
                {item.spec ? ` · ${item.spec}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="line-add-quantity">수량</label>
          <input
            id="line-add-quantity"
            type="number"
            inputMode="numeric"
            enterKeyHint="next"
            min="1"
            step="1"
            value={quantity}
            disabled={busy}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="line-add-unit">단위</label>
          <input
            id="line-add-unit"
            placeholder="예: 박스"
            value={unit}
            disabled={busy}
            onChange={(event) => setUnit(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="line-add-price">단가 (원)</label>
          <input
            id="line-add-price"
            type="number"
            inputMode="numeric"
            enterKeyHint="done"
            min="0"
            step="1"
            value={unitPrice}
            disabled={busy}
            onChange={(event) => setUnitPrice(event.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="row-actions">
        <button
          type="button"
          className="button-secondary"
          disabled={busy}
          onClick={onClose}
        >
          취소
        </button>
        <button type="submit" className="button-primary" disabled={busy}>
          {busy ? '추가 중…' : '줄 추가'}
        </button>
      </div>
    </form>
  )
}

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
  // 확정 취소·재검수는 서버가 직원 계정만 허용하고, 승인·반려·종료는 사장님이 예외 승인에서 한다.
  const staff = useWorkspace().session?.role === '직원'
  const inventory = useInventory()
  const photos = useExceptionPhotos(inspection.id)
  const scrollRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false })
  const [drafts, setDrafts] = useState<Record<number, LineDraft>>({})
  const [pending, setPending] = useState<
    number | 'confirm' | 'add' | 'cancel' | 'reinspect' | 'photo' | null
  >(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  // 확정을 취소했거나 반려돼 다시 확정할 때는 지난번 사유에서 이어 쓴다.
  const [reason, setReason] = useState(inspection.exception_reason ?? '')
  const [photoMessage, setPhotoMessage] = useState<{
    text: string
    error: boolean
  } | null>(null)
  const [beforeInventory, setBeforeInventory] = useState<
    InventoryItem[] | null
  >(null)
  const ready = inspection.status === '직원 확인 대기'
  const awaitingOwner = inspection.status === '사장 승인 대기'
  const rejected = inspection.status === '반려'
  const compared =
    ready || awaitingOwner || rejected || inspection.status === '재고 반영 완료'
  // 발주와 다른 건은 서버가 예외 사유 없이는 확정하지 않는다.
  const needsReason = ready && !inspection.all_match
  const photoCount = photos.data?.length ?? 0
  const showPhotos = (compared && !inspection.all_match) || photoCount > 0
  const differs = inspection.lines.filter(
    (line) => line.match_status !== '일치' && line.match_status !== '확인 필요',
  ).length
  // 줄은 발주와 모두 같은데 최종 금액만 금액 한도를 넘어 예외 건이 되는 경우 (R7)
  const amountOnly =
    inspection.amount_over_limit === true &&
    differs === 0 &&
    inspection.missing_order_lines.length === 0
  const lineChecks = inspection.lines.map(checkLine)
  const flagged = countFlagged(lineChecks)
  const flaggedTotal = flagged.uncertain + flagged.ruleFail
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
  // 추가하던 줄도 저장 전 변경으로 보고 확정을 막는다.
  const hasUnsaved = inspection.lines.some(isDirty) || adding

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
    await mutate(['inspection', userKey(), updated.id], updated, {
      revalidate: false,
    })
    await mutate<Inspection[]>(
      ['inspections', userKey()],
      (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)),
      { revalidate: false },
    )
    void mutate(['inspections', userKey()])
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

  // 실패는 폼 안에 보여 주도록 그대로 던진다.
  async function addLine(input: InspectionLineInput) {
    setPending('add')
    setError('')
    setResult('')
    try {
      await cacheInspection(await addInspectionLine(inspection.id, input))
    } finally {
      setPending(null)
    }
  }

  // 확정·확정 취소·재검수는 사장님 승인 목록과 변경 이력도 바꾼다.
  function refreshOwnerViews() {
    void mutate(['inspections', userKey(), '사장 승인 대기'])
    void mutate(['inspection-history', userKey(), inspection.id])
  }

  async function confirm() {
    if (
      !ready ||
      inspection.check_count !== 0 ||
      hasUnsaved ||
      pending !== null ||
      (needsReason && !reason.trim())
    )
      return
    setPending('confirm')
    setError('')
    setResult('')
    const before = inventory.data ?? null
    try {
      const updated = await confirmInspection(
        inspection.id,
        needsReason ? reason.trim() : null,
      )
      await cacheInspection(updated)
      refreshOwnerViews()
      setBeforeInventory(before)
      setResult(
        updated.status === '재고 반영 완료'
          ? '재고 반영이 완료되었어요. 연결된 발주도 입고 완료로 바뀌었어요.'
          : updated.status === '사장 승인 대기'
            ? '사장님 승인 대기로 넘어갔어요. 재고는 바뀌지 않았어요.'
            : `확정 결과: ${updated.status}`,
      )
      void mutate(['purchase-orders', userKey()])
      void mutate(['purchase-order', userKey(), updated.purchase_order_id])
      void inventory.mutate()
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setPending(null)
    }
  }

  // 직원 동작: 사장님이 처리하기 전 확정 취소, 반려 건 재검수 시작. 둘 다 `직원 확인 대기`로 돌아간다.
  async function staffAction(action: 'cancel' | 'reinspect') {
    if (pending !== null) return
    if (action === 'cancel' ? !awaitingOwner : !rejected) return
    setPending(action)
    setError('')
    setResult('')
    try {
      const updated =
        action === 'cancel'
          ? await cancelConfirmation(inspection.id)
          : await reinspect(inspection.id)
      await cacheInspection(updated)
      refreshOwnerViews()
      setBeforeInventory(null)
      setResult(
        action === 'cancel'
          ? '확정을 취소했어요. 직원 확인 대기로 돌아왔어요. 고친 뒤 다시 확정해 주세요.'
          : '재검수를 시작했어요. 반려 사유를 확인하고 고친 뒤 다시 확정해 주세요.',
      )
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setPending(null)
    }
  }

  async function uploadPhotos(files: File[]) {
    if (!ready || pending !== null || files.length === 0) return
    const prepared: File[] = []
    for (const file of files) {
      const contentType =
        file.type ||
        EXCEPTION_PHOTO_TYPES[file.name.split('.').pop()?.toLowerCase() ?? '']
      if (!Object.values(EXCEPTION_PHOTO_TYPES).includes(contentType)) {
        setPhotoMessage({
          text: `${file.name}: JPG, PNG, HEIC 사진만 올릴 수 있어요.`,
          error: true,
        })
        return
      }
      if (file.size === 0 || file.size > EXCEPTION_PHOTO_MAX_BYTES) {
        setPhotoMessage({
          text: `${file.name}: 10MB 이하의 사진만 올릴 수 있어요.`,
          error: true,
        })
        return
      }
      prepared.push(
        file.type ? file : new File([file], file.name, { type: contentType }),
      )
    }
    setPending('photo')
    setPhotoMessage({ text: '사진을 올리고 있어요.', error: false })
    let uploaded = 0
    try {
      for (const file of prepared) {
        await uploadExceptionPhoto(inspection.id, file)
        uploaded += 1
      }
      setPhotoMessage({
        text: `사진 ${uploaded}장을 이 검수 건에 연결했어요.`,
        error: false,
      })
    } catch (failure) {
      setPhotoMessage({
        text: `${uploaded > 0 ? `${uploaded}장은 올렸지만 ` : ''}사진을 올리지 못했어요. ${errorMessage(failure)}`,
        error: true,
      })
    } finally {
      setPending(null)
      if (uploaded > 0) {
        void photos.mutate()
        void mutate(['inspection-history', userKey(), inspection.id])
      }
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
            {
              label: '불확실한 값',
              value: flagged.uncertain,
              tone: 'warning',
              icon: 'scan',
            },
            {
              label: '규칙 검증 실패',
              value: flagged.ruleFail,
              tone: 'danger',
              icon: 'xCircle',
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
                  {inspection.lines.map((line, index) => {
                    const draft = draftFor(line)
                    const checks = lineChecks[index]
                    const uncertain = (field: ReadField) =>
                      checks.uncertain.some((item) => item.field === field)
                    return (
                      <tr
                        key={line.id}
                        className={
                          line.match_status !== '일치'
                            ? 'row-differs'
                            : undefined
                        }
                      >
                        <td
                          data-label="명세서 원본 값 (OCR)"
                          className={
                            checks.ruleFail
                              ? 'cell-fail'
                              : checks.uncertain.length > 0
                                ? 'cell-check'
                                : undefined
                          }
                        >
                          <strong>
                            {line.line_no}.{' '}
                            <ReadValue flagged={uncertain('name')}>
                              {line.read.name}
                            </ReadValue>
                          </strong>
                          <div>
                            <ReadValue flagged={uncertain('quantity')}>
                              {line.read.quantity ?? '—'}
                            </ReadValue>{' '}
                            <ReadValue flagged={uncertain('unit')}>
                              {line.read.unit ?? '단위 없음'}
                            </ReadValue>
                          </div>
                          <div
                            className={
                              checks.ruleFail ? 'value-fail' : undefined
                            }
                          >
                            단가{' '}
                            <ReadValue flagged={uncertain('unit_price')}>
                              {line.read.unit_price === null
                                ? '—'
                                : `${line.read.unit_price.toLocaleString('ko-KR')}원`}
                            </ReadValue>{' '}
                            · 금액{' '}
                            <ReadValue flagged={uncertain('amount')}>
                              {line.read.amount === null
                                ? '—'
                                : `${line.read.amount.toLocaleString('ko-KR')}원`}
                            </ReadValue>
                          </div>
                          {checks.ruleFail && (
                            <small className="cell-hint hint-fail">
                              <strong>규칙 검증 실패</strong> ·{' '}
                              {checks.ruleFail}
                            </small>
                          )}
                          {checks.uncertain.length > 0 && (
                            <small className="cell-hint hint-check">
                              <strong>확인 필요</strong> ·{' '}
                              {checks.uncertain
                                .map((item) => item.reason)
                                .join(', ')}
                            </small>
                          )}
                          {line.source === 'staff' ? (
                            <Pill tone="accent" icon="plus">
                              직원이 추가한 줄
                            </Pill>
                          ) : (
                            <small className="muted">
                              읽은 값은 수정되지 않아요
                            </small>
                          )}
                        </td>
                        <td
                          data-label="우리 상품 · 후보"
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
                        <td className="numeric muted" data-label="발주 수량">
                          {line.order_quantity ?? '없음'}
                        </td>
                        <td
                          data-label="확인 수량"
                          className={
                            line.quantity === null || uncertain('quantity')
                              ? 'cell-check'
                              : undefined
                          }
                        >
                          <input
                            type="number"
                            inputMode="numeric"
                            enterKeyHint="done"
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
                          {uncertain('quantity') && (
                            <small className="cell-hint hint-check">
                              <strong>확인 필요</strong> · 명세서에서 수량을
                              직접 확인해 주세요
                            </small>
                          )}
                        </td>
                        <td
                          className="conversion-cell"
                          data-label="기준 단위 환산"
                        >
                          {line.base_quantity === null
                            ? '환산값 없음'
                            : `${line.base_quantity} ${products.find((product) => product.id === line.product_id)?.base_unit ?? '기준 단위'}`}
                        </td>
                        <td data-label="대조 결과">
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
            <span className="legend-item legend-check">
              확인 필요 · 불확실한 값
            </span>
            <span className="legend-item legend-fail">규칙 검증 실패</span>
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
          {ready &&
            (adding ? (
              <AddLineForm
                products={products}
                catalogAvailable={catalogAvailable}
                busy={pending === 'add'}
                onAdd={addLine}
                onClose={() => setAdding(false)}
              />
            ) : (
              <button
                type="button"
                className="button-text"
                disabled={pending !== null}
                onClick={() => setAdding(true)}
              >
                + 판독에 없는 줄 추가
              </button>
            ))}
        </section>
        <aside className="card card-form" aria-labelledby="confirm-title">
          <CardHead
            id="confirm-title"
            icon={<Icon name={rejected ? 'xCircle' : 'check'} />}
            title={
              awaitingOwner
                ? '사장님 승인 대기'
                : rejected
                  ? '반려된 검수'
                  : '확정하기'
            }
            note={
              awaitingOwner
                ? '사장님이 처리하기 전에는 확정을 취소할 수 있어요'
                : rejected
                  ? '재검수를 시작하면 다시 고친 뒤 확정할 수 있어요'
                  : '확정하기 전에는 재고가 바뀌지 않아요'
            }
          />
          {compared && inspection.amount_over_limit && (
            <div className="amount-limit-block">
              <div className="kind-row">
                <Pill tone="owner" icon="alert">
                  {AMOUNT_OVER_LIMIT_LABEL}
                </Pill>
              </div>
              <AmountOverLimitNotice inspection={inspection} />
            </div>
          )}
          {ready && (
            <>
              <div className="remaining">
                <strong>{inspection.check_count}</strong>
                <span>확인할 칸이 남았어요</span>
              </div>
              <p className="card-note">
                {inspection.all_match
                  ? '발주와 모두 일치해요. 확정하면 재고에 반영돼요.'
                  : amountOnly
                    ? '발주와 일치하지만 최종 금액이 금액 한도를 넘었어요. 확정하면 사장님 승인 대기로 넘어가고 재고는 유지돼요.'
                    : '발주와 다른 내용이 있어요. 확정하면 사장님 승인 대기로 넘어가고 재고는 유지돼요.'}
              </p>
              {flaggedTotal > 0 && (
                <p className="card-note">
                  강조한 칸 {flaggedTotal}개(불확실한 값 {flagged.uncertain}개,
                  규칙 검증 실패 {flagged.ruleFail}개)를 명세서 원본과 비교한 뒤
                  확정해 주세요.
                </p>
              )}
            </>
          )}
          {needsReason && (
            <div className="field">
              <label htmlFor="exception-reason">
                예외 사유 <span className="required">필수</span>
              </label>
              <textarea
                id="exception-reason"
                rows={3}
                placeholder="예: 우유 2개 파손, 공급처와 통화해 단가 변경 확인"
                value={reason}
                disabled={pending !== null}
                aria-describedby="exception-reason-help"
                onChange={(event) => setReason(event.target.value)}
              />
              <small id="exception-reason-help" className="muted">
                사장님 승인 화면에 그대로 보여요. 파손 등은 아래 예외 사진도
                올려 주세요.
              </small>
            </div>
          )}
          {awaitingOwner && (
            <>
              <figure className="staff-reason">
                <figcaption>확정할 때 적은 예외 사유</figcaption>
                <blockquote>
                  {inspection.exception_reason ?? '(적힌 사유가 없어요)'}
                </blockquote>
              </figure>
              <p className="card-note">
                확정을 취소하면 직원 확인 대기로 돌아가요. 재고는 바뀌지 않아요.
              </p>
            </>
          )}
          {rejected && (
            <figure className="staff-reason">
              <figcaption>사장님이 적은 반려 사유</figcaption>
              <blockquote>
                {inspection.reject_reason ?? '(적힌 사유가 없어요)'}
              </blockquote>
            </figure>
          )}
          {hasUnsaved && (
            <p className="card-note">
              {adding
                ? '추가하던 줄을 먼저 추가하거나 취소해 주세요.'
                : '변경한 줄을 먼저 저장해 주세요.'}
            </p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {result && <p role="status">{result}</p>}
          {(awaitingOwner || rejected) && !staff ? (
            <>
              <p className="card-note">
                {awaitingOwner
                  ? '확정 취소는 직원 계정에서 할 수 있어요. 승인·반려는 예외 승인 화면에서 해 주세요.'
                  : '재검수는 직원 계정에서 시작할 수 있어요.'}
              </p>
              {awaitingOwner && (
                <Link className="button-secondary" href="/approval">
                  예외 승인으로 가기
                </Link>
              )}
            </>
          ) : awaitingOwner ? (
            <button
              type="button"
              className="button-secondary"
              disabled={pending !== null}
              onClick={() => void staffAction('cancel')}
            >
              {pending === 'cancel' ? '취소 중…' : '확정 취소'}
            </button>
          ) : rejected ? (
            <button
              type="button"
              className="button-primary"
              disabled={pending !== null}
              onClick={() => void staffAction('reinspect')}
            >
              {pending === 'reinspect' ? '시작하는 중…' : '재검수 시작'}
            </button>
          ) : (
            <button
              type="button"
              className="button-primary"
              disabled={
                !ready ||
                inspection.check_count !== 0 ||
                hasUnsaved ||
                pending !== null ||
                (needsReason && !reason.trim())
              }
              onClick={() => void confirm()}
            >
              {pending === 'confirm'
                ? '확정 중…'
                : !ready
                  ? inspection.status
                  : inspection.check_count > 0
                    ? `확인할 칸 ${inspection.check_count}개 남음`
                    : needsReason && !reason.trim()
                      ? '예외 사유를 적어 주세요'
                      : '확인 후 확정'}
            </button>
          )}
        </aside>
      </div>
      {showPhotos && (
        <section className="card" aria-labelledby="exception-photos-title">
          <CardHead
            id="exception-photos-title"
            icon={<Icon name="photo" />}
            title="예외 사진"
            note={
              ready
                ? '파손·수량 차이 같은 예외 상황을 찍어 올리면 사장님 승인 화면에 함께 보여요'
                : '사진은 직원 확인 대기일 때만 올릴 수 있어요'
            }
            right={photos.data && <span className="chip">{photoCount}장</span>}
          />
          {ready && (
            <div className="exception-photo-actions">
              <input
                ref={photoInputRef}
                type="file"
                className="visually-hidden"
                tabIndex={-1}
                aria-hidden="true"
                multiple
                accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  event.target.value = ''
                  void uploadPhotos(files)
                }}
              />
              <button
                type="button"
                className="button-secondary"
                disabled={pending !== null}
                onClick={() => photoInputRef.current?.click()}
              >
                <Icon name="camera" size={18} />{' '}
                {pending === 'photo' ? '올리는 중…' : '사진 추가'}
              </button>
              <p className="card-note">JPG · PNG · HEIC, 한 장에 최대 10MB</p>
            </div>
          )}
          {photoMessage && (
            <p
              className={photoMessage.error ? 'field-error' : undefined}
              role={photoMessage.error ? 'alert' : 'status'}
            >
              {photoMessage.text}
            </p>
          )}
          {photos.error && (
            <p className="field-error" role="alert">
              사진 목록을 불러오지 못했어요: {errorMessage(photos.error)}{' '}
              <button type="button" onClick={() => void photos.mutate()}>
                다시 시도
              </button>
            </p>
          )}
          {photos.data?.length === 0 && (
            <p className="muted">아직 올린 사진이 없어요</p>
          )}
          {photos.data && photos.data.length > 0 && (
            <ExceptionPhotoList
              inspectionId={inspection.id}
              photos={photos.data}
            />
          )}
        </section>
      )}
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
      <section
        className="card inspection-picker"
        aria-labelledby="inspection-picker-title"
      >
        <div className="card-head">
          <div>
            <label
              className="card-title"
              id="inspection-picker-title"
              htmlFor="inspection-selector"
            >
              <Icon name="list" size={22} />
              검수 건 선택
            </label>
            <p className="card-note" id="inspection-picker-help">
              확인할 명세서를 선택해 주세요
            </p>
          </div>
          {inspections.data && (
            <span className="chip">{inspections.data.length}건</span>
          )}
        </div>
        <div className="inspection-picker-control">
          <select
            id="inspection-selector"
            aria-describedby="inspection-picker-help"
            value={selectedId ?? ''}
            disabled={!inspections.data || inspections.data.length === 0}
            onChange={(event) => {
              if (event.target.value)
                void router.push({
                  pathname: '/inspection',
                  query: { id: event.target.value },
                })
            }}
          >
            <option value="" disabled>
              {!inspections.data
                ? '검수 목록을 불러오는 중…'
                : inspections.data.length === 0
                  ? '선택할 검수 건이 없어요'
                  : '검수 건을 선택해 주세요'}
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
          <svg
            className="inspection-picker-chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m7 10 5 5 5-5" />
          </svg>
        </div>
      </section>
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
