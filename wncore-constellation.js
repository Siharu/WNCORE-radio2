/* ═══════════════════════════════════════════════════════════════════════
   WNCORE — INTERACTIVE CONSTELLATION (Mobile Hero)
   File: wncore-constellation.js
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function isMobile() {
    return window.innerWidth <= 768;
  }

  var STATION_LABELS = [
    'TOKYO FM', 'BBC R4', 'NPR', 'FRANCE INTER',
    'RAI UNO', 'ABC RN', 'DW', 'KEXP',
    'NHK', 'CBC R2', 'RFI', 'SWR3'
  ];

  var canvas, ctx, stars = [], conns = [], pulses = [], ripples = [];
  var W = 0, H = 0, raf, touchX = -1, touchY = -1, frame = 0;

  /* ── STAR ───────────────────────────────────────────────────── */
  function Star(index) {
    /* W and H are set before stars are created in init(), so safe here */
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.r = 0.6 + Math.random() * 1.6;
    this.brightness = 0.3 + Math.random() * 0.7;
    this.twinkleSpeed = 0.008 + Math.random() * 0.018;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 0.06;
    this.vy = 0.04 + Math.random() * 0.06;
    this.label = index < STATION_LABELS.length ? STATION_LABELS[index] : null;
    this.active = false;

    if (this.label) {
      this.r = 1.8 + Math.random() * 1.2;
      this.brightness = 0.7 + Math.random() * 0.3;
    }
  }

  Star.prototype.respawn = function () {
    this.x = Math.random() * W;
    this.y = -4;
    this.r = 0.6 + Math.random() * 1.6;
    this.brightness = 0.3 + Math.random() * 0.7;
    this.twinkleSpeed = 0.008 + Math.random() * 0.018;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 0.06;
    this.vy = 0.04 + Math.random() * 0.06;
    this.label = null;
    this.active = false;
  };

  Star.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy * 0.15;
    /* Wrap X */
    if (this.x < -4) this.x = W + 4;
    if (this.x > W + 4) this.x = -4;
    /* Respawn from top once off bottom — only for unnamed stars */
    if (this.y > H + 8 && !this.label) this.respawn();
  };

  Star.prototype.draw = function () {
    var tw = Math.sin(frame * this.twinkleSpeed + this.twinkleOffset);
    var alpha = this.brightness * (0.65 + tw * 0.35);
    if (this.active) alpha = 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.active
      ? 'rgba(200,71,42,' + alpha + ')'
      : 'rgba(255,255,255,' + alpha + ')';
    ctx.fill();

    /* Glow */
    if (this.r > 1.4 || this.active) {
      var glowR = this.r * (this.active ? 5 : 3.5);
      var grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
      var rgb = this.active ? '200,71,42' : '160,180,255';
      grad.addColorStop(0, 'rgba(' + rgb + ',' + (alpha * 0.4) + ')');
      grad.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    /* Label — use font with built-in spacing instead of ctx.letterSpacing */
    if (this.label && this.r > 1.4) {
      ctx.font = '500 8px "DM Mono", monospace';
      ctx.fillStyle = 'rgba(200,71,42,' + (alpha * 0.8) + ')';
      ctx.fillText(this.label, this.x + this.r + 3, this.y + 3);
    }
  };

  /* ── CONNECTIONS ────────────────────────────────────────────── */
  /* Store only index pairs — compute distance live during draw  */
  function buildConnections() {
    conns = [];
    var MAX_DIST = Math.min(W, H) * 0.22;
    for (var i = 0; i < stars.length; i++) {
      for (var j = i + 1; j < stars.length; j++) {
        var dx = stars[i].x - stars[j].x;
        var dy = stars[i].y - stars[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < MAX_DIST) {
          conns.push({ a: i, b: j, maxDist: MAX_DIST });
        }
      }
    }
  }

  function drawConnections() {
    for (var k = 0; k < conns.length; k++) {
      var c = conns[k];
      var sa = stars[c.a], sb = stars[c.b];
      /* Compute live distance so accuracy tracks star movement */
      var dx = sa.x - sb.x, dy = sa.y - sb.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d >= c.maxDist) continue; /* stars have drifted apart */

      var alpha = (1 - d / c.maxDist) * 0.12;
      var boosted = sa.active || sb.active;
      if (boosted) alpha = 0.5;

      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.strokeStyle = boosted
        ? 'rgba(200,71,42,' + alpha + ')'
        : 'rgba(100,130,200,' + alpha + ')';
      ctx.lineWidth = boosted ? 0.8 : 0.4;
      ctx.stroke();
    }
  }

  /* ── RIPPLE ─────────────────────────────────────────────────── */
  function Ripple(x, y) {
    this.x = x; this.y = y;
    this.r = 4; this.alpha = 0.7; this.done = false;
  }
  Ripple.prototype.update = function () {
    this.r += 2.2;
    this.alpha -= 0.03;
    if (this.alpha <= 0 || this.r >= 48) this.done = true;
  };
  Ripple.prototype.draw = function () {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,71,42,' + this.alpha + ')';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };

  /* ── PULSE ──────────────────────────────────────────────────── */
  function Pulse(connIndex) {
    this.ci = connIndex;
    this.t = 0;
    this.speed = 0.012 + Math.random() * 0.008;
    this.done = false;
  }
  Pulse.prototype.update = function () {
    this.t += this.speed;
    if (this.t >= 1) this.done = true;
  };
  Pulse.prototype.draw = function () {
    var c = conns[this.ci];
    if (!c) { this.done = true; return; }
    var sa = stars[c.a], sb = stars[c.b];
    var x = sa.x + (sb.x - sa.x) * this.t;
    var y = sa.y + (sb.y - sa.y) * this.t;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,71,42,0.9)';
    ctx.fill();
  };

  /* ── LOOP ───────────────────────────────────────────────────── */
  function loop() {
    if (!ctx) return;
    raf = requestAnimationFrame(loop);
    frame++;

    ctx.clearRect(0, 0, W, H);

    /* Touch activation */
    for (var i = 0; i < stars.length; i++) {
      if (touchX >= 0) {
        var dx = stars[i].x - touchX, dy = stars[i].y - touchY;
        stars[i].active = (dx * dx + dy * dy) < 3600; /* 60px radius */
      } else {
        stars[i].active = false;
      }
    }

    /* Rebuild connections periodically */
    if (frame % 90 === 0) buildConnections();

    drawConnections();

    /* Pulses */
    for (var p = pulses.length - 1; p >= 0; p--) {
      pulses[p].update();
      pulses[p].draw();
      if (pulses[p].done) pulses.splice(p, 1);
    }

    /* Stars */
    for (var j = 0; j < stars.length; j++) {
      stars[j].update();
      stars[j].draw();
    }

    /* Ripples */
    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].update();
      ripples[r].draw();
      if (ripples[r].done) ripples.splice(r, 1);
    }

    /* Auto pulse every ~3s */
    if (frame % 180 === 0 && conns.length > 0) {
      pulses.push(new Pulse(Math.floor(Math.random() * conns.length)));
    }
  }

  /* ── RESIZE ─────────────────────────────────────────────────── */
  function resize() {
    var section = document.querySelector('.globe-section');
    W = section ? section.offsetWidth : window.innerWidth;
    H = section ? section.offsetHeight : 300;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    /* Reset transform completely before applying scale */
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── TOUCH ──────────────────────────────────────────────────── */
  function onTouch(e) {
    /* Guard: touches list may be empty (e.g. on some touchend events) */
    if (!e.touches || e.touches.length === 0) return;
    var rect = canvas.getBoundingClientRect();
    var t = e.touches[0];
    touchX = t.clientX - rect.left;
    touchY = t.clientY - rect.top;

    if (e.type === 'touchstart') {
      ripples.push(new Ripple(touchX, touchY));

      /* Find nearest star and burst pulses from it */
      var nearest = 0, nearDist = Infinity;
      for (var i = 0; i < stars.length; i++) {
        var dx = stars[i].x - touchX, dy = stars[i].y - touchY;
        var d = dx * dx + dy * dy;
        if (d < nearDist) { nearDist = d; nearest = i; }
      }
      for (var k = 0; k < conns.length; k++) {
        if ((conns[k].a === nearest || conns[k].b === nearest) && Math.random() < 0.4) {
          pulses.push(new Pulse(k));
        }
      }
    }
  }

  function onTouchEnd() {
    setTimeout(function () { touchX = -1; touchY = -1; }, 400);
  }

  /* ── INIT ───────────────────────────────────────────────────── */
  function init() {
    if (!isMobile()) return;

    var section = document.querySelector('.globe-section');
    if (!section) return;
    if (document.getElementById('wnc-constellation')) return; /* already init */

    canvas = document.createElement('canvas');
    canvas.id = 'wnc-constellation';
    canvas.setAttribute('aria-hidden', 'true');

    var globeContainer = document.getElementById('globe-container');
    if (globeContainer) {
      section.insertBefore(canvas, globeContainer);
    } else {
      section.appendChild(canvas);
    }

    ctx = canvas.getContext('2d');

    /* resize() must run BEFORE stars are created so W/H are valid */
    resize();

    var COUNT = Math.max(40, Math.min(Math.floor((W * H) / 4200), 80));
    stars = [];
    for (var i = 0; i < COUNT; i++) {
      stars.push(new Star(i));
    }

    buildConnections();
    loop();

    canvas.addEventListener('touchstart', onTouch, { passive: true });
    canvas.addEventListener('touchmove', onTouch, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    window.addEventListener('resize', function () {
      if (isMobile()) {
        resize();
        buildConnections();
      } else {
        cancelAnimationFrame(raf);
        canvas.style.display = 'none';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
