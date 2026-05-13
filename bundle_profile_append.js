// ─────────────────────────────────────────────────────────────────────────────
// WNCORE PROFILE SYSTEM v2 — append to end of bundle.js
// Adds: Avatar picker (DiceBear), Identity panel, Node ID terminal,
//       Theme/volume prefs, Delete flow.
// Hooks into existing loadProfilePage() — no original code touched.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── DiceBear avatar styles — curated selection that fits WNCORE's aesthetic ─
  // Format: { id, label, category }
  // URL: https://api.dicebear.com/9.x/<id>/svg?seed=<seed>
  const DICEBEAR_STYLES = [
    // Illustrated characters
    { id: 'adventurer',        label: 'Adventurer',     cat: 'Illustrated' },
    { id: 'adventurer-neutral',label: 'Adventurer Neutral', cat: 'Illustrated' },
    { id: 'avataaars',         label: 'Avataaars',      cat: 'Illustrated' },
    { id: 'avataaars-neutral', label: 'Avataaars Neutral', cat: 'Illustrated' },
    { id: 'big-ears',          label: 'Big Ears',       cat: 'Illustrated' },
    { id: 'big-ears-neutral',  label: 'Big Ears Neutral', cat: 'Illustrated' },
    { id: 'croodles',          label: 'Croodles',       cat: 'Illustrated' },
    { id: 'croodles-neutral',  label: 'Croodles Neutral', cat: 'Illustrated' },
    { id: 'dylan',             label: 'Dylan',          cat: 'Illustrated' },
    { id: 'fun-emoji',         label: 'Fun Emoji',      cat: 'Illustrated' },
    { id: 'lorelei',           label: 'Lorelei',        cat: 'Illustrated' },
    { id: 'lorelei-neutral',   label: 'Lorelei Neutral',cat: 'Illustrated' },
    { id: 'micah',             label: 'Micah',          cat: 'Illustrated' },
    { id: 'miniavs',           label: 'Mini Avs',       cat: 'Illustrated' },
    { id: 'notionists',        label: 'Notionists',     cat: 'Illustrated' },
    { id: 'notionists-neutral',label: 'Notionists Neutral', cat: 'Illustrated' },
    { id: 'open-peeps',        label: 'Open Peeps',     cat: 'Illustrated' },
    { id: 'personas',          label: 'Personas',       cat: 'Illustrated' },
    // Geometric / abstract — fits the ARG vibe
    { id: 'bottts',            label: 'Bottts',         cat: 'Abstract' },
    { id: 'bottts-neutral',    label: 'Bottts Neutral', cat: 'Abstract' },
    { id: 'identicon',         label: 'Identicon',      cat: 'Abstract' },
    { id: 'initials',          label: 'Initials',       cat: 'Abstract' },
    { id: 'rings',             label: 'Rings',          cat: 'Abstract' },
    { id: 'shapes',            label: 'Shapes',         cat: 'Abstract' },
    { id: 'thumbs',            label: 'Thumbs',         cat: 'Abstract' },
    // Pixel / retro — strong ARG aesthetic
    { id: 'pixel-art',         label: 'Pixel Art',      cat: 'Pixel & Retro' },
    { id: 'pixel-art-neutral', label: 'Pixel Art Neutral', cat: 'Pixel & Retro' },
  ];

  const DICEBEAR_CATS = ['All', ...new Set(DICEBEAR_STYLES.map(s => s.cat))];

  // ── Generate DiceBear URL ─────────────────────────────────────────────────
  function dicebearUrl(styleId, seed, size) {
    const s = encodeURIComponent(seed || 'WNCORE');
    return `https://api.dicebear.com/9.x/${styleId}/svg?seed=${s}${size ? '&size=' + size : ''}`;
  }

  // ── Cached profile from API ────────────────────────────────────────────────
  window.__WNCORE_PROFILE = null;

  // ── Currently selected avatar URL (before saving) ─────────────────────────
  let _pendingAvatarUrl = null;

  // ── Get Supabase access token ─────────────────────────────────────────────
  async function _getToken() {
    const sb = await _getSupabase();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token || null;
  }

  // ── Fetch profile ─────────────────────────────────────────────────────────
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

  // ── Save to /api/user ─────────────────────────────────────────────────────
  async function saveProfile(fields) {
    const token = await _getToken();
    if (!token) return { error: 'Not signed in.' };
    try {
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
        body: JSON.stringify({ mode: 'delete_account', confirm: 'DELETE' })
      });
      return await r.json();
    } catch (e) { return { error: e.message }; }
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById('wncore-profile-css')) return;
    const s = document.createElement('style');
    s.id = 'wncore-profile-css';
    s.textContent = `
      /* ── Shared section shell ── */
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

      /* ── Avatar Picker ── */
      #prof-avatar-preview-wrap {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      #prof-avatar-big {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: var(--surface2);
        border: 2px solid var(--border);
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: border-color 0.2s;
      }
      #prof-avatar-big.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(200,71,42,0.18); }
      #prof-avatar-big img { width: 100%; height: 100%; object-fit: cover; }
      .prof-avatar-meta { flex: 1; min-width: 140px; }
      .prof-avatar-style-name {
        font-size: 0.78rem;
        font-family: 'DM Mono', monospace;
        color: var(--text2);
        margin-bottom: 6px;
        letter-spacing: 1px;
      }
      /* Category tabs */
      #prof-avatar-cats {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .prof-cat-tab {
        font-size: 0.7rem;
        font-family: 'DM Mono', monospace;
        letter-spacing: 1px;
        text-transform: uppercase;
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 4px 12px;
        cursor: pointer;
        color: var(--text3);
        background: transparent;
        transition: border-color 0.15s, color 0.15s;
      }
      .prof-cat-tab.active { border-color: var(--accent); color: var(--accent); }
      /* Style grid */
      #prof-avatar-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
        gap: 8px;
        max-height: 320px;
        overflow-y: auto;
        padding: 4px 2px;
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
      }
      .prof-avatar-thumb {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        padding: 8px 4px;
        border-radius: 12px;
        border: 2px solid transparent;
        transition: border-color 0.15s, background 0.15s;
        background: var(--surface2);
      }
      .prof-avatar-thumb:hover { border-color: var(--border); }
      .prof-avatar-thumb.selected { border-color: var(--accent); background: rgba(200,71,42,0.08); }
      .prof-avatar-thumb img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: block;
        background: var(--surface);
      }
      .prof-avatar-thumb span {
        font-size: 0.55rem;
        color: var(--text3);
        text-align: center;
        font-family: 'DM Mono', monospace;
        letter-spacing: 0.5px;
        line-height: 1.2;
        max-width: 68px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Seed input row */
      #prof-avatar-seed-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 14px;
        flex-wrap: wrap;
      }
      #prof-avatar-seed-row input {
        flex: 1;
        min-width: 120px;
      }
      #prof-avatar-seed-row button {
        white-space: nowrap;
        flex-shrink: 0;
      }

      /* ── Node terminal ── */
      #prof-node-terminal {
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 18px 20px;
        font-family: 'DM Mono', monospace;
        font-size: 0.78rem;
        color: #00ff88;
        min-height: 80px;
        margin-bottom: 14px;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .prof-node-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .prof-node-input {
        flex: 1;
        min-width: 180px;
        background: #111;
        border: 1px solid #333;
        color: #00ff88;
        font-family: 'DM Mono', monospace;
        font-size: 0.82rem;
        padding: 9px 14px;
        border-radius: 8px;
        outline: none;
        text-transform: uppercase;
        letter-spacing: 1.5px;
      }
      .prof-node-input:focus { border-color: #00ff88; }
      .prof-node-input::placeholder { color: #335544; }
      .prof-node-btn {
        background: #00ff88;
        color: #000;
        border: none;
        border-radius: 8px;
        padding: 9px 18px;
        font-family: 'DM Mono', monospace;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        letter-spacing: 1px;
      }
      .prof-node-btn:hover { background: #00cc6a; }

      /* ── Theme pills ── */
      .prof-theme-pills { display: flex; gap: 10px; flex-wrap: wrap; }
      .prof-theme-pill {
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 6px 18px;
        font-size: 0.78rem;
        font-family: 'DM Mono', monospace;
        cursor: pointer;
        color: var(--text2);
        background: transparent;
        transition: border-color 0.15s, color 0.15s;
      }
      .prof-theme-pill.active { border-color: var(--accent); color: var(--accent); }

      /* ── Clearance badge ── */
      .prof-clearance-badge {
        display: inline-flex;
        align-items: center;
        font-family: 'DM Mono', monospace;
        font-size: 0.65rem;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 3px 12px;
        color: var(--text3);
      }
      .prof-clearance-badge.lvl1 { border-color: #4caf50; color: #4caf50; }
      .prof-clearance-badge.lvl2 { border-color: #ff9800; color: #ff9800; }
      .prof-clearance-badge.lvl3 { border-color: var(--accent); color: var(--accent); }

      /* ── Delete overlay ── */
      #prof-delete-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.75);
        z-index: 9999;
        align-items: center;
        justify-content: center;
      }
      #prof-delete-overlay.show { display: flex; }
      #prof-delete-box {
        background: var(--surface);
        border: 1px solid rgba(200,71,42,0.4);
        border-radius: 18px;
        padding: 36px;
        max-width: 420px;
        width: 90%;
        text-align: center;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
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
  let _avatarSeed          = '';   // set to user email fragment on init

  function _filteredStyles() {
    if (_avatarCurrentCat === 'All') return DICEBEAR_STYLES;
    return DICEBEAR_STYLES.filter(s => s.cat === _avatarCurrentCat);
  }

  // Render the avatar grid (called on category change or seed reroll)
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

  // Select a style and update big preview
  window._profSelectAvatar = function(styleId) {
    _avatarSelectedStyle = styleId;
    _pendingAvatarUrl    = dicebearUrl(styleId, _avatarSeed);

    // Update grid selection highlight
    document.querySelectorAll('.prof-avatar-thumb').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('onclick')?.includes(`'${styleId}'`));
    });

    // Update big preview
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

  // Switch category tab
  window._profSwitchCat = function(cat) {
    _avatarCurrentCat = cat;
    document.querySelectorAll('.prof-cat-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === cat);
    });
    window._profRenderAvatarGrid();
    // Auto-select first in category
    const styles = _filteredStyles();
    if (styles.length) window._profSelectAvatar(styles[0].id);
  };

  // Reroll seed (randomise avatars)
  window._profRerollSeed = function() {
    const inp = document.getElementById('prof-avatar-seed-input');
    _avatarSeed = inp ? inp.value.trim() || _randomSeed() : _randomSeed();
    window._profRenderAvatarGrid();
    // Re-select current style with new seed
    window._profSelectAvatar(_avatarSelectedStyle);
  };

  function _randomSeed() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  // Save avatar
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
      // Apply immediately to the top profile card
      const avLg = document.getElementById('profile-avatar-lg');
      if (avLg) {
        const initial = (_authUser?.email || '?')[0].toUpperCase();
        avLg.innerHTML = `<img src="${_esc(_pendingAvatarUrl)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`;
      }
      // Also update nav avatar if present
      const navAv = document.getElementById('auth-avatar');
      if (navAv) {
        const initial2 = (_authUser?.email || '?')[0].toUpperCase();
        navAv.innerHTML = `<img src="${_esc(_pendingAvatarUrl)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial2}'">`;
      }
      showToast('✓ Avatar updated', 'success');
    }
  };

  // ── Node terminal text ────────────────────────────────────────────────────
  function _nodeTerminalText(nodeId) {
    if (!nodeId || nodeId === '—') {
      return `> SCANNING NETWORK…\n> CURRENT SESSION: ${window.__WNCORE_NODE_ID || 'NODE_UNKNOWN'}\n> STATUS: TEMPORARY — not permanently assigned\n> Claim a permanent Node ID to lock your identity into the WNCORE relay grid.`;
    }
    return `> NODE REGISTRY — PERMANENT ASSIGNMENT\n> NODE ID: ${nodeId}\n> STATUS: LOCKED ██████████ 100%\n> This node is permanently bound to your account.\n> "They know where you are. They always did."`;
  }

  // ── Build all section HTML ────────────────────────────────────────────────
  function _buildSections(profile) {
    const nodeId      = profile?.node_id       || window.__WNCORE_NODE_ID || '—';
    const callsign    = profile?.callsign       || '';
    const displayName = profile?.display_name   || '';
    const bio         = profile?.bio            || '';
    const theme       = profile?.theme          || 'dark';
    const hideEmail   = profile?.hide_email     || false;
    const clearance   = profile?.clearance_level|| 0;
    const savedAvatar = profile?.avatar_url     || '';

    const clMap = {0:'',1:'lvl1',2:'lvl2',3:'lvl3'};
    const clLabel= {0:'UNVERIFIED',1:'OPERATOR LVL 1',2:'OPERATOR LVL 2',3:'OPERATOR LVL 3'};
    const cl = Math.min(clearance, 3);

    // Cats HTML
    const catsHtml = DICEBEAR_CATS.map(c =>
      `<button class="prof-cat-tab${c==='All'?' active':''}" data-cat="${c}" onclick="_profSwitchCat('${c}')">${c}</button>`
    ).join('');

    // Big preview — use saved avatar if exists, else first style with current seed
    const bigSrc = savedAvatar || dicebearUrl(DICEBEAR_STYLES[0].id, _avatarSeed);

    return `
    <!-- ── AVATAR SECTION ── -->
    <div class="prof-section" id="prof-avatar-section">
      <div class="prof-section-title">◈ Profile Picture</div>

      <!-- Big preview + meta -->
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

      <!-- Category tabs -->
      <div id="prof-avatar-cats">${catsHtml}</div>

      <!-- Style grid -->
      <div id="prof-avatar-grid">
        <!-- populated by _profRenderAvatarGrid() -->
      </div>

      <!-- Seed row -->
      <div id="prof-avatar-seed-row">
        <div class="prof-label" style="margin:0;white-space:nowrap;align-self:center">Seed (shapes variation):</div>
        <input class="prof-input" id="prof-avatar-seed-input" placeholder="any text changes the look…"
          value="${_esc(_avatarSeed)}" style="font-family:'DM Mono',monospace;font-size:0.8rem">
        <button class="prof-btn-ghost" onclick="_profRerollSeed()" style="padding:9px 16px;font-size:0.8rem">🎲 Reroll</button>
      </div>
      <div class="prof-status" id="prof-avatar-status"></div>
    </div>

    <!-- ── IDENTITY SECTION ── -->
    <div class="prof-section" id="prof-identity-section">
      <div class="prof-section-title">
        ◉ Identity
        <span class="prof-clearance-badge ${clMap[cl]}">${clLabel[cl]}</span>
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

    <!-- ── NODE ID TERMINAL ── -->
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

    <!-- ── PREFERENCES ── -->
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
        <div class="prof-label">Default Volume <span id="prof-vol-label" style="color:var(--accent)">${profile?.default_volume ?? 80}%</span></div>
        <input type="range" id="prof-input-volume" min="0" max="100"
          value="${profile?.default_volume ?? 80}"
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

    <!-- ── DANGER ZONE ── -->
    <div class="prof-section" id="prof-danger-section">
      <div class="prof-section-title" style="color:var(--accent)">⚠ Danger Zone</div>
      <div style="font-size:0.82rem;color:var(--text2);margin-bottom:16px;line-height:1.6">
        Permanently deletes your account, profile data, and all saved favourites. This cannot be undone.
      </div>
      <button class="prof-btn-danger" onclick="_profOpenDelete()">Delete Account</button>
    </div>

    <!-- ── DELETE OVERLAY ── -->
    <div id="prof-delete-overlay">
      <div id="prof-delete-box">
        <div style="font-size:1.5rem;margin-bottom:12px;color:var(--accent)">⚠</div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:8px">Delete your account?</div>
        <div style="font-size:0.8rem;color:var(--text3);margin-bottom:20px;line-height:1.6">
          Type <strong style="color:var(--accent);font-family:'DM Mono',monospace">DELETE</strong> to confirm. This is permanent.
        </div>
        <input class="prof-input" id="prof-delete-confirm-input"
          placeholder="Type DELETE to confirm" style="margin-bottom:16px;text-align:center">
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
      // Restore OAuth avatar
      const user = _authUser;
      const oauthAv = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
      const initial  = (user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase();
      const avLg = document.getElementById('profile-avatar-lg');
      if (avLg) avLg.innerHTML = oauthAv
        ? `<img src="${_esc(oauthAv)}" style="width:100%;height:100%;object-fit:cover;">`
        : initial;
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
    const inp = (document.getElementById('prof-delete-confirm-input')?.value || '').trim();
    if (inp !== 'DELETE') { _setStatus('prof-delete-status', 'You must type DELETE exactly.', true); return; }
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

  // ── Inject into #page-profile ─────────────────────────────────────────────
  const INJECTED_IDS = [
    'prof-avatar-section','prof-identity-section','prof-node-section',
    'prof-prefs-section','prof-danger-section','prof-delete-overlay'
  ];

  async function _injectSections(profile) {
    const page = document.getElementById('page-profile');
    if (!page) return;
    INJECTED_IDS.forEach(id => document.getElementById(id)?.remove());

    const wrapper = page.querySelector('div[style*="max-width:860px"]');
    if (!wrapper) return;

    // Seed from user email fragment so it's stable per user, but user can override
    const user = _authUser;
    _avatarSeed = (profile?.avatar_seed) || (user?.email?.split('@')[0] || _randomSeed());

    // If user has a saved avatar, set it as the selected one in picker too
    if (profile?.avatar_url && profile.avatar_url.includes('dicebear')) {
      _pendingAvatarUrl = profile.avatar_url;
      // Try to recover style from URL
      const m = profile.avatar_url.match(/9\.x\/([^/]+)\//);
      if (m) _avatarSelectedStyle = m[1];
    }

    const acctSection = wrapper.querySelector('div:last-child');
    const tmp = document.createElement('div');
    tmp.innerHTML = _buildSections(profile);
    while (tmp.firstChild) wrapper.insertBefore(tmp.firstChild, acctSection);

    // Initial render of avatar grid
    window._profRenderAvatarGrid();
    // Highlight seed input
    const seedInp = document.getElementById('prof-avatar-seed-input');
    if (seedInp) seedInp.value = _avatarSeed;
    // Select style
    window._profSelectAvatar(_avatarSelectedStyle);
  }

  // ── Patch loadProfilePage ─────────────────────────────────────────────────
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
        const initial = (profile.display_name || _authUser.email || '?')[0].toUpperCase();
        avLg.innerHTML = `<img src="${_esc(profile.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`;
      }
    }
    if (profile?.hide_email) {
      const de = document.getElementById('profile-display-email');
      if (de) de.textContent = '••••@••••';
    }
  };

  // ── On auth change, warm profile + apply avatar/node ─────────────────────
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
