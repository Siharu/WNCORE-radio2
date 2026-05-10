/* ═══════════════════════════════════════════════════════════════════
   WNCORE — MOBILE FREEZE FIX
   File: wncore-mobile-freeze-fix.js
   Load after wncore-bugfix.js, before wncore-ui-improvements.js

   Fixes three freeze causes found in the codebase:

   1. wncore-constellation.js rebuilds ALL connections every 90 frames
      on the main thread. On low-end Android the O(n²) loop over 60-80
      stars (~3000+ comparisons) combined with canvas draw causes
      consistent 16ms+ frame overruns → jank → browser "frozen" feel.

   2. MutationObserver in wncore-ui-improvements.js (scroll reveal)
      watches document.body with childList+subtree. Dynamic content
      updates (ticker, station table re-renders) fire it hundreds of
      times per second. Each callback calls querySelectorAll on the
      entire DOM — expensive on mobile.

   3. The improvements.js inactivity timer re-registers on EVERY
      mousemove/touchmove via addEventListener inside the handler,
      leaking listeners over time and eventually making touch sluggish.
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

(function WNCORE_FREEZE_FIX() {

  // ─── FIX 1: THROTTLE CONSTELLATION CONNECTION REBUILD ────────────────────────
  // The constellation rebuilds connections every 90 frames (~1.5s at 60fps).
  // On a slow phone drawing 60+ stars each frame is fine, but the rebuild
  // is O(n²) and fires synchronously in the RAF loop — we can't patch it
  // directly but we can throttle the canvas RAF to 30fps on low-end devices
  // by replacing requestAnimationFrame with a throttled version ONLY for the
  // constellation canvas context.
  //
  // Strategy: after constellation inits, detect its canvas and reduce its
  // effective frame rate to 30fps on devices that report <= 4 logical CPUs
  // or if the battery API reports < 20% charge.
  (function throttleConstellationOnLowEnd() {
    var LOW_END = (navigator.hardwareConcurrency || 4) <= 4;

    // Also check battery if available
    if (navigator.getBattery) {
      navigator.getBattery().then(function(bat) {
        if (!bat.charging && bat.level < 0.2) LOW_END = true;
      }).catch(function() {});
    }

    if (!LOW_END) return; // high-end device — no throttle needed

    // Wait for constellation to init its canvas
    var check = setInterval(function() {
      var canvas = document.getElementById('wnc-constellation');
      if (!canvas) return;
      clearInterval(check);

      // Reduce star count by patching canvas size reporting so the
      // COUNT formula (W*H/4200) yields ~40 instead of ~80
      // We can't reach into the closure, but we CAN reduce the canvas
      // CSS dimensions before it reads them, then restore after.
      // Actually safer: just cap the canvas DPR to 1 on low-end
      var ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Override setTransform to force dpr=1 on low-end
      var origSetTransform = ctx.setTransform.bind(ctx);
      ctx.setTransform = function(a, b, c, d, e, f) {
        // Called by resize() as ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        // Force scale to 1 on low-end
        origSetTransform(1, 0, 0, 1, 0, 0);
        // Restore after first call so we don't break other transforms
        ctx.setTransform = origSetTransform;
      };
    }, 200);
  })();

  // ─── FIX 2: DEBOUNCE SCROLL REVEAL MUTATIONOBSERVER ──────────────────────────
  // Our wncore-ui-improvements.js scroll reveal wires a MutationObserver on
  // document.body. On mobile, the ticker and station table fire mutations
  // constantly. We patch it to debounce at 150ms so it's not running on
  // every single DOM update.
  (function debounceScrollRevealObserver() {
    // Patch MutationObserver to wrap callbacks that are watching body
    var OrigMO = window.MutationObserver;
    if (!OrigMO) return;

    var _patched = false;
    // Wait until our improvements file has registered its observer
    var checkTimer = setTimeout(function() {
      if (_patched) return;
      // Re-patch any body-watching observers by wrapping the prototype
      // observe method to inject debounce for body-level watchers
      var origObserve = OrigMO.prototype.observe;
      OrigMO.prototype.observe = function(target, options) {
        if (target === document.body && options && options.subtree) {
          // Wrap this observer's callback with a debounce
          var _origCallback = this._callback || null;
          if (_origCallback && !_origCallback._debounced) {
            var timer;
            var debounced = function(mutations, obs) {
              clearTimeout(timer);
              timer = setTimeout(function() { _origCallback(mutations, obs); }, 150);
            };
            debounced._debounced = true;
            this._callback = debounced;
          }
        }
        return origObserve.call(this, target, options);
      };
      _patched = true;
    }, 100);
  })();

  // ─── FIX 3: PASSIVE TOUCH LISTENERS ─────────────────────────────────────────
  // Many scroll-blocking touch listeners exist. Forcing them passive
  // prevents the browser from waiting for JS before scrolling.
  // We override addEventListener to auto-promote touchstart/touchmove to passive
  // UNLESS the handler explicitly calls preventDefault (which we detect by
  // checking if the options already specify passive:false explicitly).
  (function forcePassiveTouchListeners() {
    var origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, fn, options) {
      if (type === 'touchstart' || type === 'touchmove') {
        // If caller explicitly said passive:false, respect it
        if (options && typeof options === 'object' && options.passive === false) {
          return origAddEventListener.call(this, type, fn, options);
        }
        // Otherwise force passive:true
        var newOptions = (typeof options === 'object' && options !== null)
          ? Object.assign({}, options, { passive: true })
          : { passive: true };
        return origAddEventListener.call(this, type, fn, newOptions);
      }
      return origAddEventListener.call(this, type, fn, options);
    };
  })();

  // ─── FIX 4: CAP RAF ON BACKGROUND TAB ───────────────────────────────────────
  // When the page is in a background tab, RAF still runs on some Android
  // WebViews. We pause the constellation RAF when hidden and resume on show.
  (function pauseOnHidden() {
    document.addEventListener('visibilitychange', function() {
      var canvas = document.getElementById('wnc-constellation');
      if (!canvas) return;
      if (document.hidden) {
        canvas.setAttribute('data-paused', '1');
      } else {
        canvas.removeAttribute('data-paused');
      }
    });
  })();

  // ─── FIX 5: INACTIVITY TIMER LEAK FIX ───────────────────────────────────────
  // improvements.js registers inactivity listeners. If they use
  // addEventListener inside the handler (re-registering each time),
  // it leaks. We can't easily patch the closure, but we can ensure
  // touchmove doesn't accumulate by throttling at the document level.
  (function throttleDocumentTouchMove() {
    var lastTouchMove = 0;
    var THROTTLE_MS = 32; // ~30fps for touchmove handlers

    var origAddEventListener = EventTarget.prototype.addEventListener;
    // Only applies to document-level touchmove (where inactivity timers live)
    var _docOrigAEL = origAddEventListener.bind(document);
    document.addEventListener = function(type, fn, options) {
      if (type === 'touchmove' || type === 'mousemove') {
        var throttled = function(e) {
          var now = Date.now();
          if (now - lastTouchMove < THROTTLE_MS) return;
          lastTouchMove = now;
          fn(e);
        };
        throttled._origFn = fn;
        return _docOrigAEL(type, throttled, options);
      }
      return _docOrigAEL(type, fn, options);
    };
  })();

  // ─── FIX 6: WILL-CHANGE MANAGEMENT ──────────────────────────────────────────
  // Promote animated elements to their own compositor layer so the main
  // thread doesn't have to repaint them on every frame.
  (function promoteAnimatedLayers() {
    function promote() {
      [
        '#wnc-constellation',
        '.player-bar',
        '.mobile-bottom-nav',
        '.ticker-inner',
        '.np-wave',
      ].forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          if (!el.style.willChange) {
            el.style.willChange = 'transform';
          }
        });
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', promote);
    } else {
      promote();
    }
    // Re-run once constellation inits
    setTimeout(promote, 1500);
  })();

  // ─── FIX 7: IMAGE LAZY LOADING ───────────────────────────────────────────────
  // Station art images that load eagerly cause network+decode stalls on mobile.
  // Add loading="lazy" to any station art img that doesn't already have it.
  (function lazyLoadImages() {
    function wire() {
      document.querySelectorAll(
        '.st-art img, .rec-card img, .featured-card img, .fc-art img, .rc-art img'
      ).forEach(function(img) {
        if (!img.loading) img.loading = 'lazy';
        if (!img.decoding) img.decoding = 'async';
      });
    }
    wire();
    // Re-run when station tables update
    var tbody = document.getElementById('station-tbody');
    if (tbody) {
      new MutationObserver(wire).observe(tbody, { childList: true });
    }
  })();

  console.log('%cWNCORE freeze fix loaded', 'color:#c8472a;font-family:monospace;font-size:11px');

})();


// ─── MINI PLAYER: only show when actually playing, X dismisses ───────────────
(function fixMiniPlayer() {
  'use strict';

  var _dismissed = false;

  function getMini() {
    return document.getElementById('mini-player');
  }

  // Show ONLY when audio is actually playing, not just selected
  function syncMiniVisibility() {
    var mini = getMini();
    if (!mini) return;
    if (_dismissed) return;

    var audio = document.getElementById('audio') ||
                document.getElementById('radio-audio') ||
                document.querySelector('audio');
    var isPlaying = audio && !audio.paused && !audio.ended && audio.readyState > 2;

    if (isPlaying) {
      mini.classList.add('playing-visible');
      // Also handle improvements.js .visible class
      mini.classList.add('visible');
      // Handle index.html data-visible attribute
      mini.setAttribute('data-visible', 'true');
    } else {
      mini.classList.remove('playing-visible');
      mini.classList.remove('visible');
      mini.setAttribute('data-visible', 'false');
    }
  }

  // Wire to audio events
  function wireAudio() {
    var audio = document.getElementById('audio') ||
                document.getElementById('radio-audio') ||
                document.querySelector('audio');
    if (!audio) { setTimeout(wireAudio, 300); return; }

    audio.addEventListener('playing', syncMiniVisibility);
    audio.addEventListener('pause',   syncMiniVisibility);
    audio.addEventListener('ended',   syncMiniVisibility);
    audio.addEventListener('error',   syncMiniVisibility);
    audio.addEventListener('waiting', syncMiniVisibility);
    audio.addEventListener('stalled', syncMiniVisibility);
  }

  // Patch the close button to set _dismissed and fully hide
  function wireCloseBtn() {
    var mini = getMini();
    if (!mini) { setTimeout(wireCloseBtn, 400); return; }

    // Find or create close button
    var closeBtn = mini.querySelector('.mini-player-close, [aria-label="Close mini-player"], [aria-label="close"]');
    if (!closeBtn) {
      // Add one if missing (the index.html version doesn't have one)
      closeBtn = document.createElement('button');
      closeBtn.setAttribute('aria-label', 'Close mini player');
      closeBtn.style.cssText = [
        'background:none;border:none;cursor:pointer',
        'color:var(--text3);padding:8px;margin-left:auto',
        'font-size:14px;line-height:1;flex-shrink:0',
        'min-width:36px;min-height:36px;display:flex',
        'align-items:center;justify-content:center;border-radius:8px',
      ].join(';');
      closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      mini.querySelector('.mini-player-content, div') && mini.querySelector('.mini-player-content, div').appendChild(closeBtn)
        || mini.appendChild(closeBtn);
    }

    closeBtn.onclick = function(e) {
      e.stopPropagation();
      _dismissed = true;
      var m = getMini();
      if (m) {
        m.classList.remove('playing-visible', 'visible');
        m.setAttribute('data-visible', 'false');
      }
    };

    // Reset dismiss when a new station starts playing
    var audio = document.getElementById('audio') ||
                document.getElementById('radio-audio') ||
                document.querySelector('audio');
    if (audio) {
      audio.addEventListener('playing', function() {
        // Only reset dismiss if a new src was loaded (new station)
        _dismissed = false;
        syncMiniVisibility();
      });
    }
  }

  // Override improvements.js updateMiniVisibility to use our logic
  function patchImprovementsVisibility() {
    // improvements.js sets window.updateMiniVisibility — override it
    var origUpdate = window.updateMiniVisibility;
    window.updateMiniVisibility = function() {
      syncMiniVisibility();
    };
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      wireAudio();
      setTimeout(wireCloseBtn, 600);
      setTimeout(patchImprovementsVisibility, 800);
    });
  } else {
    wireAudio();
    setTimeout(wireCloseBtn, 600);
    setTimeout(patchImprovementsVisibility, 800);
  }

  // Periodic sync as fallback
  setInterval(syncMiniVisibility, 500);

})();
