// WNCORE Radio — Admin Panel System
// Extracted from index.html inline script for deferred loading
// Requires: bundle.js (loaded first via defer)


// ─ ADMIN PANEL SYSTEM ─
const ADMIN_PANEL_SESS = 'wncore_admin_sess2';
let _adminUploadTarget = { inputId: null, key: null };

// Ctrl+B trigger
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
    e.preventDefault();
    const modal = document.getElementById('admin-panel-modal');
    if (modal) {
      if (modal.classList.contains('show')) {
        modal.classList.remove('show');
      } else {
        modal.classList.add('show');
        document.getElementById('admin-login-input').focus();
      }
    }
  }
});

document.getElementById('admin-login-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') adminSubmitLogin();
});

async function adminSubmitLogin() {
  const input = document.getElementById('admin-login-input');
  const val = input.value;
  input.value = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let res;
    try {
      res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': val },
        body: JSON.stringify({ key: '_auth_check', value: '' }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    // 400 = bad key but authenticated (token valid); 401 = wrong token
    if (res.status === 400 || res.ok) {
      sessionStorage.setItem(ADMIN_PANEL_SESS, btoa(val));
      const screen = document.getElementById('admin-login-screen');
      const app = document.getElementById('admin-app');
      screen.style.display = 'none';
      app.classList.add('show');
      adminStartClock();
      adminPrefillFields();
    } else {
      const err = document.getElementById('admin-login-err');
      err.classList.add('show');
      setTimeout(() => err.classList.remove('show'), 2000);
    }
  } catch(e) {
    console.error('Admin auth error', e);
  }
}

function adminLockSession() {
  sessionStorage.removeItem(ADMIN_PANEL_SESS);
  document.getElementById('admin-app').classList.remove('show');
  document.getElementById('admin-login-screen').style.display = 'flex';
  document.getElementById('admin-login-input').value = '';
}

function adminStartClock() {
  function tick() {
    const n = new Date();
    const h = String(n.getUTCHours()).padStart(2,'0');
    const m = String(n.getUTCMinutes()).padStart(2,'0');
    const s = String(n.getUTCSeconds()).padStart(2,'0');
    const el = document.getElementById('admin-topbar-clock');
    if (el) el.textContent = `${h}:${m}:${s} UTC`;
  }
  tick();
  setInterval(tick, 1000);
}

function adminShowSection(id, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-sidebar-item').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('admin-sec-' + id);
  if (sec) sec.classList.add('active');
  if (el) el.classList.add('active');
}

// ── Status / toast helpers ──
function adminSetStatus(key, state, msg) {
  const el = document.getElementById('status-' + key);
  if (!el) return;
  el.className = 'admin-field-status admin-field-status--' + state;
  el.textContent = msg;
  if (state === 'ok' || state === 'err') {
    setTimeout(() => { el.textContent = ''; el.className = 'admin-field-status'; }, 4000);
  }
}

// ── Prefill all fields from saved config ──
async function adminPrefillFields() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    let r;
    try {
      r = await fetch('/api/config', { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!r || !r.ok) return;
    const cfg = await r.json();
    const MAP = {
      'admin-globe-bg-url':          { key: 'globe_bg_video',      isMedia: true  },
      'admin-anime-banner-url':       { key: 'anime_banner_img',    isMedia: true  },
      'admin-anime-banner-video-url': { key: 'anime_banner_video',  isMedia: true  },
      'admin-livemusic-bg-url':       { key: 'livemusic_hero_bg',   isMedia: true  },
      'admin-eye-video-url':          { key: 'eye_spooky_video',    isMedia: true  },
      'admin-spooky-text':            { key: 'eye_spooky_text',     isMedia: false },
      'admin-signal-text':            { key: 'signal_status_text',  isMedia: false },
      'admin-ticker-text':            { key: 'ticker_inject',       isMedia: false },
      'admin-genre-hero-url':         { key: 'genre_hero_video',    isMedia: true  },
      'admin-charts-hero-url':        { key: 'charts_hero_video',   isMedia: true  },
      'admin-podcasts-hero-url':      { key: 'podcasts_hero_video', isMedia: true  },
      'admin-about-bg-url':           { key: 'about_bg_video',      isMedia: true  },
      'admin-ghuul-video-url':        { key: 'ghuul_video_url',     isMedia: true  },
      'admin-home-hero-url':          { key: 'home_hero_video',     isMedia: true  },
    };
    Object.entries(MAP).forEach(([inputId, { key, isMedia }]) => {
      const val = cfg[key];
      const el = document.getElementById(inputId);
      if (el && val) {
        el.value = val;
        el.style.borderColor = 'rgba(34,197,94,0.25)';
        if (isMedia) adminShowMediaPreview(key, val);
        adminSetStatus(key, 'saved', '✓ Saved: ' + val.split('/').pop().slice(0,48));
      }
    });
  } catch(e) {}
}

// ── Media preview (video or image) in the preview thumb ──
function adminShowMediaPreview(key, url) {
  if (!url) return;
  const container = document.getElementById('prev-' + key);
  if (!container) return;
  const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes('supabase.co/storage');
  const isImage = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
  container.innerHTML = '';
  if (isVideo) {
    const vid = document.createElement('video');
    vid.src = url; vid.autoplay = true; vid.muted = true; vid.loop = true; vid.playsInline = true;
    vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:6px;';
    vid.onerror = () => { container.innerHTML = '<div class="admin-preview-placeholder">⚠ Video failed to load</div>'; };
    container.appendChild(vid);
  } else if (isImage) {
    const img = document.createElement('img');
    img.src = url; img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:6px;';
    img.onerror = () => { container.innerHTML = '<div class="admin-preview-placeholder">⚠ Image failed to load</div>'; };
    container.appendChild(img);
  }
}

// ── Save a single field ──
async function adminSaveField(key, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const value = input.value.trim();

  let adminToken = '';
  try {
    const raw = sessionStorage.getItem(ADMIN_PANEL_SESS);
    adminToken = raw ? atob(raw) : '';
  } catch(e) {}

  adminSetStatus(key, 'saving', '⟳ Saving…');

  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ key, value })
    });

    if (!r.ok) {
      let detail = '';
      try { const j = await r.json(); detail = j.error || ''; } catch(_) {}
      throw new Error('HTTP ' + r.status + (detail ? ' — ' + detail : ''));
    }

    input.style.borderColor = 'rgba(34,197,94,0.35)';
    setTimeout(() => input.style.borderColor = '', 3000);
    adminSetStatus(key, 'ok', '✓ Saved successfully');
    adminShowMediaPreview(key, value);
  } catch(e) {
    console.error('Save failed:', e);
    input.style.borderColor = 'rgba(200,71,42,0.5)';
    setTimeout(() => input.style.borderColor = '', 3000);
    adminSetStatus(key, 'err', '✗ ' + e.message);
  }
}

// ── Upload: trigger hidden file input ──
function adminTriggerUpload(inputId, key) {
  _adminUploadTarget = { inputId, key };
  const fi = document.getElementById('admin-upload-file-input');
  if (fi) { fi.value = ''; fi.click(); }
}

// ── Upload: handle file selected ──
async function adminHandleUpload(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const { inputId, key } = _adminUploadTarget;
  if (!inputId || !key) return;

  adminSetStatus(key, 'saving', '⟳ Uploading ' + file.name + '…');

  let adminToken = '';
  try {
    const raw = sessionStorage.getItem(ADMIN_PANEL_SESS);
    adminToken = raw ? atob(raw) : '';
  } catch(e) {}

  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('key', key);

    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-admin-token': adminToken },
      body: fd
    });

    if (r.ok) {
      const data = await r.json();
      const url = data.url || data.publicUrl || '';
      if (url) {
        const input = document.getElementById(inputId);
        if (input) { input.value = url; input.style.borderColor = 'rgba(34,197,94,0.35)'; }
        adminSetStatus(key, 'ok', '✓ Uploaded — saving URL…');
        await adminSaveField(key, inputId);
        return;
      }
    }
    // If no upload API, fall back to showing instructions
    adminSetStatus(key, 'err', '✗ No /api/upload endpoint — paste the Supabase URL manually after uploading in Supabase Storage');
  } catch(e) {
    adminSetStatus(key, 'err', '✗ Upload failed: ' + e.message);
  }
}

// ── Ticker ──
function adminPresetTicker(msg) {
  const el = document.getElementById('admin-ticker-inject');
  if (el) el.value = msg;
}

function adminInjectTicker() {
  const el = document.getElementById('admin-ticker-inject');
  if (!el) return;
  const msg = el.value.trim();
  if (!msg) return;
  adminSaveField('ticker_inject', 'admin-ticker-inject');
  // Also inject live into DOM ticker if visible
  const ticker1 = document.querySelector('.ticker-content');
  if (ticker1) {
    const span = document.createElement('span');
    span.textContent = ' ⚠ ' + msg + ' · ';
    span.style.color = '#c8472a';
    ticker1.prepend(span);
  }
}

// ── Featured Stations ──
async function adminSaveFeatured(num) {
  const name = document.getElementById('admin-feat' + num + '-name')?.value.trim() || '';
  const url  = document.getElementById('admin-feat' + num + '-url')?.value.trim()  || '';
  const meta = document.getElementById('admin-feat' + num + '-meta')?.value.trim() || '';
  const key  = 'featured_station_' + num;

  let adminToken = '';
  try {
    const raw = sessionStorage.getItem(ADMIN_PANEL_SESS);
    adminToken = raw ? atob(raw) : '';
  } catch(e) {}

  adminSetStatus('feat' + num, 'saving', '⟳ Saving…');

  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ key, value: JSON.stringify({ name, url, meta }) })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    adminSetStatus('feat' + num, 'ok', '✓ Saved');
  } catch(e) {
    adminSetStatus('feat' + num, 'err', '✗ ' + e.message);
  }
}

// B25: Update ticker station count from live data (both ticker copies)
window._updateTickerCount = function(count) {
  const text = count.toLocaleString() + ' VERIFIED STATIONS ONLINE';
  const el1 = document.getElementById('ticker-station-count');
  const el2 = document.getElementById('ticker-station-count-2');
  if (el1 && count) el1.textContent = text;
  if (el2 && count) el2.textContent = text;
};

// MED: Jitter listener count so it feels live (±1-2% every 7-13s)
(function initListenerJitter() {
  let base = 291447;
  function jitter() {
    const delta = Math.floor((Math.random() - 0.48) * base * 0.02);
    base = Math.max(270000, base + delta);
    const formatted = base.toLocaleString();
    const el1 = document.getElementById('ticker-listener-count-1');
    const el2 = document.getElementById('ticker-listener-count-2');
    if (el1) el1.textContent = formatted;
    if (el2) el2.textContent = formatted;
    setTimeout(jitter, 7000 + Math.random() * 6000);
  }
  setTimeout(jitter, 3000 + Math.random() * 4000);
})();
