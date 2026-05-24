'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Flame, Rss, Trophy, User, LogOut, Radio, Timer, Map, Target } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { toast } from 'sonner'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/presence', label: 'Crew', icon: Radio },
  { href: '/sessions', label: 'Sessions', icon: Timer },
  { href: '/roadmap', label: 'Roadmap', icon: Map },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/feed', label: 'Feed', icon: Rss },
  { href: '/leaderboard', label: 'Rank', icon: Trophy },
]

export default function Navbar({ user, profile }: { user: SupabaseUser; profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    // Set offline on logout
    await supabase
      .from('user_presence')
      .update({ status: 'offline', current_focus: null })
      .eq('id', user.id)
    await supabase.auth.signOut()
    toast.success('Logged out. Keep grinding! 🔥')
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
            <span className="flame">🔥</span>
            <span className="text-gradient hidden sm:block">Discipline</span>
          </Link>

          {/* Desktop nav — scrollable if needed */}
          <div className="hidden sm:flex items-center gap-0.5 overflow-x-auto">
            {navLinks.map(link => {
              const Icon = link.icon
              const active = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    active
                      ? 'bg-orange-500/10 text-orange-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/profile"
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                pathname.startsWith('/profile')
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <img
                src={profile?.avatar_url ?? `https://api.dicebear.com/9.x/initials/svg?seed=${profile?.username}`}
                alt={profile?.username ?? 'User'}
                className="w-6 h-6 rounded-full"
              />
              <span className="hidden sm:block">{profile?.username}</span>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-16 px-1 overflow-x-auto">
          {[...navLinks.slice(0, 4),{ href: '/profile', label: 'Me', icon: User }].map(link => {
            const Icon = link.icon
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all flex-shrink-0',
                  active ? 'text-orange-400' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
