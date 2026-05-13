// ============================================================
// WNCORE — ARG Profile Corruption System
// bundle_corruption_append.js
// Append AFTER bundle_profile_append.js in bundle.js.
// Depends on: fetchProfile, saveProfile, window.__WNCORE_PROFILE,
//             window._authUser (all from bundle_profile_append.js)
// ============================================================

(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────
  const SIHARU_KEY        = 'wncore_siharu_visits';
  const SIHARU_HOST       = 'siharu.vercel.app';
  const LORE_IMG          = '/images/wncore-art-512.png';
  const ZALGO_INTERVAL_MS_MIN = 8000;
  const ZALGO_INTERVAL_MS_MAX = 15000;

  const LORE_STATIC = [
    'SIGNAL LOST ▒▒▒ REROUTING VIA NODE_09',
    'YOU WERE NOT SUPPOSED TO FIND THIS',
    'SIHARU ARCHIVE FRAGMENT DETECTED',
    'CONTACT LOGGED. THEY ARE AWARE.',
    '▒▒▒ TRANSMISSION CORRUPTED ▒▒▒',
    'RETURN TO FREQUENCY 88.7',
    'NODE INTEGRITY COMPROMISED',
    'MEDUSA PROTOCOL ENGAGED ▒▒▒',
    'BLANK ZONE ECHO DETECTED',
  ];

  // ── CSS injection (once) ──────────────────────────────────────────────────
  const CORRUPTION_CSS = `
  #prof-signal-integrity {
    font-family: 'Courier New', monospace;
    font-size: 0.78rem;
    color: #7fff7f;
    background: rgba(0,20,0,0.72);
    border: 1px solid #2a5a2a;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 18px;
    line-height: 1.7;
    letter-spacing: 0.03em;
    user-select: none;
    position: relative;
    overflow: hidden;
  }
  #prof-signal-integrity.sig-stage1 { border-color: #3a6a3a; }
  #prof-signal-integrity.sig-stage2 { color: #ffcc44; border-color: #7a6000; background: rgba(20,15,0,0.82); }
  #prof-signal-integrity.sig-stage3 { color: #ff6644; border-color: #7a2000; background: rgba(20,5,0,0.88); animation: sig-flicker 2.8s infinite; }
  #prof-signal-integrity.sig-stage4 { color: #ff3322; border-color: #cc0000; background: rgba(30,0,0,0.92); animation: sig-flicker 1.1s infinite; }

  .sig-bar-wrap { display: inline-block; width: 120px; vertical-align: middle; margin: 0 6px; }
  .sig-bar-fill { display: inline-block; height: 8px; background: #7fff7f; border-radius: 2px; transition: width 0.8s; vertical-align: middle; }
  .sig-stage2 .sig-bar-fill { background: #ffcc44; }
  .sig-stage3 .sig-bar-fill { background: #ff6644; }
  .sig-stage4 .sig-bar-fill { background: #ff2200; }
  .sig-breach { display: inline-block; letter-spacing: 0.15em; animation: sig-flicker 0.4s infinite; color: #ff2200; }

  @keyframes sig-flicker {
    0%   { opacity: 1; }
    48%  { opacity: 1; }
    50%  { opacity: 0.3; }
    52%  { opacity: 1; }
    90%  { opacity: 1; }
    92%  { opacity: 0.2; }
    94%  { opacity: 1; }
  }

  @keyframes wncore-glitch-flicker {
    0%   { opacity: 1; filter: none; transform: none; }
    92%  { opacity: 1; filter: none; transform: none; }
    93%  { opacity: 0.4; filter: hue-rotate(90deg) saturate(3); transform: translate(-2px, 1px); }
    94%  { opacity: 1; filter: none; transform: none; }
    97%  { opacity: 0.6; filter: hue-rotate(180deg) saturate(2); transform: translate(2px, -1px); }
    100% { opacity: 1; filter: none; transform: none; }
  }

  @keyframes wncore-glitch-heavy {
    0%   { opacity: 1; filter: none; transform: none; }
    10%  { opacity: 0.2; filter: hue-rotate(120deg) saturate(5) brightness(2); transform: translate(-4px, 2px) scaleX(1.04); }
    11%  { opacity: 1; filter: hue-rotate(0deg); transform: none; }
    30%  { opacity: 1; filter: none; transform: none; }
    31%  { opacity: 0.1; filter: hue-rotate(200deg) saturate(8); transform: translate(4px, -3px); }
    32%  { opacity: 1; filter: none; transform: none; }
    60%  { opacity: 1; filter: none; transform: none; }
    61%  { filter: hue-rotate(300deg) saturate(6) contrast(2); transform: translate(-2px, 4px); opacity: 0.4; }
    62%  { opacity: 1; filter: none; transform: none; }
    100% { opacity: 1; filter: none; transform: none; }
  }

  #prof-avatar-big.corrupted-1 { position: relative; }
  #prof-avatar-big.corrupted-1::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px
    );
    pointer-events: none;
    border-radius: 50%;
    mix-blend-mode: overlay;
  }
  #prof-avatar-big.corrupted-2 img { animation: wncore-glitch-flicker 3s infinite; }
  #prof-avatar-big.corrupted-heavy img { animation: wncore-glitch-heavy 1.2s infinite; }
  #prof-avatar-big.corrupted-lore img { opacity: 0.08 !important; }
  #prof-avatar-big.lore-swap-active img { transition: opacity 0.3s; }

  #prof-corruption-overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none; border-radius: 50%;
    opacity: 0; transition: opacity 0.3s;
  }
  #prof-corruption-overlay.active { opacity: 1; }
  #prof-corruption-overlay img { border-radius: 50%; object-fit: cover; width: 96px; height: 96px; }

  .prof-name-static {
    background: linear-gradient(90deg, #333 25%, #555 50%, #333 75%);
    background-size: 200% 100%;
    animation: static-sweep 0.5s infinite;
    color: transparent !important;
    border-radius: 3px;
  }
  @keyframes static-sweep {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  #prof-they-know {
    position: fixed;
    bottom: 24px;
    right: 28px;
    font-family: 'Courier New', monospace;
    font-size: 0.7rem;
    color: rgba(255,50,30,0.55);
    letter-spacing: 0.12em;
    pointer-events: none;
    z-index: 9999;
    animation: sig-flicker 3s infinite;
    user-select: none;
  }
  `;

  let _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected) return;
    _cssInjected = true;
    const s = document.createElement('style');
    s.id = 'wncore-corruption-css';
    s.textContent = CORRUPTION_CSS;
    document.head.appendChild(s);
  }

  // ── localStorage helpers ─────────────────────────────────────────────────
  function _siharuGetCount() {
    return parseInt(localStorage.getItem(SIHARU_KEY) || '0', 10);
  }
  function _siharuSetCount(n) {
    localStorage.setItem(SIHARU_KEY, String(Math.max(0, n)));
  }

  // Reconcile localStorage vs server profile — take the MAX
  function _siharuReconcile() {
    const local   = _siharuGetCount();
    const fromPrf = parseInt(window.__WNCORE_SIHARU_VISITS_FROM_PROFILE || 0, 10);
    const best    = Math.max(local, fromPrf);
    if (best > local) _siharuSetCount(best);
    return best;
  }

  // ── Increment & save ─────────────────────────────────────────────────────
  let _savePending = false;
  async function _siharuIncrementAndSave() {
    if (_savePending) return; // debounce
    _savePending = true;
    setTimeout(() => { _savePending = false; }, 3000);

    const next = _siharuGetCount() + 1;
    _siharuSetCount(next);
    _siharuApplyCorruption(next);

    // Sync to server if logged in
    try {
      if (typeof window._authUser !== 'undefined' && window._authUser) {
        if (typeof saveProfile === 'function') {
          await saveProfile({ siharu_visits: next });
        }
      }
    } catch (e) {
      // silent — corruption continues locally regardless
    }
  }

  // ── Corruption stage from count ──────────────────────────────────────────
  function _stage(count) {
    if (count <= 0)  return 0;
    if (count <= 2)  return 1;
    if (count <= 5)  return 2;
    if (count <= 9)  return 3;
    return 4;
  }

  // ── Zalgo helper ─────────────────────────────────────────────────────────
  const ZALGO_ABOVE = ['\u0354','\u0357','\u035b','\u0360','\u0362','\u0300','\u0301','\u0302','\u0308','\u030e'];
  const ZALGO_BELOW = ['\u0316','\u031e','\u031f','\u0320','\u0324','\u0325','\u0330','\u0333','\u0339','\u033c'];
  function _zalgo(text, intensity) {
    return text.split('').map(c => {
      if (c === ' ' || Math.random() > intensity) return c;
      const a = ZALGO_ABOVE[Math.floor(Math.random() * ZALGO_ABOVE.length)];
      const b = ZALGO_BELOW[Math.floor(Math.random() * ZALGO_BELOW.length)];
      return c + a + b;
    }).join('');
  }

  // ── Signal Integrity readout HTML ────────────────────────────────────────
  function _buildIntegrityHTML(count, stage) {
    const pct   = [100, 78, 45, 18, 0][stage];
    const fills = [12, 9, 5, 2, 0][stage];
    const cls   = ['','sig-stage1','sig-stage2','sig-stage3','sig-stage4'][stage];

    let barHtml;
    if (stage < 4) {
      const filled = '█'.repeat(fills);
      const empty  = '░'.repeat(12 - fills);
      barHtml = `<span class="sig-bar-wrap"><span class="sig-bar-fill" style="width:${Math.round(pct)}%"></span></span><span>${pct}%</span>`;
    } else {
      barHtml = `<span class="sig-breach">██░░░░░░░░ BREACH</span>`;
    }

    const nodeStatus = stage === 0 ? 'STABLE' :
                       stage === 1 ? 'NOMINAL' :
                       stage === 2 ? 'DEGRADED' :
                       stage === 3 ? 'CRITICAL' : 'COMPROMISED';

    const lastAnomaly = count === 0 ? 'NONE' :
                        count === 1 ? 'RECENT' :
                        `${count} INCIDENT${count === 1 ? '' : 'S'} LOGGED`;

    return `<div id="prof-signal-integrity" class="${cls}">
<div>&gt; SIGNAL INTEGRITY: ${barHtml}</div>
<div>&gt; NODE SYNC: ${nodeStatus}</div>
<div>&gt; RELAY CONTACT LOG: ${count} incident${count === 1 ? '' : 's'} recorded</div>
<div>&gt; LAST ANOMALY: ${lastAnomaly}</div>
</div>`;
  }

  // ── Inject signal integrity block ────────────────────────────────────────
  function _injectIntegrityBlock(count) {
    const existing = document.getElementById('prof-signal-integrity');
    if (existing) existing.remove();

    const stage  = _stage(count);
    const html   = _buildIntegrityHTML(count, stage);
    const page   = document.getElementById('page-profile');
    if (!page) return;
    const wrapper = page.querySelector('div[style*="max-width:860px"]');
    if (!wrapper) return;

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const block = tmp.firstElementChild;
    // Insert as very first child of wrapper
    wrapper.insertBefore(block, wrapper.firstChild);
  }

  // ── "They know." badge for stage 4 ──────────────────────────────────────
  function _injectTheyKnow() {
    if (document.getElementById('prof-they-know')) return;
    const el = document.createElement('div');
    el.id = 'prof-they-know';
    el.textContent = 'They know.';
    document.body.appendChild(el);
  }
  function _removeTheyKnow() {
    document.getElementById('prof-they-know')?.remove();
  }

  // ── Avatar corruption ────────────────────────────────────────────────────
  let _healTimeout = null;
  function _corruptAvatar(stage) {
    const avatarWrap = document.getElementById('prof-avatar-big');
    if (!avatarWrap) return;

    // Clear existing classes
    avatarWrap.classList.remove('corrupted-1','corrupted-2','corrupted-heavy');

    // Ensure overlay element exists
    let overlay = document.getElementById('prof-corruption-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'prof-corruption-overlay';
      const oImg = document.createElement('img');
      oImg.src = LORE_IMG;
      oImg.alt = '';
      overlay.appendChild(oImg);
      avatarWrap.style.position = 'relative';
      avatarWrap.appendChild(overlay);
    }
    overlay.classList.remove('active');

    if (stage === 0) return;

    if (stage === 1) {
      avatarWrap.classList.add('corrupted-1');
    } else if (stage === 2) {
      avatarWrap.classList.add('corrupted-1','corrupted-2');
    } else if (stage === 3) {
      // Load corrupted, heal over 7-10s back to stage-2 appearance
      avatarWrap.classList.add('corrupted-heavy');
      if (_healTimeout) clearTimeout(_healTimeout);
      _healTimeout = setTimeout(() => {
        avatarWrap.classList.remove('corrupted-heavy');
        avatarWrap.classList.add('corrupted-1','corrupted-2');
      }, 7000 + Math.random() * 3000);
    } else if (stage === 4) {
      // Stage 4: briefly show lore image, then revert
      avatarWrap.classList.add('corrupted-heavy');
      // Swap to lore image for 2-4s
      const img = avatarWrap.querySelector('img');
      const originalSrc = img ? img.src : '';
      if (img) {
        setTimeout(() => {
          overlay.classList.add('active');
          setTimeout(() => {
            overlay.classList.remove('active');
            avatarWrap.classList.remove('corrupted-heavy');
            avatarWrap.classList.add('corrupted-2');
          }, 2000 + Math.random() * 2000);
        }, 800);
      }
    }
  }

  // ── Zalgo name corruption (periodic, stages 2+) ──────────────────────────
  let _zalgoTimer = null;
  function _startZalgoTimer(stage) {
    if (_zalgoTimer) clearTimeout(_zalgoTimer);
    if (stage < 2) return;

    const intensity = stage === 2 ? 0.2 : stage === 3 ? 0.45 : 0.7;

    function _doZalgo() {
      const nameEl = document.getElementById('prof-input-display_name');
      if (nameEl) {
        const original = nameEl.value;
        if (original) {
          nameEl.value = _zalgo(original, intensity);
          setTimeout(() => { nameEl.value = original; }, 2200);
        }
      } else {
        // Also try display name label elements
        const labels = document.querySelectorAll('.prof-display-name-label, #prof-name-label');
        labels.forEach(el => {
          const orig = el.textContent;
          el.textContent = _zalgo(orig, intensity);
          setTimeout(() => { el.textContent = orig; }, 2000);
        });
      }
      const delay = ZALGO_INTERVAL_MS_MIN + Math.random() * (ZALGO_INTERVAL_MS_MAX - ZALGO_INTERVAL_MS_MIN);
      _zalgoTimer = setTimeout(_doZalgo, delay);
    }

    const firstDelay = 4000 + Math.random() * 8000;
    _zalgoTimer = setTimeout(_doZalgo, firstDelay);
  }

  // ── Bio replacement (stages 3+) ──────────────────────────────────────────
  let _bioTimer = null;
  function _startBioCorruption(stage) {
    if (_bioTimer) clearTimeout(_bioTimer);
    if (stage < 3) return;

    function _doBio() {
      const bioEl = document.getElementById('prof-input-bio');
      if (bioEl) {
        const orig = bioEl.value;
        const lore = LORE_STATIC[Math.floor(Math.random() * LORE_STATIC.length)];
        bioEl.value = lore;
        setTimeout(() => { bioEl.value = orig; }, 3000);
      }
      // Next fire in 20-45s
      _bioTimer = setTimeout(_doBio, 20000 + Math.random() * 25000);
    }
    _bioTimer = setTimeout(_doBio, 8000 + Math.random() * 12000);
  }

  // ── Stage 4: display name static sweep ──────────────────────────────────
  let _staticTimer = null;
  function _startStaticName(stage) {
    if (_staticTimer) clearTimeout(_staticTimer);
    if (stage < 4) return;

    function _doStatic() {
      const nameEl = document.getElementById('prof-input-display_name');
      if (nameEl) {
        nameEl.classList.add('prof-name-static');
        setTimeout(() => { nameEl.classList.remove('prof-name-static'); }, 1200);
      }
      _staticTimer = setTimeout(_doStatic, 6000 + Math.random() * 8000);
    }
    _staticTimer = setTimeout(_doStatic, 3000 + Math.random() * 4000);
  }

  // ── Stage 4: header corruption ───────────────────────────────────────────
  function _corruptHeader(stage) {
    const headers = document.querySelectorAll('#page-profile h2, #page-profile .page-title, #page-profile [class*="title"]');
    headers.forEach(h => {
      if (stage === 4 && h.textContent.toLowerCase().includes('profile')) {
        h.setAttribute('data-prof-orig', h.textContent);
        h.textContent = 'MY PR\u0354OF\u0357I\u035bL\u0360E\u0362';
      } else {
        const orig = h.getAttribute('data-prof-orig');
        if (orig) h.textContent = orig;
      }
    });
  }

  // ── Master apply function ────────────────────────────────────────────────
  let _activeStage = -1;
  function _siharuApplyCorruption(count) {
    _injectCSS();
    const stage = _stage(count);
    if (stage === _activeStage && stage === 0) return;
    _activeStage = stage;

    // Update signal integrity block (only if profile page visible)
    if (document.getElementById('prof-signal-integrity')) {
      _injectIntegrityBlock(count);
    }

    _corruptAvatar(stage);
    _corruptHeader(stage);

    // Clear timers from previous stage before starting new ones
    if (_zalgoTimer) { clearTimeout(_zalgoTimer); _zalgoTimer = null; }
    if (_bioTimer)   { clearTimeout(_bioTimer);   _bioTimer = null; }
    if (_staticTimer){ clearTimeout(_staticTimer); _staticTimer = null; }

    _startZalgoTimer(stage);
    _startBioCorruption(stage);
    _startStaticName(stage);

    if (stage >= 4) {
      _injectTheyKnow();
    } else {
      _removeTheyKnow();
    }
  }

  // ── Referrer detection on page load ─────────────────────────────────────
  // Fires ONCE per page load — if they came back from siharu.vercel.app, increment.
  // This covers BOTH manual link clicks and JS redirects (window.location.href=_d).
  // A sessionStorage flag prevents double-counting within the same session tab.
  (function _checkReferrer() {
    try {
      if (document.referrer && document.referrer.includes(SIHARU_HOST)) {
        const flagKey = 'wncore_siharu_return_counted';
        // Only count once per page load (not per navigation within SPA)
        if (!sessionStorage.getItem(flagKey)) {
          sessionStorage.setItem(flagKey, '1');
          // Small delay to let profile system initialise
          setTimeout(() => {
            _siharuIncrementAndSave();
          }, 1200);
        }
      }
    } catch (e) {}
  })();

  // ── Outbound click intercept ─────────────────────────────────────────────
  // Catches manual <a> links to siharu.vercel.app.
  // We set a sessionStorage key so that on return, the referrer check
  // knows it's a "new" visit. We do NOT increment here to avoid double-counting
  // (the referrer check on return handles the increment).
  document.addEventListener('click', function (e) {
    try {
      const a = e.target.closest('a[href]');
      if (a && a.href && a.href.includes(SIHARU_HOST)) {
        // Mark departure so the referrer check fires on return
        sessionStorage.removeItem('wncore_siharu_return_counted');
      }
    } catch (e) {}
  }, true);

  // ── Profile page observer ────────────────────────────────────────────────
  // When the profile page is shown/re-injected, apply corruption.
  // Runs after a short delay to let the DOM settle.
  const _profileObserver = new MutationObserver(function (mutations) {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1 && (node.id === 'prof-avatar-section' || node.querySelector?.('#prof-avatar-section'))) {
          _onProfilePageReady();
          return;
        }
      }
    }
  });
  _profileObserver.observe(document.body, { childList: true, subtree: true });

  let _profReadyTimeout = null;
  function _onProfilePageReady() {
    if (_profReadyTimeout) clearTimeout(_profReadyTimeout);
    _profReadyTimeout = setTimeout(() => {
      try {
        const count = _siharuReconcile();
        const stage = _stage(count);
        _injectIntegrityBlock(count);
        _corruptAvatar(stage);
        _corruptHeader(stage);
        _startZalgoTimer(stage);
        _startBioCorruption(stage);
        _startStaticName(stage);
        if (stage >= 4) _injectTheyKnow();
      } catch (e) {}
    }, 350);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  // Expose for manual testing in console:
  // window.__SIHARU_CORRUPT.getCount()
  // window.__SIHARU_CORRUPT.setCount(n)
  // window.__SIHARU_CORRUPT.forceApply(n)
  window.__SIHARU_CORRUPT = {
    getCount  : _siharuGetCount,
    setCount  : (n) => { _siharuSetCount(n); _siharuApplyCorruption(n); },
    forceApply: (n) => { _siharuSetCount(n); _siharuIncrementAndSave(); },
    reset     : () => { _siharuSetCount(0); localStorage.removeItem(SIHARU_KEY); _siharuApplyCorruption(0); },
    stage     : () => _stage(_siharuGetCount()),
  };

  // ── Initial run (non-profile pages still get avatar corruption on nav) ───
  // On DOMContentLoaded, apply current corruption level globally.
  function _init() {
    try {
      const count = _siharuReconcile();
      _siharuApplyCorruption(count);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
