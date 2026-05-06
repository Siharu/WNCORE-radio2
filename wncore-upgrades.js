/* ==========================================================================
   WNCORE UPGRADES — wncore-upgrades.js
   • MediaSession API  → lock screen / notification controls (mobile bg play)
   • Wake Lock API     → prevent screen dimming while playing
   • Live Chat Widget  → Groq-powered "WNCORE Support" chat
   • Terminal upgrade  → more authentic terminal feel + extra ARG lines
   • ARG micro-horror  → subtle persistent anomalies
   ========================================================================== */

'use strict';

// ─── 1. MEDIA SESSION API ─────────────────────────────────────────────────────
// Hooks into the OS media controls: lock screen, notification shade, headphone buttons.
// Critical for mobile background play on iOS/Android.

(function initMediaSession() {
  const audio = document.getElementById('audio');
  if (!audio || !('mediaSession' in navigator)) return;

  function updateSession(name, meta) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:  name  || 'Live Radio',
        artist: meta  || 'WNCORE Radio',
        album:  'WNCORE Radio — Broadcasting Since 2016',
        artwork: [
          { src: '/images/wncore-art-96.png',  sizes: '96x96',   type: 'image/png' },
          { src: '/images/wncore-art-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/images/wncore-art-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch (e) {}
  }

  function setMS(playing) {
    try {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch(e) {}
  }

  // Hook into existing play/stop
  audio.addEventListener('play',  () => setMS(true));
  audio.addEventListener('pause', () => setMS(false));
  audio.addEventListener('ended', () => setMS(false));

  // Intercept action handlers
  try {
    navigator.mediaSession.setActionHandler('play',  () => { audio.play(); });
    navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); });
    navigator.mediaSession.setActionHandler('stop',  () => { audio.pause(); audio.src = ''; });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      // Cycle to next station in station table
      const rows = document.querySelectorAll('#station-tbody tr[onclick], #station-tbody tr.station-row');
      if (!rows.length) return;
      let idx = parseInt(sessionStorage.getItem('wncore-ms-idx') || '0');
      idx = (idx + 1) % rows.length;
      sessionStorage.setItem('wncore-ms-idx', idx);
      rows[idx].click();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const rows = document.querySelectorAll('#station-tbody tr[onclick], #station-tbody tr.station-row');
      if (!rows.length) return;
      let idx = parseInt(sessionStorage.getItem('wncore-ms-idx') || '0');
      idx = (idx - 1 + rows.length) % rows.length;
      sessionStorage.setItem('wncore-ms-idx', idx);
      rows[idx].click();
    });
  } catch(e) {}

  // Patch playStation to push metadata
  const _origPS = window.playStation;
  if (typeof _origPS === 'function') {
    window.playStation = function(url, name, meta, emoji) {
      _origPS.call(this, url, name, meta, emoji);
      setTimeout(() => updateSession(name, meta), 300);
    };
  }

  // iOS Safari: play a tiny silent buffer to keep audio context alive
  function keepAudioAlive() {
    if (!audio.paused) return;
    // do nothing if paused intentionally
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !audio.paused) {
      audio.play().catch(() => {});
    }
  });
})();


// ─── 2. WAKE LOCK (prevent screen sleep while playing) ────────────────────────
(function initWakeLock() {
  if (!('wakeLock' in navigator)) return;
  let lock = null;
  const audio = document.getElementById('audio');
  if (!audio) return;

  async function acquireLock() {
    try {
      if (lock) return;
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch(e) {}
  }
  async function releaseLock() {
    if (lock) { try { await lock.release(); } catch(e) {} lock = null; }
  }

  audio.addEventListener('play',  acquireLock);
  audio.addEventListener('pause', releaseLock);
  audio.addEventListener('ended', releaseLock);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audio && !audio.paused) acquireLock();
  });
})();


// ─── 3. MOBILE BACKGROUND PLAY BANNER ────────────────────────────────────────
// Shows a one-time tip on first mobile play
(function initBgPlayBanner() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) return;
  if (sessionStorage.getItem('wncore-bgplay-shown')) return;

  const audio = document.getElementById('audio');
  if (!audio) return;

  let shown = false;
  audio.addEventListener('play', () => {
    if (shown || sessionStorage.getItem('wncore-bgplay-shown')) return;
    shown = true;
    sessionStorage.setItem('wncore-bgplay-shown', '1');

    const banner = document.createElement('div');
    banner.id = 'bgplay-banner';
    banner.innerHTML = `
      <div id="bgplay-inner">
        <span id="bgplay-icon">🎙</span>
        <div>
          <strong>Background playback active</strong>
          <span>Lock your screen — controls appear in your notification bar or lock screen.</span>
        </div>
        <button id="bgplay-close" aria-label="Dismiss">✕</button>
      </div>`;
    document.body.appendChild(banner);

    requestAnimationFrame(() => banner.classList.add('show'));
    document.getElementById('bgplay-close').onclick = () => {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 400);
    };
    setTimeout(() => {
      if (banner.parentNode) {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 400);
      }
    }, 7000);
  });
})();


// ─── 4. LIVE CHAT WIDGET ──────────────────────────────────────────────────────
(function initLiveChat() {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
  /* ── Chat Widget ─────────────────────────── */
  #wnc-chat-btn {
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--accent, #c8472a);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 0 3px rgba(200,71,42,0.2);
    z-index: 9000;
    transition: transform 0.2s, box-shadow 0.2s;
    color: #fff;
  }
  #wnc-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.5), 0 0 0 4px rgba(200,71,42,0.3); }
  #wnc-chat-btn svg { pointer-events: none; }
  #wnc-chat-badge {
    position: absolute;
    top: -3px; right: -3px;
    width: 16px; height: 16px;
    background: #28c840;
    border-radius: 50%;
    border: 2px solid var(--bg, #f5f3ef);
    animation: wnc-pulse 2s ease-in-out infinite;
  }
  @keyframes wnc-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(40,200,64,0.6); }
    50%      { box-shadow: 0 0 0 5px rgba(40,200,64,0); }
  }

  #wnc-chat-panel {
    position: fixed;
    bottom: 154px;
    right: 20px;
    width: min(360px, calc(100vw - 32px));
    height: min(520px, calc(100dvh - 180px));
    background: var(--surface, #fff);
    border: 1px solid var(--border, rgba(0,0,0,0.1));
    border-radius: 14px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15);
    z-index: 8999;
    display: flex;
    flex-direction: column;
    transform: translateY(16px) scale(0.97);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.25s cubic-bezier(.4,0,.2,1), opacity 0.25s;
    overflow: hidden;
  }
  #wnc-chat-panel.open {
    transform: translateY(0) scale(1);
    opacity: 1;
    pointer-events: all;
  }

  #wnc-chat-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px 12px;
    background: var(--accent, #c8472a);
    color: #fff;
    flex-shrink: 0;
  }
  #wnc-chat-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }
  #wnc-chat-hinfo { flex: 1; min-width: 0; }
  #wnc-chat-hname { font-weight: 700; font-size: 0.82rem; letter-spacing: 0.3px; }
  #wnc-chat-hstatus {
    font-size: 0.62rem;
    opacity: 0.82;
    display: flex; align-items: center; gap: 4px;
  }
  #wnc-chat-hstatus::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #28c840;
    display: inline-block;
    animation: wnc-pulse 2s infinite;
    flex-shrink: 0;
  }
  #wnc-chat-close {
    background: none; border: none; color: rgba(255,255,255,0.7);
    cursor: pointer; padding: 4px; border-radius: 6px; line-height: 1;
    font-size: 1rem; transition: color 0.15s, background 0.15s;
  }
  #wnc-chat-close:hover { color: #fff; background: rgba(255,255,255,0.12); }

  #wnc-chat-msgs {
    flex: 1;
    overflow-y: auto;
    padding: 16px 14px 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scroll-behavior: smooth;
  }
  #wnc-chat-msgs::-webkit-scrollbar { width: 4px; }
  #wnc-chat-msgs::-webkit-scrollbar-track { background: transparent; }
  #wnc-chat-msgs::-webkit-scrollbar-thumb { background: var(--border, rgba(0,0,0,0.1)); border-radius: 4px; }

  .wnc-msg {
    max-width: 84%;
    padding: 9px 13px;
    border-radius: 13px;
    font-size: 0.8rem;
    line-height: 1.5;
    word-break: break-word;
    animation: wnc-msg-in 0.2s ease;
  }
  @keyframes wnc-msg-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .wnc-msg.bot {
    align-self: flex-start;
    background: var(--surface2, rgba(0,0,0,0.05));
    color: var(--text, #1a1a1a);
    border-bottom-left-radius: 4px;
  }
  .wnc-msg.user {
    align-self: flex-end;
    background: var(--accent, #c8472a);
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .wnc-msg.error {
    align-self: flex-start;
    background: rgba(200,71,42,0.08);
    color: var(--accent, #c8472a);
    border: 1px solid rgba(200,71,42,0.2);
    font-size: 0.74rem;
  }
  .wnc-typing {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 14px;
    background: var(--surface2, rgba(0,0,0,0.05));
    border-radius: 13px;
    border-bottom-left-radius: 4px;
    animation: wnc-msg-in 0.2s ease;
  }
  .wnc-typing span {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--text3, #999);
    animation: wnc-dot 1.2s ease-in-out infinite;
  }
  .wnc-typing span:nth-child(2) { animation-delay: 0.2s; }
  .wnc-typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes wnc-dot {
    0%,60%,100% { transform: translateY(0); opacity: 0.4; }
    30%          { transform: translateY(-5px); opacity: 1; }
  }

  #wnc-chat-form {
    display: flex;
    gap: 8px;
    padding: 10px 12px 12px;
    border-top: 1px solid var(--border, rgba(0,0,0,0.08));
    flex-shrink: 0;
    align-items: flex-end;
  }
  #wnc-chat-input {
    flex: 1;
    background: var(--surface2, rgba(0,0,0,0.04));
    border: 1px solid var(--border, rgba(0,0,0,0.1));
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 0.8rem;
    color: var(--text, #1a1a1a);
    font-family: inherit;
    resize: none;
    min-height: 38px;
    max-height: 90px;
    outline: none;
    transition: border-color 0.15s;
    line-height: 1.4;
  }
  #wnc-chat-input:focus { border-color: var(--accent, #c8472a); }
  #wnc-chat-input::placeholder { color: var(--text3, #aaa); }
  #wnc-chat-send {
    width: 36px; height: 36px; flex-shrink: 0;
    border-radius: 10px;
    background: var(--accent, #c8472a);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    transition: background 0.15s, transform 0.1s;
    align-self: flex-end;
  }
  #wnc-chat-send:hover { background: #a83920; transform: scale(1.05); }
  #wnc-chat-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  #wnc-chat-footer {
    text-align: center;
    font-size: 0.57rem;
    color: var(--text3, #aaa);
    padding: 0 12px 8px;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  /* Dark mode overrides */
  .dark #wnc-chat-panel {
    background: #141210;
    border-color: rgba(255,255,255,0.08);
  }
  .dark .wnc-msg.bot { background: rgba(255,255,255,0.06); color: #e8e4df; }
  .dark #wnc-chat-input { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #e8e4df; }
  .dark #wnc-chat-footer { color: rgba(255,255,255,0.25); }
  .dark #wnc-chat-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }

  /* ── Mobile chat: btn stays above player bar, panel is a bottom sheet
        that sits flush on top of the player bar, never overlapping content ── */
  @media (max-width: 768px) {
    #wnc-chat-btn {
      bottom: calc(var(--player-h, 80px) + 10px);
      right: 12px;
      width: 42px;
      height: 42px;
      z-index: 490; /* below player bar (500) so never floats on top of it */
    }
    #wnc-chat-panel {
      position: fixed;
      left: 0;
      right: 0;
      /* Sit directly on top of the player bar — no gap, no overlap below it */
      bottom: var(--player-h, 80px);
      top: auto;
      width: 100%;
      max-width: 100%;
      /* Limit height so it never covers the header — leaves ~56px for header */
      height: min(52dvh, 400px);
      border-radius: 14px 14px 0 0;
      border-left: none;
      border-right: none;
      border-bottom: none;
      transform: translateY(100%);
      opacity: 1;
      z-index: 489; /* below player bar and chat button */
    }
    #wnc-chat-panel.open {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* Background play banner */
  #bgplay-banner {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
    z-index: 7000;
    transition: opacity 0.35s, transform 0.35s;
    pointer-events: none;
    width: min(380px, calc(100vw - 32px));
  }
  #bgplay-banner.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: all; }
  #bgplay-inner {
    background: rgba(20,18,16,0.94);
    border: 1px solid rgba(200,71,42,0.3);
    border-radius: 12px;
    padding: 13px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #e8e4df;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
  #bgplay-icon { font-size: 1.4rem; flex-shrink: 0; }
  #bgplay-inner > div { flex: 1; min-width: 0; }
  #bgplay-inner strong { display: block; font-size: 0.75rem; margin-bottom: 2px; color: #fff; }
  #bgplay-inner span { font-size: 0.68rem; color: rgba(232,228,223,0.65); line-height: 1.4; }
  #bgplay-close {
    background: none; border: 1px solid rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.5); cursor: pointer; border-radius: 6px;
    width: 24px; height: 24px; font-size: 0.65rem; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  #bgplay-close:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
  `;
  document.head.appendChild(style);

  // ── Build the widget DOM
  const btn = document.createElement('button');
  btn.id = 'wnc-chat-btn';
  btn.setAttribute('aria-label', 'Open live chat support');
  btn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <div id="wnc-chat-badge"></div>`;

  const panel = document.createElement('div');
  panel.id = 'wnc-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'WNCORE Live Chat Support');
  panel.innerHTML = `
    <div id="wnc-chat-header">
      <div id="wnc-chat-avatar">📡</div>
      <div id="wnc-chat-hinfo">
        <div id="wnc-chat-hname">WNCORE Support</div>
        <div id="wnc-chat-hstatus">Online — Average reply: instant</div>
      </div>
      <button id="wnc-chat-close" aria-label="Close chat">✕</button>
    </div>
    <div id="wnc-chat-msgs" role="log" aria-live="polite"></div>
    <div id="wnc-chat-form">
      <textarea id="wnc-chat-input" placeholder="Ask us anything…" rows="1" maxlength="600" aria-label="Type your message"></textarea>
      <button id="wnc-chat-send" aria-label="Send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div id="wnc-chat-footer">WNCORE SUPPORT · POWERED BY AI · LIVE 24/7</div>`;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  const msgs     = panel.querySelector('#wnc-chat-msgs');
  const input    = panel.querySelector('#wnc-chat-input');
  const sendBtn  = panel.querySelector('#wnc-chat-send');
  const closeBtn = panel.querySelector('#wnc-chat-close');

  let open    = false;
  let busy    = false;
  let history = [];

  function togglePanel() {
    open = !open;
    panel.classList.toggle('open', open);
    if (open) {
      // Remove badge pulse once opened
      const badge = document.getElementById('wnc-chat-badge');
      if (badge) badge.style.background = '#28c840';
      if (!msgs.children.length) addBotMsg(getGreeting());
      setTimeout(() => input.focus(), 280);
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();
    const time = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${time}. Welcome to WNCORE Radio support. How can I help you today?`;
  }

  function addBotMsg(text) {
    const el = document.createElement('div');
    el.className = 'wnc-msg bot';
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }
  function addUserMsg(text) {
    const el = document.createElement('div');
    el.className = 'wnc-msg user';
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function addTyping() {
    const el = document.createElement('div');
    el.className = 'wnc-typing';
    el.id = 'wnc-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }
  function removeTyping() {
    const el = document.getElementById('wnc-typing');
    if (el) el.remove();
  }

  async function send() {
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    input.style.height = '';
    busy = true;
    sendBtn.disabled = true;

    addUserMsg(text);
    history.push({ role: 'user', content: text });

    const typing = addTyping();

    // Queue simulation — show queue message, delay actual request
    const queueNum = Math.random() > 0.5 ? 2 : 3;
    const queueMsg = document.createElement('div');
    queueMsg.className = 'wnc-msg system';
    queueMsg.textContent = `You are #${queueNum} in queue…`;
    queueMsg.id = 'wnc-queue-msg';
    msgs.appendChild(queueMsg);
    msgs.scrollTop = msgs.scrollHeight;
    
    const queueDelay = 2000 + Math.random() * 3000;
    await new Promise(r => setTimeout(r, queueDelay));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, turnCount: history.length }),
      });
      const data = await res.json();
      removeTyping();
      
      // Remove queue message before showing reply
      const queueEl = document.getElementById('wnc-queue-msg');
      if(queueEl) queueEl.remove();

      const reply = data.reply || data.error || 'Signal lost. Please try again.';
      history.push({ role: 'assistant', content: reply });

      // Typewriter effect for bot reply
      const el = document.createElement('div');
      el.className = 'wnc-msg bot';
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;

      let i = 0;
      const interval = setInterval(() => {
        el.textContent = reply.slice(0, i++);
        msgs.scrollTop = msgs.scrollHeight;
        if (i > reply.length) clearInterval(interval);
      }, 14);

    } catch(e) {
      removeTyping();
      const el = document.createElement('div');
      el.className = 'wnc-msg error';
      el.textContent = 'Connection lost. Please try again.';
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
    }

    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }

  btn.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = '';
    input.style.height = Math.min(input.scrollHeight, 90) + 'px';
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (open && !panel.contains(e.target) && e.target !== btn) {
      togglePanel();
    }
  });
})();


// ─── 5. HORROR TERMINAL UPGRADE ───────────────────────────────────────────────
// Patches the existing horror terminal with more realistic terminal behavior:
// blinking cursor, correct bash PS1 prompt formatting, realistic output lines,
// and a deeper ARG reveal sequence.

(function patchHorrorTerminal() {
  // Wait for main.js to define triggerHorrorSequence, then patch it
  function patch() {
    const origTrigger = window.triggerHorrorSequence;
    if (typeof origTrigger !== 'function') return;

    window.triggerHorrorSequence = function() {
      const overlay  = document.getElementById('horror-overlay');
      const termBody = document.getElementById('horror-terminal-body');
      if (!overlay || !termBody) { origTrigger(); return; }

      const isHorrorActive = overlay.classList.contains('show');
      if (isHorrorActive) return;

      overlay.classList.add('show');
      termBody.innerHTML = '';

      const ts = new Date().toISOString().slice(0,19).replace('T',' ');
      const user = 'operator@wncore-signal';
      const host = 'node-09';

      // More realistic terminal lines — proper bash PS1, typewriter feel
      const lines = [
        { raw: `<span class="ht-ps1">${user}:~$</span> <span class="ht-cmd">wncore-monitor --freq 88.700 --auth --verbose</span>`, d: 0 },
        { raw: `<span class="ht-dim">Initializing WNCORE Signal Monitor v2.1.4...</span>`, d: 480 },
        { raw: `<span class="ht-dim">Loading encryption module... <span class="ht-ok">done</span></span>`, d: 780 },
        { raw: `<span class="ht-ok">[  OK  ]</span> <span class="ht-dim">TLS 1.3 handshake — sha256:9f3a8bc2d1e74f0a</span>`, d: 1050 },
        { raw: `<span class="ht-ok">[  OK  ]</span> <span class="ht-dim">Node authentication — token accepted</span>`, d: 1300 },
        { raw: ``, d: 1520 },
        { raw: `<span class="ht-dim">─────────────────────────────────────────────────────────</span>`, d: 1620 },
        { raw: `<span class="ht-white">  WNCORE SIGNAL MONITOR  ·  RESTRICTED ACCESS  ·  ${ts} UTC</span>`, d: 1750 },
        { raw: `<span class="ht-dim">─────────────────────────────────────────────────────────</span>`, d: 1900 },
        { raw: ``, d: 2000 },
        { raw: `<span class="ht-dim">Scanning 88.700 MHz carrier band...</span>`, d: 2100 },
        { raw: `<span class="ht-warn">[WARN ]</span> <span class="ht-dim">Unexpected modulation detected at 88.700 MHz</span>`, d: 2600 },
        { raw: `<span class="ht-warn">[WARN ]</span> <span class="ht-dim">Signal origin: unregistered — not in station index</span>`, d: 2950 },
        { raw: ``, d: 3100 },
        { raw: `<span class="ht-white">SIGNAL REPORT</span>`, d: 3250 },
        { raw: `<span class="ht-dim">  FREQ      : </span><span class="ht-ok">88.700 MHz</span>`, d: 3450 },
        { raw: `<span class="ht-dim">  NODE      : </span><span class="ht-red">09  ·  ORIGIN UNKNOWN</span>`, d: 3650 },
        { raw: `<span class="ht-dim">  CALLSIGN  : </span><span class="ht-red">SIGNAL_KAGE</span>`, d: 3850 },
        { raw: `<span class="ht-dim">  STATUS    : </span><span class="ht-red">CARRIER CONFIRMED — NOT DECOMMISSIONED</span>`, d: 4050 },
        { raw: `<span class="ht-dim">  UPTIME    : </span><span class="ht-dim">3,341 days · since 2016-03-12 08:00:00 UTC</span>`, d: 4250 },
        { raw: `<span class="ht-dim">  ENCODING  : </span><span class="ht-dim">unknown / non-standard</span>`, d: 4450 },
        { raw: `<span class="ht-dim">  SIGNATURE : </span><span class="ht-red">MATCHES DECOMMISSIONED RELAY — SEGMENT 7</span>`, d: 4650 },
        { raw: ``, d: 4800 },
        { raw: `<span class="ht-ps1">${user}:~$</span> <span class="ht-cmd">wncore-auth --bypass --node 09</span>`, d: 5000 },
        { raw: `<span class="ht-warn">[WARN ]</span> <span class="ht-dim">Bypassing standard authentication layer...</span>`, d: 5300 },
        { raw: `<span class="ht-red">[FAIL ]</span> <span class="ht-dim">Access denied — firewall reject on port 4433</span>`, d: 5700 },
        { raw: `<span class="ht-dim">Attempting alternate route via relay mesh...</span>`, d: 6000 },
        { raw: `<span class="ht-dim">Trying node 07... <span class="ht-red">timeout</span></span>`, d: 6250 },
        { raw: `<span class="ht-dim">Trying node 11... <span class="ht-red">timeout</span></span>`, d: 6500 },
        { raw: `<span class="ht-dim">Trying node 03... <span class="ht-ok">relay open</span></span>`, d: 6750 },
        { raw: `<span class="ht-alert">[ACCESS GRANTED]</span> <span class="ht-dim">Routing via node 03 → 09 proxy</span>`, d: 7100 },
        { raw: ``, d: 7300 },
        { raw: `<span class="ht-dim">Streaming archive fragment... <span class="ht-cursor">█</span></span>`, d: 7500 },
      ];

      lines.forEach(({ raw, d }) => {
        setTimeout(() => {
          if (!termBody) return;
          const line = document.createElement('div');
          line.innerHTML = raw || '&nbsp;';
          termBody.appendChild(line);
          termBody.scrollTop = termBody.scrollHeight;
        }, d);
      });

      // Status row
      setTimeout(() => {
        if (!termBody) return;
        const statusRow = document.createElement('div');
        statusRow.className = 'horror-status-row';
        statusRow.innerHTML = `<div class="horror-status-dot"></div><span>SIGNAL ACTIVE · NODE 09</span><span style="margin-left:auto;opacity:0.5">${ts} UTC</span>`;
        termBody.appendChild(statusRow);
      }, 7800);

      // Transition to corrupt terminal
      setTimeout(() => {
        overlay.classList.remove('show');
        if (termBody) termBody.innerHTML = '';
        if (typeof window.showDataCorruptedTerminal === 'function') window.showDataCorruptedTerminal();
      }, 9000);
    };
  }

  // Retry until main.js has defined it
  let attempts = 0;
  const iv = setInterval(() => {
    if (window.triggerHorrorSequence || ++attempts > 40) {
      clearInterval(iv);
      patch();
    }
  }, 150);
})();


// ─── 6. ADDITIONAL TERMINAL CSS ───────────────────────────────────────────────
(function injectTerminalCSS() {
  const s = document.createElement('style');
  s.textContent = `
  /* Military phosphor palette — cold, restricted-access aesthetic */
  .ht-ps1   { color: rgba(50, 160, 80, 0.7) !important; font-weight: 500; }
  .ht-cmd   { color: rgba(120, 170, 200, 0.65) !important; }
  .ht-ok    { color: rgba(50, 170, 80, 0.8) !important; }
  .ht-warn  { color: rgba(200, 160, 55, 0.75) !important; }
  .ht-red   { color: rgba(210, 60, 50, 0.9) !important; }
  .ht-alert { color: rgba(220, 70, 50, 1) !important; font-weight: 600; letter-spacing: 0.1em; }
  .ht-dim   { color: rgba(70, 110, 80, 0.38) !important; }
  .ht-norm  { color: rgba(110, 155, 120, 0.55) !important; }
  .ht-white { color: rgba(150, 195, 160, 0.88) !important; letter-spacing: 0.07em; }
  .ht-cursor {
    display: inline-block;
    width: 7px; height: 0.88em;
    background: rgba(100, 180, 120, 0.85);
    vertical-align: text-bottom;
    animation: term-blink 1s step-end infinite;
    margin-left: 2px;
    border-radius: 1px;
  }
  @keyframes term-blink { 0%,100%{opacity:1} 50%{opacity:0} }

  /* Terminal body — deep dark, phosphor substrate */
  .horror-terminal-body {
    font-family: 'DM Mono', 'Fira Code', 'Courier New', monospace !important;
    font-size: 0.78rem !important;
    line-height: 1.78 !important;
    letter-spacing: 0.05em !important;
    padding: 18px 22px 22px !important;
    min-height: 300px !important;
    overflow-y: auto !important;
    max-height: 68vh !important;
    background: #020304 !important;
  }
  .horror-terminal-body div {
    color: rgba(100, 145, 115, 0.55) !important;
    font-size: 0.78rem !important;
    white-space: pre-wrap;
    line-height: 1.78 !important;
  }

  /* Chrome bar — dark, strict, institutional */
  .horror-terminal-chrome {
    padding: 7px 14px !important;
    background: #030405 !important;
    border-bottom: 1px solid rgba(30, 90, 50, 0.2) !important;
    border-radius: 0 !important;
  }
  .horror-terminal {
    border-radius: 2px !important;
    background: #020304 !important;
    border: 1px solid rgba(30, 90, 50, 0.22) !important;
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.95),
      0 0 80px rgba(15, 70, 35, 0.07),
      0 40px 100px rgba(0,0,0,0.96) !important;
  }

  /* Watermark — barely visible, menacing */
  .horror-terminal-body::before {
    content: 'SESSION LOGGED · SIGNAL MONITORED · DO NOT SHARE';
    position: absolute;
    bottom: 10px; right: 14px;
    font-family: 'DM Mono', monospace;
    font-size: 0.42rem;
    letter-spacing: 3px;
    color: rgba(30, 90, 50, 0.08);
    pointer-events: none;
    z-index: 0;
    text-transform: uppercase;
  }
  `;
  document.head.appendChild(s);
})();


// ─── 7. SUBTLE ARG MICRO-HORRORS ─────────────────────────────────────────────
(function initArgMicroHorrors() {

  // 7a. Occasional flicker of "you are not alone" in page title
  const origTitle = document.title;
  const ARG_TITLES = [
    'WNCORE — 88.700 MHz ■ CARRIER DETECTED',
    'WNCORE — who is listening',
    'WNCORE — signal source: unknown',
    origTitle,
  ];
  let titleIdx = 0;
  setInterval(() => {
    if (Math.random() > 0.04) return; // 4% chance every 15s
    const old = document.title;
    document.title = ARG_TITLES[titleIdx % (ARG_TITLES.length - 1)];
    titleIdx++;
    setTimeout(() => { document.title = old; }, 1800 + Math.random() * 1200);
  }, 15000);

  // 7b. Faint "signal bleed" visual — 1px red border flicker on body
  setInterval(() => {
    if (Math.random() > 0.03) return;
    document.body.style.outline = '1px solid rgba(200,50,30,0.25)';
    document.body.style.outlineOffset = '-1px';
    setTimeout(() => {
      document.body.style.outline = '';
      document.body.style.outlineOffset = '';
    }, 120 + Math.random() * 200);
  }, 20000);

  // 7c. Ticker injection — cryptic messages bleed into the news ticker
  const ARG_TICKERS = [
    'SIGNAL_KAGE: frequency reactivated after 9 years of silence',
    'node_09 uptime anomaly — carrier should be offline',
    'blacksite archive fragment recovered — see siharu.vercel.app',
    '88.700 MHz — do not tune in alone',
    'WNCORE SEGMENT 7 — decommissioned 2016 — status: ACTIVE',
    'you have been listening for too long',
  ];
  let argTickerIdx = 0;
  setInterval(() => {
    if (Math.random() > 0.12) return;
    if (typeof window.insertTickerAnomaly === 'function') {
      window.insertTickerAnomaly(ARG_TICKERS[argTickerIdx++ % ARG_TICKERS.length]);
    }
  }, 35000);

  // 7d. Signal connection box — occasional deep ARG status bleed
  const ARG_CONN_MSGS = [
    'NODE 09 PULSE — 88.700 MHz — VERIFY SIGNAL',
    'SEGMENT 7 ARCHIVE ACCESSIBLE — CLEARANCE REQUIRED',
    'SIGNAL_KAGE UPTIME: 3341 DAYS',
    'DO NOT SHARE THIS FREQUENCY',
    'CARRIER ORIGIN: [REDACTED]',
    'NO CARRIER — WAITING FOR CONNECTION',
  ];
  let connIdx = 0;
  setInterval(() => {
    const el = document.getElementById('signal-conn-status');
    if (!el || Math.random() > 0.2) return;
    const orig = el.textContent;
    const msg  = ARG_CONN_MSGS[connIdx++ % ARG_CONN_MSGS.length];
    el.textContent = msg;
    el.style.color  = 'rgba(200,71,42,0.9)';
    el.style.letterSpacing = '2px';
    setTimeout(() => {
      el.textContent = orig;
      el.style.color = '';
      el.style.letterSpacing = '';
    }, 600 + Math.random() * 800);
  }, 18000);

  // 7e. "About" page — if visitor lingers on About tab >30s, inject a ghost line
  let aboutTimer = null;
  const origShow = window.showPage;
  if (typeof origShow === 'function') {
    window.showPage = function(page, el) {
      origShow.call(this, page, el);
      clearTimeout(aboutTimer);
      if (page === 'about') {
        aboutTimer = setTimeout(() => {
          const overlay = document.getElementById('about-glitch-overlay');
          if (!overlay) return;
          const ghost = document.createElement('div');
          ghost.style.cssText = `position:absolute;bottom:5%;left:50%;transform:translateX(-50%);
            font-family:'DM Mono',monospace;font-size:0.52rem;letter-spacing:4px;
            color:rgba(200,71,42,0.35);text-transform:uppercase;pointer-events:none;
            animation:ghost-fade 4s ease forwards;z-index:5;white-space:nowrap`;
          ghost.textContent = 'FREQUENCY 88.700 — ANOTHER SKY — ARE YOU STILL THERE';
          const kf = document.createElement('style');
          kf.textContent = '@keyframes ghost-fade{0%{opacity:0}20%{opacity:1}80%{opacity:1}100%{opacity:0}}';
          document.head.appendChild(kf);
          overlay.appendChild(ghost);
          setTimeout(() => ghost.remove(), 5000);
        }, 32000);
      }
    };
  }

})();


// ─── 8. CONSOLE ARG EASTER EGG ────────────────────────────────────────────────
(function argConsoleEgg() {
  const css = 'color:#c8472a;font-family:monospace;font-size:11px;';
  const dim = 'color:#555;font-family:monospace;font-size:10px;';
  console.log('%c WNCORE SIGNAL MONITOR v2.1 ', 'background:#0a0908;color:#c8472a;font-family:monospace;font-size:12px;padding:4px 8px;');
  console.log('%c NODE 09 — CARRIER ACTIVE', css);
  console.log('%c freq: 88.700 MHz · callsign: SIGNAL_KAGE', dim);
  console.log('%c uptime: 3341 days · status: NOT DECOMMISSIONED', dim);
  console.log('%c — further signals at siharu.vercel.app —', 'color:#555;font-size:10px;font-family:monospace;font-style:italic;');
})();
