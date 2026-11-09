import { CardHead, Icon, PageHeader, Pill } from '../components/ui.tsx'
import { HISTORY, READ_LOG } from '../mocks/sample.ts'

// 변경 이력 (사장님) 화면 — 디자인 시안 (PRD 5절 / US-07 / F-07)
// 입고 검수 건별 변경자·시각·이전 값·새 값을 시간순으로 보여 준다. 조회만, 수정·삭제 불가

const INSPECTION_IDS = ['IN-1048', 'IN-1047', 'IN-1046']

function ChangeHistory() {
  return (
    <>
      <PageHeader title="변경 이력" screen="history" />

      <div className="filter-row" role="group" aria-label="입고 검수 건 고르기">
        {INSPECTION_IDS.map((id, index) => (
          <button
            type="button"
            key={id}
            className={`filter-chip${index === 0 ? ' is-selected' : ''}`}
            aria-pressed={index === 0}
          >
            {id}
          </button>
        ))}
      </div>

      <section className="stats" aria-label="판독 기록">
        <article className="card stat">
          <div className="stat-top">
            <span>LLM 호출 비용</span>
            <span className="stat-icon">
              <Icon name="coin" size={18} />
            </span>
          </div>
          <p className="stat-value">
            {READ_LOG.cost}
            <small>원</small>
          </p>
          <p className="stat-sub">{READ_LOG.inspectionId} 판독 1회</p>
        </article>
        <article className="card stat">
          <div className="stat-top">
            <span>처리 시간</span>
            <span className="stat-icon">
              <Icon name="clock" size={18} />
            </span>
          </div>
          <p className="stat-value">
            {READ_LOG.elapsedSeconds}
            <small>초</small>
          </p>
          <p className="stat-sub">업로드부터 직원 확인 대기까지</p>
        </article>
        <article className="card stat">
          <div className="stat-top">
            <span>토큰</span>
            <span className="stat-icon">
              <Icon name="scan" size={18} />
            </span>
          </div>
          <p className="stat-value">
            {(READ_LOG.inputTokens + READ_LOG.outputTokens).toLocaleString(
              'ko-KR',
            )}
            <small>개</small>
          </p>
          <p className="stat-sub">
            입력 {READ_LOG.inputTokens.toLocaleString('ko-KR')} · 출력{' '}
            {READ_LOG.outputTokens.toLocaleString('ko-KR')}
          </p>
        </article>
      </section>

      <section className="card" aria-labelledby="timeline-title">
        <CardHead
          id="timeline-title"
          icon={<Icon name="clock" />}
          title="IN-1048 변경 기록"
          note="기록은 누구도 고치거나 지울 수 없어요"
          right={<span className="chip">{HISTORY.length}개</span>}
        />
        <ol className="timeline">
          {HISTORY.map((entry, index) => (
            <li key={index} className="timeline-item">
              <span className="timeline-dot" aria-hidden="true" />
              <div className="timeline-body">
                <p className="timeline-meta">
                  <span>{entry.at}</span>
                  <span>{entry.by}</span>
                  <Pill tone="muted" icon="clock">
                    {entry.kind}
                  </Pill>
                </p>
                <p className="timeline-change">
                  <span className="timeline-field">{entry.field}</span>
                  <span className="old-value">{entry.oldValue}</span>
                  <span aria-hidden="true">→</span>
                  <span className="visually-hidden">에서</span>
                  <strong>{entry.newValue}</strong>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

export default ChangeHistory
