-- ============================================================
-- DISCIPLINE APP — SUPABASE SCHEMA
-- Run this in your Supabase project's SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null
);

-- Habits
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  emoji text default '📚' not null,
  color text default '#f97316' not null,
  current_streak integer default 0 not null,
  longest_streak integer default 0 not null,
  total_completions integer default 0 not null,
  created_at timestamptz default now() not null
);

-- Habit Logs (one per habit per day)
create table public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed_at timestamptz default now() not null,
  note text,
  -- Enforce one completion per habit per day
  unique (habit_id, user_id, (completed_at::date))
);

-- Activity Feed
create table public.activity_feed (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete set null,
  type text not null check (type in ('habit_completed', 'streak_milestone', 'habit_missed', 'joined', 'badge_earned')),
  message text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Badges
create table public.badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_type text not null,
  earned_at timestamptz default now() not null,
  unique (user_id, badge_type)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index habits_user_id_idx on public.habits(user_id);
create index habit_logs_habit_id_idx on public.habit_logs(habit_id);
create index habit_logs_user_id_idx on public.habit_logs(user_id);
create index habit_logs_completed_at_idx on public.habit_logs(completed_at desc);
create index activity_feed_user_id_idx on public.activity_feed(user_id);
create index activity_feed_created_at_idx on public.activity_feed(created_at desc);
create index badges_user_id_idx on public.badges(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.activity_feed enable row level security;
alter table public.badges enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Habits: anyone can read, only owner can write
create policy "Habits are viewable by everyone" on public.habits
  for select using (true);

create policy "Users can insert own habits" on public.habits
  for insert with check (auth.uid() = user_id);

create policy "Users can update own habits" on public.habits
  for update using (auth.uid() = user_id);

create policy "Users can delete own habits" on public.habits
  for delete using (auth.uid() = user_id);

-- Habit Logs: anyone can read, only owner can write
create policy "Habit logs are viewable by everyone" on public.habit_logs
  for select using (true);

create policy "Users can insert own habit logs" on public.habit_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own habit logs" on public.habit_logs
  for delete using (auth.uid() = user_id);

-- Activity Feed: everyone can read, only owner can insert
create policy "Activity feed is viewable by everyone" on public.activity_feed
  for select using (true);

create policy "Users can insert own activity" on public.activity_feed
  for insert with check (auth.uid() = user_id);

-- Badges: everyone can read, only owner can receive
create policy "Badges are viewable by everyone" on public.badges
  for select using (true);

create policy "Users can insert own badges" on public.badges
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/9.x/initials/svg?seed=' || coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update streak when habit is completed
create or replace function public.update_habit_streak(p_habit_id uuid, p_user_id uuid)
returns void as $$
declare
  v_streak integer := 0;
  v_date date;
  v_check_date date := current_date;
  v_longest integer;
begin
  -- Count consecutive days backwards from today
  loop
    select (completed_at::date) into v_date
    from public.habit_logs
    where habit_id = p_habit_id
      and user_id = p_user_id
      and completed_at::date = v_check_date
    limit 1;

    exit when v_date is null;

    v_streak := v_streak + 1;
    v_check_date := v_check_date - 1;
  end loop;

  -- Get current longest
  select longest_streak into v_longest from public.habits where id = p_habit_id;

  -- Update
  update public.habits
  set
    current_streak = v_streak,
    longest_streak = greatest(v_longest, v_streak),
    total_completions = (
      select count(*) from public.habit_logs
      where habit_id = p_habit_id and user_id = p_user_id
    )
  where id = p_habit_id;

  -- Award streak badges
  if v_streak >= 7 then
    insert into public.badges (user_id, badge_type)
    values (p_user_id, 'week_streak')
    on conflict do nothing;
  end if;

  if v_streak >= 30 then
    insert into public.badges (user_id, badge_type)
    values (p_user_id, 'month_streak')
    on conflict do nothing;
  end if;

  -- Award first habit badge
  insert into public.badges (user_id, badge_type)
  values (p_user_id, 'first_habit')
  on conflict do nothing;

  -- Award century badge
  if (select total_completions from public.habits where id = p_habit_id) >= 100 then
    insert into public.badges (user_id, badge_type)
    values (p_user_id, 'century')
    on conflict do nothing;
  end if;
end;
$$ language plpgsql security definer;

-- Recalculate streak (used when uncompleting)
create or replace function public.recalc_habit_streak(p_habit_id uuid, p_user_id uuid)
returns void as $$
begin
  perform public.update_habit_streak(p_habit_id, p_user_id);
end;
$$ language plpgsql security definer;

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for activity feed (optional — for live updates)
alter publication supabase_realtime add table public.activity_feed;
alter publication supabase_realtime add table public.habit_logs;
