// 재고 배달 트럭 일러스트 (장식). 시작 화면 지도와 같은 아이소메트릭 스타일:
// 흰 짐칸 + 회색 옆면, 우리 가게 주황(짐칸 띠·로고·운전석 지붕), 운전석 정면에 웃는 얼굴, 뒤쪽 속도선
// 크기는 width로 정한다 (비율 4:3 유지). facing="left"면 왼쪽으로 달리도록 뒤집되, 로고 글자는 바로 읽히게 둔다

type DeliveryTruckProps = {
  width?: number | string
  className?: string
  // 화면에서 의미가 있으면 대체 글자를 넣는다. 없으면 장식으로 숨긴다
  title?: string
  // 운전석이 향하는 쪽 (기본: 오른쪽)
  facing?: 'right' | 'left'
}

// 로고(아이콘+글자) 폭. 뒤집을 때 이 폭 안에서 다시 뒤집어 글자가 거꾸로 보이지 않게 한다
const LOGO_WIDTH = 82

function DeliveryTruck({
  width = 320,
  className,
  title,
  facing = 'right',
}: DeliveryTruckProps) {
  const mirrored = facing === 'left'
  return (
    <svg
      className={className}
      viewBox="0 0 320 240"
      width={width}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g transform={mirrored ? 'translate(320 0) scale(-1 1)' : undefined}>
        <ellipse
          cx="154.7"
          cy="165.6"
          rx="150"
          ry="46"
          fill="#14161F"
          opacity="0.08"
        />
        <line
          x1="20.7"
          y1="47.9"
          x2="57.5"
          y2="69.1"
          stroke="#C9CED9"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="6.0"
          y1="56.4"
          x2="57.5"
          y2="86.1"
          stroke="#C9CED9"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          x1="26.6"
          y1="85.3"
          x2="57.5"
          y2="103.1"
          stroke="#C9CED9"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <polygon
          points="63.4,121.9 197.4,199.2 197.4,190.7 63.4,113.4"
          fill="#3F4453"
        />
        <polygon
          points="244.5,172.0 197.4,199.2 197.4,190.7 244.5,163.5"
          fill="#4A5062"
        />
        <polygon
          points="110.5,86.1 244.5,163.5 197.4,190.7 63.4,113.4"
          fill="#5B6275"
        />
        <polygon
          points="61.9,114.2 151.7,166.1 151.7,96.4 61.9,44.5"
          fill="#D7DCE6"
        />
        <polygon
          points="201.8,137.1 151.7,166.1 151.7,96.4 201.8,67.5"
          fill="#E8EBF2"
        />
        <polygon
          points="112.0,15.6 201.8,67.5 151.7,96.4 61.9,44.5"
          fill="#FFFFFF"
        />
        <polygon
          points="67.2,103.7 146.4,149.4 146.4,139.2 67.2,93.5"
          fill="#F26A21"
        />
        <g transform="matrix(0.866,0.5,0,1,72.3,69.2)">
          <g
            transform={
              mirrored ? `translate(${LOGO_WIDTH} 0) scale(-1 1)` : undefined
            }
          >
            <rect x="0" y="4" width="22" height="22" rx="6" fill="#F26A21" />
            <path
              d="M5 11l6-3 6 3-6 3zM5 11v7l6 3 6-3v-7M11 14v7"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <text
              x="28"
              y="21"
              fontFamily="Pretendard, Apple SD Gothic Neo, sans-serif"
              fontSize="15"
              fontWeight="800"
              fill="#14161F"
            >
              딱 재고
            </text>
          </g>
        </g>
        <line
          x1="65.5"
          y1="113.9"
          x2="65.5"
          y2="50.6"
          stroke="#C9CED9"
          strokeWidth="2"
        />
        <polygon
          points="154.7,167.8 195.9,191.6 195.9,138.8 154.7,115.0"
          fill="#D7DCE6"
        />
        <polygon
          points="246.0,162.6 195.9,191.6 195.9,138.8 246.0,109.9"
          fill="#E8EBF2"
        />
        <polygon
          points="204.7,86.2 246.0,109.9 195.9,138.8 154.7,115.0"
          fill="#FFFFFF"
        />
        <polygon
          points="154.7,115.0 195.9,138.8 195.9,134.8 154.7,111.0"
          fill="#C24C15"
        />
        <polygon
          points="246.0,109.9 195.9,138.8 195.9,134.8 246.0,105.9"
          fill="#D9561A"
        />
        <polygon
          points="204.7,82.1 246.0,105.9 195.9,134.8 154.7,111.0"
          fill="#F26A21"
        />
        <polygon
          points="159.1,143.1 181.2,155.8 181.2,135.4 159.1,122.7"
          fill="#B9C6E8"
        />
        <polygon
          points="241.6,136.3 200.3,160.1 200.3,140.4 241.6,116.6"
          fill="#B9C6E8"
        />
        <line
          x1="235.7"
          y1="122.7"
          x2="223.9"
          y2="143.8"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />
        <ellipse cx="232.7" cy="153.3" rx="4.6" ry="5.4" fill="#14161F" />
        <ellipse cx="209.2" cy="166.9" rx="4.6" ry="5.4" fill="#14161F" />
        <circle cx="234.1" cy="151.5" r="1.5" fill="#FFFFFF" />
        <circle cx="210.6" cy="165.1" r="1.5" fill="#FFFFFF" />
        <path
          d="M227.7 165.4 Q220.9 176.3 214.2 173.2"
          fill="none"
          stroke="#14161F"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <ellipse
          cx="237.1"
          cy="158.6"
          rx="4"
          ry="2.6"
          fill="#F26A21"
          opacity="0.35"
        />
        <ellipse
          cx="204.2"
          cy="177.6"
          rx="4"
          ry="2.6"
          fill="#F26A21"
          opacity="0.35"
        />
        <polygon
          points="197.4,195.8 200.9,197.8 200.9,190.4 197.4,188.3"
          fill="#8B93A6"
        />
        <polygon
          points="248.0,170.6 200.9,197.8 200.9,190.4 248.0,163.2"
          fill="#9AA1B2"
        />
        <polygon
          points="244.5,161.1 248.0,163.2 200.9,190.4 197.4,188.3"
          fill="#AEB4C2"
        />
        <ellipse cx="84.0" cy="134.8" rx="13" ry="15" fill="#14161F" />
        <ellipse cx="85.5" cy="134.8" rx="6" ry="7" fill="#AEB4C2" />
        <ellipse cx="85.5" cy="134.8" rx="2.4" ry="2.8" fill="#14161F" />
        <ellipse cx="131.1" cy="162.0" rx="13" ry="15" fill="#14161F" />
        <ellipse cx="132.6" cy="162.0" rx="6" ry="7" fill="#AEB4C2" />
        <ellipse cx="132.6" cy="162.0" rx="2.4" ry="2.8" fill="#14161F" />
        <ellipse cx="176.8" cy="188.3" rx="13" ry="15" fill="#14161F" />
        <ellipse cx="178.3" cy="188.3" rx="6" ry="7" fill="#AEB4C2" />
        <ellipse cx="178.3" cy="188.3" rx="2.4" ry="2.8" fill="#14161F" />
      </g>
    </svg>
  )
}

export default DeliveryTruck
