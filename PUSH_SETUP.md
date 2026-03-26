# 🔔 Push Notifications — Setup Guide
## The Interns Hub · Works on Android, Desktop, iPhone (PWA)

---

## What was fixed in v2

| Problem | Fix |
|---|---|
| SW never installed → no background push | `push.js` now calls `navigator.serviceWorker.register()` explicitly |
| `npm:web-push` fails in Deno | Edge Function rewritten with native Web Crypto (zero dependencies) |
| Webhooks require manual UI setup | `push_setup.sql` installs pg_net triggers that fire automatically |

---

## 3-step setup (that's it)

### Step 1 — Run the SQL

Go to **Supabase → SQL Editor**, paste the entire contents of `push_setup.sql`, and click **Run**.

This creates the `push_subscriptions` table and installs Postgres triggers that automatically call your Edge Function whenever a message or announcement is inserted.

---

### Step 2 — Deploy the Edge Function

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Log in
supabase login

# Link to your project
supabase link --project-ref gacthqqzbvjtxnukdnwf

# Deploy
supabase functions deploy send-push --no-verify-jwt
```

---

### Step 3 — Set the secrets

In **Supabase → Settings → Edge Function Secrets**, add:

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `BJVqeBtsr4gsTyjHRh6d-imHsRMH38P9HXVIwdS4qEuBI1NNsYR-gcWJZXwaVrUPPep9zbGOCsHJObpEXdLLKzk` |
| `VAPID_PRIVATE_KEY` | `C-yPbbkcVHKYgJpJragFdPfWPndlPuHRkou8KHOiIcU` |
| `VAPID_EMAIL` | `mailto:your@email.com` |

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't add those.

Then commit and push all changed files to GitHub.

---

## How it works end-to-end

```
User opens site → push.js registers sw.js → asks for notification permission
  → subscription saved to push_subscriptions table in Supabase

Someone sends a message or admin posts announcement
  → Postgres INSERT triggers trig_push_message / trig_push_announcement
    → pg_net calls send-push Edge Function
      → Edge Function encrypts payload, sends to browser push service
        → sw.js receives push event → showNotification()
          → OS shows native notification (even if browser/tab is closed)
            → user taps → app opens to the right page
```

---

## Platform support

| Platform | Status | Notes |
|---|---|---|
| Android Chrome | ✅ Full push | Works when browser is fully closed |
| Desktop Chrome / Edge | ✅ Full push | Works when tab is closed |
| Desktop Firefox | ✅ Full push | Works when tab is closed |
| iPhone Safari (iOS 16.4+) | ✅ Works | Must install via "Add to Home Screen" first — app shows a banner guiding users |
| iPhone Chrome / Firefox | ⚠️ Limited | Apple forces all iOS browsers to use Safari engine; PWA install still required |

---

## Troubleshooting

**"Enable Notifications" banner never appears**
- Open DevTools → Console — look for `[HubPush]` messages
- Check Application → Service Workers — is `sw.js` registered and active?
- If you previously denied permission: browser address bar → 🔒 → Notifications → Reset

**Notifications appear in-app but not when closed**
- Check Supabase → Edge Functions → `send-push` → Logs for errors
- Verify all 3 secrets are set correctly
- Check `push_subscriptions` table has a row for your user

**iPhone not working**
- iOS 16.4 or later required
- Must use Safari, not Chrome or Firefox
- Must tap Share ⬆ → Add to Home Screen first
- Open the PWA from your home screen — the banner will then appear
