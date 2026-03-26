-- ═══════════════════════════════════════════════════════
--  THE INTERNS HUB — Push Subscriptions Table
--  Run this in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── 1. Push subscriptions table ────────────────────────
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null,
  subscription jsonb not null,        -- full PushSubscription JSON
  device_hint text default 'desktop', -- 'ios' | 'android' | 'desktop'
  created_at  timestamp with time zone default now(),
  unique (user_id, endpoint)
);

-- ─── 2. RLS — only the owning user can read/write their own subscription ──
alter table push_subscriptions enable row level security;

drop policy if exists "push_sub_own" on push_subscriptions;
create policy "push_sub_own" on push_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (used by the Edge Function) bypasses RLS automatically.

-- ─── 3. Index for fast look-ups by user ─────────────────
create index if not exists push_subscriptions_user_id_idx
  on push_subscriptions (user_id);

-- ─── 4. Add table to realtime publication (optional) ────
-- alter publication supabase_realtime add table push_subscriptions;
