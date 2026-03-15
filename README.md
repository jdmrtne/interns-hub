# interns-hub

> Repo name: **`interns-hub`**
> Deploy to: `https://YOUR_USERNAME.github.io/interns-hub/`

Glassmorphism redesign with system light/dark mode support.

## Setup

### 1. Run the database schema

In your Supabase dashboard for `https://gacthqqzbvjtxnukdnwf.supabase.co`, open **SQL Editor** and run `schema.sql`.

### 2. Deploy the files

Upload all files to your hosting (GitHub Pages, Netlify, Vercel, etc.).

Make sure these files are all in the same root directory:

```
index.html           ← Login + Time Clock
dashboard.html
admin.html           ← Full user management
daily-logs.html      ← Admin attendance view
interns.html
messages.html
announcements.html
config.js            ← Supabase credentials (shared)
style.css            ← Glassmorphism design system
notifications.js     ← In-app notifications
sw.js
manifest.json
schema.sql           ← Run this in Supabase SQL Editor
notification.mp3
favicon.ico + icons
```

### 3. Create the first admin

1. Register an account via the app
2. In Supabase dashboard → Table Editor → `users` table
3. Find your row and change `role` from `intern` to `admin`
4. From then on, promote other users via the Admin Panel

---

## Admin Panel Features

| Action | Description |
|--------|-------------|
| **↑ Promote** | Promote intern to admin |
| **↓ Demote** | Demote admin back to intern |
| **🔑 Change PW** | Send password reset email |
| **⊘ Disable** | Disable account (blocks login) |
| **✓ Enable** | Re-enable a disabled account |
| **🗑 Delete** | Permanently delete user and all their data |

---

## Design

- **Glassmorphism** — frosted glass cards, backdrop blur on all panels
- **System theme** — automatically follows `prefers-color-scheme`
  - Dark: deep navy background with glass overlays
  - Light: soft sky background with translucent panels
- **Fonts**: Syne (display), Outfit (body), JetBrains Mono (monospace)
