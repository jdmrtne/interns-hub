// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB — Web Push Client  v3
//  Registers SW, asks permission, saves subscription.
//  Works on: Android Chrome, Desktop Chrome/Edge/Firefox,
//            iPhone Safari (PWA mode, iOS 16.4+)
// ═══════════════════════════════════════════════════════

const VAPID_PUBLIC_KEY = 'BJVqeBtsr4gsTyjHRh6d-imHsRMH38P9HXVIwdS4qEuBI1NNsYR-gcWJZXwaVrUPPep9zbGOCsHJObpEXdLLKzk';

function urlBase64ToUint8Array(b64) {
  const pad  = '='.repeat((4 - (b64.length % 4)) % 4);
  const base = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base), c => c.charCodeAt(0));
}

const isIOS        = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid    = /android/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                  || navigator.standalone === true;

window.HubPush = {
  _sb: null, _userId: null, _reg: null,

  async init(sb, userId) {
    this._sb     = sb;
    this._userId = userId;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.info('[HubPush] Push not supported in this browser');
      return;
    }

    try {
      this._reg = await navigator.serviceWorker.register('/interns-hub/sw.js', {
        scope:          '/interns-hub/',
        updateViaCache: 'none',
      });
      await navigator.serviceWorker.ready;
      console.info('[HubPush] Service worker ready');
    } catch (err) {
      console.warn('[HubPush] SW registration failed:', err);
      return;
    }

    // iOS: must be installed as a PWA first
    if (isIOS && !isStandalone) {
      this._showIOSBanner();
      return;
    }

    if      (Notification.permission === 'granted') await this._subscribe(false);
    else if (Notification.permission !== 'denied')  this._showPermissionBanner();
  },

  async _subscribe(askPermission = true) {
    try {
      const reg = this._reg || await navigator.serviceWorker.ready;

      if (askPermission) {
        const result = await Notification.requestPermission();
        if (result !== 'granted') {
          console.info('[HubPush] Permission denied');
          this._hideBanner();
          return;
        }
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = sub.toJSON();
      const { error } = await this._sb
        .from('push_subscriptions')
        .upsert({
          user_id:      this._userId,
          endpoint:     subJson.endpoint,
          subscription: subJson,
          device_hint:  isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
        }, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.warn('[HubPush] Supabase save error:', error);
      } else {
        console.info('[HubPush] ✓ Push subscription saved — you will now receive OS notifications');
      }
      this._hideBanner();
    } catch (err) {
      console.warn('[HubPush] Subscribe failed:', err);
      this._hideBanner();
    }
  },

  async unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        if (this._sb && this._userId) {
          await this._sb.from('push_subscriptions')
            .delete()
            .eq('user_id', this._userId)
            .eq('endpoint', sub.endpoint);
        }
        console.info('[HubPush] Unsubscribed');
      }
    } catch(e) {
      console.warn('[HubPush] Unsubscribe error:', e);
    }
  },

  // ── Permission prompt banner ──────────────────────────
  _showPermissionBanner() {
    if (document.getElementById('hub-push-banner')) return;

    const el = document.createElement('div');
    el.id = 'hub-push-banner';
    el.innerHTML = `
<style>
#hub-push-banner {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  z-index: 99999; width: min(440px, calc(100vw - 32px));
  background: rgba(7,11,20,0.98);
  backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(167,139,250,.45); border-radius: 20px;
  padding: 20px 22px; display: flex; align-items: flex-start; gap: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.8), 0 0 0 1px rgba(167,139,250,.1);
  animation: pbIn .4s cubic-bezier(.175,.885,.32,1.275);
}
@keyframes pbIn {
  from { opacity: 0; transform: translateX(-50%) translateY(28px) scale(.94); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
#hub-push-banner .pb-icon { font-size: 34px; flex-shrink: 0; margin-top: 2px; }
#hub-push-banner .pb-body { flex: 1; min-width: 0; }
#hub-push-banner .pb-title {
  font-family: 'Syne', 'Bebas Neue', sans-serif;
  font-size: 16px; font-weight: 800; color: #dde5f0;
  margin-bottom: 5px; letter-spacing: .02em;
}
#hub-push-banner .pb-desc {
  font-family: 'Outfit', 'DM Sans', sans-serif;
  font-size: 13px; color: #7a8ba0; line-height: 1.5; margin-bottom: 16px;
}
#hub-push-banner .pb-examples {
  display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px;
}
#hub-push-banner .pb-example {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Outfit', 'DM Sans', sans-serif;
  font-size: 12px; color: #4a6080;
}
#hub-push-banner .pb-example span { font-size: 16px; }
#hub-push-banner .pb-actions { display: flex; gap: 10px; }
#hub-push-banner .pb-ok {
  flex: 1; padding: 11px 16px; border-radius: 11px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #a78bfa, #7c3aed); color: #fff;
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  letter-spacing: .14em; text-transform: uppercase; font-weight: 700;
  box-shadow: 0 4px 20px rgba(124,58,237,.5);
  transition: filter .15s, transform .15s;
}
#hub-push-banner .pb-ok:hover { filter: brightness(1.12); transform: translateY(-1px); }
#hub-push-banner .pb-no {
  padding: 11px 16px; border-radius: 11px; cursor: pointer;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #7a8ba0;
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  letter-spacing: .14em; text-transform: uppercase;
  transition: border-color .15s, color .15s;
}
#hub-push-banner .pb-no:hover { border-color: rgba(167,139,250,.5); color: #a78bfa; }
</style>
<div class="pb-icon">🔔</div>
<div class="pb-body">
  <div class="pb-title">Enable Push Notifications</div>
  <div class="pb-desc">Get notified on your phone and desktop — just like WhatsApp.</div>
  <div class="pb-examples">
    <div class="pb-example"><span>💬</span> New messages — even when this tab is closed</div>
    <div class="pb-example"><span>📣</span> New announcements from admin</div>
  </div>
  <div class="pb-actions">
    <button class="pb-ok" id="hub-push-ok">Enable Notifications</button>
    <button class="pb-no" id="hub-push-no">Not now</button>
  </div>
</div>`;

    document.body.appendChild(el);
    document.getElementById('hub-push-ok').onclick = () => this._subscribe(true);
    document.getElementById('hub-push-no').onclick = () => this._hideBanner();
  },

  // ── iOS "Add to Home Screen" guide ───────────────────
  _showIOSBanner() {
    if (document.getElementById('hub-ios-banner')) return;
    if (localStorage.getItem('hub_ios_dismissed')) return;

    const el = document.createElement('div');
    el.id = 'hub-ios-banner';
    el.innerHTML = `
<style>
#hub-ios-banner {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
  z-index: 99998; width: min(390px, calc(100vw - 28px));
  background: rgba(7,11,20,0.98);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(56,189,248,.4); border-radius: 18px;
  padding: 16px 18px; display: flex; align-items: flex-start; gap: 14px;
  box-shadow: 0 12px 40px rgba(0,0,0,.65);
  animation: pbIn .4s cubic-bezier(.175,.885,.32,1.275);
}
#hub-ios-banner .pbi { font-size: 28px; flex-shrink: 0; }
#hub-ios-banner .pbb { flex: 1; min-width: 0; }
#hub-ios-banner .pbt {
  font-family: 'Syne', 'Bebas Neue', sans-serif;
  font-size: 13px; font-weight: 800; color: #38bdf8; margin-bottom: 5px;
}
#hub-ios-banner .pbd {
  font-family: 'Outfit', 'DM Sans', sans-serif;
  font-size: 12.5px; color: #7a8ba0; line-height: 1.6;
}
#hub-ios-banner .pbd b { color: #dde5f0; }
#hub-ios-banner .pb-x {
  background: none; border: none; color: #7a8ba0;
  font-size: 18px; cursor: pointer; flex-shrink: 0; padding: 0 2px; line-height: 1;
}
</style>
<div class="pbi">📲</div>
<div class="pbb">
  <div class="pbt">Get notifications on iPhone</div>
  <div class="pbd">
    Tap <b>Share ⬆</b> in Safari →
    <b>Add to Home Screen</b> →
    Open the app from your home screen →
    Tap <b>Enable Notifications</b>
  </div>
</div>
<button class="pb-x" id="hub-ios-x">✕</button>`;

    document.body.appendChild(el);
    document.getElementById('hub-ios-x').onclick = () => {
      localStorage.setItem('hub_ios_dismissed', '1');
      el.remove();
    };
    // Auto-dismiss after 16 seconds
    setTimeout(() => { if (el.parentNode) el.remove(); }, 16000);
  },

  _hideBanner() {
    ['hub-push-banner', 'hub-ios-banner'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.remove();
    });
  },
};
