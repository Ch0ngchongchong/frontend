import dynamic from 'next/dynamic'
import { useWorkspace } from '../src/App'
const Profile = dynamic(() => import('../src/pages/MyPage'), { ssr: false })
export default function MyProfile() {
  const { profile, setProfile, session, signOut } = useWorkspace()
  if (!session) return null
  return (
    <Profile
      key={`${session.userId}:${JSON.stringify(profile)}`}
      profile={profile}
      role={session.role}
      onSave={setProfile}
      onSignOut={signOut}
    />
  )
}
