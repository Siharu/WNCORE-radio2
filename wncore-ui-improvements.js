// WNCORE Radio — UI/UX Improvements JS
// Load LAST in index.html: <script src="wncore-ui-improvements.js" defer></script>
// Works alongside all existing scripts — no conflicts.

'use strict';

(function WNCORE_UI() {

  // ─── TOAST SYSTEM ────────────────────────────────────────────────────────────
  // window.toast('Message', 'success|error|warn')
  let _toastTimer = null;
  window.toast = function(msg, type) {
    type = type || 'default';
    let el = document.getElementById('wncore-ui-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wncore-ui-toast';
      el.className = 'wncore-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'wncore-toast ' + type;
    void el.offsetWidth; // force reflow so transition fires even if already shown
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  };

  // ─── HEADER SCROLL COMPACT ───────────────────────────────────────────────────
  (function initScrollHeader() {
    const header = document.querySelector('header');
    if (!header) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('scrolled', window.scrollY > 10);
        ticking = false;
      });
    }, { passive: true });
  })();

  // ─── PLAYER BAR: PLAYING STATE ON ART ────────────────────────────────────────
  // Adds/removes .playing on pb-art for the CSS pulsing ring animation.
  (function initPlayerArtState() {
    const audio = document.getElementById('audio');
    const art   = document.getElementById('pb-art');
    if (!audio || !art) return;
    audio.addEventListener('playing', () => art.classList.add('playing'));
    audio.addEventListener('pause',   () => art.classList.remove('playing'));
    audio.addEventListener('ended',   () => art.classList.remove('playing'));
    audio.addEventListener('error',   () => art.classList.remove('playing'));
  })();

  // ─── STATION TABLE: ROW CLICK RIPPLE ─────────────────────────────────────────
  (function initTableRipple() {
    function addRipple(e) {
      const row = e.currentTarget;
      row.style.background = 'rgba(200,71,42,0.06)';
      setTimeout(() => { row.style.background = ''; }, 320);
    }
    function wire() {
      document.querySelectorAll('.station-table tbody tr:not([data-ripple])').forEach(tr => {
        tr.setAttribute('data-ripple', '1');
        tr.addEventListener('click', addRipple);
      });
    }
    wire();
    const tbody = document.getElementById('station-tbody');
    if (tbody) new MutationObserver(wire).observe(tbody, { childList: true });
    const chartsTbody = document.getElementById('charts-tbody');
    if (chartsTbody) new MutationObserver(wire).observe(chartsTbody, { childList: true });
  })();

  // ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
  // Space/K = play, Alt+←/→ = prev/next, / = search
  // M (mute) NOT handled here — improvements.js already has its own
  // _muted/_premuteVol state; interfering would break unmute restore.
  (function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (document.querySelector('.search-modal-backdrop.open, .modal-backdrop.open, #wncore-admin-overlay')) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (typeof togglePlay === 'function') togglePlay();
          break;
        case 'ArrowLeft':
          if (e.altKey) { e.preventDefault(); if (typeof skipStation === 'function') skipStation(-1); }
          break;
        case 'ArrowRight':
          if (e.altKey) { e.preventDefault(); if (typeof skipStation === 'function') skipStation(1); }
          break;
        case '/':
          e.preventDefault();
          if (typeof openSearch === 'function') openSearch();
          break;
      }
    });
  })();

  // ─── CTRL+K: OPEN SEARCH ─────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (typeof openSearch === 'function') openSearch();
    }
  });

  // ─── KEYBOARD SHORTCUT HINT ───────────────────────────────────────────────────
  // Press '?' to toggle a cheatsheet overlay.
  (function initShortcutHint() {
    document.addEventListener('keydown', function(e) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key !== '?') return;
      e.preventDefault();

      const existing = document.getElementById('wncore-shortcut-hint');
      if (existing) { existing.remove(); return; }

      const el = document.createElement('div');
      el.id = 'wncore-shortcut-hint';
      el.style.cssText = [
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%)',
        'background:var(--surface);border:1px solid var(--border)',
        'border-radius:16px;padding:28px 32px;z-index:99999',
        'font-family:"DM Mono",monospace;font-size:0.72rem',
        'box-shadow:0 32px 80px rgba(0,0,0,0.2)',
        'min-width:280px;color:var(--text)',
        'animation:modal-slide-in 0.22s cubic-bezier(0.22,1,0.36,1) both',
      ].join(';');

      const k = 'background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:3px 8px;font-size:0.62rem;color:var(--text2)';
      el.innerHTML = `
        <div style="font-size:0.6rem;letter-spacing:2px;color:var(--text3);margin-bottom:16px">KEYBOARD SHORTCUTS</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 20px;align-items:center;line-height:1.6">
          <kbd style="${k}">Space / K</kbd><span style="color:var(--text2)">Play / Pause</span>
          <kbd style="${k}">Alt + ← →</kbd><span style="color:var(--text2)">Prev / Next</span>
          <kbd style="${k}">M</kbd><span style="color:var(--text2)">Mute / Unmute</span>
          <kbd style="${k}">/  or  Ctrl+K</kbd><span style="color:var(--text2)">Open Search</span>
          <kbd style="${k}">Shift+C</kbd><span style="color:var(--text2)">Copy share link</span>
          <kbd style="${k}">?</kbd><span style="color:var(--text2)">Show / Hide shortcuts</span>
          <kbd style="${k}">Ctrl+B</kbd><span style="color:rgba(200,71,42,0.6)">Admin panel (hold)</span>
        </div>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);font-size:0.6rem;color:var(--text3);text-align:center">Click outside or press ? to dismiss</div>
      `;
      document.body.appendChild(el);
      // Close on click outside
      setTimeout(() => {
        function handler(ev) {
          if (!el.contains(ev.target)) { el.remove(); document.removeEventListener('click', handler); }
        }
        document.addEventListener('click', handler);
      }, 100);
    });
  })();

  // ─── VOLUME SCROLL WHEEL ──────────────────────────────────────────────────────
  // improvements.js already handles vol-slider input + wncore-vol storage.
  // We ONLY add scroll-wheel on the volume area — no duplicate listeners.
  (function initVolScrollWheel() {
    const slider = document.getElementById('vol-slider');
    if (!slider) return;
    const volArea = slider.closest('.pb-vol');
    if (!volArea) return;
    const audio = document.getElementById('audio');
    if (!audio) return;

    volArea.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      const newVol = Math.max(0, Math.min(1, audio.volume + delta));
      audio.volume = newVol;
      slider.value = newVol;
      try { localStorage.setItem('wncore-vol', String(newVol)); } catch(_) {}
    }, { passive: false });
  })();

  // ─── COPY STATION URL (right-click row) ──────────────────────────────────────
  // Only intercepts rows that actually have data-url set. Most rows won't have
  // this attribute unless the station rendering code sets it, so this is safe
  // and won't block normal right-click elsewhere.
  (function initCopyOnContext() {
    document.addEventListener('contextmenu', (e) => {
      const row = e.target.closest('.station-table tr');
      if (!row) return;
      const url = row.dataset.url;
      if (!url) return; // don't intercept rows without an explicit data-url
      e.preventDefault();
      if (!navigator.clipboard) { window.toast('Copy not supported', 'warn'); return; }
      navigator.clipboard.writeText(url)
        .then(() => window.toast('Stream URL copied!', 'success'))
        .catch(() => window.toast('Could not copy URL', 'error'));
    });
  })();

  // ─── NOW-PLAYING TITLE MARQUEE ────────────────────────────────────────────────
  // Scrolls long station names rather than truncating them.
  // Uses real DOM clones (not ::after pseudo) so overflow:hidden works correctly.
  (function initMarquee() {
    if (document.getElementById('wncore-marquee-style')) return;
    const style = document.createElement('style');
    style.id = 'wncore-marquee-style';
    style.textContent = `
      .wnc-mq-wrap {
        overflow: hidden;
        white-space: nowrap;
        width: 100%;
        display: block;
      }
      .wnc-mq-inner {
        display: inline-block;
        white-space: nowrap;
      }
      .wnc-mq-inner.scrolling {
        animation: wnc-mq 14s linear infinite;
      }
      @keyframes wnc-mq {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `;
    document.head.appendChild(style);

    function wrap(el) {
      if (!el || el.dataset.mqInit) return;
      el.dataset.mqInit = '1';

      const origText = el.textContent.trim();
      const wrapEl  = document.createElement('span');
      wrapEl.className = 'wnc-mq-wrap';
      const inner   = document.createElement('span');
      inner.className = 'wnc-mq-inner';
      inner.textContent = origText;
      wrapEl.appendChild(inner);
      el.textContent = '';
      el.style.overflow = 'hidden';
      el.appendChild(wrapEl);

      let clone = null;

      function refresh(text) {
        inner.textContent = text;
        if (clone) { clone.remove(); clone = null; }
        inner.classList.remove('scrolling');
        requestAnimationFrame(() => {
          if (inner.scrollWidth > wrapEl.clientWidth + 4) {
            clone = document.createElement('span');
            clone.className = 'wnc-mq-inner scrolling';
            clone.textContent = '\u00a0\u00a0\u00a0\u00a0' + text; // leading spaces as separator
            clone.style.paddingLeft = '32px';
            wrapEl.appendChild(clone);
            inner.classList.add('scrolling');
          }
        });
      }

      // Watch for the app updating el.textContent directly
      new MutationObserver(() => {
        // If our wrap was replaced by the app, re-init
        if (!el.querySelector('.wnc-mq-wrap')) {
          const newText = el.textContent.trim();
          el.dataset.mqInit = '';
          el.textContent = '';
          el.style.overflow = '';
          wrap(el);
          refresh(newText);
        }
      }).observe(el, { childList: true });

      // Watch inner text changes
      new MutationObserver(() => refresh(inner.textContent)).observe(inner, { characterData: true, childList: true, subtree: true });
    }

    ['pb-name', 'np-name'].forEach(id => {
      const el = document.getElementById(id);
      if (el) wrap(el);
    });
  })();

  // ─── ADMIN SAVE: TOAST ON RESULT ─────────────────────────────────────────────
  // adminSaveField catches its own errors and never throws, so we can't wrap it.
  // Instead we patch adminSetStatus (which it calls with 'ok'/'err') to mirror
  // results as a toast — without duplicating the existing inline status UI.
  (function patchAdminStatus() {
    function tryPatch() {
      if (typeof window.adminSetStatus !== 'function') {
        setTimeout(tryPatch, 800);
        return;
      }
      const orig = window.adminSetStatus;
      window.adminSetStatus = function(key, status, msg) {
        orig.call(this, key, status, msg);
        if (status === 'ok')  window.toast('✓ ' + key + ' saved', 'success');
        if (status === 'err') window.toast('✗ Save failed', 'error');
      };
    }
    tryPatch();
  })();

  // ─── STAGGERED SCROLL REVEAL ──────────────────────────────────────────────────
  (function initScrollReveal() {
    const revealStyle = document.createElement('style');
    revealStyle.textContent = `
      .sr-hidden {
        opacity: 0;
        transform: translateY(16px);
        pointer-events: none;
        transition: opacity 0.44s cubic-bezier(0.22,1,0.36,1),
                    transform 0.44s cubic-bezier(0.22,1,0.36,1);
      }
      .sr-visible {
        opacity: 1 !important;
        transform: none !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(revealStyle);

    const SELECTORS = [
      '.featured-card',
      '.rec-card',
      '.trending-item',
      '.lm-channel-card',
      '#podcast-grid > *',
      '#genre-cards-grid > *',
      '#fav-grid > *',
    ].join(', ');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => {
          entry.target.classList.remove('sr-hidden');
          entry.target.classList.add('sr-visible');
        }, Math.min(i * 45, 300));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px 0px 0px' });

    function wireReveal() {
      document.querySelectorAll(SELECTORS).forEach(el => {
        if (el.classList.contains('sr-hidden') || el.classList.contains('sr-visible')) return;
        el.classList.add('sr-hidden');
        observer.observe(el);
      });
    }

    wireReveal();
    new MutationObserver(wireReveal).observe(document.body, { childList: true, subtree: true });
  })();

  // ─── COPY SHARE LINK (Shift+C) ────────────────────────────────────────────────
  (function initShareCopy() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!e.shiftKey || e.key.toUpperCase() !== 'C') return;
      if (document.querySelector('#wncore-admin-overlay')) return;

      const s = window.currentStation;
      if (!s || !s.url) { window.toast('No station playing', 'warn'); return; }
      if (!navigator.clipboard) { window.toast('Copy not supported', 'warn'); return; }

      const shareUrl = location.origin + location.pathname
        + '?station=' + encodeURIComponent(s.url)
        + '&name='    + encodeURIComponent(s.name || '');

      navigator.clipboard.writeText(shareUrl)
        .then(() => window.toast('Share link copied!', 'success'))
        .catch(() => window.toast('Could not copy', 'error'));
    });
  })();

  // ─── SEARCH: UP/DOWN KEYBOARD NAVIGATION ─────────────────────────────────────
  (function initSearchNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const results = document.getElementById('search-results');
      if (!results || !results.offsetParent) return;
      e.preventDefault();
      const items = Array.from(results.querySelectorAll('.search-result-item'));
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement);
      if (idx === -1) { items[0].focus(); return; }
      if (e.key === 'ArrowDown' && idx < items.length - 1) items[idx + 1].focus();
      if (e.key === 'ArrowUp'   && idx > 0)               items[idx - 1].focus();
    });
  })();

  // ─── ACTIVE ROW HIGHLIGHT ─────────────────────────────────────────────────────
  (function initActiveRow() {
    const s = document.createElement('style');
    s.textContent = `
      .station-table tbody tr.wncore-active-row {
        background: rgba(200,71,42,0.05) !important;
        box-shadow: inset 2px 0 0 var(--accent);
      }
      body.dark-mode .station-table tbody tr.wncore-active-row {
        background: rgba(200,71,42,0.08) !important;
      }
    `;
    document.head.appendChild(s);

    let _lastRow = null;
    function updateActiveRow() {
      if (_lastRow) { _lastRow.classList.remove('wncore-active-row'); _lastRow = null; }
      if (!window.currentStation || !window.currentStation.url) return;
      const url = window.currentStation.url;
      document.querySelectorAll('.station-table tbody tr').forEach(row => {
        const btn = row.querySelector('button[onclick]');
        if (btn && (btn.getAttribute('onclick') || '').includes(url)) {
          row.classList.add('wncore-active-row');
          _lastRow = row;
        }
      });
    }

    const audio = document.getElementById('audio');
    if (audio) audio.addEventListener('playing', updateActiveRow);
    ['station-tbody', 'charts-tbody'].forEach(id => {
      const el = document.getElementById(id);
      if (el) new MutationObserver(updateActiveRow).observe(el, { childList: true });
    });
  })();

  // ─── IDLE CURSOR ON GLOBE ─────────────────────────────────────────────────────
  (function initGlobeCursor() {
    const globe = document.getElementById('globe-container');
    if (!globe) return;
    let timer;
    globe.addEventListener('mousemove', () => {
      globe.style.cursor = 'crosshair';
      clearTimeout(timer);
      timer = setTimeout(() => { globe.style.cursor = 'none'; }, 2000);
    }, { passive: true });
    globe.addEventListener('mouseleave', () => {
      clearTimeout(timer);
      globe.style.cursor = 'crosshair';
    });
  })();

  // ─── ADMIN TICKER PERSIST ─────────────────────────────────────────────────────
  // Patches Ctrl+B dashboard ticker inject to also save to Supabase.
  // Token key confirmed as 'wncore_adm_sess_tk' (set by admin.js _setAuthed).
  (function patchAdminTicker() {
    function tryPatch() {
      if (typeof window.__admInjectTicker !== 'function') {
        setTimeout(tryPatch, 800);
        return;
      }
      const orig = window.__admInjectTicker;
      window.__admInjectTicker = async function() {
        const inp = document.getElementById('adm-ticker-msg');
        const msg = inp ? inp.value.trim() : '';
        orig.call(this); // clears input, injects to DOM
        if (!msg) return;

        try {
          const raw   = sessionStorage.getItem('wncore_adm_sess_tk');
          const token = raw ? atob(raw) : '';
          if (!token) { window.toast('Ticker local only (not authed)', 'warn'); return; }

          const r = await fetch('/api/config', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body:    JSON.stringify({ key: 'ticker_inject', value: msg.toUpperCase() }),
          });
          // 400 = valid auth but bad key (shouldn't happen); 200 = saved
          if (r.ok || r.status === 400) {
            window.toast('✓ Ticker persisted', 'success');
          } else {
            window.toast('Ticker local only', 'warn');
          }
        } catch(_) {
          window.toast('Ticker local only', 'warn');
        }
      };
    }
    tryPatch();
  })();

  console.log('%cWNCORE UI improvements loaded', 'color:#c8472a;font-family:monospace;font-size:11px');

})();
