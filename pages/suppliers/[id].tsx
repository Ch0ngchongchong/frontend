import type { GetStaticPropsContext } from 'next'
import SupplierPage from '../../src/pages/SupplierPage'
import { SUPPLIERS } from '../../src/mocks/sample'

export default SupplierPage
export function getStaticPaths() {
  return {
    paths: SUPPLIERS.map((supplier) => ({ params: { id: supplier.id } })),
    fallback: false,
  }
}
export function getStaticProps({ params }: GetStaticPropsContext) {
  const supplierId = params?.id
  if (
    typeof supplierId !== 'string' ||
    !SUPPLIERS.some((supplier) => supplier.id === supplierId)
  )
    return { notFound: true }
  return { props: { supplierId }, revalidate: 300 }
}
