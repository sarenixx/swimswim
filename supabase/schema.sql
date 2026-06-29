-- Minimal test-swim sync schema.
-- Run this in the Supabase SQL editor before enabling VITE_SUPABASE_* env vars.

create extension if not exists pgcrypto;

create table if not exists public.mission_snapshots (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text not null
);

alter table public.mission_snapshots enable row level security;

grant select, insert, update on public.mission_snapshots to anon, authenticated;

drop policy if exists "mission snapshots readable for test swim" on public.mission_snapshots;
create policy "mission snapshots readable for test swim"
on public.mission_snapshots
for select
using (true);

drop policy if exists "mission snapshots writable for test swim" on public.mission_snapshots;
create policy "mission snapshots writable for test swim"
on public.mission_snapshots
for insert
with check (true);

drop policy if exists "mission snapshots updatable for test swim" on public.mission_snapshots;
create policy "mission snapshots updatable for test swim"
on public.mission_snapshots
for update
using (true)
with check (true);

create table if not exists public.wowsa_evidence (
  id uuid primary key default gen_random_uuid(),
  mission_id text not null,
  photo_id text,
  captured_at timestamptz not null,
  gps text,
  lat double precision,
  lon double precision,
  gps_accuracy_m double precision,
  distance_swum text,
  notes text,
  image_storage_key text,
  image_name text,
  image_size_bytes bigint,
  evidence_status text,
  actor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wowsa_evidence enable row level security;

grant select, insert, update on public.wowsa_evidence to anon, authenticated;

drop policy if exists "wowsa evidence readable for test swim" on public.wowsa_evidence;
create policy "wowsa evidence readable for test swim"
on public.wowsa_evidence
for select
using (true);

drop policy if exists "wowsa evidence writable for test swim" on public.wowsa_evidence;
create policy "wowsa evidence writable for test swim"
on public.wowsa_evidence
for insert
with check (true);

drop policy if exists "wowsa evidence updatable for test swim" on public.wowsa_evidence;
create policy "wowsa evidence updatable for test swim"
on public.wowsa_evidence
for update
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('wowsa-evidence', 'wowsa-evidence', false)
on conflict (id) do nothing;

drop policy if exists "wowsa images readable for test swim" on storage.objects;
create policy "wowsa images readable for test swim"
on storage.objects
for select
using (bucket_id = 'wowsa-evidence');

drop policy if exists "wowsa images uploadable for test swim" on storage.objects;
create policy "wowsa images uploadable for test swim"
on storage.objects
for insert
with check (bucket_id = 'wowsa-evidence');

drop policy if exists "wowsa images replaceable for test swim" on storage.objects;
create policy "wowsa images replaceable for test swim"
on storage.objects
for update
using (bucket_id = 'wowsa-evidence')
with check (bucket_id = 'wowsa-evidence');

drop policy if exists "wowsa images removable for test swim" on storage.objects;
create policy "wowsa images removable for test swim"
on storage.objects
for delete
using (bucket_id = 'wowsa-evidence');

create table if not exists public.observation_push_subscriptions (
  endpoint text primary key,
  mission_id text not null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.observation_push_subscriptions enable row level security;

grant select, insert, update, delete on public.observation_push_subscriptions to anon, authenticated;

drop policy if exists "observation push subscriptions readable for test swim" on public.observation_push_subscriptions;
create policy "observation push subscriptions readable for test swim"
on public.observation_push_subscriptions
for select
using (true);

drop policy if exists "observation push subscriptions writable for test swim" on public.observation_push_subscriptions;
create policy "observation push subscriptions writable for test swim"
on public.observation_push_subscriptions
for insert
with check (true);

drop policy if exists "observation push subscriptions updatable for test swim" on public.observation_push_subscriptions;
create policy "observation push subscriptions updatable for test swim"
on public.observation_push_subscriptions
for update
using (true)
with check (true);

drop policy if exists "observation push subscriptions removable for test swim" on public.observation_push_subscriptions;
create policy "observation push subscriptions removable for test swim"
on public.observation_push_subscriptions
for delete
using (true);

create table if not exists public.observation_reminder_sessions (
  id text primary key,
  mission_id text not null,
  endpoint text not null references public.observation_push_subscriptions(endpoint) on delete cascade,
  subscription jsonb not null,
  title text not null,
  interval_minutes integer not null default 30 check (interval_minutes between 5 and 180),
  started_at timestamptz not null,
  next_due_at timestamptz,
  last_sent_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists observation_reminder_sessions_due_idx
on public.observation_reminder_sessions(status, next_due_at);

alter table public.observation_reminder_sessions enable row level security;

grant select, insert, update, delete on public.observation_reminder_sessions to anon, authenticated;

drop policy if exists "observation reminder sessions readable for test swim" on public.observation_reminder_sessions;
create policy "observation reminder sessions readable for test swim"
on public.observation_reminder_sessions
for select
using (true);

drop policy if exists "observation reminder sessions writable for test swim" on public.observation_reminder_sessions;
create policy "observation reminder sessions writable for test swim"
on public.observation_reminder_sessions
for insert
with check (true);

drop policy if exists "observation reminder sessions updatable for test swim" on public.observation_reminder_sessions;
create policy "observation reminder sessions updatable for test swim"
on public.observation_reminder_sessions
for update
using (true)
with check (true);

drop policy if exists "observation reminder sessions removable for test swim" on public.observation_reminder_sessions;
create policy "observation reminder sessions removable for test swim"
on public.observation_reminder_sessions
for delete
using (true);

do $$
begin
  alter publication supabase_realtime add table public.mission_snapshots;
exception
  when duplicate_object then null;
end $$;
