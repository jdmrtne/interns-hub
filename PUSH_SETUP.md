# 🔔 Push Notifications — Setup Guide
### The Interns Hub · Web Push (Android, Desktop, iPhone PWA)

---

## What was added

| File | Change |
|---|---|
| `sw.js` | Added `push` + `notificationclick` event handlers |
| `push.js` | New — permission banner, iOS banner, Supabase subscription |
| `notifications.js` | `HubMsgPoller.start()` now calls `HubPush.init()` automatically |
| All HTML pages | Added `<script src="./push.js">` after `notifications.js` |
| `supabase/functions/send-push/index.ts` | New Deno Edge Function |
| `push_setup.sql` | New table: `push_subscriptions` |

---

## Step 1 — Run the SQL

In **Supabase → SQL Editor**, paste and run the contents of `push_setup.sql`.

---

## Step 2 — Deploy the Edge Function

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref gacthqqzbvjtxnukdnwf

# Deploy the function
supabase functions deploy send-push
```

---

## Step 3 — Set Edge Function Secrets

In **Supabase → Settings → Edge Function Secrets**, add these:

| Secret name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `BJVqeBtsr4gsTyjHRh6d-imHsRMH38P9HXVIwdS4qEuBI1NNsYR-gcWJZXwaVrUPPep9zbGOCsHJObpEXdLLKzk` |
| `VAPID_PRIVATE_KEY` | `C-yPbbkcVHKYgJpJragFdPfWPndlPuHRkou8KHOiIcU` |
| `VAPID_EMAIL` | `mailto:your@email.com` ← use your real email |

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase — you don't need to add those.

---

## Step 4 — Set up Database Webhooks

In **Supabase → Database → Webhooks**, create two webhooks:

### Webhook 1 — Messages
| Field | Value |
|---|---|
| Name | `push-on-message` |
| Table | `public.messages` |
| Events | ✅ Insert |
| URL | `https://gacthqqzbvjtxnukdnwf.supabase.co/functions/v1/send-push` |
| HTTP Headers | `Authorization: Bearer <your-anon-key>` |

### Webhook 2 — Announcements
| Field | Value |
|---|---|
| Name | `push-on-announcement` |
| Table | `public.announcements` |
| Events | ✅ Insert |
| URL | `https://gacthqqzbvjtxnukdnwf.supabase.co/functions/v1/send-push` |
| HTTP Headers | `Authorization: Bearer <your-anon-key>` |

> Find your anon key in: **Supabase → Settings → API → Project API Keys → anon public**

---

## Step 5 — Commit & Push to GitHub

```bash
git add sw.js push.js notifications.js push_setup.sql supabase/
git add dashboard.html announcements.html messages.html interns.html
git add admin.html daily-logs.html chat.html index.html
git commit -m "feat: add web push notifications (messages + announcements)"
git push
```

GitHub Pages will redeploy automatically.

---

## Platform behaviour

| Platform | Behaviour |
|---|---|
| **Android (Chrome)** | ✅ Full push — works even when browser is closed |
| **Desktop (Chrome / Edge / Firefox)** | ✅ Full push — works even when browser is closed |
| **iPhone / iPad (Safari, iOS 16.4+)** | ⚠️ Must install as PWA first (Share → Add to Home Screen). A banner guides users to do this. |
| **iPhone — Chrome / Firefox** | ❌ iOS forces all browsers to use Safari's engine; PWA install still needed |

---

## How it works end-to-end

```
User opens app
  └─ push.js loads → asks for notification permission
       └─ subscription saved to push_subscriptions table in Supabase

Admin posts announcement / someone sends a message
  └─ Supabase Database Webhook fires → calls send-push Edge Function
       └─ Edge Function fetches push_subscriptions for the right user(s)
            └─ web-push sends notification via browser push service
                 └─ Service Worker (sw.js) receives it → shows OS notification
                      └─ User taps notification → app opens to the right page
```

---

## Troubleshooting

**Notifications not appearing?**
- Open browser DevTools → Application → Service Workers → check `sw.js` is active
- Check Supabase → Database → `push_subscriptions` — does your user have a row?
- Check Supabase → Edge Functions → `send-push` → Logs for errors

**Permission banner not showing?**
- If you previously denied permission, reset it: browser address bar → 🔒 → Notifications → Reset

**iPhone not working?**
- Must be iOS 16.4 or later
- Must use Safari (not Chrome/Firefox on iOS)
- Must install the app via "Add to Home Screen" first
- Open the installed PWA from your home screen — then the permission prompt will appear
