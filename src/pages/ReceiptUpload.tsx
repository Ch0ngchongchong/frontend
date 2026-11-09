import { useRef, useState, type ChangeEvent } from 'react'
import {
  CardHead,
  Pill,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import { INSPECTIONS } from '../mocks/sample.ts'

// 명세서 업로드 (직원) 화면 — 디자인 시안 (PRD 5절 / US-03 / F-03)
// 업로드 대기 → 판독 중 → 직원 확인 대기, 판독 실패 시 업로드 대기로 돌아와 다시 올려 달라고 알린다

function ReceiptUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const selectionVersion = useRef(0)
  const [fileMessage, setFileMessage] = useState('')
  const [fileError, setFileError] = useState(false)
  const waiting = INSPECTIONS.filter((item) => item.status === '업로드 대기')
  const reading = INSPECTIONS.filter((item) => item.status === '판독 중')
  const [selectedId, setSelectedId] = useState(waiting[0]?.id)
  const selected = waiting.find((item) => item.id === selectedId) ?? waiting[0]

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const version = ++selectionVersion.current
    event.target.value = ''
    if (!file) return
    setFileError(true)
    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      (file.type && file.type !== 'application/pdf') ||
      file.size === 0 ||
      file.size > 10 * 1024 * 1024
    ) {
      setFileMessage('10MB 이하의 PDF 파일을 선택해 주세요.')
      return
    }
    try {
      const header = new Uint8Array(await file.slice(0, 5).arrayBuffer())
      if (version !== selectionVersion.current) return
      if (
        ![0x25, 0x50, 0x44, 0x46, 0x2d].every(
          (byte, index) => header[index] === byte,
        )
      )
        throw new Error('invalid PDF')
      setFileError(false)
      setFileMessage(
        'PDF 파일을 확인했어요. 업로드 기능은 아직 연결되지 않았어요.',
      )
    } catch {
      if (version !== selectionVersion.current) return
      setFileMessage('올바른 PDF 파일을 선택해 주세요.')
    }
  }

  return (
    <>
      <PageHeader title="명세서 업로드" screen="upload" />

      <StatusSummary
        items={[
          {
            label: '업로드 대기',
            value: waiting.length,
            status: '업로드 대기',
          },
          { label: '판독 중', value: reading.length, status: '판독 중' },
        ]}
      />
      <div className="layout-main">
        <section className="card" aria-labelledby="upload-title">
          <CardHead
            id="upload-title"
            icon={<Icon name="upload" />}
            title="명세서 올리기"
            note={
              selected
                ? `${selected.id} · ${selected.supplier} · 발주 ${selected.orderId}`
                : '올릴 명세서가 없어요'
            }
          />
          <div className="dropzone">
            <span className="dropzone-icon" aria-hidden="true">
              <Icon name="upload" size={28} />
            </span>
            <p className="dropzone-title">거래명세서 PDF 파일을 올려 주세요</p>
            <p className="dropzone-note">PDF 파일만 올릴 수 있어요.</p>
            <div className="dropzone-actions">
              <input
                ref={fileRef}
                className="visually-hidden"
                type="file"
                accept=".pdf,application/pdf"
                onChange={selectFile}
                aria-label="PDF 파일 선택"
              />
              <button
                type="button"
                className="button-primary button-upload"
                disabled={!selected}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="upload" size={20} />
                파일 업로드
              </button>
            </div>
            {fileMessage && (
              <p
                className={fileError ? 'field-error' : 'dropzone-note'}
                role={fileError ? 'alert' : 'status'}
              >
                {fileMessage}
              </p>
            )}
          </div>
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="waiting-title">
            <CardHead
              id="waiting-title"
              icon={<Icon name="list" />}
              title="올릴 명세서"
              right={<span className="chip">{waiting.length}건</span>}
            />
            <ul className="pick-list">
              {waiting.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`pick-item${item.id === selected?.id ? ' is-selected' : ''}`}
                    aria-pressed={item.id === selected?.id}
                    onClick={() => {
                      selectionVersion.current++
                      setSelectedId(item.id)
                      setFileMessage('')
                      setFileError(false)
                    }}
                  >
                    <span>
                      <strong>{item.supplier}</strong>
                      <small>
                        {item.id} · 발주 {item.orderId} · {item.lineCount}품목
                      </small>
                    </span>
                    {item.note ? (
                      <Pill tone="danger" icon="xCircle">
                        다시 올리기
                      </Pill>
                    ) : (
                      <StatusPill status={item.status} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" aria-labelledby="reading-title">
            <CardHead
              id="reading-title"
              icon={<Icon name="scan" />}
              title="판독 중"
              note="끝나면 입고 확인에서 볼 수 있어요"
            />
            {reading.map((item) => (
              <div className="reading-row" key={item.id}>
                <span>
                  <strong>{item.supplier}</strong>
                  <small>
                    {item.id} · {item.uploadedAt} 올림
                  </small>
                </span>
                <StatusPill status={item.status} />
                <div className="reading-bar" aria-hidden="true">
                  <span />
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  )
}

export default ReceiptUpload
