import { useEffect, useState, type FormEvent } from 'react'
import { CardHead, Icon } from './ui.tsx'

type OrderLimit = { id: number; product: string; limit: number; unit: string }
const ENDPOINT = '/api/purchase-order-limits'

async function request(path = '', init?: RequestInit) {
  const response = await fetch(`${ENDPOINT}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-User-Id': '1' },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.error?.message ??
        (typeof body?.detail === 'string'
          ? body.detail
          : `발주 한도 요청에 실패했어요 (${response.status})`),
    )
  }
  return response.status === 204 ? null : response.json()
}

export default function OrderLimits({
  onChange,
}: {
  onChange: (limits: OrderLimit[]) => void
}) {
  const [limits, setLimits] = useState<OrderLimit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [product, setProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    request()
      .then((data: OrderLimit[]) => {
        if (active) {
          setLimits(data)
          onChange(data)
        }
      })
      .catch(() => {
        if (active) {
          setLimits([])
          onChange([])
          setError('서버 연결 후 다시 시도해 주세요.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [onChange])

  function update(next: OrderLimit[]) {
    setLimits(next)
    onChange(next)
  }
  function close() {
    setOpen(false)
    setEditing(null)
    setProduct('')
    setQuantity('')
    setUnit('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (
      !product.trim() ||
      !unit.trim() ||
      !Number.isSafeInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {
      setError('상품명·단위와 1 이상의 정수 한도를 입력해 주세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved: OrderLimit = await request(
        editing === null ? '' : `/${editing}`,
        {
          method: editing === null ? 'POST' : 'PATCH',
          body: JSON.stringify({
            product: product.trim(),
            limit: Number(quantity),
            unit: unit.trim(),
          }),
        },
      )
      update(
        editing === null
          ? [...limits, saved]
          : limits.map((item) => (item.id === editing ? saved : item)),
      )
      close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '저장하지 못했어요')
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: OrderLimit) {
    if (!window.confirm(`${item.product} 발주 한도를 삭제할까요?`)) return
    setBusy(true)
    setError('')
    try {
      await request(`/${item.id}`, { method: 'DELETE' })
      update(limits.filter((row) => row.id !== item.id))
      if (editing === item.id) close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '삭제하지 못했어요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card order-limits" aria-labelledby="order-limits-title">
      <CardHead
        id="order-limits-title"
        icon={<Icon name="box" />}
        title="상품별 발주 한도"
        right={
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => {
              close()
              setOpen(true)
            }}
          >
            한도 추가
          </button>
        }
      />
      <p>{loading ? '불러오는 중…' : `${limits.length}개`}</p>
      {error && (
        <p role="alert" className="banner banner-error">
          {error}
        </p>
      )}
      {!loading && limits.length === 0 && <p>등록된 발주 한도가 없어요.</p>}
      {limits.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">상품</th>
                <th scope="col">발주 한도</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              {limits.map((item) => (
                <tr key={item.id}>
                  <td>{item.product}</td>
                  <td>
                    {item.limit}
                    {item.unit}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="button-small"
                        disabled={busy}
                        aria-label={`${item.product} 한도 수정`}
                        onClick={() => {
                          setEditing(item.id)
                          setProduct(item.product)
                          setQuantity(String(item.limit))
                          setUnit(item.unit)
                          setOpen(true)
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="button-small button-danger-text"
                        disabled={busy}
                        aria-label={`${item.product} 한도 삭제`}
                        onClick={() => void remove(item)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <form className="product-form" onSubmit={save}>
          <h3>{editing === null ? '발주 한도 추가' : '발주 한도 수정'}</h3>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="limit-product">상품명</label>
              <input
                id="limit-product"
                required
                value={product}
                disabled={busy}
                onChange={(e) => setProduct(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="limit-quantity">발주 한도</label>
              <input
                id="limit-quantity"
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                disabled={busy}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="limit-unit">단위</label>
              <input
                id="limit-unit"
                required
                value={unit}
                disabled={busy}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="row-actions">
            <button
              type="button"
              className="button-secondary"
              disabled={busy}
              onClick={close}
            >
              취소
            </button>
            <button type="submit" className="button-primary" disabled={busy}>
              {busy ? '처리 중…' : '한도 저장'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
