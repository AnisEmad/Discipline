import { createClient } from '@/lib/supabase/server'
import { getDailyQuote, getLast7Days } from '@/lib/utils'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = getLast7Days()[0]

  // Fetch habits with today's completion status
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  const { data: todayLogs } = await supabase
    .from('habit_logs')
    .select('habit_id, id')
    .eq('user_id', user.id)
    .gte('completed_at', `${today}T00:00:00`)

  const { data: weekLogs } = await supabase
    .from('habit_logs')
    .select('completed_at, habit_id')
    .eq('user_id', user.id)
    .gte('completed_at', `${weekAgo}T00:00:00`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: recentActivity } = await supabase
    .from('activity_feed')
    .select('*, profiles(username, avatar_url), habits(name, emoji, color)')
    .order('created_at', { ascending: false })
    .limit(8)

  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .eq('user_id', user.id)

  const completedIds = new Set(todayLogs?.map(l => l.habit_id) ?? [])
  const logIdMap = new Map(todayLogs?.map(l => [l.habit_id, l.id]) ?? [])

  const habitsWithStatus = (habits ?? []).map(h => ({
    ...h,
    completed_today: completedIds.has(h.id),
    log_id: logIdMap.get(h.id),
  }))

  const quote = getDailyQuote()

  return (
    <DashboardClient
      habits={habitsWithStatus}
      weekLogs={weekLogs ?? []}
      profile={profile}
      recentActivity={recentActivity ?? []}
      badges={badges ?? []}
      quote={quote}
      userId={user.id}
    />
  )
}
