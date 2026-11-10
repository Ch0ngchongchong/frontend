import { useRouter } from 'next/router'
import { useSuppliers } from '../api/suppliers'
import { CardHead, Icon, PageHeader } from '../components/ui'
import { useNav } from '../components/nav'

export default function SupplierPage() {
  const router = useRouter()
  const nav = useNav()
  const suppliers = useSuppliers()
  const id = typeof router.query.id === 'string' ? router.query.id : null
  const supplier = suppliers.data?.find((item) => String(item.id) === id)
  return (
    <div className="supplier-page">
      <PageHeader
        title={supplier?.name ?? '거래처 상세'}
        parents={[{ label: '거래처', screen: 'suppliers' }]}
      />
      <section className="card" aria-labelledby="supplier-info-title">
        <CardHead
          id="supplier-info-title"
          icon={<Icon name="store" />}
          title="거래처 기본 정보"
          right={
            <button
              className="button-secondary"
              onClick={() => nav.navigate('suppliers')}
            >
              거래처 관리
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
        {!supplier && (suppliers.data || suppliers.error) && (
          <p className="card-note">표시할 거래처가 없어요.</p>
        )}
        {supplier && (
          <dl className="info-grid">
            {[
              ['거래처 이름', supplier.name],
              ['분류', supplier.category],
              ['배송 요일', supplier.deliveryDays],
              ['주문 마감', supplier.orderCutoff],
              ['거래 시작', supplier.since],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || '미등록'}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}
