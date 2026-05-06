/* ═══════════════════════════════════════════════════════
   WNCORE RADIO — improvements_patch.js
   Fixes: search selection, live music, sharing, mobile, 
   horror terminal upgrade, UX improvements
═══════════════════════════════════════════════════════ */

// ─── SEARCH FIX: Ensure search results properly play when selected ───────
(function patchSearch() {
  'use strict';
  // Override the search result rendering to fix click-to-play
  const origOpen = window.openSearch;
  window.openSearch = function() {
    if(origOpen) origOpen();
    // Ensure search results container re-initializes
    const input = document.getElementById('search-input');
    if(input) {
      input.focus();
      // Fix: re-attach event so country filter actually searches country field
      input.removeEventListener('input', input._wnSearchHandler);
      input._wnSearchHandler = function(e) {
        clearTimeout(window._searchDebounce);
        const q = e.target.value.trim();
        if(q.length < 2) {
          document.getElementById('search-results').innerHTML = '<div class="search-empty">Start typing to search 12,000+ stations worldwide</div>';
          return;
        }
        document.getElementById('search-results').innerHTML = '<div class="search-empty">Scanning frequencies...</div>';
        window._searchDebounce = setTimeout(() => window.doSearchFixed(q), 300);
      };
      input.addEventListener('input', input._wnSearchHandler);
    }
  };

  // Fixed search with proper country & tag selection
  window.doSearchFixed = async function(q) {
    if(!q || q.length < 2) return;
    const results = document.getElementById('search-results');
    const filter = window.searchFilter || 'all';
    
    try {
      let stations = [];
      const base = 'https://all.api.radio-browser.info/json';
      
      if(filter === 'country') {
        // Search both by country name AND country code
        const [r1, r2] = await Promise.all([
          fetch(`${base}/stations/search?limit=20&https=true&country=${encodeURIComponent(q)}&order=clickcount&reverse=true`),
          fetch(`${base}/stations/search?limit=10&https=true&countrycode=${encodeURIComponent(q.toUpperCase().slice(0,2))}&order=clickcount&reverse=true`)
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        const seen = new Set();
        stations = [...d1, ...d2].filter(s => { if(seen.has(s.stationuuid)) return false; seen.add(s.stationuuid); return true; }).slice(0, 20);
      } else if(filter === 'tag') {
        const r = await fetch(`${base}/stations/search?limit=20&https=true&tag=${encodeURIComponent(q)}&order=clickcount&reverse=true`);
        stations = await r.json();
      } else {
        // Search name + country simultaneously
        const [r1, r2] = await Promise.all([
          fetch(`${base}/stations/search?limit=15&https=true&name=${encodeURIComponent(q)}&order=clickcount&reverse=true`),
          fetch(`${base}/stations/search?limit=10&https=true&country=${encodeURIComponent(q)}&order=clickcount&reverse=true`)
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        const seen = new Set();
        stations = [...d1, ...d2].filter(s => { if(seen.has(s.stationuuid)) return false; seen.add(s.stationuuid); return true; }).slice(0, 20);
      }
      
      if(!stations || !stations.length) {
        const safeQ = (typeof escHtml === 'function') ? escHtml(q) : String(q).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        results.innerHTML = `<div class="search-empty">No stations found for "<strong>${safeQ}</strong>" — try a different term</div>`;
        return;
      }
      
      results.innerHTML = '';
      stations.forEach(s => {
        if(!s.url_resolved && !s.url) return;
        const url = s.url_resolved || s.url;
        const cc = (s.countrycode || '').toUpperCase();
        const emoji = window.getCountryEmoji ? window.getCountryEmoji(cc) : '📻';
        const tags = (s.tags || '').split(',').slice(0, 2).filter(Boolean).join(' · ') || 'Radio';
        const bitrate = s.bitrate ? `${s.bitrate}kbps` : '';
        
        const el = document.createElement('div');
        el.className = 'search-result-item';
        el.innerHTML = `
          <div class="sr-icon">${emoji}</div>
          <div class="sr-body">
            <div class="sr-name">${escHtml ? escHtml(s.name) : s.name}</div>
            <div class="sr-meta">${escHtml ? escHtml(s.country||'Unknown') : (s.country||'Unknown')} · ${tags}${bitrate ? ' · ' + bitrate : ''}</div>
          </div>
          <button class="sr-play-btn" aria-label="Play">▶</button>
        `;
        
        // FIXED: Proper onclick that closes search and plays the station
        el.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          if(window.playStation) {
            window.playStation(url, s.name, s.country || 'Unknown', emoji);
          }
          if(window.closeSearch) window.closeSearch();
          // Show toast confirmation
          showToast(`▶ Playing: ${s.name}`);
        });
        
        results.appendChild(el);
      });
    } catch(err) {
      results.innerHTML = '<div class="search-empty">Signal degraded — try again</div>';
    }
  };
  
  // Patch setSearchFilter to use fixed search
  window.setSearchFilter = function(btn, filter) {
    window.searchFilter = filter;
    document.querySelectorAll('.search-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const q = document.getElementById('search-input')?.value?.trim();
    if(q && q.length > 1) window.doSearchFixed(q);
  };
})();

// ─── LIVE MUSIC FIX: Removed — original lmStartStation in main.js handles
// playback correctly via closure. The previous patch caused silent early-returns
// because window.lmAudio is undefined (const declarations don't populate window). ───

// ─── SHARE BUTTON SYSTEM ───────────────────────────────────────────────────
function initShareSystem() {
  // Add share button to player bar
  const pbRight = document.querySelector('.pb-right');
  if(pbRight && !document.getElementById('pb-share-btn')) {
    const shareBtn = document.createElement('button');
    shareBtn.id = 'pb-share-btn';
    shareBtn.className = 'pb-btn pb-share-btn';
    shareBtn.title = 'Share station';
    shareBtn.setAttribute('aria-label', 'Share station');
    shareBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
    shareBtn.addEventListener('click', shareCurrentStation);
    pbRight.prepend(shareBtn);
  }
}

function shareCurrentStation() {
  const station = window.currentStation;
  if(!station) {
    showToast('Select a station to share');
    return;
  }
  
  const shareData = {
    title: `WNCORE Radio — ${station.name}`,
    text: `Listening to ${station.name} on WNCORE Radio`,
    url: window.location.href
  };
  
  if(navigator.share && /mobile|android|ios/i.test(navigator.userAgent)) {
    navigator.share(shareData).catch(() => fallbackShare(station));
  } else {
    fallbackShare(station);
  }
}

function fallbackShare(station) {
  // Show share modal
  let modal = document.getElementById('share-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.className = 'share-modal-backdrop';
    modal.innerHTML = `
      <div class="share-modal-box">
        <div class="share-modal-title">Share Station</div>
        <div class="share-modal-station" id="share-station-name"></div>
        <div class="share-options">
          <button class="share-option-btn" id="share-copy-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy Link
          </button>
          <a class="share-option-btn share-option-x" id="share-x-btn" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.402 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Post on X
          </a>
          <a class="share-option-btn share-option-reddit" id="share-reddit-btn" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><circle cx="12" cy="12" r="10"/><path fill="white" d="M15.5 13c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm-7 0c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm3.5 2.5c-.83 0-1.5-.45-1.5-1s.67-1 1.5-1 1.5.45 1.5 1-.67 1-1.5 1z"/></svg>
            Reddit
          </a>
        </div>
        <button class="share-modal-close" onclick="document.getElementById('share-modal').classList.remove('open')">×</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  }
  
  document.getElementById('share-station-name').textContent = station.name;
  const url = window.location.href;
  const text = `Listening to ${station.name} on WNCORE Radio`;
  
  document.getElementById('share-copy-btn').onclick = () => {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!')).catch(() => showToast('Copy from address bar'));
    modal.classList.remove('open');
  };
  document.getElementById('share-x-btn').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  document.getElementById('share-reddit-btn').href = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
  
  modal.classList.add('open');
}

// ─── TOAST NOTIFICATION SYSTEM ────────────────────────────────────────────
let toastQueue = [];
let toastActive = false;

function showToast(msg, duration = 2800) {
  toastQueue.push({msg, duration});
  if(!toastActive) processToastQueue();
}

function processToastQueue() {
  if(!toastQueue.length) { toastActive = false; return; }
  toastActive = true;
  const {msg, duration} = toastQueue.shift();
  
  let toast = document.getElementById('wncore-toast');
  if(!toast) {
    toast = document.createElement('div');
    toast.id = 'wncore-toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = msg;
  toast.className = 'wncore-toast show';
  
  setTimeout(() => {
    toast.className = 'wncore-toast';
    setTimeout(() => processToastQueue(), 400);
  }, duration);
}

// ─── MOBILE HOME PAGE FIXES ────────────────────────────────────────────────
function fixMobileHome() {
  // Fix hero section overflow on mobile
  const globeSection = document.querySelector('.globe-section');
  if(globeSection && window.innerWidth <= 768) {
    globeSection.style.minHeight = '280px';
  }
  
  // Fix page-wrap padding on mobile
  const pageWrap = document.querySelector('.page-wrap');
  if(pageWrap && window.innerWidth <= 768) {
    pageWrap.style.paddingBottom = '20px';
  }
  
  // Fix featured cards on narrow mobile
  if(window.innerWidth <= 380) {
    document.querySelectorAll('.featured-card').forEach(fc => {
      fc.style.padding = '14px';
    });
  }
  
  // Ensure mobile bottom nav is at correct position
  const mobileNav = document.getElementById('mobile-nav');
  if(mobileNav) {
    mobileNav.style.top = 'var(--header-h, 56px)';
  }
}

// ─── IMPROVED ADMIN PANEL ─────────────────────────────────────────────────
function enhanceAdmin() {
  const adminApp = document.getElementById('admin-app');
  if(!adminApp) return;
  
  // Add stats section to overview
  const overviewSec = document.getElementById('admin-sec-overview');
  if(overviewSec && !overviewSec.querySelector('.admin-stats-grid')) {
    const statsGrid = document.createElement('div');
    statsGrid.className = 'admin-stats-grid';
    statsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px';
    
    const stats = [
      {label:'STATIONS LIVE', value:'12,841', color:'#22c55e'},
      {label:'COUNTRIES', value:'310', color:'#c8472a'},
      {label:'SIGNAL STATUS', value:'ONLINE', color:'#22c55e'},
      {label:'NODE 09', value:'UNKNOWN', color:'rgba(200,71,42,0.5)'},
    ];
    
    statsGrid.innerHTML = stats.map(s => `
      <div style="background:#131109;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px">
        <div style="font-size:0.55rem;color:rgba(232,228,223,0.22);letter-spacing:2px;margin-bottom:8px">${s.label}</div>
        <div style="font-size:1.2rem;font-family:'Syne',sans-serif;font-weight:800;color:${s.color}">${s.value}</div>
      </div>
    `).join('');
    
    overviewSec.appendChild(statsGrid);
  }
}

// ─── KEYBOARD SHORTCUTS DISPLAY ──────────────────────────────────────────
function showKeyboardHelp() {
  const existing = document.getElementById('kb-help-modal');
  if(existing) { existing.classList.toggle('open'); return; }
  
  const modal = document.createElement('div');
  modal.id = 'kb-help-modal';
  modal.className = 'kb-help-modal open';
  modal.innerHTML = `
    <div class="kb-help-box">
      <div class="kb-help-title">Keyboard Shortcuts</div>
      <div class="kb-shortcuts">
        <div class="kb-row"><span class="kb-key">Ctrl+K</span><span>Search stations</span></div>
        <div class="kb-row"><span class="kb-key">Space</span><span>Play / Pause</span></div>
        <div class="kb-row"><span class="kb-key">Esc</span><span>Close modal</span></div>
        <div class="kb-row"><span class="kb-key">Ctrl+B</span><span>Admin panel</span></div>
      </div>
      <button class="kb-help-close" onclick="document.getElementById('kb-help-modal').classList.remove('open')">Close</button>
    </div>
  `;
  modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  document.body.appendChild(modal);
}

// Space bar to play/pause
document.addEventListener('keydown', e => {
  if(e.key === ' ' && e.target === document.body) {
    e.preventDefault();
    if(window.togglePlay) window.togglePlay();
  }
  if(e.key === '?' && !e.ctrlKey && !e.metaKey) showKeyboardHelp();
});

// ─── INIT ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initShareSystem, 500);
  setTimeout(fixMobileHome, 300);
  window.addEventListener('resize', fixMobileHome);
  
  // Enhance admin when it's opened
  const adminModal = document.getElementById('admin-panel-modal');
  if(adminModal) {
    const obs = new MutationObserver(() => {
      if(adminModal.classList.contains('show')) enhanceAdmin();
    });
    obs.observe(adminModal, {attributes: true, attributeFilter: ['class']});
  }
  
  // Fix: intercept search input to use improved search
  setTimeout(() => {
    const si = document.getElementById('search-input');
    if(si && !si._patched) {
      si._patched = true;
      // Remove any existing handlers by cloning
      const newSi = si.cloneNode(true);
      si.parentNode.replaceChild(newSi, si);
      newSi.addEventListener('input', function(e) {
        clearTimeout(window._searchDebounce);
        const q = e.target.value.trim();
        if(q.length < 2) {
          document.getElementById('search-results').innerHTML = '<div class="search-empty">Start typing to search 12,000+ stations worldwide</div>';
          return;
        }
        document.getElementById('search-results').innerHTML = '<div class="search-empty">Scanning frequencies...</div>';
        window._searchDebounce = setTimeout(() => window.doSearchFixed(q), 300);
      });
    }
  }, 800);
});

