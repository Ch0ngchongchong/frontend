import { useEffect } from 'react'
import Link from 'next/link'
import { useInspections } from '../api/inspections'
import {
  describeReadingNotification,
  dismissReadingToast,
  markReadingNotificationRead,
  observeInspections,
  useReadingNotifications,
} from '../readingNotifications'
import { Icon } from './ui.tsx'

// 어느 화면에 있든 검수 목록을 지켜보다가 판독이 끝나면 화면 아래에 알린다 (US-03).
// 목록은 `판독 중`인 건이 있는 동안만 1.5초마다 다시 조회한다 (useInspections 설정).
export default function ReadingNotifier() {
  const { data } = useInspections()
  useEffect(() => {
    if (data) observeInspections(data)
  }, [data])
  const { items, toastId } = useReadingNotifications()
  const toast = items.find((item) => item.id === toastId)
  const text = toast && describeReadingNotification(toast)

  // 알림 영역은 항상 두고 내용만 바꿔야 화면 읽기 프로그램이 새 알림을 읽어 준다.
  return (
    <div className="reading-toast-region" role="status" aria-live="polite">
      {toast && text && (
        <div className={`reading-toast reading-toast-${toast.outcome}`}>
          <span className="reading-toast-icon" aria-hidden="true">
            <Icon
              name={toast.outcome === 'done' ? 'checkCircle' : 'alert'}
              size={22}
            />
          </span>
          <span className="reading-toast-text">
            <strong>{text.title}</strong>
            <small>{text.detail}</small>
          </span>
          <Link
            className="button-small"
            href={text.href}
            onClick={() => markReadingNotificationRead(toast.id)}
          >
            {text.action}
          </Link>
          <button
            type="button"
            className="reading-toast-close"
            aria-label="알림 닫기"
            onClick={dismissReadingToast}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
