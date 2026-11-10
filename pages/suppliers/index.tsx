export { default } from '../../src/pages/SupplierList'

// Only shared design-sample data is used here; authenticated supplier data must use SSR.
export function getStaticProps() {
  return { props: {}, revalidate: 300 }
}
