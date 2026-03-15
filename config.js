// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB v2 — Shared Config
// ═══════════════════════════════════════════════════════
const SUPABASE_URL = 'https://gacthqqzbvjtxnukdnwf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r39LY-9OtMPIl0C-1btlng_nQcVvGH7';

let sb;
function initSupabase() {
  if (!sb) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return sb;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const ICONS = {
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 21v-1a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v1"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-1a4 4 0 0 0-3-3.85"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  megaphone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9v18L3 11z"/><path d="M11 13l-2 5"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 1 1-14.14 0"/></svg>`,
  logs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="13" y2="18"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

// ─── Shared nav renderer ──────────────────────────────────────────────────────
function renderNav(activePage, isAdmin = false) {
  const base = [
    { href: 'index.html',         icon: ICONS.clock,      label: 'Clock',      key: 'clock' },
    { href: 'dashboard.html',     icon: ICONS.dashboard,  label: 'Dashboard',  key: 'dashboard' },
    { href: 'interns.html',       icon: ICONS.users,      label: 'Interns',    key: 'interns' },
    { href: 'messages.html',      icon: ICONS.mail,       label: 'Messages',   key: 'messages' },
    { href: 'announcements.html', icon: ICONS.megaphone,  label: 'Board',      key: 'announcements' },
  ];
  const adminLinks = [
    { href: 'daily-logs.html',    icon: ICONS.logs,       label: 'Daily Logs', key: 'logs' },
    { href: 'admin.html',         icon: ICONS.settings,   label: 'Admin',      key: 'admin' },
  ];
  const all = isAdmin ? [adminLinks[0], ...base.slice(1), adminLinks[1]] : base;
  return all.map(n => `
    <a href="${n.href}" class="snav-item${activePage === n.key ? ' active' : ''}" data-key="${n.key}">
      <span class="snav-icon">${n.icon}</span>
      <span class="snav-label">${n.label}</span>
    </a>`).join('');
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
async function requireAuth() {
  const client = initSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return null; }
  return session.user;
}

// ─── Get user profile ─────────────────────────────────────────────────────────
async function getUserProfile(uid) {
  const client = initSupabase();
  const { data } = await client.from('users').select('*').eq('id', uid).single();
  return data;
}

// ─── Setup sidebar user ───────────────────────────────────────────────────────
function setupSidebarUser(name, role, isAdmin) {
  const nm = document.getElementById('navUserName');
  const rl = document.getElementById('navUserRole');
  const av = document.getElementById('navAvatar');
  if (nm) nm.textContent = name;
  if (rl) rl.textContent = role || 'intern';
  if (av) {
    const col = avatarColor(name);
    av.style.background = col + '22'; av.style.color = col;
    av.textContent = avatarInitials(name);
  }
  const mh = document.getElementById('mobHeader');
  if (mh) mh.classList.remove('pre-auth');
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? 'flex' : 'none';
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'inf') {
  let c = document.getElementById('toasts');
  if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.className = 'toasts'; document.body.appendChild(c); }
  const d = document.createElement('div');
  d.className = `toast ${type}`; d.textContent = msg;
  c.appendChild(d);
  setTimeout(() => d.remove(), 3100);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function avatarColor(name) {
  const colors = ['#38bdf8','#60a5fa','#34d399','#a78bfa','#f87171','#7dd3fc','#86efac','#c4b5fd'];
  let hash = 0;
  for (const c of (name || '')) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
function timeAgo(ts) {
  if (!ts) return '—';
  const s = (/Z$|[+-]\d{2}:\d{2}$/.test(ts)) ? ts : ts + 'Z';
  const diff = Date.now() - new Date(s).getTime(), mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}
function toggleMobileNav() {
  document.getElementById('sidebarNav').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
