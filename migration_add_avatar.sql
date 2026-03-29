-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: Add avatar_url to users table
-- Run in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Add the avatar_url column (text — stores compressed base64 JPEG data URL)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. No index needed (not queried, just read per-row).
--    RLS policy already covers UPDATE on users (own row or admin), so no
--    additional policy changes are required.

-- ── Done ─────────────────────────────────────────────────────────────────
-- Users can now store a compressed profile photo in avatar_url.
-- The profile.js client compresses uploaded images to ≤ 80 KB before saving,
-- so the column stays small (a typical avatar is 20–60 KB as base64).
