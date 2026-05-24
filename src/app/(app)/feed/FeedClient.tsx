'use client'

import { formatRelative } from '@/lib/utils'
import type { ActivityFeedItem } from '@/types'
import { Rss } from 'lucide-react'

const typeConfig = {
  habit_completed: { emoji: '✅', color: 'text-green-400' },
  streak_milestone: { emoji: '🔥', color: 'text-orange-400' },
  habit_missed: { emoji: '💤', color: 'text-muted-foreground' },
  joined: { emoji: '👋', color: 'text-blue-400' },
  badge_earned: { emoji: '🏅', color: 'text-yellow-400' },
}

export default function FeedClient({ feed }: { feed: ActivityFeedItem[] }) {
  // Group by day
  const grouped = feed.reduce<Record<string, ActivityFeedItem[]>>((acc, item) => {
    const day = item.created_at.split('T')[0]
    if (!acc[day]) acc[day] = []
    acc[day].push(item)
    return acc
  }, {})

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Activity Feed</h1>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {feed.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Rss className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold">Nothing here yet</h3>
          <p className="text-muted-foreground text-sm mt-2">Complete a habit to see activity here!</p>
        </div>
      ) : (
        days.map(day => (
          <div key={day}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">
                {new Date(day + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric'
                })}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              {grouped[day].map((item, i) => {
                const config = typeConfig[item.type] ?? typeConfig.habit_completed
                return (
                  <div
                    key={item.id}
                    className="glass rounded-xl p-4 flex items-start gap-4 card-hover animate-slide-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <img
                      src={item.profiles?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${item.profiles?.username}`}
                      alt={item.profiles?.username ?? ''}
                      className="w-9 h-9 rounded-full flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{item.profiles?.username}</span>
                        {' '}
                        <span className="text-foreground/80">{item.message}</span>
                      </p>

                      {item.habits && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                          style={{ backgroundColor: `${item.habits.color}15`, color: item.habits.color }}>
                          <span>{item.habits.emoji}</span>
                          <span>{item.habits.name}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {formatRelative(item.created_at)}
                      </p>
                    </div>

                    <span className={`text-lg flex-shrink-0 ${config.color}`}>{config.emoji}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
