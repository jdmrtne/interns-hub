-- ═══════════════════════════════════════════════════════════
--  MIGRATION: Add is_deleted soft-delete to messages table
--  Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Add is_deleted column (safe to run multiple times)
alter table messages
  add column if not exists is_deleted boolean not null default false;

-- 2. Fix RLS: drop old catch-all policy, replace with scoped ones
drop policy if exists "messages_all"    on messages;
drop policy if exists "messages_select" on messages;
drop policy if exists "messages_insert" on messages;
drop policy if exists "messages_update" on messages;
drop policy if exists "messages_delete" on messages;

-- SELECT: sender or receiver can read
create policy "messages_select" on messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- INSERT: only the sender
create policy "messages_insert" on messages for insert
  with check (auth.uid() = sender_id);

-- UPDATE (soft-delete): sender, receiver, or admin can mark as deleted
create policy "messages_update" on messages for update
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  )
  with check (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- DELETE: admin only (hard delete if ever needed)
create policy "messages_delete" on messages for delete
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- 3. Ensure realtime publication includes messages (safe — skips if already added)
do $$
begin
  alter publication supabase_realtime add table messages;
exception when others then
  -- already a member, nothing to do
end;
$$;
