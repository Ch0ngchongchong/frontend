import Link from 'next/link'
import { useInspections, type Inspection } from '../api/inspections'
import { useOrders } from '../api/workspace'
import { useWorkspace } from '../App'
import { Icon, StatusPill } from '../components/ui.tsx'

// 직원 첫 화면 (client-meeting-2 피드백 6·9): 휴대폰으로 한 손에 쓰도록
// 지금 할 일만 큰 줄로 보여 주고, 누르면 그 건의 업로드·입고 확인으로 바로 간다.

type Group = {
  key: string
  title: string
  note: string
  statuses: string[]
  href: (item: Inspection) => string
  action: (item: Inspection) => string
}

const GROUPS: Group[] = [
  {
    key: 'review',
    title: '지금 확인할 입고',
    note: '명세서와 실물을 대조하고 확정해 주세요',
    statuses: ['직원 확인 대기', '반려'],
    href: (item) => `/inspection?id=${item.id}`,
    action: (item) => (item.status === '반려' ? '재검수하기' : '확인하기'),
  },
  {
    key: 'upload',
    title: '명세서를 올릴 입고',
    note: '도착한 물건의 거래명세서를 찍어 올려 주세요',
    statuses: ['업로드 대기'],
    href: (item) => `/upload?id=${item.id}`,
    action: (item) =>
      item.document?.read_error ? '다시 올리기' : '사진 올리기',
  },
  {
    key: 'waiting',
    title: '기다리는 중',
    note: '판독이 끝나거나 사장님이 처리하면 알려 드려요',
    statuses: ['판독 중', '사장 승인 대기'],
    href: (item) => `/inspection?id=${item.id}`,
    action: () => '보기',
  },
]

const DONE = ['재고 반영 완료', '승인', '검수 종료']

export default function StaffHome() {
  const { profile } = useWorkspace()
  const inspections = useInspections()
  const orders = useOrders()
  const items = inspections.data ?? []
  const waitingUpload = items.filter((item) => item.status === '업로드 대기')
  const done = items.filter((item) => DONE.includes(item.status)).length

  function supplier(item: Inspection) {
    return (
      orders.data?.find((order) => order.id === item.purchase_order_id)
        ?.supplier || `발주 #${item.purchase_order_id}`
    )
  }

  return (
    <div className="staff-home">
      <header className="staff-hello">
        <p>{profile.store}</p>
        <h1>{profile.name}님, 오늘 할 일이에요</h1>
      </header>

      <Link
        className="staff-cta"
        href={
          waitingUpload.length === 1
            ? `/upload?id=${waitingUpload[0].id}`
            : '/upload'
        }
      >
        <span className="staff-cta-icon" aria-hidden="true">
          <Icon name="camera" size={28} />
        </span>
        <span className="staff-cta-text">
          <strong>명세서 찍어 올리기</strong>
          <small>
            {inspections.data
              ? waitingUpload.length > 0
                ? `올릴 명세서 ${waitingUpload.length}건`
                : '지금 올릴 명세서는 없어요'
              : '검수 목록을 불러오는 중…'}
          </small>
        </span>
        <span aria-hidden="true">›</span>
      </Link>

      {inspections.error && (
        <p className="field-error" role="alert">
          검수 목록을 불러오지 못했어요.{' '}
          <button type="button" onClick={() => void inspections.mutate()}>
            다시 시도
          </button>
        </p>
      )}
      {!inspections.data && !inspections.error && (
        <p role="status">검수 목록을 불러오고 있어요…</p>
      )}

      {inspections.data &&
        GROUPS.map((group) => {
          const list = items.filter((item) =>
            group.statuses.includes(item.status),
          )
          return (
            <section
              key={group.key}
              className="staff-group"
              aria-labelledby={`staff-${group.key}`}
            >
              <div className="staff-group-head">
                <h2 id={`staff-${group.key}`}>{group.title}</h2>
                <span className="chip">{list.length}건</span>
              </div>
              <p className="card-note">{group.note}</p>
              {list.length === 0 ? (
                <p className="staff-empty">없어요</p>
              ) : (
                <ul className="staff-tasks">
                  {list.map((item) => (
                    <li key={item.id}>
                      <Link className="staff-task" href={group.href(item)}>
                        <span className="staff-task-main">
                          <strong>{supplier(item)}</strong>
                          <small>
                            검수 #{item.id} · 발주 #{item.purchase_order_id}
                            {item.status === '직원 확인 대기' &&
                              item.check_count > 0 &&
                              ` · 확인할 칸 ${item.check_count}개`}
                          </small>
                          <StatusPill status={item.status} />
                        </span>
                        <span className="staff-task-action">
                          {group.action(item)}
                          <span aria-hidden="true">›</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}

      {inspections.data && (
        <p className="card-note staff-done">끝난 검수 {done}건</p>
      )}
    </div>
  )
}
