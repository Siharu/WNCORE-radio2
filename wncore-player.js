/**
 * WNCORE Universal Player — wncore-player.js
 *
 * One persistent player bar that works across every page on the site.
 * Drop this script into any page and call WNCORE_PLAYER.mount() to get
 * a fully functional persistent bottom player that:
 *
 *   — Plays/pauses/skips radio streams via the Radio Browser API
 *   — Restores the last-playing station on page load (no autoplay — needs gesture)
 *   — Syncs play state, artwork, station name across the entire page lifecycle
 *   — Handles iOS AudioContext unlock natively
 *   — Crossfades between stations (300ms)
 *   — Saves volume, last station, and a 10-station queue to localStorage
 *   — Fires 'wncore-play' / 'wncore-pause' / 'wncore-station-change' events
 *
 * Usage in any HTML:
 *   <script src="/wncore-player.js" defer></script>
 *   // Player mounts automatically. Access via window.WNCORE_PLAYER.
 *
 * On index.html (main site):
 *   The player bridges to the existing `audio` element and `playStation()` function
 *   so state is shared with all existing controls (player-bar, sidebar, etc.)
 *   It does NOT create a second audio element if one already exists.
 *
 * On other pages (constellation.html, radio-mini.html, etc.):
 *   Creates its own <audio> element and provides a standalone play engine.
 */

(function() {
'use strict';

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */
const STORAGE = {
  LAST_STATION : 'wncore-last-station',
  VOLUME       : 'wncore-vol',
  QUEUE        : 'wncore-player-queue',
};

const API_MIRRORS = [
  'https://de1.api.radio-browser.info/json',
  'https://at1.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
];

const CSS_ID  = 'wncore-player-css';
const ROOT_ID = 'wncore-player-root';

/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
const P = {
  audio        : null,   // the single <audio> element
  station      : null,   // current station object
  queue        : [],     // array of station objects
  queueIdx     : -1,
  isPlaying    : false,
  isLoading    : false,
  volume       : 0.8,
  muted        : false,
  mounted      : false,
  crossfading  : false,
  // Whether we're running alongside the main site (index.html)
  // or standalone on another page
  standalone   : true,
};

/* ═══════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════ */
const PLAYER_CSS = `
#wncore-player-root {
  --wp-bg: rgba(14,12,10,0.97);
  --wp-border: rgba(255,255,255,0.07);
  --wp-text: #f0ede8;
  --wp-text2: rgba(240,237,232,0.55);
  --wp-text3: rgba(240,237,232,0.28);
  --wp-accent: #c8472a;
  --wp-green: #22c55e;
  --wp-surface: rgba(255,255,255,0.06);
  --wp-h: 64px;

  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: var(--wp-h);
  z-index: 10000;
  background: var(--wp-bg);
  border-top: 1px solid var(--wp-border);
  display: flex;
  align-items: center;
  gap: 0;
  font-family: 'DM Mono', 'Courier New', monospace;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
  /* Push page content above player */
  contain: layout;
}
#wncore-player-root.wp-visible {
  transform: translateY(0);
}
#wncore-player-root.wp-expanded {
  height: 200px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 16px;
  transition: height 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1);
}
#wncore-player-root.wp-expanded #wp-art {
  width: 64px;
  height: 64px;
  transition: transform 0.3s;
}
#wncore-player-root.wp-expanded #wp-meta {
  text-align: center;
}
#wncore-player-root.wp-expanded #wp-controls {
  justify-content: center;
}
#wncore-player-root.wp-expanded #wp-vol-section {
  display: none;
}
/* Safe area for iPhone home bar */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  #wncore-player-root {
    padding-bottom: env(safe-area-inset-bottom);
    height: calc(var(--wp-h) + env(safe-area-inset-bottom));
  }
}
/* Body padding so content isn't hidden behind player */
body.wncore-player-active {
  padding-bottom: var(--wp-h, 64px) !important;
}

/* ── Progress bar — sits at very top of player ── */
#wp-progress {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
}
#wp-progress-fill {
  height: 100%;
  width: 0;
  background: var(--wp-accent);
  border-radius: 0 2px 2px 0;
  transition: width 0.3s ease;
}
#wp-progress-fill.wp-playing {
  animation: wp-progfill 8s linear infinite;
}
#wp-progress-fill.wp-buffering {
  width: 40% !important;
  animation: wp-buffering 1.4s ease-in-out infinite;
  opacity: 0.6;
}
@keyframes wp-progfill { 0%{width:0%} 100%{width:100%} }
@keyframes wp-buffering { 0%,100%{opacity:0.3;width:35%} 50%{opacity:0.8;width:55%} }

/* ── Station info — left ── */
#wp-station {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  min-width: 0;
  flex: 1;
}
#wp-art {
  width: 40px; height: 40px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: var(--wp-text3);
}
#wp-art img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
#wp-art svg { width: 18px; height: 18px; }
#wp-info { min-width: 0; flex: 1; }
#wp-name {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--wp-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.2px;
}
#wp-meta {
  font-size: 0.6rem;
  color: var(--wp-text3);
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
#wp-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.55rem;
  letter-spacing: 1.5px;
  margin-top: 2px;
}
#wp-status-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--wp-text3);
  flex-shrink: 0;
}
#wp-status-dot.wp-live {
  background: var(--wp-accent);
  animation: wp-blink 1.4s step-end infinite;
  box-shadow: 0 0 4px rgba(200,71,42,0.5);
}
#wp-status-dot.wp-loading {
  background: #eab308;
  animation: wp-blink 0.6s step-end infinite;
}
@keyframes wp-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
#wp-status-text { color: var(--wp-text3); }

/* ── Controls — center ── */
#wp-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  flex-shrink: 0;
}
.wp-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: none;
  background: none;
  color: var(--wp-text2);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s, background 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.wp-btn:hover { color: var(--wp-text); background: rgba(255,255,255,0.07); }
.wp-btn:active { transform: scale(0.9); }
.wp-btn svg { width: 16px; height: 16px; }
#wp-play-btn {
  width: 44px; height: 44px;
  background: var(--wp-accent);
  color: #fff;
  box-shadow: 0 4px 12px rgba(200,71,42,0.35);
}
#wp-play-btn:hover {
  background: #d95030;
  box-shadow: 0 6px 16px rgba(200,71,42,0.45);
}
#wp-play-btn svg { width: 18px; height: 18px; }

/* ── Volume — right ── */
#wp-vol {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  flex-shrink: 0;
}
#wp-mute-btn {
  width: 28px; height: 28px;
  border: none; background: none;
  color: var(--wp-text3);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px;
  transition: color 0.15s;
}
#wp-mute-btn:hover { color: var(--wp-text2); }
#wp-mute-btn svg { width: 15px; height: 15px; }
#wp-vol-slider {
  width: 80px;
  appearance: none;
  height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,0.12);
  outline: none;
  cursor: pointer;
}
#wp-vol-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--wp-text);
  cursor: pointer;
}
#wp-vol-slider::-moz-range-thumb {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--wp-text);
  border: none;
  cursor: pointer;
}

/* ── EQ bars ── */
#wp-eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
  padding: 0 4px;
}
#wp-eq span {
  width: 3px;
  border-radius: 1px 1px 0 0;
  background: var(--wp-accent);
  height: 4px;
  transition: height 0.1s;
  opacity: 0.7;
}
#wp-eq.wp-playing span:nth-child(1) { animation: wp-eq1 0.6s ease-in-out infinite alternate; }
#wp-eq.wp-playing span:nth-child(2) { animation: wp-eq2 0.4s ease-in-out infinite alternate; }
#wp-eq.wp-playing span:nth-child(3) { animation: wp-eq3 0.7s ease-in-out infinite alternate; }
@keyframes wp-eq1 { 0%{height:4px} 100%{height:14px} }
@keyframes wp-eq2 { 0%{height:8px} 100%{height:4px} }
@keyframes wp-eq3 { 0%{height:4px} 100%{height:12px} }

/* ── Responsive ── */
@media (max-width: 600px) {
  #wp-vol { display: none; }
  #wp-controls { padding: 0 8px; }
  #wp-station { padding: 0 10px; }
  #wp-art { width: 34px; height: 34px; }
  .wp-btn { width: 32px; height: 32px; }
  #wp-play-btn { width: 40px; height: 40px; }
}
@media (max-width: 400px) {
  #wp-eq { display: none; }
  #wp-name { font-size: 0.72rem; }
}
`;

/* ═══════════════════════════════════════════════════
   HTML TEMPLATE
═══════════════════════════════════════════════════ */
function playerHTML() {
  return `
<div id="wp-progress"><div id="wp-progress-fill"></div></div>

<div id="wp-station">
  <div id="wp-art">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72"/>
      <path d="M12 2a10 10 0 010 20"/>
    </svg>
  </div>
  <div id="wp-info">
    <div id="wp-name">Network Standby</div>
    <div id="wp-meta">WNCORE GLOBAL ARRAY</div>
    <div id="wp-status">
      <span id="wp-status-dot"></span>
      <span id="wp-status-text">SELECT A STATION</span>
    </div>
  </div>
</div>

<div id="wp-controls">
  <button class="wp-btn" id="wp-prev-btn" aria-label="Previous station" title="Previous">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
  </button>
  <button class="wp-btn" id="wp-play-btn" aria-label="Play / Pause">
    <svg id="wp-play-svg" viewBox="0 0 24 24" fill="currentColor">
      <path id="wp-play-path" d="M8 5v14l11-7z"/>
    </svg>
  </button>
  <button class="wp-btn" id="wp-next-btn" aria-label="Next station" title="Next">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/></svg>
  </button>
  <div id="wp-eq"><span></span><span></span><span></span></div>
</div>

<div id="wp-vol">
  <button id="wp-mute-btn" aria-label="Mute">
    <svg id="wp-vol-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path id="wp-vol-wave" d="M15.54 8.46a5 5 0 010 7.07"/>
    </svg>
  </button>
  <input type="range" id="wp-vol-slider" min="0" max="1" step="0.01" value="0.8" aria-label="Volume">
</div>`;
}

/* ═══════════════════════════════════════════════════
   AUDIO ENGINE
═══════════════════════════════════════════════════ */
function getOrCreateAudio() {
  // On main site: reuse existing #audio element
  const existing = document.getElementById('audio');
  if (existing) {
    P.standalone = false;
    return existing;
  }
  // Standalone: create our own
  const au = document.createElement('audio');
  au.id = 'wncore-player-audio';
  au.preload = 'none';
  au.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;visibility:hidden';
  au.setAttribute('aria-hidden', 'true');
  document.body.appendChild(au);
  return au;
}

function playUrl(url, station) {
  if (!url) return;

  // iOS AudioContext unlock
  if (window.AudioContext || window.webkitAudioContext) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch(e) {}
  }

  // On main site: delegate to existing playStation if available
  if (!P.standalone && typeof window.playStation === 'function') {
    window.playStation(url, station.name, station.country || '—', '📻', station.favicon || null);
    P.station  = station;
    P.isLoading = true;
    setStatus('loading');
    updateArt(station);
    updateName(station);
    saveLastStation(station);
    return;
  }

  // Standalone engine
  P.isLoading = true;
  P.station = station;
  setStatus('loading');
  updateArt(station);
  updateName(station);
  saveLastStation(station);

  // Crossfade: brief volume ramp down on current, then switch
  if (P.isPlaying && !P.crossfading) {
    P.crossfading = true;
    let vol = P.volume;
    const step = vol / 8;
    const fade = setInterval(() => {
      vol = Math.max(0, vol - step);
      P.audio.volume = vol;
      if (vol <= 0) {
        clearInterval(fade);
        P.crossfading = false;
        _loadAndPlay(url);
      }
    }, 40);
  } else {
    _loadAndPlay(url);
  }
}

function _loadAndPlay(url) {
  P.audio.pause();
  P.audio.src = '';
  P.audio.src = url;
  P.audio.load();
  P.audio.volume = P.muted ? 0 : P.volume;
  const promise = P.audio.play();
  if (promise) {
    promise.then(() => {
      // Crossfade in
      P.audio.volume = 0;
      let vol = 0;
      const step = P.volume / 10;
      const fadeIn = setInterval(() => {
        vol = Math.min(P.volume, vol + step);
        P.audio.volume = P.muted ? 0 : vol;
        if (vol >= P.volume) clearInterval(fadeIn);
      }, 30);
    }).catch(err => {
      console.warn('[WNCORE_PLAYER] play() failed:', err);
      setStatus('standby');
      P.isLoading = false;
    });
  }
}

/* ═══════════════════════════════════════════════════
   QUEUE
═══════════════════════════════════════════════════ */
async function loadDefaultQueue() {
  try {
    const mirror = API_MIRRORS[0];
    const r = await fetch(`${mirror}/stations/search?limit=20&https=true&order=clickcount&reverse=true`);
    const stations = await r.json();
    P.queue = stations.filter(s => s.url_resolved);
    saveQueue();
  } catch(e) {
    P.queue = [];
  }
}

function saveQueue() {
  try {
    localStorage.setItem(STORAGE.QUEUE, JSON.stringify(
      P.queue.slice(0,10).map(s=>({
        name:s.name, url_resolved:s.url_resolved,
        country:s.country, countrycode:s.countrycode,
        favicon:s.favicon||'', stationuuid:s.stationuuid||'',
        tags:s.tags||''
      }))
    ));
  } catch(e) {}
}

function loadQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(STORAGE.QUEUE) || '[]');
    if (q.length) P.queue = q;
  } catch(e) {}
}

function playNext() {
  if (!P.queue.length) { loadDefaultQueue().then(() => { if (P.queue.length) _playQueued(0); }); return; }
  P.queueIdx = (P.queueIdx + 1) % P.queue.length;
  _playQueued(P.queueIdx);
}

function playPrev() {
  if (!P.queue.length) return;
  P.queueIdx = (P.queueIdx - 1 + P.queue.length) % P.queue.length;
  _playQueued(P.queueIdx);
}

function _playQueued(idx) {
  const st = P.queue[idx];
  if (st) playUrl(st.url_resolved, st);
}

/* ═══════════════════════════════════════════════════
   PERSISTENCE
═══════════════════════════════════════════════════ */
function saveLastStation(st) {
  try { localStorage.setItem(STORAGE.LAST_STATION, JSON.stringify(st)); } catch(e) {}
}

function loadLastStation() {
  try { return JSON.parse(localStorage.getItem(STORAGE.LAST_STATION) || 'null'); } catch(e) { return null; }
}

function saveVolume(v) {
  try { localStorage.setItem(STORAGE.VOLUME, String(v)); } catch(e) {}
}

function loadVolume() {
  try {
    const v = parseFloat(localStorage.getItem(STORAGE.VOLUME) || '0.8');
    return isNaN(v) ? 0.8 : Math.min(1, Math.max(0, v));
  } catch(e) { return 0.8; }
}

/* ═══════════════════════════════════════════════════
   UI UPDATES
═══════════════════════════════════════════════════ */
function setStatus(state) {
  const dot  = document.getElementById('wp-status-dot');
  const text = document.getElementById('wp-status-text');
  const fill = document.getElementById('wp-progress-fill');
  const eq   = document.getElementById('wp-eq');

  if (!dot) return;
  dot.className = 'wp-status-dot';
  if (fill) fill.className = '';

  if (state === 'live') {
    dot.classList.add('wp-live');
    if (text) text.textContent = 'LIVE';
    if (fill) fill.classList.add('wp-playing');
    if (eq)   eq.classList.add('wp-playing');
  } else if (state === 'loading') {
    dot.classList.add('wp-loading');
    if (text) text.textContent = 'CONNECTING…';
    if (fill) fill.classList.add('wp-buffering');
    if (eq)   eq.classList.remove('wp-playing');
  } else {
    if (text) text.textContent = 'STANDBY';
    if (eq)   eq.classList.remove('wp-playing');
  }
}

function setPlayIcon(playing) {
  const path = document.getElementById('wp-play-path');
  if (path) {
    path.setAttribute('d', playing
      ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z'  // pause
      : 'M8 5v14l11-7z'                       // play
    );
  }
}

function updateArt(st) {
  const art = document.getElementById('wp-art');
  if (!art) return;
  const fallback = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72"/><path d="M12 2a10 10 0 010 20"/></svg>';
  if (st?.favicon && st.favicon.startsWith('http')) {
    if (window.WNCORE && typeof window.WNCORE.safeSetImage === 'function') {
      window.WNCORE.safeSetImage(art, st.favicon, st.title || '', fallback);
    } else {
      // fallback to safe DOM approach
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = function(){ art.innerHTML = fallback; };
      try { img.src = st.favicon; art.innerHTML = ''; art.appendChild(img); } catch(e){ art.innerHTML = fallback; }
    }
  } else {
    art.innerHTML = fallback;
  }
}

function updateName(st) {
  const name = document.getElementById('wp-name');
  const meta = document.getElementById('wp-meta');
  if (name) name.textContent = st?.name || 'Network Standby';
  if (meta) {
    const flag = countryFlag(st?.countrycode);
    const tags = (st?.tags || '').split(',').slice(0,2).filter(Boolean).join(' · ');
    meta.textContent = [flag, st?.country, tags].filter(Boolean).join(' · ') || 'WNCORE GLOBAL ARRAY';
  }
}

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '🌐';
  try {
    return String.fromCodePoint(...[...cc.toUpperCase()].map(c => c.charCodeAt(0) + 127397));
  } catch { return '🌐'; }
}

/* ═══════════════════════════════════════════════════
   EVENT BRIDGE — sync with main site's existing player
═══════════════════════════════════════════════════ */
function bridgeToMainSite() {
  if (P.standalone) return;

  // Listen for main site station changes
  document.addEventListener('wncore-station-changed', e => {
    if (!e.detail) return;
    P.station = e.detail;
    updateArt(e.detail);
    updateName(e.detail);
    setStatus('loading');
  });

  // Watch main site's isPlaying state
  const au = P.audio;
  if (au) {
    au.addEventListener('play',    () => { P.isPlaying=true;  P.isLoading=false; setPlayIcon(true);  setStatus('live'); });
    au.addEventListener('pause',   () => { P.isPlaying=false;                    setPlayIcon(false); setStatus('standby'); });
    au.addEventListener('waiting', () => { setStatus('loading'); });
    au.addEventListener('playing', () => { P.isPlaying=true; P.isLoading=false;  setPlayIcon(true);  setStatus('live'); });
    au.addEventListener('error',   () => { P.isLoading=false; setStatus('standby'); });
  }

  // Sync name/meta from existing updateUI (main site fires this)
  const _origUpdateUI = window.updateUI;
  if (typeof _origUpdateUI === 'function') {
    window.updateUI = function(name, meta, emoji, favicon) {
      _origUpdateUI.apply(this, arguments);
      updateName({ name, country: meta, favicon });
      updateArt({ favicon });
    };
  }
}

/* ═══════════════════════════════════════════════════
   MOUNT
═══════════════════════════════════════════════════ */
function mount() {
  if (P.mounted) return;
  P.mounted = true;

  // Inject CSS
  if (!document.getElementById(CSS_ID)) {
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = PLAYER_CSS;
    document.head.appendChild(style);
  }

  // Create player DOM
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Audio player');
    root.innerHTML = playerHTML();
    document.body.appendChild(root);
  }

  // Get audio element
  P.audio = getOrCreateAudio();

  // Load volume
  P.volume = loadVolume();
  const volSlider = document.getElementById('wp-vol-slider');
  if (volSlider) volSlider.value = P.volume;

  // Event listeners
  document.getElementById('wp-play-btn')?.addEventListener('click', togglePlay);
  document.getElementById('wp-next-btn')?.addEventListener('click', playNext);
  document.getElementById('wp-prev-btn')?.addEventListener('click', playPrev);

  document.getElementById('wp-mute-btn')?.addEventListener('click', () => {
    P.muted = !P.muted;
    P.audio.volume = P.muted ? 0 : P.volume;
    const wave = document.getElementById('wp-vol-wave');
    if (wave) wave.style.opacity = P.muted ? '0' : '1';
  });

  if (volSlider) {
    volSlider.addEventListener('input', e => {
      P.volume = parseFloat(e.target.value);
      if (!P.muted) P.audio.volume = P.volume;
      saveVolume(P.volume);
    });
  }

  // Audio event listeners (standalone mode)
  if (P.standalone) {
    P.audio.addEventListener('play',    () => { P.isPlaying=true;  P.isLoading=false; setPlayIcon(true);  setStatus('live'); dispatch('wncore-play'); });
    P.audio.addEventListener('pause',   () => { P.isPlaying=false;                    setPlayIcon(false); setStatus('standby'); dispatch('wncore-pause'); });
    P.audio.addEventListener('waiting', () => setStatus('loading'));
    P.audio.addEventListener('playing', () => { P.isPlaying=true; P.isLoading=false;  setPlayIcon(true);  setStatus('live'); });
    P.audio.addEventListener('error',   () => { P.isLoading=false; setStatus('standby'); });
    P.audio.addEventListener('ended',   () => { P.isPlaying=false; setPlayIcon(false); setStatus('standby'); });
  } else {
    bridgeToMainSite();
  }

  // Load state
  loadQueue();
  const last = loadLastStation();
  if (last) {
    P.station = last;
    updateName(last);
    updateArt(last);
  }

  // Show player
  requestAnimationFrame(() => {
    root.classList.add('wp-visible');
    document.body.classList.add('wncore-player-active');
  });

  // On main site: don't show our bar if the existing .player-bar is already there
  // Instead just use our bar as the sync target only on other pages
  const existingBar = document.querySelector('.player-bar');
  if (existingBar && !P.standalone) {
    root.style.display = 'none'; // hide universal bar on main site
    document.body.classList.remove('wncore-player-active');
  }
}

function togglePlay() {
  if (!P.standalone && typeof window.togglePlay === 'function') {
    window.togglePlay(); return;
  }
  if (!P.station) {
    if (P.queue.length) { P.queueIdx = 0; _playQueued(0); }
    else loadDefaultQueue().then(() => { if (P.queue.length) { P.queueIdx=0; _playQueued(0); } });
    return;
  }
  if (P.isPlaying) {
    P.audio.pause();
  } else {
    P.audio.play().catch(() => {});
  }
}

function dispatch(name, detail) {
  try { document.dispatchEvent(new CustomEvent(name, { detail: detail || P.station })); } catch(e) {}
}

/* ═══════════════════════════════════════════════════
   PUBLIC API
═══════════════════════════════════════════════════ */
window.WNCORE_PLAYER = {
  mount,
  play  : (url, station) => playUrl(url, station || { name: url, url_resolved: url }),
  pause : () => { P.standalone ? P.audio.pause() : (typeof window.togglePlay === 'function' && !window.isPlaying ? null : window.togglePlay?.()); },
  next  : playNext,
  prev  : playPrev,
  setQueue : (stations) => {
    P.queue = stations.filter(s => s.url_resolved);
    P.queueIdx = -1;
    saveQueue();
  },
  getState : () => ({
    station : P.station,
    playing : P.isPlaying,
    volume  : P.volume,
    queue   : P.queue,
    queueIdx: P.queueIdx,
  }),
  setVolume : (v) => {
    P.volume = Math.min(1, Math.max(0, v));
    if (P.audio) P.audio.volume = P.muted ? 0 : P.volume;
    const s = document.getElementById('wp-vol-slider');
    if (s) s.value = P.volume;
    saveVolume(P.volume);
  },
};

/* Auto-mount when DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

})();