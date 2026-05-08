/* ═══════════════════════════════════════════════════════════════════════
   WNCORE — PERSONA 5 TRANSITION ENGINE  v2
   File: p5-transitions.js
   Must load last — after main.js, improvements.js, all patches
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. BUILD WIPE OVERLAY ─────────────────────────────────────────── */
  function buildWipe() {
    if (document.getElementById('p5-wipe')) return;
    var wipe = document.createElement('div');
    wipe.id = 'p5-wipe';
    wipe.innerHTML = '<div id="p5-wipe-a"></div><div id="p5-wipe-b"></div>';
    document.body.appendChild(wipe);
  }

  /* ── 2. WIPE SEQUENCE ──────────────────────────────────────────────── */
  var _wiping = false;

  function runWipe(swapFn) {
    // Prevent stacking wipes if user clicks fast
    if (_wiping) {
      swapFn();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    var wipe = document.getElementById('p5-wipe');
    if (!wipe) {
      swapFn();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    _wiping = true;

    // Reset: remove both classes, force panels back to start position
    wipe.classList.remove('in', 'out');
    var a = document.getElementById('p5-wipe-a');
    var b = document.getElementById('p5-wipe-b');
    // Temporarily disable transition so the reset is instant
    if (a) { a.style.transition = 'none'; a.style.transform = 'translateX(-115%)'; }
    if (b) { b.style.transition = 'none'; b.style.transform = 'translateX(-115%)'; }

    // Force reflow
    void wipe.offsetWidth;

    // Remove inline styles so CSS class transitions take over
    if (a) a.style.cssText = '';
    if (b) b.style.cssText = '';

    // Phase A: sweep IN (220ms + 20ms delay on b = ~250ms total)
    wipe.classList.add('in');

    setTimeout(function () {
      // Phase B: swap content while panels are covering the screen
      swapFn();
      window.scrollTo({ top: 0, behavior: 'instant' });

      // Trigger enter animation on newly active page
      requestAnimationFrame(function () {
        var activePage = document.querySelector('.page.active');
        if (activePage) {
          activePage.classList.remove('p5-enter');
          void activePage.offsetWidth; // reflow to restart animation
          activePage.classList.add('p5-enter');
          activePage.addEventListener('animationend', function handler() {
            activePage.classList.remove('p5-enter');
            activePage.removeEventListener('animationend', handler);
          });
        }
      });

      // Small pause at peak coverage, then sweep OUT
      setTimeout(function () {
        wipe.classList.remove('in');
        void wipe.offsetWidth;
        wipe.classList.add('out');

        // After out sweep completes (210ms + 15ms = ~230ms), clean up
        setTimeout(function () {
          wipe.classList.remove('out');
          _wiping = false;
        }, 250);
      }, 60);

    }, 255); // wait for full sweep-in to finish
  }

  /* ── 3. PATCH showPage ─────────────────────────────────────────────── */
  function installP5Patch() {
    if (typeof window.showPage !== 'function') return;
    if (window.showPage._p5Patched) return;

    var prevShowPage = window.showPage;

    window.showPage = function p5ShowPage(id, linkEl) {
      var nextPage = document.getElementById('page-' + id);
      var currPage = document.querySelector('.page.active');

      // Same page or not found — no wipe, just run
      if (!nextPage || (currPage && currPage === nextPage)) {
        prevShowPage(id, linkEl);
        return;
      }

      runWipe(function () {
        prevShowPage(id, linkEl);
      });
    };

    window.showPage._p5Patched = true;
  }

  /* ── 4. GENRE PILL STAMP ───────────────────────────────────────────── */
  function initGenreStamps() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.genre-btn');
      if (!btn) return;
      btn.classList.remove('p5-stamp');
      void btn.offsetWidth;
      btn.classList.add('p5-stamp');
      btn.addEventListener('animationend', function h() {
        btn.classList.remove('p5-stamp');
        btn.removeEventListener('animationend', h);
      });
    });
  }

  /* ── 5. MOBILE BOTTOM NAV TAP ──────────────────────────────────────── */
  function initMbnTaps() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.mbn-btn');
      if (!btn) return;
      btn.classList.remove('p5-tap');
      void btn.offsetWidth;
      btn.classList.add('p5-tap');
      btn.addEventListener('animationend', function h() {
        btn.classList.remove('p5-tap');
        btn.removeEventListener('animationend', h);
      });
    });
  }

  /* ── 6. REMOVE LEGACY TRANSITION STYLE ────────────────────────────── */
  // improvements.js injects <style id="pt-style"> with weak fade rules.
  // We remove it so our CSS takes over cleanly.
  function removeLegacyStyle() {
    var el = document.getElementById('pt-style');
    if (el) el.remove();
  }

  /* ── 7. BOOT ───────────────────────────────────────────────────────── */
  function boot() {
    removeLegacyStyle();
    buildWipe();
    // Use setTimeout(0) so all other deferred scripts have fully executed
    // their boot sequences (bootV2, patchShowPage, etc.) before we patch
    setTimeout(function () {
      installP5Patch();
    }, 0);
    initGenreStamps();
    initMbnTaps();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
