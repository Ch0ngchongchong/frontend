import dynamic from 'next/dynamic'
const Review = dynamic(() => import('../src/pages/InspectionReview'), {
  ssr: false,
})
export default function Inspection() {
  return <Review />
}
