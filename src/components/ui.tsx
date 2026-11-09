import { Fragment, type ReactNode } from 'react'
import { useNav } from './nav.ts'
import type { ScreenKey } from './screens.ts'

// 화면들이 함께 쓰는 작은 조각: 제목 영역, 상태 요약 칩, 카드 머리, 상태 캡슐, 아이콘

type Tone =
  'muted' | 'info' | 'accent' | 'owner' | 'danger' | 'done' | 'warning'

// 상태값별 색·아이콘 (DESIGN.md '상태값별 색' 표, 상태 이름은 03-rules-states-llm.md 3-2 그대로)
const STATUS_STYLE: Record<string, { tone: Tone; icon: IconName }> = {
  '업로드 대기': { tone: 'muted', icon: 'upload' },
  '판독 중': { tone: 'info', icon: 'progress' },
  '직원 확인 대기': { tone: 'accent', icon: 'review' },
  '사장 승인 대기': { tone: 'owner', icon: 'alert' },
  승인: { tone: 'owner', icon: 'checkCircle' },
  반려: { tone: 'danger', icon: 'xCircle' },
  '재고 반영 완료': { tone: 'done', icon: 'checkCircle' },
  '검수 종료': { tone: 'muted', icon: 'clock' },
  '발주 초안': { tone: 'muted', icon: 'draft' },
  '발주 확인 완료': { tone: 'owner', icon: 'checkCircle' },
  '공급처 전달 완료': { tone: 'info', icon: 'plane' },
  '입고 대기': { tone: 'accent', icon: 'truck' },
  '입고 완료': { tone: 'done', icon: 'checkCircle' },
  '발주 취소': { tone: 'muted', icon: 'xCircle' },
}

type PillProps = { tone: Tone; icon: IconName; children: ReactNode }

// 상태 캡슐: 왼쪽에 상태 아이콘 + 이름 (레퍼런스: 아이콘이 붙은 둥근 상태 배지)
export function Pill({ tone, icon, children }: PillProps) {
  return (
    <span className={`pill pill-${tone}`}>
      <Icon name={icon} size={16} />
      {children}
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? { tone: 'muted', icon: 'clock' }
  return (
    <Pill tone={style.tone} icon={style.icon}>
      {status}
    </Pill>
  )
}

type PageHeaderProps = {
  title: string
  // 경로의 마지막(지금 화면)을 눌렀을 때 갈 곳. 탭 화면이면 screen, 아니면 onSelf
  screen?: ScreenKey
  onSelf?: () => void
  // 홈과 지금 화면 사이 단계 (예: 거래처 상세의 '거래처')
  parents?: { label: string; screen: ScreenKey }[]
}

// 제목 + 경로(홈 › 지금 화면). '홈'은 시작 화면으로 간다
export function PageHeader({
  title,
  screen,
  onSelf,
  parents = [],
}: PageHeaderProps) {
  const nav = useNav()
  const goSelf = onSelf ?? (() => screen && nav.navigate(screen))
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <nav className="breadcrumb" aria-label="경로">
        <button type="button" onClick={nav.goHome}>
          홈
        </button>
        {parents.map((parent) => (
          <Fragment key={parent.screen}>
            <span aria-hidden="true">›</span>
            <button type="button" onClick={() => nav.navigate(parent.screen)}>
              {parent.label}
            </button>
          </Fragment>
        ))}
        <span aria-hidden="true">›</span>
        <button type="button" onClick={goSelf} aria-current="page">
          {title}
        </button>
      </nav>
    </header>
  )
}

type SummaryItem = {
  label: string
  value: number | string
  status?: string
  tone?: Tone
  icon?: IconName
}

// 상태 요약 칩: 폼·목록 카드 바로 위에 작게 둔다
export function StatusSummary({ items }: { items: SummaryItem[] }) {
  return (
    <div className="status-summary">
      {items.map((item) => {
        const style = item.status ? STATUS_STYLE[item.status] : undefined
        const tone = item.tone ?? style?.tone ?? 'muted'
        const icon = item.icon ?? style?.icon ?? 'clock'
        return (
          <span className="summary-chip" key={item.label}>
            <span className={`summary-icon tone-${tone}`} aria-hidden="true">
              <Icon name={icon} size={14} />
            </span>
            {item.label}
            <strong>{item.value}</strong>
          </span>
        )
      })}
    </div>
  )
}

type CardHeadProps = {
  id?: string
  icon: ReactNode
  title: string
  note?: string
  right?: ReactNode
}

export function CardHead({ id, icon, title, note, right }: CardHeadProps) {
  return (
    <div className="card-head">
      <div>
        <h2 id={id} className="card-title">
          {icon}
          {title}
        </h2>
        {note && <p className="card-note">{note}</p>}
      </div>
      {right}
    </div>
  )
}

const ICON = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ICON}>
      {ICON_PATHS[name]}
    </svg>
  )
}

type IconName =
  | 'list'
  | 'plus'
  | 'upload'
  | 'camera'
  | 'check'
  | 'alert'
  | 'clock'
  | 'cart'
  | 'scan'
  | 'photo'
  | 'coin'
  | 'box'
  | 'store'
  | 'draft'
  | 'checkCircle'
  | 'xCircle'
  | 'plane'
  | 'truck'
  | 'progress'
  | 'review'

const ICON_PATHS: Record<IconName, ReactNode> = {
  list: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  plus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  upload: <path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  alert: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cart: <path d="M8 4h8l2 3v13H6V7zM9 12h6M9 16h4" />,
  scan: <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10" />,
  photo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 16 5-5 4 4 3-3 6 6" />
    </>
  ),
  coin: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  box: <path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10" />,
  store: (
    <>
      <path d="M4 10v10h16V10M3 10l2-6h14l2 6z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  // 발주 초안: 연필이 그려진 문서
  draft: (
    <>
      <path d="M13 3H6v18h12V8z" />
      <path d="M13 3v5h5M9 13h4M9 17h2M15 17l3-3" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  // 공급처 전달 완료: 종이비행기
  plane: <path d="M21 3 3 10.5l7.5 3L21 3l-7.5 18-3-7.5" />,
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  // 판독 중: 점선 원 (레퍼런스 In progress)
  progress: <circle cx="12" cy="12" r="8.5" strokeDasharray="3.2 3.2" />,
  // 확인할 차례: 돋보기 (레퍼런스 In review)
  review: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
}
