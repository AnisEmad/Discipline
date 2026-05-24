import { createClient } from '@/lib/supabase/client'
import type { LeaderboardEntry } from '@/types'

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient()

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')

  if (!profiles) return []

  // Get max streaks per user
  const { data: streaks } = await supabase
    .from('habits')
    .select('user_id, current_streak, longest_streak, total_completions')

  // Get weekly completions
  const { data: weeklyLogs } = await supabase
    .from('habit_logs')
    .select('user_id')
    .gte('completed_at', weekAgo.toISOString())

  const streakMap = new Map<string, { longest: number; total: number }>()
  for (const s of streaks ?? []) {
    const existing = streakMap.get(s.user_id)
    streakMap.set(s.user_id, {
      longest: Math.max(existing?.longest ?? 0, s.current_streak),
      total: (existing?.total ?? 0) + (s.total_completions ?? 0),
    })
  }

  const weeklyMap = new Map<string, number>()
  for (const log of weeklyLogs ?? []) {
    weeklyMap.set(log.user_id, (weeklyMap.get(log.user_id) ?? 0) + 1)
  }

  const entries: LeaderboardEntry[] = profiles.map((p, i) => ({
    user_id: p.id,
    username: p.username,
    avatar_url: p.avatar_url,
    longest_streak: streakMap.get(p.id)?.longest ?? 0,
    total_completions: streakMap.get(p.id)?.total ?? 0,
    weekly_completions: weeklyMap.get(p.id) ?? 0,
    rank: i + 1,
  }))

  // Sort by longest streak
  entries.sort((a, b) => b.longest_streak - a.longest_streak || b.weekly_completions - a.weekly_completions)
  entries.forEach((e, i) => (e.rank = i + 1))

  return entries
}
