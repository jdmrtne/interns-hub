// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB v3 — Global Notification System
//  Facebook-style bell + floating toasts + OS push
// ═══════════════════════════════════════════════════════
(function () {

// ─── Styles ──────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
/* ── Floating Notification Bell (FAB) ─────────────────── */
#hub-notif-bell {
  position: fixed;
  bottom: 24px; right: 24px;
  z-index: 10001;
  display: flex; align-items: center; justify-content: center;
  width: 58px; height: 58px; border-radius: 50%;
  background: var(--glass-strong);
  backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1.5px solid var(--glass-border-b);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transition: transform .2s cubic-bezier(.175,.885,.32,1.275),
              box-shadow .2s ease, border-color .2s ease, background .2s ease;
  color: var(--primary);
  animation: hubBellAppear .4s cubic-bezier(.175,.885,.32,1.275);
}
#hub-notif-bell:hover {
  transform: scale(1.1) translateY(-2px);
  background: var(--primary-g);
  border-color: var(--primary);
  box-shadow: var(--shadow-lg), 0 0 0 6px var(--primary-g);
}
#hub-notif-bell:active { transform: scale(.95); }
#hub-notif-bell svg { width: 24px; height: 24px; }
@keyframes hubBellAppear {
  from { opacity: 0; transform: scale(0) rotate(-20deg); }
  to   { opacity: 1; transform: scale(1) rotate(0); }
}

/* pulse ring when there are unread notifs */
#hub-notif-bell.has-unread {
  animation: hubBellPulse 2.5s cubic-bezier(.455,.03,.515,.955) infinite;
}
@keyframes hubBellPulse {
  0%   { box-shadow: var(--shadow-lg), 0 0 0 0   var(--primary-g); }
  60%  { box-shadow: var(--shadow-lg), 0 0 0 14px transparent; }
  100% { box-shadow: var(--shadow-lg), 0 0 0 0   transparent; }
}

#hub-notif-badge {
  position: absolute; top: -2px; right: -2px;
  min-width: 20px; height: 20px; border-radius: 10px;
  background: var(--red); color: #fff;
  font-family: var(--font-mono); font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px; border: 2px solid var(--bg);
  animation: badgePop .3s cubic-bezier(.175,.885,.32,1.275);
  pointer-events: none;
}
#hub-notif-badge.hidden { display: none; }
@keyframes badgePop { from { transform: scale(0); } to { transform: scale(1); } }

/* ── Floating Modal Panel ─────────────────────────────── */
#hub-notif-panel {
  position: fixed;
  bottom: 96px; right: 24px;
  width: 380px;
  max-height: min(560px, calc(100vh - 120px));
  background: var(--glass);
  backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  z-index: 10000;
  display: flex; flex-direction: column;
  transform-origin: bottom right;
  transform: scale(.88) translateY(12px);
  opacity: 0;
  pointer-events: none;
  transition: transform .25s cubic-bezier(.175,.885,.32,1.275), opacity .2s ease;
  overflow: hidden;
}
#hub-notif-panel.open {
  transform: scale(1) translateY(0);
  opacity: 1;
  pointer-events: all;
}
#hub-notif-panel-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: transparent;
  opacity: 0; pointer-events: none;
  transition: opacity .2s;
}
#hub-notif-panel-overlay.show { opacity: 1; pointer-events: all; }

/* Header */
#hub-notif-panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.hnp-title {
  font-family: var(--font-display);
  font-size: 16px; font-weight: 800; color: var(--text); letter-spacing: .04em;
}
.hnp-mark-all {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: .12em;
  text-transform: uppercase; color: var(--primary); cursor: pointer; padding: 4px 8px;
  border-radius: 6px; border: 1px solid var(--primary-g);
  background: var(--primary-g);
  transition: background .15s, border-color .15s;
}
.hnp-mark-all:hover { background: var(--primary-g); border-color: var(--primary); }
.hnp-close {
  background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer;
  width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
}
.hnp-close:hover { background: var(--red-d); color: var(--red); }

/* Tab row */
#hub-notif-tabs {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0; padding: 0 20px;
}
.hnp-tab {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em;
  text-transform: uppercase; padding: 10px 12px; cursor: pointer; color: var(--text-dim);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color .15s, border-color .15s;
}
.hnp-tab.active { color: var(--primary); border-color: var(--primary); }
.hnp-tab-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; border-radius: 8px;
  background: var(--red); color: #fff;
  font-size: 8px; font-weight: 700; padding: 0 3px; margin-left: 5px;
  vertical-align: middle;
}
.hnp-tab-count.hidden { display: none; }

/* List */
#hub-notif-list {
  flex: 1; overflow-y: auto; padding: 8px 0;
  scrollbar-width: thin; scrollbar-color: var(--primary-g) transparent;
}
#hub-notif-list::-webkit-scrollbar { width: 4px; }
#hub-notif-list::-webkit-scrollbar-track { background: transparent; }
#hub-notif-list::-webkit-scrollbar-thumb { background: var(--primary-g); border-radius: 2px; }

/* Notification items */
.hn-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 20px; cursor: pointer; text-decoration: none;
  transition: background .15s;
  position: relative;
}
.hn-item:hover { background: var(--glass-hover); }
.hn-item.unread { background: var(--primary-g); }
.hn-item.unread::before {
  content: ''; position: absolute; left: 8px; top: 50%;
  transform: translateY(-50%);
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--primary);
}
.hn-avatar {
  width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 13px; font-weight: 700;
}
.hn-avatar.announcement {
  background: var(--primary-g); color: var(--primary); font-size: 18px;
}
.hn-body { flex: 1; min-width: 0; }
.hn-sender {
  font-family: var(--font-mono); font-size: 11px; font-weight: 700;
  color: var(--text); margin-bottom: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hn-text {
  font-family: var(--font-body); font-size: 12.5px; color: var(--text-muted);
  line-height: 1.4; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.hn-time {
  font-family: var(--font-mono); font-size: 9px; color: var(--text-dim);
  letter-spacing: .08em; margin-top: 4px;
}
.hn-item.unread .hn-sender { color: var(--primary); }
.hn-item.unread .hn-text { color: var(--text); }
.hn-item.unread .hn-time { color: var(--primary-d); }

/* Empty state */
.hn-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 200px; gap: 12px; color: var(--text-dim);
}
.hn-empty-icon { font-size: 40px; opacity: .5; }
.hn-empty-text {
  font-family: var(--font-mono); font-size: 10px;
  letter-spacing: .12em; text-transform: uppercase;
}

/* ── Floating toast tray ──────────────────────────────── */
#notif-tray {
  position: fixed; bottom: 24px; right: 24px; z-index: 8000;
  display: flex; flex-direction: column; gap: 10px;
  pointer-events: none; max-width: 330px;
}
.msg-notif {
  background: var(--glass-strong);
  backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--glass-border-b);
  border-radius: 16px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: var(--shadow-lg);
  pointer-events: all; cursor: pointer; text-decoration: none; max-width: 330px;
  animation: notifIn .35s cubic-bezier(.175,.885,.32,1.275);
  transition: opacity .3s, transform .3s, border-color .2s;
}
.msg-notif:hover { border-color: var(--primary); }
.msg-notif.out { opacity: 0; transform: translateX(20px); }
.msg-notif-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono);
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.msg-notif-body { flex: 1; min-width: 0; }
.msg-notif-name {
  font-family: var(--font-mono);
  font-size: 11px; color: var(--primary);
  letter-spacing: .08em; margin-bottom: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.msg-notif-text {
  font-family: var(--font-body); font-size: 13px;
  color: var(--text); line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.msg-notif-close {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--glass); border: none; color: var(--text-muted);
  font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: background .15s, color .15s;
}
.msg-notif-close:hover { background: var(--red-d); color: var(--red); }
@keyframes notifIn {
  from { opacity: 0; transform: translateX(20px) scale(.95); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}

/* ── Announcement modal ───────────────────────────────── */
#ann-modal-ov {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,.55); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; animation: annFadeIn .25s ease;
}
#ann-modal-ov.hidden { display: none; }
#ann-modal {
  background: var(--glass-strong);
  backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--glass-border-b);
  border-radius: 22px; padding: 34px; max-width: 490px; width: 100%;
  box-shadow: var(--shadow-lg);
  animation: annModalIn .35s cubic-bezier(.175,.885,.32,1.275);
}
@keyframes annModalIn {
  from { opacity: 0; transform: scale(.9) translateY(16px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes annFadeIn { from { opacity: 0; } to { opacity: 1; } }
.ann-modal-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--primary-g); border: 1px solid var(--primary-g);
  border-radius: 20px; padding: 4px 12px;
  font-family: var(--font-mono); font-size: 9px;
  color: var(--primary); letter-spacing: .18em; text-transform: uppercase; margin-bottom: 18px;
}
.ann-modal-title {
  font-family: var(--font-display); font-size: 26px; font-weight: 800;
  letter-spacing: .03em; color: var(--text); line-height: 1.15; margin-bottom: 14px;
}
.ann-modal-body {
  font-family: var(--font-body); font-size: 14px;
  color: var(--text-muted); line-height: 1.72; margin-bottom: 10px;
}
.ann-modal-meta {
  font-family: var(--font-mono); font-size: 9px;
  color: var(--text-dim); letter-spacing: .12em; margin-bottom: 24px;
}
.ann-modal-multi {
  font-family: var(--font-mono); font-size: 9px;
  color: var(--primary); letter-spacing: .1em; margin-bottom: 8px;
}
.ann-modal-dots { display: flex; gap: 6px; margin-bottom: 24px; }
.ann-modal-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--glass-border-b); transition: background .2s; }
.ann-modal-dot.active { background: var(--primary); }
.ann-modal-actions { display: flex; gap: 10px; }
.ann-modal-btn {
  flex: 1; padding: 11px; border-radius: 10px;
  font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em;
  text-transform: uppercase; cursor: pointer; transition: all .15s; border: none;
}
.ann-modal-btn.primary {
  background: var(--primary); color: var(--bg); font-weight: 700;
  box-shadow: 0 4px 16px var(--primary-g);
}
.ann-modal-btn.primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
.ann-modal-btn.ghost {
  background: var(--glass); border: 1px solid var(--glass-border); color: var(--text-muted);
}
.ann-modal-btn.ghost:hover { border-color: var(--primary); color: var(--primary); }

@media(max-width:480px){
  #hub-notif-bell { bottom: 20px; right: 16px; width: 54px; height: 54px; }
  #hub-notif-panel {
    bottom: 86px; right: 8px; left: 8px;
    width: auto; border-radius: 18px;
    max-height: min(520px, calc(100vh - 120px));
    transform-origin: bottom center;
  }
  #notif-tray { bottom: 88px; right: 12px; left: 12px; max-width: 100%; }
  #ann-modal { padding: 24px; }
  .ann-modal-title { font-size: 22px; }
}
@media(min-width:481px){
  #notif-tray { bottom: 96px; }
}
`;
document.head.appendChild(style);

// ─── DOM: tray + modal ───────────────────────────────────
const tray = document.createElement('div');
tray.id = 'notif-tray';
document.body.appendChild(tray);

const modalOv = document.createElement('div');
modalOv.id = 'ann-modal-ov';
modalOv.className = 'hidden';
modalOv.innerHTML = '<div id="ann-modal"></div>';
document.body.appendChild(modalOv);

// ─── Helpers ─────────────────────────────────────────────
function avatarColor(name = '') {
  const colors = ['#38bdf8','#60a5fa','#34d399','#a78bfa','#f87171','#fbbf24'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function avatarInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || '?';
}
function timeAgo(ts) {
  const s = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
  const d = Date.now() - new Date(s).getTime(), m = Math.floor(d / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// ─── OS Banner via Service Worker ────────────────────────
// Routes through reg.showNotification() so it works even when
// the tab is unfocused or minimised (new Notification() is blocked by browsers in that state)
function showOSNotification(title, body, url, type) {
  if (!('serviceWorker' in navigator)) return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification(title, {
      body,
      icon:    '/interns-hub/icon-192.png',
      badge:   '/interns-hub/icon-96.png',
      tag:     (type === 'message' ? 'msg-' : 'ann-') + Date.now(),
      renotify: true,
      data:    { url: url },
      vibrate: [200, 80, 200],
      silent:  false,
      requireInteraction: false,
    });
  }).catch(() => {});
}

// ─── Audio ───────────────────────────────────────────────
let _audioCtx = null, _audioBuffer = null, _audioEl = null, _audioReady = false, _audioLoadPromise = null;
function _getAudioCtx() { if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return _audioCtx; }
function _loadMp3() {
  if (_audioLoadPromise) return _audioLoadPromise;
  _audioLoadPromise = fetch('./notification.mp3')
    .then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
    .then(buf => _getAudioCtx().decodeAudioData(buf))
    .then(decoded => { _audioBuffer = decoded; _audioReady = true; })
    .catch(() => {
      // Fallback for file:// protocol where fetch() is blocked by CORS
      try { _audioEl = new Audio('./notification.mp3'); _audioReady = true; } catch(e) {}
    });
  return _audioLoadPromise;
}
_loadMp3();
function _playNotifSound() {
  if (!_audioReady) return;
  if (_audioBuffer) {
    try {
      const ctx = _getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = _audioBuffer; src.connect(ctx.destination); src.start(0);
    } catch(e) {}
  } else if (_audioEl) {
    try { _audioEl.currentTime = 0; _audioEl.play(); } catch(e) {}
  }
}
['click','touchstart','keydown'].forEach(ev =>
  document.addEventListener(ev, () => { if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume(); }, { passive: true })
);

// ─── Floating toast ──────────────────────────────────────
window.HubNotif = {
  showMessage(senderName, text, senderId, senderAvatar) {
    if (window.location.pathname.includes('chat.html')) {
      const uid = new URLSearchParams(window.location.search).get('uid');
      if (uid === senderId) return;
    }
    _playNotifSound();
    // Fire OS banner when the tab isn't in focus — new Notification() is silently
    // blocked by browsers in that state; reg.showNotification() is not.
    if (document.visibilityState !== 'visible' || !document.hasFocus()) {
      showOSNotification('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ' + senderName, text, 'messages.html?uid=' + senderId, 'message');
    }
    const col = avatarColor(senderName);
    const avatarHtml = senderAvatar
      ? `<img src="${senderAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : avatarInitials(senderName);
    const avatarBg = senderAvatar ? 'transparent' : col + '22';
    const el = document.createElement('a');
    el.className = 'msg-notif'; el.href = 'messages.html?uid=' + senderId;
    el.innerHTML = `
      <div class="msg-notif-avatar" style="background:${avatarBg};color:${col};overflow:hidden">${avatarHtml}</div>
      <div class="msg-notif-body">
        <div class="msg-notif-name">${senderName}</div>
        <div class="msg-notif-text">${text}</div>
      </div>
      <button class="msg-notif-close" onclick="event.preventDefault();event.stopPropagation();HubNotif._dismiss(this.closest('.msg-notif'))"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    tray.appendChild(el);
    setTimeout(() => HubNotif._dismiss(el), 6000);
    // Also add to bell panel
    HubBell._addItem({ type: 'message', senderName, text, senderId, senderAvatar, ts: new Date().toISOString() });
  },
  _dismiss(el) { if (!el || !el.parentNode) return; el.classList.add('out'); setTimeout(() => el.remove(), 300); }
};

// ─── Notification Bell ───────────────────────────────────
window.HubBell = {
  _items: [],        // { type, senderName, text, senderId, annId, ts, read }
  _userId: null,
  _sb: null,
  _activeTab: 'all', // 'all' | 'messages' | 'announcements'

  init(sb, userId) {
    this._sb = sb;
    this._userId = userId;
    this._items = this._load();
    this._injectBell();
    this._render();
  },

  _storageKey() { return 'hub_bell_v3_' + (this._userId || ''); },

  _load() {
    try { return JSON.parse(localStorage.getItem(this._storageKey()) || '[]'); } catch(e) { return []; }
  },

  _save() {
    try {
      // Keep last 50 items
      const trimmed = this._items.slice(-50);
      localStorage.setItem(this._storageKey(), JSON.stringify(trimmed));
    } catch(e) {}
  },

  _addItem(item) {
    this._items.push({ ...item, read: false, id: Date.now() + Math.random() });
    this._save();
    this._render();
    this._animateBell();
  },

  _injectBell() {
    // Find the nav header area — inject bell next to user avatar or at top of sidebar
    const bellHtml = `
      <div id="hub-notif-panel-overlay"></div>
      <div id="hub-notif-panel">
        <div id="hub-notif-panel-head">
          <span class="hnp-title"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Notifications</span>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="hnp-mark-all" id="hnp-mark-all">Mark all read</button>
            <button class="hnp-close" id="hnp-close"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
        <div id="hub-notif-tabs">
          <div class="hnp-tab active" data-tab="all">All <span class="hnp-tab-count hidden" id="hnp-count-all"></span></div>
          <div class="hnp-tab" data-tab="messages">Messages <span class="hnp-tab-count hidden" id="hnp-count-msg"></span></div>
          <div class="hnp-tab" data-tab="announcements">Board <span class="hnp-tab-count hidden" id="hnp-count-ann"></span></div>
        </div>
        <div id="hub-notif-list"></div>
      </div>`;

    const bellWrapper = document.createElement('div');
    bellWrapper.innerHTML = bellHtml;
    [...bellWrapper.children].forEach(c => document.body.appendChild(c));

    // Bell button itself
    const bell = document.createElement('div');
    bell.id = 'hub-notif-bell';
    bell.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span id="hub-notif-badge" class="hidden"></span>`;
    bell.onclick = () => this.open();

    // Bell is now a floating FAB — always attach to body
    document.body.appendChild(bell);

    // Wire up panel events
    document.getElementById('hnp-close').onclick = () => this.close();
    document.getElementById('hub-notif-panel-overlay').onclick = () => this.close();
    document.getElementById('hnp-mark-all').onclick = () => this.markAllRead();
    document.querySelectorAll('.hnp-tab').forEach(tab => {
      tab.onclick = () => {
        this._activeTab = tab.dataset.tab;
        document.querySelectorAll('.hnp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderList();
      };
    });
  },


  _animateBell() {
    const bell = document.getElementById('hub-notif-bell');
    if (!bell) return;
    bell.style.animation = 'none';
    bell.offsetHeight; // reflow
    bell.style.animation = 'bellShake .5s ease';
    const s = document.createElement('style');
    s.textContent = '@keyframes bellShake{0%{transform:rotate(0)}15%{transform:rotate(15deg)}30%{transform:rotate(-12deg)}45%{transform:rotate(10deg)}60%{transform:rotate(-8deg)}75%{transform:rotate(5deg)}100%{transform:rotate(0)}}';
    if (!document.getElementById('bell-shake-style')) { s.id = 'bell-shake-style'; document.head.appendChild(s); }
  },

  _render() {
    const unread = this._items.filter(i => !i.read).length;
    const badge = document.getElementById('hub-notif-badge');
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.classList.toggle('hidden', unread === 0);
    }
    // Toggle pulse ring on FAB
    const bell = document.getElementById('hub-notif-bell');
    if (bell) bell.classList.toggle('has-unread', unread > 0);
    this._updateTabCounts();
    this._renderList();
  },

  _updateTabCounts() {
    const unreadAll = this._items.filter(i => !i.read).length;
    const unreadMsg = this._items.filter(i => !i.read && i.type === 'message').length;
    const unreadAnn = this._items.filter(i => !i.read && i.type === 'announcement').length;
    const set = (id, n) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = n > 99 ? '99+' : n;
      el.classList.toggle('hidden', n === 0);
    };
    set('hnp-count-all', unreadAll);
    set('hnp-count-msg', unreadMsg);
    set('hnp-count-ann', unreadAnn);
  },

  _renderList() {
    const list = document.getElementById('hub-notif-list');
    if (!list) return;

    const filtered = this._activeTab === 'all'
      ? this._items
      : this._items.filter(i => i.type === (this._activeTab === 'messages' ? 'message' : 'announcement'));

    // Show newest first
    const sorted = [...filtered].reverse();

    if (!sorted.length) {
      list.innerHTML = `<div class="hn-empty"><div class="hn-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div><div class="hn-empty-text">No notifications yet</div></div>`;
      return;
    }

    list.innerHTML = sorted.map(item => {
      if (item.type === 'message') {
        const col = avatarColor(item.senderName || '');
        const bellAvatarHtml = item.senderAvatar
          ? `<img src="${item.senderAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
          : avatarInitials(item.senderName || '');
        const bellAvatarBg = item.senderAvatar ? 'transparent' : col + '22';
        return `<a class="hn-item${item.read ? '' : ' unread'}" href="messages.html?uid=${item.senderId}" data-id="${item.id}">
          <div class="hn-avatar" style="background:${bellAvatarBg};color:${col};overflow:hidden">${bellAvatarHtml}</div>
          <div class="hn-body">
            <div class="hn-sender">${item.senderName || 'Someone'}</div>
            <div class="hn-text">${item.text || ''}</div>
            <div class="hn-time">${timeAgo(item.ts)}</div>
          </div>
        </a>`;
      } else {
        return `<a class="hn-item${item.read ? '' : ' unread'}" href="announcements.html" data-id="${item.id}">
          <div class="hn-avatar announcement"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><polyline points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg></div>
          <div class="hn-body">
            <div class="hn-sender">${item.title || 'New Announcement'}</div>
            <div class="hn-text">${item.text || ''}</div>
            <div class="hn-time">${timeAgo(item.ts)}</div>
          </div>
        </a>`;
      }
    }).join('');

    // Mark as read on click
    list.querySelectorAll('.hn-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseFloat(el.dataset.id);
        const item = this._items.find(i => i.id === id);
        if (item) { item.read = true; this._save(); this._render(); }
        this.close();
      });
    });
  },

  open() {
    document.getElementById('hub-notif-panel').classList.add('open');
    document.getElementById('hub-notif-panel-overlay').classList.add('show');
  },

  close() {
    document.getElementById('hub-notif-panel').classList.remove('open');
    document.getElementById('hub-notif-panel-overlay').classList.remove('show');
  },

  markAllRead() {
    this._items.forEach(i => i.read = true);
    this._save();
    this._render();
  },
};

// ─── Message Listener ─────────────────────────────────────
window.HubMsgPoller = {
  _sb: null, _userId: null, _lastTs: null, _timer: null, _channel: null,
  start(sb, userId) {
    this._sb = sb; this._userId = userId;
    this._lastTs = new Date(Date.now() - 5000).toISOString();
    // Init bell
    if (window.HubBell) window.HubBell.init(sb, userId);
    // Init web push subscription
    if (window.HubPush) window.HubPush.init(sb, userId);
    try {
      this._channel = sb.channel('hub-msg-v3-' + userId)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: 'receiver_id=eq.' + userId
        }, async (payload) => {
          const msg = payload.new;
          if (msg.created_at && msg.created_at > this._lastTs) this._lastTs = msg.created_at;
          const { data: sender } = await sb.from('users').select('name,avatar_url').eq('id', msg.sender_id).single();
          const name = sender?.name || 'Someone';
          HubNotif.showMessage(name, msg.message, msg.sender_id, sender?.avatar_url || null);
          if (typeof loadMessages === 'function') loadMessages();
          if (typeof loadConvos  === 'function') loadConvos();
        }).subscribe();
    } catch(e) {}
    this._timer = setInterval(() => this._poll(), 15000);
  },
  async _poll() {
    if (!this._sb || !this._userId) return;
    try {
      const { data } = await this._sb
        .from('messages').select('id,message,sender_id,created_at,sender:sender_id(name,avatar_url)')
        .eq('receiver_id', this._userId).gt('created_at', this._lastTs)
        .order('created_at', { ascending: true });
      if (!data || !data.length) return;
      this._lastTs = data[data.length - 1].created_at;
      const seen = {};
      for (const m of data) {
        if (!seen[m.sender_id]) seen[m.sender_id] = { name: m.sender?.name || 'Someone', avatar: m.sender?.avatar_url || null, text: m.message, id: m.sender_id };
        else seen[m.sender_id].text = m.message;
      }
      for (const s of Object.values(seen)) HubNotif.showMessage(s.name, s.text, s.id, s.avatar);
      if (typeof loadMessages === 'function') loadMessages();
      if (typeof loadConvos  === 'function') loadConvos();
    } catch(e) {}
  },
  stop() {
    if (this._timer) clearInterval(this._timer);
    if (this._channel && this._sb) this._sb.removeChannel(this._channel);
  }
};

// ─── Announcement Modal + Bell integration ────────────────
window.HubAnnouncements = {
  _anns: [], _idx: 0, _userId: null,
  async checkOnLogin(sb, userId) {
    this._userId = userId;
    try {
      const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: true });
      if (!data || !data.length) return;
      const seen = this._getSeen();
      const unseen = data.filter(a => !seen.includes(a.id));
      if (!unseen.length) return;

      // Add unseen announcements to the bell panel
      for (const ann of unseen) {
        if (window.HubBell) {
          // Check if already in bell items
          const existing = HubBell._items.find(i => i.type === 'announcement' && i.annId === ann.id);
          if (!existing) {
            HubBell._items.push({
              type: 'announcement', annId: ann.id,
              title: ann.title, text: ann.message,
              ts: ann.created_at, read: false,
              id: Date.now() + Math.random()
            });
          }
        }
      }
      if (window.HubBell) { HubBell._save(); HubBell._render(); }

      this._anns = unseen; this._idx = 0; this._render();
    } catch(e) {}
  },
  _getSeen() { return JSON.parse(localStorage.getItem('ann_seen_v2_' + this._userId) || '[]'); },
  _markSeen(id) {
    const s = this._getSeen();
    if (!s.includes(id)) localStorage.setItem('ann_seen_v2_' + this._userId, JSON.stringify([...s, id]));
    // Also mark read in bell
    if (window.HubBell) {
      const item = HubBell._items.find(i => i.type === 'announcement' && i.annId === id);
      if (item) { item.read = true; HubBell._save(); HubBell._render(); }
    }
  },
  _markAllSeen() {
    const all = [...new Set([...this._getSeen(), ...this._anns.map(a => a.id)])];
    localStorage.setItem('ann_seen_v2_' + this._userId, JSON.stringify(all));
    if (window.HubBell) {
      HubBell._items.forEach(i => { if (i.type === 'announcement') i.read = true; });
      HubBell._save(); HubBell._render();
    }
  },
  _render() {
    const ann = this._anns[this._idx]; if (!ann) return;
    const total = this._anns.length, isLast = this._idx === total - 1, isFirst = this._idx === 0;
    const dotsHtml = total > 1
      ? `<div class="ann-modal-multi">${this._idx + 1} of ${total} announcements</div>
         <div class="ann-modal-dots">${this._anns.map((_,i) => `<span class="ann-modal-dot${i===this._idx?' active':''}"></span>`).join('')}</div>`
      : '';
    const prevBtn = !isFirst ? `<button class="ann-modal-btn ghost" id="_annPrev">← Previous</button>` : '';
    document.getElementById('ann-modal').innerHTML = `
      <div class="ann-modal-badge"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><polyline points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg> Announcement</div>
      <div class="ann-modal-title">${ann.title}</div>
      <div class="ann-modal-body">${ann.message}</div>
      <div class="ann-modal-meta">${ann.users?.name || 'Admin'} · ${timeAgo(ann.created_at)}</div>
      ${dotsHtml}
      <div class="ann-modal-actions">
        <button class="ann-modal-btn ghost" id="_annDismiss">Dismiss All</button>
        ${prevBtn}
        <button class="ann-modal-btn primary" id="_annNext">${isLast ? 'Got it <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><polyline points="20 6 9 17 4 12"/></svg>' : 'Next →'}</button>
      </div>`;
    document.getElementById('_annDismiss').onclick = () => { this._markAllSeen(); this._close(); };
    if (!isFirst) document.getElementById('_annPrev').onclick = () => { this._idx--; this._render(); };
    document.getElementById('_annNext').onclick = () => {
      this._markSeen(ann.id);
      if (isLast) { this._markAllSeen(); this._close(); }
      else { this._idx++; this._render(); }
    };
    document.getElementById('ann-modal-ov').classList.remove('hidden');
    _playNotifSound();
    // Fire OS banner for announcement when tab is unfocused
    if (document.visibilityState !== 'visible' || !document.hasFocus()) {
      showOSNotification('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><polyline points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg> ' + (ann.title || 'New Announcement'), ann.message || '', 'announcements.html', 'announcement');
    }
  },
  _close() { document.getElementById('ann-modal-ov').classList.add('hidden'); }
};

// ── Listen for push events forwarded by the Service Worker ──
// When a push arrives and the tab IS open, sw.js posts a message here
// so the in-app bell/toast still updates in real time.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    const d = event.data;
    if (!d || d.type !== 'PUSH_RECEIVED') return;
    if (d.pushType === 'message') {
      // Extract senderId from the URL (?uid=...)
      const uid = d.url ? new URL(d.url, location.origin).searchParams.get('uid') : null;
      if (window.HubNotif) HubNotif.showMessage(d.senderName?.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ','') || 'Someone', d.body, uid || '');
    }
    if (window.HubBell) HubBell._render();
  });
}

})();
