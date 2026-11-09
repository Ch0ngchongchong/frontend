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
  const waiting = INSPECTIONS.filter((item) => item.status === '업로드 대기')
  const reading = INSPECTIONS.filter((item) => item.status === '판독 중')
  const failed = waiting.find((item) => item.note)
  const selected = waiting[0]

  return (
    <>
      <PageHeader title="명세서 업로드" screen="upload" />

      {failed && (
        <div className="banner banner-danger" role="alert">
          <p>
            {failed.id} · {failed.note}
          </p>
        </div>
      )}

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
            note={`${selected.id} · ${selected.supplier} · 발주 ${selected.orderId}`}
          />
          <div className="dropzone">
            <span className="dropzone-icon" aria-hidden="true">
              <Icon name="upload" size={28} />
            </span>
            <p className="dropzone-title">
              거래명세서 사진이나 PDF 파일을 올려 주세요
            </p>
            <p className="dropzone-note">
              사진(JPG·PNG)이나 PDF만 올릴 수 있어요. 글자가 잘리지 않게 한 장
              전체가 나오게 찍어 주세요
            </p>
            <div className="dropzone-actions">
              <button type="button" className="button-primary button-upload">
                <Icon name="upload" size={20} />
                파일 업로드
              </button>
            </div>
          </div>
          <p className="card-note">
            거래처 담당자 이름·연락처·사업자 정보는 이 기기에서 가린 뒤 보내요.
            원본 사진은 AI에 보내지 않아요
          </p>
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
                    className={`pick-item${item.id === selected.id ? ' is-selected' : ''}`}
                    aria-pressed={item.id === selected.id}
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
