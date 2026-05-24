import { createClient } from '@/lib/supabase/server'
import HabitsClient from './HabitsClient'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const today = new Date().toISOString().split('T')[0]

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

  // Get last 365 days of logs for heatmap
  const yearAgo = new Date()
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)

  const { data: allLogs } = await supabase
    .from('habit_logs')
    .select('habit_id, completed_at')
    .eq('user_id', user.id)
    .gte('completed_at', yearAgo.toISOString())

  const completedIds = new Set(todayLogs?.map(l => l.habit_id) ?? [])
  const logIdMap = new Map(todayLogs?.map(l => [l.habit_id, l.id]) ?? [])

  const habitsWithStatus = (habits ?? []).map(h => ({
    ...h,
    completed_today: completedIds.has(h.id),
    log_id: logIdMap.get(h.id),
  }))

  return (
    <HabitsClient
      habits={habitsWithStatus}
      allLogs={allLogs ?? []}
      userId={user.id}
    />
  )
}
