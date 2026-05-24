import { createClient } from '@/lib/supabase/server'
import LeaderboardClient from './LeaderboardClient'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')

  const { data: habits } = await supabase
    .from('habits')
    .select('user_id, current_streak, longest_streak, total_completions')

  const { data: weeklyLogs } = await supabase
    .from('habit_logs')
    .select('user_id')
    .gte('completed_at', weekAgo.toISOString())

  const { data: badges } = await supabase
    .from('badges')
    .select('user_id, badge_type')

  const streakMap = new Map<string, { longest: number; total: number }>()
  for (const h of habits ?? []) {
    const existing = streakMap.get(h.user_id)
    streakMap.set(h.user_id, {
      longest: Math.max(existing?.longest ?? 0, h.current_streak),
      total: (existing?.total ?? 0) + h.total_completions,
    })
  }

  const weeklyMap = new Map<string, number>()
  for (const l of weeklyLogs ?? []) {
    weeklyMap.set(l.user_id, (weeklyMap.get(l.user_id) ?? 0) + 1)
  }

  const badgeMap = new Map<string, number>()
  for (const b of badges ?? []) {
    badgeMap.set(b.user_id, (badgeMap.get(b.user_id) ?? 0) + 1)
  }

  const entries = (profiles ?? [])
    .map(p => ({
      user_id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      longest_streak: streakMap.get(p.id)?.longest ?? 0,
      total_completions: streakMap.get(p.id)?.total ?? 0,
      weekly_completions: weeklyMap.get(p.id) ?? 0,
      badge_count: badgeMap.get(p.id) ?? 0,
      rank: 0,
    }))
    .sort((a, b) => b.longest_streak - a.longest_streak || b.weekly_completions - a.weekly_completions)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  return <LeaderboardClient entries={entries} currentUserId={user?.id ?? ''} />
}
