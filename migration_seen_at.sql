-- ═══════════════════════════════════════════════════════
--  Migration: Add seen_at to messages table
--  Run once in your Supabase SQL editor
-- ═══════════════════════════════════════════════════════

-- 1. Add seen_at column (nullable — null means unseen)
alter table messages
  add column if not exists seen_at timestamp with time zone;

-- 2. Index for fast "unread count" queries per receiver
create index if not exists messages_receiver_unseen
  on messages (receiver_id, seen_at)
  where seen_at is null;

-- 3. Allow receivers to update their own messages' seen_at
drop policy if exists "messages_seen" on messages;
create policy "messages_seen" on messages
  for update using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);
