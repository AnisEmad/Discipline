import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)

  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .eq('user_id', user.id)

  const { data: activity } = await supabase
    .from('activity_feed')
    .select('*, habits(name, emoji, color)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <ProfileClient
      profile={profile}
      habits={habits ?? []}
      badges={badges ?? []}
      activity={activity ?? []}
      userId={user.id}
    />
  )
}
