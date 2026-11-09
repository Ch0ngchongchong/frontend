import { useEffect, useRef, useState } from 'react'
import { CardHead, Icon, PageHeader, Pill } from '../components/ui.tsx'
import { HISTORY, READ_LOG } from '../mocks/sample.ts'

// 변경 이력 (사장님) 화면 — 디자인 시안 (PRD 5절 / US-07 / F-07)
// 입고 검수 건별 변경자·시각·이전 값·새 값을 시간순으로 보여 준다. 조회만, 수정·삭제 불가

const INSPECTION_IDS = ['IN-1048', 'IN-1047', 'IN-1046']
function ChangeHistory() {
  const [selectedId, setSelectedId] = useState(INSPECTION_IDS[0])
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
      const center =
        scroller.getBoundingClientRect().left + scroller.clientWidth / 2
      const buttons = Array.from(
        scroller.querySelectorAll<HTMLButtonElement>('.filter-chip'),
      )
      const index = buttons.reduce((closest, button, current) => {
        const rect = button.getBoundingClientRect()
        const nearest = buttons[closest].getBoundingClientRect()
        return Math.abs(rect.left + rect.width / 2 - center) <
          Math.abs(nearest.left + nearest.width / 2 - center)
          ? current
          : closest
      }, 0)
      setSelectedId(INSPECTION_IDS[index])
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
      const center =
        scroller.getBoundingClientRect().left + scroller.clientWidth / 2
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
      wheelDelta += Math.max(-100, Math.min(100, scaledDelta))
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        wheelDelta = 0
        wheelTarget = null
      }, 300)
      if (Math.abs(wheelDelta) < 500) return
      const direction = Math.sign(wheelDelta)
      wheelDelta -= direction * 500
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
  }, [])
  const hasRecords = selectedId === READ_LOG.inspectionId
  const history = hasRecords ? HISTORY : []
  return (
    <>
      <PageHeader title="변경 이력" screen="history" />

      <div
        className={`history-filter-wrap${edges.left ? ' fade-left' : ''}${edges.right ? ' fade-right' : ''}`}
      >
        <span className="history-wheel-marker marker-top" aria-hidden="true" />
        <div className="history-filter-scroll" ref={scrollRef}>
          <div
            className="filter-row"
            role="group"
            aria-label="입고 검수 건 고르기"
          >
            {INSPECTION_IDS.map((id, index) => (
              <button
                type="button"
                key={id}
                className={`filter-chip wheel-distance-${Math.min(3, Math.abs(index - INSPECTION_IDS.indexOf(selectedId)))}${id === selectedId ? ' is-selected' : ''}`}
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
                <Icon name="cart" size={16} /> {id}
              </button>
            ))}
          </div>
        </div>
        <span
          className="history-wheel-marker marker-bottom"
          aria-hidden="true"
        />
      </div>

      {hasRecords && (
        <section className="stats" aria-label="판독 기록">
          <article className="card stat">
            <div className="stat-top">
              <span>LLM 호출 비용</span>
              <span className="stat-icon">
                <Icon name="coin" size={18} />
              </span>
            </div>
            <p className="stat-value">
              {READ_LOG.cost}
              <small>원</small>
            </p>
            <p className="stat-sub">{READ_LOG.inspectionId} 판독 1회</p>
          </article>
          <article className="card stat">
            <div className="stat-top">
              <span>처리 시간</span>
              <span className="stat-icon">
                <Icon name="clock" size={18} />
              </span>
            </div>
            <p className="stat-value">
              {READ_LOG.elapsedSeconds}
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
              {(READ_LOG.inputTokens + READ_LOG.outputTokens).toLocaleString(
                'ko-KR',
              )}
              <small>개</small>
            </p>
            <p className="stat-sub">
              입력 {READ_LOG.inputTokens.toLocaleString('ko-KR')} · 출력{' '}
              {READ_LOG.outputTokens.toLocaleString('ko-KR')}
            </p>
          </article>
        </section>
      )}

      <section className="card" aria-labelledby="timeline-title">
        <CardHead
          id="timeline-title"
          icon={<Icon name="clock" />}
          title={`${selectedId} 변경 기록`}
          note="기록은 누구도 고치거나 지울 수 없어요"
          right={<span className="chip">{history.length}개</span>}
        />
        {history.length === 0 ? (
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
