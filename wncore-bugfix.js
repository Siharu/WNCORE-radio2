/* ═══════════════════════════════════════════════════════════════════════
   WNCORE — BUG FIX PATCH
   File: wncore-bugfix.js
   Fixes JS-level bugs found in audit. Load last.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── BUG 1: showPage crashes if page element doesn't exist ──────────
     main.js line 858: document.getElementById('page-'+id).classList.add('active')
     has NO null check. If an invalid id is passed, this throws and
     breaks the entire page-switching system.                          */
  function patchShowPageNullSafety() {
    var prev = window.showPage;
    if (!prev || prev._nullSafe) return;

    window.showPage = function safeShowPage(id, linkEl) {
      var target = document.getElementById('page-' + id);
      if (!target) {
        console.warn('[WNCORE] showPage: no element with id "page-' + id + '"');
        return;
      }
      prev(id, linkEl);
    };
    window.showPage._nullSafe = true;
    /* Preserve existing patch flags so other wrappers don't re-wrap */
    window.showPage._wnPatched = prev._wnPatched || false;
    window.showPage._p5Patched = prev._p5Patched || false;
  }

  /* ── BUG 2: Swipe hint toast hardcoded bottom:90px ──────────────────
     playStation() creates a div with inline style bottom:90px which
     sits behind the mobile bottom nav (player-h ~76px + 56px nav = 132px).
     We patch playStation to intercept and fix the style after creation. */
  function patchSwipeHint() {
    var prev = window.playStation;
    if (!prev || prev._swipeFixed) return;

    window.playStation = function fixedPlayStation() {
      prev.apply(this, arguments);
      /* The hint is created 1200ms after play — observe for it */
      setTimeout(function () {
        document.querySelectorAll('body > div').forEach(function (el) {
          /* Identify the hint by its text content and inline style */
          if (
            el.style.position === 'fixed' &&
            el.style.bottom === '90px' &&
            el.textContent.indexOf('Swipe') !== -1
          ) {
            var playerH = parseInt(
              getComputedStyle(document.documentElement)
                .getPropertyValue('--player-h') || '76'
            );
            el.style.bottom = (playerH + 56 + 14) + 'px';
          }
        });
      }, 1300); /* slightly after the 1200ms delay in playStation */
    };
    window.playStation._swipeFixed = true;
  }

  /* ── BUG 3: Double showToast definitions ────────────────────────────
     improvements.js defines showToast(message, type, duration)
     improvements_patch.js redefines it as showToast(msg, duration)
     The patch version wins (loads after) but has no `type` parameter,
     so calls like showToast('msg', 'warn') pass 'warn' as duration,
     causing NaN timeout and the toast never dismissing.
     Fix: make the final showToast accept both signatures.            */
  function patchShowToast() {
    var existing = window.showToast;
    if (!existing || existing._sigFixed) return;

    window.showToast = function unifiedShowToast(msg, typeOrDuration, duration) {
      /* Detect which signature is being used:
         - If 2nd arg is a string ('warn','info','success') → it's a type
         - If 2nd arg is a number → it's a duration (patch-style call) */
      var resolvedDuration;
      if (typeof typeOrDuration === 'string') {
        /* improvements.js style: showToast(msg, type, duration) */
        resolvedDuration = (typeof duration === 'number') ? duration : 2800;
      } else if (typeof typeOrDuration === 'number') {
        /* improvements_patch.js style: showToast(msg, duration) */
        resolvedDuration = typeOrDuration;
      } else {
        resolvedDuration = 2800;
      }
      existing(msg, resolvedDuration);
    };
    window.showToast._sigFixed = true;
  }

  /* ── BUG 4: Favorites triple-loading ────────────────────────────────
     When navigating to favorites, three things call render functions:
     1. main.js showPage calls loadFavoritesPage()
     2. improvements.js patchShowPage wrapper calls buildFavoritesPage()
        + renderFavoritesPage()
     3. mbnNav() also calls buildFavoritesPage() + renderFavoritesPage()
     This causes the favorites list to render 2–3 times per navigation,
     visible as a flicker. We debounce renderFavoritesPage.           */
  function debounceRenderFavoritesPage() {
    var orig = window.renderFavoritesPage;
    if (!orig || orig._debounced) return;
    var timer;
    window.renderFavoritesPage = function debouncedRender() {
      clearTimeout(timer);
      timer = setTimeout(function () { orig(); }, 50);
    };
    window.renderFavoritesPage._debounced = true;
  }

  /* ── BUG 5: Constellation shown on desktop after resize ─────────────
     wncore-constellation.js checks isMobile() only at init time.
     If user loads on desktop, resizes to mobile, the canvas never inits
     (correct). But if they load on mobile and resize to desktop, the
     canvas persists. The resize handler in constellation hides it, but
     the CSS display:none on #wnc-constellation only applies to the
     initial state. After JS shows it, CSS media query won't re-hide it
     because the inline style from JS (display:block via parent show)
     takes precedence.
     Fix: ensure the canvas is hidden on desktop via CSS that beats inline. */
  /* This is handled in wncore-bugfix.css via the @media block — but since
     the canvas has no inline display style (JS doesn't set it directly,
     it uses the CSS class), the media query approach works correctly.
     The constellation JS resize handler calls canvas.style.display = 'none'
     on resize to desktop — that IS an inline style, so we just leave it. */

  /* ── BUG 6: Mobile bottom nav active state desyncs with p5 wipe ─────
     When p5 wipe calls prevShowPage(), the _wnPatched wrapper inside
     improvements.js also calls buildFavoritesPage() + renderFavoritesPage()
     for any page, not just favorites. This is because the check is:
       if (id === 'favorites') { build(); render(); }
     which is correct. BUT mbnNav() doesn't update the mbn-btn active
     state when p5ShowPage is used (it only sets active on direct clicks).
     If you navigate via header nav, mbn active state gets out of sync.
     Fix: hook into showPage to keep mbn in sync.                     */
  function patchMbnSync() {
    var prev = window.showPage;
    if (!prev || prev._mbnSynced) return;

    window.showPage = function mbnSyncedShowPage(id, linkEl) {
      prev(id, linkEl);
      /* Sync mobile bottom nav active state */
      var mbnMap = {
        home: 'mbn-home',
        favorites: 'mbn-favs',
        /* search, playing have no dedicated page */
      };
      if (mbnMap[id]) {
        document.querySelectorAll('.mbn-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        var activeBtn = document.getElementById(mbnMap[id]);
        if (activeBtn) activeBtn.classList.add('active');
      }
    };
    window.showPage._mbnSynced = true;
    window.showPage._nullSafe = prev._nullSafe || false;
    window.showPage._wnPatched = prev._wnPatched || false;
    window.showPage._p5Patched = prev._p5Patched || false;
  }

  /* ── BOOT ────────────────────────────────────────────────────────── */
  function boot() {
    /* All patches run after all other deferred scripts have booted */
    setTimeout(function () {
      patchShowPageNullSafety();
      patchShowToast();
      debounceRenderFavoritesPage();
      patchSwipeHint();
      /* mbnSync must run last since it wraps the final showPage */
      patchMbnSync();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
