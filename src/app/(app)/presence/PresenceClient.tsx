'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, formatRelative } from '@/lib/utils'
import { Radio, Clock, Edit2, Check } from 'lucide-react'
import type { UserPresence, StudySession } from '@/types'
import { STATUS_CONFIG, STUDY_TOPICS } from '@/types'

type Props = {
  presence: UserPresence[]
  myPresence: UserPresence | null
  activeSessions: StudySession[]
  userId: string
}

function getStudyDuration(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  if (hours > 0) return `${hours}h ${mins % 60}m`
  return `${mins}m`
}

export default function PresenceClient({ presence: initial, myPresence: initialMe, activeSessions: initialSessions, userId }: Props) {
  const [presence, setPresence] = useState(initial)
  const [activeSessions, setActiveSessions] = useState(initialSessions)
  const [myStatus, setMyStatus] = useState(initialMe?.status ?? 'offline')
  const [myFocus, setMyFocus] = useState(initialMe?.current_focus ?? '')
  const [editingFocus, setEditingFocus] = useState(false)
  const [focusDraft, setFocusDraft] = useState(initialMe?.current_focus ?? '')
  const [savingStatus, setSavingStatus] = useState(false)
  const [tick, setTick] = useState(0)

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Re-fetch presence on tick
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('user_presence')
      .select('*, profiles(id, username, avatar_url)')
      .order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setPresence(data) })

    supabase
      .from('study_sessions')
      .select('*, profiles(username, avatar_url)')
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .then(({ data }) => { if (data) setActiveSessions(data) })
  }, [tick])

  // Timer re-render every minute for durations
  const [, forceRender] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceRender(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  async function updateStatus(status: UserPresence['status']) {
    setSavingStatus(true)
    const supabase = createClient()

    const payload = {
      id: userId,
      status,
      current_focus: status === 'offline' ? null : myFocus || null,
      session_started_at: status === 'studying' ? new Date().toISOString() : null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase.from('user_presence').upsert(payload)

    setMyStatus(status)
    setSavingStatus(false)

    if (status === 'studying') toast.success('Status set to Studying 🟢')
    else if (status === 'idle') toast.info('Status set to Idle 🟡')
    else toast.info('Status set to Offline')
  }

  async function saveFocus() {
    const supabase = createClient()
    await supabase
      .from('user_presence')
      .upsert({
        id: userId,
        status: myStatus,
        current_focus: focusDraft || null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    setMyFocus(focusDraft)
    setEditingFocus(false)
    toast.success('Focus updated')
  }

  const online = presence.filter(p => p.status !== 'offline')
  const offline = presence.filter(p => p.status === 'offline')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Radio className="w-5 h-5 text-orange-400" />
        <h1 className="text-2xl font-bold">Crew Status</h1>
        <span className="text-sm text-muted-foreground">
          {online.length} online · updates every 30s
        </span>
      </div>

      {/* My Status Card */}
      <div className="glass rounded-2xl p-6 border border-orange-500/20">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Your Status</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['studying', 'idle', 'offline'] as const).map(s => {
            const config = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={savingStatus}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                  myStatus === s
                    ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                    : 'border-border bg-secondary hover:border-border/80 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className={cn('w-2 h-2 rounded-full', config.dot, myStatus === s && 'animate-pulse')} />
                {config.label}
              </button>
            )
          })}
        </div>

        {/* Current Focus */}
        <div className="flex items-center gap-2">
          {editingFocus ? (
            <>
              <input
                type="text"
                value={focusDraft}
                onChange={e => setFocusDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveFocus()}
                placeholder="What are you working on? e.g. Terraform modules"
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                autoFocus
                list="topics-list"
              />
              <datalist id="topics-list">
                {STUDY_TOPICS.map(t => <option key={t} value={t} />)}
              </datalist>
              <button onClick={saveFocus} className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all">
                <Check className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => { setEditingFocus(true); setFocusDraft(myFocus) }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all group"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{myFocus || 'Set your current focus...'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-400" />
            Active Study Sessions
          </h2>
          <div className="space-y-3">
            {activeSessions.map(session => (
              <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                <img
                  src={session.profiles?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${session.profiles?.username}`}
                  alt={session.profiles?.username ?? ''}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{session.profiles?.username}</span>
                  <span className="text-muted-foreground text-sm"> is studying </span>
                  <span className="text-green-400 text-sm font-medium">{session.topic}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-mono text-green-400 font-bold">
                    {getStudyDuration(session.started_at)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">active</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Users */}
      {online.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Online ({online.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {online.map((p, i) => {
              const config = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]
              const isMe = p.id === userId
              return (
                <div
                  key={p.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={cn(
                    'glass rounded-xl p-4 flex items-center gap-3 animate-slide-up',
                    isMe && 'border border-orange-500/20'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={p.profiles?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${p.profiles?.username}`}
                      alt={p.profiles?.username ?? ''}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                      config.dot,
                      p.status === 'studying' && 'animate-pulse'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {p.profiles?.username}
                      {isMe && <span className="text-[10px] text-orange-400">(you)</span>}
                    </div>
                    {p.current_focus ? (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        📌 {p.current_focus}
                      </div>
                    ) : (
                      <div className={cn('text-xs mt-0.5', config.color)}>{config.label}</div>
                    )}
                    {p.session_started_at && p.status === 'studying' && (
                      <div className="text-[10px] text-green-400 mt-0.5 font-mono">
                        {getStudyDuration(p.session_started_at)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Offline Users */}
      {offline.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Offline ({offline.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {offline.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 opacity-50">
                <img
                  src={p.profiles?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${p.profiles?.username}`}
                  alt={p.profiles?.username ?? ''}
                  className="w-7 h-7 rounded-full grayscale"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{p.profiles?.username}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatRelative(p.last_seen_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {presence.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No crew members yet. Set your status above!</p>
        </div>
      )}
    </div>
  )
}
