'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, formatRelative } from '@/lib/utils'
import { Target, Plus, X, Users, CheckCircle2 } from 'lucide-react'
import type { SharedGoal } from '@/types'
import { GOAL_CATEGORIES } from '@/types'

type Props = {
  goals: SharedGoal[]
  userId: string
}

const REACTIONS = ['🔥', '💪', '👀', '✅', '🚀', '⚡']

const categoryColors: Record<string, string> = {
  Infrastructure: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'CI/CD': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Containers: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Cloud: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Security: 'bg-red-500/10 text-red-400 border-red-500/20',
  Automation: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Monitoring: 'bg-green-500/10 text-green-400 border-green-500/20',
  Networking: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  General: 'bg-secondary text-muted-foreground border-border',
}

export default function GoalsClient({ goals: initialGoals, userId }: Props) {
  const [goals, setGoals] = useState(initialGoals)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('General')
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  function isMember(goal: SharedGoal) {
    return goal.goal_members?.some(m => m.user_id === userId) ||
      goal.creator_id === userId
  }

  function myReactions(goal: SharedGoal) {
    return new Set(goal.goal_reactions?.filter(r => r.user_id === userId).map(r => r.emoji))
  }

  async function createGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    const supabase = createClient()

    const { data: goal, error } = await supabase
      .from('shared_goals')
      .insert({ title: title.trim(), description: description.trim() || null, category, creator_id: userId })
      .select('*, profiles(id, username, avatar_url), goal_members(user_id, profiles(username, avatar_url)), goal_reactions(emoji, user_id)')
      .single()

    if (error || !goal) { toast.error('Failed to create goal'); setCreating(false); return }

    // Auto-join as creator
    await supabase.from('goal_members').insert({ goal_id: goal.id, user_id: userId })

    await supabase.from('activity_feed').insert({
      user_id: userId,
      type: 'goal_created',
      message: `created a new goal: ${title.trim()}`,
      metadata: { goal_id: goal.id, category },
    })

    setGoals(prev => [{ ...goal, goal_members: [{ user_id: userId, profiles: undefined }] }, ...prev])
    setTitle('')
    setDescription('')
    setCategory('General')
    setShowCreate(false)
    setCreating(false)
    toast.success(`Goal created! 🎯`)
  }

  async function toggleJoin(goal: SharedGoal) {
    const supabase = createClient()
    const member = isMember(goal)

    if (member && goal.creator_id === userId) {
      toast.error("You can't leave your own goal")
      return
    }

    if (member) {
      await supabase.from('goal_members').delete()
        .eq('goal_id', goal.id).eq('user_id', userId)
      setGoals(prev => prev.map(g => g.id === goal.id
        ? { ...g, goal_members: g.goal_members?.filter(m => m.user_id !== userId) }
        : g))
      toast.info('Left goal')
    } else {
      await supabase.from('goal_members').insert({ goal_id: goal.id, user_id: userId })
      await supabase.from('activity_feed').insert({
        user_id: userId,
        type: 'goal_joined',
        message: `joined goal: ${goal.title}`,
        metadata: { goal_id: goal.id },
      })
      setGoals(prev => prev.map(g => g.id === goal.id
        ? { ...g, goal_members: [...(g.goal_members ?? []), { user_id: userId, profiles: undefined }] }
        : g))
      toast.success('Joined goal! 🙌')
    }
  }

  async function toggleReaction(goal: SharedGoal, emoji: string) {
    const supabase = createClient()
    const mine = myReactions(goal)

    if (mine.has(emoji)) {
      await supabase.from('goal_reactions').delete()
        .eq('goal_id', goal.id).eq('user_id', userId).eq('emoji', emoji)
      setGoals(prev => prev.map(g => g.id === goal.id
        ? { ...g, goal_reactions: g.goal_reactions?.filter(r => !(r.user_id === userId && r.emoji === emoji)) }
        : g))
    } else {
      await supabase.from('goal_reactions').insert({ goal_id: goal.id, user_id: userId, emoji })
      setGoals(prev => prev.map(g => g.id === goal.id
        ? { ...g, goal_reactions: [...(g.goal_reactions ?? []), { user_id: userId, emoji }] }
        : g))
    }
  }

  async function updateProgress(goal: SharedGoal, progress: number) {
    const supabase = createClient()
    await supabase.from('shared_goals').update({ progress }).eq('id', goal.id)
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, progress } : g))
  }

  const filtered = filter === 'all' ? goals
    : filter === 'mine' ? goals.filter(g => isMember(g))
    : goals.filter(g => g.category === filter)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-orange-400" />
          <h1 className="text-2xl font-bold">Shared Goals</h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-xl transition-all hover:scale-105 text-sm">
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'mine', ...GOAL_CATEGORIES].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
              filter === f ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                : 'bg-secondary text-muted-foreground hover:text-foreground border border-transparent'
            )}>
            {f}
          </button>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Create Shared Goal</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={createGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Goal Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Deploy Kubernetes homelab"
                  required
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What's the plan? What does success look like?"
                  rows={3}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                  {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl border border-border hover:bg-accent transition-all text-sm">Cancel</button>
                <button type="submit" disabled={creating || !title.trim()}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl transition-all text-sm">
                  {creating ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold">No goals yet</h3>
          <p className="text-muted-foreground text-sm mt-2">Create a shared goal and invite your crew!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((goal, i) => {
            const mine = myReactions(goal)
            const member = isMember(goal)

            // Count reactions per emoji
            const reactionCounts = REACTIONS.reduce<Record<string, number>>((acc, e) => {
              acc[e] = goal.goal_reactions?.filter(r => r.emoji === e).length ?? 0
              return acc
            }, {})

            return (
              <div key={goal.id} style={{ animationDelay: `${i * 50}ms` }}
                className="glass rounded-2xl p-5 flex flex-col gap-4 animate-slide-up card-hover">

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', categoryColors[goal.category] ?? categoryColors.General)}>
                        {goal.category}
                      </span>
                      {goal.status === 'completed' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold mt-2">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>
                    )}
                  </div>
                </div>

                {/* Creator */}
                <div className="flex items-center gap-2">
                  <img
                    src={goal.profiles?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${goal.profiles?.username}`}
                    alt={goal.profiles?.username ?? ''}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-xs text-muted-foreground">by {goal.profiles?.username}</span>
                  <span className="text-xs text-muted-foreground">· {formatRelative(goal.created_at)}</span>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    {goal.creator_id === userId ? (
                      <input
                        type="number"
                        min={0} max={100}
                        value={goal.progress}
                        onChange={e => updateProgress(goal, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-14 text-xs font-mono text-right bg-transparent focus:outline-none text-orange-400"
                      />
                    ) : (
                      <span className="text-xs font-mono text-orange-400">{goal.progress}%</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>

                {/* Members */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-2">
                      {goal.goal_members?.slice(0, 5).map((m, idx) => (
                        <img key={idx}
                          src={m.profiles?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${m.profiles?.username ?? idx}`}
                          alt=""
                          className="w-6 h-6 rounded-full ring-2 ring-background"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      <Users className="w-3 h-3 inline mr-1" />
                      {goal.goal_members?.length ?? 0}
                    </span>
                  </div>

                  <button onClick={() => toggleJoin(goal)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      member
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                    )}>
                    {member ? <><CheckCircle2 className="w-3 h-3" /> Joined</> : <><Plus className="w-3 h-3" /> Join</>}
                  </button>
                </div>

                {/* Reactions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {REACTIONS.map(emoji => {
                    const count = reactionCounts[emoji]
                    const reacted = mine.has(emoji)
                    return (
                      <button key={emoji} onClick={() => toggleReaction(goal, emoji)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all',
                          reacted ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-secondary hover:bg-accent border border-transparent'
                        )}>
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-muted-foreground">{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
