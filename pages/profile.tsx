import dynamic from 'next/dynamic'
import { useWorkspace } from '../src/App'
const Profile = dynamic(() => import('../src/pages/MyPage'), { ssr: false })
export default function MyProfile() {
  const { profile, setProfile } = useWorkspace()
  return (
    <Profile
      key={JSON.stringify(profile)}
      profile={profile}
      onSave={setProfile}
    />
  )
}
