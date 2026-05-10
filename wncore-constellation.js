/* ═══════════════════════════════════════════════════════════════════════
   WNCORE — INTERACTIVE CONSTELLATION (Mobile Hero) — v2
   File: wncore-constellation.js
   Replaces the original. Drop-in swap.

   Changes vs v1:
   - Canvas now spans FULL viewport width (not just .globe-section width)
   - Stars spread much wider — 1.5× zone padding beyond section bounds
   - Star count scaled more generously, better distributed
   - Connection distance increased for a more open, airy mesh
   - RAF throttled to 30fps on low-end devices (≤4 CPUs or battery < 20%)
   - Connections rebuilt less often (every 180 frames, not 90)
   - Pauses RAF when tab is hidden (saves battery, prevents stutter)
   - Touch radius widened to 80px for easier interaction
   - Labels slightly bigger and better readable
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function isMobile() {
    return window.innerWidth <= 900;
  }

  // ── Low-end device detection ──────────────────────────────────────────
  var isLowEnd = (navigator.hardwareConcurrency || 4) <= 4;
  if (navigator.getBattery) {
    navigator.getBattery().then(function(bat) {
      if (!bat.charging && bat.level < 0.2) isLowEnd = true;
    }).catch(function() {});
  }

  var STATION_LABELS = [
    'TOKYO FM', 'BBC R4', 'NPR', 'FRANCE INTER',
    'RAI UNO', 'ABC RN', 'DW', 'KEXP',
    'NHK', 'CBC R2', 'RFI', 'SWR3',
    'WNCORE', 'NTS', 'FIP', 'SOMA FM',
  ];

  var canvas, ctx;
  var stars = [], conns = [], pulses = [], ripples = [];
  var W = 0, H = 0;
  var raf = null;
  var touchX = -1, touchY = -1;
  var frame = 0;
  var paused = false;

  // ── Target frame interval ─────────────────────────────────────────────
  // 30fps on low-end, 60fps on high-end
  var FRAME_INTERVAL = isLowEnd ? 33 : 16;
  var lastFrameTime  = 0;

  /* ── STAR ──────────────────────────────────────────────────────────── */
  function Star(index) {
    this.reset(index);
  }

  Star.prototype.reset = function(index) {
    // Spread across a wider zone than the canvas — stars can be off-edge
    // and wrap, giving the open/airy constellation feel
    this.x = (Math.random() - 0.1) * (W * 1.2);
    this.y = Math.random() * H;
    this.r = 0.5 + Math.random() * 1.8;
    this.brightness  = 0.25 + Math.random() * 0.75;
    this.twinkleSpeed  = 0.006 + Math.random() * 0.014;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 0.05;
    this.vy = 0.035 + Math.random() * 0.055;
    this.label  = (index !== undefined && index < STATION_LABELS.length) ? STATION_LABELS[index] : null;
    this.active = false;

    if (this.label) {
      this.r = 2 + Math.random() * 1.0;
      this.brightness = 0.75 + Math.random() * 0.25;
    }
  };

  Star.prototype.respawn = function() {
    this.x = (Math.random() - 0.1) * (W * 1.2);
    this.y = -6;
    this.r = 0.5 + Math.random() * 1.5;
    this.brightness  = 0.2 + Math.random() * 0.6;
    this.twinkleSpeed  = 0.006 + Math.random() * 0.014;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 0.05;
    this.vy = 0.035 + Math.random() * 0.055;
    this.label  = null;
    this.active = false;
  };

  Star.prototype.update = function() {
    this.x += this.vx;
    this.y += this.vy * 0.14;
    // Wrap X with wide margin
    if (this.x < -W * 0.15) this.x = W * 1.15;
    if (this.x > W * 1.15)  this.x = -W * 0.15;
    if (this.y > H + 8 && !this.label) this.respawn();
  };

  Star.prototype.draw = function() {
    var tw    = Math.sin(frame * this.twinkleSpeed + this.twinkleOffset);
    var alpha = this.brightness * (0.6 + tw * 0.4);
    if (this.active) alpha = 1;

    // Only draw stars within visible + slight margin
    if (this.x < -20 || this.x > W + 20) return;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.active
      ? 'rgba(200,71,42,' + alpha + ')'
      : 'rgba(220,230,255,' + alpha + ')';
    ctx.fill();

    // Glow — skip on low-end for small stars
    if (this.r > 1.2 || this.active) {
      if (isLowEnd && this.r < 1.5 && !this.active) {
        // skip glow on tiny low-end stars
      } else {
        var glowR = this.r * (this.active ? 5.5 : 3.8);
        var grad  = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
        var rgb   = this.active ? '200,71,42' : '140,165,255';
        grad.addColorStop(0, 'rgba(' + rgb + ',' + (alpha * 0.45) + ')');
        grad.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    // Label
    if (this.label && this.r > 1.4) {
      ctx.font = '500 9px "DM Mono", monospace';
      ctx.fillStyle = 'rgba(200,71,42,' + (alpha * 0.85) + ')';
      ctx.fillText(this.label, this.x + this.r + 4, this.y + 3.5);
    }
  };

  /* ── CONNECTIONS ───────────────────────────────────────────────────── */
  function buildConnections() {
    conns = [];
    // Wider connection distance for open airy mesh
    var MAX_DIST = Math.min(W, H) * 0.32;
    // Cap total connections on low-end
    var MAX_CONNS = isLowEnd ? 120 : 300;

    for (var i = 0; i < stars.length; i++) {
      if (conns.length >= MAX_CONNS) break;
      for (var j = i + 1; j < stars.length; j++) {
        if (conns.length >= MAX_CONNS) break;
        var dx = stars[i].x - stars[j].x;
        var dy = stars[i].y - stars[j].y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          conns.push({ a: i, b: j, maxDist: MAX_DIST });
        }
      }
    }
  }

  function drawConnections() {
    for (var k = 0; k < conns.length; k++) {
      var c  = conns[k];
      var sa = stars[c.a], sb = stars[c.b];
      // Skip if either star is off-screen
      if ((sa.x < -20 || sa.x > W + 20) && (sb.x < -20 || sb.x > W + 20)) continue;

      var dx = sa.x - sb.x, dy = sa.y - sb.y;
      var d  = Math.sqrt(dx * dx + dy * dy);
      if (d >= c.maxDist) continue;

      var alpha   = (1 - d / c.maxDist) * 0.14;
      var boosted = sa.active || sb.active;
      if (boosted) alpha = 0.55;

      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.strokeStyle = boosted
        ? 'rgba(200,71,42,' + alpha + ')'
        : 'rgba(100,130,200,' + alpha + ')';
      ctx.lineWidth = boosted ? 0.9 : 0.45;
      ctx.stroke();
    }
  }

  /* ── RIPPLE ─────────────────────────────────────────────────────────── */
  function Ripple(x, y) {
    this.x = x; this.y = y;
    this.r = 4; this.alpha = 0.75; this.done = false;
  }
  Ripple.prototype.update = function() {
    this.r     += 2.5;
    this.alpha -= 0.028;
    if (this.alpha <= 0 || this.r >= 56) this.done = true;
  };
  Ripple.prototype.draw = function() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,71,42,' + this.alpha + ')';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  };

  /* ── PULSE ──────────────────────────────────────────────────────────── */
  function Pulse(connIndex) {
    this.ci    = connIndex;
    this.t     = 0;
    this.speed = 0.01 + Math.random() * 0.007;
    this.done  = false;
  }
  Pulse.prototype.update = function() {
    this.t += this.speed;
    if (this.t >= 1) this.done = true;
  };
  Pulse.prototype.draw = function() {
    var c = conns[this.ci];
    if (!c) { this.done = true; return; }
    var sa = stars[c.a], sb = stars[c.b];
    var x  = sa.x + (sb.x - sa.x) * this.t;
    var y  = sa.y + (sb.y - sa.y) * this.t;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,71,42,0.9)';
    ctx.fill();
  };

  /* ── MAIN LOOP ──────────────────────────────────────────────────────── */
  function loop(ts) {
    if (!ctx || paused || document.hidden) {
      raf = requestAnimationFrame(loop);
      return;
    }

    // Throttle to target frame rate
    if (ts - lastFrameTime < FRAME_INTERVAL) {
      raf = requestAnimationFrame(loop);
      return;
    }
    lastFrameTime = ts;
    frame++;

    ctx.clearRect(0, 0, W, H);

    // Touch activation — wider 80px radius for easier interaction
    for (var i = 0; i < stars.length; i++) {
      if (touchX >= 0) {
        var dx = stars[i].x - touchX, dy = stars[i].y - touchY;
        stars[i].active = (dx * dx + dy * dy) < 6400; // 80px
      } else {
        stars[i].active = false;
      }
    }

    // Rebuild connections less often — every 180 frames (~3s at 60fps, ~6s at 30fps)
    if (frame % 180 === 0) buildConnections();

    drawConnections();

    // Pulses
    for (var p = pulses.length - 1; p >= 0; p--) {
      pulses[p].update();
      pulses[p].draw();
      if (pulses[p].done) pulses.splice(p, 1);
    }

    // Stars
    for (var j = 0; j < stars.length; j++) {
      stars[j].update();
      stars[j].draw();
    }

    // Ripples
    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].update();
      ripples[r].draw();
      if (ripples[r].done) ripples.splice(r, 1);
    }

    // Auto pulse every ~4s (240 frames at 60fps)
    if (frame % 240 === 0 && conns.length > 0) {
      pulses.push(new Pulse(Math.floor(Math.random() * conns.length)));
    }

    raf = requestAnimationFrame(loop);
  }

  /* ── RESIZE ─────────────────────────────────────────────────────────── */
  function resize() {
    // Use full viewport width for a wider, more open feel
    W = window.innerWidth;
    var section = document.querySelector('.globe-section');
    H = section ? section.offsetHeight : 300;

    // Cap DPR to 1 on low-end, 2 max otherwise
    var dpr = isLowEnd ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Make canvas full-width regardless of section padding
    canvas.style.position = 'absolute';
    canvas.style.left     = '0';
    canvas.style.top      = '0';
  }

  /* ── TOUCH ──────────────────────────────────────────────────────────── */
  function onTouch(e) {
    if (!e.touches || e.touches.length === 0) return;
    var rect = canvas.getBoundingClientRect();
    var t    = e.touches[0];
    touchX   = t.clientX - rect.left;
    touchY   = t.clientY - rect.top;

    if (e.type === 'touchstart') {
      ripples.push(new Ripple(touchX, touchY));

      var nearest = 0, nearDist = Infinity;
      for (var i = 0; i < stars.length; i++) {
        var dx = stars[i].x - touchX, dy = stars[i].y - touchY;
        var d  = dx * dx + dy * dy;
        if (d < nearDist) { nearDist = d; nearest = i; }
      }
      for (var k = 0; k < conns.length; k++) {
        if ((conns[k].a === nearest || conns[k].b === nearest) && Math.random() < 0.45) {
          pulses.push(new Pulse(k));
        }
      }
    }
  }

  function onTouchEnd() {
    setTimeout(function() { touchX = -1; touchY = -1; }, 450);
  }

  /* ── VISIBILITY ─────────────────────────────────────────────────────── */
  document.addEventListener('visibilitychange', function() {
    paused = document.hidden;
  });

  /* ── INIT ───────────────────────────────────────────────────────────── */
  function init() {
    if (!isMobile()) return;

    var section = document.querySelector('.globe-section');
    if (!section) return;
    if (document.getElementById('wnc-constellation')) return;

    canvas = document.createElement('canvas');
    canvas.id = 'wnc-constellation';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.pointerEvents = 'auto'; // allow touch
    canvas.style.zIndex = '1';

    // Ensure the section has position:relative so our absolute canvas works
    var secPos = getComputedStyle(section).position;
    if (secPos === 'static') section.style.position = 'relative';
    section.style.overflow = 'hidden'; // clip the wide canvas to section bounds

    section.insertBefore(canvas, section.firstChild);

    // Hide globe container
    function hideGlobeContainer() {
      var gc = document.getElementById('globe-container');
      if (gc) {
        gc.style.cssText = 'display:none!important;width:0;height:0;visibility:hidden;position:absolute;z-index:-1;pointer-events:none;';
      }
    }
    hideGlobeContainer();
    document.addEventListener('globe-ready', hideGlobeContainer);

    ctx = canvas.getContext('2d');

    resize();

    // More stars, better distributed — scaled to viewport area
    // Wide canvas means more area to fill, so we use a slightly lower density
    var COUNT = isLowEnd
      ? Math.max(35, Math.min(Math.floor((W * H) / 6000), 55))
      : Math.max(55, Math.min(Math.floor((W * H) / 4000), 100));

    stars = [];
    for (var i = 0; i < COUNT; i++) {
      stars.push(new Star(i));
    }

    buildConnections();
    raf = requestAnimationFrame(loop);

    canvas.addEventListener('touchstart', onTouch, { passive: true });
    canvas.addEventListener('touchmove',  onTouch, { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd, { passive: true });

    var _resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function() {
        if (isMobile()) {
          resize();
          // Respawn stars spread across new dimensions
          for (var i = 0; i < stars.length; i++) {
            if (stars[i].x > W * 1.15 || stars[i].y > H + 20) {
              stars[i].respawn();
            }
          }
          buildConnections();
        } else {
          if (raf) cancelAnimationFrame(raf);
          canvas.style.display = 'none';
        }
      }, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
