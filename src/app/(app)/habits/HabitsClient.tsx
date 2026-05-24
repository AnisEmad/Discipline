'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, getStreakEmoji, getStreakColor, getLast365Days } from '@/lib/utils'
import { Plus, Trash2, CheckCircle2, Circle, X, Flame } from 'lucide-react'
import type { HabitWithLog } from '@/types'
import { HABIT_COLORS, HABIT_EMOJIS } from '@/types'

type Props = {
  habits: HabitWithLog[]
  allLogs: { habit_id: string; completed_at: string }[]
  userId: string
}

export default function HabitsClient({ habits: initialHabits, allLogs, userId }: Props) {
  const [habits, setHabits] = useState(initialHabits)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📚')
  const [newColor, setNewColor] = useState(HABIT_COLORS[0])
  const [creating, setCreating] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedHabit, setSelectedHabit] = useState<HabitWithLog | null>(null)

  const last365 = getLast365Days()

  async function createHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)

    const supabase = createClient()
    const { data: habit, error } = await supabase
      .from('habits')
      .insert({ user_id: userId, name: newName.trim(), emoji: newEmoji, color: newColor })
      .select()
      .single()

    if (error || !habit) {
      toast.error('Failed to create habit')
      setCreating(false)
      return
    }

    await supabase.from('activity_feed').insert({
      user_id: userId,
      habit_id: habit.id,
      type: 'habit_completed',
      message: `created a new habit: ${newEmoji} ${newName.trim()}`,
      metadata: {},
    })

    setHabits(prev => [...prev, { ...habit, completed_today: false }])
    setNewName('')
    setNewEmoji('📚')
    setNewColor(HABIT_COLORS[0])
    setShowCreate(false)
    setCreating(false)
    toast.success(`${newEmoji} ${newName} created! Time to build that streak 🔥`)
  }

  async function deleteHabit(habit: HabitWithLog) {
    if (!confirm(`Delete "${habit.name}"? This will erase all logs. This cannot be undone.`)) return

    const supabase = createClient()
    await supabase.from('habits').delete().eq('id', habit.id).eq('user_id', userId)
    setHabits(prev => prev.filter(h => h.id !== habit.id))
    if (selectedHabit?.id === habit.id) setSelectedHabit(null)
    toast.success(`${habit.emoji} ${habit.name} deleted`)
  }

  async function toggleHabit(habit: HabitWithLog) {
    setLoadingId(habit.id)
    const supabase = createClient()

    if (habit.completed_today) {
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habit.id)
        .eq('user_id', userId)
        .gte('completed_at', `${today}T00:00:00`)

      setHabits(prev => prev.map(h =>
        h.id === habit.id ? { ...h, completed_today: false, current_streak: Math.max(0, h.current_streak - 1) } : h
      ))
      toast.info(`Unmarked ${habit.emoji} ${habit.name}`)
    } else {
      const now = new Date().toISOString()
      await supabase.from('habit_logs').insert({ habit_id: habit.id, user_id: userId, completed_at: now })

      const newStreak = habit.current_streak + 1
      await supabase.from('habits').update({
        current_streak: newStreak,
        longest_streak: Math.max(habit.longest_streak, newStreak),
        total_completions: habit.total_completions + 1,
      }).eq('id', habit.id)

      await supabase.from('activity_feed').insert({
        user_id: userId,
        habit_id: habit.id,
        type: 'habit_completed',
        message: `completed ${habit.emoji} ${habit.name}${newStreak > 1 ? ` (${newStreak} day streak!)` : ''}`,
        metadata: { streak: newStreak },
      })

      setHabits(prev => prev.map(h =>
        h.id === habit.id
          ? { ...h, completed_today: true, current_streak: newStreak, total_completions: h.total_completions + 1 }
          : h
      ))
      toast.success(`${habit.emoji} done! ${getStreakEmoji(newStreak)}`)
    }
    setLoadingId(null)
  }

  // Build heatmap for selected habit
  const heatmapData = selectedHabit
    ? last365.map(date => ({
        date,
        completed: allLogs.some(
          l => l.habit_id === selectedHabit.id && l.completed_at.startsWith(date)
        ),
      }))
    : []

  const completedThisYear = selectedHabit
    ? allLogs.filter(l => l.habit_id === selectedHabit.id).length
    : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Habits</h1>
          <p className="text-muted-foreground text-sm mt-1">{habits.length} habits tracked</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl transition-all hover:scale-105 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Habit
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Create New Habit</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={createHabit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Habit Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Read 30 minutes"
                  required
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Choose Emoji</label>
                <div className="grid grid-cols-8 gap-1.5">
                  {HABIT_EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setNewEmoji(e)}
                      className={cn(
                        'p-2 rounded-lg text-lg transition-all hover:bg-accent',
                        newEmoji === e && 'bg-orange-500/20 ring-2 ring-orange-500'
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  {HABIT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all hover:scale-110',
                        newColor === c && 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${newColor}20` }}>
                  {newEmoji}
                </div>
                <span className="font-medium">{newName || 'Your habit name'}</span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl border border-border hover:bg-accent transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl transition-all text-sm font-medium"
                >
                  {creating ? 'Creating...' : 'Create Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Habits Grid */}
      {habits.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <span className="text-5xl">🌱</span>
          <h3 className="text-lg font-semibold mt-4">No habits yet</h3>
          <p className="text-muted-foreground text-sm mt-2 mb-6">Start small. One habit changes everything.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-medium transition-all"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {habits.map((habit, i) => (
            <div
              key={habit.id}
              onClick={() => setSelectedHabit(selectedHabit?.id === habit.id ? null : habit)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                'glass rounded-2xl p-5 cursor-pointer transition-all animate-slide-up card-hover border',
                selectedHabit?.id === habit.id ? 'border-orange-500/40' : 'border-transparent hover:border-border',
                habit.completed_today && 'bg-green-500/5 border-green-500/10'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${habit.color}20` }}>
                    {habit.emoji}
                  </div>
                  <div>
                    <h3 className="font-semibold">{habit.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn('text-sm font-mono font-bold', getStreakColor(habit.current_streak))}>
                        {getStreakEmoji(habit.current_streak)} {habit.current_streak}d
                      </span>
                      <span className="text-xs text-muted-foreground">streak</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); toggleHabit(habit) }}
                    disabled={loadingId === habit.id}
                    className={cn(
                      'p-2 rounded-xl transition-all',
                      habit.completed_today
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-secondary hover:bg-orange-500/10 hover:text-orange-400 text-muted-foreground'
                    )}
                  >
                    {habit.completed_today
                      ? <CheckCircle2 className="w-5 h-5" />
                      : <Circle className="w-5 h-5" />
                    }
                  </button>

                  <button
                    onClick={e => { e.stopPropagation(); deleteHabit(habit) }}
                    className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-secondary/50 rounded-lg p-2">
                  <div className="text-sm font-bold font-mono">{habit.total_completions}</div>
                  <div className="text-[10px] text-muted-foreground">total</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <div className="text-sm font-bold font-mono">{habit.longest_streak}d</div>
                  <div className="text-[10px] text-muted-foreground">best</div>
                </div>
                <div className={cn('rounded-lg p-2', habit.completed_today ? 'bg-green-500/10' : 'bg-secondary/50')}>
                  <div className={cn('text-sm font-bold', habit.completed_today ? 'text-green-400' : 'text-muted-foreground')}>
                    {habit.completed_today ? '✓' : '○'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">today</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap for selected habit */}
      {selectedHabit && (
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedHabit.emoji}</span>
              <div>
                <h3 className="font-semibold">{selectedHabit.name}</h3>
                <p className="text-xs text-muted-foreground">{completedThisYear} completions in the last year</p>
              </div>
            </div>
            <button onClick={() => setSelectedHabit(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="flex gap-1" style={{ minWidth: '600px' }}>
              {/* Group by week */}
              {Array.from({ length: 53 }, (_, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const dataIdx = weekIdx * 7 + dayIdx
                    if (dataIdx >= heatmapData.length) return <div key={dayIdx} className="w-2.5 h-2.5" />
                    const cell = heatmapData[dataIdx]
                    return (
                      <div
                        key={dayIdx}
                        className="heatmap-cell w-2.5 h-2.5"
                        style={{
                          backgroundColor: cell.completed
                            ? selectedHabit.color
                            : 'hsl(var(--secondary))',
                          opacity: cell.completed ? 1 : 0.4,
                        }}
                        title={`${cell.date}: ${cell.completed ? '✓ Completed' : '✗ Missed'}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm bg-secondary opacity-40" />
            <span>Missed</span>
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: selectedHabit.color }} />
            <span>Completed</span>
          </div>
        </div>
      )}
    </div>
  )
}
