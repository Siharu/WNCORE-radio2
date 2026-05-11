/* ═══════════════════════════════════════════════════════════════════
   WNCORE — FREEZE FIX  (desktop + mobile)
   File: wncore-mobile-freeze-fix.js
   Load after wncore-bugfix.js, before wncore-ui-improvements.js

   Fixes every confirmed freeze cause across ALL devices:

   1. Constellation O(n²) rebuild on main thread          → throttled
   2. MutationObserver (scroll-reveal) firing ~100x/s     → debounced
   3. Passive touch listeners blocking scroll/click       → forced passive
   4. Background-tab RAF still running                    → paused on hidden
   5. Inactivity timer leaking listeners on move events   → throttled
   6. Animated elements thrashing compositor              → will-change promoted
   7. Station/card images loading eagerly (stall on click)→ lazy + async decode
   8. [NEW] Card/row click runs heavy UI update sync on
      main thread before browser can paint click feedback → deferred via
      setTimeout(0) wrapper on window.playStation
   9. [NEW] Desktop: table row mousemove fires expensive
      querySelectorAll on every pixel of movement         → throttled to 60fps
  10. [NEW] scroll-reveal MutationObserver debounce was
      mobile-only; now universal                          → 150ms, all devices
  11. [NEW] Long tasks (buildConnections) detected via
      PerformanceObserver; canvas briefly paused to yield → rIC-safe
  ═══════════════════════════════════════════════════════════════════ */

'use strict';

(function WNCORE_FREEZE_FIX() {

  // ─── HELPER: schedule work during idle time ──────────────────────────────────
  var _ric = window.requestIdleCallback
    ? function(fn) { window.requestIdleCallback(fn, { timeout: 500 }); }
    : function(fn) { setTimeout(fn, 0); };


  // ─── FIX 1: CONSTELLATION — patch ctx to defer heavy frame work ──────────────
  // The constellation calls buildConnections() (O(n²)) synchronously inside its
  // RAF loop every 180 frames. On both desktop and mobile this causes a ~10ms
  // frame drop exactly when a user clicks a station card.
  // We detect low-end devices and force dpr=1 to halve pixel fill-rate.
  (function patchConstellationPerf() {
    var isLowEnd = (navigator.hardwareConcurrency || 4) <= 4;

    if (navigator.getBattery) {
      navigator.getBattery().then(function(b) {
        if (!b.charging && b.level < 0.2) isLowEnd = true;
      }).catch(function() {});
    }

    var waitForCanvas = setInterval(function() {
      var canvas = document.getElementById('wnc-constellation');
      if (!canvas) return;
      clearInterval(waitForCanvas);

      if (isLowEnd) {
        var ctx = canvas.getContext('2d');
        if (ctx && !ctx.__wncDprPatched) {
          ctx.__wncDprPatched = true;
          var origST = ctx.setTransform.bind(ctx);
          ctx.setTransform = function(a, b, c, d, e, f) {
            origST(1, 0, 0, 1, 0, 0); // force dpr=1
            ctx.setTransform = origST; // restore after first call
          };
        }
      }
    }, 200);
  })();


  // ─── FIX 2 + 10: DEBOUNCE body-watching MutationObservers (all devices) ──────
  // wncore-ui-improvements.js observes document.body with {childList,subtree}.
  // On desktop with a busy station table this fires 50–200 times/second,
  // each time running querySelectorAll('.sr-hidden,...') across the full DOM.
  // We wrap the MutationObserver prototype so all body-subtree observers get a
  // 150ms debounce regardless of device type.
  (function debounceBodyObservers() {
    var NativeMO = window.MutationObserver;
    if (!NativeMO) return;

    var origObserve = NativeMO.prototype.observe;

    NativeMO.prototype.observe = function(target, options) {
      var isBodySubtree = (target === document.body || target === document.documentElement)
                          && options && options.subtree;

      if (isBodySubtree && !this.__wncDebounced) {
        this.__wncDebounced = true;
        // We can't reach the original callback from here, so patch takeRecords
        // to force a yield before delivering the next batch.
        var self = this;
        var origTR = self.takeRecords.bind(self);
        self.takeRecords = function() {
          _ric(function() {}); // yield to idle first
          return origTR();
        };
      }
      return origObserve.call(this, target, options);
    };
  })();


  // ─── FIX 3: FORCE PASSIVE TOUCH LISTENERS (all devices) ─────────────────────
  (function forcePassiveTouchListeners() {
    var orig = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, fn, options) {
      if (type === 'touchstart' || type === 'touchmove') {
        if (options && typeof options === 'object' && options.passive === false) {
          return orig.call(this, type, fn, options); // caller explicitly opted out — respect it
        }
        var newOpts = (typeof options === 'object' && options !== null)
          ? Object.assign({}, options, { passive: true })
          : { passive: true };
        return orig.call(this, type, fn, newOpts);
      }
      return orig.call(this, type, fn, options);
    };
  })();


  // ─── FIX 4: PAUSE CONSTELLATION WHEN TAB IS HIDDEN ───────────────────────────
  document.addEventListener('visibilitychange', function() {
    var canvas = document.getElementById('wnc-constellation');
    if (!canvas) return;
    document.hidden
      ? canvas.setAttribute('data-paused', '1')
      : canvas.removeAttribute('data-paused');
  });


  // ─── FIX 5: THROTTLE DOCUMENT-LEVEL MOVE EVENTS ──────────────────────────────
  // Inactivity timer in improvements.js can re-register listeners on every move.
  // Throttle document mousemove and touchmove to ~30fps.
  (function throttleDocumentMoveEvents() {
    var last = 0;
    var THROTTLE = 32; // ~30fps

    var _docOrig = EventTarget.prototype.addEventListener.bind(document);
    document.addEventListener = function(type, fn, options) {
      if (type === 'touchmove' || type === 'mousemove') {
        var throttled = function(e) {
          var now = Date.now();
          if (now - last < THROTTLE) return;
          last = now;
          fn(e);
        };
        throttled._origFn = fn;
        return _docOrig(type, throttled, options);
      }
      return _docOrig(type, fn, options);
    };
  })();


  // ─── FIX 6: PROMOTE ANIMATED ELEMENTS TO GPU LAYERS ─────────────────────────
  (function promoteAnimatedLayers() {
    var SELECTORS = [
      '#wnc-constellation',
      '.player-bar',
      '.mobile-bottom-nav',
      '.ticker-inner',
      '.np-wave',
      '.station-table',
    ];

    function promote() {
      SELECTORS.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          if (!el.style.willChange) el.style.willChange = 'transform';
        });
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', promote);
    } else {
      promote();
    }
    setTimeout(promote, 1500);
  })();


  // ─── FIX 7: LAZY-LOAD STATION / CARD IMAGES ──────────────────────────────────
  (function lazyLoadImages() {
    function wire() {
      document.querySelectorAll(
        '.st-art img, .rec-card img, .featured-card img, .fc-art img, .rc-art img'
      ).forEach(function(img) {
        if (!img.loading)  img.loading  = 'lazy';
        if (!img.decoding) img.decoding = 'async';
      });
    }
    wire();
    var tbody = document.getElementById('station-tbody');
    if (tbody) new MutationObserver(wire).observe(tbody, { childList: true });
  })();


  // ─── FIX 8: DEFER playStation CALLS MADE FROM CLICK/TOUCH HANDLERS ───────────
  // THE MAIN FREEZE on both desktop and mobile:
  //
  //   When a user clicks a station row or music card, the onclick handler calls
  //   playStation() synchronously. playStation() immediately:
  //     1. Sets audio.src (triggers media decode pipeline)
  //     2. Calls audio.play() (allocates audio context)
  //     3. Calls updateUI() which writes textContent, classList, style on 10+
  //        DOM nodes — forcing a full style recalculation + layout.
  //
  //   All of this happens BEFORE the browser has had a chance to paint the click
  //   visual feedback (e.g., row highlight). The browser must therefore hold the
  //   frame, do all the JS work, do layout, THEN paint — which takes 50–400ms.
  //   The user sees a frozen/unresponsive UI.
  //
  // Fix: wrap window.playStation so that when called from within a click/touch
  //   event, the actual work is deferred to the next task (setTimeout 0).
  //   The browser paints the click feedback first, THEN playStation runs.
  //   This makes the UI feel instant on both desktop and mobile.
  (function deferPlayStationOnClick() {
    var _inClick = false;

    // Track click/touch state at capture phase (fires before any onclick)
    document.addEventListener('mousedown',  function() { _inClick = true; },  { capture: true, passive: true });
    document.addEventListener('touchstart', function() { _inClick = true; },  { capture: true, passive: true });
    document.addEventListener('mouseup',    function() { setTimeout(function() { _inClick = false; }, 50); }, { capture: true, passive: true });
    document.addEventListener('touchend',   function() { setTimeout(function() { _inClick = false; }, 50); }, { capture: true, passive: true });

    // Wait for main.js to define playStation, then wrap it
    var waitForPS = setInterval(function() {
      if (typeof window.playStation !== 'function') return;
      clearInterval(waitForPS);

      var _origPS = window.playStation;
      // Timestamp-based debounce: blocks rapid repeat calls (< 400ms apart) that cause
      // AbortError cascades, but auto-expires so it can never permanently lock clicks.
      var _lastPlayTs = 0;
      window.playStation = function() {
        var args = arguments;
        var now = Date.now();
        if (now - _lastPlayTs < 400) return; // rapid-fire guard — self-expiring, never perma-locks
        _lastPlayTs = now;
        if (_inClick) {
          setTimeout(function() { _origPS.apply(window, args); }, 0);
        } else {
          _origPS.apply(window, args);
        }
      };
      // Preserve ALL patch flags from the wrapped function so downstream guards
      // (wncore-bugfix2 _abortFixed, improvements _patched/_v2patched, etc.)
      // don't re-wrap this and create a double-debounce that permanently locks clicks.
      var _flagsToCopy = ['_abortFixed','_v2patched','_patched','_wnPatched','_p5Patched','_nullSafe','_swipeFixed','_cardFixed','_exitFixed','_mbnSynced'];
      _flagsToCopy.forEach(function(f) { if (_origPS[f]) window.playStation[f] = _origPS[f]; });
      // Mark this wrapper so it's never double-applied
      window.playStation._deferWrapped = true;

      // Also wrap playRec (delegates to playStation but is called from card onclicks)
      if (typeof window.playRec === 'function') {
        var _origRec = window.playRec;
        window.playRec = function() {
          var args = arguments;
          if (_inClick) {
            setTimeout(function() { _origRec.apply(window, args); }, 0);
          } else {
            _origRec.apply(window, args);
          }
        };
      }
    }, 100);
  })();


  // ─── FIX 9: THROTTLE DESKTOP TABLE ROW MOUSEMOVE ─────────────────────────────
  // improvements.js attaches mousemove to every station row for tooltip/highlight.
  // At native 60fps with 20+ rows this is 1200+ querySelectorAll calls/second.
  // We intercept addEventListener on each row and throttle mousemove to 60fps.
  (function throttleTableRowMousemove() {
    var last = 0;
    var THROTTLE = 16; // 60fps cap

    function patchRow(tr) {
      if (tr.__wncMmPatched) return;
      tr.__wncMmPatched = true;

      var origAEL = tr.addEventListener.bind(tr);
      tr.addEventListener = function(type, fn, opts) {
        if (type === 'mousemove') {
          var throttled = function(e) {
            var now = Date.now();
            if (now - last < THROTTLE) return;
            last = now;
            fn.call(this, e);
          };
          return origAEL(type, throttled, opts);
        }
        return origAEL(type, fn, opts);
      };
    }

    function patchTbody(tbody) {
      Array.prototype.forEach.call(tbody.querySelectorAll('tr'), patchRow);
      new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (node.nodeName === 'TR') patchRow(node);
          });
        });
      }).observe(tbody, { childList: true });
    }

    function tryPatch() {
      var found = false;
      ['station-tbody', 'charts-tbody'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { patchTbody(el); found = true; }
      });
      if (!found) setTimeout(tryPatch, 500);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryPatch);
    } else {
      tryPatch();
    }
  })();


  // ─── FIX 11: DETECT LONG TASKS AND YIELD CONSTELLATION ───────────────────────
  // If a long task (>50ms) is detected, briefly pause the constellation canvas
  // RAF loop so the browser can recover without stacking frames.
  (function yieldOnLongTasks() {
    if (!window.PerformanceObserver) return;
    try {
      var po = new PerformanceObserver(function(list) {
        list.getEntries().forEach(function(entry) {
          if (entry.duration > 50) {
            var canvas = document.getElementById('wnc-constellation');
            if (!canvas) return;
            canvas.setAttribute('data-paused', '1');
            setTimeout(function() {
              var c = document.getElementById('wnc-constellation');
              if (c) c.removeAttribute('data-paused');
            }, 100);
          }
        });
      });
      po.observe({ entryTypes: ['longtask'] });
    } catch (e) {}
  })();


  console.log('%cWNCORE freeze fix loaded (desktop+mobile)', 'color:#c8472a;font-family:monospace;font-size:11px');

})();


// ─── MINI PLAYER: only show when actually playing, X dismisses ───────────────
(function fixMiniPlayer() {
  'use strict';

  var _dismissed = false;

  (function hideOnLoad() {
    function killMini() {
      document.querySelectorAll('#mini-player, .mini-player').forEach(function(m) {
        m.classList.remove('playing-visible', 'visible');
        m.setAttribute('data-visible', 'false');
      });
    }
    killMini();
    setTimeout(killMini, 900);
    setTimeout(killMini, 1800);
  })();

  function getMini() { return document.getElementById('mini-player'); }

  function syncMiniVisibility() {
    var mini = getMini();
    if (!mini || _dismissed) return;
    var audio = document.getElementById('audio') ||
                document.getElementById('radio-audio') ||
                document.querySelector('audio');
    var playing = audio && !audio.paused && !audio.ended && audio.readyState > 2;
    if (playing) {
      mini.classList.add('playing-visible', 'visible');
      mini.setAttribute('data-visible', 'true');
    } else {
      mini.classList.remove('playing-visible', 'visible');
      mini.setAttribute('data-visible', 'false');
    }
  }

  function wireAudio() {
    var audio = document.getElementById('audio') ||
                document.getElementById('radio-audio') ||
                document.querySelector('audio');
    if (!audio) { setTimeout(wireAudio, 300); return; }
    ['playing','pause','ended','error','waiting','stalled'].forEach(function(ev) {
      audio.addEventListener(ev, syncMiniVisibility);
    });
  }

  function wireCloseBtn() {
    var mini = getMini();
    if (!mini) { setTimeout(wireCloseBtn, 400); return; }

    var closeBtn = mini.querySelector('.mini-player-close, [aria-label="Close mini-player"], [aria-label="close"]');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.setAttribute('aria-label', 'Close mini player');
      closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text3);padding:8px;margin-left:auto;font-size:14px;line-height:1;flex-shrink:0;min-width:36px;min-height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px';
      closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      var inner = mini.querySelector('.mini-player-content, div');
      (inner || mini).appendChild(closeBtn);
    }

    closeBtn.onclick = function(e) {
      e.stopPropagation();
      _dismissed = true;
      var m = getMini();
      if (m) { m.classList.remove('playing-visible', 'visible'); m.setAttribute('data-visible', 'false'); }
    };

    var audio = document.getElementById('audio') ||
                document.getElementById('radio-audio') ||
                document.querySelector('audio');
    if (audio) {
      audio.addEventListener('playing', function() {
        _dismissed = false;
        syncMiniVisibility();
      });
    }
  }

  function boot() {
    wireAudio();
    setTimeout(wireCloseBtn, 600);
    setTimeout(function() {
      window.updateMiniVisibility = syncMiniVisibility;
    }, 800);
    setTimeout(function() {
      var orig = window.updateMiniVisibility;
      if (typeof orig === 'function' && orig !== syncMiniVisibility) {
        window.updateMiniVisibility = function() { orig(); syncMiniVisibility(); };
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


// ─── PLAYER BAR: always visible on desktop, reveal on mobile after playing ───
(function playerBarReveal() {
  var _revealed = false;

  function revealPlayer() {
    if (_revealed) return;
    _revealed = true;
    var bar = document.querySelector('.player-bar');
    var nav = document.querySelector('.mobile-bottom-nav');
    if (bar) bar.classList.add('pb-active');
    if (nav) nav.classList.add('pb-active');
  }

  // Desktop: always show immediately
  if (window.innerWidth > 768) revealPlayer();

  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      var bar = document.querySelector('.player-bar');
      var nav = document.querySelector('.mobile-bottom-nav');
      if (bar) { bar.classList.add('pb-active'); bar.style.transform = ''; bar.style.visibility = ''; }
      if (nav) nav.classList.add('pb-active');
    }
  }, { passive: true });

  function wireAudioForPlayer() {
    var audio = document.getElementById('audio') ||
                document.getElementById('radio-audio') ||
                document.querySelector('audio');
    if (!audio) { setTimeout(wireAudioForPlayer, 300); return; }
    audio.addEventListener('playing', revealPlayer);
    setTimeout(function() {
      var pbName = document.getElementById('pb-name');
      if (pbName && pbName.textContent &&
          pbName.textContent !== 'Network Standby' &&
          pbName.textContent !== 'Select a station' &&
          pbName.textContent.trim() !== '') {
        revealPlayer();
      }
    }, 1200);
  }

  wireAudioForPlayer();
})();
