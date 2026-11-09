import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  CardHead,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import { REVIEW_LINES, type ReviewLine } from '../mocks/sample.ts'
import type { InspectionPhoto } from '../components/InspectionPhotos.ts'

// 입고 확인 (직원) 화면 — 디자인 시안 (PRD 5절 / US-03·US-04·US-05 / F-03·F-04·F-05)
// 판독 결과와 발주를 줄 단위로 대조한다. AI가 확신하지 못한 값·규칙 검증 실패·후보 없음/2개 이상·환산 불가는
// 추측값 없이 강조하고, 확인되지 않은 칸이 남아 있으면 확정할 수 없다 (DESIGN.md 'LLM 결과를 사람이 확인하기 전')

function won(value: number | null) {
  return value === null ? '' : `${value.toLocaleString('ko-KR')}원`
}

// 줄 하나에서 직원이 확인해야 할 칸 수
function checksOf(line: ReviewLine) {
  let n = line.uncertain.length
  if (line.ruleFail) n += 1
  if (line.candidates.length !== 1) n += 1
  return n
}

function InspectionReview({
  photos,
  onPhotosChange,
}: {
  photos: InspectionPhoto[]
  onPhotosChange: React.Dispatch<React.SetStateAction<InspectionPhoto[]>>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState('')
  async function attachPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (
      !['image/jpeg', 'image/png'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setPhotoError('5MB 이하의 JPG 또는 PNG 사진을 선택해 주세요.')
      return
    }
    try {
      const header = new Uint8Array(await file.slice(0, 8).arrayBuffer())
      const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every(
        (byte, index) => header[index] === byte,
      )
      const isJpeg =
        header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
      if (!(file.type === 'image/png' ? isPng : isJpeg))
        throw new Error('invalid image')
      const bitmap = await createImageBitmap(file)
      if (bitmap.width > 4096 || bitmap.height > 4096) {
        bitmap.close()
        throw new Error('image too large')
      }
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        bitmap.close()
        throw new Error('canvas unavailable')
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const photo = {
        id: crypto.randomUUID(),
        name: file.name,
        src: canvas.toDataURL('image/png'),
      }
      onPhotosChange((previous) => [...previous, photo])
      setPhotoError('')
    } catch {
      setPhotoError(
        '사진을 읽지 못했어요. 4096 × 4096 이하의 JPG 또는 PNG 파일을 선택해 주세요.',
      )
    }
  }
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false })
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
  const remaining = REVIEW_LINES.reduce((sum, line) => sum + checksOf(line), 0)
  const differs = REVIEW_LINES.filter((line) => line.differs).length

  function highlight(kind: 'checks' | 'differs') {
    const selector =
      kind === 'checks' ? '.cell-check, .cell-fail' : '.row-differs td'
    const targets = scrollRef.current?.querySelectorAll<HTMLElement>(selector)
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    targets?.forEach((target) => {
      target.getAnimations().forEach((animation) => animation.cancel())
      target.animate(
        [
          { boxShadow: 'inset 0 0 0 999px rgba(242, 106, 33, 0)' },
          { boxShadow: 'inset 0 0 0 999px rgba(242, 106, 33, 0.24)' },
          { boxShadow: 'inset 0 0 0 999px rgba(242, 106, 33, 0)' },
        ],
        {
          duration: reduceMotion ? 600 : 700,
          iterations: reduceMotion ? 1 : 3,
        },
      )
    })
  }

  return (
    <div className="inspection-page">
      <PageHeader title="입고 확인" screen="inspection" />

      <StatusSummary
        items={[
          {
            label: '확인할 칸',
            value: remaining,
            tone: 'accent',
            icon: 'review',
            onClick: () => highlight('checks'),
          },
          {
            label: '발주와 다른 줄',
            value: differs,
            tone: 'danger',
            icon: 'alert',
            onClick: () => highlight('differs'),
          },
        ]}
      />
      <div className="layout-review">
        <section className="card" aria-labelledby="review-title">
          <CardHead
            id="review-title"
            icon={<Icon name="scan" />}
            title="명세서와 발주 대조"
            note="(가상) 식자재 공급처 B · 발주 PO-0006 · 08:05 올림"
            right={<StatusPill status="직원 확인 대기" />}
          />
          <div
            className={`review-scroll-wrap${scrollEdges.left ? ' fade-left' : ''}${scrollEdges.right ? ' fade-right' : ''}`}
          >
            <div className="table-scroll" ref={scrollRef}>
              <table className="data-table review-table">
                <thead>
                  <tr>
                    <th scope="col">명세서 품목</th>
                    <th scope="col">우리 상품</th>
                    <th scope="col" className="numeric">
                      발주
                    </th>
                    <th scope="col" className="numeric">
                      명세서
                    </th>
                    <th scope="col">기준 단위 환산</th>
                    <th scope="col" className="numeric">
                      단가
                    </th>
                    <th scope="col" className="numeric">
                      금액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {REVIEW_LINES.map((line) => {
                    const pickNeeded = line.candidates.length !== 1
                    const priceUnsure = line.uncertain.includes('unit_price')
                    const unitUnsure = line.uncertain.includes('unit')
                    return (
                      <tr
                        key={line.rawName}
                        className={line.differs ? 'row-differs' : undefined}
                      >
                        <td className="code">{line.rawName}</td>
                        <td className={pickNeeded ? 'cell-check' : undefined}>
                          {line.candidates.length === 0 ? (
                            <>
                              <span className="cell-hint">
                                맞는 상품이 없어요 · 고르거나 새로 등록
                              </span>
                            </>
                          ) : (
                            <div className="candidates">
                              {line.candidates.map((candidate, index) => (
                                <span
                                  key={candidate.name}
                                  className={`candidate${!pickNeeded && index === 0 ? ' is-picked' : ''}`}
                                  title={candidate.reason}
                                >
                                  {candidate.name}
                                  <small>{candidate.reason}</small>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="numeric muted">
                          {line.orderedQty === null ? '없음' : line.orderedQty}
                        </td>
                        <td
                          className={`numeric${unitUnsure ? ' cell-check' : ''}`}
                        >
                          {line.quantity}
                          {line.unit ? ` ${line.unit}` : ''}
                        </td>
                        <td
                          className={`conversion-cell${line.conversion === null && !unitUnsure ? ' muted' : ''}`}
                        >
                          {line.conversion ?? '같은 단위'}
                        </td>
                        <td
                          className={`numeric${priceUnsure ? ' cell-check' : ''}`}
                        >
                          {priceUnsure ? (
                            <>
                              <span aria-hidden="true">—</span>
                              <span className="visually-hidden">확인 필요</span>
                            </>
                          ) : (
                            won(line.unitPrice)
                          )}
                        </td>
                        <td
                          className={`numeric${line.ruleFail ? ' cell-fail' : ''}`}
                        >
                          {won(line.amount)}
                          {line.ruleFail && (
                            <span className="cell-hint">{line.ruleFail}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="legend">
            <span className="legend-item legend-check">확인 필요</span>
            <span className="legend-item legend-fail">규칙 검증 실패</span>
            <span className="legend-item legend-differs">발주와 다른 줄</span>
          </p>
        </section>

        <aside className="card card-form" aria-labelledby="confirm-title">
          <CardHead
            id="confirm-title"
            icon={<Icon name="check" />}
            title="확정하기"
            note="확정하기 전에는 재고가 바뀌지 않아요"
          />
          <div className="remaining">
            <strong>{remaining}</strong>
            <span>확인할 칸이 남았어요</span>
          </div>
          <p className="card-note">
            발주와 다른 줄이 있어 확정하면 <b>사장님 승인</b>으로 넘어가요. 예외
            사유를 적어 주세요
          </p>
          <div className="field">
            <label htmlFor="exception-reason">
              예외 사유 <span className="required">(필수)</span>
            </label>
            <textarea
              id="exception-reason"
              rows={3}
              placeholder="예: 바닐라 시럽이 1병 더 왔어요"
            />
          </div>
          <input
            ref={photoInputRef}
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png"
            onChange={attachPhoto}
            aria-label="사진 파일 선택"
          />
          <button
            type="button"
            className="button-secondary button-icon"
            onClick={() => photoInputRef.current?.click()}
          >
            <Icon name="photo" size={18} />
            사진 붙이기
          </button>
          {photoError && (
            <p className="field-error" role="alert">
              {photoError}
            </p>
          )}
          {photos.map((photo) => (
            <div className="inspection-photo" key={photo.id}>
              <img src={photo.src} alt="첨부한 사진 미리보기" />
              <div>
                <span>{photo.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    onPhotosChange((previous) =>
                      previous.filter((item) => item.id !== photo.id),
                    )
                    setPhotoError('')
                  }}
                >
                  사진 삭제
                </button>
              </div>
            </div>
          ))}
          {photos.length > 0 && (
            <small className="inspection-photo-note">
              사진은 새로고침 전까지 임시로 유지돼요.
            </small>
          )}
          <button type="button" className="button-primary" disabled>
            확인할 칸 {remaining}개 남음
          </button>
        </aside>
      </div>
    </div>
  )
}

export default InspectionReview
