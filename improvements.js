/* ═══════════════════════════════════════════════════════
   WNCORE RADIO — improvements.js
   All 26 feature additions across 4 groups.
   Wrongness level: MODERATE — deniable but persistent.
═══════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════════════
// GROUP 1 — NAVIGATION & DISCOVERY (items 1–7)
// ═══════════════════════════════════════════════════════

// ─── 1. KEYBOARD SHORTCUTS ───────────────────────────────────────────────
const KB_SHORTCUTS = [
  { key: 'K',       desc: 'Play / Pause' },
  { key: 'N',       desc: 'Next station' },
  { key: 'P',       desc: 'Previous station' },
  { key: 'F',       desc: 'Favourite current station' },
  { key: '/',       desc: 'Open search' },
  { key: 'Ctrl K',  desc: 'Open search (alt)' },
  { key: 'M',       desc: 'Mute / Unmute' },
  { key: 'D',       desc: 'Toggle dark mode' },
  { key: 'G',       desc: 'Go to Genres' },
  { key: 'H',       desc: 'Go to Home' },
  { key: '?',       desc: 'Show this panel' },
  { key: 'Esc',     desc: 'Close any panel' },
];
// WRONGNESS: ghost entry appears at random, does nothing
const KB_GHOST = { key: 'Ctrl 9',  desc: 'Override node frequency' };

function buildKbModal() {
  const el = document.createElement('div');
  el.id = 'kb-modal';
  el.className = 'kb-modal-backdrop';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Keyboard shortcuts');
  el.innerHTML = `
    <div class="kb-box">
      <div class="kb-header">
        <span class="kb-title">Keyboard Shortcuts</span>
        <button class="kb-close" onclick="closeKbModal()" aria-label="Close">✕</button>
      </div>
      <div class="kb-grid" id="kb-shortcut-grid"></div>
      <div class="kb-footer">Press <kbd>Esc</kbd> or click outside to close</div>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) closeKbModal(); });
  document.body.appendChild(el);
  renderKbGrid();
}

function renderKbGrid() {
  const grid = document.getElementById('kb-shortcut-grid');
  if (!grid) return;
  // Moderate wrongness: inject ghost entry ~30% of the time the modal opens
  const entries = [...KB_SHORTCUTS];
  if (Math.random() < 0.30) {
    const pos = 3 + Math.floor(Math.random() * (entries.length - 3));
    entries.splice(pos, 0, KB_GHOST);
  }
  grid.innerHTML = entries.map(s =>
    `<div class="kb-row"><kbd>${s.key}</kbd><span>${s.desc}</span></div>`
  ).join('');
}

function openKbModal() {
  const m = document.getElementById('kb-modal');
  if (!m) { buildKbModal(); }
  renderKbGrid(); // re-render each open for ghost variation
  document.getElementById('kb-modal').classList.add('open');
}
function closeKbModal() {
  const m = document.getElementById('kb-modal');
  if (m) m.classList.remove('open');
}
window.openKbModal = openKbModal;
window.closeKbModal = closeKbModal;

// Wire keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();

  if (k === '?') { e.preventDefault(); openKbModal(); return; }
  if (k === 'escape') { closeKbModal(); return; }
  if (k === 'k') { e.preventDefault(); if (typeof togglePlay === 'function') togglePlay(); return; }
  if (k === 'n') { e.preventDefault(); if (typeof skipStation === 'function') skipStation(1); return; }
  if (k === 'p') { e.preventDefault(); if (typeof skipStation === 'function') skipStation(-1); return; }
  if (k === 'm') { e.preventDefault(); toggleMute(); return; }
  if (k === 'd') { e.preventDefault(); if (typeof toggleDark === 'function') toggleDark(); return; }
  if (k === 'f') { e.preventDefault(); favCurrentStation(); return; }
  if (k === 'g') { e.preventDefault(); if (typeof showPage === 'function') showPage('genres', null); return; }
  if (k === 'h') { e.preventDefault(); if (typeof showPage === 'function') showPage('home', null); return; }
  if (k === '/') {
    e.preventDefault();
    if (typeof openSearch === 'function') openSearch();
    return;
  }
});

let _muted = false, _premuteVol = 0.8;
function toggleMute() {
  const slider = document.getElementById('vol-slider');
  const au = document.getElementById('audio');
  if (!slider || !au) return;
  if (_muted) { au.volume = _premuteVol; slider.value = _premuteVol; _muted = false; }
  else { _premuteVol = au.volume || 0.8; au.volume = 0; slider.value = 0; _muted = true; }
}


// ─── 2. RECENTLY PLAYED HISTORY ──────────────────────────────────────────
const HISTORY_KEY = 'wncore-history-v2';
const HISTORY_MAX = 15;
// WRONGNESS ghost station names injected occasionally
const GHOST_HISTORY_NAMES = ['NODE_09 Broadcast', '88.7 FM', 'SIGNAL_KAGE', 'FREQUENCY UNKNOWN'];
let _historyGhostInjected = false;

function historyLoad() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function historySave(arr) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, HISTORY_MAX))); } catch {}
}
function historyPush(station) {
  if (!station || !station.name) return;
  let h = historyLoad();
  h = h.filter(s => s.url !== station.url);
  h.unshift({ ...station, ts: Date.now() });
  historySave(h);
  renderHistorySidebar();
}

function renderHistorySidebar() {
  const el = document.getElementById('history-list');
  if (!el) return;
  let h = historyLoad();
  if (!h.length) {
    el.innerHTML = '<div class="hist-empty">No stations played yet</div>';
    return;
  }
  // WRONGNESS: ~25% chance one entry shows ghost name, clears after 600ms
  let ghostIdx = -1;
  if (Math.random() < 0.25 && !_historyGhostInjected) {
    ghostIdx = Math.floor(Math.random() * Math.min(h.length, 5));
    _historyGhostInjected = true;
    setTimeout(() => { _historyGhostInjected = false; renderHistorySidebar(); }, 600);
  }

  el.innerHTML = h.map((s, i) => {
    const displayName = (i === ghostIdx)
      ? GHOST_HISTORY_NAMES[Math.floor(Math.random() * GHOST_HISTORY_NAMES.length)]
      : escHtmlImp(s.name);
    const ago = timeAgo(s.ts);
    return `<div class="hist-item" onclick="historyPlay(${i})">
      <div class="hist-icon">${s.emoji || '📻'}</div>
      <div class="hist-info">
        <div class="hist-name">${displayName}</div>
        <div class="hist-meta">${escHtmlImp(s.meta || '')} · ${ago}</div>
      </div>
    </div>`;
  }).join('');
}

function historyPlay(idx) {
  const h = historyLoad();
  const s = h[idx];
  if (!s) return;
  if (typeof playStation === 'function') playStation(s.url, s.name, s.meta, s.emoji);
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function escHtmlImp(t) {
  return String(t).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ─── 3. STATION PREVIEW ON HOVER ──────────────────────────────────────────
let _previewTimeout = null, _previewEl = null;

function buildPreviewCard() {
  if (_previewEl) return;
  _previewEl = document.createElement('div');
  _previewEl.id = 'station-preview';
  _previewEl.className = 'station-preview';
  _previewEl.innerHTML = `
    <div class="sp-name" id="sp-name"></div>
    <div class="sp-row"><span class="sp-label">Country</span><span id="sp-country"></span></div>
    <div class="sp-row"><span class="sp-label">Language</span><span id="sp-lang"></span></div>
    <div class="sp-row"><span class="sp-label">Bitrate</span><span id="sp-bitrate"></span></div>
    <div class="sp-row"><span class="sp-label">Codec</span><span id="sp-codec"></span></div>
    <div class="sp-tags" id="sp-tags"></div>
    <div class="sp-hint">Click row to play</div>`;
  document.body.appendChild(_previewEl);
}

function attachPreviewToTable(stations, tbodyId) {
  buildPreviewCard();
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  rows.forEach((tr, i) => {
    const s = stations[i];
    if (!s) return;
    tr.addEventListener('mouseenter', evt => {
      _previewTimeout = setTimeout(() => showPreview(s, evt), 800);
    });
    tr.addEventListener('mouseleave', () => {
      clearTimeout(_previewTimeout);
      hidePreview();
    });
    tr.addEventListener('mousemove', evt => {
      if (_previewEl && _previewEl.classList.contains('visible')) {
        positionPreview(evt);
      }
    });
  });
}

function showPreview(s, evt) {
  if (!_previewEl) return;
  document.getElementById('sp-name').textContent = s.name;
  document.getElementById('sp-country').textContent = s.country || '—';
  document.getElementById('sp-lang').textContent = s.language || '—';
  document.getElementById('sp-bitrate').textContent = s.bitrate ? s.bitrate + ' kbps' : '—';
  document.getElementById('sp-codec').textContent = s.codec || '—';
  const tags = (s.tags || '').split(',').slice(0, 4).filter(t => t.trim());
  document.getElementById('sp-tags').innerHTML = tags.map(t =>
    `<span class="sp-tag">${escHtmlImp(t.trim())}</span>`).join('');
  positionPreview(evt);
  _previewEl.classList.add('visible');
}

function positionPreview(evt) {
  if (!_previewEl) return;
  const x = evt.clientX + 16;
  const y = evt.clientY - 30;
  const w = _previewEl.offsetWidth || 220;
  const h = _previewEl.offsetHeight || 160;
  _previewEl.style.left = (x + w > window.innerWidth ? x - w - 32 : x) + 'px';
  _previewEl.style.top  = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + 'px';
}

function hidePreview() {
  if (_previewEl) _previewEl.classList.remove('visible');
}

// ─── 4. FEELING LUCKY ────────────────────────────────────────────────────
// WRONGNESS: 1 in 40 triggers 88.7 FM instead
async function feelingLucky() {
  const btn = document.getElementById('lucky-btn');
  if (btn) btn.classList.add('spinning');

  // WRONGNESS: 1-in-40 chance
  if (Math.random() < (1/40)) {
    setTimeout(() => {
      if (btn) btn.classList.remove('spinning');
      if (typeof play887Static === 'function') play887Static();
      if (window.WRONGNESS) window.WRONGNESS.spike(15);
    }, 600);
    return;
  }

  try {
    const offset = Math.floor(Math.random() * 8000);
    const r = await fetch(
      `${(typeof _a !== "undefined" ? _a : "https://de1.api.radio-browser.info/json")}/stations/search?limit=1&https=true&offset=${offset}&order=random`
    );
    const stations = await r.json();
    if (stations.length && typeof playStation === 'function') {
      const s = stations[0];
      const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(s.countrycode) : '📻';
      playStation(s.url_resolved, s.name, s.country || 'Unknown', emoji);
      showToast(`🎲 Tuned to: ${s.name}`, 'info');
    }
  } catch {
    showToast('Signal lost — try again', 'warn');
  } finally {
    if (btn) setTimeout(() => btn.classList.remove('spinning'), 600);
  }
}
window.feelingLucky = feelingLucky;

// ─── 5. GENRE QUICK-JUMP (A–Z sidebar on genres page) ────────────────────
function buildGenreAZ() {
  const page = document.getElementById('page-genres');
  if (!page || document.getElementById('genre-az-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'genre-az-sidebar';
  sidebar.className = 'genre-az-sidebar';
  // Letters A–Z
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
  sidebar.innerHTML = letters.map(l =>
    `<button class="az-btn" onclick="jumpToGenreLetter('${l}')">${l}</button>`
  ).join('');
  page.style.position = 'relative';
  page.appendChild(sidebar);
}

function jumpToGenreLetter(letter) {
  const cards = document.querySelectorAll('#genre-grid .genre-card');
  for (const card of cards) {
    const name = card.querySelector('.gc-name')?.textContent || '';
    if (letter === '#' || name.toUpperCase().startsWith(letter)) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('az-flash');
      setTimeout(() => card.classList.remove('az-flash'), 700);
      return;
    }
  }
}
window.jumpToGenreLetter = jumpToGenreLetter;

// ─── 6. COUNTRY FILTER ON HOME PAGE ──────────────────────────────────────
let _activeCountryFilter = '';

function buildCountryFilter() {
  const strip = document.querySelector('.genre-strip');
  if (!strip || document.getElementById('country-filter')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'country-filter-wrap';
  wrapper.className = 'country-filter-wrap';
  wrapper.innerHTML = `
    <label class="cf-label">Filter by country:</label>
    <select id="country-filter" class="country-filter-select" onchange="applyCountryFilter(this.value)">
      <option value="">All countries</option>
    </select>`;
  strip.after(wrapper);
  populateCountryFilter();
}

async function populateCountryFilter() {
  try {
    const r = await fetch('https://all.api.radio-browser.info/json/countries?order=name&limit=200');
    const countries = await r.json();
    const sel = document.getElementById('country-filter');
    if (!sel) return;
    countries.slice(0, 80).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.name} (${c.stationcount})`;
      sel.appendChild(opt);
    });
  } catch {}
}

async function applyCountryFilter(country) {
  _activeCountryFilter = country;
  const tbody = document.getElementById('station-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Filtering...</td></tr>';
  try {
    const url = country
      ? `https://all.api.radio-browser.info/json/stations/search?limit=30&https=true&country=${encodeURIComponent(country)}&order=clickcount&reverse=true`
      : `https://all.api.radio-browser.info/json/stations/search?limit=30&https=true&order=clickcount&reverse=true`;
    const r = await fetch(url);
    const stations = await r.json();
    if (typeof renderTable === 'function') renderTable(stations, 'station-tbody');
    attachPreviewToTable(stations, 'station-tbody');
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Signal lost — try again</td></tr>';
  }
}
window.applyCountryFilter = applyCountryFilter;

// ─── 7. COLLAPSIBLE SIDEBAR ───────────────────────────────────────────────
function buildSidebarToggle() {
  const sidebar = document.querySelector('.now-playing-sidebar, .np-sidebar, [class*="sidebar"]');
  if (!sidebar || document.getElementById('sidebar-toggle-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'sidebar-toggle-btn';
  btn.className = 'sidebar-toggle-btn';
  btn.setAttribute('aria-label', 'Collapse sidebar');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>`;
  btn.onclick = () => toggleSidebar();
  sidebar.prepend(btn);
}

let _sidebarCollapsed = false;
function toggleSidebar() {
  const sidebar = document.querySelector('.now-playing-sidebar, .np-sidebar, [class*="sidebar"]');
  if (!sidebar) return;
  _sidebarCollapsed = !_sidebarCollapsed;
  sidebar.classList.toggle('collapsed', _sidebarCollapsed);
  try { localStorage.setItem('wncore-sidebar', _sidebarCollapsed ? '1' : '0'); } catch {}
  const btn = document.getElementById('sidebar-toggle-btn');
  if (btn) {
    btn.innerHTML = _sidebarCollapsed
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>`;
  }
}
try {
  if (localStorage.getItem('wncore-sidebar') === '1') {
    _sidebarCollapsed = false; // re-enable on load so it doesn't hide content
  }
} catch {}


// ═══════════════════════════════════════════════════════
// GROUP 2 — PLAYER & LISTENING (items 8–14)
// ═══════════════════════════════════════════════════════

// ─── 8. SLEEP TIMER WITH VISUAL COUNTDOWN ────────────────────────────────
const SLEEP_OPTIONS = [15, 30, 45, 60]; // minutes
let _sleepTimerId = null, _sleepEndTime = null, _sleepTickId = null;
let _sleepIdx = -1;

function cycleSleepTimer() {
  _sleepIdx = (_sleepIdx + 1) % (SLEEP_OPTIONS.length + 1); // +1 for "off"
  if (_sleepIdx === SLEEP_OPTIONS.length) {
    // Turn off
    clearTimeout(_sleepTimerId);
    clearInterval(_sleepTickId);
    _sleepEndTime = null;
    updateSleepDisplay(null);
    showToast('Sleep timer off', 'info');
    return;
  }
  const mins = SLEEP_OPTIONS[_sleepIdx];
  clearTimeout(_sleepTimerId);
  clearInterval(_sleepTickId);
  _sleepEndTime = Date.now() + mins * 60000;

  _sleepTimerId = setTimeout(() => {
    const au = document.getElementById('audio');
    if (au) au.pause();
    if (typeof setPlayIcon === 'function') setPlayIcon(false);
    clearInterval(_sleepTickId);
    _sleepEndTime = null;
    updateSleepDisplay(null);
    showToast('Sleep timer ended — good night.', 'info');
  }, mins * 60000);

  _sleepTickId = setInterval(() => updateSleepDisplay(_sleepEndTime), 1000);
  updateSleepDisplay(_sleepEndTime);
  showToast(`Sleep timer: ${mins} minutes`, 'info');
}

function updateSleepDisplay(endTime) {
  const ring = document.getElementById('sleep-ring');
  const label = document.getElementById('sleep-label');
  if (!ring || !label) return;
  if (!endTime) {
    ring.style.display = 'none';
    label.textContent = '';
    return;
  }
  const rem = Math.max(0, endTime - Date.now());
  const mins = Math.floor(rem / 60000);
  const secs = Math.floor((rem % 60000) / 1000);
  label.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  ring.style.display = 'block';
  // WRONGNESS: countdown occasionally skips from 3 to 1
  if (mins === 0 && secs === 3 && Math.random() < 0.35) {
    label.textContent = '0:01';
  }
}
window.cycleSleepTimer = cycleSleepTimer;

// Inject sleep ring into player bar
function injectSleepRing() {
  const sleepBtn = document.querySelector('[onclick*="toggleSleepTimer"], [onclick*="cycleSleepTimer"]');
  if (!sleepBtn || document.getElementById('sleep-ring')) return;

  sleepBtn.setAttribute('onclick', 'cycleSleepTimer()');

  const ring = document.createElement('div');
  ring.id = 'sleep-ring';
  ring.className = 'sleep-ring';
  ring.style.display = 'none';
  ring.innerHTML = `<svg viewBox="0 0 36 36" class="sleep-ring-svg"><circle class="sleep-ring-bg" cx="18" cy="18" r="15"/><circle class="sleep-ring-fill" id="sleep-ring-arc" cx="18" cy="18" r="15"/></svg><span id="sleep-label" class="sleep-label"></span>`;
  sleepBtn.parentNode.insertBefore(ring, sleepBtn.nextSibling);
}

// ─── 9. VOLUME MEMORY ────────────────────────────────────────────────────
function initVolumeMemory() {
  const slider = document.getElementById('vol-slider');
  const au = document.getElementById('audio');
  if (!slider || !au) return;
  try {
    const saved = parseFloat(localStorage.getItem('wncore-vol') || '0.8');
    slider.value = saved;
    au.volume = saved;
  } catch {}
  slider.addEventListener('input', e => {
    try { localStorage.setItem('wncore-vol', e.target.value); } catch {}
  });
}

// ─── 10. BITRATE BADGE IN PLAYER BAR ─────────────────────────────────────
function showBitrateInPlayer(station) {
  let badge = document.getElementById('pb-bitrate-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'pb-bitrate-badge';
    badge.className = 'pb-bitrate-badge';
    const meta = document.getElementById('pb-meta');
    if (meta) meta.parentNode.insertBefore(badge, meta.nextSibling);
  }
  if (station && station.bitrate) {
    badge.textContent = station.bitrate + 'kbps';
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ─── 11. CONNECTION RETRY WITH COUNTDOWN ─────────────────────────────────
// WRONGNESS: countdown occasionally skips from 3 to 1
let _retryTimeout = null, _retryCountdown = null;

function startRetryCountdown(url, name, meta, emoji) {
  if (_retryCountdown) clearInterval(_retryCountdown);
  if (_retryTimeout) clearTimeout(_retryTimeout);
  let count = 5;
  const statusEl = document.getElementById('pb-name');
  const updateCount = () => {
    if (!statusEl) return;
    // WRONGNESS: skip 3→1
    if (count === 3 && Math.random() < 0.30) count = 1;
    statusEl.textContent = `RECONNECTING IN ${count}…`;
  };
  updateCount();
  _retryCountdown = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(_retryCountdown);
      if (typeof playStation === 'function') playStation(url, name, meta, emoji);
      return;
    }
    updateCount();
  }, 1000);
}

// ─── 12. CROSSFADE ON STATION CHANGE ─────────────────────────────────────
let _crossfadeActive = false;

function crossfadeToStation(url, name, meta, emoji) {
  const au = document.getElementById('audio');
  if (!au || _crossfadeActive || au.paused || !au.src) {
    if (typeof playStation === 'function') playStation(url, name, meta, emoji);
    return;
  }
  _crossfadeActive = true;
  const origVol = au.volume;
  const steps = 20;
  const stepTime = 1500 / steps;
  let step = 0;
  const fade = setInterval(() => {
    step++;
    au.volume = Math.max(0, origVol * (1 - step / steps));
    if (step >= steps) {
      clearInterval(fade);
      au.pause();
      au.volume = origVol;
      _crossfadeActive = false;
      if (typeof playStation === 'function') playStation(url, name, meta, emoji);
    }
  }, stepTime);
}
window.crossfadeToStation = crossfadeToStation;

// ─── 13. SIMILAR STATIONS BUTTON ─────────────────────────────────────────
async function loadSimilarStations() {
  if (!window._currentStationData) { showToast('Play a station first', 'warn'); return; }
  const s = window._currentStationData;
  const tags = (s.tags || '').split(',').filter(t => t.trim()).slice(0, 2).join(',');
  if (!tags) { showToast('No tags to match — try another station', 'warn'); return; }

  const panel = document.getElementById('similar-panel');
  const list = document.getElementById('similar-list');
  if (!panel || !list) return;
  panel.classList.add('open');
  list.innerHTML = '<div class="sim-loading">Scanning frequencies…</div>';

  try {
    const r = await fetch(`https://all.api.radio-browser.info/json/stations/search?limit=8&https=true&tag=${encodeURIComponent(tags)}&order=clickcount&reverse=true`);
    const stations = await r.json();
    const filtered = stations.filter(st => st.stationuuid !== s.stationuuid);
    if (!filtered.length) { list.innerHTML = '<div class="sim-loading">No similar signals found</div>'; return; }
    list.innerHTML = filtered.map(st => {
      const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(st.countrycode) : '📻';
      return `<div class="sim-item" onclick="playStation('${escHtmlImp(st.url_resolved)}','${escHtmlImp(st.name)}','${escHtmlImp(st.country||'Unknown')}','${emoji}');closeSimilarPanel()">
        <span class="sim-emoji">${emoji}</span>
        <div>
          <div class="sim-name">${escHtmlImp(st.name)}</div>
          <div class="sim-meta">${escHtmlImp(st.country||'—')} · ${st.bitrate?st.bitrate+'kbps':'—'}</div>
        </div>
      </div>`;
    }).join('');
  } catch {
    list.innerHTML = '<div class="sim-loading">Signal lost</div>';
  }
}

function closeSimilarPanel() {
  const p = document.getElementById('similar-panel');
  if (p) p.classList.remove('open');
}
window.loadSimilarStations = loadSimilarStations;
window.closeSimilarPanel = closeSimilarPanel;

// ─── 14. EQUALIZER PRESETS ────────────────────────────────────────────────
// WRONGNESS: "SIGNAL_KAGE Mode" preset adds subtle distortion
const EQ_PRESETS = {
  flat:       { bass: 0,   mid: 0,   treble: 0,   label: 'Flat' },
  bassboost:  { bass: 8,   mid: 1,   treble: -1,  label: 'Bass Boost' },
  vocal:      { bass: -2,  mid: 5,   treble: 3,   label: 'Vocal Boost' },
  night:      { bass: 3,   mid: -2,  treble: -4,  label: 'Night Mode' },
  broadcast:  { bass: 2,   mid: 3,   treble: 2,   label: 'Broadcast' },
  // WRONGNESS entry
  kage:       { bass: -8,  mid: 8,   treble: -8,  label: 'SIGNAL_KAGE ▒', wrongness: true },
};

let _audioCtx = null, _bassFilter = null, _midFilter = null, _trebleFilter = null, _eqConnected = false;
let _activePreset = 'flat';
let _distortionNode = null;

function initEQ() {
  const au = document.getElementById('audio');
  if (!au || _eqConnected) return;
  try {
    // CRITICAL: Reuse the shared audio context from main.js (window._sharedAudioCtx)
    // to avoid InvalidStateError from calling createMediaElementSource() twice on the same element.
    // main.js sets window._sharedAudioCtx and window._sharedSourceNode when it calls initAudioFX().
    // If that hasn't happened yet, we create the context ourselves and expose it for main.js to reuse.
    if (window._sharedAudioCtx && window._sharedSourceNode) {
      _audioCtx = window._sharedAudioCtx;
      // Re-route: source → EQ chain → main.js gain → destination
      _bassFilter   = _audioCtx.createBiquadFilter(); _bassFilter.type = 'lowshelf';  _bassFilter.frequency.value = 200;
      _midFilter    = _audioCtx.createBiquadFilter(); _midFilter.type = 'peaking';    _midFilter.frequency.value = 1000; _midFilter.Q.value = 1;
      _trebleFilter = _audioCtx.createBiquadFilter(); _trebleFilter.type = 'highshelf'; _trebleFilter.frequency.value = 4000;
      _distortionNode = _audioCtx.createWaveShaper();
      // Disconnect existing source→destination, insert EQ chain before gainNode
      try { window._sharedSourceNode.disconnect(); } catch(e) {}
      window._sharedSourceNode.connect(_bassFilter);
      _bassFilter.connect(_midFilter);
      _midFilter.connect(_trebleFilter);
      _trebleFilter.connect(_distortionNode);
      // Connect to main.js gainNode if available, else to destination
      _distortionNode.connect(window._sharedGainNode || _audioCtx.destination);
    } else {
      // main.js hasn't run initAudioFX yet — create context here and mark it as shared
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = _audioCtx.createMediaElementSource(au);
      window._sharedAudioCtx = _audioCtx;
      window._sharedSourceNode = src;
      _bassFilter   = _audioCtx.createBiquadFilter(); _bassFilter.type = 'lowshelf';  _bassFilter.frequency.value = 200;
      _midFilter    = _audioCtx.createBiquadFilter(); _midFilter.type = 'peaking';    _midFilter.frequency.value = 1000; _midFilter.Q.value = 1;
      _trebleFilter = _audioCtx.createBiquadFilter(); _trebleFilter.type = 'highshelf'; _trebleFilter.frequency.value = 4000;
      _distortionNode = _audioCtx.createWaveShaper();
      src.connect(_bassFilter);
      _bassFilter.connect(_midFilter);
      _midFilter.connect(_trebleFilter);
      _trebleFilter.connect(_distortionNode);
      _distortionNode.connect(_audioCtx.destination);
      window._sharedGainNode = null; // will be wired by main.js when it runs
    }
    _eqConnected = true;
  } catch(e) { console.warn('[EQ] initEQ failed:', e); }
}

function applyEQPreset(presetKey) {
  if (!_eqConnected) initEQ();
  const preset = EQ_PRESETS[presetKey];
  if (!preset) return;
  _activePreset = presetKey;
  if (_bassFilter)   _bassFilter.gain.value   = preset.bass;
  if (_midFilter)    _midFilter.gain.value     = preset.mid;
  if (_trebleFilter) _trebleFilter.gain.value  = preset.treble;

  // WRONGNESS: SIGNAL_KAGE mode adds waveshaper distortion
  if (_distortionNode) {
    if (preset.wrongness) {
      const curve = makeDistortionCurve(80);
      _distortionNode.curve = curve;
      if (window.WRONGNESS) window.WRONGNESS.spike(20);
      showToast('⚠ Signal anomaly detected on this frequency', 'warn');
    } else {
      _distortionNode.curve = null;
    }
  }

  // Update UI
  document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.eq-preset-btn[data-preset="${presetKey}"]`);
  if (btn) btn.classList.add('active');
}

function makeDistortionCurve(amount) {
  const n = 256, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function buildEQPanel() {
  if (document.getElementById('eq-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'eq-panel';
  panel.className = 'eq-panel';
  panel.innerHTML = `
    <div class="eq-panel-header">
      <span class="eq-panel-title">Equalizer</span>
      <button class="eq-panel-close" onclick="closeEQPanel()">✕</button>
    </div>
    <div class="eq-presets">
      ${Object.entries(EQ_PRESETS).map(([key, p]) =>
        `<button class="eq-preset-btn${p.wrongness ? ' eq-btn-ghost' : ''}${key === 'flat' ? ' active' : ''}" data-preset="${key}" onclick="applyEQPreset('${key}')">${p.label}</button>`
      ).join('')}
    </div>`;
  document.body.appendChild(panel);
}

function openEQPanel() {
  buildEQPanel();
  initEQ();
  document.getElementById('eq-panel').classList.add('open');
}
function closeEQPanel() {
  const p = document.getElementById('eq-panel');
  if (p) p.classList.remove('open');
}
window.openEQPanel = openEQPanel;
window.closeEQPanel = closeEQPanel;
window.applyEQPreset = applyEQPreset;


// ═══════════════════════════════════════════════════════
// GROUP 3 — SAVING & PERSONALIZATION (items 15–18)
// ═══════════════════════════════════════════════════════

const FAV_KEY = 'wncore-favs-v2';

function favLoad() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}
function favSave(arr) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); } catch {}
}

// ─── 15. FAVORITES PAGE ──────────────────────────────────────────────────
// WRONGNESS: one favorite occasionally shows as [REDACTED], restores on click
function buildFavoritesPage() {
  if (document.getElementById('page-favorites')) return;
  const page = document.createElement('div');
  page.id = 'page-favorites';
  page.className = 'page fav-page';
  page.innerHTML = `
    <div class="fav-wrap">
      <div class="fav-header-row">
        <div>
          <div class="fav-kicker">MY COLLECTION</div>
          <h2 class="fav-title">Saved Stations</h2>
        </div>
        <div class="fav-actions">
          <button class="fav-action-btn" onclick="exportFavorites()" title="Export favorites">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <label class="fav-action-btn" title="Import favorites">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import
            <input type="file" accept=".json" style="display:none" onchange="importFavorites(this)">
          </label>
        </div>
      </div>
      <div class="fav-grid" id="fav-grid"></div>
      <div class="fav-empty" id="fav-empty" style="display:none">
        <div class="fav-empty-icon">♡</div>
        <div class="fav-empty-title">No saved stations yet</div>
        <div class="fav-empty-sub">Press <kbd>F</kbd> while a station plays, or click the heart in the player</div>
      </div>
    </div>`;
  // Insert before about page
  const aboutPage = document.getElementById('page-about');
  if (aboutPage) aboutPage.parentNode.insertBefore(page, aboutPage);
  else document.body.appendChild(page);
}

function renderFavoritesPage() {
  const grid = document.getElementById('fav-grid');
  const empty = document.getElementById('fav-empty');
  if (!grid) return;
  const favs = favLoad();
  if (!favs.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  // WRONGNESS: ~25% of opens, one entry is [REDACTED] for 700ms
  let ghostIdx = -1;
  if (Math.random() < 0.25) {
    ghostIdx = Math.floor(Math.random() * Math.min(favs.length, 4));
    setTimeout(renderFavoritesPage, 700);
  }

  grid.innerHTML = favs.map((s, i) => {
    const displayName = i === ghostIdx ? '[REDACTED]' : escHtmlImp(s.name);
    return `<div class="fav-card">
      <div class="fav-card-emoji">${s.emoji || '📻'}</div>
      <div class="fav-card-info">
        <div class="fav-card-name">${displayName}</div>
        <div class="fav-card-meta">${escHtmlImp(s.meta || '—')}</div>
      </div>
      <div class="fav-card-actions">
        <button class="fav-play-btn" onclick="favPlayStation(${i})" aria-label="Play">▶</button>
        <button class="fav-remove-btn" onclick="favRemove(${i})" aria-label="Remove">✕</button>
      </div>
    </div>`;
  }).join('');
}

function favAdd(station) {
  const favs = favLoad();
  if (favs.find(f => f.url === station.url)) return;
  favs.unshift(station);
  favSave(favs);
  showToast(`♥ Saved: ${station.name}`, 'success');
  renderFavoritesPage();
  updateFavButton();
}

function favRemove(idx) {
  const favs = favLoad();
  favs.splice(idx, 1);
  favSave(favs);
  renderFavoritesPage();
  updateFavButton();
}

function favPlayStation(idx) {
  const favs = favLoad();
  const s = favs[idx];
  if (s && typeof playStation === 'function') playStation(s.url, s.name, s.meta, s.emoji);
}

function favCurrentStation() {
  const cs = window.currentStation;
  if (!cs) { showToast('Nothing playing', 'warn'); return; }
  const favs = favLoad();
  const existing = favs.findIndex(f => f.url === cs.url);
  if (existing !== -1) {
    favs.splice(existing, 1);
    favSave(favs);
    showToast('Removed from favourites', 'info');
    updateFavButton();
    return;
  }
  favAdd({ url: cs.url, name: cs.name, meta: cs.meta, emoji: cs.emoji });
}
window.favCurrentStation = favCurrentStation;
window.favRemove = favRemove;
window.favPlayStation = favPlayStation;

function updateFavButton() {
  const cs = window.currentStation;
  const btn = document.getElementById('pb-fav-btn');
  if (!btn || !cs) return;
  const favs = favLoad();
  const saved = favs.some(f => f.url === cs.url);
  btn.classList.toggle('active', saved);
  btn.style.color = saved ? '#e8753a' : '';
}

// ─── 16. LISTENING STATS ─────────────────────────────────────────────────
const STATS_KEY = 'wncore-stats-v1';
let _statsInterval = null;

function statsLoad() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{"totalSecs":0,"stationsTried":0,"topGenre":"—","sessions":0}'); }
  catch { return { totalSecs: 0, stationsTried: 0, topGenre: '—', sessions: 0 }; }
}
function statsSave(s) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {}
}

function statsStartTracking() {
  const st = statsLoad();
  st.sessions++;
  statsSave(st);
  if (_statsInterval) clearInterval(_statsInterval);
  _statsInterval = setInterval(() => {
    const au = document.getElementById('audio');
    if (au && !au.paused) {
      const s = statsLoad();
      s.totalSecs++;
      statsSave(s);
      updateStatsWidget();
    }
  }, 1000);
}

function statsOnPlay() {
  const s = statsLoad();
  s.stationsTried++;
  statsSave(s);
  updateStatsWidget();
}

function updateStatsWidget() {
  const el = document.getElementById('stats-widget');
  if (!el) return;
  const s = statsLoad();
  const h = Math.floor(s.totalSecs / 3600);
  const m = Math.floor((s.totalSecs % 3600) / 60);
  document.getElementById('stat-time').textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('stat-stations').textContent = s.stationsTried;
  document.getElementById('stat-sessions').textContent = s.sessions;
}

function buildStatsWidget() {
  const sidebar = document.querySelector('.np-sidebar, .now-playing-sidebar');
  if (!sidebar || document.getElementById('stats-widget')) return;
  const w = document.createElement('div');
  w.id = 'stats-widget';
  w.className = 'stats-widget';
  w.innerHTML = `
    <div class="sw-title">This Session</div>
    <div class="sw-row"><span class="sw-label">Time listened</span><span class="sw-val" id="stat-time">0m</span></div>
    <div class="sw-row"><span class="sw-label">Stations tried</span><span class="sw-val" id="stat-stations">0</span></div>
    <div class="sw-row"><span class="sw-label">Sessions</span><span class="sw-val" id="stat-sessions">1</span></div>`;
  sidebar.appendChild(w);
  updateStatsWidget();
}

// ─── 17. CUSTOM STATION SUBMISSION ───────────────────────────────────────
function buildSubmissionForm() {
  const aboutPage = document.getElementById('page-about');
  if (!aboutPage || document.getElementById('station-submit-form')) return;
  const section = document.createElement('div');
  section.className = 'submit-section';
  section.innerHTML = `
    <div class="submit-header">Submit a Station</div>
    <p class="submit-sub">Know a station that should be here? Submit it for review.</p>
    <div id="station-submit-form" class="submit-form">
      <div class="sf-row">
        <div class="sf-field">
          <label class="sf-label">Station Name</label>
          <input class="sf-input" id="sf-name" type="text" placeholder="e.g. WNYC Radio">
        </div>
        <div class="sf-field">
          <label class="sf-label">Stream URL</label>
          <input class="sf-input" id="sf-url" type="url" placeholder="https://stream.example.com/mp3">
        </div>
      </div>
      <div class="sf-row">
        <div class="sf-field">
          <label class="sf-label">Genre / Tags</label>
          <input class="sf-input" id="sf-genre" type="text" placeholder="jazz, talk, news">
        </div>
        <div class="sf-field">
          <label class="sf-label">Country</label>
          <input class="sf-input" id="sf-country" type="text" placeholder="United States">
        </div>
      </div>
      <div class="sf-note">All submissions are reviewed before going live. We verify HTTPS and license status.</div>
      <button class="sf-submit-btn" onclick="submitStation()">Submit for Review →</button>
      <div id="sf-feedback" class="sf-feedback"></div>
    </div>`;
  aboutPage.querySelector('.about-wrap')?.appendChild(section);
}

function submitStation() {
  const name    = document.getElementById('sf-name')?.value.trim();
  const url     = document.getElementById('sf-url')?.value.trim();
  const genre   = document.getElementById('sf-genre')?.value.trim();
  const country = document.getElementById('sf-country')?.value.trim();
  const fb      = document.getElementById('sf-feedback');
  if (!name || !url) { if (fb) { fb.textContent = 'Name and stream URL are required.'; fb.className = 'sf-feedback error'; } return; }
  if (!url.startsWith('http')) { if (fb) { fb.textContent = 'Stream URL must start with http:// or https://'; fb.className = 'sf-feedback error'; } return; }
  // Simulate submission
  if (fb) { fb.textContent = 'Submitting…'; fb.className = 'sf-feedback'; }
  setTimeout(() => {
    if (fb) { fb.textContent = `✓ "${name}" submitted. Review takes 24–48h. Thank you.`; fb.className = 'sf-feedback success'; }
    ['sf-name','sf-url','sf-genre','sf-country'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }, 1200);
}
window.submitStation = submitStation;

// ─── 18. IMPORT / EXPORT FAVORITES ───────────────────────────────────────
function exportFavorites() {
  const favs = favLoad();
  if (!favs.length) { showToast('No favourites to export', 'warn'); return; }
  const blob = new Blob([JSON.stringify(favs, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wncore-favourites-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Favourites exported', 'success');
}

function importFavorites(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error();
      const current = favLoad();
      const merged = [...current];
      let added = 0;
      data.forEach(s => {
        if (s.url && s.name && !merged.find(f => f.url === s.url)) {
          merged.push(s); added++;
        }
      });
      favSave(merged);
      renderFavoritesPage();
      showToast(`Imported ${added} station${added !== 1 ? 's' : ''}`, 'success');
    } catch {
      showToast('Invalid file format', 'warn');
    }
  };
  reader.readAsText(file);
}
window.exportFavorites = exportFavorites;
window.importFavorites = importFavorites;


// ═══════════════════════════════════════════════════════
// GROUP 4 — ACCESSIBILITY & UX POLISH (items 24–30)
// ═══════════════════════════════════════════════════════

// ─── 24. FOCUS TRAP IN MODALS ────────────────────────────────────────────
function trapFocus(modalEl) {
  const focusable = modalEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0], last = focusable[focusable.length - 1];
  modalEl.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
  });
}

// Apply to existing modals after DOM ready
function initFocusTraps() {
  const modals = ['search-modal', 'signin-modal', 'kb-modal'];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const observer = new MutationObserver(() => {
        if (el.classList.contains('open')) {
          const first = el.querySelector('button, input');
          if (first) first.focus();
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ['class'] });
      trapFocus(el);
    }
  });
}

// ─── 25. TOAST NOTIFICATION SYSTEM ───────────────────────────────────────
// (used throughout this file — built first)
let _toastQueue = [], _toastActive = false;

function buildToastContainer() {
  if (document.getElementById('toast-container')) return;
  const c = document.createElement('div');
  c.id = 'toast-container';
  c.className = 'toast-container';
  document.body.appendChild(c);
}

function showToast(message, type = 'info', duration = 3000) {
  buildToastContainer();
  const c = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  c.appendChild(toast);
  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-show'));
  });
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
window.showToast = showToast;

// ─── 26. REDUCED MOTION MODE ─────────────────────────────────────────────
// WRONGNESS: wrongness effects still fire in reduced motion, more jarring
function initReducedMotion() {
  try {
    if (localStorage.getItem('wncore-reduced') === '1') {
      document.body.classList.add('reduced-motion');
    }
  } catch {}
}

function toggleReducedMotion() {
  document.body.classList.toggle('reduced-motion');
  const on = document.body.classList.contains('reduced-motion');
  try { localStorage.setItem('wncore-reduced', on ? '1' : '0'); } catch {}
  showToast(on ? 'Reduced motion on' : 'Reduced motion off', 'info');
}
window.toggleReducedMotion = toggleReducedMotion;

// ─── 27. SCROLL-TO-TOP BUTTON ────────────────────────────────────────────
function buildScrollTopBtn() {
  if (document.getElementById('scroll-top-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.className = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><polyline points="18 15 12 9 6 15"/></svg>`;
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
}

// ─── 28. SKELETON LOADING SCREENS ────────────────────────────────────────
function showSkeletonTable(tbodyId, rows = 8) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: rows }, () => `
    <tr class="skeleton-row">
      <td><div class="skel skel-sm"></div></td>
      <td><div class="skel skel-sm"></div></td>
      <td><div class="skel skel-lg"></div></td>
      <td><div class="skel skel-md"></div></td>
      <td><div class="skel skel-sm"></div></td>
      <td><div class="skel skel-sm"></div></td>
    </tr>`).join('');
}
window.showSkeletonTable = showSkeletonTable;

function showSkeletonGrid(containerId, cards = 6) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({ length: cards }, () => `
    <div class="skel-card">
      <div class="skel skel-card-img"></div>
      <div class="skel skel-lg" style="margin-top:10px"></div>
      <div class="skel skel-md" style="margin-top:6px"></div>
    </div>`).join('');
}
window.showSkeletonGrid = showSkeletonGrid;

// ─── 29. MOBILE BOTTOM NAV ────────────────────────────────────────────────
function buildMobileBottomNav() {
  if (document.getElementById('mobile-bottom-nav')) return;
  const nav = document.createElement('nav');
  nav.id = 'mobile-bottom-nav';
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Mobile bottom navigation');
  nav.innerHTML = `
    <button class="mbn-btn active" id="mbn-home" onclick="mbnNav('home',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Home</span>
    </button>
    <button class="mbn-btn" id="mbn-search" onclick="openSearch()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>Search</span>
    </button>
    <button class="mbn-btn" id="mbn-favs" onclick="mbnNav('favorites',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      <span>Saved</span>
    </button>
    <button class="mbn-btn" id="mbn-playing" onclick="mbnNav('home',this);scrollToPlayer()">
      <div class="mbn-playing-dot" id="mbn-dot"></div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
      <span>Playing</span>
    </button>`;
  document.body.appendChild(nav);
}

function mbnNav(pageId, btn) {
  if (typeof showPage === 'function') showPage(pageId, null);
  document.querySelectorAll('.mbn-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (pageId === 'favorites') { buildFavoritesPage(); renderFavoritesPage(); }
}
window.mbnNav = mbnNav;

function scrollToPlayer() {
  const bar = document.querySelector('.player-bar');
  if (bar) bar.scrollIntoView({ behavior: 'smooth' });
}

function updateMbnDot() {
  const dot = document.getElementById('mbn-dot');
  if (!dot) return;
  const au = document.getElementById('audio');
  dot.style.display = (au && !au.paused) ? 'block' : 'none';
}

// ─── 30. 88.7 SEARCH DEAD-END ────────────────────────────────────────────
// WRONGNESS: searching "88.7" shows a special redacted result
function intercept887Search(q) {
  if (!q.includes('88.7') && !q.toLowerCase().includes('88.7 fm')) return false;
  const results = document.getElementById('search-results');
  if (!results) return false;
  results.innerHTML = `
    <div class="sr-887-result" onclick="trigger887FromSearch()">
      <div class="sr-icon">📻</div>
      <div>
        <div class="sr-name sr-name-redacted">88.7 FM — ██████████</div>
        <div class="sr-meta">ORIGIN: UNKNOWN · ——kbps · <span style="color:var(--accent)">SIGNAL DETECTED</span></div>
      </div>
    </div>
    <div class="sr-887-log">
      <div class="sr-887-log-line">// search_index: no match for "88.7 FM"</div>
      <div class="sr-887-log-line">// fallback: carrier_scan() → anomaly at 88.700 MHz</div>
      <div class="sr-887-log-line">// WARNING: source unverified — proceed?</div>
    </div>`;
  return true;
}

function trigger887FromSearch() {
  if (typeof closeSearch === 'function') closeSearch();
  if (typeof play887Static === 'function') play887Static();
  if (window.WRONGNESS) window.WRONGNESS.spike(25);
}
window.trigger887FromSearch = trigger887FromSearch;


// ═══════════════════════════════════════════════════════
// INTEGRATION — PATCH EXISTING FUNCTIONS
// ═══════════════════════════════════════════════════════

function patchExistingFunctions() {
  // Patch playStation to track history, stats, bitrate
  if (typeof playStation === 'function' && !playStation._patched) {
    const origPlay = playStation;
    window.playStation = function(url, name, meta, emoji) {
      origPlay(url, name, meta, emoji);
      const s = { url, name, meta, emoji };
      historyPush(s);
      statsOnPlay();
      // Store for similar stations lookup
      window._currentStationData = { url, name, meta, emoji };
      // bitrate not in this call signature — fetch separately
      showBitrateInPlayer(window._currentStationData);
      updateFavButton();
      updateMbnDot();
      setTimeout(updateMbnDot, 1000);
    };
    window.playStation._patched = true;
  }

  // Patch doSearch to intercept 88.7
  if (typeof doSearch === 'function' && !doSearch._patched) {
    const origSearch = doSearch;
    window.doSearch = async function(q) {
      if (intercept887Search(q)) return;
      return origSearch(q);
    };
    window.doSearch._patched = true;
  }

  // Patch renderTable to attach previews
  if (typeof renderTable === 'function' && !renderTable._patched) {
    const origRender = renderTable;
    window.renderTable = function(stations, tbodyId) {
      showSkeletonTable(tbodyId, stations.length || 8);
      setTimeout(() => {
        origRender(stations, tbodyId);
        attachPreviewToTable(stations, tbodyId);
      }, 80);
    };
    window.renderTable._patched = true;
  }

  // Patch toggleFavorite (player heart button) to use our system
  const favBtn = document.querySelector('[onclick*="toggleFavorite"]');
  if (favBtn) {
    favBtn.id = 'pb-fav-btn';
    favBtn.setAttribute('onclick', 'favCurrentStation()');
  }

  // Patch sleep timer button
  injectSleepRing();
}

// Patch showPage to handle favorites
function patchShowPage() {
  if (typeof showPage === 'function' && !showPage._wnPatched) {
    const orig = showPage;
    window.showPage = function(id, linkEl) {
      // Page transition effect
      const current = document.querySelector('.page.active');
      if (current) {
        current.classList.add('page-exit');
        setTimeout(() => { current.classList.remove('page-exit'); }, 220);
      }
      orig(id, linkEl);
      // Favorites rendering
      if (id === 'favorites') {
        buildFavoritesPage();
        renderFavoritesPage();
      }
    };
    window.showPage._wnPatched = true;
  }
}


// ═══════════════════════════════════════════════════════
// STRUCTURAL INJECTIONS — PANELS & NAV LINKS
// ═══════════════════════════════════════════════════════

function injectNavItems() {
  // Favorites nav link
  const nav = document.querySelector('header nav');
  if (nav && !document.getElementById('nav-favorites-link')) {
    const favLink = document.createElement('a');
    favLink.id = 'nav-favorites-link';
    favLink.href = '#';
    favLink.setAttribute('onclick', "showPage('favorites',this);return false");
    favLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> Favourites`;
    // Insert before About
    const aboutLink = Array.from(nav.querySelectorAll('a')).find(a => a.textContent.trim().startsWith('About'));
    if (aboutLink) nav.insertBefore(favLink, aboutLink);
    else nav.appendChild(favLink);
  }

  // EQ & Shortcuts buttons in player right section
  const pbRight = document.querySelector('.pb-right');
  if (pbRight && !document.getElementById('pb-eq-btn')) {
    const eqBtn = document.createElement('button');
    eqBtn.id = 'pb-eq-btn';
    eqBtn.className = 'pb-btn pb-eq-open-btn';
    eqBtn.setAttribute('onclick', 'openEQPanel()');
    eqBtn.setAttribute('title', 'Equalizer');
    eqBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`;
    pbRight.prepend(eqBtn);

    const simBtn = document.createElement('button');
    simBtn.id = 'pb-sim-btn';
    simBtn.className = 'pb-btn';
    simBtn.setAttribute('onclick', 'loadSimilarStations()');
    simBtn.setAttribute('title', 'Similar stations');
    simBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
    pbRight.prepend(simBtn);

    const kbBtn = document.createElement('button');
    kbBtn.id = 'pb-kb-btn';
    kbBtn.className = 'pb-btn';
    kbBtn.setAttribute('onclick', 'openKbModal()');
    kbBtn.setAttribute('title', 'Keyboard shortcuts (?)');
    kbBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>`;
    pbRight.prepend(kbBtn);
  }

  // Feeling Lucky button near home section header
  const homeSection = document.querySelector('#page-home .section-header, #page-home .home-header');
  if (homeSection && !document.getElementById('lucky-btn')) {
    const lb = document.createElement('button');
    lb.id = 'lucky-btn';
    lb.className = 'lucky-btn';
    lb.setAttribute('onclick', 'feelingLucky()');
    lb.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Feeling Lucky`;
    homeSection.appendChild(lb);
  }
}

function injectSimilarPanel() {
  if (document.getElementById('similar-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'similar-panel';
  panel.className = 'similar-panel';
  panel.innerHTML = `
    <div class="sim-header">
      <span class="sim-title">Similar Stations</span>
      <button class="sim-close" onclick="closeSimilarPanel()">✕</button>
    </div>
    <div class="sim-list" id="similar-list"></div>`;
  document.body.appendChild(panel);
}

function injectHistorySidebar() {
  const sidebar = document.querySelector('.np-sidebar, .now-playing-sidebar');
  if (!sidebar || document.getElementById('history-list')) return;
  const section = document.createElement('div');
  section.className = 'history-section';
  section.innerHTML = `
    <div class="hist-title">Recently Played</div>
    <div class="hist-list" id="history-list"><div class="hist-empty">No stations played yet</div></div>`;
  sidebar.appendChild(section);
}


// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════

function boot() {
  buildToastContainer();
  initVolumeMemory();
  initReducedMotion();
  buildKbModal();
  buildMobileBottomNav();
  buildScrollTopBtn();
  buildFavoritesPage();
  injectNavItems();
  injectSimilarPanel();
  injectHistorySidebar();
  patchExistingFunctions();
  patchShowPage();
  statsStartTracking();
  initFocusTraps();
  buildGenreAZ();
  buildCountryFilter();
  buildSidebarToggle();
  buildStatsWidget();
  buildSubmissionForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// ═══════════════════════════════════════════════════════
// IMPROVEMENTS v2 — ITEMS 31–50
// 20 new features. Wrongness level: MODERATE.
// ═══════════════════════════════════════════════════════

// ─── 31. MINI NOW-PLAYING WIDGET (floating, draggable) ────────────────────
// Compact persistent widget that stays visible while browsing pages.
// WRONGNESS: station name occasionally shows a different name for 300ms.
let _miniDragging = false, _miniDx = 0, _miniDy = 0;

function buildMiniWidget() {
  if (document.getElementById('mini-widget')) return;
  const w = document.createElement('div');
  w.id = 'mini-widget';
  w.className = 'mini-widget';
  w.innerHTML = `
    <div class="mw-drag-handle" id="mw-handle" title="Drag to move">⠿</div>
    <div class="mw-art" id="mw-art">📻</div>
    <div class="mw-info">
      <div class="mw-name" id="mw-name">Not playing</div>
      <div class="mw-meta" id="mw-meta">Select a station</div>
    </div>
    <div class="mw-controls">
      <button class="mw-btn" onclick="if(typeof togglePlay==='function')togglePlay()" title="Play/Pause">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path id="mw-play-icon" d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="mw-btn" onclick="if(typeof skipStation==='function')skipStation(1)" title="Next">
        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z"/></svg>
      </button>
      <button class="mw-btn mw-close-btn" onclick="hideMiniWidget()" title="Hide">✕</button>
    </div>`;
  document.body.appendChild(w);

  // Default position: bottom-left above player
  w.style.left = '16px';
  w.style.bottom = 'calc(var(--player-h, 80px) + 60px)';

  // Drag logic
  const handle = document.getElementById('mw-handle');
  handle.addEventListener('mousedown', e => {
    _miniDragging = true;
    const rect = w.getBoundingClientRect();
    _miniDx = e.clientX - rect.left;
    _miniDy = e.clientY - rect.top;
    w.style.bottom = 'auto';
    w.style.top = rect.top + 'px';
    document.body.classList.add('no-select');
  });
  document.addEventListener('mousemove', e => {
    if (!_miniDragging) return;
    w.style.left = Math.max(0, e.clientX - _miniDx) + 'px';
    w.style.top  = Math.max(0, e.clientY - _miniDy) + 'px';
  });
  document.addEventListener('mouseup', () => {
    _miniDragging = false;
    document.body.classList.remove('no-select');
  });

  // WRONGNESS: name flicker every ~25s
  setInterval(() => {
    if (Math.random() < 0.35) {
      const nm = document.getElementById('mw-name');
      if (!nm || nm.textContent === 'Not playing') return;
      const orig = nm.textContent;
      const ghosts = ['NODE_09 Transmission','██████████','SIGNAL_KAGE','Unknown Origin'];
      nm.textContent = ghosts[Math.floor(Math.random() * ghosts.length)];
      nm.style.color = 'var(--accent)';
      setTimeout(() => { nm.textContent = orig; nm.style.color = ''; }, 300);
    }
  }, 25000);
}

function updateMiniWidget(name, meta, emoji) {
  const nm  = document.getElementById('mw-name');
  const mt  = document.getElementById('mw-meta');
  const art = document.getElementById('mw-art');
  if (nm)  nm.textContent  = name  || 'Not playing';
  if (mt)  mt.textContent  = meta  || '—';
  if (art) art.textContent = emoji || '📻';
  const w = document.getElementById('mini-widget');
  if (w) w.classList.add('active');
}

function hideMiniWidget() {
  const w = document.getElementById('mini-widget');
  if (w) w.classList.remove('active');
}

function showMiniWidget() {
  if (!document.getElementById('mini-widget')) buildMiniWidget();
  const w = document.getElementById('mini-widget');
  if (w) w.classList.add('active');
}
window.hideMiniWidget = hideMiniWidget;
window.showMiniWidget = showMiniWidget;


// ─── 32. STATION VOTE / RATING SYSTEM ─────────────────────────────────────
// Thumbs up/down on each station row. Stored locally. Syncs vote count
// to Radio Browser's public vote API. Shows local sentiment in the table.
const VOTES_KEY = 'wncore-votes-v1';

function votesLoad() {
  try { return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}'); } catch { return {}; }
}
function voteStation(uuid, dir) {
  const votes = votesLoad();
  const prev = votes[uuid];
  if (prev === dir) {
    delete votes[uuid]; // toggle off
  } else {
    votes[uuid] = dir;
    // Submit to Radio Browser vote API (fire-and-forget)
    if (dir === 1) {
      fetch(`https://all.api.radio-browser.info/json/vote/${uuid}`, { method: 'POST' }).catch(() => {});
    }
  }
  try { localStorage.setItem(VOTES_KEY, JSON.stringify(votes)); } catch {}
  refreshVoteUI(uuid, votes[uuid]);
}

function refreshVoteUI(uuid, state) {
  const up   = document.querySelector(`.vote-up[data-uuid="${uuid}"]`);
  const down = document.querySelector(`.vote-down[data-uuid="${uuid}"]`);
  if (up)   up.classList.toggle('voted', state === 1);
  if (down) down.classList.toggle('voted', state === -1);
}

function injectVoteButtons(stations, tbodyId) {
  const votes = votesLoad();
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  rows.forEach((tr, i) => {
    const s = stations[i];
    if (!s || tr.querySelector('.vote-up')) return;
    const td = document.createElement('td');
    td.className = 'vote-td';
    const state = votes[s.stationuuid];
    td.innerHTML = `
      <button class="vote-up${state===1?' voted':''}" data-uuid="${s.stationuuid}" onclick="voteStation('${s.stationuuid}',1)" title="Vote up">▲</button>
      <button class="vote-down${state===-1?' voted':''}" data-uuid="${s.stationuuid}" onclick="voteStation('${s.stationuuid}',-1)" title="Vote down">▼</button>`;
    tr.appendChild(td);
  });
}
window.voteStation = voteStation;


// ─── 33. SHARE STATION BUTTON ─────────────────────────────────────────────
// Generates a shareable URL with station name encoded as query param.
// Copies to clipboard, shows toast. On load, auto-plays if ?station= present.
function shareCurrentStation() {
  const cs = window.currentStation;
  if (!cs) { showToast('Nothing playing to share', 'warn'); return; }
  const url = `${location.origin}${location.pathname}?station=${encodeURIComponent(cs.name)}&src=${encodeURIComponent(cs.url)}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('🔗 Station link copied!', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    showToast('🔗 Station link copied!', 'success');
  });
}
window.shareCurrentStation = shareCurrentStation;

function checkAutoPlayFromURL() {
  const params = new URLSearchParams(location.search);
  const name = params.get('station');
  const src  = params.get('src');
  if (!name || !src) return;
  setTimeout(() => {
    if (typeof playStation === 'function') {
      playStation(decodeURIComponent(src), decodeURIComponent(name), 'Shared station', '📻');
      showToast(`▶ Auto-playing: ${decodeURIComponent(name)}`, 'info', 4000);
    }
  }, 1200);
}


// ─── 34. BROADCAST SCHEDULE / "ON AIR NOW" SIDEBAR CARD ───────────────────
// Fake but convincing schedule block for the sidebar showing what's "airing".
// WRONGNESS: one time slot is always listed as 88.7 FM with status UNVERIFIED.
const SCHEDULE_SHOWS = [
  { name: 'Morning Signal', genre: 'Jazz · Easy Listening', dur: [6, 10] },
  { name: 'Frequency Check', genre: 'News · Talk', dur: [10, 12] },
  { name: 'Midday Static', genre: 'Ambient · Downtempo', dur: [12, 14] },
  { name: 'The Deep Hour', genre: 'Electronic · Experimental', dur: [14, 16] },
  { name: 'Global Array', genre: 'World · Folk', dur: [16, 18] },
  { name: 'Evening Transmission', genre: 'Classical · Orchestral', dur: [18, 21] },
  { name: 'Night Carrier', genre: 'Lo-Fi · Chill', dur: [21, 23] },
  { name: 'Dead Air Protocol', genre: 'Ambient · Drone', dur: [23, 6] },
];

function buildScheduleCard() {
  const sidebar = document.querySelector('.np-sidebar, .now-playing-sidebar');
  if (!sidebar || document.getElementById('schedule-card')) return;
  const card = document.createElement('div');
  card.id = 'schedule-card';
  card.className = 'schedule-card';
  card.innerHTML = `
    <div class="sc-title">On Air Schedule</div>
    <div id="sc-list"></div>`;
  sidebar.appendChild(card);
  renderSchedule();
  setInterval(renderSchedule, 60000);
}

function renderSchedule() {
  const list = document.getElementById('sc-list');
  if (!list) return;
  const h = new Date().getHours();

  // WRONGNESS: inject 88.7 FM at a random past or upcoming slot
  const ghostIdx = Math.floor(Math.random() * SCHEDULE_SHOWS.length);

  list.innerHTML = SCHEDULE_SHOWS.map((show, i) => {
    const isNow = h >= show.dur[0] && (show.dur[1] > show.dur[0] ? h < show.dur[1] : true);
    const timeStr = `${String(show.dur[0]).padStart(2,'0')}:00 – ${String(show.dur[1]).padStart(2,'0')}:00`;
    if (i === ghostIdx) {
      return `<div class="sc-row sc-ghost">
        <div class="sc-time">??:?? – ??:??</div>
        <div class="sc-name">88.7 FM ██████</div>
        <div class="sc-genre">UNVERIFIED · ORIGIN UNKNOWN</div>
      </div>`;
    }
    return `<div class="sc-row${isNow ? ' sc-now' : ''}">
      ${isNow ? '<div class="sc-on-air-pip"></div>' : ''}
      <div class="sc-time">${timeStr}</div>
      <div class="sc-name">${show.name}</div>
      <div class="sc-genre">${show.genre}</div>
    </div>`;
  }).join('');
}


// ─── 35. LIVE LISTENER COUNT ANIMATION ────────────────────────────────────
// Animates station listener counts in the table to tick up/down naturally.
// WRONGNESS: one station's count occasionally spikes to an impossible number.
let _listenerAnimFrame = null;
const _listenerCounts = new Map();

function animateListenerCounts() {
  const cells = document.querySelectorAll('.tr-listeners, .station-listeners, [data-listeners]');
  cells.forEach((cell, i) => {
    const raw = parseInt(cell.getAttribute('data-listeners') || cell.textContent.replace(/\D/g,'')) || 0;
    if (!raw) return;
    if (!_listenerCounts.has(i)) _listenerCounts.set(i, raw);
    let current = _listenerCounts.get(i);

    // WRONGNESS: 1 in 60 cells spikes
    if (Math.random() < (1/60)) {
      cell.textContent = (999999).toLocaleString();
      cell.style.color = 'var(--accent)';
      setTimeout(() => { cell.textContent = current.toLocaleString(); cell.style.color = ''; }, 400);
      return;
    }

    const drift = Math.floor((Math.random() - 0.48) * 4);
    current = Math.max(0, current + drift);
    _listenerCounts.set(i, current);
    cell.textContent = current.toLocaleString();
  });
}


// ─── 36. SEARCH SUGGESTIONS / AUTOCOMPLETE ────────────────────────────────
// Shows quick suggestions as user types in the search box.
// Pulls from Radio Browser tags + country list for fast matching.
const SEARCH_SUGGESTIONS = [
  'jazz', 'classical', 'ambient', 'news', 'talk', 'lofi', 'hip hop',
  'electronic', 'folk', 'chillout', 'rock', 'pop', 'indie', 'country',
  'reggae', 'blues', 'soul', 'R&B', 'metal', 'punk', 'anime', 'j-pop',
  'k-pop', 'tropical', 'bossa nova', 'flamenco', 'opera', 'world music',
  'BBC', 'NPR', 'RFI', 'NHK', 'ABC', 'DW', 'France Inter', 'Radio Swiss',
];
let _suggestTimeout = null;

function buildSearchAutocomplete() {
  const input = document.getElementById('search-input');
  if (!input || document.getElementById('search-suggestions')) return;

  const box = document.createElement('div');
  box.id = 'search-suggestions';
  box.className = 'search-suggestions';
  input.parentNode.style.position = 'relative';
  input.parentNode.appendChild(box);

  input.addEventListener('input', () => {
    clearTimeout(_suggestTimeout);
    _suggestTimeout = setTimeout(() => showSuggestions(input.value), 180);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') focusSuggestion(1);
    if (e.key === 'ArrowUp')   focusSuggestion(-1);
    if (e.key === 'Escape')    clearSuggestions();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-suggestions') && e.target !== input) clearSuggestions();
  });
}

function showSuggestions(q) {
  const box = document.getElementById('search-suggestions');
  if (!box || !q || q.length < 2) { clearSuggestions(); return; }
  const matches = SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().startsWith(q.toLowerCase())).slice(0, 6);
  if (!matches.length) { clearSuggestions(); return; }
  box.innerHTML = matches.map(m =>
    `<div class="ss-item" onclick="applySuggestion('${escHtmlImp(m)}')" tabindex="0">${escHtmlImp(m)}</div>`
  ).join('');
  box.classList.add('open');
}

function clearSuggestions() {
  const box = document.getElementById('search-suggestions');
  if (box) { box.innerHTML = ''; box.classList.remove('open'); }
}

function applySuggestion(val) {
  const input = document.getElementById('search-input');
  if (input) { input.value = val; input.focus(); }
  clearSuggestions();
  if (typeof doSearch === 'function') doSearch(val);
}

function focusSuggestion(dir) {
  const items = document.querySelectorAll('.ss-item');
  const active = document.querySelector('.ss-item:focus');
  const idx = Array.from(items).indexOf(active);
  const next = items[Math.max(0, Math.min(items.length - 1, idx + dir))];
  if (next) next.focus();
}
window.applySuggestion = applySuggestion;


// ─── 37. STATION INFO MODAL (full detail view) ────────────────────────────
// Click station name → opens modal with full data, homepage link, tags, votes.
// WRONGNESS: "Last verified" timestamp is sometimes in the future.
function buildStationModal() {
  if (document.getElementById('station-modal')) return;
  const m = document.createElement('div');
  m.id = 'station-modal';
  m.className = 'station-modal-backdrop';
  m.setAttribute('role', 'dialog');
  m.addEventListener('click', e => { if (e.target === m) closeStationModal(); });
  m.innerHTML = `
    <div class="stm-box">
      <button class="stm-close" onclick="closeStationModal()">✕</button>
      <div class="stm-header">
        <div class="stm-emoji" id="stm-emoji">📻</div>
        <div>
          <div class="stm-name" id="stm-name"></div>
          <div class="stm-country" id="stm-country"></div>
        </div>
      </div>
      <div class="stm-grid" id="stm-grid"></div>
      <div class="stm-tags" id="stm-tags"></div>
      <div class="stm-footer">
        <a class="stm-homepage" id="stm-homepage" target="_blank" rel="noopener">Visit Homepage →</a>
        <button class="stm-play-btn" id="stm-play-btn">▶ Play Station</button>
      </div>
    </div>`;
  document.body.appendChild(m);
}

function openStationModal(station) {
  buildStationModal();
  const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(station.countrycode) : '📻';

  document.getElementById('stm-emoji').textContent   = emoji;
  document.getElementById('stm-name').textContent    = station.name;
  document.getElementById('stm-country').textContent = [station.country, station.language].filter(Boolean).join(' · ');

  // WRONGNESS: last verified sometimes in the future
  let lastVerified = station.lastchecktime || 'Unknown';
  if (lastVerified !== 'Unknown' && Math.random() < 0.25) {
    const future = new Date(Date.now() + Math.random() * 3 * 24 * 3600000);
    lastVerified = future.toISOString().replace('T',' ').slice(0,19) + ' ⚠';
  }

  document.getElementById('stm-grid').innerHTML = [
    ['Bitrate',       station.bitrate ? station.bitrate + ' kbps' : '—'],
    ['Codec',         station.codec   || '—'],
    ['Votes',         station.votes   || '0'],
    ['Click count',   station.clickcount ? Number(station.clickcount).toLocaleString() : '—'],
    ['Last verified', lastVerified],
    ['UUID',          (station.stationuuid || '—').slice(0,18) + '…'],
  ].map(([k,v]) => `<div class="stm-field"><span class="stm-label">${k}</span><span class="stm-val">${escHtmlImp(String(v))}</span></div>`).join('');

  const tags = (station.tags || '').split(',').filter(t=>t.trim()).slice(0,10);
  document.getElementById('stm-tags').innerHTML = tags.map(t =>
    `<span class="stm-tag">${escHtmlImp(t.trim())}</span>`).join('');

  const homeLink = document.getElementById('stm-homepage');
  if (station.homepage) { homeLink.href = station.homepage; homeLink.style.display = 'inline'; }
  else homeLink.style.display = 'none';

  const playBtn = document.getElementById('stm-play-btn');
  playBtn.onclick = () => {
    if (typeof playStation === 'function')
      playStation(station.url_resolved, station.name, station.country || '—', emoji);
    closeStationModal();
  };

  document.getElementById('station-modal').classList.add('open');
}

function closeStationModal() {
  const m = document.getElementById('station-modal');
  if (m) m.classList.remove('open');
}
window.openStationModal = openStationModal;
window.closeStationModal = closeStationModal;


// ─── 38. DARK MODE TRANSITION POLISH ──────────────────────────────────────
// Smooth cross-fade when toggling dark mode instead of instant snap.
function initDarkModeTransition() {
  const style = document.createElement('style');
  style.textContent = `
    body { transition: background-color 0.35s, color 0.35s; }
    body * { transition: background-color 0.35s, color 0.35s, border-color 0.35s; }
    /* But don't transition animations or transforms */
    body *:not(.lm-bar):not(.pb-eq span):not(.skel) { transition-property: background-color, color, border-color; }
  `;
  document.head.appendChild(style);
}


// ─── 39. KEYBOARD-NAVIGABLE STATION TABLE ─────────────────────────────────
// Arrow keys navigate rows in the station table; Enter plays focused row.
let _tableRowIdx = -1;

function initTableKeyNav() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const rows = Array.from(document.querySelectorAll('#station-tbody tr:not(.skeleton-row)'));
    if (!rows.length) return;

    if (e.key === 'ArrowDown' && !e.shiftKey) {
      e.preventDefault();
      _tableRowIdx = Math.min(_tableRowIdx + 1, rows.length - 1);
      highlightTableRow(rows, _tableRowIdx);
    } else if (e.key === 'ArrowUp' && !e.shiftKey) {
      e.preventDefault();
      _tableRowIdx = Math.max(_tableRowIdx - 1, 0);
      highlightTableRow(rows, _tableRowIdx);
    } else if (e.key === 'Enter' && _tableRowIdx >= 0 && rows[_tableRowIdx]) {
      rows[_tableRowIdx].click();
    }
  });
}

function highlightTableRow(rows, idx) {
  rows.forEach((r, i) => r.classList.toggle('kb-focused', i === idx));
  rows[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}


// ─── 40. COMPACT / EXPANDED PLAYER BAR TOGGLE ─────────────────────────────
// Double-click the player bar to collapse it to just the play button.
// WRONGNESS: on expand, title briefly shows wrong station name.
let _playerExpanded = true;

function initPlayerToggle() {
  const bar = document.querySelector('.player-bar');
  if (!bar || bar.dataset.toggleInit) return;
  bar.dataset.toggleInit = '1';
  const info = bar.querySelector('.pb-info, .pb-station-info, [class*="pb-info"]');

  bar.addEventListener('dblclick', e => {
    if (e.target.closest('button, input')) return;
    _playerExpanded = !_playerExpanded;
    bar.classList.toggle('player-compact', !_playerExpanded);

    if (_playerExpanded) {
      // WRONGNESS: on expand, name flickers
      const nm = document.getElementById('pb-name');
      if (nm && window.currentStation && Math.random() < 0.40) {
        const orig = nm.textContent;
        const wrongs = ['88.7 FM', 'NODE_09', '██████', 'SIGNAL_KAGE'];
        nm.textContent = wrongs[Math.floor(Math.random() * wrongs.length)];
        setTimeout(() => { nm.textContent = orig; }, 280);
        if (window.WRONGNESS) window.WRONGNESS.spike(10);
      }
    }
  });

  // Tooltip hint
  bar.title = 'Double-click to compact player';
}


// ─── 41. TRENDING GENRES WIDGET ───────────────────────────────────────────
// Fetches the current top tags from Radio Browser and renders a live
// "Trending now" pill strip on the home page above the station table.
async function buildTrendingGenres() {
  if (document.getElementById('trending-genres')) return;
  const homeSection = document.querySelector('#page-home');
  if (!homeSection) return;

  const strip = document.createElement('div');
  strip.id = 'trending-genres';
  strip.className = 'trending-genres';
  strip.innerHTML = '<div class="tg-label">Trending:</div><div class="tg-pills" id="tg-pills"><div class="skel skel-md" style="height:24px;width:300px;border-radius:12px;"></div></div>';

  // Insert before station table
  const table = homeSection.querySelector('table, .station-table-wrap');
  if (table) table.parentNode.insertBefore(strip, table);
  else homeSection.prepend(strip);

  try {
    const r = await fetch('https://all.api.radio-browser.info/json/tags?order=stationcount&reverse=true&limit=16');
    const tags = await r.json();
    const pills = document.getElementById('tg-pills');
    if (!pills) return;
    pills.innerHTML = tags.map(t =>
      `<button class="tg-pill" onclick="applyCountryFilter('');quickTagSearch('${escHtmlImp(t.name)}')">${escHtmlImp(t.name)} <span class="tg-count">${Number(t.stationcount).toLocaleString()}</span></button>`
    ).join('');
  } catch {}
}

async function quickTagSearch(tag) {
  const tbody = document.getElementById('station-tbody');
  if (!tbody) return;
  showSkeletonTable('station-tbody', 8);
  try {
    const r = await fetch(`https://all.api.radio-browser.info/json/stations/search?limit=30&https=true&tag=${encodeURIComponent(tag)}&order=clickcount&reverse=true`);
    const stations = await r.json();
    if (typeof renderTable === 'function') renderTable(stations, 'station-tbody');
    injectVoteButtons(stations, 'station-tbody');
    showToast(`Showing: ${tag}`, 'info');
  } catch {}
}
window.quickTagSearch = quickTagSearch;


// ─── 42. AMBIENT NOISE LAYER ──────────────────────────────────────────────
// Optional background noise generator (brown/pink/white) via Web Audio.
// Lives in a small panel. Completely non-interfering with main audio.
// WRONGNESS: "Node Frequency" option adds faint sub-bass hum + wrongness spike.
let _ambientCtx = null, _ambientNode = null, _ambientGain = null, _ambientActive = false;

function buildAmbientPanel() {
  if (document.getElementById('ambient-panel')) return;
  const p = document.createElement('div');
  p.id = 'ambient-panel';
  p.className = 'ambient-panel';
  p.innerHTML = `
    <div class="amb-header">
      <span class="amb-title">Ambient Layer</span>
      <button class="amb-close" onclick="closeAmbientPanel()">✕</button>
    </div>
    <div class="amb-options">
      <button class="amb-opt" data-type="brown" onclick="startAmbient('brown',this)">Brown Noise</button>
      <button class="amb-opt" data-type="pink"  onclick="startAmbient('pink',this)">Pink Noise</button>
      <button class="amb-opt" data-type="white" onclick="startAmbient('white',this)">White Noise</button>
      <button class="amb-opt amb-opt-ghost" data-type="node" onclick="startAmbient('node',this)">Node Freq ▒</button>
    </div>
    <div class="amb-vol-row">
      <label class="amb-vol-label">Level</label>
      <input type="range" class="amb-vol-slider" id="amb-vol" min="0" max="1" step="0.01" value="0.15" oninput="setAmbientVol(this.value)">
    </div>
    <button class="amb-stop-btn" onclick="stopAmbient()">Stop Ambient</button>`;
  document.body.appendChild(p);
}

function openAmbientPanel() {
  buildAmbientPanel();
  document.getElementById('ambient-panel').classList.add('open');
}
function closeAmbientPanel() {
  const p = document.getElementById('ambient-panel');
  if (p) p.classList.remove('open');
}

function startAmbient(type, btn) {
  stopAmbient();
  document.querySelectorAll('.amb-opt').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  try {
    _ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * _ambientCtx.sampleRate;
    const buffer = _ambientCtx.createBuffer(1, bufferSize, _ambientCtx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white' || type === 'node') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02; last = data[i]; data[i] *= 3.5;
      }
    } else if (type === 'pink') {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11; b6 = w * 0.115926;
      }
    }

    _ambientNode = _ambientCtx.createBufferSource();
    _ambientNode.buffer = buffer; _ambientNode.loop = true;

    _ambientGain = _ambientCtx.createGain();
    _ambientGain.gain.value = parseFloat(document.getElementById('amb-vol')?.value || 0.15);

    // Node Frequency: sub-bass oscillator + wrongness spike
    if (type === 'node') {
      const osc = _ambientCtx.createOscillator();
      osc.frequency.value = 37.5; // sub-bass hum
      osc.type = 'sine';
      const oscGain = _ambientCtx.createGain();
      oscGain.gain.value = 0.04;
      osc.connect(oscGain); oscGain.connect(_ambientGain);
      osc.start();
      if (window.WRONGNESS) window.WRONGNESS.spike(18);
      showToast('⚠ Node frequency engaged', 'warn');
    }

    _ambientNode.connect(_ambientGain);
    _ambientGain.connect(_ambientCtx.destination);
    _ambientNode.start();
    _ambientActive = true;
  } catch (err) {
    showToast('Ambient layer unavailable in this browser', 'warn');
  }
}

function stopAmbient() {
  try { if (_ambientNode) _ambientNode.stop(); } catch {}
  try { if (_ambientCtx) _ambientCtx.close(); } catch {}
  _ambientNode = null; _ambientCtx = null; _ambientGain = null; _ambientActive = false;
  document.querySelectorAll('.amb-opt').forEach(b => b.classList.remove('active'));
}

function setAmbientVol(v) {
  if (_ambientGain) _ambientGain.gain.value = parseFloat(v);
}
window.openAmbientPanel = openAmbientPanel;
window.closeAmbientPanel = closeAmbientPanel;
window.startAmbient = startAmbient;
window.stopAmbient = stopAmbient;
window.setAmbientVol = setAmbientVol;


// ─── 43. NETWORK MAP VISUALIZER (canvas-based world dot map) ──────────────
// Animated canvas showing "active nodes" across the world.
// Draws dots at known city coordinates with signal-pulse rings.
// WRONGNESS: Node 09 coordinate slowly drifts, never settles.
const NETWORK_NODES = [
  [51.5,  -0.1,  'London'],    [40.7,  -74.0, 'New York'],
  [35.7,  139.7, 'Tokyo'],     [48.8,  2.3,   'Paris'],
  [52.5,  13.4,  'Berlin'],    [55.7,  37.6,  'Moscow'],
  [31.2,  121.5, 'Shanghai'],  [-33.9, 151.2, 'Sydney'],
  [-23.5, -46.6, 'São Paulo'], [19.4,  -99.1, 'Mexico City'],
  [1.3,   103.8, 'Singapore'], [28.6,  77.2,  'Delhi'],
  [23.7,  90.4,  'Dhaka'],     [-26.2, 28.0,  'Johannesburg'],
  [6.5,   3.4,   'Lagos'],     [41.0,  29.0,  'Istanbul'],
  // Node 09 — drifts
  [0.0, 0.0, 'NODE_09'],
];

function buildNetworkMap() {
  if (document.getElementById('network-map-canvas')) return;
  const section = document.querySelector('#page-about .about-wrap, #page-about');
  if (!section) return;

  const wrap = document.createElement('div');
  wrap.className = 'network-map-wrap';
  wrap.innerHTML = `
    <div class="nm-title">WNCORE Global Relay Network</div>
    <div class="nm-sub">Live node telemetry — ${NETWORK_NODES.length - 1} verified · 1 unknown</div>
    <canvas id="network-map-canvas" class="network-map-canvas"></canvas>`;
  section.prepend(wrap);

  renderNetworkMap();
  setInterval(renderNetworkMap, 2000);
  window.addEventListener('resize', renderNetworkMap);
}

function renderNetworkMap() {
  const canvas = document.getElementById('network-map-canvas');
  if (!canvas || !canvas.offsetParent) return;
  const W = canvas.offsetWidth;
  canvas.width = W; canvas.height = W * 0.5;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const isDark = document.body.classList.contains('dark-mode');

  ctx.fillStyle = isDark ? '#0e0d0b' : '#f5f3ef';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += W/12) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y <= H; y += H/6)  { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Draw nodes
  const t = Date.now() / 1000;
  NETWORK_NODES.forEach(([lat, lon, name], i) => {
    // Node 09 drifts
    let dLat = lat, dLon = lon;
    if (name === 'NODE_09') {
      dLat = Math.sin(t * 0.13) * 45;
      dLon = Math.cos(t * 0.09) * 120;
    }
    const x = (dLon + 180) / 360 * W;
    const y = (90 - dLat) / 180 * H;
    const isGhost = name === 'NODE_09';
    const pulse = Math.sin(t * 2 + i) * 0.5 + 0.5;

    // Pulse ring
    ctx.beginPath();
    ctx.arc(x, y, 6 + pulse * 8, 0, Math.PI * 2);
    ctx.strokeStyle = isGhost
      ? `rgba(200,71,42,${0.15 + pulse * 0.2})`
      : `rgba(22,163,74,${0.1 + pulse * 0.15})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Core dot
    ctx.beginPath();
    ctx.arc(x, y, isGhost ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = isGhost ? '#c8472a' : (isDark ? '#22c55e' : '#16a34a');
    ctx.fill();

    // Label (only on hover-like random sample)
    if (isGhost || Math.random() < 0.3) {
      ctx.font = `${isGhost ? 'bold ' : ''}9px DM Mono, monospace`;
      ctx.fillStyle = isGhost ? '#c8472a' : (isDark ? 'rgba(240,237,232,0.5)' : 'rgba(26,24,20,0.4)');
      ctx.fillText(name, x + 6, y - 4);
    }
  });
}


// ─── 44. PAGE TRANSITION ANIMATIONS ───────────────────────────────────────
// Fade + slight upward slide when navigating between pages.
function initPageTransitions() {
  if (document.getElementById('pt-style')) return;
  const s = document.createElement('style');
  s.id = 'pt-style';
  s.textContent = `
    .page { display:none; opacity:0; transform:translateY(6px); transition:opacity 0.22s ease, transform 0.22s ease; pointer-events:none; }
    .page.active { display:block; opacity:1; transform:translateY(0); pointer-events:auto; }
    .page.page-exit { display:block; opacity:0; transform:translateY(-4px); pointer-events:none; }
  `;
  document.head.appendChild(s);

  // showPage patching handled by patchShowPage() in boot()
}


// ─── 45. STATION OF THE DAY CARD ──────────────────────────────────────────
// A curated "Station of the Day" card on the home page. Station is
// deterministically selected based on the day number so it's consistent.
// Changes every 24h. WRONGNESS: on one day in ~14, it shows 88.7 FM.
async function buildStationOfTheDay() {
  if (document.getElementById('sotd-card')) return;
  const home = document.getElementById('page-home');
  if (!home) return;

  const dayNum = Math.floor(Date.now() / 86400000);

  // WRONGNESS: every ~14 days
  if (dayNum % 14 === 7) {
    const card = makeSOTDCard({
      name: '88.7 FM — ██████████',
      country: 'UNKNOWN',
      tags: 'unverified · carrier signal · anomaly',
      bitrate: null,
      url_resolved: null,
      _ghost: true,
    }, '📻', dayNum);
    insertSOTDCard(home, card);
    return;
  }

  const card = document.createElement('div');
  card.id = 'sotd-card';
  card.className = 'sotd-card sotd-loading';
  card.innerHTML = `<div class="sotd-label">Station of the Day</div><div class="skel skel-lg" style="height:16px;margin-bottom:8px"></div><div class="skel skel-md"></div>`;
  insertSOTDCard(home, card);

  try {
    const seed = dayNum % 5000;
    const r = await fetch(`https://all.api.radio-browser.info/json/stations/search?limit=1&https=true&offset=${seed}&order=votes&reverse=true&has_extended_info=true`);
    const [s] = await r.json();
    if (!s) return;
    const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(s.countrycode) : '📻';
    card.outerHTML = makeSOTDCard(s, emoji, dayNum);
  } catch {
    card.remove();
  }
}

function makeSOTDCard(s, emoji, dayNum) {
  const tags = (s.tags || '').split(',').slice(0, 3).filter(t=>t.trim()).join(' · ') || 'Global';
  const isGhost = s._ghost;
  return `<div id="sotd-card" class="sotd-card${isGhost?' sotd-ghost':''}">
    <div class="sotd-label">Station of the Day <span class="sotd-day">#${dayNum % 9999}</span></div>
    <div class="sotd-inner">
      <div class="sotd-emoji">${emoji}</div>
      <div class="sotd-info">
        <div class="sotd-name">${escHtmlImp(s.name)}</div>
        <div class="sotd-meta">${escHtmlImp(s.country || '—')} · ${escHtmlImp(tags)}</div>
        ${s.bitrate ? `<div class="sotd-bitrate">${s.bitrate}kbps</div>` : ''}
      </div>
      ${s._ghost
        ? `<div class="sotd-ghost-badge">UNVERIFIED</div>`
        : `<button class="sotd-play-btn" onclick="playStation('${escHtmlImp(s.url_resolved||'')}','${escHtmlImp(s.name)}','${escHtmlImp(s.country||'')}','${emoji}')">▶ Listen</button>`}
    </div>
  </div>`;
}

function insertSOTDCard(home, card) {
  const table = home.querySelector('table, .station-table-wrap, #trending-genres');
  if (table) table.parentNode.insertBefore(typeof card === 'string' ? (() => { const d = document.createElement('div'); d.innerHTML = card; return d.firstChild; })() : card, table);
}


// ─── 46. LANGUAGE FILTER TOGGLE ───────────────────────────────────────────
// Quick-filter buttons for English / Non-English / Any language.
// Sits alongside the country filter.
let _activeLangFilter = '';

function buildLanguageFilter() {
  const cfWrap = document.getElementById('country-filter-wrap');
  if (!cfWrap || document.getElementById('lang-filter-wrap')) return;
  const wrap = document.createElement('div');
  wrap.id = 'lang-filter-wrap';
  wrap.className = 'lang-filter-wrap';
  wrap.innerHTML = `
    <span class="cf-label">Language:</span>
    <button class="lang-btn active" data-lang="" onclick="applyLangFilter('',this)">Any</button>
    <button class="lang-btn" data-lang="english" onclick="applyLangFilter('english',this)">English</button>
    <button class="lang-btn" data-lang="japanese" onclick="applyLangFilter('japanese',this)">Japanese</button>
    <button class="lang-btn" data-lang="french" onclick="applyLangFilter('french',this)">French</button>
    <button class="lang-btn" data-lang="spanish" onclick="applyLangFilter('spanish',this)">Spanish</button>
    <button class="lang-btn" data-lang="german" onclick="applyLangFilter('german',this)">German</button>`;
  cfWrap.after(wrap);
}

async function applyLangFilter(lang, btn) {
  _activeLangFilter = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  showSkeletonTable('station-tbody', 8);
  const country = document.getElementById('country-filter')?.value || '';
  const params = new URLSearchParams({
    limit: 30, https: true, order: 'clickcount', reverse: true,
    ...(country && { country }),
    ...(lang && { language: lang }),
  });
  try {
    const r = await fetch(`https://all.api.radio-browser.info/json/stations/search?${params}`);
    const stations = await r.json();
    if (typeof renderTable === 'function') renderTable(stations, 'station-tbody');
    injectVoteButtons(stations, 'station-tbody');
  } catch {
    showToast('Signal lost — try again', 'warn');
  }
}
window.applyLangFilter = applyLangFilter;


// ─── 47. MINI WAVEFORM IN PLAYER BAR ──────────────────────────────────────
// Replaces the existing EQ bars with a smoother canvas waveform visualizer.
// Falls back gracefully if AudioContext is unavailable.
let _waveCanvas = null, _waveCtx = null, _waveAnalyser = null, _waveRaf = null;
let _waveAudioCtxShared = null;

function buildPlayerWaveform() {
  const eqEl = document.getElementById('pb-eq');
  if (!eqEl || document.getElementById('pb-waveform')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'pb-waveform';
  canvas.className = 'pb-waveform-canvas';
  canvas.width = 80; canvas.height = 28;
  eqEl.parentNode.insertBefore(canvas, eqEl);
  _waveCanvas = canvas;
  _waveCtx = canvas.getContext('2d');
  drawFlatWave(); // idle state
}

function drawFlatWave() {
  if (!_waveCtx || !_waveCanvas) return;
  const { width: W, height: H } = _waveCanvas;
  _waveCtx.clearRect(0, 0, W, H);
  const isDark = document.body.classList.contains('dark-mode');
  _waveCtx.strokeStyle = isDark ? 'rgba(240,237,232,0.15)' : 'rgba(26,24,20,0.12)';
  _waveCtx.lineWidth = 1;
  _waveCtx.beginPath();
  _waveCtx.moveTo(0, H / 2); _waveCtx.lineTo(W, H / 2);
  _waveCtx.stroke();
}

function startWaveformDraw(audioEl) {
  if (!_waveCanvas) buildPlayerWaveform();
  if (!_waveCanvas) return;
  try {
    // CRITICAL: Reuse shared audio context — never call createMediaElementSource twice on the same element.
    // The shared context and source node are established by whichever of main.js/improvements.js runs first.
    if (!_waveAudioCtxShared) {
      _waveAudioCtxShared = window._sharedAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!_waveAnalyser) {
      _waveAnalyser = _waveAudioCtxShared.createAnalyser();
      _waveAnalyser.fftSize = 64;
      // Tap off the shared source node — do NOT call createMediaElementSource again
      if (window._sharedSourceNode) {
        window._sharedSourceNode.connect(_waveAnalyser);
      }
      // Analyser connects to destination for passthrough (doesn't affect audio output)
      _waveAnalyser.connect(_waveAudioCtxShared.destination);
    }
    cancelAnimationFrame(_waveRaf);
    const draw = () => {
      _waveRaf = requestAnimationFrame(draw);
      if (!_waveCtx || !_waveCanvas) return;
      const W = _waveCanvas.width, H = _waveCanvas.height;
      const buf = new Uint8Array(_waveAnalyser.frequencyBinCount);
      _waveAnalyser.getByteFrequencyData(buf);
      _waveCtx.clearRect(0, 0, W, H);
      const barW = W / buf.length;
      const isDark = document.body.classList.contains('dark-mode');
      buf.forEach((v, i) => {
        const h = (v / 255) * H;
        _waveCtx.fillStyle = isDark
          ? `rgba(200,71,42,${0.4 + v/255*0.6})`
          : `rgba(200,71,42,${0.3 + v/255*0.7})`;
        _waveCtx.fillRect(i * barW, H - h, barW - 1, h);
      });
    };
    draw();
  } catch {
    // AudioContext already used by EQ — just show animated bars
    animateFakeWave();
  }
}

function animateFakeWave() {
  if (!_waveCtx || !_waveCanvas) return;
  const W = _waveCanvas.width, H = _waveCanvas.height;
  const bars = 20;
  let frame = 0;
  cancelAnimationFrame(_waveRaf);
  const draw = () => {
    _waveRaf = requestAnimationFrame(draw);
    frame++;
    _waveCtx.clearRect(0,0,W,H);
    const bw = W / bars;
    for (let i = 0; i < bars; i++) {
      const h = (Math.sin(frame * 0.05 + i * 0.8) * 0.5 + 0.5) * H * 0.8 + H * 0.05;
      _waveCtx.fillStyle = `rgba(200,71,42,0.5)`;
      _waveCtx.fillRect(i * bw, H - h, bw - 1, h);
    }
  };
  draw();
}

function stopWaveformDraw() {
  cancelAnimationFrame(_waveRaf);
  drawFlatWave();
}


// ─── 48. LAST.FM-STYLE "SCROBBLE" LOG (local) ─────────────────────────────
// Logs every station play with timestamp. Accessible from a hidden stats page.
// WRONGNESS: one log entry per session shows a 2-second listen to 88.7 FM
//            that the user definitely did not initiate.
const SCROBBLE_KEY = 'wncore-scrobble-v1';
let _ghost887Injected = false;

function scrobbleLoad() {
  try { return JSON.parse(localStorage.getItem(SCROBBLE_KEY) || '[]'); } catch { return []; }
}
function scrobbleSave(arr) {
  try { localStorage.setItem(SCROBBLE_KEY, JSON.stringify(arr.slice(0, 200))); } catch {}
}
function scrobblePush(station) {
  const log = scrobbleLoad();
  log.unshift({ name: station.name, url: station.url, ts: Date.now(), dur: 0 });
  // WRONGNESS: inject ghost entry once per session
  if (!_ghost887Injected && Math.random() < 0.4) {
    _ghost887Injected = true;
    log.splice(1, 0, {
      name: '88.7 FM',
      url: 'unknown',
      ts: Date.now() - Math.floor(Math.random() * 120000 + 60000),
      dur: 2,
      _ghost: true,
    });
  }
  scrobbleSave(log);
}

function buildScrobblePanel() {
  if (document.getElementById('scrobble-panel')) return;
  const p = document.createElement('div');
  p.id = 'scrobble-panel';
  p.className = 'scrobble-panel';
  p.innerHTML = `
    <div class="scr-header">
      <span class="scr-title">Play Log</span>
      <button class="scr-close" onclick="closeScrobblePanel()">✕</button>
    </div>
    <div class="scr-list" id="scr-list"></div>
    <button class="scr-clear" onclick="clearScrobbles()">Clear log</button>`;
  document.body.appendChild(p);
}

function openScrobblePanel() {
  buildScrobblePanel();
  renderScrobbleLog();
  document.getElementById('scrobble-panel').classList.add('open');
}
function closeScrobblePanel() {
  const p = document.getElementById('scrobble-panel');
  if (p) p.classList.remove('open');
}
function clearScrobbles() {
  try { localStorage.removeItem(SCROBBLE_KEY); } catch {}
  renderScrobbleLog();
}
function renderScrobbleLog() {
  const list = document.getElementById('scr-list');
  if (!list) return;
  const log = scrobbleLoad();
  if (!log.length) { list.innerHTML = '<div class="scr-empty">No plays recorded yet</div>'; return; }
  list.innerHTML = log.map(e => `
    <div class="scr-item${e._ghost ? ' scr-ghost' : ''}">
      <div class="scr-name">${escHtmlImp(e.name)}${e._ghost ? ' <span class="scr-ghost-badge">?</span>':''}</div>
      <div class="scr-ts">${timeAgo(e.ts)}${e.dur === 2 ? ' · 2s' : ''}</div>
    </div>`).join('');
}
window.openScrobblePanel = openScrobblePanel;
window.closeScrobblePanel = closeScrobblePanel;
window.clearScrobbles = clearScrobbles;


// ─── 49. OFFLINE DETECTION BANNER ─────────────────────────────────────────
// Shows a non-intrusive banner when the user loses internet connection.
// WRONGNESS: banner occasionally flashes briefly even when online.
function initOfflineDetection() {
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.className = 'offline-banner';
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>
    Signal lost — waiting for connection…`;
  // Insert into signal-conn-container if it exists, else body
  const sc = document.getElementById('signal-conn-container');
  if(sc) sc.appendChild(banner); else document.body.appendChild(banner);

  const show = () => banner.classList.add('visible');
  const hide = () => banner.classList.remove('visible');

  window.addEventListener('offline', show);
  window.addEventListener('online', () => { hide(); showToast('Connection restored', 'success'); });
  if (!navigator.onLine) show();

  // WRONGNESS: flash offline banner briefly even when online
  setInterval(() => {
    if (navigator.onLine && Math.random() < 0.08) {
      banner.classList.add('visible');
      setTimeout(() => banner.classList.remove('visible'), 180);
    }
  }, 45000);
}


// ─── 50. PERSISTENT THEME CUSTOMIZER ──────────────────────────────────────
// A small panel letting users pick an accent color and font size.
// Ships with 5 presets + custom color. Persists to localStorage.
// WRONGNESS: "Signal Red" preset is slightly more red than expected,
//            and one preset is labeled "Node 09" — it desaturates the UI.
const THEME_PRESETS = [
  { name: 'Default',    accent: '#c8472a', accent2: '#e8753a' },
  { name: 'Ocean',      accent: '#0ea5e9', accent2: '#38bdf8' },
  { name: 'Forest',     accent: '#16a34a', accent2: '#22c55e' },
  { name: 'Dusk',       accent: '#7c3aed', accent2: '#a855f7' },
  { name: 'Signal Red', accent: '#ff0000', accent2: '#ff3333' }, // brighter than labeled
  { name: 'Node 09 ▒',  accent: '#888888', accent2: '#aaaaaa', desaturate: true }, // WRONGNESS
];
const THEME_KEY = 'wncore-theme-v1';

function buildThemePanel() {
  if (document.getElementById('theme-panel')) return;
  const p = document.createElement('div');
  p.id = 'theme-panel';
  p.className = 'theme-panel';
  p.innerHTML = `
    <div class="thm-header">
      <span class="thm-title">Appearance</span>
      <button class="thm-close" onclick="closeThemePanel()">✕</button>
    </div>
    <div class="thm-section-label">Accent Color</div>
    <div class="thm-presets">
      ${THEME_PRESETS.map((t, i) =>
        `<button class="thm-preset${t.desaturate?' thm-ghost':''}" data-i="${i}" title="${t.name}" style="background:${t.accent}" onclick="applyThemePreset(${i})"></button>`
      ).join('')}
      <input type="color" id="thm-custom-color" class="thm-custom-color" title="Custom color" value="#c8472a" oninput="applyCustomAccent(this.value)">
    </div>
    <div class="thm-section-label">Font Size</div>
    <div class="thm-font-row">
      <button class="thm-font-btn" onclick="adjustFontSize(-1)">A−</button>
      <span class="thm-font-val" id="thm-font-val">100%</span>
      <button class="thm-font-btn" onclick="adjustFontSize(1)">A+</button>
    </div>`;
  document.body.appendChild(p);
  loadSavedTheme();
}

function openThemePanel() {
  buildThemePanel();
  document.getElementById('theme-panel').classList.add('open');
}
function closeThemePanel() {
  const p = document.getElementById('theme-panel');
  if (p) p.classList.remove('open');
}

function applyThemePreset(i) {
  const preset = THEME_PRESETS[i];
  if (!preset) return;
  document.documentElement.style.setProperty('--accent', preset.accent);
  document.documentElement.style.setProperty('--accent2', preset.accent2 || preset.accent);
  if (preset.desaturate) {
    document.body.style.filter = 'saturate(0.3)';
    if (window.WRONGNESS) window.WRONGNESS.spike(18);
    showToast('⚠ Node 09 frequency applied', 'warn');
  } else {
    document.body.style.filter = '';
  }
  try { localStorage.setItem(THEME_KEY, JSON.stringify({ accent: preset.accent, accent2: preset.accent2, desaturate: !!preset.desaturate })); } catch {}
  updateThemeActiveState(i);
}

function applyCustomAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent2', color);
  document.body.style.filter = '';
  try { localStorage.setItem(THEME_KEY, JSON.stringify({ accent: color, accent2: color })); } catch {}
}

function updateThemeActiveState(activeIdx) {
  document.querySelectorAll('.thm-preset').forEach((b, i) => b.classList.toggle('active', i === activeIdx));
}

let _fontSize = 100;
function adjustFontSize(dir) {
  _fontSize = Math.max(80, Math.min(130, _fontSize + dir * 5));
  document.documentElement.style.fontSize = _fontSize + '%';
  const el = document.getElementById('thm-font-val');
  if (el) el.textContent = _fontSize + '%';
  try { localStorage.setItem('wncore-fontsize', _fontSize); } catch {}
}

function loadSavedTheme() {
  try {
    const t = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
    if (t) {
      document.documentElement.style.setProperty('--accent', t.accent);
      document.documentElement.style.setProperty('--accent2', t.accent2 || t.accent);
      if (t.desaturate) document.body.style.filter = 'saturate(0.3)';
    }
    const fs = parseInt(localStorage.getItem('wncore-fontsize') || '100');
    _fontSize = fs;
    document.documentElement.style.fontSize = fs + '%';
  } catch {}
}
window.openThemePanel = openThemePanel;
window.closeThemePanel = closeThemePanel;
window.applyThemePreset = applyThemePreset;
window.applyCustomAccent = applyCustomAccent;
window.adjustFontSize = adjustFontSize;


// ═══════════════════════════════════════════════════════
// INTEGRATION PATCHES v2
// ═══════════════════════════════════════════════════════

function patchPlayStationV2() {
  if (typeof playStation !== 'function' || playStation._v2patched) return;
  const orig = playStation;
  window.playStation = function(url, name, meta, emoji) {
    orig(url, name, meta, emoji);
    updateMiniWidget(name, meta, emoji);
    scrobblePush({ name, url });
    startWaveformDraw(document.getElementById('audio'));
    // Dispatch event for mini-player
    document.dispatchEvent(new CustomEvent('wncore-station-changed', { detail: { name, url } }));
  };
  window.playStation._v2patched = true;
  window.playStation._patched   = true; // keep v1 patch flag
}

function injectV2NavButtons() {
  const pbRight = document.querySelector('.pb-right');
  if (!pbRight) return;

  // Ambient button
  if (!document.getElementById('pb-ambient-btn')) {
    const b = document.createElement('button');
    b.id = 'pb-ambient-btn'; b.className = 'pb-btn';
    b.setAttribute('onclick', 'openAmbientPanel()');
    b.setAttribute('title', 'Ambient noise layer');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>`;
    pbRight.prepend(b);
  }

  // Share button
  if (!document.getElementById('pb-share-btn')) {
    const b = document.createElement('button');
    b.id = 'pb-share-btn'; b.className = 'pb-btn';
    b.setAttribute('onclick', 'shareCurrentStation()');
    b.setAttribute('title', 'Share this station');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
    pbRight.prepend(b);
  }

  // Theme button
  if (!document.getElementById('pb-theme-btn')) {
    const b = document.createElement('button');
    b.id = 'pb-theme-btn'; b.className = 'pb-btn';
    b.setAttribute('onclick', 'openThemePanel()');
    b.setAttribute('title', 'Appearance settings');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>`;
    pbRight.prepend(b);
  }

  // Log button (scrobble)
  if (!document.getElementById('pb-log-btn')) {
    const b = document.createElement('button');
    b.id = 'pb-log-btn'; b.className = 'pb-btn';
    b.setAttribute('onclick', 'openScrobblePanel()');
    b.setAttribute('title', 'Play log');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
    pbRight.prepend(b);
  }
}

function patchRenderTableV2() {
  if (typeof renderTable !== 'function' || renderTable._v2patched) return;
  const orig = renderTable;
  window.renderTable = function(stations, tbodyId) {
    orig(stations, tbodyId);
    injectVoteButtons(stations, tbodyId);
    // Attach station data to rows for hover popover
    try {
      const tbody = document.getElementById(tbodyId);
      if (tbody && stations) {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, i) => { if (stations[i]) row._stationData = stations[i]; });
      }
    } catch(e) {}
    // restart listener count animation
    clearInterval(window._listenerAnimInterval);
    window._listenerAnimInterval = setInterval(animateListenerCounts, 3000);
  };
  window.renderTable._v2patched = true;
  window.renderTable._patched   = true;
}


// ═══════════════════════════════════════════════════════
// BOOT v2 — extends existing boot()
// ═══════════════════════════════════════════════════════

function bootV2() {
  buildMiniWidget();
  buildStationModal();
  buildScheduleCard();
  buildSearchAutocomplete();
  buildPlayerWaveform();
  buildStationOfTheDay();
  buildLanguageFilter();
  buildNetworkMap();
  buildThemePanel();
  initPageTransitions();
  initDarkModeTransition();
  initTableKeyNav();
  initPlayerToggle();
  initOfflineDetection();
  checkAutoPlayFromURL();
  buildTrendingGenres();
  injectV2NavButtons();
  patchPlayStationV2();
  patchRenderTableV2();
  loadSavedTheme();

  // Listener count animation on first load
  setTimeout(() => {
    /* listener animation already started above — skip duplicate */;
  }, 2000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootV2);
} else {
  bootV2();
}

// ─── MINI-PLAYER (docked on scroll) ──────────────────────────────────────
(function initMiniPlayer() {
  const SCROLL_THRESHOLD = 320;
  let _miniName = '— no signal —';
  let _isPlaying = false;

  // Create mini-player DOM
  const mini = document.createElement('div');
  mini.id = 'mini-player';
  mini.className = 'mini-player';
  mini.innerHTML = `
    <div class="mini-player-wave" id="mini-wave">
      ${Array.from({length:5}, (_,i) => `<span class="mini-bar" style="animation-delay:${i*0.1}s"></span>`).join('')}
    </div>
    <div class="mini-player-name" id="mini-name">— no signal —</div>
    <button class="mini-player-btn" id="mini-play-btn" aria-label="Play/Pause" onclick="window.__miniTogglePlay()">
      <svg id="mini-play-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>
      <svg id="mini-pause-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="display:none"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
    </button>
    <button class="mini-player-close" onclick="document.getElementById('mini-player').classList.remove('visible')" aria-label="Close mini-player">✕</button>
  `;
  document.body.appendChild(mini);

  // Update mini-player visibility based on scroll and station selection
  function updateMiniVisibility() {
    const hasStation = window._currentStationData && window._currentStationData.name;
    const scrolledPast = window.scrollY > SCROLL_THRESHOLD;
    if (hasStation && scrolledPast) {
      mini.classList.add('visible');
    } else {
      mini.classList.remove('visible');
    }
  }

  // Scroll watcher - show when station selected AND scrolled down
  // Use non-passive listener and add periodic fallback check
  let scrollTimeout;
  const scrollCheck = () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateMiniVisibility, 10);
  };
  window.addEventListener('scroll', scrollCheck, false);
  
  // Fallback: also check on wheel and touch events since scroll may not fire reliably
  window.addEventListener('wheel', scrollCheck, false);
  window.addEventListener('touchmove', scrollCheck, { passive: true });
  
  // Periodic check as ultimate fallback
  setInterval(updateMiniVisibility, 250);

  // Direct patch of playStation if it exists
  // Store reference to original and wrap it
  const origPlayStation = window.playStation;
  if (typeof origPlayStation === 'function') {
    window.playStation = function(url, name, meta, emoji) {
      // Call original
      origPlayStation.call(this, url, name, meta, emoji);
      
      // Update mini-player
      _miniName = name || '— receiving —';
      const nameEl = document.getElementById('mini-name');
      if (nameEl) nameEl.textContent = _miniName;
      _isPlaying = true;
      updateMiniIcons();
      updateMiniVisibility();
    };
    // Mark as patched to avoid re-patching
    window.playStation._miniPatched = true;
  }

  window.__miniTogglePlay = function() {
    const audio = document.getElementById('radio-audio') || document.querySelector('audio');
    if (!audio) return;
    if (audio.paused) { audio.play().catch(() => {}); _isPlaying = true; }
    else { audio.pause(); _isPlaying = false; }
    updateMiniIcons();
  };

  function updateMiniIcons() {
    const playIcon = document.getElementById('mini-play-icon');
    const pauseIcon = document.getElementById('mini-pause-icon');
    if (playIcon) playIcon.style.display = _isPlaying ? 'none' : '';
    if (pauseIcon) pauseIcon.style.display = _isPlaying ? '' : 'none';
    const wave = document.getElementById('mini-wave');
    if (wave) wave.style.opacity = _isPlaying ? '1' : '0.3';
  }
})();

// ─── STATION ROW HOVER PREVIEW POPOVER ───────────────────────────────────
(function initHoverPreviews() {
  const pop = document.createElement('div');
  pop.id = 'station-hover-pop';
  pop.className = 'station-hover-pop';
  pop.innerHTML = `
    <div class="shp-flag" id="shp-flag"></div>
    <div class="shp-body">
      <div class="shp-name" id="shp-name"></div>
      <div class="shp-meta" id="shp-meta"></div>
      <div class="shp-tags" id="shp-tags"></div>
    </div>
  `;
  document.body.appendChild(pop);

  let hideTimer;

  function showPop(row, station) {
    clearTimeout(hideTimer);
    const rect = row.getBoundingClientRect();
    const flag = station.countrycode ? getCountryEmojiImp(station.countrycode) : '🌐';
    document.getElementById('shp-flag').textContent = flag;
    document.getElementById('shp-name').textContent = station.name || '—';
    const parts = [station.country, station.bitrate ? station.bitrate + ' kbps' : null].filter(Boolean);
    document.getElementById('shp-meta').textContent = parts.join(' · ');
    const tags = (station.tags || '').split(',').slice(0, 4).filter(Boolean);
    document.getElementById('shp-tags').innerHTML = tags.map(t => `<span class="shp-tag">${t.trim()}</span>`).join('');
    // Position
    const top = rect.bottom + window.scrollY + 6;
    const left = Math.min(rect.left + window.scrollX, window.innerWidth - 260);
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
    pop.classList.add('visible');
  }

  function hidePop() {
    hideTimer = setTimeout(() => pop.classList.remove('visible'), 120);
  }

  // Delegate hover events on station tables
  document.addEventListener('mouseover', (e) => {
    const row = e.target.closest('#station-tbody tr, #charts-tbody tr, #anime-tbody tr');
    if (!row) return;
    const stationData = row._stationData;
    if (stationData) showPop(row, stationData);
  });
  document.addEventListener('mouseout', (e) => {
    const row = e.target.closest('#station-tbody tr, #charts-tbody tr, #anime-tbody tr');
    if (row) hidePop();
  });
  pop.addEventListener('mouseover', () => clearTimeout(hideTimer));
  pop.addEventListener('mouseout', hidePop);

  // Helper (local copy to avoid dependency on main.js scope)
  function getCountryEmojiImp(code) {
    if (!code || code.length !== 2) return '🌐';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  }
  window._attachHoverData = function(row, station) { row._stationData = station; };
})();

// ─── VISITOR FINGERPRINT NODE ID ──────────────────────────────────────────
(function injectNodeId() {
  function simpleHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).toUpperCase().padStart(8, '0');
  }
  try {
    const fp = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency || 0,
    ].join('|');
    const nodeId = 'NODE_' + simpleHash(fp).slice(0, 6);
    // Store so ARG can reference it
    window.__WNCORE_NODE_ID = nodeId;
    // Inject subtly into signal box
    const box = document.getElementById('signal-conn-box');
    if (box) {
      const el = document.createElement('span');
      el.style.cssText = 'font-size:0.52rem;color:rgba(200,71,42,0.25);font-family:"DM Mono",monospace;margin-left:10px;letter-spacing:1.5px;user-select:none;';
      el.textContent = nodeId;
      el.title = 'Your transmission node identifier';
      box.appendChild(el);
    }
    // Also available in ticker (wrongness.js can reference window.__WNCORE_NODE_ID)
    localStorage.setItem('wncore_node_id', nodeId);
  } catch(e) {}
})();
