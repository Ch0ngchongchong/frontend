import { useEffect, useMemo, useRef, useState } from 'react'
import { CardHead, Icon, PageHeader, Pill } from '../components/ui.tsx'
import {
  useInspections,
  useInspectionHistory,
  useReadingLogs,
  type HistoryEntryRaw,
} from '../api/inspections'
import { useProducts } from '../api/workspace'
import type { Product } from '../api/products'
import {
  computeReadingAccuracy,
  FIXED_LINE_TARGET,
  UNMEASURED_FIELDS,
  type ReadingAccuracy,
} from '../readingAccuracy'

// 변경 이력 (사장님) 화면 (PRD 5절 / US-07 / F-07)
// 입고 검수 건별 변경자·시각·이전 값·새 값을 시간순으로 보여 준다. 조회만, 수정·삭제 불가

const ACTION_LABELS: Record<string, string> = {
  승인: '사장 승인',
  재검수: '재검수 시작',
  '직원 줄 추가': '직원이 추가한 줄',
}

// 이력의 field를 화면 말로 (서버 계약은 api/inspections.ts)
const FIELD_LABELS: Record<string, string> = {
  status: '상태',
  document: '명세서',
  exception_photo: '예외 사진',
  result: '확정 결과',
  exception_reason: '예외 사유',
  reject_reason: '반려 사유',
  summary: '명세서 합계',
  'summary checked': '합계 확인',
}

const LINE_FIELD_LABELS: Record<string, string> = {
  product_id: '품목',
  quantity: '수량',
  unit: '단위',
  damaged: '파손',
  checked: '확인',
  manual_base_quantity: '기준 수량',
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : '불러오지 못했어요. 다시 시도해 주세요.'
}

function formatAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 값은 문자열로 온다. 숫자·객체는 JSON이라 풀어 보고, 안 풀리면 글자 그대로 쓴다
function parseValue(value: string | null): unknown {
  if (value === null) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function showValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? '예' : '아니요'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function productLabel(products: Product[], value: unknown) {
  if (value === null || value === undefined) return '-'
  const product = products.find((item) => item.id === Number(value))
  return product
    ? `${product.product_code} · ${product.name ?? '이름 없음'}`
    : `상품 #${String(value)}`
}

// 판독·직원 줄 추가의 새 값 `{ name, quantity, unit, ... }`
function lineSummary(value: unknown) {
  if (!value || typeof value !== 'object') return showValue(value)
  const line = value as Record<string, unknown>
  const unit = line.unit ? ` ${String(line.unit)}` : ''
  return `${showValue(line.name)} · 수량 ${showValue(line.quantity)}${unit}`
}

function toTimelineEntry(entry: HistoryEntryRaw, products: Product[]) {
  const base = {
    at: formatAt(entry.changed_at),
    by: `사용자 #${entry.changed_by ?? '-'}`,
    kind: ACTION_LABELS[entry.action] ?? entry.action,
  }
  const old = parseValue(entry.old_value)
  const next = parseValue(entry.new_value)
  const field = entry.field ?? ''

  const lineField = /^line (\d+) (.+)$/.exec(field)
  if (lineField) {
    const [, no, name] = lineField
    const isProduct = name === 'product_id'
    return {
      ...base,
      field: `${no}행 ${LINE_FIELD_LABELS[name] ?? name}`,
      oldValue: isProduct ? productLabel(products, old) : showValue(old),
      newValue: isProduct ? productLabel(products, next) : showValue(next),
    }
  }
  const line = /^line (\d+)$/.exec(field)
  if (line) {
    return {
      ...base,
      field: `${line[1]}행`,
      oldValue: '-',
      newValue: lineSummary(next),
    }
  }
  const inventory = /^inventory (.+)$/.exec(field)
  if (inventory) {
    const product = products.find((item) => item.product_code === inventory[1])
    return {
      ...base,
      field: `${inventory[1]}${product?.name ? ` · ${product.name}` : ''} 재고`,
      oldValue: showValue(old),
      newValue: showValue(next),
    }
  }
  // 예전 이력은 field가 없고 값이 통째로 JSON이다
  return {
    ...base,
    field: entry.field === null ? base.kind : (FIELD_LABELS[field] ?? field),
    oldValue: showValue(old),
    newValue: showValue(next),
  }
}

const percent = (ratio: number) => Math.round(ratio * 100)

function formatDuration(seconds: number) {
  const total = Math.round(seconds)
  if (total < 60) return [[total, '초']] as const
  if (total < 3600)
    return [
      [Math.floor(total / 60), '분'],
      [total % 60, '초'],
    ] as const
  return [
    [Math.floor(total / 3600), '시간'],
    [Math.floor((total % 3600) / 60), '분'],
  ] as const
}

// 판독 정확도 (US-07 인수 조건). 계산 방법은 readingAccuracy.ts
function AccuracySection({
  inspectionId,
  accuracy,
}: {
  inspectionId: number
  accuracy: ReadingAccuracy | null
}) {
  if (!accuracy) {
    return (
      <section className="card" aria-labelledby="accuracy-title">
        <CardHead
          id="accuracy-title"
          icon={<Icon name="review" />}
          title={`검수 #${inspectionId} 판독 정확도`}
        />
        <div className="empty-state">
          <p>판독 원본 기록이 없어 정확도를 계산할 수 없어요</p>
        </div>
      </section>
    )
  }

  const overTarget = accuracy.fixedRatio > FIXED_LINE_TARGET
  return (
    <>
      <section className="card" aria-labelledby="accuracy-title">
        <CardHead
          id="accuracy-title"
          icon={<Icon name="review" />}
          title={`검수 #${inspectionId} 판독 정확도`}
          note={
            accuracy.confirmedAt === null
              ? '직원이 아직 확정하지 않아 값이 바뀔 수 있어요'
              : '판독 원본값과 직원 확정값을 칸별로 비교했어요'
          }
          right={<span className="chip">판독 {accuracy.readLines}줄</span>}
        />
        <ul className="accuracy-fields">
          {accuracy.fields.map((field) => (
            <li key={field.key} className="accuracy-field">
              <span className="accuracy-field-label">{field.label}</span>
              <div
                className="bar-meter"
                role="img"
                aria-label={`${field.label} 정확도 ${percent(field.ratio)}%`}
              >
                <span style={{ width: `${field.ratio * 100}%` }} />
              </div>
              <span className="accuracy-field-value">
                {percent(field.ratio)}%
              </span>
              <span className="accuracy-field-sub">
                {accuracy.readLines}줄 중 {field.correct}줄 그대로
              </span>
            </li>
          ))}
          <li className="accuracy-field is-unmeasured">
            <span className="accuracy-field-label">
              {UNMEASURED_FIELDS.join('·')}
            </span>
            <span className="accuracy-field-sub">
              직원이 고칠 수 없는 칸이라 재지 않아요
            </span>
          </li>
        </ul>
      </section>

      <section className="stats" aria-label="판독 품질">
        <article className="card stat">
          <div className="stat-top">
            <span>직원이 고친 줄</span>
            <span className="stat-icon">
              <Icon name="draft" size={18} />
            </span>
          </div>
          <p className="stat-value">
            {percent(accuracy.fixedRatio)}
            <small>%</small>
          </p>
          <p className={`stat-sub${overTarget ? ' is-warning' : ''}`}>
            판독 {accuracy.readLines}줄 중 {accuracy.fixedLines}줄 · 목표{' '}
            {percent(FIXED_LINE_TARGET)}% 이하
            {overTarget && ' (넘었어요)'}
          </p>
        </article>
        <article className="card stat">
          <div className="stat-top">
            <span>행 누락률</span>
            <span className="stat-icon">
              <Icon name="plus" size={18} />
            </span>
          </div>
          <p className="stat-value">
            {percent(accuracy.missingRatio)}
            <small>%</small>
          </p>
          <p className="stat-sub">
            전체 {accuracy.readLines + accuracy.addedLines}줄 중 직원 추가{' '}
            {accuracy.addedLines}줄
          </p>
        </article>
        <article className="card stat">
          <div className="stat-top">
            <span>업로드부터 확정까지</span>
            <span className="stat-icon">
              <Icon name="clock" size={18} />
            </span>
          </div>
          <p className="stat-value">
            {accuracy.elapsedSeconds === null
              ? '—'
              : formatDuration(accuracy.elapsedSeconds).map(([n, unit]) => (
                  <span key={unit}>
                    {n}
                    <small>{unit}</small>{' '}
                  </span>
                ))}
          </p>
          <p className="stat-sub">
            {accuracy.uploadedAt && accuracy.confirmedAt
              ? `${formatAt(accuracy.uploadedAt)} → ${formatAt(accuracy.confirmedAt)}`
              : '아직 직원이 확정하지 않았어요'}
          </p>
        </article>
      </section>
    </>
  )
}

function ChangeHistory() {
  const { data: inspectionData, error: listError } = useInspections()
  const { data: productData } = useProducts()
  const products: Product[] = productData ?? []
  const ids = useMemo(
    () =>
      [...(inspectionData ?? [])].map((item) => item.id).sort((a, b) => b - a),
    [inspectionData],
  )

  const [pickedId, setPickedId] = useState<number | null>(null)
  // pickedId가 없거나 더 이상 목록에 없으면(예: 새 데이터로 교체) 첫 건으로 돌아간다
  const selectedId =
    pickedId !== null && ids.includes(pickedId) ? pickedId : (ids[0] ?? null)

  const { data: historyData, error: historyError } =
    useInspectionHistory(selectedId)
  const { data: readingLogs } = useReadingLogs(selectedId)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const row = scroller.firstElementChild as HTMLElement | null
    const layout = () => {
      if (row)
        row.style.paddingInline = `${Math.max(0, (scroller.clientWidth - 140) / 2)}px`
      update()
    }
    const update = () => {
      const buttons = Array.from(
        scroller.querySelectorAll<HTMLButtonElement>('.filter-chip'),
      )
      if (buttons.length === 0) return
      const center =
        scroller.getBoundingClientRect().left + scroller.clientWidth / 2
      const index = buttons.reduce((closest, button, current) => {
        const rect = button.getBoundingClientRect()
        const nearest = buttons[closest].getBoundingClientRect()
        return Math.abs(rect.left + rect.width / 2 - center) <
          Math.abs(nearest.left + nearest.width / 2 - center)
          ? current
          : closest
      }, 0)
      setPickedId(ids[index] ?? null)
      setEdges({
        left: scroller.scrollLeft > 1,
        right:
          scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1,
      })
    }
    let wheelDelta = 0
    let wheelTarget: number | null = null
    let wheelTimer: number | undefined
    const onWheel = (event: WheelEvent) => {
      const area = scroller.parentElement?.getBoundingClientRect()
      const header = document.querySelector('.topbar')?.getBoundingClientRect()
      if (
        !area ||
        !header ||
        event.clientY < header.bottom ||
        event.clientY > area.bottom
      )
        return
      const delta =
        Math.abs(event.deltaY) > Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX
      if (!delta) return
      event.preventDefault()
      const buttons = Array.from(
        scroller.querySelectorAll<HTMLButtonElement>('.filter-chip'),
      )
      if (buttons.length === 0) return
      const center =
        scroller.getBoundingClientRect().left + scroller.clientWidth / 2
      const firstInput = wheelTarget === null
      if (wheelTarget === null)
        wheelTarget = buttons.reduce((closest, button, index) => {
          const rect = button.getBoundingClientRect()
          const nearest = buttons[closest].getBoundingClientRect()
          return Math.abs(rect.left + rect.width / 2 - center) <
            Math.abs(nearest.left + nearest.width / 2 - center)
            ? index
            : closest
        }, 0)
      const scaledDelta =
        delta *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? scroller.clientWidth
            : 1)
      if (!firstInput) wheelDelta += Math.max(-100, Math.min(100, scaledDelta))
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        wheelDelta = 0
        wheelTarget = null
      }, 300)
      if (!firstInput && Math.abs(wheelDelta) < 500) return
      const direction = Math.sign(firstInput ? scaledDelta : wheelDelta)
      if (!firstInput) wheelDelta -= direction * 500
      const next = Math.max(
        0,
        Math.min(buttons.length - 1, wheelTarget + direction),
      )
      if (next === wheelTarget) {
        wheelDelta = 0
        return
      }
      wheelTarget = next
      scroller.scrollTo({
        left: next * 148,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
    }
    layout()
    scroller.addEventListener('scroll', update, { passive: true })
    document.addEventListener('wheel', onWheel, { passive: false })
    const observer = new ResizeObserver(layout)
    observer.observe(scroller)
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild)
    return () => {
      scroller.removeEventListener('scroll', update)
      document.removeEventListener('wheel', onWheel)
      window.clearTimeout(wheelTimer)
      observer.disconnect()
    }
  }, [ids])

  const latestLog =
    readingLogs && readingLogs.length > 0
      ? readingLogs[readingLogs.length - 1]
      : null
  const history = (historyData ?? []).map((entry) =>
    toTimelineEntry(entry, products),
  )
  const accuracy = useMemo(
    () => (historyData ? computeReadingAccuracy(historyData) : null),
    [historyData],
  )

  return (
    <>
      <PageHeader title="변경 이력" screen="history" />

      {listError && (
        <p className="field-error" role="alert">
          {errorMessage(listError)}
        </p>
      )}

      {!listError && ids.length === 0 && (
        <div className="empty-state">
          <p>조회할 입고 검수 건이 없어요</p>
        </div>
      )}

      {ids.length > 0 && (
        <div
          className={`history-filter-wrap${edges.left ? ' fade-left' : ''}${edges.right ? ' fade-right' : ''}`}
        >
          <span
            className="history-wheel-marker marker-top"
            aria-hidden="true"
          />
          <div className="history-filter-scroll" ref={scrollRef}>
            <div
              className="filter-row"
              role="group"
              aria-label="입고 검수 건 고르기"
            >
              {ids.map((id, index) => (
                <button
                  type="button"
                  key={id}
                  className={`filter-chip wheel-distance-${Math.min(3, Math.abs(index - ids.indexOf(selectedId ?? ids[0])))}${id === selectedId ? ' is-selected' : ''}`}
                  aria-pressed={id === selectedId}
                  onClick={(event) => {
                    const scroller = scrollRef.current
                    if (!scroller) return
                    const button = event.currentTarget.getBoundingClientRect()
                    const container = scroller.getBoundingClientRect()
                    scroller.scrollBy({
                      left:
                        button.left +
                        button.width / 2 -
                        (container.left + scroller.clientWidth / 2),
                      behavior: window.matchMedia(
                        '(prefers-reduced-motion: reduce)',
                      ).matches
                        ? 'instant'
                        : 'smooth',
                    })
                  }}
                >
                  <Icon name="cart" size={16} /> #{id}
                </button>
              ))}
            </div>
          </div>
          <span
            className="history-wheel-marker marker-bottom"
            aria-hidden="true"
          />
        </div>
      )}

      {latestLog && (
        <section className="stats" aria-label="판독 기록">
          <article className="card stat">
            <div className="stat-top">
              <span>LLM 호출 비용</span>
              <span className="stat-icon">
                <Icon name="coin" size={18} />
              </span>
            </div>
            <p className="stat-value">
              {latestLog.cost ?? '—'}
              {latestLog.cost !== null && <small>USD</small>}
            </p>
            <p className="stat-sub">
              검수 #{selectedId} 판독 {latestLog.outcome}
            </p>
          </article>
          <article className="card stat">
            <div className="stat-top">
              <span>처리 시간</span>
              <span className="stat-icon">
                <Icon name="clock" size={18} />
              </span>
            </div>
            <p className="stat-value">
              {latestLog.elapsed_seconds}
              <small>초</small>
            </p>
            <p className="stat-sub">업로드부터 직원 확인 대기까지</p>
          </article>
          <article className="card stat">
            <div className="stat-top">
              <span>토큰</span>
              <span className="stat-icon">
                <Icon name="scan" size={18} />
              </span>
            </div>
            <p className="stat-value">
              {latestLog.input_tokens !== null &&
              latestLog.output_tokens !== null
                ? (
                    latestLog.input_tokens + latestLog.output_tokens
                  ).toLocaleString('ko-KR')
                : '—'}
              <small>개</small>
            </p>
            <p className="stat-sub">
              {latestLog.input_tokens !== null &&
              latestLog.output_tokens !== null
                ? `입력 ${latestLog.input_tokens.toLocaleString('ko-KR')} · 출력 ${latestLog.output_tokens.toLocaleString('ko-KR')}`
                : '규칙 기반 판독이라 토큰이 없어요'}
            </p>
          </article>
        </section>
      )}

      {selectedId !== null && historyData && !historyError && (
        <AccuracySection inspectionId={selectedId} accuracy={accuracy} />
      )}

      <section className="card" aria-labelledby="timeline-title">
        <CardHead
          id="timeline-title"
          icon={<Icon name="clock" />}
          title={
            selectedId !== null ? `검수 #${selectedId} 변경 기록` : '변경 기록'
          }
          note="기록은 누구도 고치거나 지울 수 없어요"
          right={<span className="chip">{history.length}개</span>}
        />
        {historyError ? (
          <p className="field-error" role="alert">
            {errorMessage(historyError)}
          </p>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <p>표시할 변경 기록이 없어요</p>
          </div>
        ) : (
          <ol className="timeline">
            {history.map((entry, index) => (
              <li key={index} className="timeline-item">
                <span className="timeline-dot" aria-hidden="true" />
                <div className="timeline-body">
                  <p className="timeline-meta">
                    <span>{entry.at}</span>
                    <span>{entry.by}</span>
                    <Pill tone="muted" icon="clock">
                      {entry.kind}
                    </Pill>
                  </p>
                  <p className="timeline-change">
                    <span className="timeline-field">{entry.field}</span>
                    <span className="old-value">{entry.oldValue}</span>
                    <span aria-hidden="true">→</span>
                    <span className="visually-hidden">에서</span>
                    <strong>{entry.newValue}</strong>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}

export default ChangeHistory
