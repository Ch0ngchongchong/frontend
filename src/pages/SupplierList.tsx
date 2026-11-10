import { useState, type FormEvent } from 'react'
import { useNav } from '../components/nav'
import { CardHead, Icon, PageHeader } from '../components/ui'
import {
  deleteSupplier,
  saveSupplier,
  useSuppliers,
  type Supplier,
  type SupplierInput,
} from '../api/suppliers'

const emptyInput: SupplierInput = {
  name: '',
  category: '',
  deliveryDays: '',
  orderCutoff: '',
  since: '',
}
const fields: { key: keyof SupplierInput; label: string }[] = [
  { key: 'name', label: '거래처 이름' },
  { key: 'category', label: '분류' },
  { key: 'deliveryDays', label: '배송 요일' },
  { key: 'orderCutoff', label: '주문 마감' },
  { key: 'since', label: '거래 시작일' },
]

export default function SupplierList() {
  const nav = useNav()
  const suppliers = useSuppliers()
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const [draft, setDraft] = useState<SupplierInput>(emptyInput)
  const [removing, setRemoving] = useState<Supplier | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const rows = suppliers.data ?? []

  function edit(supplier: Supplier | 'new') {
    setEditing(supplier)
    setDraft(
      supplier === 'new'
        ? emptyInput
        : {
            name: supplier.name,
            category: supplier.category ?? '',
            deliveryDays: supplier.deliveryDays ?? '',
            orderCutoff: supplier.orderCutoff ?? '',
            since: supplier.since ?? '',
          },
    )
    setRemoving(null)
    setError('')
    setNotice('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!editing || pending) return
    setPending(true)
    setError('')
    try {
      const saved = await saveSupplier(
        editing === 'new' ? null : editing.id,
        Object.fromEntries(
          Object.entries(draft).map(([key, value]) => [key, value.trim()]),
        ) as SupplierInput,
      )
      await suppliers.mutate(
        (current) => [
          ...(current ?? []).filter(
            (item) => String(item.id) !== String(saved.id),
          ),
          saved,
        ],
        { revalidate: false },
      )
      setEditing(null)
      setNotice('거래처를 저장했어요.')
      void suppliers.mutate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '거래처를 저장하지 못했어요.',
      )
    } finally {
      setPending(false)
    }
  }

  async function remove() {
    if (!removing || pending) return
    setPending(true)
    setError('')
    try {
      await deleteSupplier(removing.id)
      await suppliers.mutate(
        (current) =>
          current?.filter((item) => String(item.id) !== String(removing.id)),
        { revalidate: false },
      )
      setRemoving(null)
      setNotice('거래처를 삭제했어요.')
      void suppliers.mutate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '거래처를 삭제하지 못했어요.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <PageHeader title="거래처" screen="suppliers" />
      {notice && <p role="status">{notice}</p>}
      <section className="card" aria-labelledby="supplier-list-title">
        <CardHead
          id="supplier-list-title"
          icon={<Icon name="store" />}
          title="연결된 거래처"
          note={`${rows.length}곳 · 등록된 거래처 정보를 관리해요`}
          right={
            <button
              className="button-primary"
              disabled={pending}
              onClick={() => edit('new')}
            >
              거래처 추가
            </button>
          }
        />
        {!suppliers.data && !suppliers.error && (
          <p role="status">거래처를 불러오고 있어요.</p>
        )}
        {suppliers.error && (
          <p className="field-error" role="alert">
            거래처 서버에 연결하지 못했어요.{' '}
            <button
              className="button-text"
              onClick={() => void suppliers.mutate()}
            >
              다시 시도
            </button>
          </p>
        )}
        {rows.length === 0 && (suppliers.data || suppliers.error) && (
          <p className="card-note">
            등록된 거래처가 없어요.
            {suppliers.error
              ? ' API 연결 후 다시 시도해 주세요.'
              : ' 거래처를 추가해 주세요.'}
          </p>
        )}
        <ul className="supplier-rows">
          {rows.map((supplier) => (
            <li key={supplier.id} className="supplier-management-row">
              <button
                className="supplier-row"
                onClick={() => nav.openSupplier(String(supplier.id))}
              >
                <span
                  className="supplier-avatar supplier-avatar-lg"
                  aria-hidden="true"
                >
                  <Icon name="store" size={22} />
                </span>
                <span className="supplier-row-main">
                  <strong>{supplier.name}</strong>
                  <small>
                    {supplier.category || '분류 미등록'} ·{' '}
                    {supplier.deliveryDays || '배송 요일 미등록'}
                  </small>
                </span>
                <span className="chevron" aria-hidden="true">
                  ›
                </span>
              </button>
              <div className="supplier-management-actions">
                <button
                  className="button-secondary"
                  disabled={pending}
                  aria-label={`${supplier.name} 수정`}
                  onClick={() => edit(supplier)}
                >
                  수정
                </button>
                <button
                  className="button-secondary"
                  disabled={pending}
                  aria-label={`${supplier.name} 삭제`}
                  onClick={() => {
                    setRemoving(supplier)
                    setEditing(null)
                    setError('')
                    setNotice('')
                  }}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {editing && (
        <section
          className="card card-form"
          aria-labelledby="supplier-form-title"
        >
          <CardHead
            id="supplier-form-title"
            icon={<Icon name="store" />}
            title={editing === 'new' ? '거래처 추가' : '거래처 수정'}
            note="저장한 정보는 서버에 반영돼요"
          />
          <form onSubmit={submit} className="supplier-management-form">
            <div className="field-grid">
              {fields.map(({ key, label }) => (
                <div className="field" key={key}>
                  <label htmlFor={`supplier-${key}`}>
                    {label}
                    {key === 'name' && <span className="required"> *</span>}
                  </label>
                  <input
                    id={`supplier-${key}`}
                    required={key === 'name'}
                    type={key === 'since' ? 'date' : 'text'}
                    value={draft[key]}
                    disabled={pending}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="supplier-management-actions">
              <button
                type="submit"
                className="button-primary"
                disabled={pending || !draft.name.trim()}
              >
                {pending ? '저장 중…' : '저장'}
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={pending}
                onClick={() => {
                  setEditing(null)
                  setError('')
                }}
              >
                취소
              </button>
            </div>
          </form>
        </section>
      )}
      {removing && (
        <section className="card" aria-labelledby="supplier-delete-title">
          <CardHead
            id="supplier-delete-title"
            icon={<Icon name="store" />}
            title="거래처 삭제"
            note={`${removing.name} 거래처를 삭제할까요? 삭제 후 되돌릴 수 없어요.`}
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="supplier-management-actions">
            <button
              className="button-primary"
              disabled={pending}
              onClick={() => void remove()}
            >
              {pending ? '삭제 중…' : '삭제 확인'}
            </button>
            <button
              className="button-secondary"
              disabled={pending}
              onClick={() => {
                setRemoving(null)
                setError('')
              }}
            >
              취소
            </button>
          </div>
        </section>
      )}
    </>
  )
}
