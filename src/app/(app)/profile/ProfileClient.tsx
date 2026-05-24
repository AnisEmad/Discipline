'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate, formatRelative, getStreakColor, getStreakEmoji } from '@/lib/utils'
import { Edit2, Save, X, Calendar, Flame, Trophy } from 'lucide-react'
import type { Profile, Habit, Badge, ActivityFeedItem } from '@/types'
import { BADGE_CONFIG } from '@/types'
import { cn } from '@/lib/utils'

type Props = {
  profile: Profile | null
  habits: Habit[]
  badges: Badge[]
  activity: (ActivityFeedItem & { habits: { name: string; emoji: string; color: string } | null })[]
  userId: string
}

export default function ProfileClient({ profile, habits, badges, activity, userId }: Props) {
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [saving, setSaving] = useState(false)

  const maxStreak = habits.reduce((max, h) => Math.max(max, h.current_streak), 0)
  const longestEver = habits.reduce((max, h) => Math.max(max, h.longest_streak), 0)
  const total = habits.reduce((sum, h) => sum + h.total_completions, 0)

  async function saveBio() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ bio })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to save')
    } else {
      toast.success('Profile updated!')
      setEditing(false)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <img
            src={profile?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.username}`}
            alt={profile?.username ?? ''}
            className="w-20 h-20 rounded-2xl ring-2 ring-orange-500/30"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{profile?.username}</h1>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined {formatDate(profile?.created_at ?? '')}</span>
                </div>
              </div>

              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(false); setBio(profile?.bio ?? '') }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={saveBio}
                    disabled={saving}
                    className="p-2 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-all"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Write a short bio..."
                maxLength={160}
                rows={2}
                className="mt-3 w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none transition-all"
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                {profile?.bio || 'No bio yet. Click edit to add one.'}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="text-center p-3 bg-secondary/50 rounded-xl">
            <div className={cn('text-2xl font-bold font-mono', getStreakColor(maxStreak))}>
              {getStreakEmoji(maxStreak)} {maxStreak}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Current Streak</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-xl">
            <div className="text-2xl font-bold font-mono text-yellow-400">
              {longestEver}d
            </div>
            <div className="text-xs text-muted-foreground mt-1">Best Ever</div>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-xl">
            <div className="text-2xl font-bold font-mono text-blue-400">
              {total}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Completions</div>
          </div>
        </div>
      </div>

      {/* Habits Summary */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          My Habits ({habits.length})
        </h2>
        {habits.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No habits tracked yet</p>
        ) : (
          <div className="space-y-2">
            {habits.map(habit => (
              <div key={habit.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${habit.color}20` }}>
                  {habit.emoji}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{habit.name}</div>
                  <div className="text-xs text-muted-foreground">{habit.total_completions} completions</div>
                </div>
                <div className={cn('text-sm font-mono font-bold', getStreakColor(habit.current_streak))}>
                  {getStreakEmoji(habit.current_streak)} {habit.current_streak}d
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Badges ({badges.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map(b => {
              const config = BADGE_CONFIG[b.badge_type]
              if (!config) return null
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                  <span className="text-3xl">{config.emoji}</span>
                  <div>
                    <div className="font-medium text-sm">{config.label}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {activity.slice(0, 10).map(item => (
            <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-secondary flex-shrink-0">
                {item.habits?.emoji ?? '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{item.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(item.created_at)}</p>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
