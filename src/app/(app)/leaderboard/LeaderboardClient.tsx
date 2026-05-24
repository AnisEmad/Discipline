'use client'

import { useState } from 'react'
import { cn, getStreakEmoji, getStreakColor } from '@/lib/utils'
import { Trophy, Flame, TrendingUp, Star } from 'lucide-react'

type Entry = {
  user_id: string
  username: string
  avatar_url: string | null
  longest_streak: number
  total_completions: number
  weekly_completions: number
  badge_count: number
  rank: number
}

type SortKey = 'streak' | 'weekly' | 'total'

const rankEmoji = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export default function LeaderboardClient({
  entries,
  currentUserId,
}: {
  entries: Entry[]
  currentUserId: string
}) {
  const [sortBy, setSortBy] = useState<SortKey>('streak')

  const sorted = [...entries].sort((a, b) => {
    if (sortBy === 'streak') return b.longest_streak - a.longest_streak || b.weekly_completions - a.weekly_completions
    if (sortBy === 'weekly') return b.weekly_completions - a.weekly_completions
    return b.total_completions - a.total_completions
  }).map((e, i) => ({ ...e, rank: i + 1 }))

  const tabs: { key: SortKey; label: string; icon: React.ElementType }[] = [
    { key: 'streak', label: 'Streak', icon: Flame },
    { key: 'weekly', label: 'This Week', icon: TrendingUp },
    { key: 'total', label: 'All Time', icon: Star },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      {/* Sort Tabs */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setSortBy(t.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                sortBy === t.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:block">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Top 3 Podium */}
      {sorted.length >= 3 && (
        <div className="flex items-end justify-center gap-4 pt-4">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-2">
            <img src={sorted[1].avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${sorted[1].username}`}
              alt={sorted[1].username} className="w-14 h-14 rounded-full ring-2 ring-gray-400" />
            <div className="text-center">
              <div className="text-sm font-semibold">{sorted[1].username}</div>
              <div className={cn('text-xs font-mono', getStreakColor(sorted[1].longest_streak))}>
                {sortBy === 'streak' ? `${sorted[1].longest_streak}d` :
                  sortBy === 'weekly' ? `${sorted[1].weekly_completions}` : `${sorted[1].total_completions}`}
              </div>
            </div>
            <div className="w-20 bg-gray-400/20 rounded-t-lg h-16 flex items-center justify-center text-2xl">🥈</div>
          </div>

          {/* 1st */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl flame">👑</div>
            <img src={sorted[0].avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${sorted[0].username}`}
              alt={sorted[0].username} className="w-20 h-20 rounded-full ring-4 ring-yellow-400 glow-orange" />
            <div className="text-center">
              <div className="font-bold">{sorted[0].username}</div>
              <div className={cn('text-sm font-mono font-bold', getStreakColor(sorted[0].longest_streak))}>
                {sortBy === 'streak' ? `${sorted[0].longest_streak}d` :
                  sortBy === 'weekly' ? `${sorted[0].weekly_completions}` : `${sorted[0].total_completions}`}
              </div>
            </div>
            <div className="w-20 bg-yellow-400/20 rounded-t-lg h-24 flex items-center justify-center text-2xl">🥇</div>
          </div>

          {/* 3rd */}
          <div className="flex flex-col items-center gap-2">
            <img src={sorted[2].avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${sorted[2].username}`}
              alt={sorted[2].username} className="w-14 h-14 rounded-full ring-2 ring-amber-600" />
            <div className="text-center">
              <div className="text-sm font-semibold">{sorted[2].username}</div>
              <div className={cn('text-xs font-mono', getStreakColor(sorted[2].longest_streak))}>
                {sortBy === 'streak' ? `${sorted[2].longest_streak}d` :
                  sortBy === 'weekly' ? `${sorted[2].weekly_completions}` : `${sorted[2].total_completions}`}
              </div>
            </div>
            <div className="w-20 bg-amber-600/20 rounded-t-lg h-10 flex items-center justify-center text-2xl">🥉</div>
          </div>
        </div>
      )}

      {/* Full List */}
      <div className="space-y-2">
        {sorted.map((entry, i) => {
          const isMe = entry.user_id === currentUserId
          const value = sortBy === 'streak' ? entry.longest_streak
            : sortBy === 'weekly' ? entry.weekly_completions
            : entry.total_completions
          const label = sortBy === 'streak' ? 'd streak' : sortBy === 'weekly' ? ' this week' : ' total'

          return (
            <div
              key={entry.user_id}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all animate-slide-up',
                isMe
                  ? 'bg-orange-500/5 border-orange-500/30'
                  : 'glass border-transparent hover:border-border'
              )}
            >
              <div className="w-8 text-center font-bold text-muted-foreground font-mono">
                {rankEmoji(entry.rank)}
              </div>

              <img
                src={entry.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${entry.username}`}
                alt={entry.username}
                className="w-10 h-10 rounded-full"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{entry.username}</span>
                  {isMe && <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">you</span>}
                  {entry.badge_count > 0 && (
                    <span className="text-xs text-muted-foreground">🏅 {entry.badge_count}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {entry.total_completions} total completions
                </div>
              </div>

              <div className="text-right">
                <div className={cn('font-bold font-mono text-lg', getStreakColor(entry.longest_streak))}>
                  {getStreakEmoji(value)} {value}
                </div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {sorted.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No competitors yet. Be the first!</p>
        </div>
      )}
    </div>
  )
}
