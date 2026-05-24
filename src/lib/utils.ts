import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatRelative(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function getStreakEmoji(streak: number): string {
  if (streak === 0) return '💤'
  if (streak < 3) return '🔥'
  if (streak < 7) return '🔥🔥'
  if (streak < 14) return '⚡'
  if (streak < 30) return '💥'
  if (streak < 100) return '🚀'
  return '👑'
}

export function getStreakColor(streak: number): string {
  if (streak === 0) return 'text-muted-foreground'
  if (streak < 7) return 'text-orange-400'
  if (streak < 30) return 'text-yellow-400'
  return 'text-amber-300'
}

export function getDailyQuote(): { text: string; author: string } {
  const quotes = [
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
    { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
    { text: "You will never always be motivated. You have to learn to be disciplined.", author: "Unknown" },
    { text: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell" },
    { text: "It's not about having time. It's about making time.", author: "Unknown" },
    { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
    { text: "The pain of discipline is far less than the pain of regret.", author: "Unknown" },
    { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { text: "Consistency is the key to achieving and maintaining momentum.", author: "Darren Hardy" },
  ]

  const dayIndex = Math.floor(Date.now() / 86400000) % quotes.length
  return quotes[dayIndex]
}

export function calcCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export function getLast365Days(): string[] {
  return Array.from({ length: 365 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (364 - i))
    return d.toISOString().split('T')[0]
  })
}
