# The Interns Hub

![The Interns Hub](https://jdmrtne.github.io/interns-hub/og-image.png)

> **Live:** [jdmrtne.github.io/interns-hub](https://jdmrtne.github.io/interns-hub/)

A glassmorphism intern management platform — time clock, real-time chat, push notifications, profile avatars, internship progress tracking, announcements & admin panel.

---

## Features

### 🕐 Time Clock
Clock in and out for AM and PM sessions. Total hours are calculated automatically and stored per day. Duplicate entries for the same date are prevented.

### 📊 Dashboard
Live clock, welcome bar, and quick-link cards for every section. Shows recent announcements and message previews at a glance.

### 💬 Real-Time Chat
Direct 1-on-1 messaging powered by Supabase Realtime. Messages appear instantly without refreshing. Includes:
- **Soft delete** — deleted messages show a "Message deleted" placeholder for both parties
- **Seen receipts** — single tick (sent) and double tick (seen) indicators
- **Date dividers** — automatic Today / Yesterday / date labels
- **Avatar bubbles** — profile photo or initials shown per message

### 📨 Messages Inbox
Conversation list with unread indicators and message previews. Tap any conversation to open the real-time chat view.

### 📣 Announcements Board
Admins post announcements visible to all interns. Read tracking is per-user so unread announcements are highlighted.

### 👥 Interns Directory
Browse and search co-interns by name or department. Each card shows the intern's avatar (photo or initials), department, and internship progress bar. Tap a card to open a full profile modal.

### 🔔 In-App Notifications
Bell icon in the sidebar with an animated unread badge. A slide-out panel lists all recent message and announcement notifications with time-ago labels. Plays an audio chime on new activity.

### 📲 Web Push Notifications (OS-Level)
Opt-in banner prompts users to enable browser push notifications. When enabled, OS-level notifications are delivered even when the site is closed — for new messages and new announcements. Powered by the Web Push API + Supabase Edge Functions + `pg_net`.

### 👤 Profile Editor
Users can edit their own profile from any page. Includes:
- Upload a profile photo (compressed to ≤ 80 KB automatically)
- Remove photo (reverts to colour-coded initials avatar)
- Set display name and department
- View internship progress (hours logged vs. target)

### 🛡 Admin Panel
Full user management in a tabbed interface:

| Action | Description |
|--------|-------------|
| **↑ Admin** | Promote intern to admin |
| **↓ Intern** | Demote admin back to intern |
| **🔑 Change PW** | Send password-reset email |
| **⊘ Disable** | Block login for this account |
| **✓ Enable** | Re-enable a disabled account |
| **🗑 Delete** | Permanently delete user and all data |
| **⏱ Set Hours** | Set each intern's total internship hours target |

### 📅 Daily Logs (Admin)
Admin-only attendance view. See all interns' clock-in/out records by date, with total hours calculated per row.

### 📱 Progressive Web App (PWA)
Installable on iOS and Android. Service Worker v8 caches all static assets for offline access (network-first strategy). Push events are handled in the background worker so notifications arrive even when the app is not open.

---

## File Structure

```
index.html              ← Login / Register / Time Clock
dashboard.html          ← Dashboard with quick links & previews
chat.html               ← Real-time 1-on-1 chat view
messages.html           ← Conversations inbox
announcements.html      ← Announcements board
interns.html            ← Intern directory & profiles
daily-logs.html         ← Admin attendance log view
admin.html              ← Admin user-management panel

config.js               ← Supabase credentials + shared helpers + nav renderer
nav.js                  ← Sidebar collapse / mobile drawer logic
notifications.js        ← In-app notification bell, panel & sound
profile.js              ← Profile-edit modal, avatar upload & progress
push.js                 ← Web Push subscription manager & opt-in banner
sw.js                   ← Service Worker (caching + push handler)

style.css               ← Glassmorphism design system (dark + light)
manifest.json           ← PWA manifest
notification.mp3        ← In-app notification chime

schema.sql              ← Run once — full database schema
hotfix_push.sql         ← Run if using push notifications (fixes pg_net schema)

migration_add_avatar.sql           ← Adds avatar_url to users
migration_seen_at.sql              ← Adds seen_at to messages + index
migration_fix_message_delete.sql   ← Adds is_deleted + updated RLS policies
migration_internship_period.sql    ← Adds internship_hours to users

favicon.ico + icon-*.png + apple-touch-icon.png   ← App icons (all sizes)
og-image.png            ← Open Graph social preview image
```

---

## Setup

### 1. Run the database schema

In your Supabase dashboard, open **SQL Editor** and run `schema.sql`.

Then run any migrations relevant to your existing install:

| File | What it adds |
|------|-------------|
| `migration_add_avatar.sql` | `avatar_url` column on `users` |
| `migration_seen_at.sql` | `seen_at` column + index on `messages` |
| `migration_fix_message_delete.sql` | `is_deleted` column + updated RLS on `messages` |
| `migration_internship_period.sql` | `internship_hours` column on `users` |
| `hotfix_push.sql` | `pg_net` extension + fixed push trigger (run if you want Web Push) |

> **Fresh install?** `schema.sql` sets up the base tables. Run all migration files afterwards to get every feature.

### 2. Configure Supabase credentials

Open `config.js` and set your project URL and anon key:

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
```

### 3. Deploy the files

Upload all files to GitHub Pages (or Netlify / Vercel). All files must be in the same root directory. The GitHub Actions workflow at `.github/workflows/deploy.yml` handles automatic deployment on push to `main`.

### 4. Create the first admin

1. Register an account via the app
2. In Supabase → Table Editor → `users` table
3. Change your row's `role` from `intern` → `admin`
4. From then on, promote others via the Admin Panel

---

## Web Push Setup (Optional)

To enable OS-level push notifications:

1. Generate a VAPID key pair (e.g. via `web-push generate-vapid-keys`)
2. Deploy the `send-push` Supabase Edge Function with your VAPID private key
3. Run `hotfix_push.sql` in the SQL Editor — this installs the `pg_net` extension and a database trigger that calls the edge function whenever a message or announcement is inserted
4. Users will see the opt-in banner the first time they load the app

The service worker (`sw.js`) handles incoming push events and shows OS notifications even when the app tab is closed.

---

## Design System

- **Glassmorphism** — frosted-glass cards, backdrop blur on all panels
- **Dark / Light** — follows `prefers-color-scheme` automatically
- **Fonts** — Syne (display) · Outfit (body) · JetBrains Mono (mono)
- **Colors** — `#38bdf8` sky blue primary · `#a78bfa` purple accent · `#34d399` green
- **Sidebar** — collapsible on desktop (state saved to `localStorage`), slide-out drawer on mobile

---

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `users` | Profiles — name, email, department, role, avatar_url, internship_hours |
| `time_logs` | AM/PM clock-in/out per user per date, with total_hours |
| `messages` | Direct messages — sender, receiver, content, seen_at, is_deleted |
| `announcements` | Admin-posted announcements |
| `announcement_reads` | Per-user read tracking for announcements |
| `push_subscriptions` | Web Push endpoint + keys per device |

All tables have Row Level Security (RLS) enabled. Interns can only read/write their own data; admins can read and manage all records.

---

## Notes

- **Deleting a user** removes all their data via cascade. To also remove the Supabase Auth entry immediately, run `select auth.admin_delete_user('<user-uuid>')` in the SQL Editor (service-role access required). Otherwise Supabase cleans it up automatically after 30 days of inactivity.
- **Avatar photos** are stored as compressed base64 data URLs directly in the `users` table (no separate storage bucket needed). The client compresses uploads to ≤ 80 KB before saving.
- **Soft-deleted messages** remain in the database as `is_deleted = true` and render as "Message deleted" for both parties — the actual message text is cleared server-side.
