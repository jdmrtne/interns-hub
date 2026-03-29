// ═══════════════════════════════════════════════════════════════════════════
// profile.js — The Interns Hub
// Shared module: profile-edit modal (sidebar click) + image compression
// Include on every page: <script src="./profile.js"></script>
// After boot(), call: enableSidebarProfileClick(sb, currentUser.id, profileObj)
// ═══════════════════════════════════════════════════════════════════════════

// ── Image compression ──────────────────────────────────────────────────────
// Resizes to maxDim px on longest side, then JPEG-compresses until ≤ targetKB
async function compressImage(file, maxDim = 400, targetKB = 80) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      // Reduce quality until size is within target
      // Base64 ≈ 1.37× raw byte size
      const maxB64 = targetKB * 1024 * 1.37;
      let quality = 0.85, dataUrl;
      do {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        quality = Math.round((quality - 0.05) * 100) / 100;
      } while (dataUrl.length > maxB64 && quality > 0.15);

      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Image load failed')); };
    img.src = blobUrl;
  });
}

// ── Helper: render avatar (photo or initials) in a container element ───────
function renderAvatarInEl(el, avatarUrl, name, size = 40) {
  if (!el) return;
  const col = (typeof avatarColor === 'function') ? avatarColor(name) : '#38bdf8';
  const ini = (typeof avatarInitials === 'function') ? avatarInitials(name) : (name?.[0] || '?').toUpperCase();
  el.style.width  = size + 'px';
  el.style.height = size + 'px';
  el.style.borderRadius = '50%';
  el.style.overflow = 'hidden';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  if (avatarUrl) {
    el.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    el.innerHTML = '';
    el.style.background = col + '22';
    el.style.color = col;
    el.style.fontFamily = 'var(--font-mono)';
    el.style.fontWeight = '700';
    el.style.fontSize = Math.round(size * 0.4) + 'px';
    el.textContent = ini;
  }
}

// ── Inject profile-edit modal HTML (idempotent) ────────────────────────────
function _injectProfileModalHTML() {
  if (document.getElementById('hubProfileModal')) return;

  const div = document.createElement('div');
  div.innerHTML = `
<style>
#hubProfileModal{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:16px;}
#hubProfileModal.open{display:flex;}
.hub-pmodal-box{background:var(--glass-strong);border:1px solid var(--glass-border-b);border-radius:16px;width:100%;max-width:420px;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;animation:hubPmIn .2s ease both;}
@keyframes hubPmIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
.hub-pmodal-hdr{padding:20px 22px 16px;border-bottom:1px solid var(--glass-border,#21262d);display:flex;align-items:center;justify-content:space-between;}
.hub-pmodal-title{font-family:var(--font-display,'Syne',sans-serif);font-size:20px;font-weight:800;letter-spacing:.06em;color:var(--text,#e6edf3);}
.hub-pmodal-close{background:none;border:1px solid var(--glass-border-b);border-radius:6px;padding:5px 11px;font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted,#7d8590);cursor:pointer;transition:all .15s;}
.hub-pmodal-close:hover{border-color:#f85149;color:#f85149;}
.hub-pmodal-body{overflow-y:auto;flex:1;padding:22px;}
.hub-avatar-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:22px;}
.hub-avatar-ring{width:86px;height:86px;border-radius:50%;position:relative;cursor:pointer;flex-shrink:0;overflow:hidden;border:2px solid var(--glass-border-b);transition:border-color .2s;}
.hub-avatar-ring:hover{border-color:var(--primary,#38bdf8);}
.hub-avatar-ring img,.hub-avatar-ring .hub-av-initials{width:100%;height:100%;object-fit:cover;border-radius:50%;display:flex;align-items:center;justify-content:center;}
.hub-av-overlay{position:absolute;inset:0;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;border-radius:50%;font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:9px;letter-spacing:.1em;color:#fff;text-transform:uppercase;}
.hub-avatar-ring:hover .hub-av-overlay{opacity:1;}
.hub-photo-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;}
.hub-field-label{font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:9px;letter-spacing:.12em;color:var(--text-muted,#7d8590);text-transform:uppercase;display:block;margin-bottom:6px;}
.hub-field-input{width:100%;background:var(--glass);border:1px solid var(--glass-border-b);border-radius:8px;padding:10px 14px;color:var(--text,#e6edf3);font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:13px;outline:none;transition:border-color .2s,box-shadow .2s;}
.hub-field-input:focus{border-color:var(--primary,#38bdf8);box-shadow:0 0 0 3px rgba(56,189,248,.15);}
.hub-pmodal-footer{padding:0 22px 20px;display:flex;gap:10px;}
.hub-pmodal-msg{padding:0 22px 14px;font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:10px;letter-spacing:.06em;text-align:center;display:none;}
@media(prefers-color-scheme:light){
  /* light mode via design system vars */
  .hub-pmodal-hdr{border-bottom-color:#d0d7de;}
  .hub-pmodal-title{color:var(--text);}
  .hub-pmodal-close{border-color:var(--glass-border-b);color:var(--text-muted);}
  .hub-field-input{background:#fff;border-color:var(--glass-border-b);color:var(--text);}
}
</style>
<div id="hubProfileModal">
  <div class="hub-pmodal-box">
    <div class="hub-pmodal-hdr">
      <div class="hub-pmodal-title">Edit Profile</div>
      <button class="hub-pmodal-close" onclick="hubCloseProfileModal()"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Close</button>
    </div>
    <div class="hub-pmodal-body">
      <div class="hub-avatar-wrap">
        <div class="hub-avatar-ring" id="hubAvRing" onclick="document.getElementById('hubImgInput').click()" title="Click to change photo">
          <div class="hub-av-initials" id="hubAvInitialsEl" style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:28px;font-weight:700;display:flex;align-items:center;justify-content:center;width:100%;height:100%;"></div>
          <div class="hub-av-overlay">Change</div>
        </div>
        <input type="file" id="hubImgInput" accept="image/*" style="display:none" onchange="hubHandleImgChange(event)">
        <div class="hub-photo-btns">
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('hubImgInput').click()" style="font-size:10px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Change Photo</button>
          <button class="btn btn-ghost btn-sm" id="hubRemovePhotoBtn" onclick="hubRemovePhoto()" style="font-size:10px;color:#f85149;display:none"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Remove</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div>
          <label class="hub-field-label">Display Name</label>
          <input class="hub-field-input" id="hubNameInput" placeholder="Your full name" maxlength="60">
        </div>
        <div>
          <label class="hub-field-label">Department</label>
          <input class="hub-field-input" id="hubDeptInput" placeholder="e.g. Engineering, Marketing…" maxlength="80">
        </div>
        <div>
          <label class="hub-field-label">Required Internship Hours</label>
          <input class="hub-field-input" id="hubInternHoursInput" type="number" min="1" max="9999" step="1"
            placeholder="e.g. 300" style="appearance:textfield;-moz-appearance:textfield"
            oninput="hubUpdateProgPreview()">
          <div style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:9px;color:var(--text-dim,#484f58);margin-top:5px">
            Enter your total required hours for this internship
          </div>
        </div>
      </div>
      <!-- Internship Progress — shown once hours > 0 -->
      <div id="hubInternProgressSection" style="display:none;margin-top:4px;padding-top:16px;border-top:1px solid var(--glass-border-b)">
        <div style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted,#7d8590);margin-bottom:10px">Your Progress</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span id="hubProgHours" style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:11px;color:var(--text-muted,#7d8590)">0h / 0h</span>
          <span id="hubProgPct" style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:11px;font-weight:600;color:var(--primary,#38bdf8)">0%</span>
        </div>
        <div style="width:100%;height:8px;background:var(--glass,rgba(255,255,255,.06));border-radius:99px;overflow:hidden;border:1px solid var(--glass-border-b)">
          <div id="hubProgFill" style="height:100%;border-radius:99px;background:linear-gradient(90deg,#38bdf8,#60a5fa);transition:width .6s ease;width:0%"></div>
        </div>
        <div id="hubProgMeta" style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:9px;color:var(--text-dim,#484f58);margin-top:6px;text-align:right"></div>
      </div>
    </div>
    <div class="hub-pmodal-msg" id="hubPModalMsg"></div>
    <div class="hub-pmodal-footer">
      <button class="btn btn-primary" style="flex:1" id="hubSaveProfileBtn" onclick="hubSaveProfile()">Save Changes</button>
      <button class="btn btn-ghost" onclick="hubCloseProfileModal()">Cancel</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(div.firstElementChild); // <style>
  document.body.appendChild(div.children[0]);       // modal div
}

// ── Internal state ─────────────────────────────────────────────────────────
const _hub = { sb: null, uid: null, profile: null, newAvatar: null, removeAvatar: false };

// ── Open profile-edit modal ────────────────────────────────────────────────
function hubOpenProfileModal(sbClient, userId, profile) {
  _injectProfileModalHTML();
  _hub.sb = sbClient;
  _hub.uid = userId;
  _hub.profile = profile;
  _hub.newAvatar = null;
  _hub.removeAvatar = false;

  document.getElementById('hubNameInput').value = profile?.name || '';
  document.getElementById('hubDeptInput').value = profile?.department || '';
  document.getElementById('hubInternHoursInput').value = profile?.internship_hours || '';
  document.getElementById('hubPModalMsg').style.display = 'none';

  _hubRefreshAvatarPreview(profile?.avatar_url, profile?.name || '');

  // Always try to load progress (section appears only if hours > 0)
  _hubLoadInternProgress(sbClient, userId, profile?.internship_hours || 0);

  document.getElementById('hubProfileModal').classList.add('open');
}

// Called live when the user types into the hours input
function hubUpdateProgPreview() {
  const newHours = parseFloat(document.getElementById('hubInternHoursInput').value) || 0;
  // Re-render progress with the new total without re-fetching logs
  if (_hub._loggedHrs !== undefined) {
    _hubRenderProgress(_hub._loggedHrs, newHours);
  }
}

async function _hubLoadInternProgress(sbClient, userId, totalHours) {
  const { data: logs } = await sbClient.from('time_logs').select('total_hours, am_in, am_out, pm_in, pm_out').eq('user_id', userId);
  let logged = 0;
  (logs || []).forEach(l => {
    if (l.total_hours) { logged += parseFloat(l.total_hours); return; }
    const toM = t => { if (!t) return null; const [h, m] = (t + ':00').split(':').map(Number); return h * 60 + (m || 0); };
    const ai = toM(l.am_in), ao = toM(l.am_out), pi = toM(l.pm_in), po = toM(l.pm_out);
    if (ai && ao && ao > ai) logged += (ao - ai) / 60;
    if (pi && po && po > pi) logged += (po - pi) / 60;
  });
  _hub._loggedHrs = logged; // cache so live preview can reuse
  _hubRenderProgress(logged, totalHours);
}

function _hubRenderProgress(logged, totalHours) {
  const section = document.getElementById('hubInternProgressSection');
  if (!totalHours || totalHours <= 0) { section.style.display = 'none'; return; }
  section.style.display = '';
  const pct = Math.min(100, (logged / totalHours) * 100);
  const remaining = Math.max(0, totalHours - logged);
  const complete = logged >= totalHours;
  document.getElementById('hubProgHours').textContent = `${logged.toFixed(1)}h / ${totalHours}h`;
  document.getElementById('hubProgPct').textContent = Math.round(pct) + '%';
  const fill = document.getElementById('hubProgFill');
  fill.style.width = pct.toFixed(1) + '%';
  fill.style.background = complete ? 'linear-gradient(90deg,#34d399,#38bdf8)' : 'linear-gradient(90deg,#38bdf8,#60a5fa)';
  document.getElementById('hubProgMeta').innerHTML = complete ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01"/><path d="m22 2-2.24 2.24M20 12l2.24 2.24M12 20l2.24 2.24"/><path d="M2.5 6.5 5 4l6 1-1 6-2.5 2.5"/><path d="M14 8.5 9.5 13"/></svg> Internship complete!' : `${remaining.toFixed(1)}h remaining`;
}

function _hubRefreshAvatarPreview(avatarUrl, name) {
  const ring = document.getElementById('hubAvRing');
  const initEl = document.getElementById('hubAvInitialsEl');
  const removeBtn = document.getElementById('hubRemovePhotoBtn');
  const col = (typeof avatarColor === 'function') ? avatarColor(name) : '#38bdf8';
  const ini = (typeof avatarInitials === 'function') ? avatarInitials(name) : (name?.[0] || '?').toUpperCase();

  // Remove old preview images
  ring.querySelectorAll('img.hub-prev-img').forEach(e => e.remove());

  if (avatarUrl) {
    initEl.style.display = 'none';
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.className = 'hub-prev-img';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0';
    ring.insertBefore(img, ring.firstChild);
    removeBtn.style.display = '';
  } else {
    initEl.style.display = 'flex';
    initEl.style.background = col + '22';
    initEl.style.color = col;
    initEl.textContent = ini;
    removeBtn.style.display = 'none';
  }
}

async function hubHandleImgChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  const btn = document.getElementById('hubSaveProfileBtn');
  btn.textContent = 'Compressing…'; btn.disabled = true;

  try {
    const dataUrl = await compressImage(file, 400, 80);
    _hub.newAvatar = dataUrl;
    _hub.removeAvatar = false;

    const ring = document.getElementById('hubAvRing');
    ring.querySelectorAll('img.hub-prev-img').forEach(e => e.remove());
    document.getElementById('hubAvInitialsEl').style.display = 'none';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'hub-prev-img';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0';
    ring.insertBefore(img, ring.firstChild);

    document.getElementById('hubRemovePhotoBtn').style.display = '';
    const kb = Math.round(dataUrl.length * 0.75 / 1024);
    _hubShowMsg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><polyline points="20 6 9 17 4 12"/></svg> Compressed to ~${kb} KB`, '#34d399');
  } catch {
    _hubShowMsg('Failed to process image', '#f85149');
  }

  btn.textContent = 'Save Changes'; btn.disabled = false;
  event.target.value = '';
}

function hubRemovePhoto() {
  _hub.removeAvatar = true;
  _hub.newAvatar = null;
  const name = document.getElementById('hubNameInput').value || _hub.profile?.name || '';
  _hubRefreshAvatarPreview(null, name);
}

function _hubShowMsg(msg, color) {
  const el = document.getElementById('hubPModalMsg');
  el.textContent = msg;
  el.style.color = color || 'var(--text-muted)';
  el.style.display = 'block';
}

async function hubSaveProfile() {
  const name = document.getElementById('hubNameInput').value.trim();
  const dept = document.getElementById('hubDeptInput').value.trim();
  const hoursRaw = document.getElementById('hubInternHoursInput').value.trim();
  const internshipHours = hoursRaw === '' || Number(hoursRaw) <= 0 ? null : Number(hoursRaw);
  if (!name) { _hubShowMsg('Name cannot be empty', '#f85149'); return; }

  const btn = document.getElementById('hubSaveProfileBtn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  const updates = { name, department: dept, internship_hours: internshipHours };
  if (_hub.newAvatar)    updates.avatar_url = _hub.newAvatar;
  if (_hub.removeAvatar) updates.avatar_url = null;

  const { error } = await _hub.sb.from('users').update(updates).eq('id', _hub.uid);
  if (error) {
    _hubShowMsg('Save failed: ' + error.message, '#f85149');
    btn.textContent = 'Save Changes'; btn.disabled = false;
    return;
  }

  // ── Update sidebar avatar live ──
  const navAv = document.getElementById('navAvatar');
  if (navAv) {
    renderAvatarInEl(navAv, updates.avatar_url !== undefined ? updates.avatar_url : _hub.profile?.avatar_url, name, navAv.offsetWidth || 36);
  }
  const navName = document.getElementById('navUserName');
  if (navName) navName.textContent = name;

  // Update cached profile
  if (_hub.profile) {
    _hub.profile.name = name;
    _hub.profile.department = dept;
    _hub.profile.internship_hours = internshipHours;
    if (updates.avatar_url !== undefined) _hub.profile.avatar_url = updates.avatar_url;
  }

  _hubShowMsg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" style="vertical-align:-0.15em" ><polyline points="20 6 9 17 4 12"/></svg> Profile saved!', '#34d399');
  btn.textContent = 'Save Changes'; btn.disabled = false;

  // Notify page if it defines a hook
  if (typeof window.onHubProfileSaved === 'function') window.onHubProfileSaved(_hub.profile);

  setTimeout(hubCloseProfileModal, 900);
}

function hubCloseProfileModal() {
  const m = document.getElementById('hubProfileModal');
  if (m) m.classList.remove('open');
}

// ── Wire sidebar user section to open profile modal ────────────────────────
// Call this AFTER your boot() has set up the nav and fetched the profile.
// e.g.:  enableSidebarProfileClick(sb, currentUser.id, profileObj);
function enableSidebarProfileClick(sbClient, userId, profileObj) {
  const el = document.querySelector('.snav-user');
  if (!el) return;

  // Render photo if profile has one
  const navAv = document.getElementById('navAvatar');
  if (navAv && profileObj?.avatar_url) {
    renderAvatarInEl(navAv, profileObj.avatar_url, profileObj?.name || '', navAv.offsetWidth || 36);
  }

  el.style.cursor = 'pointer';
  el.title = 'Edit your profile';
  el.style.borderRadius = '8px';
  el.style.transition = 'background .15s';
  el.addEventListener('mouseenter', () => el.style.background = 'rgba(255,255,255,.05)');
  el.addEventListener('mouseleave', () => el.style.background = '');
  el.addEventListener('click', () => hubOpenProfileModal(sbClient, userId, profileObj));

  // Inject modal early so it's ready
  _injectProfileModalHTML();
}

// Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { hubCloseProfileModal(); }
});
