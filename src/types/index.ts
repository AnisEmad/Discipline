// ── Existing types (keep these) ──────────────────────────────

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
  type: 'habit_completed' | 'streak_milestone' | 'habit_missed' | 'joined' | 'badge_earned' | 'session_completed' | 'milestone_completed' | 'goal_created' | 'goal_joined'
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

export type HabitWithLog = Habit & {
  completed_today: boolean
  log_id?: string
}

// ── New V2 types ──────────────────────────────────────────────

export type PresenceStatus = 'studying' | 'idle' | 'offline'

export type UserPresence = {
  id: string
  status: PresenceStatus
  current_focus: string | null
  session_started_at: string | null
  last_seen_at: string
  updated_at: string
  profiles?: Profile
}

export type StudySession = {
  id: string
  user_id: string
  topic: string
  notes: string | null
  status: 'active' | 'paused' | 'completed'
  started_at: string
  paused_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  created_at: string
  profiles?: Profile
}

export type MilestoneCategory = 'RHCSA' | 'OpenShift' | 'AWS' | 'Terraform' | 'CI/CD' | 'Security'

export type Milestone = {
  id: string
  category: string
  title: string
  description: string | null
  order_index: number
  is_curriculum: boolean
  created_by: string | null
  created_at: string
}

export type UserMilestone = {
  id: string
  user_id: string
  milestone_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at: string | null
  updated_at: string
}

export type MilestoneWithStatus = Milestone & {
  user_status: UserMilestone['status']
  user_milestone_id?: string
}

export type SharedGoal = {
  id: string
  title: string
  description: string | null
  category: string
  creator_id: string
  status: 'active' | 'completed' | 'archived'
  progress: number
  created_at: string
  updated_at: string
  profiles?: Profile
  goal_members?: { user_id: string; profiles?: Profile }[]
  goal_reactions?: { emoji: string; user_id: string }[]
  member_count?: number
}

export type GoalMember = {
  id: string
  goal_id: string
  user_id: string
  joined_at: string
  profiles?: Profile
}

// ── Constants ─────────────────────────────────────────────────

export const STUDY_TOPICS = [
  'RHCSA', 'OpenShift', 'AWS', 'Terraform', 'CI/CD',
  'Jenkins', 'Docker', 'Kubernetes', 'Linux', 'Ansible',
  'ArgoCD', 'GitHub Actions', 'Security', 'Networking', 'Other',
]

export const GOAL_CATEGORIES = [
  'Infrastructure', 'CI/CD', 'Containers', 'Cloud', 'Security',
  'Automation', 'Monitoring', 'Networking', 'General',
]

export const MILESTONE_CATEGORIES: MilestoneCategory[] = [
  'RHCSA', 'OpenShift', 'AWS', 'Terraform', 'CI/CD', 'Security',
]

export const CATEGORY_ICONS: Record<string, string> = {
  RHCSA: '🐧',
  OpenShift: '☁️',
  AWS: '🟡',
  Terraform: '🏗️',
  'CI/CD': '🔄',
  Security: '🔒',
}

export const STATUS_CONFIG: Record<PresenceStatus, { label: string; color: string; dot: string }> = {
  studying: { label: 'Studying', color: 'text-green-400', dot: 'bg-green-400' },
  idle: { label: 'Idle', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  offline: { label: 'Offline', color: 'text-muted-foreground', dot: 'bg-gray-600' },
}

export const HABIT_COLORS = [
  '#f97316', '#ef4444', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

export const HABIT_EMOJIS = [
  '📚', '💪', '🏃', '🧘', '💻', '✍️', '🎯', '🎸',
  '🌅', '💧', '🥗', '🧠', '🎨', '📝', '🏋️', '🚴',
]

export const BADGE_CONFIG: Record<string, { label: string; emoji: string; description: string }> = {
  first_habit: { label: 'First Step', emoji: '🌱', description: 'Created your first grind' },
  week_streak: { label: 'Week Warrior', emoji: '🔥', description: '7-day streak' },
  month_streak: { label: 'Iron Will', emoji: '⚡', description: '30-day streak' },
  century: { label: 'Centurion', emoji: '💯', description: '100 total completions' },
  consistent: { label: 'Consistent', emoji: '🎯', description: '7 days of 100% completion' },
  early_bird: { label: 'Early Bird', emoji: '🌅', description: 'Completed habits before 7am' },
}
