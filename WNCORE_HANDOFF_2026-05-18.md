# WNCORE SESSION HANDOFF
**Date:** 2026-05-18  
**Session scope:** Bug fixes (Tasks 1–5), new pages (constellation.html, radio-mini.html), sitewide audit

---

## FILES MODIFIED / CREATED

| File | Status | Changed |
|------|--------|---------|
| `bundle.js` | Modified | Tasks 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 4.1 |
| `style.css` | Modified | Tasks 1.1, 1.4, 2.2 |
| `index.html` | Modified | Tasks 5.1–5.3, audio scroll fix, nav links |
| `constellation.html` | **New** | ARG 3D constellation sandbox |
| `radio-mini.html` | **New** | Standalone pocket radio PWA |
| `manifest-mini.json` | **New** | PWA manifest for mini radio |
| `bundle_append.js` | Unmodified | No changes needed this session |
| `mobile.css` | Unmodified | Header/scroll system deferred to next session |

---

## BUGS FIXED THIS SESSION

### Section 1 — Header & Layout

**Task 1.1 — Header overlap / clock clipping "About"**
- Root: UTC clock injected via `injectBroadcastClock()` into `.header-right` using `prepend()`, but `.header-right` had no left padding buffer
- Fix: `.logo` now has `flex-shrink:0; margin-right:16px`. `.header-right` gets `padding-left:8px`. Nav gets `flex-shrink:1; overflow:hidden`
- File: `style.css` line 113–118

**Task 1.2 — Mobile station names invisible**
- Root: `_loadMoreCharts()` was building 5-column `<tr>` rows instead of the correct 7-column structure (`st-num`, `st-eq`, `st-cover`, name, country, bitrate, play). On mobile, this caused the station name `<td>` to land in the narrow `st-cover-cell` column slot (~40px wide) and get crushed to invisible
- Fix: Rebuilt row HTML inside `_loadMoreCharts` to match `renderTable()`'s exact 7-column structure
- File: `bundle.js` inside `_loadMoreCharts()`

**Task 1.3 — Canvas disappears on orientation change**
- Root: `resize` event handler had a destructive `else` branch — if `isMobile()` returned false (which happens on landscape), it called `cancelAnimationFrame(raf)` and set `canvas.style.display='none'`
- Fix: Removed the else branch entirely. Always call `resize()`, always respawn stars, always restart RAF if halted
- File: `bundle.js` constellation resize handler

**Task 1.4 — Dark mode white buttons**
- Root: `np-play-btn`, `pb-play`, active filter/sort/chart buttons all had hardcoded light backgrounds not overridden in dark mode
- Fix: Appended dark mode block to `style.css` — `.np-play-btn`, `.pb-play`, `.minimal-btn.on`, `.station-sort-btn.active`, `.filter-btn.active`, `.charts-view-btn.active` all get `background:var(--accent); color:#fff` in dark mode
- File: `style.css` appended at end

### Section 2 — Audio Engine

**Task 2.1 — Now Playing artwork never updated**
- Root: `updateUI()` always wrote `SVG.radio` generic icon into `#np-art-icon` and `#pb-art`. Station favicon was never passed through the call chain
- Fix: `updateUI(name, meta, emoji, favicon)` — 4th arg added. Renders `<img src=favicon>` with `onerror` SVG fallback. All `playStation()` call sites updated to pass `s.favicon||null`
- Bonus fix: `play887Static()` was calling `updateUI` with 3 args — fixed to pass explicit `null` as favicon to prevent arg-count errors
- File: `bundle.js`

**Task 2.2 — Progress bar always animating**
- Root: `.playing` class added at connection time and never removed. No link to actual `audio` events
- Fix: CSS — added `.buffering` (slow pulse, 40% width) and `.paused` (static) state classes. JS — `audio.play/pause/ended/waiting/playing` events now add/remove the correct class
- File: `style.css` + `bundle.js`

### Section 3 — Backend Logic

**Task 3.1 — Profile settings not rendering**
- Root: Patched `loadProfilePage` checked `_authUser` synchronously, but `_authUser` may be null at call time if Supabase session hasn't resolved yet (race condition on direct navigation to profile route)
- Fix: Made the patched `loadProfilePage` async. If `_authUser` is null, awaits `sb.auth.getSession()` before proceeding (up to one network round-trip, with catch). Uses existing `_authUpdateNav()` to update nav state
- File: `bundle.js`

**Task 3.2 — Charts capped at 50 stations**
- Root: Hardcoded `limit=50` in `loadChartsPage()`. Single fetch, no pagination
- Fix: Complete rewrite. First load fetches 100 (`_CHARTS_PAGE_SIZE`). Appends "LOAD MORE" row with offset counter. `_loadMoreCharts()` fetches next 100 at `_chartsOffset`, appends rows without wiping table. State: `_chartsOffset`, `_chartsLoading`, `_chartsExhausted`
- File: `bundle.js`

**Task 3.3 — Online users counter ignores real data**
- Root: `live-count` element updated by `setInterval` using `12841 + random()` — completely disconnected from `window.__WNCORE_ONLINE_COUNT` which was being populated from Radio Browser API in `bundle_append.js`
- Fix: New `_startHybridLiveCount()` IIFE reads `window.__WNCORE_ONLINE_COUNT` as base, adds ±40 session variance. Falls back to 12841 if API not yet returned
- File: `bundle.js`

### Section 4 — Easter Eggs

**Task 4.1 — Discord glitch button + cat redirect**
- Old: Discord button had mild glitch on high exposure, then called real auth
- New: `_injectDiscordGlitch()` runs on DOMContentLoaded and on `showAuth()`. Injects full glitch CSS: idle shimmer, `::before/::after` chromatic aberration slice animations. Click triggers `_triggerDiscordGlitchAndRedirect()` — 700ms of label flicker through `SIGNAL_KAGE → ██████ → > REDIRECTING`, then navigates to random cat endpoint (thecatapi.com / cataas.com / placekitten.com)
- File: `bundle.js`

### Section 5 — ARG SEO

**Tasks 5.1–5.3**
- `<title>` and `<meta description>` now lead with "The WNCORE, or World Net Core, is an anomaly"
- `<meta keywords>` includes all 6 name variants: World Net Core, World Network Core, World Node Core, Withered Nexus Core, Wraith Network Core, WNCORE Radio
- JSON-LD: `WebSite`, `RadioStation`, `Organization` all have `alternateName` arrays with all lore variants. `RadioStation.description` contains lore text about Node 09 and 88.7
- About section: `<h2>` tag added to heading. Copy now naturally weaves all 6 names with in-lore explanations for Withered Nexus Core (2017 restructuring codename) and Wraith Network Core (Node 09 incident classification)
- Hero: `<h1>` tag on globe-title (was `<div>`), first `<p>` contains exact definition snippet for crawler extraction
- File: `index.html`

### Scroll-to-bottom on play (bonus fix from screenshot)
- Root: `<audio id="audio">` was inline in document flow at line 168. Chrome/Android scrolls the active audio element into view on playback start
- Fix: `position:fixed; top:-9999px; left:-9999px; width:1px; height:1px; visibility:hidden; aria-hidden=true; tabindex=-1`
- File: `index.html` line 168

---

## BUGS FOUND & FIXED DURING AUDIT (post-build)

| # | File | Bug | Fix |
|---|------|-----|-----|
| A | `index.html` | Extra `}` in RadioStation JSON-LD — invalid JSON, would fail Google's Rich Results validator | Removed extra brace |
| B | `bundle.js` | `play887Static()` called `updateUI` with 3 args; new signature requires 4 — would pass `undefined` as favicon, potentially crashing the `img.src` assignment | Added explicit `null` |
| C | `constellation.html` | `buildConstellationMesh()` called on already-existing group during 30s unlock poll — duplicate Three.js meshes added to scene, memory leak | Remove old group from scene before rebuild; re-derive Fibonacci position mathematically |
| D | `constellation.html` | Unlock poll passed `group.position` (Three.js `Vector3` object) as offset — `buildConstellationMesh` destructures it as `{x,y,z}` which works, but `Vector3` is a live reference that changes with camera | Changed to re-derive plain `{x,y,z}` from Fibonacci formula |
| E | `radio-mini.html` | Double `id` attribute on waveform div (`id="mini-art-waveform" id="mini-wave"`) — only first id is parsed by browser | Removed duplicate `id="mini-wave"` |
| F | `radio-mini.html` | `renderStations()` used inline `onclick` attributes with string-escaped station data — fragile, XSS risk if station names contain quotes, breaks on stations with apostrophes in names | Replaced with `_stationStore` Map + `addEventListener('click')` per row |
| G | `radio-mini.html` | `updateFavBtn()` rewrote `btn.innerHTML` — destroyed the `onclick="toggleFav()"` attribute | Now updates only `fill` attribute and last text node, never touches innerHTML |
| H | `radio-mini.html` | `renderSaved()` had stale comment referencing deleted `stationRowClick` function | Removed |

---

## KNOWN REMAINING ISSUES (not fixed this session)

### 🔴 Critical

**Header hamburger `≡` cut off on mobile** — From the screenshot. The desktop nav has 7 items + header-right (clock, MIN, search, theme toggle, sign-in, menu button). On narrow viewports the nav is not hidden early enough so header-right gets pushed off-screen. The menu button is the victim because it's the rightmost element.
- **Next session fix:** Full fluid layout system — hide nav links at ≤900px (show only logo + header-right controls), collapse to hamburger only. Remove all fragmented mobile.css media query patches and replace with one coherent responsive ruleset.

**Scroll position not preserved between page switches** — When user plays a station while browsed deep in a page, then switches page and back, scroll resets to top. `showPage()` doesn't cache/restore `scrollTop` per page.

### 🟡 Medium

**`body.dark-mode .pb-play` specificity war** — `.pb-play` base rule at line 426 has `background:#fff`. There are 3 separate `body:not(.dark-mode) .pb-play` overrides at lines 2452, 3345, 3385 across the stylesheet. Our new `body.dark-mode .pb-play` appended at line 6235 should win (last declaration + same specificity), but any future addition could silently revert it. Consolidate all `pb-play` dark/light rules into one block.

**iOS background audio** — Service Worker not implemented. Audio stops on iOS lock screen. Howler.js in `radio-mini.html` handles this correctly via `html5:true` + AudioContext unlock. Main site still uses raw `<audio>` element which iOS suspends.

**`_loadMoreCharts` pagination** — `chartsData` cache only stores first 100 stations. After loading more, the paginated rows are in the DOM but not all in `chartsData`. Sorting/filtering reloads from cache (100 stations only). Acceptable for now but worth noting.

**Constellation `openPuzzle` re-open after solve** — Once solved, clicking a constellation in the sidebar shows the info panel correctly (action button hidden) but doesn't re-show the lore card. Users can't re-read the lore without solving again. Minor UX gap.

### 🟢 Low

**`radio-mini.html` — `Howler.masterGain` may not exist before first play** — `startWave()` is called from `onplay` callback so `Howler.ctx` will be initialized, but `masterGain` is a Howler internal. Added guard `if (!S.waveAnalyser && Howler.ctx)` but the waveform will fall back to fake CSS animation on first play if context isn't ready. Fine.

**ARG constellation acrostic puzzles** — `answer` strings (e.g. `"TELO"`, `"MAGON"`) are 4–5 chars but `stars` arrays have 4–7 entries. The `answer[i] || '?'` guard handles mismatches gracefully but the displayed acrostic may look uneven. Intentional mystery or worth aligning arrays.

---

## NEXT SESSION PRIORITIES

### 1. `wncore-3d-audio.js` — Three.js + Howler integration for main site
Already fully designed. One new file added via `<script defer>` after `bundle_append.js`:
- Howler wrapping existing `<audio>` with crossfade
- Three.js particle field replacing constellation canvas
- 3D waveform in sidebar from FFT data
- Globe signal arc system
- ARG glitch shader pass

### 2. Fluid responsive layout system
Replace all mobile.css patch fragments with a single architectural fix:
- CSS custom properties for breakpoints
- `clamp()` typography scaling
- Header: nav hidden at ≤900px, hamburger only
- Container queries for sidebar/now-playing layout
- Eliminates the hamburger cutoff, label wrapping, and country filter overflow bugs permanently

### 3. iOS background audio via Service Worker
Extend `sw.js` to cache audio stream metadata and implement `MediaSession` API properly so lock screen controls work on iOS.

---

## ENVIRONMENT NOTES

```
Vercel Free (Hobby) tier
Supabase: project URL in .env.example
Groq: llama-3.3-70b-versatile (chat widget)
CDN allowed: unpkg.com, cdn.jsdelivr.net (per vercel.json CSP)
Three.js: unpkg.com/three@0.165.0/build/three.min.js
Howler.js: unpkg.com/howler@2.2.4/dist/howler.min.js
Radio Browser API mirrors: de1, at1, nl1.api.radio-browser.info
localStorage keys:
  wncore-history-v2        → listening history (used by constellation unlock)
  wncore-constellation-solved → solved puzzle IDs
  wncore-mini-favs         → mini radio saved stations
  wncore-mini-last         → last played station (mini radio)
  wncore-vol               → volume (shared)
  wncore-genre-history     → genre history (used by constellation unlock)
```

---

## DEPLOYMENT CHECKLIST

```
□ bundle.js        — replace in root
□ style.css        — replace in root
□ index.html       — replace in root
□ constellation.html — new file in root
□ radio-mini.html  — new file in root
□ manifest-mini.json — new file in root
□ bundle_append.js — unchanged, no replacement needed
□ mobile.css       — unchanged, no replacement needed
□ vercel.json      — unchanged, routing already handles new .html files
```

**After deploy — verify:**
- Open `/constellation.html` — 3D scene loads, 2 starter constellations (Orion/Cygnus) are unlocked orange
- Open `/radio-mini.html` — station list loads, play a station, art appears, waveform animates
- Main site: play a station → page does NOT scroll to bottom ✓
- Main site: mobile hamburger `≡` is still cut off (expected, fix is next session)
- Main site dark mode: play button is orange, not white ✓
- Main site: open full charts → loads 100, "LOAD MORE" button appears ✓
- Profile page: sign in then navigate to profile → Avatar/Username/Delete options render ✓

---

## SESSION 2 ADDITIONS (same day)

### Unified Audio Player
**Problem:** `lmAudio = new Audio()` was a completely separate audio instance from the main `audio` element. Even though both called stop on each other, `lmUpdateUI()` never updated `#pb-name` or `#np-name` — so the bottom player bar showed stale radio station info while Live Music was playing.

**Fix:** Eliminated `lmAudio` entirely. `lmStartStation()` now calls `playStation()` directly — the same function used by every other section. One `<audio>` element, one `isPlaying` state, one `updateUI()` call. All three players (radio table, anime, live music) now route through the same engine.

- `lmStartStation()` → `playStation(url, name, meta, '🎵', null)` then attaches one-time `play`/`error` listeners to update LM-specific UI (`lm-np-card`, waveform bars)
- Global `audio` `pause`/`ended` listeners now also sync `lmIsPlaying` and reset LM UI
- `playStation()` now resets `lmCurrentChannel = null` when radio is selected, so LM state doesn't persist incorrectly
- `lmTogglePlay()` delegates entirely to `togglePlay()`
- `lmNext()` / `lmShuffle()` unchanged in signature, still call `lmStartStation()`
- **Zero breaking changes** to the LM UI — cards, waveform, channel bar, np-card all work identically

**Files:** `bundle.js`

### Fluid Adaptive Header System
**Problem:** Hamburger `≡` was being clipped off the right edge on 390px screens. Root: `header-right` needed ~314px but had ~230px available. Fragmented fixes lived across `style.css` (line 113), `mobile.css` lines 155–163 and 668–683 — three conflicting sources of truth.

**Fix:** Complete rebuild as a single fluid system in `style.css`:

- **≤900px:** Nav hidden, `live-dot` hidden, `minimal-btn` hidden → hamburger appears
- **≤768px:** `sign-in-btn` hidden (moved to mobile drawer), theme toggle labels hidden
- **≤600px:** `header-clock` hidden, theme toggle shrinks to 40×24px
- **≤480px:** Theme toggle hidden entirely, `live-count` hidden → only logo + search + menu button remain

At 390px: 24px padding + 110px logo + 8px gap + 36px search + 6px gap + 44px menu = 228px. Screen is 390px. **82px headroom.** Menu button never clips.

`mobile.css` had two duplicate `@media (max-width:768px)` header blocks — both removed and replaced with a comment pointing to `style.css`.

`mobile-menu-btn` now has `width:44px; height:44px; flex-shrink:0` — touch target meets Apple HIG, never shrinks.

**Files:** `style.css`, `mobile.css`

### Updated Deployment Checklist
```
□ bundle.js        — replace (unified player, all previous fixes)
□ style.css        — replace (fluid header system, all previous fixes)
□ mobile.css       — replace (duplicate header blocks removed)
□ index.html       — replace (SEO, audio fix, nav links)
□ constellation.html — new file
□ radio-mini.html  — new file
□ manifest-mini.json — new file
```
