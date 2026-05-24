import { createClient } from '@/lib/supabase/client'
import type { Habit, HabitWithLog, HabitLog } from '@/types'

export async function getUserHabits(userId: string): Promise<HabitWithLog[]> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error || !habits) return []

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('habit_id, id')
    .eq('user_id', userId)
    .gte('completed_at', `${today}T00:00:00`)
    .lte('completed_at', `${today}T23:59:59`)

  const completedToday = new Set(logs?.map(l => l.habit_id) ?? [])
  const logMap = new Map(logs?.map(l => [l.habit_id, l.id]) ?? [])

  return habits.map(h => ({
    ...h,
    completed_today: completedToday.has(h.id),
    log_id: logMap.get(h.id),
  }))
}

export async function createHabit(
  userId: string,
  data: { name: string; emoji: string; color: string }
): Promise<Habit | null> {
  const supabase = createClient()

  const { data: habit, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, ...data })
    .select()
    .single()

  if (error) return null

  // Log to activity feed
  await supabase.from('activity_feed').insert({
    user_id: userId,
    habit_id: habit.id,
    type: 'habit_completed',
    message: `created a new habit: ${data.emoji} ${data.name}`,
    metadata: {},
  })

  return habit
}

export async function deleteHabit(habitId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', userId)
  return !error
}

export async function completeHabit(habitId: string, userId: string): Promise<HabitLog | null> {
  const supabase = createClient()
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  // Check if already completed today
  const { data: existing } = await supabase
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .gte('completed_at', `${today}T00:00:00`)
    .single()

  if (existing) return null

  const { data: log, error } = await supabase
    .from('habit_logs')
    .insert({ habit_id: habitId, user_id: userId, completed_at: now })
    .select()
    .single()

  if (error) return null

  // Update streak via RPC
  await supabase.rpc('update_habit_streak', { p_habit_id: habitId, p_user_id: userId })

  return log
}

export async function uncompleteHabit(habitId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .gte('completed_at', `${today}T00:00:00`)
    .lte('completed_at', `${today}T23:59:59`)

  if (!error) {
    await supabase.rpc('recalc_habit_streak', { p_habit_id: habitId, p_user_id: userId })
  }

  return !error
}

export async function getHabitLogs(habitId: string, days = 365): Promise<HabitLog[]> {
  const supabase = createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .gte('completed_at', since.toISOString())
    .order('completed_at', { ascending: false })

  return data ?? []
}

export async function getAllUsersHabits(): Promise<(Habit & { profiles: { username: string; avatar_url: string | null } })[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('habits')
    .select('*, profiles(username, avatar_url)')
    .order('current_streak', { ascending: false })

  return data ?? []
}
