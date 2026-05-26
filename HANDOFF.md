# WNCORE Radio — near_6_audit Handoff

## What This Session Fixed

### 1. Anime Page Bleed — Root Cause & Fix ✅

**Bug:** Previous Claude added `display:flex` to `.anime-page-root` in the base CSS. But `.page.active { display:block }` overwrites it on activation, breaking the flex layout. Worse: the flex on the base rule caused side panels to render in some browsers even when `display:none`.

**Fix:**
```css
/* Before — broken */
.anime-page-root { display: flex; ... }
.page.active { display: block }   /* killed the flex! */

/* After — correct */
.anime-page-root { flex-direction: row; ... }  /* no display here */
.page.active { display: block }
#page-anime.active { display: flex }           /* only anime page gets flex */
```

**HTML restructure:** Side panels now in correct DOM order: `left-panel → main-col → right-panel` (they were both above main-col before).

---

### 2. Trivsion — Now Actually Animated ✅

**Was:** Static images crossfading every 5s. No motion. Wikimedia URLs all returned 403 (hotlink blocked).

**Now has three layers of animation:**

| Layer | What | Detail |
|-------|------|--------|
| **Slideshow** | 10 Unsplash Japan/city photos | Shuffle on each visit, crossfade every 5.5s |
| **Ken Burns** | CSS `@keyframes tv-kenburns` | Slow scale + translate pan on each active slide |
| **Canvas particles** | rAF loop drawing petals + rain | 28 cherry blossom petals falling with swing physics, 18 rain streaks, all continuous |

**Image URLs:** Unsplash returns 403 from server-side curl (no Referer) but works correctly in-browser because the browser sends `Referer: https://wncoreradio.vercel.app/` automatically with CSS `background-image` loads. Wikimedia blocks all hotlinks regardless — removed entirely.

---

### 3. showPage Patch Chain — Timing Bug Fixed ✅

**Bug:** Trivision was patching `window.showPage` at IIFE execution time (script parse). But `p5ShowPage` installs itself inside `DOMContentLoaded → setTimeout(0)`, which runs *after* the IIFE. So trivision was in the wrong position in the chain — it captured a `showPage` that didn't yet have the p5 wipe effect.

**Fix:** Trivision patch now installs at `DOMContentLoaded → setTimeout(50)`, guaranteeing it wraps the complete chain:

```
User clicks nav
→ trivision (outermost, start/stop canvas)
  → p5ShowPage (wipe animation)
    → about-timer patch
      → favorites+transition patch
        → original showPage (DOM .active toggle)
```

---

## Full Audit Results

| Check | Result |
|-------|--------|
| `bundle.js` syntax | ✅ OK |
| `bundle_append.js` syntax | ✅ OK |
| `admin-panel.js` syntax | ✅ OK |
| `wncore-player.js` syntax | ✅ OK |
| `font-glitch.js` syntax | ✅ OK |
| `index.html` inline JS | ✅ OK |
| `radio-mini.html` inline JS | ✅ OK |
| `style.css` brace balance | ✅ depth=0 |
| `mobile.css` brace balance | ✅ depth=0 |
| All `getElementById()` refs | ✅ all IDs exist in DOM |
| Canvas double-start guard | ✅ `if (_canvasRaf) return` |
| Dead `initialized` var | ✅ removed |
| Wikimedia 403 URLs | ✅ replaced with Unsplash |
| showPage patch timing | ✅ `setTimeout(50)` after p5's `setTimeout(0)` |

---

## Files Changed This Session

- `bundle_append.js` — trivsion rewrite (canvas animation, patch timing fix, URL fix)
- `style.css` — trivsion CSS (Ken Burns, canvas z-index, `#page-anime.active` flex fix)
- `index.html` — anime page HTML restructure (panel order fixed, trivsion div kept)
- `mobile.css` — nav padding fix (carried from near_4)
- `radio-mini.html` — NCS circular visualizer (carried from near_4)

## Deploy Checklist

1. Push `near_6_audit.zip` contents to GitHub
2. Vercel auto-deploys
3. Navigate to Anime / J-Music — confirm:
   - Side panels appear left AND right of content
   - Banner shows crossfading Japan photos with slow pan
   - Cherry blossom petals + rain streaks animate continuously over banner
   - Switching to other pages stops the canvas loop (check DevTools performance)
4. Open DevTools → Performance while on anime page: canvas rAF should be ~60fps at low CPU
5. Navigate away: rAF should stop (no orphan frame in performance trace)
