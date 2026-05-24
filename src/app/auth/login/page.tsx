'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Welcome back! 🔥')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 noise-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-orange-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-4xl flame">🔥</span>
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-1">Welcome back</h1>
          <p className="text-muted-foreground">Your streak is waiting for you</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]"
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-muted-foreground text-sm">
          No account?{' '}
          <Link href="/auth/signup" className="text-orange-400 hover:text-orange-300 font-medium">
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  )
}
