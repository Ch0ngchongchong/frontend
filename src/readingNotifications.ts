import { useSyncExternalStore } from 'react'
import type { Inspection } from './api/inspections'

// 판독 완료 알림 (US-03). 서버에 알림 API가 없어서, 폴링으로 받은 검수 목록에서
// `판독 중`이던 건이 다른 상태로 바뀌는 순간을 찾아 이 브라우저 탭 안에서만 알린다.
// 화면을 옮겨도 유지되도록 모듈 단위 외부 스토어로 두고 useSyncExternalStore로 읽는다.
// 새로고침하면 사라지고, 탭이 닫혀 있던 동안 끝난 판독은 알리지 못한다.

export type ReadingNotification = {
  id: number
  inspectionId: number
  outcome: 'done' | 'failed'
  filename: string | null
  readError: string | null
  read: boolean
}

type State = {
  // 최근 것부터
  items: ReadingNotification[]
  // 화면 아래에 띄울 알림. 닫으면 null이 되고 알림 목록에는 남는다.
  toastId: number | null
}

const EMPTY: State = { items: [], toastId: null }
let state: State = EMPTY
let nextId = 1
const lastStatus = new Map<number, string>()
const listeners = new Set<() => void>()

function setState(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// 서버 렌더링·하이드레이션 때는 빈 알림을 쓴다.
export function useReadingNotifications() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  )
}

// 처음 본 검수 건은 기준 상태로만 기록한다. 이미 끝난 건을 다시 알리지 않기 위해서다.
export function observeInspections(inspections: Inspection[]) {
  const added: ReadingNotification[] = []
  for (const item of inspections) {
    const before = lastStatus.get(item.id)
    lastStatus.set(item.id, item.status)
    if (before !== '판독 중' || item.status === '판독 중') continue
    added.push({
      id: nextId++,
      inspectionId: item.id,
      // 판독에 실패하면 서버가 `업로드 대기`로 되돌리고 read_error를 채운다.
      outcome: item.status === '업로드 대기' ? 'failed' : 'done',
      filename: item.document?.filename ?? null,
      readError: item.document?.read_error ?? null,
      read: false,
    })
  }
  if (added.length === 0) return
  added.reverse()
  setState({ items: [...added, ...state.items], toastId: added[0].id })
}

export function markReadingNotificationRead(id: number) {
  setState({
    items: state.items.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    ),
    toastId: state.toastId === id ? null : state.toastId,
  })
}

export function markAllReadingNotificationsRead() {
  setState({
    items: state.items.map((item) => ({ ...item, read: true })),
    toastId: null,
  })
}

export function dismissReadingToast() {
  setState({ ...state, toastId: null })
}

// 로그아웃하면 앞 사용자의 알림과 기준 상태를 지운다.
export function resetReadingNotifications() {
  lastStatus.clear()
  setState(EMPTY)
}

export function describeReadingNotification(item: ReadingNotification) {
  return item.outcome === 'done'
    ? {
        title: `검수 #${item.inspectionId} 판독이 끝났어요`,
        detail: `${item.filename ? `${item.filename} · ` : ''}입고 확인에서 결과를 확인해 주세요.`,
        href: `/inspection?id=${item.inspectionId}`,
        action: '입고 확인하기',
      }
    : {
        title: `검수 #${item.inspectionId} 판독하지 못했어요`,
        detail: item.readError ?? '명세서를 다시 올려 주세요.',
        href: `/upload?id=${item.inspectionId}`,
        action: '다시 올리기',
      }
}
