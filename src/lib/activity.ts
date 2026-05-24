import { createClient } from '@/lib/supabase/client'
import type { ActivityFeedItem } from '@/types'

export async function getActivityFeed(limit = 50): Promise<ActivityFeedItem[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('activity_feed')
    .select('*, profiles(username, avatar_url), habits(name, emoji, color)')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getUserActivity(userId: string, limit = 30): Promise<ActivityFeedItem[]> {
  const supabase = createClient()

  const { data } = await supabase
    .from('activity_feed')
    .select('*, profiles(username, avatar_url), habits(name, emoji, color)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function logActivity(
  userId: string,
  type: ActivityFeedItem['type'],
  message: string,
  habitId?: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = createClient()
  await supabase.from('activity_feed').insert({
    user_id: userId,
    habit_id: habitId ?? null,
    type,
    message,
    metadata,
  })
}
