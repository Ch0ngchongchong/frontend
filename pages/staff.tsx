import dynamic from 'next/dynamic'
const StaffHome = dynamic(() => import('../src/pages/StaffHome'), {
  ssr: false,
})
export default function Staff() {
  return <StaffHome />
}
