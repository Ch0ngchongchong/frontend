import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Icon, PageHeader } from '../components/ui.tsx'
import { useNav } from '../components/nav.ts'
import { saveProfile, type Profile } from '../profile.ts'

function MyPage({
  profile,
  onSave,
}: {
  profile: Profile
  onSave: (profile: Profile) => void
}) {
  const [values, setValues] = useState(profile)
  const [message, setMessage] = useState('')
  const nav = useNav()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = {
      name: values.name.trim(),
      store: values.store.trim(),
      contact: values.contact.trim(),
      email: values.email.trim(),
      photo: values.photo,
    }
    if (!next.name || !next.store) {
      setMessage('이름과 매장 이름을 입력해 주세요.')
      return
    }
    try {
      saveProfile(next)
      onSave(next)
      setValues(next)
      setMessage('프로필을 이 브라우저에 저장했어요.')
    } catch {
      setMessage('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.')
    }
  }

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.type !== 'image/png' || file.size > 1024 * 1024) {
      setMessage('1MB 이하의 PNG 사진을 선택해 주세요.')
      return
    }
    try {
      const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer())
      if (
        ![137, 80, 78, 71, 13, 10, 26, 10].every(
          (byte, index) => signature[index] === byte,
        )
      )
        throw new Error('invalid PNG')
      const bitmap = await createImageBitmap(file)
      if (bitmap.width > 4096 || bitmap.height > 4096) {
        bitmap.close()
        throw new Error('image too large')
      }
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        bitmap.close()
        throw new Error('canvas unavailable')
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const photo = canvas.toDataURL('image/png')
      setValues((previous) => ({ ...previous, photo }))
      setMessage('')
    } catch {
      setMessage(
        '올바른 PNG 사진을 선택해 주세요. 이미지 크기는 4096 × 4096 이하여야 해요.',
      )
    }
  }

  return (
    <>
      <PageHeader title="마이페이지" />
      <div className="mypage-layout">
        <section className="card mypage-card" aria-labelledby="profile-title">
          <div className="mypage-profile">
            <span className="mypage-avatar" aria-hidden="true">
              {values.photo ? (
                <img src={values.photo} alt="" />
              ) : (
                values.name.slice(0, 1)
              )}
            </span>
            <div>
              <h2 id="profile-title">{profile.name}</h2>
              <p>{profile.store}</p>
            </div>
          </div>
          <p className="mypage-note">
            프로필은 이 브라우저에만 저장돼요. 계정과 매장 데이터에는 반영되지
            않습니다.
          </p>
          <form onSubmit={submit} className="mypage-form">
            <div className="profile-photo-upload">
              <span className="profile-photo-icon" aria-hidden="true">
                <Icon name="camera" size={21} />
              </span>
              <div className="profile-photo-content">
                <strong>프로필 사진</strong>
                <p>PNG 파일 · 최대 1MB</p>
                <div className="profile-photo-actions">
                  <label
                    className="profile-photo-select"
                    htmlFor="profile-photo"
                  >
                    {values.photo ? '사진 변경' : '사진 선택'}
                  </label>
                  {values.photo && (
                    <button
                      type="button"
                      className="profile-photo-remove"
                      onClick={() => setValues({ ...values, photo: '' })}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
              <input
                id="profile-photo"
                className="profile-photo-input"
                type="file"
                accept="image/png,.png"
                aria-describedby="profile-photo-hint"
                onChange={selectPhoto}
              />
              <span id="profile-photo-hint" className="visually-hidden">
                PNG 파일만 선택할 수 있으며 최대 크기는 1MB입니다. 프로필 저장을
                눌러야 사진이 저장됩니다.
              </span>
            </div>
            <div className="field">
              <label htmlFor="profile-name">
                이름 <span className="required">(필수)</span>
              </label>
              <input
                id="profile-name"
                value={values.name}
                maxLength={30}
                onChange={(event) => {
                  setValues({ ...values, name: event.target.value })
                  setMessage('')
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-store">
                매장 이름 <span className="required">(필수)</span>
              </label>
              <input
                id="profile-store"
                value={values.store}
                maxLength={40}
                onChange={(event) => {
                  setValues({ ...values, store: event.target.value })
                  setMessage('')
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="profile-email">이메일</label>
              <input
                id="profile-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={values.email}
                placeholder="이메일을 입력해 주세요"
                onChange={(event) => {
                  setValues({ ...values, email: event.target.value })
                  setMessage('')
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-contact">연락처</label>
              <input
                id="profile-contact"
                type="tel"
                value={values.contact}
                maxLength={30}
                placeholder="연락처를 입력해 주세요"
                onChange={(event) => {
                  setValues({ ...values, contact: event.target.value })
                  setMessage('')
                }}
              />
            </div>
            {message && (
              <p className="mypage-message" role="status">
                {message}
              </p>
            )}
            <button className="button-primary" type="submit">
              프로필 저장
            </button>
          </form>
        </section>
        <aside className="card mypage-card" aria-labelledby="quick-title">
          <h2 id="quick-title" className="mypage-section-title">
            자주 찾는 메뉴
          </h2>
          <p className="mypage-note">필요한 업무 화면으로 바로 이동해요.</p>
          <div className="mypage-links">
            <button type="button" onClick={() => nav.navigate('products')}>
              <Icon name="box" /> 상품 관리 <span>›</span>
            </button>
            <button type="button" onClick={() => nav.navigate('calendar')}>
              <Icon name="truck" /> 입고 달력 <span>›</span>
            </button>
            <button type="button" onClick={() => nav.navigate('history')}>
              <Icon name="clock" /> 변경 이력 <span>›</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}

export default MyPage
