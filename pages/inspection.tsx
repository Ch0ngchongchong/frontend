import dynamic from 'next/dynamic'
import { useWorkspace } from '../src/App'
const Review = dynamic(() => import('../src/pages/InspectionReview'), {
  ssr: false,
})
export default function Inspection() {
  const { photos, setPhotos } = useWorkspace()
  return <Review photos={photos} onPhotosChange={setPhotos} />
}
