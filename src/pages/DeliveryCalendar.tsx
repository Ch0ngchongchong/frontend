import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  CardHead,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import {
  CALENDAR,
  CALENDAR_MONTH,
  type CalendarEntry,
} from '../mocks/sample.ts'

// 입고 달력 (사장님) 화면 — 디자인 시안. PRD 5절 화면 목록에 없는 화면이다 (팀 확인 필요)
// 날짜마다 들어온 입고 검수 건과 들어올 예정인 발주(입고 대기)를 보여 주고, 날짜를 고르면 그날 품목을 옆에 보여 준다
// 화살표로 지난달·다음 달로 넘기고, 'N년'·'N월'을 누르면 연도·달을 바로 고르는 목록이 열린다

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const LOOP_MONTHS = [...MONTHS, ...MONTHS, ...MONTHS]
const YEARS = Array.from({ length: 201 }, (_, i) => 1900 + i)
const WHEEL_ITEM_HEIGHT = 44

function DateWheel({
  options,
  value,
  unit,
  onChange,
  onStep,
}: {
  options: number[]
  value: number
  unit: string
  onChange: (value: number) => void
  onStep?: (delta: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const indexRef = useRef(options.indexOf(value) + (onStep ? 12 : 0))
  const [wheelIndex, setWheelIndex] = useState(
    options.indexOf(value) + (onStep ? 12 : 0),
  )
  useEffect(() => {
    const index = indexRef.current
    if (ref.current && index >= 0)
      ref.current.scrollTop = index * WHEEL_ITEM_HEIGHT
    // 열린 시점의 값에만 맞추고 이후 스크롤은 사용자가 직접 제어한다.
  }, [])
  useEffect(() => {
    if (onStep || !ref.current) return
    const index = options.indexOf(value)
    if (
      index >= 0 &&
      Math.round(ref.current.scrollTop / WHEEL_ITEM_HEIGHT) !== index
    )
      ref.current.scrollTop = index * WHEEL_ITEM_HEIGHT
  }, [value, options, onStep])
  return (
    <div
      className="picker-column"
      ref={ref}
      aria-label={unit === '년' ? '연도 선택' : '월 선택'}
      onScroll={(event) => {
        const index = Math.max(
          0,
          Math.min(
            options.length - 1,
            Math.round(event.currentTarget.scrollTop / WHEEL_ITEM_HEIGHT),
          ),
        )
        if (onStep) {
          const delta = index - indexRef.current
          if (!delta) return
          indexRef.current = index
          setWheelIndex(index)
          onStep(delta)
          if (index < 6 || index >= 30) {
            const recentered = index + (index < 6 ? 12 : -12)
            indexRef.current = recentered
            setWheelIndex(recentered)
            event.currentTarget.scrollTop = recentered * WHEEL_ITEM_HEIGHT
          }
        } else if (options[index] !== value) onChange(options[index])
      }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          type="button"
          aria-pressed={
            index === (onStep ? wheelIndex : options.indexOf(value))
          }
          className={`picker-option wheel-distance-${Math.min(3, Math.abs(index - (onStep ? wheelIndex : options.indexOf(value))))}`}
          onClick={() => {
            ref.current?.scrollTo({
              top: index * WHEEL_ITEM_HEIGHT,
              behavior: 'smooth',
            })
          }}
        >
          {option}
          {unit}
        </button>
      ))}
    </div>
  )
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

// 달력 칸: 첫 주 앞 빈칸 + 1일~말일
function monthCells(year: number, month: number) {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const lastDay = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = Array.from(
    { length: firstWeekday },
    () => null,
  )
  for (let day = 1; day <= lastDay; day++) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// 끝난 입고(청록) / 처리 중(주황) / 예정(점선)
function toneOf(entry: CalendarEntry) {
  if (entry.status === '재고 반영 완료') return 'done'
  if (entry.status === '입고 대기') return 'planned'
  return 'progress'
}

function DayEntries({ entries }: { entries: CalendarEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ top: false, bottom: false })
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const cards = scroller.querySelectorAll<HTMLElement>('.day-entry')
    const update = () => {
      if (cards.length > 3) {
        const first = cards[0].getBoundingClientRect()
        const third = cards[2].getBoundingClientRect()
        scroller.style.maxHeight = `${third.bottom - first.top}px`
      } else scroller.style.maxHeight = ''
      setEdges({
        top: scroller.scrollTop > 1,
        bottom:
          scroller.scrollTop + scroller.clientHeight <
          scroller.scrollHeight - 1,
      })
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(scroller)
    cards.forEach((card) => observer.observe(card))
    return () => {
      scroller.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [entries])
  return (
    <div
      className={`day-scroll-wrap${edges.top ? ' fade-top' : ''}${edges.bottom ? ' fade-bottom' : ''}`}
    >
      <div
        className="day-scroll"
        ref={scrollRef}
        tabIndex={entries.length > 3 ? 0 : undefined}
        aria-label={entries.length > 3 ? '입고 내역 스크롤' : undefined}
      >
        <ul className="day-list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`day-entry day-entry-${toneOf(entry)}`}
            >
              <div className="day-entry-header">
                <span className="day-entry-icon" aria-hidden="true">
                  <Icon name="box" size={19} />
                </span>
                <div className="day-entry-title">
                  <strong>{entry.supplier.replace('(가상) ', '')}</strong>
                  <small>{entry.id}</small>
                </div>
              </div>
              <div className="day-entry-status">
                <StatusPill status={entry.status} />
                <span>{entry.items.length}개 품목</span>
              </div>
              <ul className="day-items">
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DeliveryCalendar() {
  const { today } = CALENDAR_MONTH
  const [view, setView] = useState({
    year: CALENDAR_MONTH.year,
    month: CALENDAR_MONTH.month,
  })
  const { year, month } = view
  const viewRef = useRef(view)
  const [selected, setSelected] = useState('2026-11-02')
  const [picker, setPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // 보는 달을 바꾸면, 그 달에 오늘이 있으면 오늘을, 없으면 1일을 고른다
  function showMonth(nextYear: number, nextMonth: number) {
    const date = new Date(nextYear, nextMonth - 1, 1)
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    viewRef.current = { year: y, month: m }
    setView({ year: y, month: m })
    setSelected(today.startsWith(`${y}-${pad(m)}`) ? today : dateKey(y, m, 1))
  }

  // 목록 밖을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!picker) return
    function handlePointer(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setPicker(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setPicker(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [picker])

  const byDate = new Map<string, CalendarEntry[]>()
  for (const entry of CALENDAR) {
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry])
  }

  const inView = CALENDAR.filter((entry) =>
    entry.date.startsWith(`${year}-${pad(month)}`),
  )
  const done = inView.filter((entry) => toneOf(entry) === 'done').length
  const planned = inView.filter((entry) => toneOf(entry) === 'planned').length
  const selectedEntries = byDate.get(selected) ?? []
  const [selYear, selMonth, selDay] = selected.split('-').map(Number)
  const selWeekday = WEEKDAYS[new Date(selYear, selMonth - 1, selDay).getDay()]

  return (
    <>
      <PageHeader title="입고 달력" screen="calendar" />

      <StatusSummary
        items={[
          {
            label: `${month}월 입고 완료`,
            value: done,
            status: '재고 반영 완료',
          },
          { label: '입고 예정', value: planned, status: '입고 대기' },
        ]}
      />
      <div className="layout-calendar">
        <section className="card" aria-labelledby="calendar-title">
          <div className="card-head">
            <div className="month-nav">
              <button
                type="button"
                className="icon-circle-button"
                aria-label="지난달"
                onClick={() => showMonth(year, month - 1)}
              >
                ‹
              </button>
              <div className="month-picker" ref={pickerRef}>
                <h2 id="calendar-title" className="month-title">
                  <button
                    type="button"
                    className="month-part"
                    aria-haspopup="dialog"
                    aria-expanded={picker}
                    onClick={() => setPicker(!picker)}
                  >
                    {year}년 {month}월
                    <span className="caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                </h2>

                {picker && (
                  <div
                    className="picker-panel picker-date"
                    role="dialog"
                    aria-label="연도와 월 고르기"
                  >
                    <div className="picker-columns">
                      <DateWheel
                        options={YEARS}
                        value={year}
                        unit="년"
                        onChange={(next) => showMonth(next, month)}
                      />
                      <DateWheel
                        options={LOOP_MONTHS}
                        value={month}
                        unit="월"
                        onChange={(next) => showMonth(year, next)}
                        onStep={(delta) =>
                          showMonth(
                            viewRef.current.year,
                            viewRef.current.month + delta,
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="picker-done"
                      onClick={() => setPicker(false)}
                    >
                      완료
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="icon-circle-button"
                aria-label="다음 달"
                onClick={() => showMonth(year, month + 1)}
              >
                ›
              </button>
            </div>
            <p className="legend">
              <span className="legend-item legend-done">입고 완료</span>
              <span className="legend-item legend-progress">처리 중</span>
              <span className="legend-item legend-planned">입고 예정</span>
            </p>
          </div>

          <div className="calendar">
            <div className="calendar-head" aria-hidden="true">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="calendar-body">
              {monthCells(year, month).map((day, index) => {
                if (day === null) {
                  return (
                    <span
                      key={`blank-${index}`}
                      className="calendar-cell is-blank"
                    />
                  )
                }
                const key = dateKey(year, month, day)
                const entries = byDate.get(key) ?? []
                const classes = ['calendar-cell']
                if (key === today) classes.push('is-today')
                if (key === selected) classes.push('is-selected')
                return (
                  <button
                    type="button"
                    key={key}
                    className={classes.join(' ')}
                    aria-pressed={key === selected}
                    aria-label={`${month}월 ${day}일, 입고 ${entries.length}건`}
                    onClick={() => setSelected(key)}
                  >
                    <span className="calendar-day">
                      {day}
                      {key === today && <small>오늘</small>}
                    </span>
                    <span className="calendar-entries">
                      {entries.slice(0, 2).map((entry) => (
                        <span
                          key={entry.id}
                          className={`calendar-chip tone-chip-${toneOf(entry)}`}
                        >
                          {entry.supplier.replace('(가상) ', '')}
                        </span>
                      ))}
                      {entries.length > 2 && (
                        <span className="calendar-more">
                          +{entries.length - 2}건
                        </span>
                      )}
                    </span>
                    <span className="calendar-dots" aria-hidden="true">
                      {entries.map((entry) => (
                        <span
                          key={entry.id}
                          className={`dot tone-chip-${toneOf(entry)}`}
                        />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <aside className="card" aria-labelledby="day-title">
          <CardHead
            id="day-title"
            icon={<Icon name="clock" />}
            title={`${selMonth}월 ${selDay}일 (${selWeekday})`}
            note={
              selectedEntries.length === 0
                ? '이날은 입고가 없어요'
                : `입고 ${selectedEntries.length}건`
            }
          />
          {selectedEntries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                <Icon name="cart" size={26} />
              </span>
              <p>들어온 것도, 들어올 것도 없어요</p>
            </div>
          ) : (
            <DayEntries key={selected} entries={selectedEntries} />
          )}
        </aside>
      </div>
    </>
  )
}

export default DeliveryCalendar
