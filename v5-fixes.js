// WNCORE Radio — v5 Fixes
// Applies after all other scripts (loaded last with defer)
// Covers: audio error handling, smart resume, progressive corruption,
//         GDPR consent banner, PWA install prompt, chat escalation hook,
//         terminal character typewriter, signal status corruption glitch.

'use strict';

(function WNCORE_V5() {

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AUDIO ERROR HANDLERS
  // Severity: CRITICAL — without these, stream failures are silent
  // ─────────────────────────────────────────────────────────────────────────────
  function wireAudioErrorHandlers() {
    const audio = document.getElementById('audio');
    if (!audio) return;

    audio.addEventListener('error', () => {
      if (typeof window.isPlaying !== 'undefined') window.isPlaying = false;
      if (typeof window.setPlayIcon === 'function') window.setPlayIcon(false);
      if (typeof window.updateStatus === 'function') window.updateStatus('STREAM LOST');
      const track = document.getElementById('np-track');
      const meta  = document.getElementById('np-meta');
      if (track) track.textContent = '— signal lost —';
      if (meta)  meta.textContent  = 'Select the station again to reconnect';
      ['pb-eq', 'pb-fill', 'np-fill'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('playing');
      });
    });

    audio.addEventListener('stalled', () => {
      if (typeof window.updateStatus === 'function') window.updateStatus('BUFFERING…');
      const track = document.getElementById('np-track');
      if (track) track.textContent = '— reconnecting —';
    });

    audio.addEventListener('waiting', () => {
      if (typeof window.updateStatus === 'function') window.updateStatus('BUFFERING…');
    });

    audio.addEventListener('playing', () => {
      if (window.currentStation && typeof window.updateStatus === 'function') {
        window.updateStatus(window.currentStation.name || 'LIVE');
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SMART RESUME
  // On load, pre-populate the player with the last played station (no autoplay).
  // ─────────────────────────────────────────────────────────────────────────────
  function initSmartResume() {
    try {
      if (sessionStorage.getItem('wncore-resumed')) return;
      const h = JSON.parse(localStorage.getItem('wncore-history-v2') || '[]');
      if (!h.length) return;
      const last = h[0];
      sessionStorage.setItem('wncore-resumed', '1');
      const npName  = document.getElementById('np-name');
      const npMeta  = document.getElementById('np-meta');
      const npTrack = document.getElementById('np-track');
      if (npName)  npName.textContent  = last.name || 'Last station';
      if (npMeta)  npMeta.textContent  = last.meta || '';
      if (npTrack) npTrack.textContent = '— tap play to resume —';
      if (last && typeof last === 'object') window.currentStation = last;
    } catch(e) {}
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PROGRESSIVE CORRUPTION SYSTEM
  // Tracks visits in localStorage. Each threshold unlocks a new wrongness layer.
  // ─────────────────────────────────────────────────────────────────────────────
  function initProgressiveCorruption() {
    try {
      let visits = parseInt(localStorage.getItem('wncore-visits') || '0') + 1;
      localStorage.setItem('wncore-visits', String(visits));
      document.documentElement.dataset.corruptionLevel = '0';

      // Visit 3+: subtle flickering enabled via CSS data attribute
      if (visits >= 3) {
        document.documentElement.dataset.corruptionLevel = '1';
      }

      // Visit 5+: signal box reacts to cursor proximity
      if (visits >= 5) {
        document.documentElement.dataset.corruptionLevel = '2';
        const box = document.getElementById('signal-conn-box');
        if (box) {
          document.addEventListener('mousemove', (e) => {
            const r = box.getBoundingClientRect();
            const dist = Math.hypot(
              e.clientX - (r.left + r.width / 2),
              e.clientY - (r.top + r.height / 2)
            );
            if (dist < 200 && Math.random() > 0.95) {
              const statusEl = document.getElementById('signal-conn-status');
              if (statusEl) {
                const orig = statusEl.textContent;
                statusEl.textContent = 'SIGNAL RECOGNIZES YOU';
                statusEl.style.color = 'rgba(200,71,42,1)';
                setTimeout(() => {
                  statusEl.textContent = orig;
                  statusEl.style.color = '';
                }, 850);
              }
            }
          }, { passive: true });
        }
      }

      // Visit 8+: phantom log injection hook (fires if horror terminal is open)
      if (visits >= 8) {
        document.documentElement.dataset.corruptionLevel = '3';
        setInterval(() => {
          const terminal = document.getElementById('horror-terminal-body');
          if (!terminal || !terminal.offsetParent) return;
          if (Math.random() > 0.15) return;
          const ghost = document.createElement('div');
          ghost.style.cssText = 'opacity:0;transition:opacity 0.8s;color:rgba(200,71,42,0.35);font-size:11px;';
          const msgs = [
            '> orphaned packet received — origin: unknown',
            '> NODE_09 status: ACTIVE (expected: DECOMMISSIONED)',
            '> relay handshake — peer_id: SIGNAL_KAGE',
            '> memory leak detected at 0x88700000',
            '> wncore_monitor: unexpected authentication bypass',
          ];
          ghost.textContent = msgs[Math.floor(Math.random() * msgs.length)];
          terminal.appendChild(ghost);
          requestAnimationFrame(() => { ghost.style.opacity = '1'; });
          setTimeout(() => {
            ghost.style.opacity = '0';
            setTimeout(() => ghost.remove(), 900);
          }, 4000);
        }, 14000);
      }

      // Visit 12+: lower the exposure threshold — horror triggers faster
      if (visits >= 12) {
        window._corruptionBoost = 15;
      }
    } catch(e) {}
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SIGNAL STATUS TEXT CORRUPTION GLITCH
  // Occasional l33t/zalgo flicker on signal-conn-status during normal browsing
  // ─────────────────────────────────────────────────────────────────────────────
  function initSignalCorruptionGlitch() {
    function corruptText(str) {
      const subs = { 'o':'0','e':'3','a':'4','i':'1','s':'5','t':'7' };
      return str.split('').map(c =>
        Math.random() > 0.6 ? (subs[c.toLowerCase()] || c) : c
      ).join('');
    }
    setInterval(() => {
      const el = document.getElementById('signal-conn-status');
      if (!el || Math.random() > 0.08) return;
      const orig = el.textContent;
      el.textContent = corruptText(orig);
      setTimeout(() => { el.textContent = orig; }, 320);
    }, 12000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GDPR / COOKIE CONSENT BANNER
  // Minimal legal-compliant notice for localStorage usage
  // ─────────────────────────────────────────────────────────────────────────────
  function initCookieBanner() {
    try {
      if (localStorage.getItem('wncore-consent')) return;
    } catch(e) { return; }

    const style = document.createElement('style');
    style.textContent = `
      #wnc-cookie{position:fixed;bottom:0;left:0;right:0;z-index:99999;
        background:var(--surface,#fff);border-top:1px solid var(--border,#ddd);
        padding:12px 20px;display:flex;align-items:center;gap:16px;
        font-size:13px;color:var(--text,#1a1814);
        box-shadow:0 -4px 24px rgba(0,0,0,0.08);
        transform:translateY(100%);transition:transform 0.35s ease;flex-wrap:wrap;}
      #wnc-cookie.show{transform:translateY(0);}
      #wnc-cookie span{flex:1;min-width:200px;line-height:1.5;opacity:0.8;}
      #wnc-cookie a{color:var(--accent,#c8472a);text-decoration:underline;}
      #wnc-cookie-accept{background:var(--accent,#c8472a);color:#fff;border:none;
        padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;
        cursor:pointer;white-space:nowrap;font-family:inherit;}
      #wnc-cookie-accept:hover{opacity:0.88;}
    `;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.id = 'wnc-cookie';
    banner.innerHTML = `
      <span>We use local storage for your listening preferences and history.
        No advertising or tracking. <a href="legal.html#privacy">Privacy Policy</a></span>
      <button id="wnc-cookie-accept">Got it</button>
    `;
    document.body.appendChild(banner);

    setTimeout(() => banner.classList.add('show'), 2800);

    document.getElementById('wnc-cookie-accept').onclick = () => {
      try { localStorage.setItem('wncore-consent', '1'); } catch(e) {}
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 400);
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. PWA INSTALL PROMPT
  // Shows after user has started playing a station (engaged state)
  // ─────────────────────────────────────────────────────────────────────────────
  function initPWAPrompt() {
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      // Wait until user has actively played a station
      const checkEngaged = setInterval(() => {
        if (!window.isPlaying) return;
        clearInterval(checkEngaged);
        showPWABanner();
      }, 3000);
    });

    function showPWABanner() {
      try { if (localStorage.getItem('wncore-pwa-dismissed')) return; } catch(e) {}
      const style = document.createElement('style');
      style.textContent = `
        #wnc-pwa{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);
          z-index:9999;background:var(--surface,#fff);border:1px solid var(--border,#ddd);
          border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;
          box-shadow:0 8px 32px rgba(0,0,0,0.15);opacity:0;
          transition:opacity 0.3s,transform 0.3s;min-width:280px;max-width:360px;}
        #wnc-pwa.show{opacity:1;transform:translateX(-50%) translateY(0);}
        #wnc-pwa .pwa-icon{font-size:28px;flex-shrink:0;}
        #wnc-pwa .pwa-text strong{display:block;font-size:14px;font-weight:600;
          color:var(--text,#1a1814);margin-bottom:2px;}
        #wnc-pwa .pwa-text span{font-size:12px;opacity:0.6;color:var(--text,#1a1814);}
        #wnc-pwa-install{background:var(--accent,#c8472a);color:#fff;border:none;
          padding:7px 14px;border-radius:6px;font-size:12px;font-weight:600;
          cursor:pointer;white-space:nowrap;font-family:inherit;}
        #wnc-pwa-dismiss{background:none;border:none;font-size:18px;cursor:pointer;
          color:var(--text3,#999);padding:4px;line-height:1;}
      `;
      document.head.appendChild(style);

      const banner = document.createElement('div');
      banner.id = 'wnc-pwa';
      banner.innerHTML = `
        <div class="pwa-icon">📻</div>
        <div class="pwa-text">
          <strong>Add WNCORE to your home screen</strong>
          <span>Listen without opening a browser</span>
        </div>
        <button id="wnc-pwa-install">Install</button>
        <button id="wnc-pwa-dismiss">✕</button>
      `;
      document.body.appendChild(banner);
      requestAnimationFrame(() => banner.classList.add('show'));

      document.getElementById('wnc-pwa-install').onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        banner.remove();
        if (outcome === 'accepted') {
          try { localStorage.setItem('wncore-pwa-dismissed', '1'); } catch(e) {}
        }
      };
      document.getElementById('wnc-pwa-dismiss').onclick = () => {
        try { localStorage.setItem('wncore-pwa-dismissed', '1'); } catch(e) {}
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 400);
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. CHAT PERSONALITY ESCALATION HOOK
  // Patches the chat send function (defined in wncore-upgrades.js) to inject
  // turn count into the request payload so api/chat.js can adjust tone.
  // The api/chat.js must be updated separately to read the `turnCount` field.
  // ─────────────────────────────────────────────────────────────────────────────
  function patchChatEscalation() {
    // We intercept the fetch call to /api/chat by watching for the chat send button
    // The chat history is stored as window._wncChatHistory (set by wncore-upgrades.js)
    // This is a passive hook — no DOM surgery needed, chat.js reads turnCount from body
    const origFetch = window.fetch;
    window.fetch = function(url, opts) {
      if (typeof url === 'string' && url.includes('/api/chat') && opts && opts.body) {
        try {
          const body = JSON.parse(opts.body);
          if (body.messages && Array.isArray(body.messages)) {
            body.turnCount = body.messages.length;
            opts = { ...opts, body: JSON.stringify(body) };
          }
        } catch(e) {}
      }
      return origFetch.call(this, url, opts);
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. TERMINAL CHARACTER TYPEWRITER (upgrade from line-at-a-time)
  // Exposed globally as window.typeLineInto — used by horror terminal
  // ─────────────────────────────────────────────────────────────────────────────
  window.typeLineInto = function(container, html, speed) {
    speed = speed || 22;
    return new Promise(resolve => {
      const line = document.createElement('div');
      container.appendChild(line);
      const plain = html.replace(/<[^>]+>/g, '');
      let i = 0;
      const iv = setInterval(() => {
        line.textContent = plain.slice(0, i++);
        container.scrollTop = container.scrollHeight;
        if (i > plain.length) {
          clearInterval(iv);
          line.innerHTML = html || '&nbsp;';
          container.scrollTop = container.scrollHeight;
          resolve();
        }
      }, speed + Math.random() * 12);
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // INIT — fire everything after DOM is ready
  // ─────────────────────────────────────────────────────────────────────────────
  function boot() {
    wireAudioErrorHandlers();
    initSmartResume();
    initProgressiveCorruption();
    initSignalCorruptionGlitch();
    initCookieBanner();
    initPWAPrompt();
    patchChatEscalation();
    initAudioAnomalies();
    initTimeBasedEvents();
    initChatAgentIdentity();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. AUDIO ANOMALIES
  // Random silence injection while playing — 3% chance per check.
  // Uses gainNode from main.js shared context. Completely deniable — sounds
  // like a momentary stream dropout.
  // ─────────────────────────────────────────────────────────────────────────────
  function initAudioAnomalies() {
    setInterval(() => {
      if (!window.isPlaying) return;
      if (Math.random() > 0.03) return; // 3% chance per 8s = ~once every ~4 min
      const gn = window._sharedGainNode;
      const ctx = window._sharedAudioCtx;
      if (!gn || !ctx) return;
      try {
        const now = ctx.currentTime;
        const origGain = gn.gain.value;
        // Brief cut — 200-500ms silence
        const cutDur = 0.2 + Math.random() * 0.3;
        gn.gain.setValueAtTime(origGain, now);
        gn.gain.linearRampToValueAtTime(0, now + 0.04);
        gn.gain.setValueAtTime(0, now + 0.04 + cutDur);
        gn.gain.linearRampToValueAtTime(origGain, now + 0.04 + cutDur + 0.08);
      } catch(e) {}
    }, 8000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. TIME-BASED EVENTS
  // Fires specific ARG behaviors at particular clock times.
  // 03:14 UTC — the anomaly window (chosen for lore: Node 09 decommissioned 2016-03-12)
  // Also: every day at the hour mark, subtle signal status text glitch.
  // ─────────────────────────────────────────────────────────────────────────────
  function initTimeBasedEvents() {
    let _lastAnomalyDate = null;
    let _lastHourMark = -1;

    setInterval(() => {
      const now = new Date();
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();
      const dateStr = now.toISOString().slice(0, 10);

      // 03:14 UTC — Node 09 anomaly window. Once per calendar day.
      if (hour === 3 && minute === 14 && _lastAnomalyDate !== dateStr) {
        _lastAnomalyDate = dateStr;
        triggerAnomaly314();
      }

      // Top of every hour — brief signal status flicker
      if (minute === 0 && hour !== _lastHourMark) {
        _lastHourMark = hour;
        const el = document.getElementById('signal-conn-status');
        if (el && Math.random() > 0.4) {
          const orig = el.textContent;
          el.textContent = 'SIGNAL REALIGNING — STAND BY';
          el.style.color = 'rgba(200,71,42,0.9)';
          setTimeout(() => { el.textContent = orig; el.style.color = ''; }, 1200);
        }
      }
    }, 30000); // check every 30s — low overhead

    function triggerAnomaly314() {
      // Inject a ticker message
      if (typeof window.insertTickerAnomaly === 'function') {
        window.insertTickerAnomaly('NODE_09 HANDSHAKE DETECTED — 03:14 UTC');
      }
      // Signal status shows the anomaly
      const el = document.getElementById('signal-conn-status');
      if (el) {
        const orig = el.textContent;
        el.textContent = 'NODE 09 — SIGNAL ACTIVE';
        el.style.color = 'rgba(200,71,42,1)';
        setTimeout(() => { el.textContent = orig; el.style.color = ''; }, 4000);
      }
      // Body outline slow pulse — 3 beats
      let beats = 0;
      const pulse = setInterval(() => {
        document.body.style.outline = beats % 2 === 0
          ? '1px solid rgba(200,71,42,0.4)' : '';
        if (++beats >= 6) { clearInterval(pulse); document.body.style.outline = ''; }
      }, 600);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. CHAT AGENT IDENTITY (persistent across sessions)
  // Assigns a consistent agent name per user via localStorage.
  // Patches the chat header name element after widget is built.
  // ─────────────────────────────────────────────────────────────────────────────
  function initChatAgentIdentity() {
    const AGENTS = ['Mira K.', 'Soren A.', 'Yuna T.', 'Declan R.', 'Noa V.'];
    try {
      let agent = localStorage.getItem('wncore-agent');
      if (!agent) {
        agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
        localStorage.setItem('wncore-agent', agent);
      }
      window._wncChatAgent = agent;

      // Patch header name once widget DOM exists
      const patchHeader = () => {
        const nameEl = document.getElementById('wnc-chat-hname');
        if (nameEl && nameEl.textContent.trim() === 'WNCORE Support') {
          nameEl.textContent = agent;
        }
      };
      // Try immediately, then watch for widget creation
      patchHeader();
      const obs = new MutationObserver(patchHeader);
      obs.observe(document.body, { childList: true, subtree: true });
      // Stop observing after 30s — widget should be built by then
      setTimeout(() => obs.disconnect(), 30000);
    } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();