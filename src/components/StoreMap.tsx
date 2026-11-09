import type { Ref } from 'react'

// 아이소메트릭 장면: 공급처 건물 5곳(식자재 2·유제품·원두·포장재, PRD 1절)이 길로 우리 가게(카페)와 이어지고,
// 배송 상자 캐릭터가 길 위를 오간다. 색은 우리 가게에만 쓰고 다른 가게·길·캐릭터는 무채색이다.
// 시작 화면에서 쓰는 장면. 우리 가게를 누를 수 있다 (매장 화면은 흰 배경이라 쓰지 않는다)

// 아이소메트릭 격자 (i, j: 바닥 칸, z: 높이) → 화면 좌표
const S = 40
const ORIGIN_X = 800
const ORIGIN_Y = -92

// 무채색 (다른 가게·길·캐릭터)
const MUTED_ROOF = '#C9CED9'
const MUTED_LINE = '#AEB4C2'

function iso(i: number, j: number, z = 0): [number, number] {
  return [ORIGIN_X + (i - j) * S * 0.866, ORIGIN_Y + (i + j) * S * 0.5 - z * S]
}

function points(list: [number, number][]) {
  return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

function pathOf(list: [number, number][]) {
  return list
    .map(([i, j], n) => {
      const [x, y] = iso(i, j)
      return `${n === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

type BlockProps = {
  i: number
  j: number
  w: number
  d: number
  h: number
  roof?: string
  panels?: boolean
}

// 흰 건물 덩어리: 윗면 + 오른쪽 앞면 + 왼쪽 앞면, 지붕에 패널 격자
function Block({ i, j, w, d, h, roof, panels }: BlockProps) {
  const top = points([
    iso(i, j, h),
    iso(i + w, j, h),
    iso(i + w, j + d, h),
    iso(i, j + d, h),
  ])
  const right = points([
    iso(i + w, j, 0),
    iso(i + w, j + d, 0),
    iso(i + w, j + d, h),
    iso(i + w, j, h),
  ])
  const left = points([
    iso(i, j + d, 0),
    iso(i + w, j + d, 0),
    iso(i + w, j + d, h),
    iso(i, j + d, h),
  ])
  const pad = 0.35
  const lines: string[] = []
  if (panels && roof) {
    for (let k = 1; k < w * 2; k++) {
      const a = iso(i + pad + ((w - pad * 2) * k) / (w * 2), j + pad, h)
      const b = iso(i + pad + ((w - pad * 2) * k) / (w * 2), j + d - pad, h)
      lines.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`)
    }
    for (let k = 1; k < d * 2; k++) {
      const a = iso(i + pad, j + pad + ((d - pad * 2) * k) / (d * 2), h)
      const b = iso(i + w - pad, j + pad + ((d - pad * 2) * k) / (d * 2), h)
      lines.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`)
    }
  }
  return (
    <g>
      <polygon points={left} fill="#D7DCE6" />
      <polygon points={right} fill="#E8EBF2" />
      <polygon points={top} fill="#FFFFFF" />
      {roof && (
        <polygon
          points={points([
            iso(i + pad, j + pad, h),
            iso(i + w - pad, j + pad, h),
            iso(i + w - pad, j + d - pad, h),
            iso(i + pad, j + d - pad, h),
          ])}
          fill={roof}
        />
      )}
      {lines.length > 0 && (
        <path
          d={lines.join('')}
          stroke="#FFFFFF"
          strokeWidth="1.4"
          opacity="0.8"
        />
      )}
    </g>
  )
}

// 우리 가게(카페): 주황 지붕 + 줄무늬 차양 + 창문 + 웃는 얼굴
function Cafe() {
  const i = 8
  const j = 8
  const w = 3
  const d = 3
  const h = 2.2
  const awning = []
  for (let k = 0; k < 6; k++) {
    awning.push(
      <polygon
        key={k}
        points={points([
          iso(i + (w * k) / 6, j + d, h - 0.55),
          iso(i + (w * (k + 1)) / 6, j + d, h - 0.55),
          iso(i + (w * (k + 1)) / 6, j + d + 0.45, h - 0.85),
          iso(i + (w * k) / 6, j + d + 0.45, h - 0.85),
        ])}
        fill={k % 2 === 0 ? '#F26A21' : '#FFFFFF'}
      />,
    )
  }
  const [ex1, ey1] = iso(i + 1.1, j + d, 1.1)
  const [ex2, ey2] = iso(i + 1.9, j + d, 1.1)
  const [mx, my] = iso(i + 1.5, j + d, 0.75)
  return (
    <g>
      <Block i={i} j={j} w={w} d={d} h={h} roof="#F26A21" />
      {awning}
      <polygon
        points={points([
          iso(i + w, j + 0.6, 1.3),
          iso(i + w, j + 2.4, 1.3),
          iso(i + w, j + 2.4, 0.35),
          iso(i + w, j + 0.6, 0.35),
        ])}
        fill="#F2A51D"
        opacity="0.45"
      />
      <circle cx={ex1} cy={ey1} r="5" fill="#14161F" />
      <circle cx={ex2} cy={ey2} r="5" fill="#14161F" />
      <path
        d={`M${mx - 11} ${my - 4}q11 10 22 0`}
        stroke="#14161F"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

// 작은 상자 더미 (무채색)
function Crates({ i, j }: { i: number; j: number }) {
  const cells: [number, number][] = [
    [0, 0],
    [0.9, 0],
    [0, 0.9],
  ]
  return (
    <g>
      {cells.map(([a, b]) => (
        <Block
          key={`${a}-${b}`}
          i={i + a}
          j={j + b}
          w={0.7}
          d={0.7}
          h={0.55}
          roof={MUTED_ROOF}
        />
      ))}
    </g>
  )
}

const ROUTES: { d: [number, number][]; dur: number }[] = [
  {
    d: [
      [5, 4.5],
      [9.5, 4.5],
      [9.5, 8],
    ],
    dur: 16,
  },
  {
    d: [
      [13, 4],
      [13, 6],
      [10.5, 6],
      [10.5, 8],
    ],
    dur: 19,
  },
  {
    d: [
      [5, 13],
      [6.5, 13],
      [6.5, 9.5],
      [8, 9.5],
    ],
    dur: 14,
  },
  {
    d: [
      [14, 10.5],
      [11, 10.5],
    ],
    dur: 11,
  },
  {
    d: [
      [8, 16],
      [8, 13],
      [9.5, 13],
      [9.5, 11],
    ],
    dur: 18,
  },
]

// 길 위 작은 사각 마디 (레퍼런스의 연결 마디)
function nodesOf(route: [number, number][]) {
  const out: [number, number][] = []
  for (let n = 1; n < route.length; n++) {
    const [a, b] = route[n - 1]
    const [c, e] = route[n]
    out.push(iso((a + c) / 2, (b + e) / 2))
  }
  return out
}

// 배송 상자 캐릭터: 둥근 상자 + 눈 두 개 + 회색 띠
function Bot() {
  return (
    <g>
      <ellipse cx="0" cy="12" rx="15" ry="4" fill="#14161F" opacity="0.12" />
      <rect
        x="-14"
        y="-12"
        width="28"
        height="22"
        rx="7"
        fill="#FFFFFF"
        stroke="#D7DCE6"
      />
      <rect x="-14" y="-12" width="28" height="7" rx="3.5" fill={MUTED_LINE} />
      <circle cx="-5" cy="1" r="2.4" fill="#14161F" />
      <circle cx="5" cy="1" r="2.4" fill="#14161F" />
    </g>
  )
}

// 카페 위 "우리 가게" 핀 (시작 화면에서는 눌러 보라는 둥근 물결이 퍼진다)
function StorePin({ pulse }: { pulse: boolean }) {
  const [x, y] = iso(9.5, 9.5, 3.4)
  return (
    <g transform={`translate(${x} ${y})`}>
      {pulse && (
        <rect
          className="pin-pulse"
          x="-56"
          y="-18"
          width="112"
          height="34"
          rx="17"
        />
      )}
      <path d="M0 22l-7-9h14z" fill="#FFFFFF" />
      <rect
        x="-56"
        y="-18"
        width="112"
        height="34"
        rx="17"
        fill="#FFFFFF"
        stroke="#F26A21"
        strokeWidth="1.5"
      />
      <circle cx="-38" cy="-1" r="5" fill="#F26A21" />
      <text
        x="6"
        y="5"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="#14161F"
      >
        우리 가게
      </text>
    </g>
  )
}

type SceneProps = {
  // 시작 화면: 장면을 가운데에 크게 보이고 우리 가게를 누를 수 있다
  interactive?: boolean
  selected?: boolean
  onStoreClick?: () => void
  storeRef?: Ref<SVGGElement>
}

export function Scene({
  interactive = false,
  selected = false,
  onStoreClick,
  storeRef,
}: SceneProps) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [gx, gy] = iso(9.5, 9.5)

  return (
    <svg
      className="scene"
      viewBox={interactive ? '100 -170 1400 800' : '0 0 1600 900'}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden={interactive ? undefined : true}
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? '우리 가게와 거래처 지도' : undefined}
    >
      <defs>
        <radialGradient id="cafe-glow">
          <stop offset="0" stopColor="#F26A21" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="#F2A51D" stopOpacity="0.14" />
          <stop offset="1" stopColor="#F2A51D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 우리 가게 뒤 은은한 빛: 바닥에 납작한 타원으로 깐다 */}
      <ellipse
        cx={gx}
        cy={gy}
        rx={selected ? 400 : 340}
        ry={selected ? 235 : 200}
        fill="url(#cafe-glow)"
      />

      {/* 바닥 격자 */}
      <g stroke="#14161F" opacity="0.05">
        {Array.from({ length: 22 }, (_, k) => {
          const [x1, y1] = iso(k - 1, -1)
          const [x2, y2] = iso(k - 1, 20)
          const [x3, y3] = iso(-1, k - 1)
          const [x4, y4] = iso(20, k - 1)
          return (
            <g key={k}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
              <line x1={x3} y1={y3} x2={x4} y2={y4} />
            </g>
          )
        })}
      </g>

      {/* 길: 넓은 흰 띠 + 가는 회색 선 + 사각 마디 */}
      {ROUTES.map((route, n) => (
        <g key={n} fill="none" strokeLinejoin="round" strokeLinecap="round">
          <path
            d={pathOf(route.d)}
            stroke="#FFFFFF"
            strokeWidth="12"
            opacity="0.9"
          />
          <path d={pathOf(route.d)} stroke={MUTED_LINE} strokeWidth="2.5" />
          {nodesOf(route.d).map(([x, y], k) => (
            <rect
              key={k}
              x={x - 5}
              y={y - 5}
              width="10"
              height="10"
              rx="2"
              fill="#FFFFFF"
              stroke={MUTED_LINE}
              strokeWidth="1.5"
            />
          ))}
        </g>
      ))}

      {/* 다른 가게(공급처) — 무채색, 뒤쪽부터 그린다 */}
      <Block i={12} j={1} w={4} d={3} h={1.2} roof={MUTED_ROOF} panels />
      <Block i={1} j={3} w={4} d={3} h={1.2} roof={MUTED_ROOF} panels />
      <Crates i={16.5} j={5} />

      {/* 우리 가게 */}
      <g
        ref={storeRef}
        className={interactive ? 'store-hit' : undefined}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? '우리 가게 열기' : undefined}
        aria-expanded={interactive ? selected : undefined}
        onClick={interactive ? onStoreClick : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onStoreClick?.()
                }
              }
            : undefined
        }
      >
        <Cafe />
        <StorePin pulse={interactive && !selected && !reduceMotion} />
      </g>

      <Block i={14} j={9.5} w={3} d={3} h={1.6} roof={MUTED_ROOF} panels />
      <Block i={2} j={12} w={3} d={4} h={1.4} roof={MUTED_ROOF} panels />
      <Crates i={3} j={8} />
      <Block i={6} j={16} w={4} d={2} h={1} roof={MUTED_ROOF} panels />
      <Crates i={12.5} j={14} />

      {/* 길 위를 오가는 배송 상자 캐릭터 */}
      {ROUTES.map((route, n) => {
        const [sx, sy] = iso(...route.d[0])
        return (
          <g
            key={n}
            transform={reduceMotion ? `translate(${sx} ${sy - 10})` : undefined}
          >
            <g transform={reduceMotion ? undefined : 'translate(0 -10)'}>
              {!reduceMotion && (
                <animateMotion
                  dur={`${route.dur}s`}
                  repeatCount="indefinite"
                  path={pathOf(route.d)}
                  keyPoints="0;1;1;0;0"
                  keyTimes="0;0.42;0.5;0.92;1"
                  calcMode="linear"
                />
              )}
              <Bot />
            </g>
          </g>
        )
      })}
    </svg>
  )
}
