-- ═══════════════════════════════════════════════════════════
--  Migration: Add internship_hours to users table
--  Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Add internship_hours column (total expected internship hours per intern)
-- NULL means no period has been set yet by admin
alter table public.users
  add column if not exists internship_hours numeric default null;

-- ═══════════════════════════════════════════════════════════
--  DONE — internship_hours field is ready
--  Admins can now set each intern's total expected hours.
--  The app calculates progress as:
--    sum(time_logs.total_hours) / internship_hours * 100
-- ═══════════════════════════════════════════════════════════
