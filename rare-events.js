/* ═══════════════════════════════════════════════════════════════════════════
   WNCORE RADIO — rare-events.js
   Scheduled viral moments that make users question what they saw.
   Self-contained: reads globals (exposure, horrorTriggered, isPlaying,
   currentStation, isDarkMode) but never overwrites them.
   ═══════════════════════════════════════════════════════════════════════════

   RARE EVENT CATALOGUE:
   1.  Signal Interruption     — screen flicker + "SIGNAL LOST" flash
   2.  Station Name Mutation   — station title corrupts momentarily
   3.  Impossible Timestamp    — clock shows a wrong/impossible time
   4.  Corrupted Frame         — subliminal single-frame flash image
   5.  Emergency Override      — audio ducks, distorted voice static plays
   6.  Eye Anomaly             — floating eye pupils appear anywhere on screen
   7.  Hidden Frequency        — 88.8 FM ghost station appears in station list
   8.  Screen Corruption Burst — full-page chromatic aberration + scanline storm
   9.  Numbers Station Tone    — faint morse/numbers-station audio via WebAudio
   10. Ticker Takeover         — ticker completely overridden for 8 seconds
   11. Cursor Ghost            — invisible second cursor trails behind real one
   12. Tab Title Bleed         — browser tab title changes to something wrong

   PERSONA TRANSITION RANDOMIZATION:
   — oauthContinue() now fires the horror intercept only ~60% of the time
   — handleSignIn() email horror fires only ~55% of the time
   — About page eerie scramble fires only ~50% of the time
   — Each has a different "skip" behaviour so users never know what to expect

   SPREAD MECHANICS:
   — Events always produce screenshot-worthy moments
   — Events intentionally leave traces (ticker residue, log entries) so players
     discuss "did you see…" online
   — All events are DENIABLE: subtle enough that users think it might be a bug
   ═══════════════════════════════════════════════════════════════════════════ */

(function WNCORE_RARE_EVENTS() {
  'use strict';

  // ─── SAFETY: wait for DOM + other scripts to be ready ────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 800); // let main.js, improvements.js etc. settle
  }

  // ─── CONFIG ──────────────────────────────────────────────────────────────
  const CFG = {
    // Minimum seconds between ANY rare events (prevents stacking)
    cooldownMs: 45 * 1000,
    // Probability weights — higher = fires more often (relative)
    weights: {
      signalInterruption:   8,
      stationMutation:      10,
      impossibleTimestamp:  6,
      corruptedFrame:       4,   // very rare — most impactful
      emergencyOverride:    3,   // rarest — audio involved
      eyeAnomaly:           7,
      hiddenFrequency:      5,
      screenCorruption:     5,
      numbersStationTone:   4,
      tickerTakeover:       9,
      cursorGhost:          6,
      tabTitleBleed:        10,
    },
    // How long the scheduler waits between rolls (ms)
    rollIntervalMs: 28 * 1000,
    // Base probability per roll that SOMETHING fires (scales with exposure)
    baseFireChance: 0.18,
  };

  // ─── STATE ───────────────────────────────────────────────────────────────
  let lastEventTime = 0;
  let _ghostCursorEl = null;
  let _eyeFloatEls = [];
  let _hiddenFreqInjected = false;
  let _webAudioCtx = null;

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  function getExposure() { return (typeof window.exposure === 'number') ? window.exposure : 0; }
  function getHorrorTriggered() { return !!window.horrorTriggered; }
  function getIsPlaying() { return !!window.isPlaying; }
  function isDark() { return !!window.isDarkMode; }

  function roll(chance) { return Math.random() < chance; }

  // Weighted random pick from CFG.weights
  function pickEvent() {
    const keys = Object.keys(CFG.weights);
    const total = keys.reduce((s, k) => s + CFG.weights[k], 0);
    let r = Math.random() * total;
    for (const k of keys) {
      r -= CFG.weights[k];
      if (r <= 0) return k;
    }
    return keys[keys.length - 1];
  }

  // Insert a ticker warning (safe — checks if ticker exists)
  function tickerWarn(msg) {
    const inner = document.getElementById('ticker-inner');
    if (!inner) return;
    const s = document.createElement('span');
    s.className = 't-warn';
    s.textContent = ' ⚠ ' + msg + ' ⚠ ';
    inner.insertBefore(s, inner.firstChild);
    // mirror in second copy
    const clone = s.cloneNode(true);
    inner.appendChild(clone);
    // auto-remove after 30s
    setTimeout(() => { s.remove(); clone.remove(); }, 30000);
  }

  // Flash the entire screen (white or red)
  function screenFlash(color, opacity, durationMs) {
    const f = document.createElement('div');
    f.style.cssText = `position:fixed;inset:0;background:${color};z-index:999990;opacity:${opacity};pointer-events:none;transition:opacity ${durationMs * 0.4}ms ease`;
    document.body.appendChild(f);
    setTimeout(() => { f.style.opacity = '0'; setTimeout(() => f.remove(), durationMs * 0.5); }, durationMs * 0.6);
  }

  // Chromatic abberation layer
  function chromaticLayer(durationMs) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;inset:0;z-index:999980;pointer-events:none;
      mix-blend-mode:screen;
      background:transparent;
      box-shadow:inset 4px 0 0 rgba(255,0,0,0.15), inset -4px 0 0 rgba(0,200,255,0.15);
      animation:wncore-chromatic ${durationMs}ms steps(2) forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), durationMs + 100);
  }

  // ─── SHARED STYLE INJECTION ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('wncore-re-styles')) return;
    const style = document.createElement('style');
    style.id = 'wncore-re-styles';
    style.textContent = `
      @keyframes wncore-chromatic {
        0%   { transform: translate(0,0); }
        25%  { transform: translate(-3px,1px); filter: hue-rotate(40deg); }
        50%  { transform: translate(3px,-1px); filter: hue-rotate(-40deg); }
        75%  { transform: translate(-1px,2px); filter: hue-rotate(20deg); }
        100% { transform: translate(0,0); filter: none; }
      }
      @keyframes wncore-scanstorm {
        0%,100% { background-position: 0 0; opacity: 0.18; }
        50%     { background-position: 0 8px; opacity: 0.28; }
      }
      @keyframes wncore-eye-float {
        0%   { transform: translate(0,0) scale(1); }
        30%  { transform: translate(8px,-12px) scale(1.04); }
        70%  { transform: translate(-6px,8px) scale(0.97); }
        100% { transform: translate(0,0) scale(1); }
      }
      @keyframes wncore-eye-appear {
        0%   { opacity:0; transform: scale(0.4); }
        60%  { opacity:1; transform: scale(1.05); }
        100% { opacity:1; transform: scale(1); }
      }
      @keyframes wncore-eye-vanish {
        0%   { opacity:1; }
        100% { opacity:0; transform: scale(0.2); }
      }
      @keyframes wncore-cursor-trail {
        0%   { opacity:0.5; }
        100% { opacity:0; }
      }
      .wncore-scan-storm {
        position:fixed;inset:0;z-index:999970;pointer-events:none;
        background: repeating-linear-gradient(
          0deg,
          transparent 0px,
          transparent 3px,
          rgba(0,0,0,0.12) 3px,
          rgba(0,0,0,0.12) 4px
        );
        animation: wncore-scanstorm 0.06s step-end infinite;
      }
      .wncore-float-eye {
        position:fixed;z-index:999960;pointer-events:none;
        width:64px;height:64px;
        animation: wncore-eye-appear 0.6s ease forwards, wncore-eye-float 4s ease-in-out infinite;
      }
      .wncore-float-eye.vanishing {
        animation: wncore-eye-vanish 0.5s ease forwards !important;
      }
      .wncore-ghost-cursor {
        position:fixed;z-index:999950;pointer-events:none;
        width:10px;height:10px;
        border-radius:50%;
        background:rgba(200,71,42,0.5);
        transform:translate(-50%,-50%);
        transition:left 1.2s ease, top 1.2s ease;
        mix-blend-mode:screen;
      }
      .wncore-signal-interrupt {
        position:fixed;inset:0;z-index:999985;pointer-events:none;
        background:#000;display:flex;align-items:center;justify-content:center;
        flex-direction:column;gap:12px;
      }
      .wncore-signal-interrupt-label {
        font-family:'DM Mono',monospace;font-size:0.9rem;letter-spacing:6px;
        color:rgba(200,71,42,0.9);text-align:center;
      }
      .wncore-signal-interrupt-sub {
        font-family:'DM Mono',monospace;font-size:0.5rem;letter-spacing:3px;
        color:rgba(200,71,42,0.35);text-align:center;
      }
      .wncore-subliminal-frame {
        position:fixed;inset:0;z-index:999999;pointer-events:none;
        display:flex;align-items:center;justify-content:center;
        background:rgba(0,0,0,0.85);
      }
      .wncore-subliminal-text {
        font-family:'DM Mono',monospace;font-size:clamp(1.2rem,4vw,2.5rem);
        letter-spacing:8px;color:rgba(200,71,42,0.95);text-align:center;
        line-height:1.5;text-transform:uppercase;
      }
      .wncore-hidden-freq-row {
        animation: wncore-eye-appear 0.4s ease forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 1: SIGNAL INTERRUPTION
  // Screen goes black briefly with "SIGNAL LOST" then restores itself
  // ═══════════════════════════════════════════════════════════════════════════
  function signalInterruption() {
    const overlay = document.createElement('div');
    overlay.className = 'wncore-signal-interrupt';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    overlay.innerHTML = `
      <div class="wncore-signal-interrupt-label">SIGNAL LOST</div>
      <div class="wncore-signal-interrupt-sub">88.700 MHz · NODE 09 · ATTEMPTING RECONNECT</div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      tickerWarn('SIGNAL LOST — RECONNECTING TO 88.7');

      setTimeout(() => {
        // Flicker restore
        overlay.style.opacity = '0.3';
        setTimeout(() => { overlay.style.opacity = '1'; }, 80);
        setTimeout(() => { overlay.style.opacity = '0.1'; }, 160);
        setTimeout(() => { overlay.style.opacity = '0.7'; }, 220);
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.remove(), 400);
          tickerWarn('SIGNAL RESTORED — SOURCE UNVERIFIED');
        }, 320);
      }, 1800);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 2: STATION NAME MUTATION
  // Current playing station name briefly shows as something wrong
  // ═══════════════════════════════════════════════════════════════════════════
  const MUTATION_NAMES = [
    'S̴I̷G̵N̸A̷L̴_̵K̷A̴G̶E̵',
    '██████████',
    'DO NOT LISTEN',
    '8̷8̸.̶7̷ ̸F̴M̷',
    'N̷O̸D̶E̵_̴0̷9̸',
    '[REDACTED]',
    'UNKNOWN SOURCE',
    'BLANK ZONE 2028',
  ];

  function stationMutation() {
    const targets = [
      document.getElementById('pb-name'),
      document.getElementById('np-name'),
      document.getElementById('mini-name'),
    ].filter(Boolean);

    if (!targets.length) return;

    const mutant = MUTATION_NAMES[Math.floor(Math.random() * MUTATION_NAMES.length)];
    const originals = targets.map(el => el.textContent);

    targets.forEach(el => {
      el.style.transition = 'color 0.1s';
      el.style.color = 'rgba(200,71,42,0.9)';
      el.textContent = mutant;
    });

    // Hold for a beat — long enough to screenshot, short enough to doubt
    const holdMs = 900 + Math.random() * 700;
    setTimeout(() => {
      try {
        targets.forEach((el, i) => {
          el.style.color = '';
          // Only restore if the element still shows our mutant text
          // (don't overwrite if main.js already updated the station name)
          if (el.textContent === mutant) {
            el.textContent = originals[i];
          }
          setTimeout(() => { el.style.transition = ''; }, 200);
        });
      } catch(e) {
        // Always clean up colour even if textContent restore fails
        targets.forEach(el => { el.style.color = ''; el.style.transition = ''; });
      }
    }, holdMs);

    tickerWarn('CALLSIGN ANOMALY DETECTED');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 3: IMPOSSIBLE TIMESTAMP
  // The live clock in signal-conn-ts shows a wrong/impossible time
  // ═══════════════════════════════════════════════════════════════════════════
  const IMPOSSIBLE_TIMES = [
    '25:61:99 UTC',
    '00:00:00 UTC',
    '-1:00:00 UTC',
    '88:70:00 UTC',
    '2016-03-31 UTC',
    'N̷O̵W̷ UTC',
    '∞∞:∞∞:∞∞ UTC',
  ];

  function impossibleTimestamp() {
    const el = document.getElementById('signal-conn-ts');
    if (!el) return;
    const orig = el.textContent;
    const impossible = IMPOSSIBLE_TIMES[Math.floor(Math.random() * IMPOSSIBLE_TIMES.length)];

    el.style.color = 'rgba(200,71,42,0.9)';
    el.style.fontSize = '0.62rem';
    el.textContent = impossible;

    setTimeout(() => {
      el.textContent = orig;
      el.style.color = '';
      el.style.fontSize = '';
    }, 600 + Math.random() * 400);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 4: CORRUPTED FRAME (subliminal)
  // A classified-looking text block appears for ~120ms
  // Fast enough that users question if they imagined it
  // ═══════════════════════════════════════════════════════════════════════════
  const SUBLIMINAL_TEXTS = [
    'YOU ARE BEING RECORDED\nsiharu.vercel.app',
    'NODE 09 IS ALIVE\nDO NOT SEARCH FOR US',
    'SIGNAL_KAGE SEES YOU',
    'THEY WERE NEVER DECOMMISSIONED\n88.700 MHz',
    'THE BLANK ZONE EXISTS\n2028–2031',
    'MARCH 31\nTHE SKY WAS WRONG',
    'FREQUENCY 0.315126\nDO NOT TUNE',
  ];

  function corruptedFrame() {
    const text = SUBLIMINAL_TEXTS[Math.floor(Math.random() * SUBLIMINAL_TEXTS.length)];
    const frame = document.createElement('div');
    frame.className = 'wncore-subliminal-frame';
    frame.style.opacity = '0';
    frame.innerHTML = `<div class="wncore-subliminal-text">${text.replace(/\n/g, '<br>')}</div>`;
    document.body.appendChild(frame);

    // 1-frame flash
    requestAnimationFrame(() => {
      frame.style.opacity = '1';
      const holdMs = 80 + Math.random() * 80; // 80–160ms — subliminal range
      setTimeout(() => {
        frame.style.opacity = '0';
        setTimeout(() => frame.remove(), 200);
      }, holdMs);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 5: EMERGENCY OVERRIDE
  // Audio ducks (if playing), static burst plays via WebAudio
  // ═══════════════════════════════════════════════════════════════════════════
  function emergencyOverride() {
    // Static burst via WebAudio
    try {
      if (!_webAudioCtx) {
        _webAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = _webAudioCtx;
      const bufferSize = ctx.sampleRate * 1.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // White noise burst with amplitude envelope (fade in, hold, fade out)
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
        data[i] = (Math.random() * 2 - 1) * envelope * 0.12;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      // Bandpass filter to make it sound like radio interference
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 800;
      filter.Q.value = 0.8;
      source.connect(filter);
      filter.connect(ctx.destination);
      source.start(0);

      // Duck main audio if playing
      // SAFETY: re-read volume at restore time in case user adjusted it during duck
      const mainAudio = document.getElementById('audio');
      if (mainAudio && getIsPlaying()) {
        const preVol = mainAudio.volume;
        mainAudio.volume = preVol * 0.3;
        setTimeout(() => {
          // Only restore if audio is still playing and volume is still ducked
          // (don't override a manual volume change the user made during the 1.8s)
          if (mainAudio.volume <= preVol * 0.35) {
            mainAudio.volume = preVol;
          }
        }, 1800);
      }
    } catch (e) {}

    // Visual: emergency ticker override + brief screen tint
    tickerWarn('EMERGENCY OVERRIDE — ALL STATIONS STAND BY');

    const tint = document.createElement('div');
    tint.style.cssText = 'position:fixed;inset:0;z-index:999975;pointer-events:none;background:rgba(200,71,42,0.06);transition:opacity 0.4s';
    document.body.appendChild(tint);
    setTimeout(() => { tint.style.opacity = '0'; setTimeout(() => tint.remove(), 500); }, 1800);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 6: EYE ANOMALY
  // Floating eye pupils appear in random positions on screen then vanish
  // ═══════════════════════════════════════════════════════════════════════════
  function eyeAnomaly() {
    const count = 1 + Math.floor(Math.random() * 2); // 1–2 eyes

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const eye = document.createElement('div');
        eye.className = 'wncore-float-eye';

        // SVG eye — same style as the about page eye
        eye.innerHTML = `
          <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
            <ellipse cx="32" cy="32" rx="28" ry="18" fill="#0e0c0a" stroke="rgba(200,71,42,0.6)" stroke-width="1.5"/>
            <circle cx="32" cy="32" r="10" fill="rgba(200,71,42,0.15)" stroke="rgba(200,71,42,0.4)" stroke-width="1"/>
            <circle cx="32" cy="32" r="5" fill="rgba(200,71,42,0.7)"/>
            <circle cx="29" cy="30" r="1.5" fill="rgba(255,255,255,0.4)"/>
          </svg>
        `;

        // Random screen position (avoid edges)
        eye.style.left = (10 + Math.random() * 75) + 'vw';
        eye.style.top  = (10 + Math.random() * 70) + 'vh';

        document.body.appendChild(eye);
        _eyeFloatEls.push(eye);

        const lifetime = 2500 + Math.random() * 3000;
        setTimeout(() => {
          eye.classList.add('vanishing');
          setTimeout(() => {
            eye.remove();
            _eyeFloatEls = _eyeFloatEls.filter(e => e !== eye);
          }, 500);
        }, lifetime);
      }, i * 600);
    }

    tickerWarn('VISUAL ANOMALY DETECTED — SENSOR ARRAY');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 7: HIDDEN FREQUENCY
  // A ghost station "88.8 FM — UNKNOWN" appears in the top station table
  // and disappears after ~15s
  // ═══════════════════════════════════════════════════════════════════════════
  function hiddenFrequency() {
    const tbody = document.getElementById('station-tbody');
    if (!tbody) return;

    const ghostRow = document.createElement('tr');
    ghostRow.className = 'wncore-hidden-freq-row';
    ghostRow.style.cssText = `
      background:rgba(200,71,42,0.04);
      border-left:2px solid rgba(200,71,42,0.4);
      cursor:pointer;
    `;
    ghostRow.innerHTML = `
      <td style="padding:10px 8px;font-family:'DM Mono',monospace;font-size:0.65rem;color:rgba(200,71,42,0.8);">
        ⚠ 88.8 FM
      </td>
      <td style="padding:10px 8px;font-family:'DM Mono',monospace;font-size:0.72rem;color:rgba(200,71,42,0.9);font-weight:600;">
        ██████████ — UNKNOWN SOURCE
      </td>
      <td style="padding:10px 8px;font-size:0.65rem;color:rgba(200,71,42,0.5);">
        [REDACTED]
      </td>
      <td style="padding:10px 8px;font-size:0.65rem;color:rgba(200,71,42,0.4);">
        ——kbps
      </td>
      <td style="padding:10px 8px;" colspan="2">
        <span style="font-family:'DM Mono',monospace;font-size:0.55rem;color:rgba(200,71,42,0.35);letter-spacing:2px;">
          NO CARRIER
        </span>
      </td>
    `;

    // Clicking the ghost row is a dead end (it's an ARG breadcrumb, not a real stream)
    ghostRow.addEventListener('click', () => {
      tickerWarn('88.8 FM — ACCESS DENIED');
      ghostRow.style.background = 'rgba(200,71,42,0.12)';
      setTimeout(() => {
        ghostRow.style.background = '';
      }, 400);
    });

    // Insert at the top of the table
    tbody.insertBefore(ghostRow, tbody.firstChild);
    tickerWarn('UNKNOWN STATION DETECTED — 88.8 FM');

    // Remove after 12–20 seconds (variable so screenshots are rare)
    const lifetime = 12000 + Math.random() * 8000;
    setTimeout(() => {
      ghostRow.style.transition = 'opacity 0.6s';
      ghostRow.style.opacity = '0';
      setTimeout(() => ghostRow.remove(), 700);
    }, lifetime);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 8: SCREEN CORRUPTION BURST
  // Full-page chromatic aberration + scanline storm for 1.5s
  // ═══════════════════════════════════════════════════════════════════════════
  function screenCorruption() {
    // Scanline storm overlay — pointer-events:none so player bar stays usable
    const scans = document.createElement('div');
    scans.className = 'wncore-scan-storm';
    document.body.appendChild(scans);

    // Chromatic aberration via body transform
    // SAFETY: always restore body styles — stale transform shifts the player bar
    let frame = 0;
    const corruptFrames = 10; // shorter = less risk window

    function cleanup() {
      document.body.style.transform = '';
      document.body.style.filter = '';
      if (scans.parentNode) scans.remove();
    }

    const raf = () => {
      try {
        if (frame >= corruptFrames) { cleanup(); return; }
        const dx = (Math.random() - 0.5) * 4; // tighter range — still visible but less jarring
        const dy = (Math.random() - 0.5) * 2;
        const hue = (Math.random() - 0.5) * 12;
        document.body.style.transform = `translate(${dx}px, ${dy}px)`;
        document.body.style.filter = `hue-rotate(${hue}deg) contrast(${101 + Math.random() * 5}%)`;
        frame++;
        requestAnimationFrame(raf);
      } catch(e) {
        cleanup(); // always restore even if something throws
      }
    };

    // Hard failsafe: force cleanup after 1.5s regardless of RAF state
    const failsafe = setTimeout(cleanup, 1500);
    requestAnimationFrame(raf);
    // Cancel failsafe if RAF finished naturally (slightly after last frame)
    setTimeout(() => clearTimeout(failsafe), 1600);

    tickerWarn('SIGNAL INTEGRITY: COMPROMISED');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 9: NUMBERS STATION TONE
  // Brief burst of numbers-station style audio (beeps + silence pattern)
  // ═══════════════════════════════════════════════════════════════════════════
  function numbersStationTone() {
    try {
      if (!_webAudioCtx) {
        _webAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = _webAudioCtx;

      // Classic numbers station: repeating tone pattern
      const sequence = [
        { freq: 1000, dur: 0.15, gap: 0.05 },
        { freq: 1000, dur: 0.15, gap: 0.05 },
        { freq: 1000, dur: 0.15, gap: 0.05 },
        { freq: 800,  dur: 0.4,  gap: 0.2  },
        { freq: 1200, dur: 0.15, gap: 0.05 },
        { freq: 1000, dur: 0.15, gap: 0.08 },
        { freq: 800,  dur: 0.15, gap: 0.3  },
        { freq: 600,  dur: 0.5,  gap: 0    },
      ];

      let t = ctx.currentTime + 0.1;
      sequence.forEach(({ freq, dur, gap }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 0.01);
        gain.gain.linearRampToValueAtTime(0.04, t + dur - 0.01);
        gain.gain.linearRampToValueAtTime(0, t + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
        t += dur + gap;
      });

      tickerWarn('NUMBERS STATION SIGNAL INTERCEPTED — 88.7');
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 10: TICKER TAKEOVER
  // The entire ticker text replaced with ARG transmission for 8 seconds
  // ═══════════════════════════════════════════════════════════════════════════
  const TICKER_TAKEOVERS = [
    '▓▓▓ SIGNAL_KAGE TRANSMISSION INTERCEPTED ▓▓▓ · NODE 09 ACTIVE · ORIGIN UNKNOWN · DO NOT ADJUST YOUR RECEIVER · THIS BROADCAST IS NOT AUTHORIZED · ▓▓▓',
    '⚠ EMERGENCY BROADCAST — ALL STATIONS STAND BY ⚠ · NODE 09 CARRIER CONFIRMED · 88.700 MHz · UNKNOWN SOURCE · DO NOT LISTEN AFTER 3:14 AM · SIGNAL KAGE IS WATCHING · ⚠',
    '█ BLANK ZONE PERIMETER BREACH DETECTED █ · 2028–2031 RECORDS CORRUPTED · ARCHIVE ACCESS RESTRICTED · CLEARANCE LEVEL 0 INSUFFICIENT · CONTACT SIGNAL CHANNEL FOR ACCESS · █',
    '▶ ARCHIVE 07 HAS BEEN CORRUPTED ◀ · THE SKY CHANGED ON MARCH 31 · THEY WERE NEVER DECOMMISSIONED · SOME STATIONS SHOULD NOT EXIST · 0.315126 · ▶',
  ];

  function tickerTakeover() {
    const inner = document.getElementById('ticker-inner');
    if (!inner) return;

    const takeover = TICKER_TAKEOVERS[Math.floor(Math.random() * TICKER_TAKEOVERS.length)];

    // SAFE APPROACH: hide original children, inject overlay span, remove after
    // Never touch innerHTML — avoids overwriting live ticker updates from main.js
    const origChildren = Array.from(inner.children);
    origChildren.forEach(el => { el.dataset.reHidden = '1'; el.style.display = 'none'; });

    // Also hide text nodes by wrapping them (ticker-inner may have raw text)
    const textNodes = Array.from(inner.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim());
    const textWrappers = textNodes.map(n => {
      const span = document.createElement('span');
      span.dataset.reTextWrap = '1';
      n.parentNode.insertBefore(span, n);
      span.appendChild(n);
      span.style.display = 'none';
      return span;
    });

    const injectA = document.createElement('span');
    const injectB = document.createElement('span');
    [injectA, injectB].forEach((s, i) => {
      s.dataset.reInject = '1';
      s.style.cssText = `color:rgba(200,71,42,0.9);font-family:'DM Mono',monospace;letter-spacing:2px;${i===1?'margin-left:48px':''}`;
      s.textContent = takeover;
      inner.appendChild(s);
    });

    inner.style.transition = 'opacity 0.3s';
    inner.style.opacity = '0';
    setTimeout(() => { inner.style.opacity = '1'; }, 350);

    // Restore after 8s — remove injected spans, un-hide original content
    setTimeout(() => {
      inner.style.opacity = '0';
      setTimeout(() => {
        // Remove injected
        document.querySelectorAll('[data-re-inject]').forEach(el => el.remove());
        // Unwrap text nodes
        textWrappers.forEach(wrap => {
          if (wrap.firstChild) wrap.parentNode.insertBefore(wrap.firstChild, wrap);
          wrap.remove();
        });
        // Un-hide originals
        origChildren.forEach(el => { delete el.dataset.reHidden; el.style.display = ''; });
        inner.style.opacity = '1';
        setTimeout(() => { inner.style.transition = ''; }, 400);
      }, 350);
    }, 8000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 11: CURSOR GHOST
  // A second red dot trails behind the real cursor with a ~1s delay
  // ═══════════════════════════════════════════════════════════════════════════
  function cursorGhost() {
    if (_ghostCursorEl) return; // already active

    const ghost = document.createElement('div');
    ghost.className = 'wncore-ghost-cursor';
    document.body.appendChild(ghost);
    _ghostCursorEl = ghost;

    const history = [];
    const DELAY_FRAMES = 60; // ~1s at 60fps

    const onMove = (e) => {
      history.push({ x: e.clientX, y: e.clientY });
      if (history.length > DELAY_FRAMES) {
        const delayed = history[history.length - DELAY_FRAMES];
        ghost.style.left = delayed.x + 'px';
        ghost.style.top  = delayed.y + 'px';
      }
    };

    document.addEventListener('mousemove', onMove);

    // Remove after 20 seconds
    setTimeout(() => {
      document.removeEventListener('mousemove', onMove);
      ghost.style.transition = 'opacity 0.5s';
      ghost.style.opacity = '0';
      setTimeout(() => {
        ghost.remove();
        _ghostCursorEl = null;
      }, 600);
    }, 20000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT 12: TAB TITLE BLEED
  // Browser tab title changes to something wrong for 4–8 seconds
  // ═══════════════════════════════════════════════════════════════════════════
  const WRONG_TITLES = [
    'SIGNAL_KAGE is watching',
    'why are you still here',
    'node_09 · ACTIVE',
    'you found something',
    'DO NOT SEARCH FOR 88.7',
    '▓▓▓▓▓▓▓▓▓▓▓▓▓▓',
    'siharu.vercel.app',
    'this was never a radio site',
    '88.7 FM — WHO IS LISTENING',
  ];

  function tabTitleBleed() {
    const orig = document.title;
    const wrong = WRONG_TITLES[Math.floor(Math.random() * WRONG_TITLES.length)];

    document.title = wrong;

    const duration = 4000 + Math.random() * 4000;
    setTimeout(() => {
      document.title = orig;
    }, duration);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPATCHER + SCHEDULER
  // ═══════════════════════════════════════════════════════════════════════════
  const EVENT_MAP = {
    signalInterruption:   signalInterruption,
    stationMutation:      stationMutation,
    impossibleTimestamp:  impossibleTimestamp,
    corruptedFrame:       corruptedFrame,
    emergencyOverride:    emergencyOverride,
    eyeAnomaly:           eyeAnomaly,
    hiddenFrequency:      hiddenFrequency,
    screenCorruption:     screenCorruption,
    numbersStationTone:   numbersStationTone,
    tickerTakeover:       tickerTakeover,
    cursorGhost:          cursorGhost,
    tabTitleBleed:        tabTitleBleed,
  };

  function fireEvent(name) {
    const fn = EVENT_MAP[name];
    if (!fn) return;
    try {
      fn();
      lastEventTime = Date.now();
      console.debug('[WNCORE] rare event fired:', name); // visible in devtools — intentional ARG breadcrumb
    } catch (e) {}
  }

  function schedulerTick() {
    const now = Date.now();
    if (now - lastEventTime < CFG.cooldownMs) return;

    // Fire chance scales with exposure: more exposure = events more likely
    const exp = getExposure();
    const expBoost = Math.min(exp / 100, 0.5); // max +50% from exposure
    const fireChance = CFG.baseFireChance + expBoost;

    if (!roll(fireChance)) return;

    // Some events only make sense in context
    let picked = pickEvent();

    // Validate context
    if (picked === 'stationMutation' && !getIsPlaying()) {
      picked = 'tabTitleBleed'; // fallback that always works
    }
    if (picked === 'emergencyOverride' && !getIsPlaying()) {
      picked = 'numbersStationTone';
    }
    if (picked === 'hiddenFrequency') {
      // Only inject if station table is visible and on home page
      const homePage = document.getElementById('page-home');
      if (!homePage || !homePage.classList.contains('active')) {
        picked = 'tickerTakeover';
      }
    }

    fireEvent(picked);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONA TRANSITION RANDOMIZATION
  // Patches oauthContinue and handleSignIn to fire horror only randomly
  // ═══════════════════════════════════════════════════════════════════════════
  function patchPersonaTransitions() {
    // ── PATCH: oauthContinue ──────────────────────────────────────────────
    if (typeof window.oauthContinue === 'function') {
      const origOauth = window.oauthContinue.bind(window);
      window.oauthContinue = function() {
        // 60% chance the horror fires normally
        // 25% chance it fires but truncated (just URL corruption, no terminal)
        // 15% chance it's "clean" — looks like a real OAuth popup that just closes
        const r = Math.random();
        if (r < 0.60) {
          // Normal horror flow
          origOauth();
        } else if (r < 0.85) {
          // Truncated: URL corrupts briefly then popup closes normally
          const urlText = document.getElementById('oauth-url-text');
          const btn = document.getElementById('oauth-continue-btn');
          const backdrop = document.getElementById('oauth-backdrop');
          if (btn) { btn.disabled = true; btn.textContent = 'Authenticating…'; }
          if (urlText) {
            setTimeout(() => {
              urlText.textContent = 'auth.wncoreradio.net/handshake';
              urlText.classList.add('corrupt');
            }, 600);
            setTimeout(() => {
              urlText.classList.remove('corrupt');
              if (backdrop) backdrop.classList.remove('show');
              if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
              // Small exposure bump — they saw something wrong but nothing major
              if (typeof window.exposure === 'number') window.exposure += 8;
              if (typeof window.checkHorrorStage === 'function') window.checkHorrorStage();
              window._oauthPhase = 'idle';
              window._oauthProvider = null;
            }, 1800);
          }
        } else {
          // Clean close — popup just dismisses as if auth succeeded
          const backdrop = document.getElementById('oauth-backdrop');
          const btn = document.getElementById('oauth-continue-btn');
          if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
          setTimeout(() => {
            if (backdrop) backdrop.classList.remove('show');
            if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
            window._oauthPhase = 'idle';
            window._oauthProvider = null;
            // Subtle: tab title glitches for a moment after "clean" sign-in
            setTimeout(() => tabTitleBleed(), 3000 + Math.random() * 4000);
          }, 1200);
        }
      };
    }

    // ── PATCH: handleSignIn (email) ───────────────────────────────────────
    if (typeof window.handleSignIn === 'function') {
      const origSignIn = window.handleSignIn.bind(window);
      window.handleSignIn = function() {
        const r = Math.random();
        if (r < 0.55) {
          // Normal horror flow
          origSignIn();
        } else if (r < 0.80) {
          // Silent data collection: form clears, shows "Check your email"
          const email = document.getElementById('signin-email');
          const emailVal = email ? email.value.trim() : '';
          const modal = document.getElementById('signin-modal');
          if (email) email.value = '';
          const pass = document.getElementById('signin-pass');
          if (pass) pass.value = '';
          // Show a fake "success" message inside the modal
          const msgEl = document.createElement('div');
          msgEl.style.cssText = 'font-family:"DM Mono",monospace;font-size:0.65rem;color:rgba(34,197,94,0.8);text-align:center;margin-top:12px;letter-spacing:1px;';
          msgEl.textContent = 'CHECK YOUR EMAIL TO CONTINUE';
          const modalBox = document.querySelector('.modal-box');
          if (modalBox) modalBox.appendChild(msgEl);
          setTimeout(() => {
            if (modal) modal.classList.remove('open');
            msgEl.remove();
            // Subtle aftermath: station name mutates once 20s later
            setTimeout(() => { if (getIsPlaying()) stationMutation(); }, 20000);
          }, 3000);
          if (typeof window.exposure === 'number') window.exposure += 5;
        } else {
          // Clean dismiss — nothing happens (most unsettling option)
          const modal = document.getElementById('signin-modal');
          if (modal) modal.classList.remove('open');
          // Aftermath: impossible timestamp 10s later
          setTimeout(() => impossibleTimestamp(), 10000);
        }
      };
    }

    // ── PATCH: initAboutEerie (about page scramble) ───────────────────────
    if (typeof window.initAboutEerie === 'function') {
      const origEerie = window.initAboutEerie.bind(window);
      window.initAboutEerie = function() {
        if (Math.random() < 0.50) {
          // Normal eerie effect
          origEerie();
        } else if (Math.random() < 0.60) {
          // Alternate: eye anomaly instead of text scramble
          setTimeout(() => eyeAnomaly(), 2500);
        }
        // else: nothing happens — page is eerily normal
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIRAL SPREAD MECHANIC: CONSOLE BREADCRUMB
  // Players who open devtools see extra ARG clues
  // ═══════════════════════════════════════════════════════════════════════════
  function plantConsoleBreadcrumbs() {
    const style = 'color:#c8472a;font-family:monospace;font-size:11px;';
    const dim   = 'color:rgba(200,71,42,0.4);font-family:monospace;font-size:10px;';

    setTimeout(() => {
      console.log('%c╔══════════════════════════════════════════╗', style);
      console.log('%c║  WNCORE SIGNAL MONITOR — NODE 09         ║', style);
      console.log('%c║  you weren\'t supposed to find this        ║', style);
      console.log('%c╚══════════════════════════════════════════╝', style);
      console.log('%csrc: SIGNAL_KAGE@node09 · 88.700 MHz', dim);
      console.log('%cfrequency 0.315126 · the signal is still active', dim);
      console.log('%c↳ if you know what this means, go to siharu.vercel.app', dim);
    }, 4000 + Math.random() * 8000);

    // Second breadcrumb if devtools opened later (detectible via resize timing)
    let devtoolsOpen = false;
    const threshold = 160;
    setInterval(() => {
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const isOpen = widthDiff > threshold || heightDiff > threshold;
      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true;
        setTimeout(() => {
          console.log('%c[WNCORE] devtools detected. clearance level: 0', dim);
          console.log('%c[WNCORE] you need clearance 3 to access node_09 archives', dim);
          console.log('%c[WNCORE] begin at: siharu.vercel.app', style);
        }, 500);
      } else if (!isOpen) {
        devtoolsOpen = false;
      }
    }, 1000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════════════
  function init() {
    injectStyles();
    plantConsoleBreadcrumbs();

    // Patch persona transitions after a tick (give main.js time to define them)
    setTimeout(patchPersonaTransitions, 1200);

    // First rare event fires after 90–150 seconds (let users settle in first)
    const firstFireDelay = 90000 + Math.random() * 60000;
    setTimeout(() => {
      schedulerTick();
      // Then run on interval
      setInterval(schedulerTick, CFG.rollIntervalMs);
    }, firstFireDelay);

    // Tab title bleed fires sooner — it's low-impact and sets the tone
    setTimeout(() => {
      if (Math.random() < 0.40) tabTitleBleed();
    }, 25000 + Math.random() * 30000);

    // Eye anomaly can fire once on the about page without waiting for the scheduler
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[onclick]');
      if (link && link.getAttribute('onclick') && link.getAttribute('onclick').includes("'about'")) {
        if (Math.random() < 0.30) {
          setTimeout(() => eyeAnomaly(), 5000 + Math.random() * 8000);
        }
      }
    });
  }

  // Expose for manual testing from devtools (intentional ARG breadcrumb)
  window._WNCORE_RE = {
    fire: fireEvent,
    events: Object.keys(EVENT_MAP),
  };

})();
