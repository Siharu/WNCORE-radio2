/* ═══════════════════════════════════════════════════════════════════════
   WNCORE — PERSONA 5 TRANSITION ENGINE
   File: p5-transitions.js
   Runs after: main.js, improvements.js, wncore-upgrades.js, v5-fixes.js
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. WIPE OVERLAY DOM ─────────────────────────────────────────────── */
  function buildWipe() {
    if (document.getElementById('p5-wipe')) return;
    const wipe = document.createElement('div');
    wipe.id = 'p5-wipe';
    wipe.innerHTML = '<div id="p5-wipe-a"></div><div id="p5-wipe-b"></div>';
    document.body.appendChild(wipe);
  }

  /* ── 2. CORE WIPE SEQUENCE ───────────────────────────────────────────── */
  // Returns a Promise that resolves when the wipe-out is complete.
  // Phase A: panels sweep IN  (covers content)
  // Phase B: caller swaps the page
  // Phase C: panels sweep OUT (reveals new content)
  function runWipe(swapFn) {
    return new Promise(function (resolve) {
      const wipe = document.getElementById('p5-wipe');
      if (!wipe) {
        // Fallback: no wipe element, just run the swap
        swapFn();
        resolve();
        return;
      }

      // Reset to off-screen left before starting
      wipe.classList.remove('in', 'out');

      // Force a reflow so the removal of classes is applied before re-adding
      void wipe.offsetWidth;

      // Phase A: sweep in
      wipe.classList.add('in');

      setTimeout(function () {
        // Phase B: swap content while panels are covering the screen
        swapFn();

        // Small pause at peak coverage
        setTimeout(function () {
          // Phase C: sweep out
          wipe.classList.remove('in');
          wipe.classList.add('out');

          // After sweep-out, trigger page enter animation
          setTimeout(function () {
            wipe.classList.remove('out');
            resolve();
          }, 220);
        }, 60);
      }, 230); // wait for sweep-in to complete (220ms + small buffer)
    });
  }

  /* ── 3. PATCH showPage ───────────────────────────────────────────────── */
  // We wrap whatever showPage is at boot time (already patched by
  // improvements.js patchShowPage). We ONLY add the wipe; we do not
  // replicate the original logic.
  function installP5Transitions() {
    // Guard: don't double-patch
    if (typeof window.showPage !== 'function') return;
    if (window.showPage._p5Patched) return;

    const previousShowPage = window.showPage;

    window.showPage = function p5ShowPage(id, linkEl) {
      // Get currently active page element
      const currentPage = document.querySelector('.page.active');
      const nextPage    = document.getElementById('page-' + id);

      // If same page or page not found, defer to original with no wipe
      if (!nextPage || (currentPage && currentPage === nextPage)) {
        previousShowPage(id, linkEl);
        return;
      }

      // Remove the p5-enter class from all pages to prevent stale animation
      document.querySelectorAll('.page').forEach(function (p) {
        p.classList.remove('p5-enter');
      });

      // Run the wipe, then call the original showPage inside it
      runWipe(function () {
        // Call the previously-patched showPage (which handles favorites,
        // charts loading, active class toggling, etc.)
        previousShowPage(id, linkEl);

        // Trigger the enter animation on the newly-active page
        // Use rAF to ensure the display:block has been applied first
        requestAnimationFrame(function () {
          const activePage = document.getElementById('page-' + id);
          if (activePage) {
            activePage.classList.add('p5-enter');
            // Clean up after animation ends
            activePage.addEventListener('animationend', function handler() {
              activePage.classList.remove('p5-enter');
              activePage.removeEventListener('animationend', handler);
            });
          }
        });
      });

      // Scroll to top: improvements.js does window.scrollTo but inside
      // the wipe we want it to happen after the swap
      // The original already calls scrollTo; this is a safety net
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    window.showPage._p5Patched = true;
  }

  /* ── 4. GENRE PILL STAMP EFFECT ─────────────────────────────────────── */
  function initGenreStamps() {
    // Use event delegation on the genre strip (loaded dynamically)
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.genre-btn');
      if (!btn) return;
      btn.classList.remove('p5-stamp');
      // Force reflow so removing+adding the class restarts the animation
      void btn.offsetWidth;
      btn.classList.add('p5-stamp');
      btn.addEventListener('animationend', function handler() {
        btn.classList.remove('p5-stamp');
        btn.removeEventListener('animationend', handler);
      });
    });
  }

  /* ── 5. MOBILE BOTTOM NAV TAP EFFECT ────────────────────────────────── */
  function initMbnTaps() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.mbn-btn');
      if (!btn) return;
      btn.classList.remove('p5-tap');
      void btn.offsetWidth;
      btn.classList.add('p5-tap');
      btn.addEventListener('animationend', function handler() {
        btn.classList.remove('p5-tap');
        btn.removeEventListener('animationend', handler);
      });
    });
  }

  /* ── 6. MOBILE SCROLL FIX ────────────────────────────────────────────── */
  // Problem: on mobile, after switching pages, content sometimes appears
  // stuck because the browser hasn't repositioned the scroll. We reset
  // the scroll on every page switch (the wipe covers the jump).
  // Already called in the patched showPage above, but we also hook into
  // the mobile bottom nav buttons in case they bypass showPage.
  function initMobileScrollFix() {
    document.addEventListener('click', function (e) {
      const mbnBtn = e.target.closest('.mbn-btn');
      if (mbnBtn) {
        // Short delay so the page swap happens first, then snap to top
        setTimeout(function () {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }, 50);
      }
    });
  }

  /* ── 7. OVERRIDE THE EXISTING pt-style BLOCK ─────────────────────────── */
  // improvements.js injects a <style id="pt-style"> with weak transitions.
  // We remove it and let our CSS file take over.
  function removeLegacyTransitionStyle() {
    const existing = document.getElementById('pt-style');
    if (existing) {
      existing.remove();
    }
  }

  /* ── 8. BOOT ─────────────────────────────────────────────────────────── */
  function boot() {
    removeLegacyTransitionStyle();
    buildWipe();
    installP5Transitions();
    initGenreStamps();
    initMbnTaps();
    initMobileScrollFix();
  }

  // Wait for all other scripts to have run their boot sequences.
  // All scripts use 'defer', so DOMContentLoaded fires after them.
  // We add a small setTimeout to ensure bootV2() in improvements.js
  // (which runs at DOMContentLoaded or immediately) has finished patching.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(boot, 0);
    });
  } else {
    setTimeout(boot, 0);
  }

})();
