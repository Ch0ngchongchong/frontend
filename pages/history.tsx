import dynamic from 'next/dynamic'
export default dynamic(() => import('../src/pages/ChangeHistory'), {
  ssr: false,
})
