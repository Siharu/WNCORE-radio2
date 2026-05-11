/* WNCORE RADIO — ADMIN PANEL
 * Access: Ctrl+B (held 800ms) | Password protected
 * Obfuscated identifiers intentional
 */
(function(){
'use strict';

// ─── CONSTANTS ──────────────────────────────────────────────────
// B01/B11/B18 fix: No client-side password storage - auth is server-side via /api/config
const _0x2b = 'wncore_adm_sess';       // session key
const _0x3c = 'wncore_adm_log';        // activity log key

// ─── KEYBOARD TRIGGER (Ctrl+A held 800ms) ─────────────────────────────────
let _ctrlBStart = 0;
let _ctrlBTimer = null;

document.addEventListener('keydown', function(e){
  if(e.ctrlKey && e.key === 'b'){
    if(_ctrlBStart === 0){
      _ctrlBStart = Date.now();
      _ctrlBTimer = setTimeout(function(){
        e.preventDefault();
        openAdminPanel();
        _ctrlBStart = 0;
      }, 800);
    }
  }
});

document.addEventListener('keyup', function(e){
  if(e.key === 'b' || e.key === 'Control'){
    _ctrlBStart = 0;
    if(_ctrlBTimer){ clearTimeout(_ctrlBTimer); _ctrlBTimer = null; }
  }
});

// ─── SESSION CHECK ────────────────────────────────────────────────────────
function _isAuthed(){
  try {
    const s = sessionStorage.getItem(_0x2b);
    if(!s) return false;
    const p = JSON.parse(atob(s));
    return p && p.t && (Date.now() - p.t < 3600000); // 1hr session
  } catch(e){ return false; }
}

function _setAuthed(tokenVal){
  const token = {t: Date.now(), u: 'admin'};
  sessionStorage.setItem(_0x2b, btoa(JSON.stringify(token)));
  // Store token for API calls within this session
  if(tokenVal) sessionStorage.setItem(_0x2b + '_tk', btoa(tokenVal));
}

function _getToken(){
  try {
    const raw = sessionStorage.getItem(_0x2b + '_tk');
    return raw ? atob(raw) : '';
  } catch(e){ return ''; }
}

function _clearAuth(){
  sessionStorage.removeItem(_0x2b);
  sessionStorage.removeItem(_0x2b + '_tk');
}

// ─── INACTIVITY TIMEOUT (20 min) ──────────────────────────────────────────
let _inactivityTimer = null;
const INACTIVITY_MS = 20 * 60 * 1000;

function _resetInactivityTimer() {
  clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(() => {
    if (_isAuthed()) {
      _clearAuth();
      _log('SESSION_TIMEOUT');
      const panel = document.getElementById('adm-panel');
      if (panel && panel.style.display !== 'none') {
        panel.style.display = 'none';
        const msg = document.createElement('div');
        msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#111;color:#c84a2e;padding:22px 32px;border:1px solid #c84a2e;border-radius:6px;font-family:monospace;z-index:99999;font-size:0.9rem;';
        msg.textContent = 'Admin session expired due to inactivity.';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3500);
      }
    }
  }, INACTIVITY_MS);
}

['mousemove','keydown','click','touchstart'].forEach(ev => {
  document.addEventListener(ev, () => { if (_isAuthed()) _resetInactivityTimer(); }, { passive: true });
});

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────
function _log(action){
  try {
    const logs = JSON.parse(localStorage.getItem(_0x3c)||'[]');
    logs.unshift({t: new Date().toISOString(), a: action});
    if(logs.length > 50) logs.pop();
    localStorage.setItem(_0x3c, JSON.stringify(logs));
  } catch(e){}
}

// ─── OPEN ADMIN PANEL ─────────────────────────────────────────────────────
function openAdminPanel(){
  if(document.getElementById('wncore-admin-overlay')) return;
  injectAdminStyles();

  if(_isAuthed()){
    showAdminDashboard();
  } else {
    showAdminLogin();
  }
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
function showAdminLogin(){
  const overlay = document.createElement('div');
  overlay.id = 'wncore-admin-overlay';
  overlay.innerHTML = `
    <div id="adm-backdrop" onclick=""></div>
    <div id="adm-panel" class="adm-panel">
      <div class="adm-scanlines"></div>
      <div class="adm-header">
        <div class="adm-logo">
          <span class="adm-logo-mark">WNCORE</span>
          <span class="adm-logo-sub">ADMIN TERMINAL</span>
        </div>
        <button class="adm-close-btn" onclick="window.__admClose()" aria-label="Close">✕</button>
      </div>
      <div class="adm-body">
        <div class="adm-terminal-line">WNCORE BROADCAST NETWORK — SECURE CHANNEL</div>
        <div class="adm-terminal-line">NODE 01 ONLINE · NODE 02 ONLINE · NODE 09 ——</div>
        <div class="adm-terminal-line" style="color:var(--accent);margin-top:4px">ACCESS RESTRICTED — CLEARANCE REQUIRED</div>
        <div class="adm-login-box">
          <label class="adm-label">CREDENTIAL</label>
          <input type="password" id="adm-pass-input" class="adm-input" placeholder="████████" autocomplete="off" autocorrect="off" spellcheck="false">
          <button class="adm-submit-btn" onclick="window.__admSubmit()">AUTHENTICATE ›</button>
          <div class="adm-error" id="adm-error" style="display:none">
            ACCESS DENIED · ATTEMPT LOGGED · <span id="adm-attempts">0</span>/3
          </div>
          <div class="adm-hint" id="adm-hint" style="display:none">
            SESSION SUSPENDED — TRY AGAIN IN 5 MINUTES
          </div>
        </div>
      </div>
      <div class="adm-footer-bar">
        <span>SESSION: UNAUTHENTICATED</span>
        <span id="adm-ts">——</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Focus input
  setTimeout(()=>{
    const inp = document.getElementById('adm-pass-input');
    if(inp){ inp.focus(); inp.addEventListener('keydown', e=>{ if(e.key==='Enter') window.__admSubmit(); }); }
    updateAdmClock();
    setInterval(updateAdmClock, 1000);
  }, 50);
}

// ─── CLOCK ────────────────────────────────────────────────────────────────
function updateAdmClock(){
  const el = document.getElementById('adm-ts');
  if(!el) return;
  const n = new Date();
  el.textContent = n.toISOString().replace('T',' ').split('.')[0] + ' UTC';
}

// ─── AUTH LOGIC ──────────────────────────────────────────────────────────
let _failCount = 0;
let _lockUntil = 0;

window.__admSubmit = function(){
  if(Date.now() < _lockUntil){
    document.getElementById('adm-hint').style.display='block';
    document.getElementById('adm-error').style.display='none';
    return;
  }
  const inp = document.getElementById('adm-pass-input');
  if(!inp) return;
  const val = inp.value;
  inp.value = '';

  // Server-side auth — no client-side password storage
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': val },
    body: JSON.stringify({ key: '_auth_check', value: '' })
  }).then(res => {
    // 400 = valid token but invalid key (expected); 401 = wrong token
    if (res.status === 400 || res.ok) {
      _failCount = 0;
      _setAuthed(val);
      _log('AUTH_SUCCESS');
      closeAdminOverlay();
      setTimeout(showAdminDashboard, 100);
    } else {
      _failCount++;
      _log('AUTH_FAIL');
      const errEl = document.getElementById('adm-error');
      const attEl = document.getElementById('adm-attempts');
      if(errEl) errEl.style.display='block';
      if(attEl) attEl.textContent = _failCount;
      if(_failCount >= 3){
        _lockUntil = Date.now() + 300000; // 5min lockout
        document.getElementById('adm-hint').style.display='block';
      }
      const panel = document.getElementById('adm-panel');
      if(panel){ panel.classList.add('adm-shake'); setTimeout(()=>panel.classList.remove('adm-shake'),400); }
    }
  }).catch(() => {
    _failCount++;
    _log('AUTH_NET_ERR');
    const panel = document.getElementById('adm-panel');
    if(panel){ panel.classList.add('adm-shake'); setTimeout(()=>panel.classList.remove('adm-shake'),400); }
  });
};

window.__admClose = function(){
  closeAdminOverlay();
};

function closeAdminOverlay(){
  const ov = document.getElementById('wncore-admin-overlay');
  if(ov) ov.remove();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function showAdminDashboard(){
  const overlay = document.createElement('div');
  overlay.id = 'wncore-admin-overlay';

  const logs = JSON.parse(localStorage.getItem(_0x3c)||'[]');
  const logHtml = logs.slice(0,10).map(l=>`<div class="adm-log-row"><span class="adm-log-ts">${l.t.slice(11,19)}</span><span class="adm-log-act">${l.a}</span></div>`).join('') || '<div style="color:var(--text3);font-size:0.7rem">No activity logged</div>';

  const isDark = document.body.classList.contains('dark-mode');
  const isMinimal = document.body.classList.contains('minimal-mode');
  const exposure = window.exposure || 0;
  const wrongness = window.WRONGNESS ? window.WRONGNESS.getIntensity().toFixed(1) : '—';

  overlay.innerHTML = `
    <div id="adm-backdrop" onclick=""></div>
    <div id="adm-panel" class="adm-panel adm-panel-wide">
      <div class="adm-scanlines"></div>
      <div class="adm-header">
        <div class="adm-logo">
          <span class="adm-logo-mark">WNCORE</span>
          <span class="adm-logo-sub">ADMIN DASHBOARD · <span style="color:var(--green)">AUTHENTICATED</span></span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="adm-lock-btn" onclick="window.__admLogout()">LOCK</button>
          <button class="adm-close-btn" onclick="window.__admClose()" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="adm-body adm-body-wide">
        <!-- STATS ROW -->
        <div class="adm-stats-row">
          <div class="adm-stat-box">
            <div class="adm-stat-label">ARG EXPOSURE</div>
            <div class="adm-stat-val" id="adm-exposure-val">${exposure}</div>
          </div>
          <div class="adm-stat-box">
            <div class="adm-stat-label">WRONGNESS</div>
            <div class="adm-stat-val" id="adm-wrongness-val">${wrongness}%</div>
          </div>
          <div class="adm-stat-box">
            <div class="adm-stat-label">DARK MODE</div>
            <div class="adm-stat-val" style="color:${isDark?'var(--green)':'var(--text3)'}">${isDark?'ON':'OFF'}</div>
          </div>
          <div class="adm-stat-box">
            <div class="adm-stat-label">NODE 09</div>
            <div class="adm-stat-val" style="color:var(--accent)">UNKNOWN</div>
          </div>
        </div>

        <!-- TWO COLUMN LAYOUT -->
        <div class="adm-cols">
          <!-- LEFT: CONTROLS -->
          <div class="adm-col">
            <div class="adm-section-title">SYSTEM CONTROLS</div>

            <div class="adm-control-row">
              <div class="adm-control-label">Dark Mode</div>
              <button class="adm-toggle-btn ${isDark?'on':''}" onclick="window.__admToggle('dark',this)">
                ${isDark?'ON':'OFF'}
              </button>
            </div>
            <div class="adm-control-row">
              <div class="adm-control-label">Minimal Mode</div>
              <button class="adm-toggle-btn ${isMinimal?'on':''}" onclick="window.__admToggle('minimal',this)">
                ${isMinimal?'ON':'OFF'}
              </button>
            </div>
            <div class="adm-control-row">
              <div class="adm-control-label">Wrongness Engine</div>
              <button class="adm-toggle-btn on" onclick="window.__admSpike(20,this)">SPIKE +20</button>
            </div>
            <div class="adm-control-row">
              <div class="adm-control-label">Force ARG Event</div>
              <select class="adm-select" id="adm-event-select">
                <option value="ghost">Ghost Cursor</option>
                <option value="text">Text Mirage</option>
                <option value="name">Station Bleed</option>
                <option value="notif">Ghost Notif</option>
                <option value="flash">Page Flash</option>
                <option value="glimmer">Glimmer</option>
              </select>
            </div>
            <div class="adm-control-row" style="margin-top:4px">
              <button class="adm-action-btn" style="width:100%" onclick="window.__admForceEvent()">▶ TRIGGER EVENT</button>
            </div>

            <div class="adm-section-title" style="margin-top:18px">SIGNAL CONTROLS</div>
            <div class="adm-control-row">
              <div class="adm-control-label">88.7 FM Status</div>
              <select class="adm-select" id="adm-887-status">
                <option>NO CARRIER</option>
                <option>CARRIER DETECTED</option>
                <option>SIGNAL_KAGE ACTIVE</option>
                <option>TRANSMITTING</option>
              </select>
            </div>
            <div class="adm-control-row">
              <button class="adm-action-btn" onclick="window.__admSet887()">UPDATE STATUS</button>
            </div>

            <div class="adm-section-title" style="margin-top:18px">DANGER ZONE</div>
            <div class="adm-control-row">
              <button class="adm-danger-btn" onclick="window.__admClearAll()">CLEAR ALL LOCAL DATA</button>
            </div>
            <div class="adm-control-row">
              <button class="adm-danger-btn" onclick="window.__admResetExposure()">RESET EXPOSURE SCORE</button>
            </div>
          </div>

          <!-- RIGHT: LOGS + STATUS -->
          <div class="adm-col">
            <div class="adm-section-title">ACTIVITY LOG</div>
            <div class="adm-log-box" id="adm-log-box">
              ${logHtml}
            </div>

            <div class="adm-section-title" style="margin-top:16px">NODE STATUS</div>
            <div class="adm-node-grid">
              ${['01','02','03','04','05','06','07','08','09'].map(n=>`
                <div class="adm-node-item">
                  <div class="adm-node-dot ${n==='09'?'unknown':n==='03'||n==='07'?'standby':'online'}"></div>
                  <div class="adm-node-label">NODE ${n}</div>
                  <div class="adm-node-status ${n==='09'?'unknown':n==='03'||n==='07'?'standby':'online'}">${n==='09'?'UNKNOWN':n==='03'||n==='07'?'STANDBY':'ONLINE'}</div>
                </div>
              `).join('')}
            </div>

            <div class="adm-section-title" style="margin-top:16px">TICKER INJECT</div>
            <div style="display:flex;gap:6px">
              <input type="text" class="adm-input" id="adm-ticker-msg" placeholder="Message to inject..." style="flex:1;font-size:0.72rem;padding:8px 10px">
              <button class="adm-action-btn" onclick="window.__admInjectTicker()">INJECT</button>
            </div>
          </div>
        </div>
      </div>
      <div class="adm-footer-bar">
        <span>SESSION: AUTHENTICATED</span>
        <span id="adm-ts">——</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(()=>{
    updateAdmClock();
    /* clock already started above */;
    // Live update stats
    setInterval(()=>{
      const ev = document.getElementById('adm-exposure-val');
      const wv = document.getElementById('adm-wrongness-val');
      if(ev) ev.textContent = window.exposure || 0;
      if(wv && window.WRONGNESS) wv.textContent = window.WRONGNESS.getIntensity().toFixed(1)+'%';
    }, 2000);
  }, 50);

  _log('DASHBOARD_OPEN');
}

// ─── ADMIN ACTIONS ────────────────────────────────────────────────────────
window.__admLogout = function(){
  _clearAuth();
  _log('LOGOUT');
  closeAdminOverlay();
  setTimeout(showAdminLogin, 100);
};

window.__admToggle = function(type, btn){
  if(type === 'dark'){
    if(typeof toggleDark === 'function') toggleDark();
    else document.body.classList.toggle('dark-mode');
    const now = document.body.classList.contains('dark-mode');
    btn.textContent = now ? 'ON' : 'OFF';
    btn.classList.toggle('on', now);
    _log('TOGGLE_DARK_' + (now?'ON':'OFF'));
  } else if(type === 'minimal'){
    if(typeof toggleMinimal === 'function') toggleMinimal();
    else document.body.classList.toggle('minimal-mode');
    const now = document.body.classList.contains('minimal-mode');
    btn.textContent = now ? 'ON' : 'OFF';
    btn.classList.toggle('on', now);
    _log('TOGGLE_MINIMAL_' + (now?'ON':'OFF'));
  }
};

window.__admSpike = function(amount, btn){
  if(window.WRONGNESS) window.WRONGNESS.spike(amount);
  _log('WRONGNESS_SPIKE_'+amount);
  btn.textContent = 'SPIKED ✓';
  setTimeout(()=>{ btn.textContent = 'SPIKE +20'; }, 1500);
};

window.__admForceEvent = function(){
  const sel = document.getElementById('adm-event-select');
  if(!sel || !window.WRONGNESS) return;
  window.WRONGNESS.forceEvent(sel.value);
  _log('FORCED_EVENT_' + sel.value.toUpperCase());
};

window.__admSet887 = function(){
  const sel = document.getElementById('adm-887-status');
  if(!sel) return;
  const status = sel.value;
  // Update ARG card
  const argStatus = document.getElementById('arg-status');
  if(argStatus){
    const statusLine = argStatus.querySelector('span[style]');
    if(statusLine) statusLine.textContent = status;
  }
  // Update signal connection box
  const scBox = document.getElementById('signal-conn-status');
  if(scBox) scBox.textContent = status;
  _log('SET_887_STATUS_' + status.replace(/\s/g,'_'));
};

window.__admClearAll = function(){
  if(!confirm('Clear ALL WNCORE local data? This cannot be undone.')) return;
  localStorage.clear();
  sessionStorage.clear();
  _log('CLEAR_ALL');
  alert('Local data cleared. Reloading...');
  window.location.reload();
};

window.__admResetExposure = function(){
  window.exposure = 0;
  localStorage.removeItem('wncore_exposure');
  _log('RESET_EXPOSURE');
  const ev = document.getElementById('adm-exposure-val');
  if(ev) ev.textContent = '0';
};

window.__admInjectTicker = function(){
  const inp = document.getElementById('adm-ticker-msg');
  if(!inp || !inp.value.trim()) return;
  const inner = document.getElementById('ticker-inner');
  if(!inner) return;
  const span = document.createElement('span');
  span.className = 't-warn';
  span.textContent = inp.value.toUpperCase();
  const sep = document.createElement('span');
  sep.className = 't-sep';
  sep.textContent = '·';
  inner.appendChild(sep);
  inner.appendChild(span);
  _log('TICKER_INJECT: ' + inp.value);
  inp.value = '';
};

// ─── STYLES ───────────────────────────────────────────────────────────────
function injectAdminStyles(){
  if(document.getElementById('adm-styles')) return;
  const s = document.createElement('style');
  s.id = 'adm-styles';
  s.textContent = `
    #wncore-admin-overlay {
      position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);
      animation:adm-fadein 0.18s ease;
    }
    @keyframes adm-fadein{from{opacity:0}to{opacity:1}}
    #adm-backdrop{position:absolute;inset:0}
    .adm-panel{
      position:relative;z-index:1;
      background:#0a0908;border:1px solid rgba(200,71,42,0.35);
      border-radius:14px;width:min(440px,94vw);max-height:90vh;overflow:hidden;
      display:flex;flex-direction:column;
      box-shadow:0 0 60px rgba(200,71,42,0.12),0 24px 64px rgba(0,0,0,0.7);
      font-family:'DM Mono',monospace;
    }
    .adm-panel-wide{width:min(820px,96vw)}
    .adm-scanlines{
      position:absolute;inset:0;pointer-events:none;z-index:0;
      background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);
      border-radius:14px;
    }
    .adm-header{
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 18px;border-bottom:1px solid rgba(200,71,42,0.2);
      background:rgba(200,71,42,0.05);position:relative;z-index:1;flex-shrink:0;
    }
    .adm-logo-mark{color:#c8472a;font-size:0.85rem;font-weight:700;letter-spacing:2px;margin-right:8px}
    .adm-logo-sub{color:rgba(255,255,255,0.35);font-size:0.6rem;letter-spacing:1px}
    .adm-close-btn,.adm-lock-btn{
      background:none;border:1px solid rgba(200,71,42,0.3);color:rgba(200,71,42,0.7);
      width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:0.7rem;
      display:flex;align-items:center;justify-content:center;transition:all 0.15s;
    }
    .adm-close-btn:hover,.adm-lock-btn:hover{background:rgba(200,71,42,0.1);color:#c8472a}
    .adm-lock-btn{width:auto;padding:0 8px;font-size:0.6rem;letter-spacing:1px}
    .adm-body{padding:20px 18px;overflow-y:auto;flex:1;position:relative;z-index:1}
    .adm-body-wide{display:grid;grid-template-rows:auto 1fr;gap:14px;padding:16px 18px}
    .adm-terminal-line{
      font-size:0.62rem;color:rgba(200,71,42,0.5);margin-bottom:6px;letter-spacing:0.5px;
    }
    .adm-login-box{margin-top:20px}
    .adm-label{display:block;font-size:0.58rem;color:rgba(255,255,255,0.3);letter-spacing:2px;margin-bottom:8px}
    .adm-input{
      width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(200,71,42,0.25);
      color:#c8472a;border-radius:7px;padding:10px 12px;font-family:'DM Mono',monospace;
      font-size:0.82rem;outline:none;transition:border-color 0.15s;letter-spacing:2px;
    }
    .adm-input:focus{border-color:rgba(200,71,42,0.6)}
    .adm-input::placeholder{color:rgba(200,71,42,0.2);letter-spacing:1px}
    .adm-submit-btn{
      width:100%;margin-top:12px;padding:11px;background:rgba(200,71,42,0.12);
      border:1px solid rgba(200,71,42,0.35);color:#c8472a;border-radius:7px;
      font-family:'DM Mono',monospace;font-size:0.75rem;letter-spacing:2px;cursor:pointer;
      transition:all 0.15s;
    }
    .adm-submit-btn:hover{background:rgba(200,71,42,0.22);border-color:rgba(200,71,42,0.6)}
    .adm-error{margin-top:10px;font-size:0.62rem;color:#c8472a;letter-spacing:1px;text-align:center}
    .adm-hint{margin-top:8px;font-size:0.6rem;color:rgba(200,71,42,0.5);letter-spacing:1px;text-align:center}
    .adm-footer-bar{
      display:flex;justify-content:space-between;padding:8px 18px;
      border-top:1px solid rgba(200,71,42,0.15);font-size:0.55rem;
      color:rgba(255,255,255,0.2);letter-spacing:0.5px;flex-shrink:0;position:relative;z-index:1;
    }
    .adm-shake{animation:adm-shake 0.4s ease}
    @keyframes adm-shake{
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-6px)}
      40%{transform:translateX(6px)}
      60%{transform:translateX(-4px)}
      80%{transform:translateX(4px)}
    }
    /* Dashboard styles */
    .adm-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
    @media(max-width:600px){.adm-stats-row{grid-template-columns:repeat(2,1fr)}}
    .adm-stat-box{
      background:rgba(255,255,255,0.03);border:1px solid rgba(200,71,42,0.15);
      border-radius:8px;padding:10px 12px;
    }
    .adm-stat-label{font-size:0.55rem;color:rgba(255,255,255,0.25);letter-spacing:1px;margin-bottom:5px}
    .adm-stat-val{font-size:1rem;font-weight:700;color:#c8472a}
    .adm-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media(max-width:600px){.adm-cols{grid-template-columns:1fr}}
    .adm-col{}
    .adm-section-title{
      font-size:0.57rem;color:rgba(200,71,42,0.6);letter-spacing:2px;
      margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid rgba(200,71,42,0.15);
    }
    .adm-control-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    .adm-control-label{font-size:0.65rem;color:rgba(255,255,255,0.4)}
    .adm-toggle-btn{
      padding:4px 12px;border-radius:4px;font-family:'DM Mono',monospace;font-size:0.62rem;
      letter-spacing:1px;cursor:pointer;border:1px solid rgba(200,71,42,0.3);
      background:rgba(200,71,42,0.06);color:rgba(200,71,42,0.5);transition:all 0.15s;white-space:nowrap;
    }
    .adm-toggle-btn.on{background:rgba(200,71,42,0.18);color:#c8472a;border-color:rgba(200,71,42,0.5)}
    .adm-select{
      flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(200,71,42,0.2);
      color:rgba(255,255,255,0.5);border-radius:5px;padding:5px 8px;font-family:'DM Mono',monospace;
      font-size:0.63rem;outline:none;max-width:160px;
    }
    .adm-action-btn{
      padding:6px 12px;background:rgba(200,71,42,0.1);border:1px solid rgba(200,71,42,0.3);
      color:#c8472a;border-radius:5px;font-family:'DM Mono',monospace;font-size:0.62rem;
      letter-spacing:1px;cursor:pointer;transition:all 0.15s;white-space:nowrap;
    }
    .adm-action-btn:hover{background:rgba(200,71,42,0.2)}
    .adm-danger-btn{
      width:100%;padding:7px;background:rgba(200,71,42,0.04);border:1px solid rgba(200,71,42,0.2);
      color:rgba(200,71,42,0.5);border-radius:5px;font-family:'DM Mono',monospace;font-size:0.62rem;
      letter-spacing:1px;cursor:pointer;transition:all 0.15s;margin-bottom:6px;
    }
    .adm-danger-btn:hover{background:rgba(200,71,42,0.15);color:#c8472a;border-color:rgba(200,71,42,0.4)}
    .adm-log-box{
      background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.05);border-radius:7px;
      padding:8px 10px;max-height:140px;overflow-y:auto;
    }
    .adm-log-row{display:flex;gap:10px;margin-bottom:5px;font-size:0.6rem}
    .adm-log-ts{color:rgba(255,255,255,0.2);flex-shrink:0}
    .adm-log-act{color:rgba(200,71,42,0.7)}
    .adm-node-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
    .adm-node-item{
      background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
      border-radius:6px;padding:7px 8px;display:flex;flex-direction:column;gap:3px;
    }
    .adm-node-dot{width:6px;height:6px;border-radius:50%;margin-bottom:2px}
    .adm-node-dot.online{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.4)}
    .adm-node-dot.standby{background:#eab308}
    .adm-node-dot.unknown{background:#c8472a;animation:pulse-dot 2s infinite}
    .adm-node-label{font-size:0.55rem;color:rgba(255,255,255,0.3)}
    .adm-node-status{font-size:0.55rem;font-weight:700}
    .adm-node-status.online{color:#22c55e}
    .adm-node-status.standby{color:#eab308}
    .adm-node-status.unknown{color:#c8472a}
  `;
  document.head.appendChild(s);
}

})();

// ─── ADMIN EXTRA FUNCTIONS ────────────────────────────────────────────────
function adminInjectTicker() {
  const input = document.getElementById('admin-ticker-inject');
  if(!input || !input.value.trim()) return;
  const msg = input.value.trim();
  
  // Inject into live ticker
  const inner = document.getElementById('ticker-inner');
  if(inner) {
    const s = document.createElement('span');
    s.className = 't-warn';
    s.textContent = ' ⚠ ' + msg.toUpperCase() + ' ⚠ ';
    s.style.cssText = 'animation: blink 1s step-end 6; color: var(--accent);';
    inner.insertBefore(s, inner.firstChild);
    inner.appendChild(s.cloneNode(true));
  }
  
  // Save via API
  adminSaveField('ticker_inject', 'admin-ticker-inject');
  input.value = '';
  
  // Show success
  input.style.borderColor = 'rgba(34,197,94,0.25)';
  setTimeout(() => input.style.borderColor = '', 2000);
}

function adminSaveFeatured(idx) {
  const nameEl = document.getElementById(`admin-feat${idx}-name`);
  const urlEl = document.getElementById(`admin-feat${idx}-url`);
  const metaEl = document.getElementById(`admin-feat${idx}-meta`);
  if(!nameEl || !urlEl) return;
  
  const data = { name: nameEl.value.trim(), url: urlEl.value.trim(), meta: metaEl?.value.trim() || '' };
  if(!data.name || !data.url) return;
  
  // Store in localStorage for now (server-side would persist to DB)
  try {
    const existing = JSON.parse(localStorage.getItem('wncore_admin_featured') || '{}');
    existing[`station_${idx}`] = data;
    localStorage.setItem('wncore_admin_featured', JSON.stringify(existing));
    [nameEl, urlEl, metaEl].filter(Boolean).forEach(el => {
      el.style.borderColor = 'rgba(34,197,94,0.25)';
      setTimeout(() => el.style.borderColor = '', 2000);
    });
  } catch(e) {}
}

// Load admin-saved featured stations on init
(function loadAdminFeatured() {
  try {
    const saved = JSON.parse(localStorage.getItem('wncore_admin_featured') || '{}');
    Object.entries(saved).forEach(([key, data]) => {
      const idx = key.replace('station_', '');
      const cards = document.querySelectorAll('.featured-card');
      const card = cards[parseInt(idx) - 1];
      if(card && data.name) {
        const nameEl = card.querySelector('.fc-name');
        const metaEl = card.querySelector('.fc-meta');
        if(nameEl) nameEl.textContent = data.name;
        if(metaEl && data.meta) metaEl.textContent = data.meta;
        if(data.url) {
          card.onclick = () => {
            if(window.playStation) window.playStation(data.url, data.name, data.meta || '', '📻');
          };
        }
      }
    });
  } catch(e) {}
})();
