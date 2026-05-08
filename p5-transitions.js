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

    /* Reset panels to off-screen left instantly */
    wipe.classList.remove('in', 'out');
    var a = document.getElementById('p5-wipe-a');
    var b = document.getElementById('p5-wipe-b');
    if (a) { a.style.transition = 'none'; a.style.transform = 'translateX(-115%)'; }
    if (b) { b.style.transition = 'none'; b.style.transform = 'translateX(-115%)'; }

    void wipe.offsetWidth; /* force reflow */

    if (a) a.style.cssText = '';
    if (b) b.style.cssText = '';

    /* Phase A: sweep IN */
    wipe.classList.add('in');

    setTimeout(function () {
      /* Phase B: swap page + scroll reset */
      swapFn();
      window.scrollTo({ top: 0, behavior: 'instant' });

      /* Trigger enter animation on incoming page */
      requestAnimationFrame(function () {
        var activePage = document.querySelector('.page.active');
        if (activePage) {
          activePage.classList.remove('p5-enter');
          void activePage.offsetWidth;
          activePage.classList.add('p5-enter');
          activePage.addEventListener('animationend', function handler() {
            activePage.classList.remove('p5-enter');
            activePage.removeEventListener('animationend', handler);
          });
        }
      });

      /* Phase C: sweep OUT after brief hold */
      setTimeout(function () {
        wipe.classList.remove('in');
        void wipe.offsetWidth;
        wipe.classList.add('out');

        setTimeout(function () {
          wipe.classList.remove('out');
          _wiping = false;
        }, 250);
      }, 60);

    }, 255);
  }

  /* ── 3. PATCH showPage ─────────────────────────────────────────────── */
  function installP5Patch() {
    if (typeof window.showPage !== 'function') return;
    if (window.showPage._p5Patched) return;

    var prevShowPage = window.showPage;

    window.showPage = function p5ShowPage(id, linkEl) {
      var nextPage = document.getElementById('page-' + id);
      var currPage = document.querySelector('.page.active');

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
  /* Must run inside the same setTimeout(0) as installP5Patch so that
     bootV2() in improvements.js (which also runs at DOMContentLoaded)
     has already injected and we can reliably remove it. */
  function removeLegacyStyle() {
    var el = document.getElementById('pt-style');
    if (el) el.remove();
  }

  /* ── 7. BOOT ───────────────────────────────────────────────────────── */
  function boot() {
    buildWipe();
    initGenreStamps();
    initMbnTaps();

    /* Defer patch + style removal so all other deferred scripts
       (improvements.js bootV2, patchShowPage, etc.) have run first */
    setTimeout(function () {
      removeLegacyStyle();
      installP5Patch();
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
