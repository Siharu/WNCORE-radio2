/* ═══════════════════════════════════════════════════════════════════
   WNCORE — wncore-bugfix2.js
   Fix 1: Dark mode — white active genre/language buttons + native select
   Fix 2: Anime section card clicks freeze entire page

   Load order: after improvements.js, before wncore-ui-improvements.js
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

(function WNCORE_BUGFIX2() {

  // ─────────────────────────────────────────────────────────────────
  // FIX 1A: genre-btn.active — white-on-white in dark mode
  //
  // Root cause: `.genre-btn.active { background:var(--text); color:#fff }`
  // In dark mode, --text = #f0ede8 (near-white), making it invisible.
  // The fix patches the style rule to use color:var(--bg) so the text
  // always contrasts against whatever --text resolves to.
  //
  // We inject a <style> that overrides the rule with higher specificity.
  // ─────────────────────────────────────────────────────────────────
  (function fixGenreBtnActive() {
    var style = document.createElement('style');
    style.id = 'wnc-btn-fix';
    style.textContent = [
      /* genre pill — was color:#fff, now uses --bg so it's dark on cream */
      '.genre-btn.active { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }',

      /* lang button — same pattern, fix dark mode active state */
      'body.dark-mode .lang-btn.active { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }',
      '.lang-btn.active { background: var(--text) !important; color: var(--bg) !important; border-color: var(--text) !important; }',

      /* search filter active */
      '.search-filter-btn.active { background: var(--text) !important; color: var(--bg) !important; border-color: var(--text) !important; }',
    ].join('\n');
    document.head.appendChild(style);
  })();


  // ─────────────────────────────────────────────────────────────────
  // FIX 1B: native <select> dark mode
  //
  // The country-filter-select is a native OS widget — browsers render
  // it with system colours unless you force appearance:none + manual
  // colours. We inject CSS that explicitly styles it for dark mode.
  // ─────────────────────────────────────────────────────────────────
  (function fixSelectDarkMode() {
    var style = document.createElement('style');
    style.id = 'wnc-select-fix';
    style.textContent = [
      'body.dark-mode .country-filter-select {',
      '  -webkit-appearance: none;',
      '  appearance: none;',
      '  background: var(--surface2) !important;',
      '  color: var(--text) !important;',
      '  border-color: var(--border) !important;',
      '  color-scheme: dark;',
      '}',
      /* Light mode stays normal */
      'body:not(.dark-mode) .country-filter-select {',
      '  color-scheme: light;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  })();


  // ─────────────────────────────────────────────────────────────────
  // FIX 2: Anime card freeze
  //
  // Three overlapping causes:
  //
  // A) audio.play() AbortError cascade
  //    When a user clicks card A, then quickly card B, card A's play()
  //    throws AbortError (because audio.src was overwritten). The retry
  //    setTimeout(800ms) fires, sets src again, which aborts card B's
  //    play, and so on — infinite loop of aborts → browser throttles
  //    the tab → everything freezes.
  //
  //    Fix: guard playStation with a debounce lock. Only one play()
  //    attempt can be in flight at a time. If a new station is clicked
  //    while one is pending, cancel the pending retry and start fresh.
  //
  // B) patchShowPage page-exit race
  //    If the user navigates TO the anime page and then immediately
  //    clicks a card within the 220ms page-exit window, the old page's
  //    `page-exit` removal timer fires AFTER the anime page is active,
  //    but since `.page { pointer-events:none }` is the base rule and
  //    the anime page already has `.active { pointer-events:auto }`,
  //    this shouldn't cause issues by itself — UNLESS the timer fires
  //    and accidentally removes `active` from the wrong element due to
  //    a querySelector('.page.active') race. We harden the timer.
  //
  // C) station-hover-pop / station-preview staying `.visible`
  //    After hovering a table row and quickly navigating to anime page,
  //    the preview/popover can remain visible with `pointer-events:all`,
  //    covering part of the page. We clean them on page navigation.
  // ─────────────────────────────────────────────────────────────────

  // --- 2A: Debounce guard for playStation ---
  (function fixPlayStationAbortCascade() {
    var _playLocked = false;
    var _playRetryTimer = null;

    function waitForPlayStation(cb, attempts) {
      if (attempts > 30) return; // give up after 3s
      if (typeof window.playStation === 'function') { cb(); return; }
      setTimeout(function() { waitForPlayStation(cb, (attempts||0) + 1); }, 100);
    }

    waitForPlayStation(function() {
      if (window.playStation._abortFixed) return;
      var orig = window.playStation;

      window.playStation = function(url, name, meta, emoji) {
        // Cancel any pending abort-retry
        if (_playRetryTimer) {
          clearTimeout(_playRetryTimer);
          _playRetryTimer = null;
        }

        // Find audio element
        var audio = document.getElementById('audio') ||
                    document.querySelector('audio');
        if (!audio) { orig(url, name, meta, emoji); return; }

        // If a play is already resolving, pause first to cleanly abort
        if (_playLocked) {
          try { audio.pause(); } catch(e) {}
        }
        _playLocked = true;

        // Override the src directly so the original function's
        // audio.play() call operates on fresh state
        try { audio.src = url; } catch(e) {}

        // Call original (it sets src again harmlessly and calls play())
        try {
          orig(url, name, meta, emoji);
        } catch(e) {
          _playLocked = false;
          return;
        }

        // Release lock after a short window — enough to catch fast double-clicks
        setTimeout(function() { _playLocked = false; }, 600);
      };

      window.playStation._abortFixed = true;
      // Preserve any existing patch flags
      if (orig._v2patched) window.playStation._v2patched = true;
      if (orig._patched)   window.playStation._patched   = true;
      if (orig._wnPatched) window.playStation._wnPatched  = true;
    });
  })();


  // --- 2B: Harden patchShowPage page-exit timer ---
  (function fixPageExitRace() {
    function waitForShowPage(cb, attempts) {
      if (attempts > 30) return;
      if (typeof window.showPage === 'function') { cb(); return; }
      setTimeout(function() { waitForShowPage(cb, (attempts||0) + 1); }, 100);
    }

    waitForShowPage(function() {
      if (window.showPage._exitFixed) return;
      var orig = window.showPage;

      window.showPage = function(id, linkEl) {
        // Capture the current active page BEFORE calling orig
        var leaving = document.querySelector('.page.active');
        var leavingId = leaving ? leaving.id : null;

        orig(id, linkEl);

        // Ensure the page-exit class is removed from the RIGHT element
        // (the one that was active before, identified by captured ID)
        if (leavingId && leavingId !== 'page-' + id) {
          var leavingEl = document.getElementById(leavingId);
          if (leavingEl) {
            leavingEl.classList.add('page-exit');
            setTimeout(function() {
              if (leavingEl) leavingEl.classList.remove('page-exit');
            }, 250);
          }
        }

        // Clean up any stuck hover previews / popovers
        ['station-preview', 'station-hover-pop'].forEach(function(cid) {
          var el = document.getElementById(cid);
          if (el) el.classList.remove('visible');
        });
      };

      // Preserve patch flags so upstream wrappers don't double-patch
      window.showPage._exitFixed = true;
      if (orig._wnPatched) window.showPage._wnPatched = true;
      if (orig._exitFixed) window.showPage._exitFixed = true;
    });
  })();


  // --- 2C: Clean stuck overlays when anime page becomes active ---
  (function cleanAnimePageOverlays() {
    // MutationObserver watching for #page-anime getting .active class
    var animePageEl = document.getElementById('page-anime');
    if (!animePageEl) {
      // Page may not exist yet — wait for DOM
      document.addEventListener('DOMContentLoaded', function() {
        animePageEl = document.getElementById('page-anime');
        if (animePageEl) watchAnime(animePageEl);
      });
      return;
    }
    watchAnime(animePageEl);

    function watchAnime(el) {
      var obs = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            if (el.classList.contains('active')) {
              onAnimePageActive();
            }
          }
        });
      });
      obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    }

    function onAnimePageActive() {
      // Kill any stuck pointer-events:all overlays
      ['station-preview', 'station-hover-pop', 'bgplay-banner'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.classList.remove('visible', 'show'); }
      });

      // Ensure the anime page itself and its children are interactive
      setTimeout(function() {
        var page = document.getElementById('page-anime');
        if (page && page.classList.contains('active')) {
          // Belt-and-suspenders: force pointer-events auto
          page.style.pointerEvents = 'auto';
        }
      }, 300);
    }
  })();


  // --- 2D: Emergency escape hatch ---
  // If the page somehow gets completely frozen (no clicks work anywhere),
  // pressing Escape will clean all known blocking overlays and re-enable
  // pointer events on the active page.
  (function emergencyEscape() {
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;

      var frozenSigns = [
        document.querySelector('.page.active[style*="pointer-events: none"]'),
        document.querySelector('.page.active[style*="pointer-events:none"]'),
      ].filter(Boolean);

      if (frozenSigns.length === 0) return; // not frozen, let normal Esc handling work

      // Force-reset active page
      document.querySelectorAll('.page').forEach(function(p) {
        p.style.pointerEvents = '';
        p.classList.remove('page-exit');
      });
      var active = document.querySelector('.page.active');
      if (active) active.style.pointerEvents = 'auto';
    });
  })();


  // ─────────────────────────────────────────────────────────────────
  // FIX 3: anime-station-card click — add visual feedback to confirm
  // the click registered (prevents confused re-clicks that cause cascade)
  // ─────────────────────────────────────────────────────────────────
  (function addAnimeCardFeedback() {
    var style = document.createElement('style');
    style.id = 'wnc-anime-card-fix';
    style.textContent = [
      '.anime-station-card { cursor: pointer; user-select: none; }',
      '.anime-station-card:active { transform: scale(0.97) !important; opacity: 0.8; }',
      '.anime-station-card.playing {',
      '  border-color: var(--anime-pink) !important;',
      '  box-shadow: 0 0 0 2px rgba(233,30,140,0.2) !important;',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    // Patch playAnimeStation to mark the playing card and prevent double-fire
    var _animePlayLocked = false;

    function waitForFn(cb) {
      if (typeof window.playAnimeStation === 'function') { cb(); return; }
      setTimeout(function() { waitForFn(cb); }, 150);
    }

    waitForFn(function() {
      if (window.playAnimeStation._cardFixed) return;
      var orig = window.playAnimeStation;

      window.playAnimeStation = function(idx) {
        if (_animePlayLocked) return;
        _animePlayLocked = true;
        setTimeout(function() { _animePlayLocked = false; }, 800);

        // Visual: mark which card is playing
        document.querySelectorAll('.anime-station-card').forEach(function(c) {
          c.classList.remove('playing');
        });
        var cards = document.querySelectorAll('.anime-station-card');
        if (cards[idx]) cards[idx].classList.add('playing');

        orig(idx);
      };
      window.playAnimeStation._cardFixed = true;
    });
  })();


  console.log('%cWNCORE bugfix2 loaded — dark mode + anime freeze fixes', 'color:#c8472a;font-family:monospace;font-size:11px');

})();
