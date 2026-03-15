# The Interns Hub

![The Interns Hub](https://jdmrtne.github.io/interns-hub/og-image.png)

> **Live:** [jdmrtne.github.io/interns-hub](https://jdmrtne.github.io/interns-hub/)

A glassmorphism intern management platform — time clock, messaging, announcements & admin panel.

## Setup

### 1. Run the database schema

In your Supabase dashboard, open **SQL Editor** and run `schema.sql`.

### 2. Deploy the files

Upload all files to GitHub Pages (or Netlify/Vercel). All files must be in the same root directory:

```
index.html           ← Login + Time Clock
dashboard.html
admin.html           ← Full user management
daily-logs.html      ← Admin attendance view
interns.html
messages.html
announcements.html
config.js            ← Supabase credentials
style.css            ← Glassmorphism design system
notifications.js     ← In-app notifications
sw.js
manifest.json
schema.sql           ← Run in Supabase SQL Editor
notification.mp3
favicon.ico + icons
```

### 3. Create the first admin

1. Register an account via the app
2. In Supabase → Table Editor → `users` table
3. Change your row's `role` from `intern` → `admin`
4. From then on, promote others via the Admin Panel

---

## Admin Panel

| Action | Description |
|--------|-------------|
| **↑ Promote** | Promote intern to admin |
| **↓ Demote** | Demote admin back to intern |
| **🔑 Change PW** | Send password reset email |
| **⊘ Disable** | Block login for this account |
| **✓ Enable** | Re-enable a disabled account |
| **🗑 Delete** | Permanently delete user and all data |

---

## Design

- **Glassmorphism** — frosted glass cards, backdrop blur on all panels
- **Dark/light** — follows `prefers-color-scheme` automatically
- **Fonts** — Syne (display) · Outfit (body) · JetBrains Mono (mono)
- **Colors** — `#38bdf8` sky blue primary · `#a78bfa` purple accent · `#34d399` green
