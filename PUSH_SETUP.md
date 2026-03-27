# 🔔 Push Notifications — Setup Guide
## OS-level notifications (lock screen, Windows, macOS) — like WhatsApp & Gmail

---

## What you already did ✅
- Ran `hotfix_push.sql` → Postgres triggers now correctly call `net.http_post()`

## What you still need to do (2 steps)

---

## Step 1 — Deploy the Edge Function

The Edge Function (`send-push`) is the server that actually delivers the
notification to Android / iPhone / Windows / macOS.  Without this, nothing arrives.

Install the Supabase CLI if you haven't:
```bash
npm install -g supabase
```

Then from your project folder:
```bash
supabase login
supabase link --project-ref gacthqqzbvjtxnukdnwf
supabase functions deploy send-push --no-verify-jwt
```

The `index.ts` file inside `supabase/functions/send-push/` is the function.

---

## Step 2 — Set the 3 secrets

Go to **Supabase → Settings → Edge Function Secrets** and add:

| Secret name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `BJVqeBtsr4gsTyjHRh6d-imHsRMH38P9HXVIwdS4qEuBI1NNsYR-gcWJZXwaVrUPPep9zbGOCsHJObpEXdLLKzk` |
| `VAPID_PRIVATE_KEY` | `C-yPbbkcVHKYgJpJragFdPfWPndlPuHRkou8KHOiIcU` |
| `VAPID_EMAIL` | `mailto:your@email.com` (use your real email) |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't add those.

---

## That's it. Push and redeploy to GitHub.

---

## How the full flow works

```
User opens site
  → sw.js registers as a Service Worker in the browser
  → "Enable Notifications" banner appears
  → User clicks Enable → browser asks for permission
  → Subscription saved to push_subscriptions table in Supabase

Someone sends a message (or admin posts an announcement)
  → Postgres INSERT fires
  → net.http_post() calls the send-push Edge Function   ← fixed by hotfix_push.sql
  → Edge Function encrypts payload with VAPID
  → Sends to Google FCM / Apple APNs / Mozilla push server
  → Browser/OS receives it and shows a native notification
     ✓ Android lock screen
     ✓ Windows notification centre (bottom-right popup)
     ✓ macOS notification banner (top-right)
     ✓ iPhone lock screen (PWA mode, iOS 16.4+)
  → User taps → app opens to the right page
```

---

## Troubleshooting

**Check Edge Function logs:**
Supabase → Edge Functions → send-push → Logs
You'll see: `sent=1 expired=0 errors=0` on success.

**Check the trigger is firing:**
Supabase → Database → Logs — look for `hub` warnings.

**User never sees the permission prompt:**
- Open browser DevTools → Console → look for `[HubPush]` messages
- Check Application → Service Workers — is sw.js Active?
- If permission was previously denied: address bar → 🔒 → Notifications → Reset

**iPhone not working:**
- Requires iOS 16.4 or later + Safari only
- Must tap Share ⬆ → Add to Home Screen → open from home screen
- The banner will guide users through this automatically

---

## Platform support

| Platform | Status |
|---|---|
| Android Chrome | ✅ Works even when browser is closed |
| Desktop Chrome / Edge | ✅ Works when tab is closed |
| Desktop Firefox | ✅ Works when tab is closed |
| iPhone Safari (PWA) | ✅ iOS 16.4+, must install to home screen |
| iPhone Chrome/Firefox | ⚠️ Apple forces Safari engine — same PWA requirement |
