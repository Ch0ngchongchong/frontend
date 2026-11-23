import dynamic from 'next/dynamic'
const Approval = dynamic(() => import('../src/pages/ExceptionApproval'), {
  ssr: false,
})
export default function Exceptions() {
  return <Approval />
}
