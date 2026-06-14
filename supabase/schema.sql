-- Friends of 20 — database schema.
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Safe to run more than once.

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per player, linked to the Supabase Auth user.
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique,
  current_level int  not null default 3,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Table-level access for logged-in users (RLS below still restricts rows).
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── mistakes ────────────────────────────────────────────────────────────────
-- One row per fact the player answered incorrectly. `correct_streak` counts
-- consecutive correct re-answers; the app deletes the row once it clears the
-- configured threshold (default 3).
create table if not exists public.mistakes (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  level          int  not null,
  x              int  not null,
  form           text not null check (form in ('sum', 'addend')),
  correct_streak int  not null default 0,
  updated_at     timestamptz not null default now(),
  unique (user_id, level, x, form)
);

create index if not exists mistakes_user_idx on public.mistakes (user_id);

alter table public.mistakes enable row level security;

grant select, insert, update, delete on public.mistakes to authenticated;
grant all on public.mistakes to service_role;

drop policy if exists "mistakes: read own" on public.mistakes;
create policy "mistakes: read own"
  on public.mistakes for select
  using (auth.uid() = user_id);

drop policy if exists "mistakes: insert own" on public.mistakes;
create policy "mistakes: insert own"
  on public.mistakes for insert
  with check (auth.uid() = user_id);

drop policy if exists "mistakes: update own" on public.mistakes;
create policy "mistakes: update own"
  on public.mistakes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "mistakes: delete own" on public.mistakes;
create policy "mistakes: delete own"
  on public.mistakes for delete
  using (auth.uid() = user_id);
