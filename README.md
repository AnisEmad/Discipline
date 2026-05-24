# 🔥 Discipline

A private habit tracking app for you and your friends — built with full transparency so everyone can see everyone's progress, streaks, and missed days.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Supabase** (auth + database + realtime)
- **Vercel** (deployment)

---

## Quick Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project (free tier is fine)
2. Choose a region close to you
3. Wait for it to spin up (~1 min)

### 2. Run the Database Schema

1. In Supabase dashboard → **SQL Editor**
2. Open `supabase-schema.sql` from this project
3. Paste and click **Run**

### 3. Get Your Keys

In Supabase → **Settings → API**:
- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Set Up the Project Locally

```bash
# Clone or download the project
cd discipline

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local

# Fill in your keys in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment to Vercel (Free)

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
# Follow the prompts
# Add env vars when asked
```

### Option B: GitHub + Vercel Dashboard

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your repo
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

That's it. Vercel auto-deploys on every push to main.

---

## Inviting Friends

Once deployed, share your Vercel URL with friends. They sign up at `/auth/signup` — it's all self-serve. Everyone can see everyone's habits, streaks, and activity.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | Sign up / login / logout via Supabase Auth |
| 💪 Habits | Create, delete, complete daily habits with emoji + color |
| 🔥 Streaks | Auto-calculated consecutive day streaks |
| 🗓️ Heatmap | GitHub-style year heatmap per habit |
| 📊 Dashboard | Today's habits, weekly chart, stats, recent activity |
| 📡 Feed | Public activity feed — everyone's completions in real time |
| 🏆 Leaderboard | Ranked by streak / weekly / all-time completions |
| 👤 Profile | Edit bio, view badges, see personal history |
| 🏅 Badges | Auto-earned: First Step, Week Warrior, Iron Will, Centurion |
| 💬 Daily Quote | Rotating motivational quote on dashboard |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/            # Protected routes (need auth)
│   │   ├── dashboard/    # Main dashboard
│   │   ├── habits/       # Habit management + heatmap
│   │   ├── feed/         # Activity feed
│   │   ├── leaderboard/  # Rankings
│   │   └── profile/      # User profile
│   ├── auth/
│   │   ├── login/
│   │   └── signup/
│   ├── layout.tsx
│   ├── page.tsx          # Landing page
│   └── globals.css
├── components/
│   └── Navbar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts     # Browser client
│   │   └── server.ts     # Server client
│   ├── habits.ts         # Habit data functions
│   ├── activity.ts       # Feed data functions
│   ├── leaderboard.ts    # Leaderboard data
│   └── utils.ts          # Shared utilities
├── types/
│   └── index.ts          # TypeScript types
└── middleware.ts          # Auth redirects
```

---

## Supabase Free Tier Limits

The free tier is generous and more than enough for a friend group:
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 2 GB bandwidth

---

## Customization Tips

- **Add more emojis**: Edit `HABIT_EMOJIS` in `src/types/index.ts`
- **Add more badges**: Add to `BADGE_CONFIG` and award them in the SQL function
- **Change colors**: Edit CSS variables in `globals.css`
- **Add more quotes**: Edit the `quotes` array in `src/lib/utils.ts`
