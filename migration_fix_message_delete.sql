-- ═══════════════════════════════════════════════════════════
--  MIGRATION: Soft-delete for messages  (safe to re-run)
--  Paste into Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

-- ── 1. Add is_deleted column if it doesn't exist yet ────────
alter table messages
  add column if not exists is_deleted boolean not null default false;

-- ── 2. DROP every existing messages policy (by querying pg_policies) ──
do $$ declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'messages'
  loop
    execute format('drop policy if exists %I on messages', r.policyname);
  end loop;
end $$;

-- ── 3. Re-create clean policies ─────────────────────────────

-- Sender or receiver can read (includes deleted rows — needed for placeholder)
create policy "messages_select" on messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Only the sender can insert
create policy "messages_insert" on messages for insert
  with check (auth.uid() = sender_id);

-- Sender, receiver, OR admin can soft-delete
create policy "messages_update" on messages for update
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Hard delete: admin only
create policy "messages_delete" on messages for delete
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── 4. Realtime publication (safe, skips if already added) ──
do $$
begin
  alter publication supabase_realtime add table messages;
exception when others then null;
end $$;
