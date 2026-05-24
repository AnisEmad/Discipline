'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, formatRelative } from '@/lib/utils'
import { Timer, Play, Pause, Square, Plus, X, BookOpen } from 'lucide-react'
import type { StudySession } from '@/types'
import { STUDY_TOPICS } from '@/types'

type Props = {
  activeSession: StudySession | null
  history: StudySession[]
  allActive: StudySession[]
  stats: { user_id: string; duration_minutes: number | null }[]
  userId: string
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getLiveTime(startedAt: string, pausedAt?: string | null): number {
  if (pausedAt) return Math.floor((new Date(pausedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
}

export default function SessionsClient({ activeSession: initialActive, history, allActive, stats, userId }: Props) {
  const [active, setActive] = useState(initialActive)
  const [showNew, setShowNew] = useState(false)
  const [topic, setTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [starting, setStarting] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Live timer
  useEffect(() => {
    if (!active || active.status !== 'active') return
    const t = setInterval(() => {
      setElapsed(getLiveTime(active.started_at))
    }, 1000)
    setElapsed(getLiveTime(active.started_at))
    return () => clearInterval(t)
  }, [active])

  async function startSession(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setStarting(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: userId,
        topic: topic.trim(),
        notes: notes.trim() || null,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !data) { toast.error('Failed to start session'); setStarting(false); return }

    // Update presence
    await supabase.from('user_presence').upsert({
      id: userId,
      status: 'studying',
      current_focus: topic.trim(),
      session_started_at: data.started_at,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await supabase.from('activity_feed').insert({
      user_id: userId,
      type: 'habit_completed',
      message: `started a study session: ${topic.trim()}`,
      metadata: { session_id: data.id },
    })

    setActive(data)
    setShowNew(false)
    setTopic('')
    setNotes('')
    setStarting(false)
    toast.success(`Session started: ${topic} 🚀`)
  }

  async function pauseSession() {
    if (!active) return
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase.from('study_sessions').update({ status: 'paused', paused_at: now }).eq('id', active.id)
    setActive({ ...active, status: 'paused', paused_at: now })
    toast.info('Session paused')
  }

  async function resumeSession() {
    if (!active) return
    const supabase = createClient()
    await supabase.from('study_sessions').update({ status: 'active', paused_at: null }).eq('id', active.id)
    setActive({ ...active, status: 'active', paused_at: null })
    toast.success('Session resumed!')
  }

  async function endSession() {
    if (!active) return
    const supabase = createClient()
    const now = new Date()
    const duration = Math.floor((now.getTime() - new Date(active.started_at).getTime()) / 60000)

    await supabase.from('study_sessions').update({
      status: 'completed',
      ended_at: now.toISOString(),
      duration_minutes: duration,
    }).eq('id', active.id)

    // Update presence to idle
    await supabase.from('user_presence').upsert({
      id: userId,
      status: 'idle',
      current_focus: null,
      session_started_at: null,
      last_seen_at: now.toISOString(),
      updated_at: now.toISOString(),
    })

    await supabase.from('activity_feed').insert({
      user_id: userId,
      type: 'session_completed',
      message: `completed a ${formatDuration(duration)} study session on ${active.topic}`,
      metadata: { duration_minutes: duration, topic: active.topic },
    })

    setActive(null)
    toast.success(`Session complete! ${formatDuration(duration)} of focused work 💪`)
    window.location.reload()
  }

  // Leaderboard by total hours
  const leaderboard = Object.values(
  stats.reduce<Record<string, { username: string; avatar_url: string | null; total: number }>>((acc, s) => {
    const key = s.user_id
    if (!acc[key]) acc[key] = { username: key.slice(0, 8), avatar_url: null, total: 0 }
    acc[key].total += s.duration_minutes ?? 0
    return acc
  }, {})
).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Timer className="w-5 h-5 text-orange-400" />
          <h1 className="text-2xl font-bold">Study Sessions</h1>
        </div>
        {!active && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl transition-all hover:scale-105 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        )}
      </div>

      {/* Active Session Timer */}
      {active && (
        <div className={cn(
          'rounded-2xl p-6 border-2 transition-all',
          active.status === 'active'
            ? 'bg-green-500/5 border-green-500/30 glow-orange'
            : 'bg-yellow-500/5 border-yellow-500/30'
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  active.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                )} />
                <span className="text-sm font-medium text-muted-foreground">
                  {active.status === 'active' ? 'Session Active' : 'Session Paused'}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1">{active.topic}</h2>
              {active.notes && <p className="text-sm text-muted-foreground mt-1">{active.notes}</p>}
            </div>

            <div className="text-right">
              <div className="text-5xl font-mono font-bold tabular-nums text-green-400">
                {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground mt-1">minutes elapsed</div>
            </div>
          </div>

          <div className="flex gap-3">
            {active.status === 'active' ? (
              <button onClick={pauseSession}
                className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-xl text-sm font-medium transition-all">
                <Pause className="w-4 h-4" /> Pause
              </button>
            ) : (
              <button onClick={resumeSession}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-xl text-sm font-medium transition-all">
                <Play className="w-4 h-4" /> Resume
              </button>
            )}
            <button onClick={endSession}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-medium transition-all">
              <Square className="w-4 h-4" /> End Session
            </button>
          </div>
        </div>
      )}

      {/* New Session Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Start Study Session</h2>
              <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={startSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Topic *</label>
                <input
                  list="session-topics"
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Terraform modules, RHCSA labs..."
                  required
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                />
                <datalist id="session-topics">
                  {STUDY_TOPICS.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What specifically are you working on?"
                  rows={2}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNew(false)}
                  className="flex-1 py-3 rounded-xl border border-border hover:bg-accent transition-all text-sm font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={starting || !topic.trim()}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl transition-all text-sm font-medium">
                  {starting ? 'Starting...' : '🚀 Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session History */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Recent Sessions
          </h2>
          {history.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <Timer className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No completed sessions yet. Start one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 15).map((s, i) => (
                <div key={s.id} style={{ animationDelay: `${i * 30}ms` }}
                  className="glass rounded-xl p-4 flex items-center gap-4 animate-slide-up">
                  <img
                    src={s.profiles?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${s.profiles?.username}`}
                    alt={s.profiles?.username ?? ''}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{s.profiles?.username}</div>
                    <div className="text-xs text-muted-foreground">{s.topic}</div>
                    {s.notes && <div className="text-xs text-muted-foreground/70 truncate">{s.notes}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-mono font-bold text-orange-400">
                      {s.duration_minutes ? formatDuration(s.duration_minutes) : '—'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{formatRelative(s.ended_at ?? s.started_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Study Leaderboard */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Total Study Hours</h2>
          <div className="glass rounded-2xl p-4 space-y-3">
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div key={entry.username} className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground w-5">#{i + 1}</span>
                <img
                  src={entry.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${entry.username}`}
                  alt={entry.username}
                  className="w-7 h-7 rounded-full"
                />
                <span className="text-sm flex-1 truncate">{entry.username}</span>
                <span className="text-sm font-mono font-bold text-orange-400">
                  {formatDuration(entry.total)}
                </span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
