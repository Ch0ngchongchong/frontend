import dynamic from 'next/dynamic'
import { useWorkspace } from '../src/App'
const Approval = dynamic(() => import('../src/pages/ExceptionApproval'), {
  ssr: false,
})
export default function Exceptions() {
  const { photos } = useWorkspace()
  return <Approval photos={photos} />
}
