-- ═══════════════════════════════════════════════════════
--  THE INTERNS HUB — Push Hotfix
--  Paste & run this in: Supabase → SQL Editor
--
--  Fixes: "function extensions.http_post(text, text, unknown)
--          does not exist" crashing message & announcement inserts
--
--  Root causes fixed:
--    1. extensions.http_post → net.http_post  (correct pg_net schema)
--    2. payload::text → payload jsonb         (correct argument type)
--    3. Added EXCEPTION handler               (push failure no longer
--                                              rolls back the INSERT)
--    4. Added Authorization header            (edge function auth)
-- ═══════════════════════════════════════════════════════

-- Step 1: Make sure pg_net is enabled
create extension if not exists pg_net schema extensions;

-- Step 2: Replace the broken helper function
create or replace function _hub_call_push(payload jsonb)
returns void language plpgsql security definer as $$
declare
  _url  text := 'https://gacthqqzbvjtxnukdnwf.supabase.co/functions/v1/send-push';
  _anon text := 'sb_publishable_r39LY-9OtMPIl0C-1btlng_nQcVvGH7';
begin
  perform net.http_post(
    url     := _url,
    body    := payload,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _anon
    )
  );
exception when others then
  -- Push failure must NEVER block message/announcement inserts
  raise warning '[hub] push notify skipped: %', sqlerrm;
end;
$$;

-- Done. Messages and announcements will now insert successfully.
-- Push notifications will fire in the background via pg_net.
-- If the edge function (send-push) is not yet deployed, the warning
-- is silently logged and everything else works normally.
