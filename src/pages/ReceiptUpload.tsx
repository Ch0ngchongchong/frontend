import { useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/router'
import { useSWRConfig } from 'swr'
import {
  CardHead,
  Pill,
  StatusSummary,
  Icon,
  PageHeader,
  StatusPill,
} from '../components/ui.tsx'
import { request } from '../api/client'
import { useInspections, type Inspection } from '../api/inspections'
import { useOrders } from '../api/workspace'

function ReceiptUpload() {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { data: inspections = [], error, isLoading } = useInspections()
  const { data: orders = [], error: ordersError } = useOrders()
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadInFlight = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [fileMessage, setFileMessage] = useState('')
  const [fileError, setFileError] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const waiting = inspections.filter((item) => item.status === '업로드 대기')
  const reading = inspections.filter((item) => item.status === '판독 중')
  const ready = inspections.filter((item) => item.status === '직원 확인 대기')
  const available = [...waiting, ...reading, ...ready]
  const selected =
    available.find((item) => item.id === selectedId) ?? available[0]
  const canUpload = selected?.status === '업로드 대기' && !uploading

  function supplier(item: Inspection) {
    return (
      orders.find((order) => order.id === item.purchase_order_id)?.supplier ||
      `발주 ${item.purchase_order_id}`
    )
  }

  function selectInspection(id: number) {
    setSelectedId(id)
    setFileMessage('')
    setFileError(false)
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (
      !file ||
      !selected ||
      selected.status !== '업로드 대기' ||
      uploadInFlight.current
    )
      return
    setFileError(true)
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      heic: 'image/heic',
      pdf: 'application/pdf',
      txt: 'text/plain',
    }
    const contentType =
      file.type || types[file.name.split('.').pop()?.toLowerCase() ?? '']
    if (!contentType || !Object.values(types).includes(contentType)) {
      setFileMessage('JPG, PNG, HEIC, PDF 또는 TXT 파일을 선택해 주세요.')
      return
    }
    if (file.size === 0) {
      setFileMessage('빈 파일입니다. 내용이 있는 명세서를 선택해 주세요.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileMessage('10MB 이하 파일만 올릴 수 있어요.')
      return
    }
    const inspectionId = selected.id
    uploadInFlight.current = true
    setUploading(true)
    setFileError(false)
    setSelectedId(inspectionId)
    setFileMessage('명세서를 업로드하고 있어요.')
    try {
      const body = new FormData()
      body.append(
        'file',
        file.type ? file : new File([file], file.name, { type: contentType }),
      )
      const updated = await request<Inspection>(
        `/inspections/${inspectionId}/document`,
        {
          method: 'POST',
          body,
        },
      )
      await Promise.all([
        mutate(['inspection', '1', updated.id], updated, { revalidate: false }),
        mutate(
          ['inspections', '1'],
          (current: Inspection[] | undefined) =>
            current?.some((item) => item.id === updated.id)
              ? current.map((item) => (item.id === updated.id ? updated : item))
              : [...(current ?? []), updated],
          { revalidate: false },
        ),
      ])
      setFileMessage(
        '명세서를 업로드했어요. 서버에서 판독 결과를 확인하고 있어요.',
      )
      void mutate(['inspections', '1'])
      void mutate(['inspection', '1', updated.id])
    } catch (uploadError) {
      setFileError(true)
      setFileMessage(
        uploadError instanceof Error
          ? uploadError.message
          : '명세서를 업로드하지 못했어요.',
      )
    } finally {
      uploadInFlight.current = false
      setUploading(false)
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
          {
            label: '직원 확인 대기',
            value: ready.length,
            status: '직원 확인 대기',
          },
        ]}
      />
      {isLoading && <p role="status">검수 목록을 불러오고 있어요.</p>}
      {error && (
        <p className="field-error" role="alert">
          {error instanceof Error
            ? error.message
            : '검수 목록을 불러오지 못했어요.'}
        </p>
      )}
      {ordersError && (
        <p className="field-error" role="alert">
          거래처 이름을 불러오지 못했어요. 발주 번호로 확인해 주세요.
        </p>
      )}
      <div className="layout-main">
        <section className="card" aria-labelledby="upload-title">
          <CardHead
            id="upload-title"
            icon={<Icon name="upload" />}
            title="명세서 올리기"
            note={
              selected
                ? `${selected.id} · ${supplier(selected)} · 발주 ${selected.purchase_order_id}`
                : '올릴 명세서가 없어요'
            }
          />
          <div className="dropzone">
            <span className="dropzone-icon" aria-hidden="true">
              <Icon name="upload" size={28} />
            </span>
            <p className="dropzone-title">
              거래명세서 사진이나 PDF 파일을 올려 주세요
            </p>
            <p className="dropzone-note">
              JPG · PNG · HEIC · PDF · TXT, 최대 10MB
            </p>
            <div className="dropzone-actions">
              <input
                ref={fileRef}
                className="visually-hidden"
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.pdf,.txt,image/jpeg,image/png,image/heic,application/pdf,text/plain"
                disabled={!canUpload}
                onChange={selectFile}
                aria-label="명세서 파일 선택"
              />
              <button
                type="button"
                className="button-primary button-upload"
                disabled={!canUpload}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="upload" size={20} />
                {uploading ? '업로드 중…' : '파일 업로드'}
              </button>
              {selected?.status === '직원 확인 대기' && (
                <button
                  type="button"
                  className="button-primary"
                  onClick={() =>
                    void router.push(`/inspection?id=${selected.id}`)
                  }
                >
                  입고 확인하기
                </button>
              )}
            </div>
            {selected?.status === '판독 중' && (
              <p className="dropzone-note" role="status">
                판독 중이에요. 완료되면 입고 확인하기를 선택해 주세요.
              </p>
            )}
            {selected?.document?.read_error && (
              <p className="field-error" role="alert">
                {selected.document.read_error}
              </p>
            )}
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
            {!isLoading && !error && waiting.length === 0 && (
              <p className="dropzone-note">업로드할 명세서가 없어요.</p>
            )}
            <ul className="pick-list">
              {waiting.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={uploading}
                    className={`pick-item${item.id === selected?.id ? ' is-selected' : ''}`}
                    aria-pressed={item.id === selected?.id}
                    onClick={() => selectInspection(item.id)}
                  >
                    <span>
                      <strong>{supplier(item)}</strong>
                      <small>
                        {item.id} · 발주 {item.purchase_order_id}
                      </small>
                      {item.document?.read_error && (
                        <small className="field-error">
                          {item.document.read_error}
                        </small>
                      )}
                    </span>
                    {item.document?.read_error ? (
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
            {!isLoading && !error && reading.length === 0 && (
              <p className="dropzone-note">판독 중인 명세서가 없어요.</p>
            )}
            {reading.map((item) => (
              <div className="reading-row" key={item.id}>
                <button
                  type="button"
                  className={`pick-item${item.id === selected?.id ? ' is-selected' : ''}`}
                  disabled={uploading}
                  aria-pressed={item.id === selected?.id}
                  onClick={() => selectInspection(item.id)}
                >
                  <span>
                    <strong>{supplier(item)}</strong>
                    <small>
                      {item.id} ·{' '}
                      {item.document?.filename ??
                        `발주 ${item.purchase_order_id}`}
                    </small>
                  </span>
                  <StatusPill status={item.status} />
                </button>
                <div className="reading-bar" aria-hidden="true">
                  <span />
                </div>
              </div>
            ))}
          </section>

          <section className="card" aria-labelledby="ready-title">
            <CardHead
              id="ready-title"
              icon={<Icon name="list" />}
              title="직원 확인 대기"
              right={<span className="chip">{ready.length}건</span>}
            />
            {!isLoading && !error && ready.length === 0 && (
              <p className="dropzone-note">확인할 명세서가 없어요.</p>
            )}
            <ul className="pick-list">
              {ready.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="pick-item"
                    disabled={uploading}
                    onClick={() =>
                      void router.push(`/inspection?id=${item.id}`)
                    }
                  >
                    <span>
                      <strong>{supplier(item)}</strong>
                      <small>
                        {item.id} · 발주 {item.purchase_order_id} ·{' '}
                        {item.lines.length}품목
                      </small>
                    </span>
                    <StatusPill status={item.status} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}

export default ReceiptUpload
