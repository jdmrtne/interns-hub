-- ═══════════════════════════════════════════════════════
--  THE INTERNS HUB — Push Notifications Setup
--  Run the whole file in: Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── 1. Push subscriptions table ────────────────────────
create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  endpoint     text not null,
  subscription jsonb not null,
  device_hint  text default 'desktop',
  created_at   timestamp with time zone default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

drop policy if exists "push_sub_own" on push_subscriptions;
create policy "push_sub_own" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists push_subs_user_idx on push_subscriptions (user_id);

-- ─── 2. Auto-trigger push via pg_net (no webhooks needed) ───────
-- This calls the Edge Function directly from Postgres whenever a
-- message or announcement is inserted.

-- Enable pg_net extension (already enabled in most Supabase projects)
create extension if not exists pg_net schema extensions;

-- Helper: call the send-push Edge Function
create or replace function _hub_call_push(payload jsonb)
returns void language plpgsql security definer as $$
declare
  _url  text := current_setting('app.supabase_url', true) || '/functions/v1/send-push';
  _key  text := current_setting('app.service_role_key', true);
begin
  -- If app settings aren't set, fall back to env vars via secret
  if _url is null or _url = '/functions/v1/send-push' then
    -- Supabase injects these as vault secrets — adjust project ref below
    _url := 'https://gacthqqzbvjtxnukdnwf.supabase.co/functions/v1/send-push';
  end if;
  if _key is null then
    _key := current_setting('request.jwt.secret', true);
  end if;

  perform extensions.http_post(
    _url,
    payload::text,
    'application/json'
  );
end;
$$;

-- Trigger: new message → push to receiver
create or replace function _hub_push_on_message()
returns trigger language plpgsql security definer as $$
begin
  perform _hub_call_push(jsonb_build_object(
    'type',   'INSERT',
    'table',  'messages',
    'record', row_to_json(new)::jsonb
  ));
  return new;
end;
$$;

drop trigger if exists trig_push_message on messages;
create trigger trig_push_message
  after insert on messages
  for each row execute function _hub_push_on_message();

-- Trigger: new announcement → push to all users
create or replace function _hub_push_on_announcement()
returns trigger language plpgsql security definer as $$
begin
  perform _hub_call_push(jsonb_build_object(
    'type',   'INSERT',
    'table',  'announcements',
    'record', row_to_json(new)::jsonb
  ));
  return new;
end;
$$;

drop trigger if exists trig_push_announcement on announcements;
create trigger trig_push_announcement
  after insert on announcements
  for each row execute function _hub_push_on_announcement();

-- ─── 3. Done ────────────────────────────────────────────
-- You still need to:
--   a) Deploy the Edge Function (see PUSH_SETUP.md)
--   b) Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
--      in Supabase → Settings → Edge Function Secrets
