// ============================================================
// WNCORE — Complete Bundle Append
// Merged: bundle_profile_append.js + bundle_listeners_append.js
//         + bundle_corruption_append.js
//
// Load order:
//   1. bundle.js  (core radio + auth)
//   2. THIS FILE  (append to end of bundle.js, or load after)
//
// Features added / fixed:
//   ✓ Profile avatar in nav (uses DiceBear, not just OAuth pic)
//   ✓ Online User List panel (nav menu → "Online Users")
//   ✓ Real + fake users mixed, both shown with pixel avatars
//   ✓ ARG pixel badges per clearance level (from /api/user)
//   ✓ Siharu visit XP logged via POST /api/user?mode=siharu_visit
//   ✓ Clearance levels derived server-side, shown in listeners panel
//   ✓ Bug: deleteAccount confirmed with "DELETE" (server expects "DELETE MY ACCOUNT")
//   ✓ Bug: _profClearAvatar onerror attr had unescaped quotes
//   ✓ Bug: listeners fetched from /api/listeners (now /api/user?mode=listeners)
//   ✓ Bug: nav avatar didn't update after saving new DiceBear avatar
//   ✓ Bug: profile page showed email initial even when DiceBear avatar set
// ============================================================

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — PROFILE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── DiceBear avatar styles ───────────────────────────────────────────────
  const DICEBEAR_STYLES = [
    { id: 'adventurer',         label: 'Adventurer',         cat: 'Illustrated' },
    { id: 'adventurer-neutral', label: 'Adventurer Neutral', cat: 'Illustrated' },
    { id: 'avataaars',          label: 'Avataaars',          cat: 'Illustrated' },
    { id: 'avataaars-neutral',  label: 'Avataaars Neutral',  cat: 'Illustrated' },
    { id: 'big-ears',           label: 'Big Ears',           cat: 'Illustrated' },
    { id: 'big-ears-neutral',   label: 'Big Ears Neutral',   cat: 'Illustrated' },
    { id: 'croodles',           label: 'Croodles',           cat: 'Illustrated' },
    { id: 'croodles-neutral',   label: 'Croodles Neutral',   cat: 'Illustrated' },
    { id: 'dylan',              label: 'Dylan',              cat: 'Illustrated' },
    { id: 'fun-emoji',          label: 'Fun Emoji',          cat: 'Illustrated' },
    { id: 'lorelei',            label: 'Lorelei',            cat: 'Illustrated' },
    { id: 'lorelei-neutral',    label: 'Lorelei Neutral',    cat: 'Illustrated' },
    { id: 'micah',              label: 'Micah',              cat: 'Illustrated' },
    { id: 'miniavs',            label: 'Mini Avs',           cat: 'Illustrated' },
    { id: 'notionists',         label: 'Notionists',         cat: 'Illustrated' },
    { id: 'notionists-neutral', label: 'Notionists Neutral', cat: 'Illustrated' },
    { id: 'open-peeps',         label: 'Open Peeps',         cat: 'Illustrated' },
    { id: 'personas',           label: 'Personas',           cat: 'Illustrated' },
    { id: 'bottts',             label: 'Bottts',             cat: 'Abstract' },
    { id: 'bottts-neutral',     label: 'Bottts Neutral',     cat: 'Abstract' },
    { id: 'identicon',          label: 'Identicon',          cat: 'Abstract' },
    { id: 'initials',           label: 'Initials',           cat: 'Abstract' },
    { id: 'rings',              label: 'Rings',              cat: 'Abstract' },
    { id: 'shapes',             label: 'Shapes',             cat: 'Abstract' },
    { id: 'thumbs',             label: 'Thumbs',             cat: 'Abstract' },
    { id: 'pixel-art',          label: 'Pixel Art',          cat: 'Pixel & Retro' },
    { id: 'pixel-art-neutral',  label: 'Pixel Art Neutral',  cat: 'Pixel & Retro' },
  ];

  const DICEBEAR_CATS = ['All', ...new Set(DICEBEAR_STYLES.map(s => s.cat))];

  function dicebearUrl(styleId, seed, size) {
    const s = encodeURIComponent(seed || 'WNCORE');
    return `https://api.dicebear.com/9.x/${styleId}/svg?seed=${s}${size ? '&size=' + size : ''}`;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  window.__WNCORE_PROFILE = null;
  let _pendingAvatarUrl   = null;

  async function _getToken() {
    const sb = await _getSupabase();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token || null;
  }

  async function fetchProfile(force) {
    if (!force && window.__WNCORE_PROFILE) return window.__WNCORE_PROFILE;
    const token = await _getToken();
    if (!token) return null;
    try {
      const r = await fetch('/api/user', { headers: { 'Authorization': 'Bearer ' + token } });
      const d = await r.json();
      if (d.profile) {
        window.__WNCORE_PROFILE = d.profile;
        if (d.profile.node_id) window.__WNCORE_NODE_ID = d.profile.node_id;
        if (d.profile.theme)   _applyThemePref(d.profile.theme);
        if (d.profile.avatar_url) localStorage.setItem('wncore_avatar_url', d.profile.avatar_url);
        _applyAvatarToNav(d.profile.avatar_url);
        _applyAvatarToModal(d.profile.avatar_url);
        return d.profile;
      }
    } catch (e) { console.warn('[WNCORE profile] fetch error', e); }
    return null;
  }

  function _applyThemePref(theme) {
    if (theme === 'dark')    { document.body.classList.add('dark');    document.body.classList.remove('light','minimal'); }
    if (theme === 'light')   { document.body.classList.add('light');   document.body.classList.remove('dark','minimal'); }
    if (theme === 'minimal') { document.body.classList.add('minimal'); }
  }

  // ── Apply profile pic to the nav button ──────────────────────────────────
  // This supplements _authUpdateNav() in bundle.js — called after profile loads
  // so the DiceBear avatar (not just the OAuth pic) shows in the nav.
  function _applyAvatarToNav(avatarUrl) {
    if (!avatarUrl) return;
    const btn = document.getElementById('nav-auth-btn');
    if (!btn || !_authUser) return;
    const name = _authUser.user_metadata?.full_name || _authUser.user_metadata?.name || _authUser.email?.split('@')[0] || '?';
    const initial = (name)[0].toUpperCase();
    btn.innerHTML = `<img src="${_esc(avatarUrl)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;display:block;" onerror="this.parentElement.textContent='${initial}'">`; 
    btn.style.cssText = 'background:transparent !important;border:2px solid var(--accent) !important;color:var(--accent) !important;padding:3px !important;border-radius:50% !important;width:32px;height:32px;display:flex;align-items:center;justify-content:center;overflow:hidden;';
    btn.onclick = function() { showPage('profile', null); };
    btn.title = name;
  }

  // ── Apply DiceBear avatar to the sign-in modal mini-card ─────────────────
  function _applyAvatarToModal(avatarUrl) {
    if (!avatarUrl) return;
    const av = document.getElementById('auth-avatar');
    if (!av) return;
    const name = _authUser?.user_metadata?.full_name || _authUser?.user_metadata?.name || _authUser?.email?.split('@')[0] || '?';
    const initial = name[0].toUpperCase();
    av.innerHTML = `<img src="${_esc(avatarUrl)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`;
  }

  // ── Save profile fields to /api/user ──────────────────────────────────────
  // BUG FIX: Function declaration was missing — only the body existed, causing
  // a syntax error that silently prevented the entire SECTION 1 IIFE from running.
  async function saveProfile(fields) {
    const token = await _getToken();
    if (!token) return { error: 'Not signed in.' };
    try {
      // volume comes from a 0-100 range slider; API validates 0.0–1.0
      if ('default_volume' in fields && typeof fields.default_volume === 'number') {
        fields = { ...fields, default_volume: fields.default_volume / 100 };
      }
      const r = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ mode: 'save_profile', ...fields })
      });
      const d = await r.json();
      if (d.profile) window.__WNCORE_PROFILE = d.profile;
      return d;
    } catch (e) { return { error: e.message }; }
  }

  async function claimNodeId(nodeId) {
    const token = await _getToken();
    if (!token) return { error: 'Not signed in.' };
    try {
      const r = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ mode: 'claim_node', node_id: nodeId })
      });
      const d = await r.json();
      if (d.profile) {
        window.__WNCORE_PROFILE = d.profile;
        if (d.profile.node_id) window.__WNCORE_NODE_ID = d.profile.node_id;
      }
      return d;
    } catch (e) { return { error: e.message }; }
  }

  async function deleteAccount() {
    const token = await _getToken();
    if (!token) return { error: 'Not signed in.' };
    try {
      const r = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        // BUG FIX: was "DELETE" — server requires "DELETE MY ACCOUNT"
        body: JSON.stringify({ mode: 'delete_account', confirm: 'DELETE MY ACCOUNT' })
      });
      return await r.json();
    } catch (e) { return { error: e.message }; }
  }

  // ── Award Siharu ARG visit XP ─────────────────────────────────────────────
  // Called when user returns from siharu.vercel.app. Server rate-limits by IP.
  window.__siharuAwardVisit = async function() {
    const token = await _getToken();
    if (!token) return null;
    try {
      const r = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ mode: 'siharu_visit' })
      });
      const d = await r.json();
      if (d.ok) {
        // Update cached profile
        if (window.__WNCORE_PROFILE) {
          window.__WNCORE_PROFILE.siharu_visits   = d.visit_count;
          window.__WNCORE_PROFILE.clearance_level = d.clearance_level;
          window.__WNCORE_PROFILE.badge_url        = d.badge_url;
        }
        // Show ARG lore toast if leveled up
        if (d.leveled_up && d.lore_signal && typeof showToast === 'function') {
          showToast(d.lore_signal, 'info', 7000);
        }
      }
      return d;
    } catch (e) { return null; }
  };

  // ── CSS ───────────────────────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById('wncore-profile-css')) return;
    const s = document.createElement('style');
    s.id = 'wncore-profile-css';
    s.textContent = `
      .prof-section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 24px;
        margin-bottom: 20px;
      }
      .prof-section-title {
        font-weight: 700;
        font-size: 1rem;
        margin-bottom: 18px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .prof-label {
        font-size: 0.7rem;
        color: var(--text3);
        letter-spacing: 1.2px;
        text-transform: uppercase;
        margin-bottom: 6px;
        font-family: 'DM Mono', monospace;
      }
      .prof-input {
        width: 100%;
        box-sizing: border-box;
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 10px 14px;
        color: var(--text);
        font-size: 0.88rem;
        font-family: 'DM Sans', sans-serif;
        outline: none;
        transition: border-color 0.15s;
      }
      .prof-input:focus { border-color: var(--accent); }
      .prof-input::placeholder { color: var(--text3); opacity: 0.6; }
      .prof-field { margin-bottom: 16px; }
      .prof-btn {
        background: var(--accent);
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 11px 22px;
        font-size: 0.85rem;
        font-weight: 600;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .prof-btn:hover { opacity: 0.85; }
      .prof-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .prof-btn-ghost {
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 11px 22px;
        font-size: 0.85rem;
        color: var(--text2);
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
      }
      .prof-btn-danger {
        background: transparent;
        border: 1px solid rgba(200,71,42,0.35);
        color: var(--accent);
        border-radius: 10px;
        padding: 11px 22px;
        font-size: 0.85rem;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
      }
      .prof-status {
        font-size: 0.75rem;
        margin-top: 8px;
        min-height: 18px;
        font-family: 'DM Mono', monospace;
      }
      .prof-status.ok  { color: #4caf50; }
      .prof-status.err { color: var(--accent); }

      /* Avatar picker */
      #prof-avatar-preview-wrap {
        display: flex; align-items: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;
      }
      #prof-avatar-big {
        width: 96px; height: 96px; border-radius: 50%;
        background: var(--surface2); border: 2px solid var(--border);
        overflow: hidden; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        transition: border-color 0.2s;
      }
      #prof-avatar-big.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(200,71,42,0.18); }
      #prof-avatar-big img { width: 100%; height: 100%; object-fit: cover; }
      .prof-avatar-meta { flex: 1; min-width: 140px; }
      .prof-avatar-style-name {
        font-size: 0.78rem; font-family: 'DM Mono', monospace;
        color: var(--text2); margin-bottom: 6px; letter-spacing: 1px;
      }
      #prof-avatar-cats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
      .prof-cat-tab {
        font-size: 0.7rem; font-family: 'DM Mono', monospace;
        letter-spacing: 1px; text-transform: uppercase;
        border: 1px solid var(--border); border-radius: 20px;
        padding: 4px 12px; cursor: pointer; color: var(--text3);
        background: transparent; transition: border-color 0.15s, color 0.15s;
      }
      .prof-cat-tab.active { border-color: var(--accent); color: var(--accent); }
      #prof-avatar-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
        gap: 8px; max-height: 320px; overflow-y: auto;
        padding: 4px 2px; scrollbar-width: thin; scrollbar-color: var(--border) transparent;
      }
      .prof-avatar-thumb {
        display: flex; flex-direction: column; align-items: center; gap: 5px;
        cursor: pointer; padding: 8px 4px; border-radius: 12px;
        border: 2px solid transparent; transition: border-color 0.15s, background 0.15s;
        background: var(--surface2);
      }
      .prof-avatar-thumb:hover { border-color: var(--border); }
      .prof-avatar-thumb.selected { border-color: var(--accent); background: rgba(200,71,42,0.08); }
      .prof-avatar-thumb img { width: 48px; height: 48px; border-radius: 50%; display: block; background: var(--surface); }
      .prof-avatar-thumb span {
        font-size: 0.55rem; color: var(--text3); text-align: center;
        font-family: 'DM Mono', monospace; letter-spacing: 0.5px; line-height: 1.2;
        max-width: 68px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      #prof-avatar-seed-row {
        display: flex; gap: 8px; align-items: center; margin-top: 14px; flex-wrap: wrap;
      }
      #prof-avatar-seed-row input { flex: 1; min-width: 120px; }
      #prof-avatar-seed-row button { white-space: nowrap; flex-shrink: 0; }

      /* Node terminal */
      #prof-node-terminal {
        background: #0a0a0a; border: 1px solid #333; border-radius: 12px;
        padding: 18px 20px; font-family: 'DM Mono', monospace; font-size: 0.78rem;
        color: #00ff88; min-height: 80px; margin-bottom: 14px; line-height: 1.7;
        white-space: pre-wrap; word-break: break-all;
      }
      .prof-node-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .prof-node-input {
        flex: 1; min-width: 180px; background: #111; border: 1px solid #333;
        color: #00ff88; font-family: 'DM Mono', monospace; font-size: 0.82rem;
        padding: 9px 14px; border-radius: 8px; outline: none;
        text-transform: uppercase; letter-spacing: 1.5px;
      }
      .prof-node-input:focus { border-color: #00ff88; }
      .prof-node-input::placeholder { color: #335544; }
      .prof-node-btn {
        background: #00ff88; color: #000; border: none; border-radius: 8px;
        padding: 9px 18px; font-family: 'DM Mono', monospace;
        font-size: 0.78rem; font-weight: 700; cursor: pointer; letter-spacing: 1px;
      }
      .prof-node-btn:hover { background: #00cc6a; }

      /* Theme pills */
      .prof-theme-pills { display: flex; gap: 10px; flex-wrap: wrap; }
      .prof-theme-pill {
        border: 1px solid var(--border); border-radius: 20px; padding: 6px 18px;
        font-size: 0.78rem; font-family: 'DM Mono', monospace; cursor: pointer;
        color: var(--text2); background: transparent; transition: border-color 0.15s, color 0.15s;
      }
      .prof-theme-pill.active { border-color: var(--accent); color: var(--accent); }

      /* Clearance badge */
      .prof-clearance-badge {
        display: inline-flex; align-items: center; font-family: 'DM Mono', monospace;
        font-size: 0.65rem; letter-spacing: 1.5px; text-transform: uppercase;
        border: 1px solid var(--border); border-radius: 20px;
        padding: 3px 12px; color: var(--text3);
      }
      .prof-clearance-badge.lvl1 { border-color: #4caf50; color: #4caf50; }
      .prof-clearance-badge.lvl2 { border-color: #ff9800; color: #ff9800; }
      .prof-clearance-badge.lvl3 { border-color: var(--accent); color: var(--accent); }
      .prof-clearance-badge.lvl4 { border-color: #cc00ff; color: #cc00ff; animation: badge-pulse 2s infinite; }
      @keyframes badge-pulse {
        0%,100% { opacity: 1; } 50% { opacity: 0.6; }
      }

      /* Pixel badge section */
      .prof-badge-wrap {
        display: flex; align-items: center; gap: 16px;
        background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px;
        padding: 16px; margin-top: 12px;
      }
      .prof-badge-img {
        width: 64px; height: 64px; border-radius: 8px;
        image-rendering: pixelated; flex-shrink: 0;
        background: #111; border: 1px solid #333;
      }
      .prof-badge-info { flex: 1; }
      .prof-badge-label {
        font-family: 'DM Mono', monospace; font-size: 0.7rem; letter-spacing: 2px;
        text-transform: uppercase; margin-bottom: 4px;
      }
      .prof-badge-label.lvl1 { color: #4caf50; }
      .prof-badge-label.lvl2 { color: #ff9800; }
      .prof-badge-label.lvl3 { color: var(--accent); }
      .prof-badge-label.lvl4 { color: #cc00ff; }
      .prof-badge-sub {
        font-size: 0.7rem; color: var(--text3); font-family: 'DM Mono', monospace;
        line-height: 1.5;
      }

      /* Delete overlay */
      #prof-delete-overlay {
        display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75);
        z-index: 9999; align-items: center; justify-content: center;
      }
      #prof-delete-overlay.show { display: flex; }
      #prof-delete-box {
        background: var(--surface); border: 1px solid rgba(200,71,42,0.4);
        border-radius: 18px; padding: 36px; max-width: 420px; width: 90%; text-align: center;
      }
    `;
    document.head.appendChild(s);
  }

  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function _setStatus(id, msg, isErr) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'prof-status ' + (isErr ? 'err' : 'ok');
    if (!isErr) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
  }

  // ── Avatar picker state ───────────────────────────────────────────────────
  let _avatarSelectedStyle = DICEBEAR_STYLES[0].id;
  let _avatarCurrentCat    = 'All';
  let _avatarSeed          = '';

  function _filteredStyles() {
    if (_avatarCurrentCat === 'All') return DICEBEAR_STYLES;
    return DICEBEAR_STYLES.filter(s => s.cat === _avatarCurrentCat);
  }

  window._profRenderAvatarGrid = function() {
    const grid = document.getElementById('prof-avatar-grid');
    if (!grid) return;
    const styles = _filteredStyles();
    grid.innerHTML = styles.map(style => {
      const url = dicebearUrl(style.id, _avatarSeed, 80);
      const sel = style.id === _avatarSelectedStyle ? 'selected' : '';
      return `<div class="prof-avatar-thumb ${sel}" onclick="_profSelectAvatar('${style.id}')" title="${style.label}">
        <img src="${_esc(url)}" alt="${style.label}" loading="lazy" width="48" height="48">
        <span>${style.label}</span>
      </div>`;
    }).join('');
  };

  window._profSelectAvatar = function(styleId) {
    _avatarSelectedStyle = styleId;
    _pendingAvatarUrl    = dicebearUrl(styleId, _avatarSeed);
    document.querySelectorAll('.prof-avatar-thumb').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('onclick')?.includes(`'${styleId}'`));
    });
    const big  = document.getElementById('prof-avatar-big');
    const name = document.getElementById('prof-avatar-style-name');
    if (big) {
      big.classList.add('selected');
      const img = big.querySelector('img');
      if (img) img.src = _pendingAvatarUrl;
    }
    const style = DICEBEAR_STYLES.find(s => s.id === styleId);
    if (name) name.textContent = style ? style.label : styleId;
  };

  window._profSwitchCat = function(cat) {
    _avatarCurrentCat = cat;
    document.querySelectorAll('.prof-cat-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === cat);
    });
    window._profRenderAvatarGrid();
    const styles = _filteredStyles();
    if (styles.length) window._profSelectAvatar(styles[0].id);
  };

  window._profRerollSeed = function() {
    const inp = document.getElementById('prof-avatar-seed-input');
    _avatarSeed = inp ? inp.value.trim() || _randomSeed() : _randomSeed();
    window._profRenderAvatarGrid();
    window._profSelectAvatar(_avatarSelectedStyle);
  };

  function _randomSeed() { return Math.random().toString(36).slice(2, 10).toUpperCase(); }

  window._profSaveAvatar = async function() {
    if (!_pendingAvatarUrl) { _setStatus('prof-avatar-status','Pick an avatar first.',true); return; }
    const btn = document.getElementById('prof-avatar-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const d = await saveProfile({ avatar_url: _pendingAvatarUrl });
    if (btn) { btn.disabled = false; btn.textContent = 'Use This Avatar'; }
    if (d.error) {
      _setStatus('prof-avatar-status', d.error, true);
    } else {
      _setStatus('prof-avatar-status', '✓ Avatar saved', false);
      localStorage.setItem('wncore_avatar_url', _pendingAvatarUrl);
      // Update profile page large avatar
      const avLg = document.getElementById('profile-avatar-lg');
      if (avLg) {
        const initial = (_authUser?.email || '?')[0].toUpperCase();
        avLg.innerHTML = `<img src="${_esc(_pendingAvatarUrl)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${_esc(initial)}'">`;
      }
      // BUG FIX: Update nav button with new DiceBear avatar immediately
      _applyAvatarToNav(_pendingAvatarUrl);
      // Also update the modal mini avatar
      _applyAvatarToModal(_pendingAvatarUrl);
      showToast('✓ Avatar updated', 'success');
    }
  };

  function _nodeTerminalText(nodeId) {
    if (!nodeId || nodeId === '—') {
      return `> SCANNING NETWORK…\n> CURRENT SESSION: ${window.__WNCORE_NODE_ID || 'NODE_UNKNOWN'}\n> STATUS: TEMPORARY — not permanently assigned\n> Claim a permanent Node ID to lock your identity into the WNCORE relay grid.`;
    }
    return `> NODE REGISTRY — PERMANENT ASSIGNMENT\n> NODE ID: ${nodeId}\n> STATUS: LOCKED ██████████ 100%\n> This node is permanently bound to your account.\n> "They know where you are. They always did."`;
  }

  // ── Clearance label map ───────────────────────────────────────────────────
  const CL_MAP   = { 0:'', 1:'lvl1', 2:'lvl2', 3:'lvl3', 4:'lvl4' };
  const CL_LABEL = {
    0: 'UNVERIFIED',
    1: 'OPERATOR',
    2: 'RELAY NODE',
    3: 'SIGNAL BREACH',
    4: 'GHOST PROTOCOL',
  };

  function _badgeSection(profile) {
    const cl       = Math.min(profile?.clearance_level || 0, 4);
    const visits   = profile?.siharu_visits || 0;
    const badgeUrl = profile?.badge_url || null;
    if (!cl || !badgeUrl) {
      // Show how to get cred
      return `
      <div class="prof-section" id="prof-cred-section">
        <div class="prof-section-title">◈ ARG Signal Cred</div>
        <div style="font-size:0.82rem;color:var(--text2);line-height:1.7;margin-bottom:12px">
          Visit <a href="https://siharu.vercel.app" target="_blank" rel="noopener"
            style="color:var(--accent);text-decoration:none"
            onclick="sessionStorage.removeItem('wncore_siharu_return_counted')">siharu.vercel.app</a>
          and return here to earn your pixel badge. Each confirmed visit increases your
          clearance level. Higher levels unlock rarer badges.
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:0.65rem;color:var(--text3);letter-spacing:1px;line-height:2">
          LVL 1 OPERATOR    — 1 visit<br>
          LVL 2 RELAY NODE  — 5 visits<br>
          LVL 3 SIGNAL BREACH — 12 visits<br>
          LVL 4 GHOST PROTOCOL — 25 visits
        </div>
      </div>`;
    }
    const labelClass = CL_MAP[cl] || '';
    const label      = CL_LABEL[cl] || 'OPERATOR';
    const nextVisits = [0, 1, 5, 12, 25];
    const nextThr    = nextVisits[cl + 1];
    const nextMsg    = nextThr
      ? `${visits}/${nextThr} visits to next level`
      : 'MAX CLEARANCE REACHED';
    return `
    <div class="prof-section" id="prof-cred-section">
      <div class="prof-section-title">◈ ARG Signal Cred <span class="prof-clearance-badge ${labelClass}">${label}</span></div>
      <div class="prof-badge-wrap">
        <img class="prof-badge-img" src="${_esc(badgeUrl)}" alt="pixel badge" width="64" height="64">
        <div class="prof-badge-info">
          <div class="prof-badge-label ${labelClass}">${label}</div>
          <div class="prof-badge-sub">
            Siharu visits confirmed: <strong style="color:var(--text)">${visits}</strong><br>
            ${nextMsg}
          </div>
        </div>
      </div>
    </div>`;
  }

  function _buildSections(profile) {
    const nodeId      = profile?.node_id        || window.__WNCORE_NODE_ID || '—';
    const callsign    = profile?.callsign        || '';
    const displayName = profile?.display_name    || '';
    const bio         = profile?.bio             || '';
    const theme       = profile?.theme           || 'dark';
    const hideEmail   = profile?.hide_email      || false;
    const clearance   = profile?.clearance_level || 0;
    const savedAvatar = profile?.avatar_url      || '';
    window.__WNCORE_SIHARU_VISITS_FROM_PROFILE = parseInt(profile?.siharu_visits || 0, 10);

    const cl = Math.min(clearance, 4);
    const catsHtml = DICEBEAR_CATS.map(c =>
      `<button class="prof-cat-tab${c==='All'?' active':''}" data-cat="${c}" onclick="_profSwitchCat('${c}')">${c}</button>`
    ).join('');

    const bigSrc = savedAvatar || dicebearUrl(DICEBEAR_STYLES[0].id, _avatarSeed);

    return `
    <!-- SIGNAL INTEGRITY — populated by Section 3 corruption system -->
    <div id="prof-signal-integrity" class="sig-stage${Math.min((function(v){return v>=25?4:v>=12?3:v>=5?2:v>=1?1:0;})(window.__WNCORE_SIHARU_VISITS_FROM_PROFILE || 0), 4)}"></div>

    <!-- AVATAR -->
    <div class="prof-section" id="prof-avatar-section">
      <div class="prof-section-title">◈ Profile Picture</div>
      <div id="prof-avatar-preview-wrap">
        <div id="prof-avatar-big" class="${savedAvatar?'selected':''}">
          <img src="${_esc(bigSrc)}" alt="avatar preview" width="96" height="96">
        </div>
        <div class="prof-avatar-meta">
          <div class="prof-label">Selected style</div>
          <div class="prof-avatar-style-name" id="prof-avatar-style-name">${DICEBEAR_STYLES[0].label}</div>
          <div style="font-size:0.75rem;color:var(--text3);line-height:1.5;margin-bottom:10px">
            Browse styles below. Avatars are generated — no image upload needed.
          </div>
          <button class="prof-btn" id="prof-avatar-save-btn" onclick="_profSaveAvatar()">Use This Avatar</button>
          ${savedAvatar ? `<button class="prof-btn-ghost" style="margin-left:8px;padding:10px 16px;font-size:0.8rem" onclick="_profClearAvatar()">Clear (use OAuth pic)</button>` : ''}
        </div>
      </div>
      <div id="prof-avatar-cats">${catsHtml}</div>
      <div id="prof-avatar-grid"></div>
      <div id="prof-avatar-seed-row">
        <div class="prof-label" style="margin:0;white-space:nowrap;align-self:center">Seed (shapes variation):</div>
        <input class="prof-input" id="prof-avatar-seed-input" placeholder="any text changes the look…"
          value="${_esc(_avatarSeed)}" style="font-family:'DM Mono',monospace;font-size:0.8rem">
        <button class="prof-btn-ghost" onclick="_profRerollSeed()" style="padding:9px 16px;font-size:0.8rem">🎲 Reroll</button>
      </div>
      <div class="prof-status" id="prof-avatar-status"></div>
    </div>

    <!-- IDENTITY -->
    <div class="prof-section" id="prof-identity-section">
      <div class="prof-section-title">
        ◉ Identity
        <span class="prof-clearance-badge ${CL_MAP[cl]}">${CL_LABEL[cl]}</span>
      </div>
      <div class="prof-field">
        <div class="prof-label">Display Name</div>
        <input class="prof-input" id="prof-input-displayname" maxlength="32"
          placeholder="Override your sign-in name…" value="${_esc(displayName)}">
      </div>
      <div class="prof-field">
        <div class="prof-label">Signal Callsign <span style="color:var(--text3);font-size:0.65rem">(3–12 chars · ARG handle)</span></div>
        <input class="prof-input" id="prof-input-callsign" maxlength="12"
          placeholder="e.g. RELAY_7, VOID_X…" value="${_esc(callsign)}"
          style="text-transform:uppercase;letter-spacing:1.5px;font-family:'DM Mono',monospace"
          oninput="this.value=this.value.toUpperCase()">
      </div>
      <div class="prof-field">
        <div class="prof-label">Bio / Tagline <span style="color:var(--text3);font-size:0.65rem">(max 160 chars)</span></div>
        <textarea class="prof-input" id="prof-input-bio" maxlength="160"
          rows="2" placeholder="Describe your signal…" style="resize:vertical">${_esc(bio)}</textarea>
      </div>
      <div class="prof-field" style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="prof-check-hideemail" ${hideEmail?'checked':''}
          style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
        <label for="prof-check-hideemail" style="font-size:0.82rem;color:var(--text2);cursor:pointer">
          Hide email from profile display
        </label>
      </div>
      <div style="margin-top:4px">
        <button class="prof-btn" onclick="_profSaveIdentity()">Save Identity</button>
        <span class="prof-status" id="prof-identity-status"></span>
      </div>
    </div>

    <!-- ARG CRED / BADGE -->
    ${_badgeSection(profile)}

    <!-- NODE TERMINAL -->
    <div class="prof-section" id="prof-node-section">
      <div class="prof-section-title">⬡ Permanent Node ID</div>
      <div id="prof-node-terminal">${_nodeTerminalText(nodeId)}</div>
      ${(nodeId && nodeId !== '—')
        ? `<div style="font-size:0.75rem;color:var(--text3);font-family:'DM Mono',monospace;letter-spacing:1px">Node locked. Permanent assignment confirmed.</div>`
        : `<div class="prof-node-row">
            <input class="prof-node-input" id="prof-node-input" maxlength="13"
              placeholder="NODE_XXXXXX" oninput="this.value=this.value.toUpperCase()">
            <button class="prof-node-btn" onclick="_profClaimNode()">CLAIM</button>
          </div>
          <div class="prof-status" id="prof-node-status" style="color:#00ff88"></div>
          <div style="font-size:0.7rem;color:var(--text3);font-family:'DM Mono',monospace;margin-top:10px;line-height:1.6">
            Format: NODE_ + 6 alphanumeric characters. Once claimed, permanent.
          </div>`
      }
    </div>

    <!-- PREFERENCES -->
    <div class="prof-section" id="prof-prefs-section">
      <div class="prof-section-title">◈ Preferences</div>
      <div class="prof-field">
        <div class="prof-label">Theme</div>
        <div class="prof-theme-pills">
          <button class="prof-theme-pill${theme==='dark'   ?' active':''}" id="prof-theme-dark"    onclick="_profThemePick('dark')">Dark</button>
          <button class="prof-theme-pill${theme==='light'  ?' active':''}" id="prof-theme-light"   onclick="_profThemePick('light')">Light</button>
          <button class="prof-theme-pill${theme==='minimal'?' active':''}" id="prof-theme-minimal" onclick="_profThemePick('minimal')">Minimal</button>
        </div>
      </div>
      <div class="prof-field">
        <div class="prof-label">Default Volume <span id="prof-vol-label" style="color:var(--accent)">${Math.round((profile?.default_volume ?? 0.8) * 100)}%</span></div>
        <input type="range" id="prof-input-volume" min="0" max="100"
          value="${Math.round((profile?.default_volume ?? 0.8) * 100)}"
          oninput="document.getElementById('prof-vol-label').textContent=this.value+'%'"
          style="width:100%;accent-color:var(--accent);cursor:pointer">
      </div>
      <div class="prof-field">
        <div class="prof-label">Favourite Genre Tags <span style="color:var(--text3);font-size:0.65rem">(comma-separated)</span></div>
        <input class="prof-input" id="prof-input-genres" maxlength="120"
          placeholder="e.g. ambient, drone, shortwave…"
          value="${_esc((profile?.genre_tags||[]).join(', '))}">
      </div>
      <button class="prof-btn" onclick="_profSavePrefs()">Save Preferences</button>
      <span class="prof-status" id="prof-prefs-status"></span>
    </div>

    <!-- DANGER ZONE -->
    <div class="prof-section" id="prof-danger-section">
      <div class="prof-section-title" style="color:var(--accent)">⚠ Danger Zone</div>
      <div style="font-size:0.82rem;color:var(--text2);margin-bottom:16px;line-height:1.6">
        Permanently deletes your account, profile data, and all saved favourites. This cannot be undone.
      </div>
      <button class="prof-btn-danger" onclick="_profOpenDelete()">Delete Account</button>
    </div>

    <!-- DELETE OVERLAY -->
    <div id="prof-delete-overlay">
      <div id="prof-delete-box">
        <div style="font-size:1.5rem;margin-bottom:12px;color:var(--accent)">⚠</div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:8px">Delete your account?</div>
        <div style="font-size:0.8rem;color:var(--text3);margin-bottom:20px;line-height:1.6">
          Type <strong style="color:var(--accent);font-family:'DM Mono',monospace">DELETE MY ACCOUNT</strong> to confirm. This is permanent.
        </div>
        <input class="prof-input" id="prof-delete-confirm-input"
          placeholder="Type DELETE MY ACCOUNT to confirm" style="margin-bottom:16px;text-align:center">
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="prof-btn-danger" onclick="_profConfirmDelete()" id="prof-delete-confirm-btn">Delete Forever</button>
          <button class="prof-btn-ghost"  onclick="_profCloseDelete()">Cancel</button>
        </div>
        <div class="prof-status err" id="prof-delete-status" style="margin-top:10px"></div>
      </div>
    </div>
    `;
  }

  // ── Interactive handlers ──────────────────────────────────────────────────

  window._profThemePick = function(theme) {
    ['dark','light','minimal'].forEach(t => {
      const el = document.getElementById('prof-theme-' + t);
      if (el) el.classList.toggle('active', t === theme);
    });
  };

  window._profSaveIdentity = async function() {
    const displayName = (document.getElementById('prof-input-displayname')?.value || '').trim();
    const callsign    = (document.getElementById('prof-input-callsign')?.value    || '').trim();
    const bio         = (document.getElementById('prof-input-bio')?.value         || '').trim();
    const hideEmail   =  document.getElementById('prof-check-hideemail')?.checked || false;
    const btn = document.querySelector('#prof-identity-section .prof-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const d = await saveProfile({ display_name: displayName, callsign, bio, hide_email: hideEmail });
    if (btn) { btn.disabled = false; btn.textContent = 'Save Identity'; }
    if (d.error) {
      _setStatus('prof-identity-status', d.error, true);
    } else {
      _setStatus('prof-identity-status', '✓ Identity saved', false);
      if (displayName) {
        const dn = document.getElementById('profile-display-name');
        if (dn) dn.textContent = displayName;
      }
      showToast('✓ Profile updated', 'success');
    }
  };

  window._profSavePrefs = async function() {
    const theme  = document.querySelector('.prof-theme-pill.active')?.id?.replace('prof-theme-','') || 'dark';
    const volume = parseInt(document.getElementById('prof-input-volume')?.value || '80', 10);
    const genres = (document.getElementById('prof-input-genres')?.value || '').split(',').map(g=>g.trim()).filter(Boolean);
    const btn = document.querySelector('#prof-prefs-section .prof-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const d = await saveProfile({ theme, default_volume: volume, genre_tags: genres });
    if (btn) { btn.disabled = false; btn.textContent = 'Save Preferences'; }
    if (d.error) { _setStatus('prof-prefs-status', d.error, true); }
    else { _setStatus('prof-prefs-status', '✓ Preferences saved', false); _applyThemePref(theme); showToast('✓ Preferences saved', 'success'); }
  };

  window._profClearAvatar = async function() {
    const d = await saveProfile({ avatar_url: '' });
    if (!d.error) {
      _pendingAvatarUrl = null;
      localStorage.removeItem('wncore_avatar_url');
      const user = _authUser;
      const oauthAv = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
      // BUG FIX: Safe initial — not injected into onerror attribute with raw quotes
      const initial  = _esc((user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase());
      const avLg = document.getElementById('profile-avatar-lg');
      if (avLg) {
        avLg.innerHTML = oauthAv
          ? `<img src="${_esc(oauthAv)}" style="width:100%;height:100%;object-fit:cover;">`
          : initial;
      }
      // Also restore nav button to OAuth or initial
      const btn = document.getElementById('nav-auth-btn');
      if (btn && user) {
        if (oauthAv) {
          btn.innerHTML = `<img src="${_esc(oauthAv)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;display:block;">`;
        } else {
          btn.textContent = initial;
        }
      }
      showToast('Avatar cleared', 'info');
    }
  };

  window._profClaimNode = async function() {
    const raw = (document.getElementById('prof-node-input')?.value || '').trim().toUpperCase();
    if (!raw) return;
    const terminal = document.getElementById('prof-node-terminal');
    if (terminal) terminal.textContent = `> ATTEMPTING TO CLAIM: ${raw}\n> QUERYING REGISTRY…`;
    const d = await claimNodeId(raw);
    if (d.error) {
      const errMap = { 'NODE_TAKEN': 'NODE ID ALREADY CLAIMED. Try another.' };
      const msg = errMap[d.error] || d.error;
      if (terminal) terminal.textContent = `> CLAIM FAILED\n> REASON: ${msg}\n> `;
      _setStatus('prof-node-status', '✗ ' + msg, true);
    } else {
      const claimed = d.profile?.node_id || raw;
      if (terminal) terminal.textContent = _nodeTerminalText(claimed);
      const section = document.getElementById('prof-node-section');
      if (section) {
        section.querySelector('.prof-node-row')?.remove();
        section.querySelector('[style*="Format:"]')?.remove();
        document.getElementById('prof-node-status')?.remove();
        const locked = document.createElement('div');
        locked.style.cssText = "font-size:0.75rem;color:#00ff88;font-family:'DM Mono',monospace;letter-spacing:1px;margin-top:12px";
        locked.textContent = 'Node locked. Permanent assignment confirmed.';
        section.appendChild(locked);
      }
      showToast('✓ Node ID claimed: ' + claimed, 'success', 5000);
    }
  };

  window._profOpenDelete  = function() {
    const ov = document.getElementById('prof-delete-overlay');
    if (ov) ov.classList.add('show');
    const inp = document.getElementById('prof-delete-confirm-input');
    if (inp) { inp.value = ''; inp.focus(); }
    _setStatus('prof-delete-status', '', false);
  };
  window._profCloseDelete = function() {
    document.getElementById('prof-delete-overlay')?.classList.remove('show');
  };
  window._profConfirmDelete = async function() {
    // BUG FIX: was checking for "DELETE" but server requires "DELETE MY ACCOUNT"
    const inp = (document.getElementById('prof-delete-confirm-input')?.value || '').trim();
    if (inp !== 'DELETE MY ACCOUNT') { _setStatus('prof-delete-status', 'You must type DELETE MY ACCOUNT exactly.', true); return; }
    const btn = document.getElementById('prof-delete-confirm-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }
    const d = await deleteAccount();
    if (d.error) {
      _setStatus('prof-delete-status', d.error, true);
      if (btn) { btn.disabled = false; btn.textContent = 'Delete Forever'; }
    } else {
      window._profCloseDelete();
      window.__WNCORE_PROFILE = null;
      showToast('Account deleted.', 'info', 5000);
      const sb = await _getSupabase();
      if (sb) await sb.auth.signOut();
      if (typeof showPage === 'function') showPage('home', null);
    }
  };

  const INJECTED_IDS = [
    'prof-signal-integrity',
    'prof-avatar-section','prof-identity-section','prof-cred-section',
    'prof-node-section','prof-prefs-section','prof-danger-section','prof-delete-overlay'
  ];

  async function _injectSections(profile) {
    const page = document.getElementById('page-profile');
    if (!page) return;
    INJECTED_IDS.forEach(id => document.getElementById(id)?.remove());

    const wrapper = page.querySelector('div[style*="max-width:860px"]');
    if (!wrapper) return;

    const user = _authUser;
    _avatarSeed = (profile?.avatar_seed) || (user?.email?.split('@')[0] || _randomSeed());

    if (profile?.avatar_url && profile.avatar_url.includes('dicebear')) {
      _pendingAvatarUrl = profile.avatar_url;
      const m = profile.avatar_url.match(/9\.x\/([^/]+)\//);
      if (m) _avatarSelectedStyle = m[1];
    }

    const acctSection = wrapper.querySelector('div:last-child');
    const tmp = document.createElement('div');
    tmp.innerHTML = _buildSections(profile);
    while (tmp.firstChild) wrapper.insertBefore(tmp.firstChild, acctSection);

    window._profRenderAvatarGrid();
    const seedInp = document.getElementById('prof-avatar-seed-input');
    if (seedInp) seedInp.value = _avatarSeed;
    window._profSelectAvatar(_avatarSelectedStyle);
  }

  const _origLoadProfilePage = window.loadProfilePage || function(){};
  window.loadProfilePage = async function() {
    _origLoadProfilePage();
    if (!_authUser) return;
    _injectCSS();
    INJECTED_IDS.forEach(id => document.getElementById(id)?.remove());

    const profile = await fetchProfile(true);
    await _injectSections(profile);

    if (profile?.display_name) {
      const dn = document.getElementById('profile-display-name');
      if (dn) dn.textContent = profile.display_name;
    }
    if (profile?.avatar_url) {
      const avLg = document.getElementById('profile-avatar-lg');
      if (avLg) {
        const initial = _esc((profile.display_name || _authUser.email || '?')[0].toUpperCase());
        avLg.innerHTML = `<img src="${_esc(profile.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`;
      }
      // BUG FIX: also apply to nav when profile page opens
      _applyAvatarToNav(profile.avatar_url);
    }
    if (profile?.hide_email) {
      const de = document.getElementById('profile-display-email');
      if (de) de.textContent = '••••@••••';
    }
  };

  document.addEventListener('DOMContentLoaded', async function() {
    if (typeof _authUser !== 'undefined' && _authUser) {
      fetchProfile(false).catch(() => {});
    }
    const sb = await _getSupabase().catch(() => null);
    if (sb) {
      sb.auth.onAuthStateChange((_ev, session) => {
        if (session?.user) {
          window.__WNCORE_PROFILE = null;
          fetchProfile(false).catch(() => {});
        } else {
          window.__WNCORE_PROFILE = null;
        }
      });
    }
  });

})();


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — ONLINE USER LIST (Who's Listening panel + nav entry)
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────────────────
  const CSS = `
  /* Nav trigger */
  .listeners-nav-btn {
    display: flex; align-items: center; gap: 6px;
    background: transparent; border: 1px solid var(--border);
    border-radius: 20px; padding: 5px 12px; cursor: pointer;
    font-family: 'DM Mono', monospace; font-size: 0.6rem;
    font-weight: 600; letter-spacing: 1.5px; color: var(--text2);
    transition: border-color 0.15s, color 0.15s; white-space: nowrap;
  }
  .listeners-nav-btn:hover { border-color: #16a34a; color: #16a34a; }
  .listeners-btn-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #16a34a; animation: listeners-pulse 2s infinite; flex-shrink: 0;
  }
  @keyframes listeners-pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.5; transform: scale(0.8); }
  }

  /* Backdrop */
  .listeners-backdrop {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.4); z-index: 1200; backdrop-filter: blur(2px);
  }
  .listeners-backdrop.open { display: block; }

  /* Panel */
  .listeners-panel {
    position: fixed; top: 0; right: 0; bottom: 0; width: 320px;
    max-width: 92vw; background: var(--surface);
    border-left: 1px solid var(--border); z-index: 1201;
    display: flex; flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden;
  }
  .listeners-panel.open { transform: translateX(0); }

  /* Header */
  .listeners-panel-header {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 18px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .listeners-panel-title {
    display: flex; align-items: center; gap: 7px;
    font-family: 'DM Mono', monospace; font-size: 0.65rem;
    font-weight: 600; letter-spacing: 2px; color: var(--text2); flex: 1;
  }
  .listeners-panel-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #16a34a;
    animation: listeners-pulse 2s infinite; flex-shrink: 0;
  }
  .listeners-panel-count {
    font-family: 'DM Mono', monospace; font-size: 0.68rem;
    color: #16a34a; letter-spacing: 0.5px; white-space: nowrap;
  }
  .listeners-panel-close {
    background: none; border: none; cursor: pointer;
    color: var(--text3); font-size: 0.9rem; padding: 2px 6px;
    border-radius: 4px; line-height: 1; transition: color 0.1s;
  }
  .listeners-panel-close:hover { color: var(--text); }

  /* List */
  .listeners-list {
    flex: 1; overflow-y: auto; padding: 10px 0;
    scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  }
  .listeners-loading {
    padding: 32px 18px; font-family: 'DM Mono', monospace;
    font-size: 0.72rem; color: var(--text3); text-align: center;
  }

  /* User row */
  .listener-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 18px; transition: background 0.1s; cursor: default;
  }
  .listener-row:hover { background: var(--surface2); }

  .listener-avatar {
    width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
    overflow: hidden; background: var(--surface2);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.85rem; font-weight: 700; font-family: 'DM Mono', monospace;
    color: var(--text2); border: 1px solid var(--border); position: relative;
  }
  .listener-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .listener-avatar.real { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(200,71,42,0.3); }
  .listener-avatar.tainted { border-color: #8b3030; box-shadow: 0 0 0 1px rgba(139,48,48,0.4); }
  .listener-avatar.ghost { border-color: #cc00ff; box-shadow: 0 0 0 1px rgba(204,0,255,0.3); animation: ghost-border 2s infinite; }
  @keyframes ghost-border { 0%,100% { box-shadow: 0 0 0 1px rgba(204,0,255,0.3); } 50% { box-shadow: 0 0 0 2px rgba(204,0,255,0.6); } }

  .listener-info { flex: 1; min-width: 0; }
  .listener-name {
    font-size: 0.8rem; font-weight: 600; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
  }
  .listener-name.fake-name { color: var(--text2); }
  .listener-sub {
    font-family: 'DM Mono', monospace; font-size: 0.6rem; color: var(--text3);
    letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* Badges */
  .listener-badge {
    font-family: 'DM Mono', monospace; font-size: 0.52rem; letter-spacing: 1px;
    padding: 2px 6px; border-radius: 3px; font-weight: 700; white-space: nowrap; flex-shrink: 0;
  }
  .listener-badge.cred { background: rgba(200,71,42,0.12); color: var(--accent); border: 1px solid rgba(200,71,42,0.25); }
  .listener-badge.cred-2 { background: rgba(255,152,0,0.12); color: #ff9800; border: 1px solid rgba(255,152,0,0.3); }
  .listener-badge.cred-3 { background: rgba(200,71,42,0.12); color: var(--accent); border: 1px solid rgba(200,71,42,0.3); }
  .listener-badge.cred-4 { background: rgba(204,0,255,0.12); color: #cc00ff; border: 1px solid rgba(204,0,255,0.3); animation: ghost-badge 2.5s infinite; }
  @keyframes ghost-badge { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .listener-badge.tainted-badge { background: rgba(139,48,48,0.15); color: #c05050; border: 1px solid rgba(139,48,48,0.3); animation: tainted-flicker 4s infinite; }
  @keyframes tainted-flicker { 0%,90%,100% { opacity: 1; } 92% { opacity: 0.3; } 94% { opacity: 1; } 97% { opacity: 0.5; } }

  /* Pixel badge mini (beside avatar) */
  .listener-pixel-badge {
    width: 18px; height: 18px; border-radius: 3px;
    image-rendering: pixelated; flex-shrink: 0;
    background: #111; border: 1px solid #333; margin-left: -8px; z-index: 1;
    position: relative; bottom: -10px; right: 0;
  }

  /* Fake name glitch */
  @keyframes fake-name-glitch {
    0%,88%,100% { opacity: 1; filter: none; transform: none; }
    90%          { opacity: 0.4; filter: hue-rotate(90deg); transform: translateX(-1px); }
    92%          { opacity: 1; filter: none; transform: none; }
    96%          { opacity: 0.6; transform: translateX(1px); }
    98%          { opacity: 1; transform: none; }
  }
  .listener-name.glitching {
    animation: fake-name-glitch 4s infinite;
    animation-delay: var(--glitch-delay, 0s);
  }

  .listeners-divider {
    padding: 6px 18px 2px; font-family: 'DM Mono', monospace;
    font-size: 0.55rem; letter-spacing: 2px; color: var(--text3);
    border-top: 1px solid var(--border); margin-top: 4px;
  }
  .listener-station { color: var(--text3); }

  /* Mini profile card */
  .listener-card-overlay {
    display: none; position: fixed; inset: 0; z-index: 1202;
    background: rgba(0,0,0,0.3); backdrop-filter: blur(2px);
  }
  .listener-card-overlay.open { display: block; }
  .listener-card {
    position: fixed; bottom: 0; left: 0; right: 0; max-width: 100%;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 20px 20px 0 0; padding: 24px; z-index: 1203;
    transform: translateY(100%); transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex; flex-direction: column; gap: 16px;
  }
  .listener-card.open { transform: translateY(0); }
  .listener-card-header {
    display: flex; align-items: flex-start; gap: 16px;
    padding-bottom: 16px; border-bottom: 1px solid var(--border);
  }
  .listener-card-avatar {
    width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;
    overflow: hidden; background: var(--surface2); display: flex;
    align-items: center; justify-content: center; font-size: 1.4rem;
    font-weight: 700; border: 2px solid var(--border); position: relative;
  }
  .listener-card-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .listener-card-avatar.real { border-color: var(--accent); }
  .listener-card-avatar.ghost { border-color: #cc00ff; }
  .listener-card-pixel-badge {
    width: 28px; height: 28px; border-radius: 4px; image-rendering: pixelated;
    position: absolute; bottom: -4px; right: -4px;
    background: var(--surface2); border: 2px solid var(--border);
  }
  .listener-card-info { flex: 1; }
  .listener-card-name {
    font-size: 1.1rem; font-weight: 700; color: var(--text);
    margin-bottom: 4px;
  }
  .listener-card-nodeid {
    font-family: 'DM Mono', monospace; font-size: 0.72rem;
    color: var(--text3); letter-spacing: 1px; margin-bottom: 10px;
  }
  .listener-card-badges {
    display: flex; gap: 6px; flex-wrap: wrap;
  }
  .listener-card-badge {
    font-family: 'DM Mono', monospace; font-size: 0.6rem; letter-spacing: 0.5px;
    padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border);
  }
  .listener-card-badge.cred { background: rgba(200,71,42,0.12); color: var(--accent); border-color: rgba(200,71,42,0.3); }
  .listener-card-badge.cred-2 { background: rgba(255,152,0,0.12); color: #ff9800; border-color: rgba(255,152,0,0.3); }
  .listener-card-badge.cred-3 { background: rgba(200,71,42,0.12); color: var(--accent); border-color: rgba(200,71,42,0.3); }
  .listener-card-badge.cred-4 { background: rgba(204,0,255,0.12); color: #cc00ff; border-color: rgba(204,0,255,0.3); }
  .listener-card-station {
    font-size: 0.82rem; color: var(--text2);
    padding-top: 12px; border-top: 1px solid var(--border);
  }
  .listener-card-station-label {
    font-family: 'DM Mono', monospace; font-size: 0.62rem;
    color: var(--text3); letter-spacing: 1px; margin-bottom: 4px;
  }
  .listener-card-station-value {
    font-size: 0.88rem; color: var(--text);
  }
  .listener-card-close {
    align-self: center; margin-top: 8px; padding: 8px 16px;
    background: transparent; border: 1px solid var(--border);
    border-radius: 10px; color: var(--text2); cursor: pointer;
    font-size: 0.75rem; font-family: 'DM Mono', monospace;
    transition: all 0.15s;
  }
  .listener-card-close:hover { border-color: var(--accent); color: var(--accent); }

  /* FIX: Mobile — pad card bottom so content clears player bar + bottom nav */
  @media (max-width: 768px) {
    .listener-card {
      padding-bottom: calc(var(--player-h, 68px) + 56px + env(safe-area-inset-bottom, 0px) + 16px);
    }
  }

  /* Hide desktop nav ONLINE button on mobile — mobile nav drawer already has one */
  @media (max-width: 768px) {
    #listeners-nav-trigger { display: none !important; }
  }

  /* iOS: prevent momentum scroll bleed-through on backdrops */
  .listeners-backdrop.open,
  .listener-card-overlay.open {
    touch-action: none;
    -webkit-overflow-scrolling: auto;
  }
  `;

  let _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected) return;
    _cssInjected = true;
    const s = document.createElement('style');
    s.id = 'wncore-listeners-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Fake user data ────────────────────────────────────────────────────────
  const FAKE_FIRST = [
    'mira','sol','axl','coda','rev','lyra','dec','echo','nox','fen',
    'sable','roan','vex','halo','crest','zola','arlo','ines','pax','brix',
    'seren','quill','dusk','thane','ori','kael','wren','mars','nova','zenn',
    'pike','elio','tav','clio','dray','hex','omi','rael','siv','lyko',
    'vesper','dawn','cade','sloane','rift','pell','zer0','kai','wyre','ash',
  ];
  const FAKE_SUFFIX = [
    '_09','_rx','_hz','__','_net','.wav','-lo','_off','_tx','_zero',
    '_fm','_core','_db','_mod','_sub','_lo','_signal','_wave','_null','_ghost',
    '_relay','_node','_static','_freq','_band',
  ];
  const FAKE_LOCATIONS = [
    'Tokyo, JP','London, UK','Berlin, DE','Seoul, KR','Lagos, NG',
    'Buenos Aires, AR','Cairo, EG','Toronto, CA','Mumbai, IN','Oslo, NO',
    'Nairobi, KE','Manila, PH','Jakarta, ID','Warsaw, PL','Dhaka, BD',
    'São Paulo, BR','Dubai, UAE','Stockholm, SE','Athens, GR','Lisbon, PT',
    'Amsterdam, NL','Taipei, TW','Bogotá, CO','Kyoto, JP','Accra, GH',
  ];
  const FAKE_STATIONS = [
    'NTS Radio','FIP','KEXP','Radio Nova','NHK World','SomaFM: Groove Salad',
    'Rinse FM','Red Light Radio','Worldwide FM','Radio Garden','dublab',
    'The Jazz Groove','Resonance FM','WFMU','Café de Paris Radio',
    'Noods Radio','The Lot Radio','Cashmere Radio','Radio Raheem','RBMA Radio',
  ];
  const FAKE_DICEBEAR_STYLES = ['bottts','identicon','rings','shapes','thumbs','pixel-art-neutral'];

  function _fakeName() {
    const first = FAKE_FIRST[Math.floor(Math.random() * FAKE_FIRST.length)];
    const suf   = FAKE_SUFFIX[Math.floor(Math.random() * FAKE_SUFFIX.length)];
    return first + suf;
  }
  function _fakeSeed() { return Math.random().toString(36).slice(2, 9); }
  function _fakeAvatarUrl() {
    const style = FAKE_DICEBEAR_STYLES[Math.floor(Math.random() * FAKE_DICEBEAR_STYLES.length)];
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${_fakeSeed()}`;
  }
  function _fakeLocation() { return FAKE_LOCATIONS[Math.floor(Math.random() * FAKE_LOCATIONS.length)]; }
  function _fakeStation()  { return FAKE_STATIONS[Math.floor(Math.random() * FAKE_STATIONS.length)]; }

  // Safe HTML escape (use profile system's if available)
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let _panelOpen   = false;
  let _realUsers   = [];
  let _fakePool    = [];
  let _displayList = [];
  let _rotateTimer = null;
  let _fetchedOnce = false;
  let _selectedCardIdx = null;

  function _buildFakePool(count) {
    const pool = [];
    for (let i = 0; i < count; i++) {
      pool.push({
        fake:         true,
        display_name: _fakeName(),
        avatar_url:   _fakeAvatarUrl(),
        location:     _fakeLocation(),
        station:      _fakeStation(),
        glitch_delay: (Math.random() * 8).toFixed(1) + 's',
      });
    }
    return pool;
  }

  // BUG FIX: Was fetching /api/listeners — now unified into /api/user?mode=listeners
  async function _fetchRealUsers() {
    try {
      const r = await fetch('/api/user?mode=listeners');
      if (!r.ok) return [];
      const d = await r.json();
      return d.users || [];
    } catch { return []; }
  }

  function _buildDisplayList() {
    const MAX  = 30;
    const real = _realUsers.map(u => ({ ...u, fake: false }));
    const fakeNeeded = Math.max(0, Math.min(MAX - real.length, _fakePool.length));
    const shuffled = [..._fakePool].sort(() => Math.random() - 0.5).slice(0, fakeNeeded);
    const combined = [...shuffled];
    real.forEach(u => {
      const pos = Math.floor(Math.random() * (combined.length + 1));
      combined.splice(pos, 0, u);
    });
    return combined.slice(0, MAX);
  }

  function _credBadgeClass(cl) {
    return ['','cred','cred-2','cred-3','cred-4'][cl] || 'cred';
  }
  function _credLabel(cl) {
    return ['','OP LVL.1','RELAY LVL.2','BREACH LVL.3','GHOST'][cl] || `LVL.${cl}`;
  }

  function _renderList() {
    const el = document.getElementById('listeners-list');
    if (!el) return;

    const liveEl  = document.getElementById('live-count');
    const countEl = document.getElementById('listeners-panel-count');
    if (countEl && liveEl) {
      countEl.textContent = liveEl.textContent.replace('live', 'online');
    }

    // WRONGNESS integration — random spike on render
    if (typeof window.WRONGNESS !== 'undefined' && window.WRONGNESS?.spike && Math.random() < 0.15) {
      window.WRONGNESS.spike(2);
    }

    if (!_displayList.length) {
      el.innerHTML = '<div class="listeners-loading">No signal detected.</div>';
      return;
    }

    const rows = _displayList.map((u, idx) => {
      const isReal  = !u.fake;
      const tainted = isReal && u.tainted;
      const cl      = isReal ? (u.clearance_level || 0) : 0;
      const nodeId  = isReal && u.node_id ? u.node_id : null;
      const badgeUrl = isReal && u.badge_url ? u.badge_url : null;

      const initial     = (u.display_name || '?')[0].toUpperCase();
      let avatarClass   = 'listener-avatar';
      if (isReal) {
        if (cl >= 4) avatarClass += ' ghost';
        else if (tainted) avatarClass += ' real tainted';
        else avatarClass += ' real';
      }

      const avatarInner = u.avatar_url
        ? `<img src="${_esc(u.avatar_url)}" alt="" loading="lazy" onerror="this.style.display='none'">${initial}`
        : initial;

      const nameClass   = isReal ? 'listener-name' : `listener-name fake-name glitching`;
      const glitchStyle = u.fake ? ` style="--glitch-delay:${u.glitch_delay}"` : '';

      let sub = '';
      if (isReal && nodeId) sub = nodeId;
      else if (isReal)      sub = 'verified node';
      else                  sub = `${u.location} · ${u.station}`;

      // Badges
      let badges = '';
      if (cl > 0) {
        badges += `<span class="listener-badge ${_credBadgeClass(cl)}">${_credLabel(cl)}</span>`;
      }
      if (tainted && cl < 1) {
        badges += `<span class="listener-badge tainted-badge">⚠ RELAY</span>`;
      }

      // Mini pixel badge overlay on avatar for cred holders
      const pixelBadgeHtml = (isReal && badgeUrl)
        ? `<img class="listener-pixel-badge" src="${_esc(badgeUrl)}" alt="badge" width="18" height="18">`
        : '';

      // Click handler for real users
      const rowClick = isReal ? ` onclick="window._openListenerCard(${idx})"` : '';
      const rowCursor = isReal ? 'cursor:pointer;' : 'cursor:default;';

      return `<div class="listener-row" style="${rowCursor}" ${rowClick}>
  <div style="position:relative;flex-shrink:0">
    <div class="${_esc(avatarClass)}">${avatarInner}</div>
    ${pixelBadgeHtml}
  </div>
  <div class="listener-info">
    <div class="${_esc(nameClass)}"${glitchStyle}>${_esc(u.display_name)}</div>
    <div class="listener-sub listener-station">${_esc(sub)}</div>
  </div>
  ${badges}
</div>`;
    }).join('');

    el.innerHTML = rows;
  }

  // ── Inject panel DOM ──────────────────────────────────────────────────────
  function _injectPanel() {
    if (document.getElementById('listeners-panel')) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'listeners-backdrop';
    backdrop.id = 'listeners-backdrop';
    backdrop.onclick = () => window.toggleListenersPanel();
    document.body.appendChild(backdrop);

    const panel = document.createElement('div');
    panel.className = 'listeners-panel';
    panel.id = 'listeners-panel';
    panel.innerHTML = `
      <div class="listeners-panel-header">
        <div class="listeners-panel-title">
          <div class="listeners-panel-dot"></div>
          ONLINE USERS
        </div>
        <span class="listeners-panel-count" id="listeners-panel-count"></span>
        <button class="listeners-panel-close" onclick="window.toggleListenersPanel()">✕</button>
      </div>
      <div class="listeners-list" id="listeners-list">
        <div class="listeners-loading">Scanning network…</div>
      </div>
    `;
    document.body.appendChild(panel);

    // Inject mini profile card overlay
    const cardOverlay = document.createElement('div');
    cardOverlay.className = 'listener-card-overlay';
    cardOverlay.id = 'listener-card-overlay';
    cardOverlay.onclick = () => window._closeListenerCard();
    document.body.appendChild(cardOverlay);

    const card = document.createElement('div');
    card.className = 'listener-card';
    card.id = 'listener-card';
    card.innerHTML = `
      <div class="listener-card-header">
        <div class="listener-card-avatar" id="listener-card-avatar">
          <span id="listener-card-initial">?</span>
        </div>
        <div class="listener-card-info">
          <div class="listener-card-name" id="listener-card-name"></div>
          <div class="listener-card-nodeid" id="listener-card-nodeid"></div>
          <div class="listener-card-badges" id="listener-card-badges"></div>
        </div>
      </div>
      <div class="listener-card-station">
        <div class="listener-card-station-label">CURRENTLY LISTENING</div>
        <div class="listener-card-station-value" id="listener-card-station"></div>
      </div>
      <button class="listener-card-close" onclick="window._closeListenerCard()">CLOSE</button>
    `;
    document.body.appendChild(card);
  }

  // ── Inject nav button ─────────────────────────────────────────────────────
  // Adds an "Online Users" button to the main nav (next to the sign-in button)
  // and to the mobile nav menu.
  function _injectNavButton() {
    if (document.getElementById('listeners-nav-trigger')) return;

    // Desktop nav — insert before the auth button
    const navAuthBtn = document.getElementById('nav-auth-btn');
    if (navAuthBtn && navAuthBtn.parentElement) {
      const btn = document.createElement('button');
      btn.id = 'listeners-nav-trigger';
      btn.className = 'listeners-nav-btn';
      btn.title = 'Online Users';
      btn.innerHTML = `<span class="listeners-btn-dot"></span>ONLINE`;
      btn.onclick = () => window.toggleListenersPanel();
      navAuthBtn.parentElement.insertBefore(btn, navAuthBtn);
    }

    // Mobile nav — add as a menu item near the top of .mobile-nav-actions
    const mobileActions = document.querySelector('.mobile-nav-actions');
    if (mobileActions) {
      const li = document.createElement('div');
      li.style.cssText = 'padding: 6px 0;';
      li.innerHTML = `<button id="listeners-mobile-trigger"
        style="background:transparent;border:1px solid var(--border);border-radius:20px;padding:8px 18px;width:100%;font-family:'DM Mono',monospace;font-size:0.65rem;letter-spacing:1.5px;color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"
        onclick="window.toggleListenersPanel();toggleMobileMenu()">
        <span class="listeners-btn-dot"></span> ONLINE USERS
      </button>`;
      mobileActions.insertBefore(li, mobileActions.firstChild);
    }
  }

  // ── Rotation ──────────────────────────────────────────────────────────────
  function _startRotation() {
    if (_rotateTimer) clearInterval(_rotateTimer);
    _rotateTimer = setInterval(() => {
      const numRotate = 2 + Math.floor(Math.random() * 3);
      const newFakes  = _buildFakePool(numRotate);
      for (let i = 0; i < numRotate && i < _fakePool.length; i++) {
        _fakePool[Math.floor(Math.random() * _fakePool.length)] = newFakes[i];
      }
      _displayList = _buildDisplayList();
      if (_panelOpen) _renderList();
    }, 15000 + Math.random() * 10000);
  }

  // ── Mini profile card functions ──────────────────────────────────────────
  window._openListenerCard = function(idx) {
    if (idx < 0 || idx >= _displayList.length) return;
    const u = _displayList[idx];
    if (u.fake) return; // Only real users have cards
    
    _selectedCardIdx = idx;
    const overlay = document.getElementById('listener-card-overlay');
    const card = document.getElementById('listener-card');
    if (!overlay || !card) return;

    const cl = u.clearance_level || 0;
    const avatarEl = document.getElementById('listener-card-avatar');
    const nameEl = document.getElementById('listener-card-name');
    const nodeIdEl = document.getElementById('listener-card-nodeid');
    const badgesEl = document.getElementById('listener-card-badges');
    const stationEl = document.getElementById('listener-card-station');
    const initialEl = document.getElementById('listener-card-initial');

    const initial = (u.display_name || '?')[0].toUpperCase();
    const avatarClass = cl >= 4 ? 'listener-card-avatar ghost' : 'listener-card-avatar real';
    
    avatarEl.className = avatarClass;
    if (u.avatar_url) {
      avatarEl.innerHTML = `<img src="${_esc(u.avatar_url)}" alt="" onerror="this.style.display='none'"><span id="listener-card-initial" style="display:none">${initial}</span>`;
      if (u.badge_url) {
        avatarEl.innerHTML += `<img class="listener-card-pixel-badge" src="${_esc(u.badge_url)}" alt="badge" width="28" height="28">`;
      }
    } else {
      avatarEl.innerHTML = `<span id="listener-card-initial">${initial}</span>`;
    }

    nameEl.textContent = u.display_name || '—';
    nodeIdEl.textContent = u.node_id || 'verified node';
    stationEl.textContent = u.station || _fakeStation();

    // Build badges
    let badgeHtml = '';
    if (cl > 0) {
      badgeHtml += `<span class="listener-card-badge ${_credBadgeClass(cl)}">${_credLabel(cl)}</span>`;
    }
    if (u.tainted && cl < 1) {
      badgeHtml += `<span class="listener-card-badge">⚠ RELAY</span>`;
    }
    badgesEl.innerHTML = badgeHtml;

    overlay.classList.add('open');
    card.classList.add('open');
  };

  window._closeListenerCard = function() {
    const overlay = document.getElementById('listener-card-overlay');
    const card = document.getElementById('listener-card');
    if (overlay) overlay.classList.remove('open');
    if (card) card.classList.remove('open');
    _selectedCardIdx = null;
  };

  // ── Open/close ────────────────────────────────────────────────────────────
  window.toggleListenersPanel = async function() {
    _injectCSS();
    _injectPanel();
    _panelOpen = !_panelOpen;

    const panel    = document.getElementById('listeners-panel');
    const backdrop = document.getElementById('listeners-backdrop');
    if (!panel || !backdrop) return;

    if (_panelOpen) {
      panel.classList.add('open');
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';

      if (!_fetchedOnce) {
        _fetchedOnce = true;
        _fakePool    = _buildFakePool(28);
        _realUsers   = await _fetchRealUsers();
        _displayList = _buildDisplayList();
        _startRotation();
      }
      _renderList();
    } else {
      panel.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  };

  // Refresh real users every 60s while open
  setInterval(async () => {
    if (!_panelOpen) return;
    _realUsers   = await _fetchRealUsers();
    _displayList = _buildDisplayList();
    _renderList();
  }, 60000);

  // Inject CSS + nav button on DOMContentLoaded — with retry for slow bundle.js eval
  function _tryInjectNavButton(attempts) {
    _injectCSS();
    const navAuthBtn = document.getElementById('nav-auth-btn');
    if (navAuthBtn || attempts >= 10) {
      _injectNavButton();
    } else {
      setTimeout(() => _tryInjectNavButton(attempts + 1), 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => _tryInjectNavButton(0));
  } else {
    _tryInjectNavButton(0);
  }

  // ── Option A: Live station broadcast ────────────────────────────────────────
  // Call window._broadcastStation(stationName) from bundle.js whenever a real
  // user starts playing a station. This POSTs live_station to the API so the
  // listeners panel can show the real station name instead of a fake fallback.
  // Requires the `live_station` column to exist (see Supabase SQL below).
  //
  // SQL (run once):
  //   ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS live_station text;
  //
  // Usage in bundle.js (wherever playStation() is called):
  //   if (window._broadcastStation) window._broadcastStation(station.name);
  let _broadcastTimer = null;
  window._broadcastStation = function(stationName) {
    if (_broadcastTimer) clearTimeout(_broadcastTimer);
    // 3s debounce — avoids spam when user rapidly browses stations
    _broadcastTimer = setTimeout(async () => {
      try {
        const token = await _getToken();
        if (!token) return;
        await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ mode: 'save_profile', live_station: stationName || '' })
        });
      } catch (e) { /* non-critical — fail silently */ }
    }, 3000);
  };

  // Clear station on tab close so listeners panel doesn't show stale "online" status
  window.addEventListener('pagehide', async () => {
    try {
      const token = await _getToken().catch(() => null);
      if (!token) return;
      const blob = new Blob(
        [JSON.stringify({ mode: 'save_profile', live_station: '' })],
        { type: 'application/json' }
      );
      // sendBeacon is reliable on page unload; fetch is not
      navigator.sendBeacon && navigator.sendBeacon('/api/user', blob);
    } catch (e) {}
  });

})();


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — ARG PROFILE CORRUPTION SYSTEM
// Depends on: fetchProfile, saveProfile, window.__WNCORE_PROFILE, window._authUser
// (Section 1 above provides all of these)
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  const SIHARU_KEY        = 'wncore_siharu_visits';
  const SIHARU_HOST       = 'siharu.vercel.app';
  const ZALGO_INTERVAL_MS_MIN = 8000;
  const ZALGO_INTERVAL_MS_MAX = 15000;

  const LORE_STATIC = [
    'SIGNAL LOST ▒▒▒ REROUTING VIA NODE_09',
    'YOU WERE NOT SUPPOSED TO FIND THIS',
    'SIHARU ARCHIVE FRAGMENT DETECTED',
    'CONTACT LOGGED. THEY ARE AWARE.',
    '▒▒▒ TRANSMISSION CORRUPTED ▒▒▒',
    'RETURN TO FREQUENCY 88.7',
    'NODE INTEGRITY COMPROMISED',
    'MEDUSA PROTOCOL ENGAGED ▒▒▒',
    'BLANK ZONE ECHO DETECTED',
  ];

  const CORRUPTION_CSS = `
  #prof-signal-integrity {
    font-family: 'Courier New', monospace; font-size: 0.78rem; color: #7fff7f;
    background: rgba(0,20,0,0.72); border: 1px solid #2a5a2a; border-radius: 6px;
    padding: 12px 16px; margin-bottom: 18px; line-height: 1.7; letter-spacing: 0.03em;
    user-select: none; position: relative; overflow: hidden;
  }
  #prof-signal-integrity.sig-stage1 { border-color: #3a6a3a; }
  #prof-signal-integrity.sig-stage2 { color: #ffcc44; border-color: #7a6000; background: rgba(20,15,0,0.82); }
  #prof-signal-integrity.sig-stage3 { color: #ff6644; border-color: #7a2000; background: rgba(20,5,0,0.88); animation: sig-flicker 2.8s infinite; }
  #prof-signal-integrity.sig-stage4 { color: #ff3322; border-color: #cc0000; background: rgba(30,0,0,0.92); animation: sig-flicker 1.1s infinite; }
  .sig-bar-wrap { display: inline-block; width: 120px; vertical-align: middle; margin: 0 6px; }
  .sig-bar-fill { display: inline-block; height: 8px; background: #7fff7f; border-radius: 2px; transition: width 0.8s; vertical-align: middle; }
  .sig-stage2 .sig-bar-fill { background: #ffcc44; }
  .sig-stage3 .sig-bar-fill { background: #ff6644; }
  .sig-stage4 .sig-bar-fill { background: #ff2200; }
  .sig-breach { display: inline-block; letter-spacing: 0.15em; animation: sig-flicker 0.4s infinite; color: #ff2200; }
  @keyframes sig-flicker {
    0%   { opacity: 1; } 48%  { opacity: 1; } 50%  { opacity: 0.3; }
    52%  { opacity: 1; } 90%  { opacity: 1; } 92%  { opacity: 0.2; } 94% { opacity: 1; }
  }
  @keyframes wncore-glitch-flicker {
    0%   { opacity: 1; filter: none; transform: none; }
    92%  { opacity: 1; filter: none; transform: none; }
    93%  { opacity: 0.4; filter: hue-rotate(90deg) saturate(3); transform: translate(-2px, 1px); }
    94%  { opacity: 1; filter: none; transform: none; }
    97%  { opacity: 0.6; filter: hue-rotate(180deg) saturate(2); transform: translate(2px, -1px); }
    100% { opacity: 1; filter: none; transform: none; }
  }
  @keyframes wncore-glitch-heavy {
    0%   { opacity: 1; filter: none; transform: none; }
    10%  { opacity: 0.2; filter: hue-rotate(120deg) saturate(5) brightness(2); transform: translate(-4px, 2px) scaleX(1.04); }
    11%  { opacity: 1; filter: hue-rotate(0deg); transform: none; }
    30%  { opacity: 1; filter: none; transform: none; }
    31%  { opacity: 0.1; filter: hue-rotate(200deg) saturate(8); transform: translate(4px, -3px); }
    32%  { opacity: 1; filter: none; transform: none; }
    60%  { opacity: 1; filter: none; transform: none; }
    61%  { filter: hue-rotate(300deg) saturate(6) contrast(2); transform: translate(-2px, 4px); opacity: 0.4; }
    62%  { opacity: 1; filter: none; transform: none; }
    100% { opacity: 1; filter: none; transform: none; }
  }
  `;

  function _injectCorruptionCSS() {
    if (document.getElementById('wncore-corruption-css')) return;
    const s = document.createElement('style');
    s.id = 'wncore-corruption-css';
    s.textContent = CORRUPTION_CSS;
    document.head.appendChild(s);
  }

  // ── Siharu visit count — reconcile local cache with server profile ────────
  function _siharuGetCount() {
    // Prefer server-side value (set during profile fetch)
    if (typeof window.__WNCORE_SIHARU_VISITS_FROM_PROFILE === 'number') {
      return window.__WNCORE_SIHARU_VISITS_FROM_PROFILE;
    }
    return parseInt(localStorage.getItem(SIHARU_KEY) || '0', 10);
  }
  function _siharuSetCount(n) {
    window.__WNCORE_SIHARU_VISITS_FROM_PROFILE = n;
    localStorage.setItem(SIHARU_KEY, String(n));
  }
  function _siharuReconcile() {
    const local  = parseInt(localStorage.getItem(SIHARU_KEY) || '0', 10);
    const server = typeof window.__WNCORE_SIHARU_VISITS_FROM_PROFILE === 'number'
      ? window.__WNCORE_SIHARU_VISITS_FROM_PROFILE : local;
    const max = Math.max(local, server);
    _siharuSetCount(max);
    return max;
  }

  // ── Corruption stage from visit count ────────────────────────────────────
  function _stage(count) {
    if (count >= 25) return 4;
    if (count >= 12) return 3;
    if (count >= 5)  return 2;
    if (count >= 1)  return 1;
    return 0;
  }

  // ── Increment visits via server (rate-limited) + update local cache ───────
  async function _siharuIncrementAndSave() {
    try {
      // Call the server-side rate-limited XP endpoint
      if (window.__siharuAwardVisit) {
        const result = await window.__siharuAwardVisit();
        if (result?.ok) {
          _siharuSetCount(result.visit_count);
          _siharuApplyCorruption(result.visit_count);
          return;
        }
        if (result?.error === 'RATE_LIMITED') {
          // Already at max for this window — still apply current corruption level
          _siharuApplyCorruption(_siharuGetCount());
          return;
        }
      }
    } catch (e) {}
    // Fallback: only increment local if server fails (prevents abuse on server side anyway)
    const current = _siharuGetCount();
    _siharuSetCount(current + 1);
    _siharuApplyCorruption(current + 1);
  }

  function _siharuApplyCorruption(count) {
    try {
      const stage = _stage(count);
      _injectIntegrityBlock(count);
      _corruptAvatar(stage);
      _corruptHeader(stage);
      _startZalgoTimer(stage);
      _startBioCorruption(stage);
      _startStaticName(stage);
      if (stage >= 4) _injectTheyKnow();
    } catch (e) {}
  }

  // ── Signal integrity block (shown on profile page) ────────────────────────
  function _injectIntegrityBlock(count) {
    const existing = document.getElementById('prof-signal-integrity');
    if (!existing) return; // Only inject if profile page is open

    _injectCorruptionCSS();

    const stage    = _stage(count);
    const pct      = Math.min(100, Math.max(0, 100 - (count * 8)));
    const stageKey = `sig-stage${stage}`;

    const stageLabels = {
      0: 'NOMINAL',
      1: 'DEGRADED',
      2: 'COMPROMISED',
      3: 'CRITICAL',
      4: '<span class="sig-breach">BREACH</span>',
    };
    const stageLabel = stageLabels[stage] || 'NOMINAL';

    existing.className = `${stageKey}`;
    existing.innerHTML = `
> SIGNAL INTEGRITY: ${stageLabel}
> SIHARU CONTACTS: ${count}
> INTEGRITY: <span class="sig-bar-wrap"><span class="sig-bar-fill" style="width:${pct}%"></span></span> ${pct}%
${stage >= 2 ? '> ⚠ SIGNAL COMPROMISED — DATA MAY BE CORRUPTED' : ''}
${stage >= 3 ? '> ⚠ THEY KNOW YOUR NODE. CHANGE FREQUENCY.' : ''}
${stage >= 4 ? '> ██ BREACH CONFIRMED. GHOST PROTOCOL ACTIVE.' : ''}
    `.trim();
  }

  // ── Avatar corruption (glitch effect on #prof-avatar-big) ────────────────
  function _corruptAvatar(stage) {
    const el = document.getElementById('prof-avatar-big');
    if (!el) return;
    el.classList.remove('corrupted-1','corrupted-2','corrupted-3','corrupted-4');
    if (stage > 0) el.classList.add(`corrupted-${Math.min(stage, 4)}`);
    if (stage === 0) { el.style.animation = ''; return; }
    const anims = {
      1: 'wncore-glitch-flicker 6s infinite',
      2: 'wncore-glitch-flicker 3s infinite',
      3: 'wncore-glitch-heavy 4s infinite',
      4: 'wncore-glitch-heavy 1.5s infinite',
    };
    el.style.animation = anims[stage] || '';
  }

  // ── Header corruption ─────────────────────────────────────────────────────
  let _headerCorruptTimer = null;
  function _corruptHeader(stage) {
    if (_headerCorruptTimer) clearInterval(_headerCorruptTimer);
    if (stage === 0) return;

    const el = document.getElementById('profile-display-name') ||
               document.querySelector('.nav-logo, .site-title, h1');
    if (!el) return;
    const orig = el.textContent;

    if (stage >= 3) {
      _headerCorruptTimer = setInterval(() => {
        if (Math.random() < 0.3) {
          const chars = orig.split('');
          const i = Math.floor(Math.random() * chars.length);
          chars[i] = String.fromCharCode(0x25A0 + Math.floor(Math.random() * 10));
          el.textContent = chars.join('');
          setTimeout(() => { el.textContent = orig; }, 120);
        }
      }, 1800);
    }
  }

  // ── Zalgo / random lore ticker ────────────────────────────────────────────
  let _zalgoTimer = null;
  function _startZalgoTimer(stage) {
    if (_zalgoTimer) clearTimeout(_zalgoTimer);
    if (stage === 0) return;
    const delay = ZALGO_INTERVAL_MS_MIN + Math.random() * (ZALGO_INTERVAL_MS_MAX - ZALGO_INTERVAL_MS_MIN);
    _zalgoTimer = setTimeout(() => {
      _flashLoreMessage(stage);
      _startZalgoTimer(stage);
    }, delay);
  }

  function _flashLoreMessage(stage) {
    const msg = LORE_STATIC[Math.floor(Math.random() * LORE_STATIC.length)];
    if (typeof showToast === 'function') {
      showToast(msg, stage >= 3 ? 'error' : 'info', 4000);
    }
  }

  // ── Bio field corruption (stage 3+) ──────────────────────────────────────
  let _bioCorruptTimer = null;
  function _startBioCorruption(stage) {
    if (_bioCorruptTimer) clearInterval(_bioCorruptTimer);
    if (stage < 3) return;
    const el = document.getElementById('prof-input-bio');
    if (!el) return;
    const orig = el.value;
    _bioCorruptTimer = setInterval(() => {
      if (Math.random() < 0.15 && el.value === orig) {
        el.value = orig + '\n> THEY SEE YOU';
        setTimeout(() => { if (el.value !== orig) el.value = orig; }, 800);
      }
    }, 5000);
  }

  // ── Static name flash (stage 2+) ─────────────────────────────────────────
  let _staticNameTimer = null;
  function _startStaticName(stage) {
    if (_staticNameTimer) clearInterval(_staticNameTimer);
    if (stage < 2) return;
    const el = document.getElementById('prof-input-displayname');
    if (!el) return;
    const orig = el.value;
    _staticNameTimer = setInterval(() => {
      if (Math.random() < 0.08) {
        const glitch = ['N̷O̷D̷E̷_̷?̷?̷?̷','S̷I̷G̷N̷A̷L̷_̷L̷O̷S̷T̷','▒▒▒▒▒▒▒▒'][Math.floor(Math.random() * 3)];
        el.value = glitch;
        el.style.color = '#ff3322';
        setTimeout(() => { el.value = orig; el.style.color = ''; }, 400);
      }
    }, 4000);
  }

  // ── Stage 4: full-page "They Know" overlay ────────────────────────────────
  function _injectTheyKnow() {
    if (document.getElementById('wncore-they-know')) return;
    const el = document.createElement('div');
    el.id = 'wncore-they-know';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 99999; pointer-events: none;
      background: transparent; display: flex; align-items: center; justify-content: center;
    `;
    el.innerHTML = `<div style="
      font-family: 'DM Mono', monospace; font-size: 0.7rem; color: rgba(255,50,34,0.06);
      letter-spacing: 4px; text-transform: uppercase; text-align: center; line-height: 3;
      user-select: none;
    ">
      THEY KNOW<br>THEY KNOW<br>THEY KNOW<br>THEY KNOW<br>THEY KNOW<br>THEY KNOW<br>
      THEY KNOW<br>THEY KNOW<br>THEY KNOW<br>THEY KNOW<br>THEY KNOW<br>THEY KNOW
    </div>`;
    document.body.appendChild(el);
  }

  // ── Referrer detection ────────────────────────────────────────────────────
  (function _checkReferrer() {
    try {
      if (document.referrer && document.referrer.includes(SIHARU_HOST)) {
        const flagKey = 'wncore_siharu_return_counted';
        if (!sessionStorage.getItem(flagKey)) {
          sessionStorage.setItem(flagKey, '1');
          setTimeout(() => { _siharuIncrementAndSave(); }, 1200);
        }
      }
    } catch {}
  })();

  // ── Outbound click intercept ──────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    try {
      const a = e.target.closest('a[href]');
      if (a && a.href && a.href.includes(SIHARU_HOST)) {
        sessionStorage.removeItem('wncore_siharu_return_counted');
      }
    } catch {}
  }, true);

  // ── Profile page observer ─────────────────────────────────────────────────
  const _profileObserver = new MutationObserver(function(mutations) {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1 && (node.id === 'prof-avatar-section' || node.querySelector?.('#prof-avatar-section'))) {
          _onProfilePageReady();
          return;
        }
      }
    }
  });
  _profileObserver.observe(document.body, { childList: true, subtree: true });

  let _profReadyTimeout = null;
  function _onProfilePageReady() {
    if (_profReadyTimeout) clearTimeout(_profReadyTimeout);
    _profReadyTimeout = setTimeout(() => {
      try {
        const count = _siharuReconcile();
        const stage = _stage(count);
        _injectIntegrityBlock(count);
        _corruptAvatar(stage);
        _corruptHeader(stage);
        _startZalgoTimer(stage);
        _startBioCorruption(stage);
        _startStaticName(stage);
        if (stage >= 4) _injectTheyKnow();
      } catch {}
    }, 350);
  }

  // ── Public console API ────────────────────────────────────────────────────
  window.__SIHARU_CORRUPT = {
    getCount  : _siharuGetCount,
    setCount  : (n) => { _siharuSetCount(n); _siharuApplyCorruption(n); },
    forceApply: (n) => { _siharuSetCount(n); _siharuApplyCorruption(n); },
    reset     : () => { _siharuSetCount(0); localStorage.removeItem(SIHARU_KEY); _siharuApplyCorruption(0); },
    stage     : () => _stage(_siharuGetCount()),
  };

  // ── Initial run ───────────────────────────────────────────────────────────
  function _init() {
    try {
      const count = _siharuReconcile();
      _siharuApplyCorruption(count);
    } catch {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
