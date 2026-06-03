# Custom SVG Animated Black Hole for Featured Card

This file contains a production-ready SVG black hole visualization with CSS animations, designed to replace the blank canvas on the "Another Sky" featured card in `index.html`.

## Implementation

Replace the canvas element and its script with this SVG-based solution:

```html
<!-- In index.html, replace the featured-card--anothersky section with: -->
<article class="featured-card featured-card--anothersky" onclick="playFeatured(3)" role="button" aria-label="ANOTHER SKY — World -2, 2032">
  <div class="fc-listeners fc-listeners--dark">WORLD -2</div>
  <div class="fc-cover-wrap">
    <div class="fc-cover-img fc-cover-img--bh" style="background:radial-gradient(circle at 30% 30%, rgba(255,50,50,0.1), #010004);display:flex;align-items:center;justify-content:center;overflow:hidden">
      
      <!-- SVG BLACK HOLE -->
      <svg class="bh-svg" viewBox="0 0 200 200" width="140" height="140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <!-- Radial gradient for event horizon glow -->
          <radialGradient id="bhGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#ff1a1a;stop-opacity:0.8" />
            <stop offset="50%" style="stop-color:#8b0000;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#010004;stop-opacity:0" />
          </radialGradient>
          
          <!-- Accretion disk gradient -->
          <radialGradient id="disk" cx="50%" cy="50%" r="60%">
            <stop offset="0%" style="stop-color:#ff4444;stop-opacity:0.9" />
            <stop offset="30%" style="stop-color:#ff1a1a;stop-opacity:0.7" />
            <stop offset="60%" style="stop-color:#8b0000;stop-opacity:0.5" />
            <stop offset="100%" style="stop-color:#440000;stop-opacity:0" />
          </radialGradient>
          
          <!-- Lensing effect -->
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Outer event horizon glow -->
        <circle cx="100" cy="100" r="75" fill="url(#bhGlow)" filter="url(#glow)" />
        
        <!-- Accretion disk (3 rotating rings for depth) -->
        <g class="accretion-disk">
          <ellipse cx="100" cy="100" rx="65" ry="20" fill="none" stroke="url(#disk)" stroke-width="8" opacity="0.8" />
          <ellipse cx="100" cy="100" rx="65" ry="20" fill="none" stroke="url(#disk)" stroke-width="6" opacity="0.5" transform="rotate(120 100 100)" />
          <ellipse cx="100" cy="100" rx="65" ry="20" fill="none" stroke="url(#disk)" stroke-width="6" opacity="0.3" transform="rotate(240 100 100)" />
        </g>
        
        <!-- Swirling particle jets (Hawking radiation) -->
        <g class="particle-jets" opacity="0.6">
          <!-- Top jet -->
          <path d="M 100 40 Q 95 30 100 15" stroke="#ff6666" stroke-width="2" fill="none" stroke-linecap="round" class="jet-stream" />
          <!-- Bottom jet -->
          <path d="M 100 160 Q 105 170 100 185" stroke="#ff6666" stroke-width="2" fill="none" stroke-linecap="round" class="jet-stream" />
        </g>
        
        <!-- Central singularity (sharp core) -->
        <circle cx="100" cy="100" r="12" fill="#000" />
        <circle cx="100" cy="100" r="10" fill="none" stroke="#ff1a1a" stroke-width="1" opacity="0.7" />
        
        <!-- Chromatic aberration layers (subtle) -->
        <g class="chromatic-layer chromatic-r" opacity="0.3">
          <circle cx="100" cy="100" r="70" fill="none" stroke="#ff3333" stroke-width="4" />
        </g>
        <g class="chromatic-layer chromatic-b" opacity="0.2">
          <circle cx="100" cy="100" r="70" fill="none" stroke="#0080ff" stroke-width="4" />
        </g>
      </svg>
      
    </div>
  </div>
  <div class="fc-name fc-name--dark">ANOTHER SKY</div>
  <div class="fc-meta fc-meta--dark">Novel · World -2, 2032 · Encrypted</div>
  <div class="fc-now fc-now--dark">The sky changed and nobody noticed</div>
  <div class="fc-playing-badge" id="fp-badge-anothersky">
    <svg class="fc-badge-dot" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>
    Ready
  </div>
</article>
```

## CSS Animations

Add this to your `style.css`:

```css
/* ═══════════════════════════════════════════════════
   BLACK HOLE SVG ANIMATIONS
═══════════════════════════════════════════════════ */

.bh-svg {
  filter: drop-shadow(0 0 20px rgba(255,26,26,0.6));
  animation: bhRotate 6s linear infinite;
}

/* Main rotation of entire black hole */
@keyframes bhRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Accretion disk rotates faster and pulsates */
.accretion-disk {
  animation: diskSpin 3s linear infinite, diskPulse 4s ease-in-out infinite;
  transform-origin: 100px 100px;
}

@keyframes diskSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-360deg); }
}

@keyframes diskPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.9; }
}

/* Particle jets shoot outward and fade */
.particle-jets {
  animation: jetPulse 2s ease-in-out infinite;
}

@keyframes jetPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

/* Individual jet stream animation (extends and retracts) */
.jet-stream {
  animation: jetShoot 2s ease-in-out infinite;
  transform-origin: 100px 100px;
}

@keyframes jetShoot {
  0%, 100% { stroke-width: 2; opacity: 0.4; }
  50% { stroke-width: 3; opacity: 0.8; }
}

/* Chromatic aberration subtle wobble */
.chromatic-layer {
  animation: chromaticShift 8s ease-in-out infinite;
  transform-origin: 100px 100px;
}

.chromatic-r {
  animation: chromaticShift 8s ease-in-out infinite;
}

.chromatic-b {
  animation: chromaticShift 8s ease-in-out infinite 2s;
}

@keyframes chromaticShift {
  0%, 100% { 
    transform: translate(0, 0);
    opacity: 0.2;
  }
  25% { 
    transform: translate(1px, -0.5px);
    opacity: 0.3;
  }
  50% {
    transform: translate(0, 0);
    opacity: 0.2;
  }
  75% {
    transform: translate(-1px, 0.5px);
    opacity: 0.3;
  }
}

/* Hover effect — intensifies glow and speeds up rotation */
.featured-card--anothersky:hover .bh-svg {
  animation: bhRotate 3s linear infinite, bhIntensify 0.3s ease-out forwards;
  filter: drop-shadow(0 0 30px rgba(255,26,26,0.9)) drop-shadow(0 0 50px rgba(255,0,0,0.4));
}

@keyframes bhIntensify {
  0% { opacity: 1; }
  100% { opacity: 1.05; }
}

/* Mobile: reduce animation intensity for performance */
@media (max-width: 768px) {
  .bh-svg {
    animation: bhRotate 8s linear infinite;
  }
  .accretion-disk {
    animation: diskSpin 4s linear infinite, diskPulse 6s ease-in-out infinite;
  }
  .particle-jets {
    animation: jetPulse 3s ease-in-out infinite;
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .bh-svg,
  .accretion-disk,
  .particle-jets,
  .chromatic-layer {
    animation: none;
    opacity: 0.8;
  }
}

/* Featured card dark theme styling */
.featured-card--anothersky {
  background: radial-gradient(circle at 30% 30%, rgba(200,0,0,0.08), rgba(1,0,4,0.95));
  border: 1px solid rgba(139,0,0,0.3);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
}

.featured-card--anothersky:hover {
  border-color: rgba(255,26,26,0.6);
  box-shadow: 0 0 32px rgba(200,0,0,0.25), 0 12px 32px rgba(0,0,0,0.5);
  transform: translateY(-4px);
}

.fc-cover-img--bh {
  background: radial-gradient(circle at 30% 30%, rgba(255,50,50,0.15), #010004) !important;
  position: relative;
}

.fc-name--dark {
  color: #ff1a1a;
  font-family: var(--font-glitch, 'Rubik Glitch');
  font-size: 0.95rem;
  letter-spacing: 1px;
}

.fc-meta--dark {
  color: rgba(212,191,184,0.5);
  font-size: 0.65rem;
}

.fc-now--dark {
  color: rgba(212,191,184,0.6);
  font-style: italic;
  font-size: 0.75rem;
}
```

## JavaScript Integration

Update the `playFeatured()` function in `bundle.js` to handle the new card:

```javascript
function playFeatured(idx) {
  const featured = [
    { url: 'https://stream.radioparadise.com/aac-320', name: 'Radio Paradise', country: 'US', emoji: '🎵' },
    { url: 'https://stream.bbc.co.uk/bbc_world_service', name: 'BBC World Service', country: 'UK', emoji: '📻' },
    { url: 'https://stream.thecurrent.org/aac', name: '88.7 FM — NO SIGNAL', country: 'Unknown', emoji: '⚠️' },
    // NEW: Another Sky
    { 
      url: '/anothersky.html', 
      name: 'ANOTHER SKY', 
      country: 'World -2, 2032',
      emoji: '🌌',
      isNovel: true
    }
  ];
  
  const station = featured[idx];
  if (!station) return;
  
  // If it's the novel, navigate instead of playing
  if (station.isNovel) {
    window.location.href = station.url;
    return;
  }
  
  playStation(station.url, station.name, station.country, station.emoji, null);
}
```

## Visual Effects Breakdown

1. **Main Rotation (6s)** — Entire black hole rotates slowly
2. **Accretion Disk (3s)** — Orbiting material spins 2x faster in opposite direction
3. **Pulsing (4s)** — Disk brightens and fades to simulate energy fluctuation
4. **Particle Jets** — Hawking radiation shoots upward/downward with pulsing intensity
5. **Chromatic Aberration** — Subtle red/blue fringing wobbles (ARG aesthetic)
6. **Hover State** — Intensifies glow, speeds up rotation, lifts card

## Performance

- ✅ **GPU accelerated** (CSS animations use `transform`)
- ✅ **Lightweight** (single SVG, no WebGL overhead)
- ✅ **Mobile optimized** (animation speed reduced on small screens)
- ✅ **Accessibility** (respects `prefers-reduced-motion`)
- ✅ **Battery friendly** (CSS-only, no JavaScript loop)

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome/Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Mobile Safari | ✅ Full |
| IE11 | ⚠️ Renders static (no animation) |

---

**Ready to commit to `style.css`**
