-- ═══════════════════════════════════════════════════════════
--  MIGRATION: Fix message delete permissions
--  Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Drop old policy
drop policy if exists "messages_all" on messages;

-- New policy:
--   SELECT  → sender or receiver can read
--   INSERT  → only sender (auth.uid = sender_id)
--   UPDATE  → only sender
--   DELETE  → sender, receiver, OR admin role

create policy "messages_select" on messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "messages_insert" on messages for insert
  with check (auth.uid() = sender_id);

create policy "messages_update" on messages for update
  using  (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create policy "messages_delete" on messages for delete
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'admin'
    )
  );

-- Make sure realtime tracks DELETE events (replica identity full already set)
-- If you haven't already added messages to the realtime publication, run:
-- alter publication supabase_realtime add table messages;
