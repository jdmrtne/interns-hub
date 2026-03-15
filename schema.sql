-- ═══════════════════════════════════════════════════════════
--  THE INTERNS HUB v2 — Supabase Database Schema
--  New project: https://gacthqqzbvjtxnukdnwf.supabase.co
--  Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── 1. USERS TABLE ────────────────────────────────────────
create table if not exists users (
  id         uuid primary key default auth.uid(),
  name       text,
  email      text unique,
  department text,
  role       text default 'intern',    -- 'intern' | 'admin' | 'disabled'
  created_at timestamp with time zone default now()
);

-- Auto-insert user profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    'intern'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── 2. TIME LOGS TABLE ────────────────────────────────────
create table if not exists time_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  date        date not null,
  am_in       time,
  am_out      time,
  pm_in       time,
  pm_out      time,
  total_hours numeric,
  created_at  timestamp with time zone default now(),
  unique(user_id, date)
);

-- ─── 3. MESSAGES TABLE ─────────────────────────────────────
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid references users(id) on delete cascade,
  receiver_id uuid references users(id) on delete cascade,
  message     text not null,
  created_at  timestamp with time zone default now()
);

alter table messages replica identity full;

-- ─── 4. ANNOUNCEMENTS TABLE ────────────────────────────────
create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  message    text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- ─── 5. ANNOUNCEMENT READS (for "seen" tracking) ───────────
create table if not exists announcement_reads (
  user_id        uuid references users(id) on delete cascade,
  announcement_id uuid references announcements(id) on delete cascade,
  read_at        timestamp with time zone default now(),
  primary key (user_id, announcement_id)
);

-- ═══════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table users              enable row level security;
alter table time_logs          enable row level security;
alter table messages           enable row level security;
alter table announcements      enable row level security;
alter table announcement_reads enable row level security;

-- USERS: Logged-in users can read all profiles; update/insert own
drop policy if exists "users_select"  on users;
drop policy if exists "users_insert"  on users;
drop policy if exists "users_update"  on users;
drop policy if exists "users_delete"  on users;

create policy "users_select"  on users for select using (auth.uid() is not null);
create policy "users_insert"  on users for insert with check (auth.uid() = id);
create policy "users_update"  on users for update using (
  auth.uid() = id
  or exists (select 1 from users where id = auth.uid() and role = 'admin')
);
-- Admins can delete users (cascade handles related data)
create policy "users_delete"  on users for delete using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- TIME LOGS: Own logs or admin sees all
drop policy if exists "timelogs_all" on time_logs;
create policy "timelogs_all" on time_logs for all
  using (
    auth.uid() = user_id
    or exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- MESSAGES: Participants only
drop policy if exists "messages_all" on messages;
create policy "messages_all" on messages for all
  using  (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id);

-- ANNOUNCEMENTS: All can read; admins manage
drop policy if exists "ann_select" on announcements;
drop policy if exists "ann_admin"  on announcements;
create policy "ann_select" on announcements for select using (auth.uid() is not null);
create policy "ann_admin"  on announcements for all
  using      (exists (select 1 from users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- ANNOUNCEMENT READS: Own reads
drop policy if exists "annreads_all" on announcement_reads;
create policy "annreads_all" on announcement_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
--  REALTIME
-- ═══════════════════════════════════════════════════════════
begin;
  alter publication supabase_realtime add table messages;
commit;

-- ═══════════════════════════════════════════════════════════
--  DONE — Database is ready for The Interns Hub v2
-- ═══════════════════════════════════════════════════════════
