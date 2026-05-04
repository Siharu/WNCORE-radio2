/* ═══════════════════════════════════════════════════════
   WNCORE RADIO — wrongness.js
   Makes the user question what they saw, heard, or clicked.
   Psychological dread through micro-impossibilities.
   "Did that just happen?"
   
   FIXED: Removed intentional main-thread blocking (cursorStutter),
          disabled most effects on mobile to prevent freezing,
          converted freeze-inducing while loop to a no-op.
═══════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ─── MOBILE DETECTION ────────────────────────────────────────────────────
  const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || (window.innerWidth <= 768);

  // ─── STATE ──────────────────────────────────────────────────────────────
  const W = {
    active: false,
    intensity: 0,          // 0–100, grows over time
    lastEvent: null,
    phantomTimer: null,
    echoTimeout: null,
    suspicionLevel: 0,
    textCache: new Map(),
    clickLog: [],
    scrollPos: 0,
    initialized: false,
  };

  // ─── BOOT ────────────────────────────────────────────────────────────────
  function boot() {
    if (W.initialized) return;
    W.initialized = true;

    // Build intensity slowly
    setInterval(() => {
      W.intensity = Math.min(100, W.intensity + 0.4);
      W.active = W.intensity > 8;
    }, 4000);

    // On mobile, only run lightweight effects with longer intervals
    if (IS_MOBILE) {
      setInterval(textMirage,           30000);
      setInterval(stationNameBleed,     45000);
      setInterval(notificationGhost,   120000);
      setInterval(marginalGlimmer,      60000);
      document.addEventListener('visibilitychange', onVisibilityChange);
      injectWrongnessStyles();
      return;
    }

    // Desktop: full effect suite
    setInterval(ghostCursor,          11000);
    setInterval(textMirage,           19000);
    setInterval(doubleClickEcho,      27000);
    setInterval(stationNameBleed,     33000);
    setInterval(scrollGaslighting,    41000);
    setInterval(phantomHover,         53000);
    setInterval(counterfactualCount,  61000);
    // cursorStutter REMOVED — was blocking main thread causing freezes
    setInterval(linkColorFlip,        23000);
    setInterval(marginalGlimmer,       9000);
    setInterval(subliminalsInTicker,  37000);
    setInterval(pageFlash,            71000);
    setInterval(volumePhantom,        44000);
    setInterval(timestampDrift,       17000);
    setInterval(notificationGhost,    83000);
    setInterval(focusStealer,         91000);

    document.addEventListener('mousemove', trackMouse);
    document.addEventListener('click', logClick);
    document.addEventListener('scroll', () => { W.scrollPos = window.scrollY; }, {passive:true});
    document.addEventListener('visibilitychange', onVisibilityChange);

    injectWrongnessStyles();
  }

  // ─── PHANTOM CURSOR ─────────────────────────────────────────────────────
  let ghostEl = null;
  let mouseX = -200, mouseY = -200;

  function trackMouse(e) {
    mouseX = e.clientX; mouseY = e.clientY;
  }

  function ghostCursor() {
    if (!W.active || W.intensity < 20 || Math.random() > chance(0.35, 0.7)) return;

    if (!ghostEl) {
      ghostEl = document.createElement('div');
      ghostEl.id = 'w-ghost-cursor';
      ghostEl.style.cssText = `
        position:fixed;width:12px;height:12px;border-radius:50%;
        border:1.5px solid rgba(200,71,42,0.5);
        pointer-events:none;z-index:99990;
        transform:translate(-50%,-50%);
        transition:opacity 0.3s;opacity:0;
      `;
      document.body.appendChild(ghostEl);
    }

    const offsetX = (Math.random() - 0.5) * 180;
    const offsetY = (Math.random() - 0.5) * 80;
    ghostEl.style.left = (mouseX + offsetX) + 'px';
    ghostEl.style.top  = (mouseY + offsetY) + 'px';
    ghostEl.style.opacity = '0.7';

    let frame = 0;
    const anim = setInterval(() => {
      frame++;
      const gx = parseFloat(ghostEl.style.left);
      const gy = parseFloat(ghostEl.style.top);
      ghostEl.style.left = (gx + (mouseX - gx) * 0.04) + 'px';
      ghostEl.style.top  = (gy + (mouseY - gy) * 0.04) + 'px';
      ghostEl.style.opacity = String(0.7 * (1 - frame / 30));
      if (frame >= 30) { clearInterval(anim); ghostEl.style.opacity = '0'; }
    }, 40);
  }

  // ─── TEXT MIRAGE ─────────────────────────────────────────────────────────
  const SUBSTITUTIONS = [
    ['stations', 'signals'],
    ['listening', 'watching'],
    ['radio', 'frequency'],
    ['live', 'lost'],
    ['verified', 'unverified'],
    ['broadcasting', 'transmitting'],
    ['free', 'trapped'],
    ['global', 'unknown'],
    ['network', 'archive'],
    ['stream', 'bleed'],
    ['online', 'detected'],
    ['countries', 'coordinates'],
  ];

  function textMirage() {
    if (!W.active || Math.random() > chance(0.25, 0.6)) return;

    const allText = Array.from(document.querySelectorAll(
      'p, .about-text, .globe-sub, .fc-meta, .tr-meta, .rec-desc, .np-meta, .pb-meta'
    )).filter(el => el.offsetParent !== null);

    if (!allText.length) return;
    const target = allText[Math.floor(Math.random() * allText.length)];
    const original = target.textContent;

    for (const [from, to] of SUBSTITUTIONS) {
      if (original.toLowerCase().includes(from)) {
        const mutated = original.replace(new RegExp(from, 'i'), to);
        target.textContent = mutated;
        setTimeout(() => { target.textContent = original; }, 420 + Math.random() * 380);
        return;
      }
    }
  }

  // ─── DOUBLE CLICK ECHO ──────────────────────────────────────────────────
  function logClick(e) {
    W.clickLog.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (W.clickLog.length > 8) W.clickLog.shift();
  }

  function doubleClickEcho() {
    if (!W.active || W.intensity < 25 || !W.clickLog.length || Math.random() > chance(0.3, 0.55)) return;

    const past = W.clickLog[Math.floor(Math.random() * W.clickLog.length)];
    const jx = past.x + (Math.random() - 0.5) * 60;
    const jy = past.y + (Math.random() - 0.5) * 60;

    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position:fixed;left:${jx}px;top:${jy}px;
      width:4px;height:4px;border-radius:50%;
      border:1px solid rgba(200,71,42,0.6);
      transform:translate(-50%,-50%) scale(1);
      pointer-events:none;z-index:99991;
      animation:w-ripple-out 0.8s ease-out forwards;
    `;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 900);
  }

  // ─── STATION NAME BLEED ──────────────────────────────────────────────────
  const GHOST_NAMES = [
    '88.7 FM', 'NODE_09', 'SIGNAL_KAGE', 'FREQUENCY UNKNOWN',
    'CARRIER DETECTED', '██████████', 'BLANK ZONE', '—————',
    'UNKNOWN ORIGIN', 'UNVERIFIED SOURCE', 'GHOST SIGNAL',
  ];

  function stationNameBleed() {
    if (!W.active || W.intensity < 30 || Math.random() > chance(0.2, 0.5)) return;

    const nameEls = Array.from(document.querySelectorAll('.tr-name, .pb-name, .np-name, .sr-name'))
      .filter(el => el.offsetParent !== null && !el.textContent.includes('Standby'));

    if (!nameEls.length) return;
    const el = nameEls[Math.floor(Math.random() * nameEls.length)];
    const orig = el.textContent;
    const ghost = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];

    el.style.color = 'var(--accent)';
    el.textContent = ghost;
    setTimeout(() => {
      el.textContent = orig;
      el.style.color = '';
    }, 280 + Math.random() * 200);
  }

  // ─── SCROLL GASLIGHTING ──────────────────────────────────────────────────
  function scrollGaslighting() {
    if (!W.active || W.intensity < 35 || Math.random() > chance(0.2, 0.45)) return;
    if (document.hidden) return;

    const drift = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
    const target = Math.max(0, W.scrollPos + drift);
    window.scrollTo({ top: target, behavior: 'instant' });
    setTimeout(() => {
      window.scrollTo({ top: W.scrollPos, behavior: 'instant' });
    }, 60 + Math.random() * 80);
  }

  // ─── PHANTOM HOVER ──────────────────────────────────────────────────────
  function phantomHover() {
    if (!W.active || W.intensity < 28 || Math.random() > chance(0.25, 0.5)) return;

    const hoverables = Array.from(document.querySelectorAll(
      '.genre-btn, .rec-card, .trending-item, nav a, .fc-name, .section-more'
    )).filter(el => el.offsetParent !== null);

    if (!hoverables.length) return;
    const el = hoverables[Math.floor(Math.random() * hoverables.length)];
    el.classList.add('w-phantom-hover');
    setTimeout(() => el.classList.remove('w-phantom-hover'), 180 + Math.random() * 120);
  }

  // ─── COUNTERFACTUAL COUNTER ──────────────────────────────────────────────
  function counterfactualCount() {
    if (!W.active || W.intensity < 15 || Math.random() > chance(0.3, 0.65)) return;

    const el = document.getElementById('live-count');
    if (!el) return;
    const orig = el.textContent;

    const wrong = Math.random() > 0.5
      ? `${(Math.floor(Math.random() * 9) + 1).toLocaleString()} live`
      : `${(Math.floor(Math.random() * 999999) + 500000).toLocaleString()} live`;

    el.textContent = wrong;
    el.style.color = 'var(--accent)';
    setTimeout(() => {
      el.textContent = orig;
      el.style.color = '';
    }, 160 + Math.random() * 140);
  }

  // ─── CURSOR STUTTER (REMOVED — was blocking main thread) ─────────────────
  // The original cursorStutter used a while(Date.now()-start < freeze){} loop
  // which BLOCKS the entire JavaScript thread, causing the browser to freeze.
  // This was the #1 cause of mobile and desktop hangs. Removed entirely.

  // ─── LINK COLOR FLIP ─────────────────────────────────────────────────────
  function linkColorFlip() {
    if (!W.active || W.intensity < 22 || Math.random() > chance(0.2, 0.4)) return;

    const links = Array.from(document.querySelectorAll('nav a, .section-more'))
      .filter(el => el.offsetParent !== null);
    if (!links.length) return;

    const el = links[Math.floor(Math.random() * links.length)];
    const orig = el.style.color;
    el.style.color = 'rgba(200,71,42,0.4)';
    setTimeout(() => { el.style.color = orig; }, 120 + Math.random() * 100);
  }

  // ─── MARGINAL GLIMMER ────────────────────────────────────────────────────
  let glimmerEl = null;
  function marginalGlimmer() {
    if (!W.active || W.intensity < 12 || Math.random() > chance(0.3, 0.55)) return;

    if (!glimmerEl) {
      glimmerEl = document.createElement('div');
      glimmerEl.id = 'w-glimmer';
      glimmerEl.style.cssText = `
        position:fixed;pointer-events:none;z-index:99989;
        border-radius:50%;opacity:0;
        background:radial-gradient(circle,rgba(200,71,42,0.5) 0%,transparent 70%);
        transition:opacity 0.2s;
      `;
      document.body.appendChild(glimmerEl);
    }

    const edge = Math.floor(Math.random() * 4);
    const size = 30 + Math.random() * 50;
    glimmerEl.style.width  = size + 'px';
    glimmerEl.style.height = size + 'px';

    const offscreen = -size * 0.65;
    if (edge === 0) { glimmerEl.style.top = offscreen + 'px'; glimmerEl.style.left = (Math.random() * 100) + 'vw'; glimmerEl.style.bottom = 'auto'; glimmerEl.style.right = 'auto'; }
    if (edge === 1) { glimmerEl.style.right = offscreen + 'px'; glimmerEl.style.top = (Math.random() * 100) + 'vh'; glimmerEl.style.left = 'auto'; glimmerEl.style.bottom = 'auto'; }
    if (edge === 2) { glimmerEl.style.bottom = offscreen + 'px'; glimmerEl.style.left = (Math.random() * 100) + 'vw'; glimmerEl.style.top = 'auto'; glimmerEl.style.right = 'auto'; }
    if (edge === 3) { glimmerEl.style.left = offscreen + 'px'; glimmerEl.style.top = (Math.random() * 100) + 'vh'; glimmerEl.style.right = 'auto'; glimmerEl.style.bottom = 'auto'; }

    glimmerEl.style.opacity = '1';
    setTimeout(() => { glimmerEl.style.opacity = '0'; }, 180 + Math.random() * 300);
  }

  // ─── SUBLIMINALS IN TICKER ───────────────────────────────────────────────
  const SUBLIMINALS = [
    'YOU SAW SOMETHING', 'THAT WAS NOT THERE', 'DID YOU HEAR THAT',
    'NODE 09 IS WATCHING', 'LOOK AWAY', 'IT HAPPENED AGAIN',
    'YOU WERE RIGHT', 'CHECK THE LOG', 'SIGNAL_KAGE KNOWS',
    'YOU IMAGINED IT', 'OR DID YOU',
  ];

  function subliminalsInTicker() {
    if (!W.active || W.intensity < 20 || Math.random() > chance(0.35, 0.7)) return;

    const inner = document.getElementById('ticker-inner');
    if (!inner) return;

    const s = document.createElement('span');
    s.className = 'w-subliminal';
    s.textContent = SUBLIMINALS[Math.floor(Math.random() * SUBLIMINALS.length)];
    inner.appendChild(s);
    setTimeout(() => s.remove(), 12000 + Math.random() * 5000);
  }

  // ─── PAGE FLASH ──────────────────────────────────────────────────────────
  function pageFlash() {
    if (!W.active || W.intensity < 45 || Math.random() > chance(0.2, 0.4)) return;

    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed;inset:0;pointer-events:none;z-index:99988;
      background:rgba(200,71,42,0.04);opacity:1;
      transition:opacity 0.15s;
    `;
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 80);
    setTimeout(() => flash.remove(), 300);
  }

  // ─── VOLUME PHANTOM ──────────────────────────────────────────────────────
  function volumePhantom() {
    if (!W.active || W.intensity < 40 || Math.random() > chance(0.2, 0.45)) return;

    const audio = document.getElementById('audio');
    if (!audio || audio.paused) return;

    const orig = audio.volume;
    const target = Math.random() > 0.5
      ? Math.max(0, orig - 0.15 - Math.random() * 0.15)
      : Math.min(1, orig + 0.1 + Math.random() * 0.1);

    audio.volume = target;
    setTimeout(() => { audio.volume = orig; }, 160 + Math.random() * 120);
  }

  // ─── TIMESTAMP DRIFT ─────────────────────────────────────────────────────
  function timestampDrift() {
    if (!W.active || W.intensity < 18 || Math.random() > chance(0.25, 0.5)) return;

    const spans = Array.from(document.querySelectorAll('#ticker-inner span'))
      .filter(s => s.textContent.includes('LAST VERIFIED') || s.textContent.includes('UTC'));

    if (!spans.length) return;
    const el = spans[0];
    const orig = el.textContent;

    const wrongTimes = [
      'LAST VERIFIED TRANSMISSION: --:--:-- UTC',
      'LAST VERIFIED TRANSMISSION: 00:00:00 UTC',
      'LAST VERIFIED TRANSMISSION: [OVERFLOW]',
      `LAST VERIFIED TRANSMISSION: ${fakeTime()} UTC`,
    ];

    el.textContent = wrongTimes[Math.floor(Math.random() * wrongTimes.length)];
    setTimeout(() => { el.textContent = orig; }, 340 + Math.random() * 200);
  }

  function fakeTime() {
    const h = String(Math.floor(Math.random() * 24)).padStart(2, '0');
    const m = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    const s = String(Math.floor(Math.random() * 60)).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // ─── NOTIFICATION GHOST ──────────────────────────────────────────────────
  const GHOST_NOTICES = [
    'New transmission from Node 09',
    '88.7 FM — carrier detected',
    'Signal anomaly on your frequency',
    'Someone else is listening with you',
    'Broadcast resumed unexpectedly',
    'You have (1) unread signal',
    'Archive access logged',
  ];

  let ghostNotifEl = null;
  function notificationGhost() {
    if (!W.active || W.intensity < 50 || Math.random() > chance(0.15, 0.35)) return;

    if (!ghostNotifEl) {
      ghostNotifEl = document.createElement('div');
      ghostNotifEl.id = 'w-ghost-notif';
      ghostNotifEl.style.cssText = `
        position:fixed;bottom:100px;right:20px;z-index:99985;
        background:var(--surface);border:1px solid var(--border);
        border-radius:10px;padding:10px 14px;
        font-family:'DM Sans',sans-serif;font-size:0.75rem;color:var(--text);
        box-shadow:0 8px 28px rgba(0,0,0,0.12);
        opacity:0;transform:translateY(8px);
        transition:opacity 0.15s,transform 0.15s;
        pointer-events:none;max-width:220px;line-height:1.4;
      `;
      document.body.appendChild(ghostNotifEl);
    }

    ghostNotifEl.textContent = GHOST_NOTICES[Math.floor(Math.random() * GHOST_NOTICES.length)];
    ghostNotifEl.style.opacity = '1';
    ghostNotifEl.style.transform = 'translateY(0)';

    setTimeout(() => {
      ghostNotifEl.style.opacity = '0';
      ghostNotifEl.style.transform = 'translateY(8px)';
    }, 300 + Math.random() * 300);
  }

  // ─── FOCUS STEALER ───────────────────────────────────────────────────────
  function focusStealer() {
    if (!W.active || W.intensity < 60 || Math.random() > chance(0.12, 0.25)) return;

    const focused = document.activeElement;
    if (!focused || focused === document.body) return;
    if (!['INPUT','TEXTAREA'].includes(focused.tagName)) return;

    focused.blur();
    setTimeout(() => { focused.focus(); }, 120);
  }

  // ─── VISIBILITY GASLIGHTING ──────────────────────────────────────────────
  function onVisibilityChange() {
    if (document.hidden || !W.active || W.intensity < 35) return;
    if (Math.random() > chance(0.2, 0.45)) return;

    const argCard = document.getElementById('arg-card');
    if (argCard) {
      argCard.style.transition = 'box-shadow 0.1s';
      argCard.style.boxShadow = '0 0 0 2px rgba(200,71,42,0.7), 0 0 20px rgba(200,71,42,0.3)';
      setTimeout(() => { argCard.style.boxShadow = ''; }, 250);
    }

    stationNameBleed();
    setTimeout(textMirage, 600);
  }

  // ─── CSS INJECTION ───────────────────────────────────────────────────────
  function injectWrongnessStyles() {
    const style = document.createElement('style');
    style.id = 'wrongness-styles';
    style.textContent = `
      @keyframes w-ripple-out {
        0%   { transform:translate(-50%,-50%) scale(1); opacity:0.7; border-width:1px; }
        100% { transform:translate(-50%,-50%) scale(8); opacity:0; border-width:0.5px; }
      }

      .w-phantom-hover {
        background: var(--surface2) !important;
        color: var(--text) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
      }

      .w-subliminal {
        opacity: 0.012;
        font-weight: 700;
        letter-spacing: 3px;
        font-size: 0.55rem;
        color: var(--accent);
        margin: 0 40px;
        text-transform: uppercase;
        animation: w-subliminal-blink 8s step-end infinite;
      }
      @keyframes w-subliminal-blink {
        0%    { opacity: 0.012; }
        0.2%  { opacity: 0.55; }
        0.4%  { opacity: 0.012; }
        100%  { opacity: 0.012; }
      }

      .char-jitter {
        display:inline-block;
        animation: char-jitter-anim 0.07s ease-in-out infinite alternate;
      }
      @keyframes char-jitter-anim {
        from { transform: translate(-1px, 0); }
        to   { transform: translate(1px, 0.5px); }
      }

      #w-ghost-cursor {
        mix-blend-mode: multiply;
      }
      body.dark-mode #w-ghost-cursor {
        mix-blend-mode: screen;
        border-color: rgba(200,71,42,0.6);
      }
    `;
    document.head.appendChild(style);
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  function chance(min, max) {
    return min + (max - min) * (W.intensity / 100);
  }

  // ─── EXPOSE PUBLIC API ───────────────────────────────────────────────────
  window.WRONGNESS = {
    spike(amount = 20) {
      W.intensity = Math.min(100, W.intensity + amount);
    },
    getIntensity() { return W.intensity; },
    forceEvent(name) {
      const map = {
        ghost: ghostCursor,
        text: textMirage,
        name: stationNameBleed,
        notif: notificationGhost,
        flash: pageFlash,
        glimmer: marginalGlimmer,
      };
      if (map[name]) map[name]();
    }
  };

  // ─── DELAYED BOOT ────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 3500));
  } else {
    setTimeout(boot, 3500);
  }

})();
