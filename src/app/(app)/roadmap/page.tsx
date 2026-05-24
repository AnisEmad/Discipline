import { createClient } from '@/lib/supabase/server'
import RoadmapClient from './RoadmapClient'

export default async function RoadmapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .order('category')
    .order('order_index')

  const { data: userMilestones } = await supabase
    .from('user_milestones')
    .select('*')
    .eq('user_id', user.id)

  // Group progress for all users (for group view)
  const { data: allUserMilestones } = await supabase
    .from('user_milestones')
    .select('*, profiles(username, avatar_url)')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')

  return (
    <RoadmapClient
      milestones={milestones ?? []}
      userMilestones={userMilestones ?? []}
      allUserMilestones={allUserMilestones ?? []}
      profiles={profiles ?? []}
      userId={user.id}
    />
  )
}
