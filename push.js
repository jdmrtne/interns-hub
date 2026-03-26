// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB — Web Push Client  (push.js)
//  Works on Android, Desktop, and iOS (PWA mode only)
// ═══════════════════════════════════════════════════════

// ── VAPID public key (generated for this project) ───────
const VAPID_PUBLIC_KEY = 'BJVqeBtsr4gsTyjHRh6d-imHsRMH38P9HXVIwdS4qEuBI1NNsYR-gcWJZXwaVrUPPep9zbGOCsHJObpEXdLLKzk';

// ── Convert VAPID key to Uint8Array ─────────────────────
function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── iOS / Android detection ──────────────────────────────
const isIOS        = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid    = /android/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                  || navigator.standalone === true;

// ─────────────────────────────────────────────────────────
window.HubPush = {
  _sb: null,
  _userId: null,
  _subscribed: false,

  // Called automatically from HubMsgPoller.start()
  async init(sb, userId) {
    this._sb     = sb;
    this._userId = userId;

    // iOS requires the app to be installed as a PWA first
    if (isIOS && !isStandalone) {
      this._showIOSBanner();
      return;
    }

    // Browser doesn't support push at all
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.info('[HubPush] Push notifications not supported in this browser.');
      return;
    }

    // Already granted — silently re-subscribe (no prompt shown)
    if (Notification.permission === 'granted') {
      await this._subscribe(false);
      return;
    }

    // Already denied — don't nag
    if (Notification.permission === 'denied') return;

    // First visit — show a friendly prompt instead of the raw browser dialog
    this._showPermissionBanner();
  },

  // ── Subscribe to push and save to Supabase ─────────────
  async _subscribe(requestPermission = true) {
    try {
      const reg = await navigator.serviceWorker.ready;

      if (requestPermission) {
        const result = await Notification.requestPermission();
        if (result !== 'granted') {
          this._hideBanner();
          return;
        }
      }

      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save subscription to Supabase
      const subJson = sub.toJSON();
      await this._sb
        .from('push_subscriptions')
        .upsert({
          user_id:      this._userId,
          endpoint:     subJson.endpoint,
          subscription: subJson,
          device_hint:  isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
        }, { onConflict: 'user_id,endpoint' });

      this._subscribed = true;
      this._hideBanner();
      console.info('[HubPush] Subscribed to push notifications ✓');
    } catch (err) {
      console.warn('[HubPush] Subscription failed:', err);
      this._hideBanner();
    }
  },

  // ── Unsubscribe (e.g. on logout) ────────────────────────
  async unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        if (this._sb && this._userId) {
          await this._sb
            .from('push_subscriptions')
            .delete()
            .eq('user_id', this._userId)
            .eq('endpoint', sub.endpoint);
        }
      }
      this._subscribed = false;
    } catch(e) {}
  },

  // ── Friendly permission banner (Android / Desktop) ───────
  _showPermissionBanner() {
    if (document.getElementById('hub-push-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'hub-push-banner';
    banner.innerHTML = `
      <style>
        #hub-push-banner {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          z-index: 9999; width: min(420px, calc(100vw - 32px));
          background: rgba(15,28,46,0.96); backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(167,139,250,0.35); border-radius: 18px;
          padding: 18px 20px; display: flex; align-items: flex-start; gap: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.55);
          animation: pushBannerIn .4s cubic-bezier(.175,.885,.32,1.275);
        }
        @keyframes pushBannerIn {
          from { opacity:0; transform: translateX(-50%) translateY(20px) scale(.96); }
          to   { opacity:1; transform: translateX(-50%) translateY(0)     scale(1);  }
        }
        #hub-push-banner .pb-icon { font-size: 28px; flex-shrink:0; margin-top:2px; }
        #hub-push-banner .pb-body { flex:1; min-width:0; }
        #hub-push-banner .pb-title {
          font-family: 'Syne','Bebas Neue',sans-serif; font-size:15px; font-weight:800;
          color:#dde5f0; margin-bottom:5px; letter-spacing:.02em;
        }
        #hub-push-banner .pb-desc {
          font-family:'Outfit','DM Sans',sans-serif; font-size:12px;
          color:#7a8ba0; line-height:1.5; margin-bottom:14px;
        }
        #hub-push-banner .pb-actions { display:flex; gap:8px; }
        #hub-push-banner .pb-allow {
          flex:1; padding:9px 14px; border-radius:9px; border:none;
          background:#a78bfa; color:#fff; cursor:pointer;
          font-family:'JetBrains Mono',monospace; font-size:10px;
          letter-spacing:.12em; text-transform:uppercase; font-weight:700;
          box-shadow:0 4px 14px rgba(167,139,250,.35);
          transition: filter .15s, transform .15s;
        }
        #hub-push-banner .pb-allow:hover { filter:brightness(1.12); transform:translateY(-1px); }
        #hub-push-banner .pb-deny {
          padding:9px 14px; border-radius:9px; cursor:pointer;
          background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12);
          color:#7a8ba0; font-family:'JetBrains Mono',monospace; font-size:10px;
          letter-spacing:.12em; text-transform:uppercase;
          transition: border-color .15s, color .15s;
        }
        #hub-push-banner .pb-deny:hover { border-color:#a78bfa; color:#a78bfa; }
        @media (prefers-color-scheme: light) {
          #hub-push-banner {
            background: rgba(255,255,255,0.95);
            border-color: rgba(167,139,250,0.4);
          }
          #hub-push-banner .pb-title { color:#0f1c2e; }
          #hub-push-banner .pb-desc  { color:#4a6080; }
        }
      </style>
      <div class="pb-icon">🔔</div>
      <div class="pb-body">
        <div class="pb-title">Stay in the loop</div>
        <div class="pb-desc">Get notified instantly when you receive a message or a new announcement is posted — even when the app is closed.</div>
        <div class="pb-actions">
          <button class="pb-allow" id="hub-push-allow">Enable Notifications</button>
          <button class="pb-deny"  id="hub-push-deny">Not now</button>
        </div>
      </div>`;

    document.body.appendChild(banner);
    document.getElementById('hub-push-allow').onclick = () => this._subscribe(true);
    document.getElementById('hub-push-deny').onclick  = () => this._hideBanner();
  },

  // ── iOS install-first banner ─────────────────────────────
  _showIOSBanner() {
    if (document.getElementById('hub-ios-banner')) return;
    if (localStorage.getItem('hub_ios_banner_dismissed')) return;

    const banner = document.createElement('div');
    banner.id = 'hub-ios-banner';
    banner.innerHTML = `
      <style>
        #hub-ios-banner {
          position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
          z-index: 9998; width: min(400px, calc(100vw - 32px));
          background: rgba(15,28,46,0.97); backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(56,189,248,0.35); border-radius:18px;
          padding:16px 18px; display:flex; align-items:flex-start; gap:12px;
          box-shadow:0 12px 40px rgba(0,0,0,0.55);
          animation: pushBannerIn .4s cubic-bezier(.175,.885,.32,1.275);
        }
        #hub-ios-banner .pb-icon { font-size:24px; flex-shrink:0; }
        #hub-ios-banner .pb-body { flex:1; min-width:0; }
        #hub-ios-banner .pb-title {
          font-family:'Syne','Bebas Neue',sans-serif; font-size:14px; font-weight:800;
          color:#38bdf8; margin-bottom:5px;
        }
        #hub-ios-banner .pb-desc {
          font-family:'Outfit','DM Sans',sans-serif; font-size:12px;
          color:#7a8ba0; line-height:1.55;
        }
        #hub-ios-banner .pb-desc b { color:#dde5f0; }
        #hub-ios-banner .pb-close {
          background:none; border:none; color:#7a8ba0; font-size:18px;
          cursor:pointer; padding:0 2px; flex-shrink:0; line-height:1;
        }
        #hub-ios-banner::after {
          content:''; position:absolute; bottom:-8px; left:50%; transform:translateX(-50%);
          border:8px solid transparent; border-top-color:rgba(56,189,248,0.35);
          border-bottom:none;
        }
        @media (prefers-color-scheme:light) {
          #hub-ios-banner { background:rgba(255,255,255,0.97); }
          #hub-ios-banner .pb-desc { color:#4a6080; }
          #hub-ios-banner .pb-desc b { color:#0f1c2e; }
        }
      </style>
      <div class="pb-icon">📲</div>
      <div class="pb-body">
        <div class="pb-title">Install for notifications on iPhone</div>
        <div class="pb-desc">
          Tap <b>Share (⬆)</b> at the bottom of Safari → then
          <b>"Add to Home Screen"</b> → open the installed app to enable push notifications.
        </div>
      </div>
      <button class="pb-close" id="hub-ios-close">✕</button>`;

    document.body.appendChild(banner);
    document.getElementById('hub-ios-close').onclick = () => {
      localStorage.setItem('hub_ios_banner_dismissed', '1');
      banner.remove();
    };

    // Auto-hide after 12 seconds
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 12000);
  },

  _hideBanner() {
    const b1 = document.getElementById('hub-push-banner');
    const b2 = document.getElementById('hub-ios-banner');
    if (b1) b1.remove();
    if (b2) b2.remove();
  },
};
