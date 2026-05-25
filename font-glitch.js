/**
 * WNCORE — WORD GLITCH ENGINE
 * font-glitch.js — include on every page after fonts.css
 *
 * Behaviour:
 *   T+0s      → idle, no glitch
 *   T+40–50s  → phase 1 begins: occasional single-word micro-glitch
 *               (random delay between 40 and 50 seconds on each page load)
 *   T+60s     → phase 2: glitches become slightly more frequent/visible
 *   T+0s–∞   → Rubik Glitch font only on elements with .wncore-horror-font
 *               (set externally by ARG/horror triggers)
 *
 * How it works:
 *   1. Walks the DOM and wraps individual words in <span class="wncore-glitch-word">
 *      but only inside text nodes that are safe to touch (no inputs, no code,
 *      no existing ARG elements)
 *   2. At T+random(40,50)s → starts phase 1 interval
 *   3. At T+60s → upgrades to phase 2 interval
 *   4. Each tick picks 1–2 random wrapped words, adds the glitch class,
 *      removes it after the animation completes
 */

(function() {
  'use strict';

  /* ── CONFIG ──────────────────────────────────────────────────── */
  const CFG = {
    phase1Start:   40,      // seconds until phase 1 begins (base)
    phase1Jitter:  10,      // ± random seconds added to phase 1 start
    phase2Start:   60,      // seconds until phase 2 upgrades
    phase1Interval: 4500,   // ms between glitch ticks in phase 1
    phase2Interval: 2800,   // ms between glitch ticks in phase 2
    phase1WordsPerTick: 1,  // words glitched per tick
    phase2WordsPerTick: 1,  // still subtle — never more than 1–2
    phase2ExtraChance: 0.3, // 30% chance of a 2nd word in phase 2
    // Selectors to skip entirely — don't wrap these
    skipSelectors: [
      'script', 'style', 'noscript', 'code', 'pre', 'input',
      'textarea', 'select', 'button', 'a', 'svg', 'canvas',
      'video', 'audio', 'img', 'iframe', '.redacted', '.arg-status',
      '.arg-broken-bar', '.ticker-inner', '#admin-panel-modal',
      '[data-no-glitch]', '.wncore-horror-font',
    ].join(','),
    // Min word length to wrap — skip tiny words like "a", "I", "of"
    minWordLen: 4,
  };

  /* ── STATE ───────────────────────────────────────────────────── */
  let phase = 0;  // 0=idle, 1=p1, 2=p2
  let wrappedWords = [];
  let ticker1 = null;
  let ticker2 = null;
  const startTime = Date.now();

  /* ── WRAP WORDS IN SAFE TEXT NODES ──────────────────────────── */
  function isSkippable(node) {
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el) {
      if (el.matches && el.matches(CFG.skipSelectors)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function wrapTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text || !text.trim()) return 0;
    if (isSkippable(textNode)) return 0;

    const words = text.split(/(\s+)/);
    // Only proceed if there are wrappable words
    const hasWrappable = words.some(w => w.trim().length >= CFG.minWordLen);
    if (!hasWrappable) return 0;

    const frag = document.createDocumentFragment();
    let count = 0;

    words.forEach(part => {
      if (part.trim().length >= CFG.minWordLen && /[a-zA-Z]/.test(part)) {
        const span = document.createElement('span');
        span.className = 'wncore-glitch-word';
        span.textContent = part;
        frag.appendChild(span);
        wrappedWords.push(span);
        count++;
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });

    textNode.parentNode.replaceChild(frag, textNode);
    return count;
  }

  function walkAndWrap(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (isSkippable(node)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    // Process collected nodes (can't modify DOM while walking)
    nodes.forEach(wrapTextNode);
  }

  /* ── GLITCH TICK ─────────────────────────────────────────────── */
  function glitchTick(currentPhase) {
    if (!wrappedWords.length) return;

    const cls = currentPhase === 1 ? 'glitch-p1' : 'glitch-p2';
    const count = currentPhase === 2 && Math.random() < CFG.phase2ExtraChance ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * wrappedWords.length);
      const word = wrappedWords[idx];
      if (!word || !document.body.contains(word)) {
        // remove stale reference
        wrappedWords.splice(idx, 1);
        continue;
      }
      if (word.classList.contains('glitch-p1') || word.classList.contains('glitch-p2')) continue;

      word.classList.add(cls);
      // Remove class after animation duration
      const dur = currentPhase === 1 ? 200 : 260;
      setTimeout(() => {
        word.classList.remove('glitch-p1');
        word.classList.remove('glitch-p2');
      }, dur + 50);
    }
  }

  /* ── PHASE TRANSITIONS ───────────────────────────────────────── */
  function startPhase1() {
    if (phase >= 1) return;
    phase = 1;
    ticker1 = setInterval(() => glitchTick(1), CFG.phase1Interval);
  }

  function startPhase2() {
    if (phase >= 2) return;
    phase = 2;
    if (ticker1) { clearInterval(ticker1); ticker1 = null; }
    ticker2 = setInterval(() => glitchTick(2), CFG.phase2Interval);
  }

  /* ── INIT ────────────────────────────────────────────────────── */
  function init() {
    // Wrap DOM words
    walkAndWrap(document.body);

    // Schedule phase 1 with jitter
    const p1Delay = (CFG.phase1Start + Math.random() * CFG.phase1Jitter) * 1000;
    setTimeout(startPhase1, p1Delay);

    // Schedule phase 2 at fixed 60s from load
    const p2Delay = CFG.phase2Start * 1000;
    setTimeout(startPhase2, p2Delay);
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay so page-specific JS finishes building the DOM first
    setTimeout(init, 800);
  }

  /* ── PUBLIC API (for ARG triggers to use) ────────────────────── */
  window.WNCOREGlitch = {
    // Force a burst of glitches right now (e.g. on ARG event)
    burst(count = 5, phase = 2) {
      for (let i = 0; i < count; i++) {
        setTimeout(() => glitchTick(phase), i * 120);
      }
    },
    // Apply Rubik Glitch font to an element for ARG horror moments
    horrorFont(el) {
      if (el) el.classList.add('wncore-horror-font');
    },
    restoreFont(el) {
      if (el) el.classList.remove('wncore-horror-font');
    },
    // Manually advance phase
    forcePhase1: startPhase1,
    forcePhase2: startPhase2,
    getPhase: () => phase,
    getWordCount: () => wrappedWords.length,
  };

})();
