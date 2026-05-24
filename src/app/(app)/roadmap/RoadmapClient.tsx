'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Map, CheckCircle2, Circle, Clock, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'
import type { Milestone, UserMilestone, Profile } from '@/types'
import { MILESTONE_CATEGORIES, CATEGORY_ICONS } from '@/types'

type Props = {
  milestones: Milestone[]
  userMilestones: UserMilestone[]
  allUserMilestones: (UserMilestone & { profiles?: Profile })[]
  profiles: Profile[]
  userId: string
}

const statusConfig = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted/30' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
}

export default function RoadmapClient({ milestones, userMilestones, allUserMilestones, profiles, userId }: Props) {
  const [myMilestones, setMyMilestones] = useState<UserMilestone[]>(userMilestones)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(MILESTONE_CATEGORIES.map(c => [c, true]))
  )
  const [view, setView] = useState<'mine' | 'group'>('mine')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('RHCSA')
  const [adding, setAdding] = useState(false)

  function getMyStatus(milestoneId: string): UserMilestone['status'] {
    return myMilestones.find(um => um.milestone_id === milestoneId)?.status ?? 'not_started'
  }

  async function cycleStatus(milestone: Milestone) {
    const current = getMyStatus(milestone.id)
    const next: UserMilestone['status'] = current === 'not_started' ? 'in_progress'
      : current === 'in_progress' ? 'completed' : 'not_started'

    const supabase = createClient()
    const now = new Date().toISOString()

    const { data } = await supabase
      .from('user_milestones')
      .upsert({
        user_id: userId,
        milestone_id: milestone.id,
        status: next,
        completed_at: next === 'completed' ? now : null,
        updated_at: now,
      }, { onConflict: 'user_id,milestone_id' })
      .select()
      .single()

    setMyMilestones(prev => {
      const without = prev.filter(um => um.milestone_id !== milestone.id)
      return data ? [...without, data] : without
    })

    if (next === 'completed') {
      await supabase.from('activity_feed').insert({
        user_id: userId,
        type: 'milestone_completed',
        message: `completed milestone: ${milestone.category} — ${milestone.title}`,
        metadata: { milestone_id: milestone.id },
      })
      toast.success(`✅ ${milestone.title} completed!`)
    } else if (next === 'in_progress') {
      toast.info(`📌 ${milestone.title} — In Progress`)
    } else {
      toast.info(`Milestone reset`)
    }
  }

  async function addCustomMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('milestones')
      .insert({
        category: newCategory,
        title: newTitle.trim(),
        is_curriculum: false,
        created_by: userId,
        order_index: 99,
      })
      .select()
      .single()

    if (error || !data) { toast.error('Failed to add milestone'); setAdding(false); return }

    toast.success('Custom milestone added!')
    setShowAdd(false)
    setNewTitle('')
    setAdding(false)
    window.location.reload()
  }

  // Calculate group completion per milestone
  function getGroupCompletion(milestoneId: string): number {
    const completed = allUserMilestones.filter(
      um => um.milestone_id === milestoneId && um.status === 'completed'
    ).length
    return profiles.length > 0 ? Math.round((completed / profiles.length) * 100) : 0
  }

  // Group milestones by category
  const allCategories = [...new Set(milestones.map(m => m.category))]

  // My overall progress
  const totalCurriculum = milestones.filter(m => m.is_curriculum).length
  const myCompleted = myMilestones.filter(um => um.status === 'completed').length
  const myProgress = totalCurriculum > 0 ? Math.round((myCompleted / totalCurriculum) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Map className="w-5 h-5 text-orange-400" />
          <h1 className="text-2xl font-bold">NTI Roadmap</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-secondary rounded-xl gap-1">
            <button onClick={() => setView('mine')}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                view === 'mine' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
              My Progress
            </button>
            <button onClick={() => setView('group')}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                view === 'group' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
              Group
            </button>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border hover:border-orange-500/30 rounded-xl text-sm transition-all">
            <Plus className="w-4 h-4" />
            Custom
          </button>
        </div>
      </div>

      {/* My Progress Bar */}
      {view === 'mine' && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Curriculum Progress</span>
            <span className="text-sm font-mono font-bold text-orange-400">{myCompleted}/{totalCurriculum}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-700"
              style={{ width: `${myProgress}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1.5">{myProgress}% complete</div>
        </div>
      )}

      {/* Add Custom Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Add Custom Milestone</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={addCustomMilestone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Milestone Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Set up personal Kubernetes cluster"
                  required
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 rounded-xl border border-border hover:bg-accent transition-all text-sm">Cancel</button>
                <button type="submit" disabled={adding || !newTitle.trim()}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl transition-all text-sm">
                  {adding ? 'Adding...' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Categories */}
      <div className="space-y-4">
        {allCategories.map(category => {
          const categoryMilestones = milestones.filter(m => m.category === category)
          const isOpen = expanded[category] ?? true
          const completedInCat = categoryMilestones.filter(m => getMyStatus(m.id) === 'completed').length
          const icon = CATEGORY_ICONS[category] ?? '📋'

          return (
            <div key={category} className="glass rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [category]: !isOpen }))}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-all"
              >
                <span className="text-xl">{icon}</span>
                <span className="font-semibold flex-1 text-left">{category}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {completedInCat}/{categoryMilestones.length}
                </span>
                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${categoryMilestones.length > 0 ? (completedInCat / categoryMilestones.length) * 100 : 0}%` }}
                  />
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2">
                  {categoryMilestones.map((milestone, i) => {
                    const myStatus = getMyStatus(milestone.id)
                    const config = statusConfig[myStatus]
                    const Icon = config.icon
                    const groupPct = getGroupCompletion(milestone.id)

                    return (
                      <div key={milestone.id}
                        style={{ animationDelay: `${i * 30}ms` }}
                        className={cn('flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border/50 transition-all animate-slide-up', config.bg)}>

                        {view === 'mine' ? (
                          <button onClick={() => cycleStatus(milestone)}
                            className={cn('flex-shrink-0 transition-all hover:scale-110', config.color)}>
                            <Icon className="w-5 h-5" />
                          </button>
                        ) : (
                          <div className={cn('flex-shrink-0', config.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-sm font-medium',
                              myStatus === 'completed' && view === 'mine' && 'line-through text-muted-foreground'
                            )}>
                              {milestone.title}
                            </span>
                            {!milestone.is_curriculum && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">custom</span>
                            )}
                          </div>
                          {milestone.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{milestone.description}</div>
                          )}
                          {view === 'group' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${groupPct}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">{groupPct}%</span>
                            </div>
                          )}
                        </div>

                        {view === 'mine' && (
                          <span className={cn('text-xs font-medium flex-shrink-0', config.color)}>
                            {config.label}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
