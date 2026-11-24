import { useState } from 'react'
import { ACCOUNTS, login } from '../session'
import { Icon } from '../components/ui.tsx'

// 로그인 (client-meeting-2 피드백 7). 역할을 고르면 그 역할의 화면과 메뉴만 보인다.
// 서버에 아직 로그인 API가 없어 비밀번호 없이 시드 계정을 고른다 (API.md 공통 규칙 [제안]).
// 로그인하면 App이 원래 보려던 화면이나 역할별 첫 화면으로 옮긴다.
export default function LoginScreen() {
  const [error, setError] = useState('')
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="box" size={22} />
          </span>
          <strong>딱 재고</strong>
        </div>
        <h1 id="login-title">누구로 들어갈까요?</h1>
        <p className="login-note">역할에 맞는 화면과 메뉴만 보여 드려요.</p>
        <div className="login-accounts">
          {ACCOUNTS.map((account) => (
            <button
              type="button"
              key={account.userId}
              className="login-account"
              onClick={() => {
                try {
                  login(account.userId)
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : '로그인하지 못했어요',
                  )
                }
              }}
            >
              <span className="login-account-icon" aria-hidden="true">
                <Icon
                  name={account.role === '직원' ? 'camera' : 'store'}
                  size={26}
                />
              </span>
              <span className="login-account-text">
                <strong>{account.role}으로 시작</strong>
                <small>{account.description}</small>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <p className="login-footnote">
          시험용 계정이에요. 서버에 로그인 기능이 생기면 아이디·비밀번호
          로그인으로 바뀌어요.
        </p>
      </section>
    </main>
  )
}
