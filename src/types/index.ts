export type Profile = {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export type Habit = {
  id: string
  user_id: string
  name: string
  emoji: string
  color: string
  created_at: string
  current_streak: number
  longest_streak: number
  total_completions: number
  profiles?: Profile
}

export type HabitLog = {
  id: string
  habit_id: string
  user_id: string
  completed_at: string
  note: string | null
}

export type ActivityFeedItem = {
  id: string
  user_id: string
  habit_id: string | null
  type: 'habit_completed' | 'streak_milestone' | 'habit_missed' | 'joined' | 'badge_earned'
  message: string
  metadata: Record<string, unknown>
  created_at: string
  profiles?: Profile
  habits?: Pick<Habit, 'name' | 'emoji' | 'color'>
}

export type Badge = {
  id: string
  user_id: string
  badge_type: string
  earned_at: string
}

export type LeaderboardEntry = {
  user_id: string
  username: string
  avatar_url: string | null
  longest_streak: number
  weekly_completions: number
  total_completions: number
  rank: number
}

export type HabitWithLog = Habit & {
  completed_today: boolean
  log_id?: string
}

export const HABIT_COLORS = [
  '#f97316', // orange
  '#ef4444', // red
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
]

export const HABIT_EMOJIS = [
  '📚', '💪', '🏃', '🧘', '💻', '✍️', '🎯', '🎸',
  '🌅', '💧', '🥗', '🧠', '🎨', '📝', '🏋️', '🚴',
]

export const BADGE_CONFIG: Record<string, { label: string; emoji: string; description: string }> = {
  first_habit: { label: 'First Step', emoji: '🌱', description: 'Created your first habit' },
  week_streak: { label: 'Week Warrior', emoji: '🔥', description: '7-day streak on any habit' },
  month_streak: { label: 'Iron Will', emoji: '⚡', description: '30-day streak on any habit' },
  century: { label: 'Centurion', emoji: '💯', description: '100 total habit completions' },
  consistent: { label: 'Consistent', emoji: '🎯', description: '7 days of 100% completion' },
  early_bird: { label: 'Early Bird', emoji: '🌅', description: 'Completed habits before 7am' },
}
