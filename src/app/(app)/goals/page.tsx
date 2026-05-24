import { createClient } from '@/lib/supabase/server'
import GoalsClient from './GoalsClient'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: goals } = await supabase
    .from('shared_goals')
    .select(`
      *,
      profiles(id, username, avatar_url),
      goal_members(user_id, profiles(username, avatar_url)),
      goal_reactions(emoji, user_id)
    `)
    .order('created_at', { ascending: false })

  return (
    <GoalsClient
      goals={goals ?? []}
      userId={user.id}
    />
  )
}
