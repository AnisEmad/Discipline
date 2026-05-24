'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatRelative, getStreakEmoji, getStreakColor, calcCompletionRate, getLast7Days } from '@/lib/utils'
import { CheckCircle2, Circle, TrendingUp, Award, Zap } from 'lucide-react'
import type { HabitWithLog, ActivityFeedItem, Profile, Badge } from '@/types'
import { BADGE_CONFIG } from '@/types'
import { cn } from '@/lib/utils'

type Props = {
  habits: HabitWithLog[]
  weekLogs: { completed_at: string; habit_id: string }[]
  profile: Profile | null
  recentActivity: ActivityFeedItem[]
  badges: Badge[]
  quote: { text: string; author: string }
  userId: string
}

export default function DashboardClient({ habits, weekLogs, profile, recentActivity, badges, quote, userId }: Props) {
  const [habitList, setHabitList] = useState(habits)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const last7Days = getLast7Days()
  const totalHabits = habitList.length
  const completedToday = habitList.filter(h => h.completed_today).length
  const completionRate = calcCompletionRate(completedToday, totalHabits)

  const maxStreak = habitList.reduce((max, h) => Math.max(max, h.current_streak), 0)
  const totalCompletions = habitList.reduce((sum, h) => sum + h.total_completions, 0)

  // Weekly completion chart data
  const weeklyData = last7Days.map(date => {
    const dayLogs = weekLogs.filter(l => l.completed_at.startsWith(date))
    return {
      date,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      completed: dayLogs.length,
      total: totalHabits,
      rate: calcCompletionRate(dayLogs.length, totalHabits),
    }
  })

  const toggleHabit = useCallback(async (habit: HabitWithLog) => {
    setLoadingId(habit.id)
    const supabase = createClient()

    if (habit.completed_today) {
      // Uncomplete
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habit.id)
        .eq('user_id', userId)
        .gte('completed_at', `${today}T00:00:00`)

      setHabitList(prev => prev.map(h =>
        h.id === habit.id
          ? { ...h, completed_today: false, current_streak: Math.max(0, h.current_streak - 1) }
          : h
      ))
      toast.info(`Unmarked ${habit.emoji} ${habit.name}`)
    } else {
      // Complete
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habit.id, user_id: userId, completed_at: now })

      if (error) {
        toast.error('Already logged today!')
        setLoadingId(null)
        return
      }

      const newStreak = habit.current_streak + 1

      await supabase
        .from('habits')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(habit.longest_streak, newStreak),
          total_completions: habit.total_completions + 1,
        })
        .eq('id', habit.id)

      await supabase.from('activity_feed').insert({
        user_id: userId,
        habit_id: habit.id,
        type: 'habit_completed',
        message: `completed ${habit.emoji} ${habit.name}${newStreak > 1 ? ` (${newStreak} day streak!)` : ''}`,
        metadata: { streak: newStreak },
      })

      setHabitList(prev => prev.map(h =>
        h.id === habit.id
          ? { ...h, completed_today: true, current_streak: newStreak, total_completions: h.total_completions + 1 }
          : h
      ))

      if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
        toast.success(`🎉 ${newStreak}-day streak on ${habit.emoji} ${habit.name}!`, { duration: 5000 })
      } else {
        toast.success(`${habit.emoji} ${habit.name} done! ${getStreakEmoji(newStreak)}`)
      }
    }

    setLoadingId(null)
  }, [userId])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Daily Quote */}
      <div className="glass rounded-2xl px-6 py-4 border-l-2 border-orange-500">
        <p className="text-sm text-foreground/90 italic">"{quote.text}"</p>
        <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today" value={`${completedToday}/${totalHabits}`} sub={`${completionRate}% done`} icon="📋" color="orange" />
        <StatCard label="Best Streak" value={`${maxStreak}d`} sub={getStreakEmoji(maxStreak)} icon="🔥" color="red" />
        <StatCard label="This Week" value={`${weekLogs.length}`} sub="completions" icon="📈" color="yellow" />
        <StatCard label="All Time" value={`${totalCompletions}`} sub="completions" icon="🏆" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Habits */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's Habits</h2>
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {habitList.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <span className="text-4xl">🌱</span>
              <p className="mt-3 text-muted-foreground">No habits yet. Add your first one!</p>
              <a href="/habits" className="mt-4 inline-block px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-medium transition-all">
                Create Habit →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {habitList.map((habit, i) => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit)}
                  disabled={loadingId === habit.id}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left animate-slide-up card-hover',
                    habit.completed_today
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'glass hover:border-orange-500/30'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
                    habit.completed_today ? 'bg-green-500/10' : 'bg-secondary'
                  )}
                    style={{ backgroundColor: habit.completed_today ? undefined : `${habit.color}15` }}
                  >
                    {habit.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('font-medium', habit.completed_today && 'line-through text-muted-foreground')}>
                        {habit.name}
                      </span>
                      {habit.current_streak > 0 && (
                        <span className={cn('text-xs font-mono', getStreakColor(habit.current_streak))}>
                          {habit.current_streak}d
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {habit.total_completions} total · longest {habit.longest_streak}d
                    </div>
                  </div>

                  {habit.completed_today
                    ? <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    : <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                  }
                </button>
              ))}
            </div>
          )}

          {/* Weekly Chart */}
          {totalHabits > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Weekly Progress
              </h3>
              <div className="flex items-end gap-2 h-20">
                {weeklyData.map((d, i) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm flex items-end" style={{ height: '60px' }}>
                      <div
                        className="w-full rounded-sm transition-all duration-500"
                        style={{
                          height: `${Math.max(4, d.rate)}%`,
                          backgroundColor: d.rate >= 80 ? '#22c55e' : d.rate >= 50 ? '#f97316' : '#374151',
                          minHeight: '4px',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Badges */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Badges
            </h3>
            {badges.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Complete habits to earn badges!</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {badges.map(b => {
                  const config = BADGE_CONFIG[b.badge_type]
                  if (!config) return null
                  return (
                    <div
                      key={b.id}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-all cursor-default"
                      title={config.description}
                    >
                      <span className="text-2xl">{config.emoji}</span>
                      <span className="text-[9px] text-muted-foreground text-center leading-tight">{config.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <img
                    src={item.profiles?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${item.profiles?.username}`}
                    alt={item.profiles?.username ?? ''}
                    className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      <span className="font-medium">{item.profiles?.username}</span>
                      {' '}{item.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelative(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string; icon: string; color: string
}) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-500/10 border-orange-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    green: 'bg-green-500/10 border-green-500/20',
  }

  return (
    <div className={cn('rounded-2xl p-4 border card-hover', colorMap[color] ?? 'glass')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  )
}
