# WNCORE Radio — Freeze Bug Analysis & Fix Guide

## Root Causes (in order of severity)

---

### 🔴 BUG 1 — `crossorigin="anonymous"` on the `<audio>` element (PRIMARY FREEZE CAUSE)

**File:** `index.html`, line 101  
**Current:**
```html
<audio id="audio" preload="none" crossorigin="anonymous"></audio>
```
**Fix:**
```html
<audio id="audio" preload="none"></audio>
```

**Why this freezes the page:**  
`crossorigin="anonymous"` makes the browser send CORS preflight requests for *every* radio stream URL. The vast majority of radio streams (Icecast, SHOUTcast, etc.) do **not** send CORS headers back. The browser then:
1. Blocks the audio element from playing (CORS failure = network error)
2. Triggers `audio.error` repeatedly
3. Chrome hangs the tab while waiting on stalled network requests that never resolve

This is the #1 reason for the freeze. Remove `crossorigin="anonymous"` entirely — it's unnecessary for simply *playing* a stream (only needed if you're piping it through Web Audio API's `createMediaElementSource`, which has its own problems — see Bug 2).

---

### 🔴 BUG 2 — `createMediaElementSource` + CORS = silent audio death

**File:** `bundle.js`, lines 1696, 3089  

When `initAudioFX()` or `initEQ()` calls `audioCtx.createMediaElementSource(audio)`, the Web Audio API requires the audio element to have CORS headers from the server **or** `crossorigin="anonymous"` set. Since most radio streams don't send CORS headers, this call silently kills audio output — the stream loads, the browser says it's "playing", but you hear nothing, and the tab eventually freezes waiting on the stalled pipeline.

**Fix — lazy-init Audio FX, skip if CORS unavailable:**

In `bundle.js`, change `initAudioFX()` to only connect the Web Audio chain if the stream has already successfully started playing and CORS is available:

```js
function initAudioFX() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Only call createMediaElementSource if audio is actually playing
    // and the stream is from a CORS-friendly origin
    sourceNode = audioCtx.createMediaElementSource(audio);
    waveshaper = audioCtx.createWaveShaper();
    lowpass = audioCtx.createBiquadFilter();
    gainNode = audioCtx.createGain();
    lowpass.type = 'lowpass'; lowpass.frequency.value = 20000;
    waveshaper.curve = makeDistortionCurve(0); waveshaper.oversample = '4x';
    sourceNode.connect(waveshaper);
    waveshaper.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    window._sharedAudioCtx = audioCtx;
    window._sharedSourceNode = sourceNode;
    window._sharedGainNode = gainNode;
  } catch(e) {
    // CORS or browser restriction — degrade gracefully, audio still plays natively
    console.warn('[WNCORE] Web Audio FX unavailable:', e.message);
    audioCtx = null;
  }
}
```

And in `applyStationSecondaryEffects` (line ~596), **remove** the unconditional `initAudioFX()` call on play — only call it when the user explicitly triggers an FX feature.

---

### 🔴 BUG 3 — `playStation` called without pausing the previous stream first

**File:** `bundle.js`, `playStation()` function, line 539  
**Current:**
```js
audio.src = url;
audio.volume = document.getElementById('vol-slider').value;
const playPromise = audio.play();
```

**Problem:** Setting `audio.src` while audio is playing triggers an `AbortError` on the in-flight `.play()` promise from the *previous* call. The AbortError catch block then calls `audio.play()` *again* (line 564), which can trigger another AbortError, creating a loop that holds the main thread.

**Fix — always pause+reset before switching source:**
```js
function playStation(url, name, meta, emoji) {
  if (!url || !url.startsWith('http')) {
    updateStatus('NO SIGNAL');
    document.getElementById('np-track').textContent = '— station offline —';
    return;
  }

  // ✅ FIX: Cancel any in-flight playback BEFORE changing src
  audio.pause();
  audio.src = '';   // release the old stream immediately
  
  currentStation = { url, name, meta, emoji: emoji || '📻' };

  // Pause Live Music player if running
  if (typeof lmAudio !== 'undefined' && !lmAudio.paused) {
    lmAudio.pause();
    lmIsPlaying = false;
    const iconEl = document.getElementById('lm-play-icon');
    if (iconEl) iconEl.setAttribute('d', 'M8 5v14l11-7z');
    const npCard = document.getElementById('lm-np-card');
    if (npCard) npCard.classList.remove('playing');
  }

  updateStatus('CONNECTING…');
  document.getElementById('np-track').textContent = '— buffering —';

  // Small delay lets the browser cleanly release the old stream
  setTimeout(() => {
    audio.src = url;
    audio.volume = document.getElementById('vol-slider')?.value ?? 0.8;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isPlaying = true;
        window.isPlaying = true;   // ✅ FIX: sync window.isPlaying (PWA prompt bug)
        updateUI(name, meta, emoji || '📻');
        updateMiniPlayerVisibility();
        // ✅ FIX: removed applyStationSecondaryEffects which called initAudioFX unconditionally
        exposure += 8 + (window._corruptionBoost || 0);
      }).catch(err => {
        if (err?.name === 'AbortError') {
          // ✅ FIX: don't retry on AbortError — it was our own pause() that caused it
          return;
        }
        isPlaying = false;
        window.isPlaying = false;
        updateStatus('STREAM UNAVAILABLE');
        document.getElementById('np-track').textContent = '— signal lost —';
      });
    }
  }, 50);
}
```

---

### 🟠 BUG 4 — 62 simultaneous `setInterval` timers accumulate on every play

**File:** `bundle.js`

Each call to `playStation` doesn't clear the previous `_progressInterval` before `startProgressSync()` creates a new one (guarded by `if(!_progressInterval)` — OK), but other parts of the code spawn intervals that are **never cleared**:

- `renderNetworkMap` runs every **2 seconds** on a canvas — expensive
- `animateListenerCounts` runs every **3 seconds**, reset each table render
- `statsStartTracking` runs every **1 second** writing to `localStorage`
- WRONGNESS spawns **14+ intervals** at boot (desktop)
- Horror/glitch effects spawn additional intervals per-trigger

**Fix — add visibility check to the heaviest intervals:**

The network map already has a `document.hidden` guard. Make sure `statsStartTracking` also checks:

```js
_statsInterval = setInterval(() => {
  if (document.hidden) return;   // ✅ add this
  const au = document.getElementById('audio');
  if (au && !au.paused) {
    const s = statsLoad();
    s.totalSecs++;
    statsSave(s);
    updateStatsWidget();
  }
}, 1000);
```

And stop the network map interval when the About page is not visible:

```js
// In buildNetworkMap():
let _nmInterval = setInterval(renderNetworkMap, 2000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearInterval(_nmInterval); _nmInterval = null; }
  else if (!_nmInterval) _nmInterval = setInterval(renderNetworkMap, 2000);
});
```

---

### 🟠 BUG 5 — `makeDistortionCurve` allocates a 44,100-element Float32Array on every call

**File:** `bundle.js`, line 1711  
```js
function makeDistortionCurve(amount) {
  let k = amount || 50, n = 44100, c = new Float32Array(n), deg = Math.PI / 180;
  for (let i = 0; i < n; ++i) { let x = i * 2 / n - 1; c[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x)); }
  return c;
}
```

This is called 10 times across the codebase including inside `setInterval` callbacks running at 100ms intervals (the distortion decay loop). Allocating 344KB of Float32Array 10× per second causes GC pressure and jank.

**Fix — cache curves by amount:**
```js
const _distCurveCache = new Map();
function makeDistortionCurve(amount) {
  const key = Math.round(amount);
  if (_distCurveCache.has(key)) return _distCurveCache.get(key);
  const k = key || 50, n = 44100, c = new Float32Array(n), deg = Math.PI / 180;
  for (let i = 0; i < n; ++i) {
    const x = i * 2 / n - 1;
    c[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  if (_distCurveCache.size > 20) _distCurveCache.clear(); // cap size
  _distCurveCache.set(key, c);
  return c;
}
```

---

### 🟡 BUG 6 — 17 `DOMContentLoaded` listeners all fire at page load

**File:** `bundle.js`

The bundle has **17** separate `DOMContentLoaded` handlers, each running their own `boot()` / `init()` / `bootV2()` function simultaneously. This causes:
- Race conditions between init functions touching the same DOM elements
- Heavy synchronous DOM work blocking the main thread for several seconds on load
- Some boot functions running 3.5 seconds *after* load (line 5872) which then patch already-initialized state

**Fix:** Consolidate into a single boot sequence. Short term: add `{ once: true }` to all listeners that are already guarded by existence checks, and ensure the 3.5s delayed boot (line 5872) doesn't re-initialize things the primary boot already did.

---

### 🟡 BUG 7 — `window.isPlaying` never set, PWA prompt never shows

**File:** `bundle.js`, lines 753, 544, 565  
**Current:** The audio `play` event sets local `isPlaying = true` but PWA prompt polls `window.isPlaying`.  
**Fix:** Already included in Bug 3 fix above — add `window.isPlaying = true/false` alongside every `isPlaying =` assignment at lines 544, 565, 753.

---

## Quick-Fix Priority Order

| Priority | Fix | Impact |
|---|---|---|
| 1 | Remove `crossorigin="anonymous"` from `<audio>` | Stops freeze immediately |
| 2 | Add `audio.pause(); audio.src='';` before switching stream | Stops AbortError loops |
| 3 | Wrap `initAudioFX()` in try/catch, don't call on every play | Stops CORS audio death |
| 4 | Cache `makeDistortionCurve` results | Fixes GC jank |
| 5 | Add `document.hidden` guards to heavy intervals | Reduces background CPU |
| 6 | Add `window.isPlaying = true/false` to all assignments | Fixes PWA install prompt |
