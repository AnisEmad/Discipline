import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden noise-bg">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-red-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto animate-fade-in">
        <div className="mb-8">
          <span className="text-7xl flame">🔥</span>
        </div>

        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight mb-4">
          <span className="text-gradient">Discipline</span>
        </h1>

        <p className="text-xl text-muted-foreground mb-3 font-light">
          Build habits. Keep streaks. Stay accountable.
        </p>
        <p className="text-base text-muted-foreground/70 mb-12">
          A private space for you and your crew to track progress with full transparency.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="px-8 py-3.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] text-center"
          >
            Start Tracking →
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3.5 bg-secondary hover:bg-accent text-foreground font-semibold rounded-xl border border-border transition-all duration-200 text-center"
          >
            Sign In
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="mt-16 flex flex-wrap gap-3 justify-center text-sm">
          {['📊 Streak tracking', '🏆 Leaderboards', '👥 Friend transparency', '🗓️ Habit heatmap', '🏅 Achievement badges', '💬 Activity feed'].map((f) => (
            <span key={f} className="px-4 py-2 rounded-full bg-secondary border border-border text-muted-foreground">
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
