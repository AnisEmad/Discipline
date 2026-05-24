import { createClient } from '@/lib/supabase/server'
import SessionsClient from './SessionsClient'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myActive } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  const { data: history } = await supabase
    .from('study_sessions')
    .select('*, profiles(username, avatar_url)')
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(50)

  const { data: allActive } = await supabase
    .from('study_sessions')
    .select('*, profiles(username, avatar_url)')
    .eq('status', 'active')
    .order('started_at', { ascending: false })

  // Stats per user
  const { data: stats } = await supabase
    .from('study_sessions')
    .select('user_id, duration_minutes')
    .eq('status', 'completed')

  return (
    <SessionsClient
      activeSession={myActive ?? null}
      history={history ?? []}
      allActive={allActive ?? []}
      stats={stats ?? []}
      userId={user.id}
    />
  )
}
