// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB v2 — Global Notification System
//  Glassmorphism design — follows system dark/light mode
// ═══════════════════════════════════════════════════════
(function () {

const style = document.createElement('style');
style.textContent = `
#notif-tray {
  position: fixed; bottom: 24px; right: 24px; z-index: 8000;
  display: flex; flex-direction: column; gap: 10px;
  pointer-events: none; max-width: 330px;
}
.msg-notif {
  background: rgba(255,255,255,0.10);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 16px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.45);
  pointer-events: all; cursor: pointer; text-decoration: none; max-width: 330px;
  animation: notifIn .35s cubic-bezier(.175,.885,.32,1.275);
  transition: opacity .3s, transform .3s;
}
@media (prefers-color-scheme: light) {
  .msg-notif {
    background: rgba(255,255,255,0.75);
    border-color: rgba(255,255,255,0.9);
    box-shadow: 0 8px 32px rgba(0,60,120,0.1);
  }
}
.msg-notif:hover { border-color: rgba(56,189,248,.5); }
.msg-notif.out { opacity: 0; transform: translateX(20px); }
.msg-notif-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace; font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.msg-notif-body { flex: 1; min-width: 0; }
.msg-notif-name {
  font-family: 'JetBrains Mono', 'Share Tech Mono', monospace; font-size: 11px; color: #38bdf8;
  letter-spacing: .08em; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@media (prefers-color-scheme: light) {
  .msg-notif-name { color: #0284c7; }
}
.msg-notif-text {
  font-family: 'Outfit', 'DM Sans', sans-serif; font-size: 13px;
  color: #dde5f0; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@media (prefers-color-scheme: light) {
  .msg-notif-text { color: #0f1c2e; }
}
.msg-notif-close {
  width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,.08);
  border: none; color: #7a8ba0; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: background .15s, color .15s;
}
.msg-notif-close:hover { background: rgba(248,113,113,.15); color: #f87171; }
@keyframes notifIn {
  from { opacity: 0; transform: translateX(20px) scale(.95); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
/* Announcement modal */
#ann-modal-ov {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,.65); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; animation: annFadeIn .25s ease;
}
#ann-modal-ov.hidden { display: none; }
#ann-modal {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 22px; padding: 34px; max-width: 490px; width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
  animation: annModalIn .35s cubic-bezier(.175,.885,.32,1.275);
}
@media (prefers-color-scheme: light) {
  #ann-modal {
    background: rgba(255,255,255,0.8);
    border-color: rgba(255,255,255,0.95);
    box-shadow: 0 12px 48px rgba(0,60,120,.12);
  }
}
@keyframes annModalIn {
  from { opacity: 0; transform: scale(.9) translateY(16px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes annFadeIn { from { opacity: 0; } to { opacity: 1; } }
.ann-modal-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.3);
  border-radius: 20px; padding: 4px 12px;
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  color: #a78bfa; letter-spacing: .18em; text-transform: uppercase; margin-bottom: 18px;
}
.ann-modal-title {
  font-family: 'Syne', 'Bebas Neue', sans-serif; font-size: 26px; font-weight: 800;
  letter-spacing: .03em; color: #dde5f0; line-height: 1.15; margin-bottom: 14px;
}
@media (prefers-color-scheme: light) {
  .ann-modal-title { color: #0f1c2e; }
}
.ann-modal-body { font-family: 'Outfit', 'DM Sans', sans-serif; font-size: 14px; color: #7a8ba0; line-height: 1.72; margin-bottom: 10px; }
@media (prefers-color-scheme: light) { .ann-modal-body { color: #4a6080; } }
.ann-modal-meta { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #3e4c5e; letter-spacing: .12em; margin-bottom: 24px; }
@media (prefers-color-scheme: light) { .ann-modal-meta { color: #94a8c0; } }
.ann-modal-multi { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #38bdf8; letter-spacing: .1em; margin-bottom: 8px; }
.ann-modal-dots { display: flex; gap: 6px; margin-bottom: 24px; }
.ann-modal-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.15); transition: background .2s; }
.ann-modal-dot.active { background: #a78bfa; }
.ann-modal-actions { display: flex; gap: 10px; }
.ann-modal-btn {
  flex: 1; padding: 11px; border-radius: 10px;
  font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em;
  text-transform: uppercase; cursor: pointer; transition: all .15s; border: none;
}
.ann-modal-btn.primary { background: #a78bfa; color: #fff; font-weight: 700; box-shadow: 0 4px 16px rgba(167,139,250,.3); }
.ann-modal-btn.primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
.ann-modal-btn.ghost { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.15); color: #7a8ba0; }
.ann-modal-btn.ghost:hover { border-color: #a78bfa; color: #a78bfa; }
@media(max-width:480px){
  #notif-tray { bottom: 80px; right: 12px; left: 12px; max-width: 100%; }
  #ann-modal { padding: 24px; }
  .ann-modal-title { font-size: 22px; }
}
`;
document.head.appendChild(style);

// ─── DOM ─────────────────────────────────────────────────
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

// ─── Audio ───────────────────────────────────────────────
let _audioCtx = null, _audioBuffer = null, _audioReady = false, _audioLoadPromise = null;
function _getAudioCtx() { if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return _audioCtx; }
function _loadMp3() {
  if (_audioLoadPromise) return _audioLoadPromise;
  _audioLoadPromise = fetch('./notification.mp3').then(r => { if (!r.ok) throw new Error('not found'); return r.arrayBuffer(); }).then(buf => _getAudioCtx().decodeAudioData(buf)).then(decoded => { _audioBuffer = decoded; _audioReady = true; }).catch(() => {});
  return _audioLoadPromise;
}
_loadMp3();
function _playNotifSound() {
  if (!_audioReady || !_audioBuffer) return;
  try { const ctx = _getAudioCtx(); if (ctx.state === 'suspended') ctx.resume(); const src = ctx.createBufferSource(); src.buffer = _audioBuffer; src.connect(ctx.destination); src.start(0); } catch(e) {}
}
['click','touchstart','keydown'].forEach(ev => document.addEventListener(ev, () => { if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume(); }, { passive: true }));

// ─── Floating notification ───────────────────────────────
window.HubNotif = {
  showMessage(senderName, text, senderId) {
    if (window.location.pathname.includes('chat.html')) {
      const uid = new URLSearchParams(window.location.search).get('uid');
      if (uid === senderId) return;
    }
    _playNotifSound();
    const col = avatarColor(senderName);
    const el = document.createElement('a');
    el.className = 'msg-notif'; el.href = 'messages.html?uid=' + senderId;
    el.innerHTML = `
      <div class="msg-notif-avatar" style="background:${col}22;color:${col}">${avatarInitials(senderName)}</div>
      <div class="msg-notif-body">
        <div class="msg-notif-name">${senderName}</div>
        <div class="msg-notif-text">${text}</div>
      </div>
      <button class="msg-notif-close" onclick="event.preventDefault();event.stopPropagation();HubNotif._dismiss(this.closest('.msg-notif'))">✕</button>`;
    tray.appendChild(el);
    setTimeout(() => HubNotif._dismiss(el), 6000);
  },
  _dismiss(el) { if (!el || !el.parentNode) return; el.classList.add('out'); setTimeout(() => el.remove(), 300); }
};

// ─── Message Listener ─────────────────────────────────────
window.HubMsgPoller = {
  _sb: null, _userId: null, _lastTs: null, _timer: null, _channel: null,
  start(sb, userId) {
    this._sb = sb; this._userId = userId;
    this._lastTs = new Date(Date.now() - 5000).toISOString();
    // Kick off web push subscription (defined in push.js)
    if (window.HubPush) window.HubPush.init(sb, userId);
    try {
      this._channel = sb.channel('hub-msg-v2-' + userId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'receiver_id=eq.' + userId }, async (payload) => {
          const msg = payload.new;
          if (msg.created_at && msg.created_at > this._lastTs) this._lastTs = msg.created_at;
          const { data: sender } = await sb.from('users').select('name').eq('id', msg.sender_id).single();
          HubNotif.showMessage(sender?.name || 'Someone', msg.message, msg.sender_id);
          if (typeof loadMessages === 'function') loadMessages();
          if (typeof loadConvos  === 'function') loadConvos();
        }).subscribe();
    } catch(e) {}
    this._timer = setInterval(() => this._poll(), 15000);
  },
  async _poll() {
    if (!this._sb || !this._userId) return;
    try {
      const { data } = await this._sb.from('messages').select('id,message,sender_id,created_at,sender:sender_id(name)').eq('receiver_id', this._userId).gt('created_at', this._lastTs).order('created_at', { ascending: true });
      if (!data || !data.length) return;
      this._lastTs = data[data.length - 1].created_at;
      const seen = {};
      for (const m of data) { if (!seen[m.sender_id]) seen[m.sender_id] = { name: m.sender?.name || 'Someone', text: m.message, id: m.sender_id }; else seen[m.sender_id].text = m.message; }
      for (const s of Object.values(seen)) HubNotif.showMessage(s.name, s.text, s.id);
      if (typeof loadMessages === 'function') loadMessages();
      if (typeof loadConvos  === 'function') loadConvos();
    } catch(e) {}
  },
  stop() { if (this._timer) clearInterval(this._timer); if (this._channel && this._sb) this._sb.removeChannel(this._channel); }
};

// ─── Announcement Modal ───────────────────────────────────
window.HubAnnouncements = {
  _anns: [], _idx: 0, _userId: null,
  async checkOnLogin(sb, userId) {
    this._userId = userId;
    try {
      // ascending: true → oldest first so we show them in chronological order
      const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: true });
      if (!data || !data.length) return;
      const seen = this._getSeen();
      const unseen = data.filter(a => !seen.includes(a.id));
      if (!unseen.length) return;
      this._anns = unseen; this._idx = 0; this._render();
    } catch(e) {}
  },
  _getSeen() { return JSON.parse(localStorage.getItem('ann_seen_v2_' + this._userId) || '[]'); },
  _markSeen(id) { const s = this._getSeen(); if (!s.includes(id)) localStorage.setItem('ann_seen_v2_' + this._userId, JSON.stringify([...s, id])); },
  _markAllSeen() { const all = [...new Set([...this._getSeen(), ...this._anns.map(a => a.id)])]; localStorage.setItem('ann_seen_v2_' + this._userId, JSON.stringify(all)); },
  _render() {
    const ann = this._anns[this._idx]; if (!ann) return;
    const total = this._anns.length, isLast = this._idx === total - 1, isFirst = this._idx === 0;
    const dotsHtml = total > 1 ? `<div class="ann-modal-multi">${this._idx + 1} of ${total} announcements</div><div class="ann-modal-dots">${this._anns.map((_,i) => `<span class="ann-modal-dot${i===this._idx?' active':''}"></span>`).join('')}</div>` : '';
    const prevBtn = !isFirst ? `<button class="ann-modal-btn ghost" id="_annPrev">← Previous</button>` : '';
    document.getElementById('ann-modal').innerHTML = `
      <div class="ann-modal-badge">📣 Announcement</div>
      <div class="ann-modal-title">${ann.title}</div>
      <div class="ann-modal-body">${ann.message}</div>
      <div class="ann-modal-meta">${ann.users?.name || 'Admin'} · ${timeAgo(ann.created_at)}</div>
      ${dotsHtml}
      <div class="ann-modal-actions">
        <button class="ann-modal-btn ghost" id="_annDismiss">Dismiss All</button>
        ${prevBtn}
        <button class="ann-modal-btn primary" id="_annNext">${isLast ? 'Got it ✓' : 'Next →'}</button>
      </div>`;
    document.getElementById('_annDismiss').onclick = () => { this._markAllSeen(); this._close(); };
    if (!isFirst) document.getElementById('_annPrev').onclick = () => { this._idx--; this._render(); };
    document.getElementById('_annNext').onclick = () => { this._markSeen(ann.id); if (isLast) { this._markAllSeen(); this._close(); } else { this._idx++; this._render(); } };
    document.getElementById('ann-modal-ov').classList.remove('hidden');
    // Play sound every time a new announcement card is shown
    _playNotifSound();
  },
  _close() { document.getElementById('ann-modal-ov').classList.add('hidden'); }
};

})();
