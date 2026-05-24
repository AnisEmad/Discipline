import { createClient } from '@/lib/supabase/server'
import PresenceClient from './PresenceClient'

export default async function PresencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: presence } = await supabase
    .from('user_presence')
    .select('*, profiles(id, username, avatar_url)')
    .order('updated_at', { ascending: false })

  const { data: myPresence } = await supabase
    .from('user_presence')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: activeSessions } = await supabase
    .from('study_sessions')
    .select('*, profiles(username, avatar_url)')
    .eq('status', 'active')
    .order('started_at', { ascending: false })

  return (
    <PresenceClient
      presence={presence ?? []}
      myPresence={myPresence ?? null}
      activeSessions={activeSessions ?? []}
      userId={user.id}
    />
  )
}
