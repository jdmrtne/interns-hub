// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB — Web Push Client  (push.js  v2)
//  Background push on Android, Desktop, iOS PWA
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

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // ── CRITICAL: Register the service worker ─────────────────────────────────
    // This is the step that was missing — without register(), the sw.js file is
    // never installed and no push events ever fire, even if you have a subscription.
    try {
      this._reg = await navigator.serviceWorker.register('/interns-hub/sw.js', {
        scope: '/interns-hub/',
        updateViaCache: 'none',     // always check for a new sw.js on each load
      });
      await navigator.serviceWorker.ready; // wait until the SW is active
    } catch (err) {
      console.warn('[HubPush] SW registration failed:', err);
      return;
    }

    if (isIOS && !isStandalone) { this._showIOSBanner(); return; }

    if      (Notification.permission === 'granted') await this._subscribe(false);
    else if (Notification.permission !== 'denied')  this._showPermissionBanner();
  },

  async _subscribe(askPermission = true) {
    try {
      const reg = this._reg || await navigator.serviceWorker.ready;

      if (askPermission) {
        const result = await Notification.requestPermission();
        if (result !== 'granted') { this._hideBanner(); return; }
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

      if (error) console.warn('[HubPush] Supabase save error:', error);
      else       console.info('[HubPush] ✓ Push subscription active');
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
        if (this._sb && this._userId)
          await this._sb.from('push_subscriptions')
            .delete().eq('user_id', this._userId).eq('endpoint', sub.endpoint);
      }
    } catch(e) {}
  },

  _showPermissionBanner() {
    if (document.getElementById('hub-push-banner')) return;
    const el = document.createElement('div');
    el.id = 'hub-push-banner';
    el.innerHTML = `<style>
#hub-push-banner{
  position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
  z-index:9999;width:min(420px,calc(100vw - 32px));
  background:rgba(7,11,20,0.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid rgba(167,139,250,.4);border-radius:18px;
  padding:18px 20px;display:flex;align-items:flex-start;gap:14px;
  box-shadow:0 16px 48px rgba(0,0,0,.7);
  animation:pbIn .4s cubic-bezier(.175,.885,.32,1.275);
}
@keyframes pbIn{from{opacity:0;transform:translateX(-50%) translateY(24px) scale(.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
#hub-push-banner .pbi{font-size:30px;flex-shrink:0;margin-top:2px}
#hub-push-banner .pbb{flex:1;min-width:0}
#hub-push-banner .pbt{font-family:'Syne','Bebas Neue',sans-serif;font-size:15px;font-weight:800;color:#dde5f0;margin-bottom:4px;letter-spacing:.02em}
#hub-push-banner .pbd{font-family:'Outfit','DM Sans',sans-serif;font-size:12.5px;color:#7a8ba0;line-height:1.5;margin-bottom:14px}
#hub-push-banner .pba{display:flex;gap:8px}
#hub-push-banner .pb-ok{
  flex:1;padding:10px 14px;border-radius:10px;border:none;cursor:pointer;
  background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff;
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;
  box-shadow:0 4px 16px rgba(124,58,237,.45);transition:filter .15s,transform .15s;
}
#hub-push-banner .pb-ok:hover{filter:brightness(1.1);transform:translateY(-1px)}
#hub-push-banner .pb-no{
  padding:10px 14px;border-radius:10px;cursor:pointer;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#7a8ba0;
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  transition:border-color .15s,color .15s;
}
#hub-push-banner .pb-no:hover{border-color:#a78bfa;color:#a78bfa}
@media(prefers-color-scheme:light){
  #hub-push-banner{background:rgba(255,255,255,.97);border-color:rgba(124,58,237,.35)}
  #hub-push-banner .pbt{color:#0f1c2e}
  #hub-push-banner .pbd{color:#4a6080}
}
</style>
<div class="pbi">🔔</div>
<div class="pbb">
  <div class="pbt">Stay in the loop</div>
  <div class="pbd">Get notified when you receive a message or a new announcement is posted — even when this tab is closed.</div>
  <div class="pba">
    <button class="pb-ok" id="hub-push-ok">Enable Notifications</button>
    <button class="pb-no" id="hub-push-no">Not now</button>
  </div>
</div>`;
    document.body.appendChild(el);
    document.getElementById('hub-push-ok').onclick = () => this._subscribe(true);
    document.getElementById('hub-push-no').onclick = () => this._hideBanner();
  },

  _showIOSBanner() {
    if (document.getElementById('hub-ios-banner')) return;
    if (localStorage.getItem('hub_ios_dismissed')) return;
    const el = document.createElement('div');
    el.id = 'hub-ios-banner';
    el.innerHTML = `<style>
#hub-ios-banner{
  position:fixed;bottom:76px;left:50%;transform:translateX(-50%);
  z-index:9998;width:min(390px,calc(100vw - 28px));
  background:rgba(7,11,20,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid rgba(56,189,248,.4);border-radius:18px;
  padding:14px 16px;display:flex;align-items:flex-start;gap:12px;
  box-shadow:0 12px 40px rgba(0,0,0,.65);
  animation:pbIn .4s cubic-bezier(.175,.885,.32,1.275);
}
#hub-ios-banner .pbi{font-size:26px;flex-shrink:0}
#hub-ios-banner .pbb{flex:1;min-width:0}
#hub-ios-banner .pbt{font-family:'Syne','Bebas Neue',sans-serif;font-size:13px;font-weight:800;color:#38bdf8;margin-bottom:4px}
#hub-ios-banner .pbd{font-family:'Outfit','DM Sans',sans-serif;font-size:12px;color:#7a8ba0;line-height:1.55}
#hub-ios-banner .pbd b{color:#dde5f0}
#hub-ios-banner .pb-x{background:none;border:none;color:#7a8ba0;font-size:18px;cursor:pointer;flex-shrink:0;padding:0 2px;line-height:1}
@media(prefers-color-scheme:light){
  #hub-ios-banner{background:rgba(255,255,255,.97);border-color:rgba(14,165,233,.4)}
  #hub-ios-banner .pbd{color:#4a6080}#hub-ios-banner .pbd b{color:#0f1c2e}
}
</style>
<div class="pbi">📲</div>
<div class="pbb">
  <div class="pbt">Enable notifications on iPhone</div>
  <div class="pbd">Tap <b>Share ⬆</b> in Safari → <b>Add to Home Screen</b> → open the installed app → notifications will work.</div>
</div>
<button class="pb-x" id="hub-ios-x">✕</button>`;
    document.body.appendChild(el);
    document.getElementById('hub-ios-x').onclick = () => {
      localStorage.setItem('hub_ios_dismissed', '1'); el.remove();
    };
    setTimeout(() => { if (el.parentNode) el.remove(); }, 14000);
  },

  _hideBanner() {
    ['hub-push-banner','hub-ios-banner'].forEach(id => {
      const e = document.getElementById(id); if (e) e.remove();
    });
  },
};
