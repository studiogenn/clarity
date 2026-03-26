-- Clarity App — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Profiles (extends Supabase Auth users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default 'Danielle',
  life_audit text,
  created_at timestamp with time zone default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, 'Danielle');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Daily check-ins
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  overall_mood int check (overall_mood between 1 and 10),
  energy int check (energy between 1 and 10),
  anxiety int check (anxiety between 1 and 10),
  clarity int check (clarity between 1 and 10),
  freeform_note text,
  claude_response text,
  emotion_tags text[],
  created_at timestamp with time zone default now()
);

-- Chat sessions
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  messages jsonb default '[]'::jsonb,
  summary text,
  created_at timestamp with time zone default now()
);

-- Emotion audits
create table if not exists emotion_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  raw_conversation jsonb,
  synthesis text,
  emotion_identified text,
  root_cause text,
  action_step text,
  created_at timestamp with time zone default now()
);

-- Weekly reports
create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  week_starting date,
  report_content text,
  created_at timestamp with time zone default now()
);

-- Daily generated content (affirmations, challenges)
create table if not exists daily_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  affirmation text,
  micro_challenge text,
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);

-- Row Level Security (RLS) — users can only access their own data
alter table profiles enable row level security;
alter table checkins enable row level security;
alter table chat_sessions enable row level security;
alter table emotion_audits enable row level security;
alter table weekly_reports enable row level security;
alter table daily_content enable row level security;

-- Policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can manage own checkins" on checkins for all using (auth.uid() = user_id);
create policy "Users can manage own chat sessions" on chat_sessions for all using (auth.uid() = user_id);
create policy "Users can manage own audits" on emotion_audits for all using (auth.uid() = user_id);
create policy "Users can manage own reports" on weekly_reports for all using (auth.uid() = user_id);
create policy "Users can manage own daily content" on daily_content for all using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_checkins_user_date on checkins(user_id, date);
create index if not exists idx_chat_sessions_user on chat_sessions(user_id, created_at);
create index if not exists idx_daily_content_user_date on daily_content(user_id, date);
