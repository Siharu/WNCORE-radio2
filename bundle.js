/* ═══════════════════════════════════════════════════════════════════════
   WNCORE RADIO — bundle.js
   Unified script bundle. All JS merged and wrapper chains eliminated.
   ONE clean playStation. No race conditions. No defer loading conflicts.
   Generated: Mon May 11 08:37:43 UTC 2026
   ═══════════════════════════════════════════════════════════════════════ */

/* ━━━ main.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* ═══════════════════════════════════════════════════════
   WNCORE RADIO v3 — MAIN JS
   ARG / Radio hybrid frontend
═══════════════════════════════════════════════════════ */

// ─── RADIO BROWSER API — MIRROR RESOLVER ─────────────────────────────────
// all.api.radio-browser.info is a round-robin that can fail or CORS-block.
// We race 5 mirrors and cache the first one that responds.
const _API_MIRRORS = [
  'https://de1.api.radio-browser.info/json',
  'https://de2.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
  'https://all.api.radio-browser.info/json',
  'https://fr1.api.radio-browser.info/json',
];
let _a = _API_MIRRORS[0];
let _apiResolved = false;

async function _resolveApi() {
  if (_apiResolved) return _a;
  for (const mirror of _API_MIRRORS) {
    try {
      const r = await Promise.race([
        fetch(mirror + '/stats', { method: 'GET', cache: 'no-store' }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
      ]);
      if (r.ok) {
        _a = mirror; _apiResolved = true;
        console.debug('[WNCORE] API mirror resolved:', mirror);
        return _a;
      }
    } catch(e) { /* try next */ }
  }
  _apiResolved = true; // stop retrying
  return _a;
}
const _d = (function(){const p=['s','i','h','a','r','u','.','v','e','r','c','e','l','.','a','p','p'];return 'https://'+p.join('')})();

const audio = document.getElementById('audio');
let isPlaying=false, isDarkMode=false, isMinimal=false;
let currentStation=null, exposure=0, horrorTriggered=false;
let searchFilter='all', searchDebounce, mobileMenuOpen=false;
let _progressInterval = null;

function formatTime(s){
  if(!isFinite(s) || s < 0) return '00:00';
  const m = Math.floor(s/60); const sec = Math.floor(s%60);
  return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}

function startProgressSync(){
  const pbFill = document.getElementById('pb-fill');
  const pbTime = document.querySelector('.pb-time');
  if(!_progressInterval) {
    _progressInterval = setInterval(()=>{
      try{
        if(!audio) return;
        const dur = audio.duration;
        if(dur && isFinite(dur) && dur > 0){
          const pct = Math.max(0, Math.min(100, (audio.currentTime / dur) * 100));
          if(pbFill) pbFill.style.width = pct + '%';
          if(pbTime) pbTime.textContent = `${formatTime(audio.currentTime)} / ${formatTime(dur)}`;
          if(pbFill) pbFill.classList.remove('playing');
          if(pbTime) pbTime.classList.remove('live');
        } else {
          // Live stream — show steady state without misleading progress
          if(pbFill) pbFill.style.width = '100%';
          if(pbTime) pbTime.textContent = 'LIVE';
          if(pbFill) pbFill.classList.add('playing');
          if(pbTime) pbTime.classList.add('live');
        }
      }catch(e){}
    }, 500);
  }
}

function stopProgressSync(){
  const pbFill = document.getElementById('pb-fill');
  const pbTime = document.querySelector('.pb-time');
  if(_progressInterval){ clearInterval(_progressInterval); _progressInterval = null; }
  if(pbFill) { pbFill.style.width = '0%'; pbFill.classList.remove('playing'); }
  if(pbTime) { pbTime.textContent = 'LIVE'; pbTime.classList.remove('live'); }
}

// ─── ANTI-SAVE PROTECTION ────────────────────────────────────────────────
document.addEventListener('contextmenu', e => {
  if(e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.closest('video')) {
    e.preventDefault();
    return false;
  }
});
document.addEventListener('dragstart', e => {
  if(e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.closest('video')) {
    e.preventDefault();
    return false;
  }
});
document.addEventListener('keydown', e => {
  if((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    return false;
  }
});
document.querySelectorAll('img, video').forEach(el => {
  el.style.userSelect = 'none';
  el.style.webkitUserSelect = 'none';
  el.ondragstart = () => false;
});

// ─── ABOUT PAGE EYE TRACKING ──────────────────────────────────────────────
const aboutEyesContainer = document.getElementById('about-eyes-container');
const aboutEyePupil = document.getElementById('about-eye-pupil');
let aboutEyeActive = false;
let aboutEyeLastX = window.innerWidth / 2;
let aboutEyeLastY = window.innerHeight / 2;
let aboutEyeAnimFrame = null;
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function initAboutEyes() {
  const aboutPage = document.getElementById('page-about');
  if(!aboutPage) return;
  
  // Show eyes randomly when about page is active
  if(aboutPage.classList.contains('active')) {
    if(Math.random() < 0.6) { // 60% chance to show eyes
      showAboutEyes();
    }
  }
}

function showAboutEyes() {
  if(aboutEyeActive) return;
  aboutEyeActive = true;
  
  // Random position on screen
  const x = Math.random() * (window.innerWidth - 200);
  const y = Math.random() * (window.innerHeight - 200);
  
  aboutEyesContainer.style.left = x + 'px';
  aboutEyesContainer.style.top = y + 'px';
  aboutEyesContainer.style.display = 'block';
  
  if(isMobileDevice) {
    startAboutEyeRandomLook();
  } else {
    startAboutEyeTracking();
  }
}

function hideAboutEyes() {
  aboutEyeActive = false;
  aboutEyesContainer.style.display = 'none';
  if(aboutEyeAnimFrame) cancelAnimationFrame(aboutEyeAnimFrame);
}

function startAboutEyeTracking() {
  function trackMouse(e) {
    if(!aboutEyeActive) {
      document.removeEventListener('mousemove', trackMouse);
      return;
    }
    aboutEyeLastX = e.clientX;
    aboutEyeLastY = e.clientY;
    updateAboutEyePupil();
  }
  
  function updateAboutEyePupil() {
    const rect = aboutEyesContainer.getBoundingClientRect();
    const eyeCenterX = rect.left + rect.width / 2;
    const eyeCenterY = rect.top + rect.height / 2;
    
    const dx = aboutEyeLastX - eyeCenterX;
    const dy = aboutEyeLastY - eyeCenterY;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    
    const maxOffset = 20; // Max pupil movement
    // Negate offsets: pupil tracks toward mouse but stays inside iris
    const offsetX = -(Math.cos(angle) * Math.min(distance * 0.1, maxOffset));
    const offsetY = -(Math.sin(angle) * Math.min(distance * 0.1, maxOffset));
    
    aboutEyePupil.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }
  
  document.addEventListener('mousemove', trackMouse);
  updateAboutEyePupil();
}

function startAboutEyeRandomLook() {
  function randomGaze() {
    if(!aboutEyeActive) return;
    
    // Random angle and distance for mobile
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 40;
    
    const maxOffset = 20;
    // Negate: pupil stays inside iris (same fix as desktop tracking)
    const offsetX = -(Math.cos(angle) * Math.min(distance * 0.1, maxOffset));
    const offsetY = -(Math.sin(angle) * Math.min(distance * 0.1, maxOffset));
    
    aboutEyePupil.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    
    // Change gaze every 1-3 seconds
    setTimeout(randomGaze, 1000 + Math.random() * 2000);
  }
  
  randomGaze();
}

// Trigger eyes when about page is viewed
const pageAbout = document.getElementById('page-about');
if(pageAbout) {
  const observer = new MutationObserver(() => {
    if(pageAbout.classList.contains('active') && !aboutEyeActive) {
      setTimeout(initAboutEyes, 500);
    } else if(!pageAbout.classList.contains('active')) {
      hideAboutEyes();
    }
  });
  observer.observe(pageAbout, {attributes: true, attributeFilter: ['class']});
}

// ─── STATION DATA ─────────────────────────────────────────────────────────
const FEATURED = [
  {url:'https://stream.radioparadise.com/aac-320',name:'Radio Paradise',meta:'Rock / Eclectic · California, US',emoji:'🇺🇸'},
  {url:'https://stream.bbc.co.uk/bbc_world_service',name:'BBC World Service',meta:'News / Talk · London, UK',emoji:'🇬🇧'},
  {url:null,name:'88.7 FM — Signal Lost',meta:'UNKNOWN ORIGIN · ——kbps',emoji:'📻'}
];

const ANIME_STATIONS = [
  {name:'Anime Koi Radio',desc:'Non-stop anime OSTs & J-Pop',emoji:'🌸',badge:'live',url:'https://listen.moe/stream'},
  {name:'Listen.moe K-Pop',desc:'K-Pop & J-Pop crossover',emoji:'💜',badge:'jpop',url:'https://listen.moe/kpop/stream'},
  {name:'Nightwave Plaza',desc:'Future funk, city pop, vaporwave',emoji:'🌆',badge:'jpop',url:'https://radio.plaza.one/mp3'},
  {name:'Yggdrasil Lo-Fi',desc:'Study beats · anime aesthetic',emoji:'🌿',badge:'lofi',url:'https://pool.nightwave.io/plaza.mp3'},
  {name:'J1 Hits',desc:'Japanese J-Pop hits, live',emoji:'🎌',badge:'jpop',url:'https://listen.radioking.com/radio/285028/stream/330334'},
  {name:'Akiba Radio',desc:'Anime music 24/7',emoji:'⛩️',badge:'live',url:'https://stream.radioking.com/akibaradio'}
];

const ANIME_IMGS = [
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=70',
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=70',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400&q=70',
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=70',
  'https://images.unsplash.com/photo-1550399105-c4db5952235a?w=400&q=70',
  'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400&q=70',
  'https://images.unsplash.com/photo-1555952238-7c1b0b83eb18?w=400&q=70',
  'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=400&q=70',
];
const ANIME_BANNER_IMGS = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&q=80',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=80',
];

// ─── GENRE STRIP DATA (worldwide) ─────────────────────────────────────────
const GENRE_TAGS = [
  {label:'All Stations',tag:'',icon:'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'},
  {label:'Jazz',tag:'jazz',icon:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'},
  {label:'Classical',tag:'classical',icon:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'},
  {label:'Pop',tag:'pop',icon:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'},
  {label:'Rock',tag:'rock',icon:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'},
  {label:'Electronic',tag:'electronic',icon:'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'},
  {label:'Hip-Hop',tag:'hiphop',icon:'<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>'},
  {label:'Ambient',tag:'ambient',icon:'<circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>'},
  {label:'News',tag:'news',icon:'<path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a4 4 0 01-4-4V6a2 2 0 012-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/>'},
  {label:'Talk',tag:'talk',icon:'<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'},
  {label:'Country',tag:'country',icon:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'},
  {label:'R&B',tag:'rnb',icon:'<path d="M3 18v-6a9 9 0 0118 0v6"/>'},
  {label:'Metal',tag:'metal',icon:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'},
  {label:'Reggae',tag:'reggae',icon:'<circle cx="12" cy="12" r="10"/>'},
  {label:'J-Pop',tag:'jpop',icon:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'},
  {label:'Anime',tag:'anime',icon:'<circle cx="12" cy="12" r="10"/>'},
  {label:'Lo-Fi',tag:'lofi',icon:'<path d="M3 18v-6a9 9 0 0118 0v6"/>'},
  {label:'Folk',tag:'folk',icon:'<path d="M9 18V5l12-2v13"/>'},
  {label:'80s',tag:'80s',icon:'<rect x="2" y="3" width="20" height="14" rx="2"/>'},
  {label:'90s',tag:'90s',icon:'<rect x="2" y="3" width="20" height="14" rx="2"/>'},
];

// ─── SVG ICONS ────────────────────────────────────────────────────────────
const SVG = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>',
  radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  sun: '<svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>',
  moon: '<svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>',
  volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  heartFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  moon2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  sakura: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2C10 5 8 7 5 7c3 0 5 2 7 5-2-3-4-5-7-5 3 0 5 2 7 5-2-3-2-7 0-10z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

// ─── GLOBE ────────────────────────────────────────────────────────────────
const IS_MOBILE_DEVICE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || ('ontouchstart' in window && window.innerWidth <= 900);

let globe;
const globeContainer = document.getElementById('globe-container');
function initGlobeWhenReady() {
  if (globeContainer) {
  if (IS_MOBILE_DEVICE) {
    // On mobile: show a static placeholder, skip Three.js/WebGL globe entirely
    // to prevent freezing and high GPU/memory usage
    globeContainer.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
    globeContainer.innerHTML = `
      <style>
        @keyframes wnc-ring-pulse {
          0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 0.7; }
          100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
        }
        @keyframes wnc-bar-wave {
          0%,100% { transform: scaleY(0.3); }
          50%      { transform: scaleY(1); }
        }
        @keyframes wnc-dot-blink {
          0%,100% { opacity:1; } 50% { opacity:0.2; }
        }
        .wnc-mob-ring {
          position: absolute;
          top: 50%; left: 50%;
          width: 120px; height: 120px;
          border-radius: 50%;
          border: 1px solid rgba(200,71,42,0.35);
          animation: wnc-ring-pulse 3s ease-out infinite;
          pointer-events: none;
        }
        .wnc-mob-ring:nth-child(2) { animation-delay: 1s; }
        .wnc-mob-ring:nth-child(3) { animation-delay: 2s; }
        .wnc-mob-bars {
          position: absolute;
          bottom: 28px; right: 24px;
          display: flex; align-items: flex-end; gap: 3px;
        }
        .wnc-mob-bar {
          width: 3px; background: rgba(200,71,42,0.5);
          border-radius: 2px; transform-origin: bottom;
        }
      </style>

      <!-- Pulsing rings -->
      <div class="wnc-mob-ring"></div>
      <div class="wnc-mob-ring"></div>
      <div class="wnc-mob-ring"></div>

      <!-- Center node -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">
        <div style="width:8px;height:8px;border-radius:50%;background:#c8472a;margin:0 auto 10px;animation:wnc-dot-blink 1.4s step-end infinite;box-shadow:0 0 12px rgba(200,71,42,0.6);"></div>
        <div style="font-family:'DM Mono',monospace;font-size:0.52rem;letter-spacing:3px;color:rgba(200,71,42,0.5);text-transform:uppercase;">Signal Active</div>
        <div style="font-family:'DM Mono',monospace;font-size:0.44rem;letter-spacing:2px;color:rgba(255,255,255,0.18);margin-top:4px;">88.700 MHz · NODE 09</div>
      </div>

      <!-- EQ bars bottom right -->
      <div class="wnc-mob-bars">
        ${[18,28,14,34,22,30,16,26,12,20].map((h,i) =>
          `<div class="wnc-mob-bar" style="height:${h}px;animation:wnc-bar-wave ${0.6+i*0.07}s ease-in-out infinite;animation-delay:${i*0.06}s;"></div>`
        ).join('')}
      </div>
    `;
  } else {
    try {
      globe = Globe()(globeContainer)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .atmosphereColor('#1e40af').atmosphereAltitude(0.18)
        .onGlobeClick(async ({ lat, lng }) => {
          updateStatus('SCANNING FREQUENCIES...');
          exposure += 5;
          try {
            // Reverse-geocode the lat/lng to a country using a free public API
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json`, {
              headers: { 'Accept-Language': 'en' }
            });
            const geo = await geoRes.json();
            const countryCode = geo?.address?.country_code?.toUpperCase();
            let r, d;
            if (countryCode) {
              r = await fetch(`${_a}/stations/search?limit=10&https=true&order=clickcount&reverse=true&countrycode=${countryCode}`);
              d = await r.json();
            }
            // Fallback to global random if no country stations found
            if (!d || !d.length) {
              r = await fetch(`${_a}/stations/search?limit=1&https=true&order=clickcount&reverse=true&offset=${Math.floor(Math.random()*200)}`);
              d = await r.json();
            }
            const station = d[Math.floor(Math.random() * Math.min(d.length, 5))];
            if (station) playStation(station.url_resolved, station.name, station.country || 'Unknown', getCountryEmoji(countryCode || station.countrycode));
          } catch(e) { updateStatus('LOCK FAILED — SIGNAL DEGRADED'); }
        });
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.35;
      globe.controls().enableZoom = false; // disable zoom to prevent accidental pinch issues
      globe.pointOfView({altitude:2.2});
    } catch(e) {}
  }
  }
}
document.addEventListener('globe-ready', initGlobeWhenReady);

// ─── GENRE STRIP ──────────────────────────────────────────────────────────
function buildGenreStrip() {
  const strip = document.getElementById('genre-strip');
  strip.innerHTML = GENRE_TAGS.map(g => `
    <button class="genre-btn${g.tag===''?' active':''}" data-genre="${g.tag}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${g.icon}</svg>
      ${g.label}
    </button>`).join('');
  strip.addEventListener('click', e => {
    const btn = e.target.closest('.genre-btn');
    if(!btn) return;
    document.querySelectorAll('.genre-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    loadStations(btn.dataset.genre);
  });
}

// ─── STATION LOADING ──────────────────────────────────────────────────────
// Top charts cache — rotate every page load so it never shows same stations
const CHART_CACHE_KEY = 'wncore_charts_v3';
let chartsData = null;

async function loadStations(genre='') {
  const tbody = document.getElementById('station-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text3);font-size:0.8rem;">Loading stations…</td></tr>`;
  try {
    const api = await _resolveApi();
    const offset = Math.floor(Math.random()*30);
    const tag = genre ? `&tag=${encodeURIComponent(genre)}` : '';
    const fetchWithTimeout = url => Promise.race([
      fetch(url),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
    ]);
    let d;
    try {
      const r = await fetchWithTimeout(`${api}/stations/search?limit=20&https=true&order=clickcount&reverse=true${tag}&offset=${genre?0:offset}`);
      if (!r.ok) throw new Error('status ' + r.status);
      d = await r.json();
    } catch(innerErr) {
      // Try one more mirror
      const fallback = _API_MIRRORS.find(m => m !== api);
      if (fallback) {
        const r2 = await fetchWithTimeout(`${fallback}/stations/search?limit=20&https=true&order=clickcount&reverse=true${tag}&offset=${genre?0:offset}`);
        d = await r2.json();
        _a = fallback;
      } else throw innerErr;
    }
    // Filter stations with no valid playable URL before rendering
    const playable = d.filter(s => s.url_resolved && s.url_resolved.startsWith('http'));
    renderTable(playable.length ? playable : d, 'station-tbody');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text3);font-size:0.8rem;">Signal degraded. <span style="cursor:pointer;color:var(--accent)" onclick="loadStations('')">Retry</span></td></tr>`;
  }
}

// Task 3.2: Charts pagination state
let _chartsOffset = 0;
const _CHARTS_PAGE_SIZE = 100;
let _chartsLoading = false;
let _chartsExhausted = false;

async function loadChartsPage() {
  const tbody = document.getElementById('charts-tbody');
  if(chartsData) { renderTable(chartsData,'charts-tbody'); _attachChartsPagination(tbody); return; }
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text3);font-size:0.8rem;">Loading top charts...</td></tr>`;

  const CHARTS_FALLBACK = [
    { name:'Radio Paradise', country:'US', codec:'AAC', bitrate:320, votes:999, url_resolved:'https://stream.radioparadise.com/aac-320', tags:'eclectic' },
    { name:'BBC World Service', country:'GB', codec:'MP3', bitrate:128, votes:990, url_resolved:'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', tags:'news' },
    { name:'SomaFM Groove Salad', country:'US', codec:'MP3', bitrate:128, votes:980, url_resolved:'https://ice4.somafm.com/groovesalad-128-mp3', tags:'ambient' },
    { name:'181.fm — Jazz', country:'US', codec:'MP3', bitrate:128, votes:960, url_resolved:'https://listen.181fm.com/181-jazz_128k.mp3', tags:'jazz' },
    { name:'WNYC 93.9 FM', country:'US', codec:'MP3', bitrate:128, votes:950, url_resolved:'https://fm939.wnyc.org/wnycfm.aac', tags:'public radio' },
  ];

  _chartsOffset = 0; _chartsExhausted = false;
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000));
  try {
    const fetchPromise = fetch(`${_a}/stations/search?limit=${_CHARTS_PAGE_SIZE}&https=true&order=clickcount&reverse=true&offset=0`).then(r=>r.json());
    const d = await Promise.race([fetchPromise, timeout]);
    chartsData = d;
    _chartsOffset = d.length;
    if (d.length < _CHARTS_PAGE_SIZE) _chartsExhausted = true;
    renderTable(d, 'charts-tbody');
    _attachChartsPagination(tbody);
  } catch(e) {
    chartsData = CHARTS_FALLBACK;
    renderTable(CHARTS_FALLBACK, 'charts-tbody');
    const note = document.createElement('tr');
    note.innerHTML = `<td colspan="7" style="text-align:center;padding:8px 24px 16px;color:var(--text3);font-size:0.72rem;opacity:0.6;">Station index unavailable — showing curated selection · <span style="cursor:pointer;color:var(--accent)" onclick="chartsData=null;loadChartsPage()">Reload live charts</span></td>`;
    tbody.appendChild(note);
  }
}

async function _loadMoreCharts() {
  if (_chartsLoading || _chartsExhausted) return;
  const tbody = document.getElementById('charts-tbody');
  const btn = document.getElementById('charts-load-more-btn');
  if (!tbody) return;
  _chartsLoading = true;
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
  try {
    const r = await fetch(`${_a}/stations/search?limit=${_CHARTS_PAGE_SIZE}&https=true&order=clickcount&reverse=true&offset=${_chartsOffset}`);
    const d = await r.json();
    if (!d || d.length === 0) { _chartsExhausted = true; if(btn) btn.remove(); return; }
    _chartsOffset += d.length;
    if (d.length < _CHARTS_PAGE_SIZE) _chartsExhausted = true;
    // Remove the load-more row before appending new rows
    const oldRow = document.getElementById('charts-load-more-row');
    if (oldRow) oldRow.remove();
    chartsData = [...(chartsData||[]), ...d];
    // Append new rows directly (renderTable would overwrite the table)
    const playable = d.filter(s => s.url_resolved && s.url_resolved.startsWith('http'));
    playable.forEach((s, i) => {
      const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(s.countrycode) : '📻';
      const tags = (s.tags||'').split(',').slice(0,2).filter(t=>t.trim()).map(t=>`<span class="st-tag">${escHtml(t.trim())}</span>`).join('');
      const tr = document.createElement('tr');
      tr.className = 'station-row';
      tr.dataset.bitrate = s.bitrate || 0;
      const cover = typeof stationCoverHtml === 'function' ? stationCoverHtml(s, 32) : '';
      const rowNum = _chartsOffset - d.length + i + 1;
      tr.innerHTML = `
        <td class="st-num">${rowNum}</td>
        <td class="st-eq"><div class="st-eq-bars"><span></span><span></span><span></span></div></td>
        <td class="st-cover-cell">${cover}</td>
        <td><div class="st-name">${escHtml(s.name)}</div><div class="st-tags">${tags}</div></td>
        <td class="st-country">${escHtml(s.country||'—')}</td>
        <td class="st-bitrate">${s.bitrate?s.bitrate+'k':'—'}</td>
        <td><button class="st-play-btn" aria-label="Play" onclick="event.stopPropagation()">${typeof SVG!=='undefined'?SVG.play:'▶'}</button></td>`;
      tr.onclick = () => playStation(s.url_resolved, s.name, s.country||'Unknown', emoji, s.favicon||null);
      tbody.appendChild(tr);
    });
    if (!_chartsExhausted) _attachChartsPagination(tbody);
  } catch(e) {
    if(btn) { btn.textContent = 'Load more'; btn.disabled = false; }
  } finally {
    _chartsLoading = false;
  }
}

function _attachChartsPagination(tbody) {
  if (_chartsExhausted) return;
  const existing = document.getElementById('charts-load-more-row');
  if (existing) existing.remove();
  const row = document.createElement('tr');
  row.id = 'charts-load-more-row';
  row.innerHTML = `<td colspan="7" style="text-align:center;padding:16px 0;">
    <button id="charts-load-more-btn" onclick="_loadMoreCharts()" style="font-family:'DM Mono',monospace;font-size:0.72rem;letter-spacing:1px;padding:8px 20px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text2);cursor:pointer;transition:all 0.15s">
      LOAD MORE — ${_chartsOffset.toLocaleString()} of 12,000+ stations
    </button>
  </td>`;
  tbody.appendChild(row);
}


function stationGradient(tags, name) {
  const tag = (tags || '').split(',')[0].trim().toLowerCase();
  const map = {
    jazz: ['#b45309','#92400e'], rock: ['#7c3aed','#4c1d95'],
    ambient: ['#0f766e','#134e4a'], news: ['#1d4ed8','#1e3a8a'],
    classical: ['#9f1239','#881337'], anime: ['#be185d','#9d174d'],
    electronic: ['#6d28d9','#4c1d95'], pop: ['#db2777','#9d174d'],
    talk: ['#0369a1','#0c4a6e'], country: ['#b45309','#78350f'],
    metal: ['#374151','#111827'], folk: ['#166534','#14532d'],
    hip: ['#7c2d12','#431407'], latin: ['#b91c1c','#7f1d1d'],
    default: ['#374151','#1f2937']
  };
  const colors = map[tag] || map.default;
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
}

function stationCoverHtml(s, size) {
  const sz = size || 32;
  const grad = stationGradient(s.tags, s.name);
  const initial = escHtml((s.name||'?')[0].toUpperCase());
  // In minimal mode, skip image entirely — don't even request the URL
  if (document.body.classList.contains('minimal-mode')) {
    return `<div class="st-cover" style="width:${sz}px;height:${sz}px;background:${grad}"><span class="st-cover-init">${initial}</span></div>`;
  }
  if (s.favicon && s.favicon.startsWith('http')) {
    return `<div class="st-cover" style="width:${sz}px;height:${sz}px;background:${grad}"><img src="${escHtml(s.favicon)}" width="${sz}" height="${sz}" loading="lazy" onerror="this.style.display='none'"></div>`;
  }
  return `<div class="st-cover" style="width:${sz}px;height:${sz}px;background:${grad}"><span class="st-cover-init">${initial}</span></div>`;
}

function renderTable(stations, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';
  stations.forEach((s, i) => {
    const tags = (s.tags||'').split(',').slice(0,2).filter(t=>t.trim()).map(t=>`<span class="st-tag">${escHtml(t.trim())}</span>`).join('');
    const emoji = getCountryEmoji(s.countrycode);
    const tr = document.createElement('tr');
    tr.className = 'station-row';
    tr.dataset.bitrate = s.bitrate || 0;
    tr.innerHTML = `
      <td class="st-num">${i+1}</td>
      <td class="st-eq"><div class="st-eq-bars" id="eq-${i}-${tbodyId}"><span></span><span></span><span></span></div></td>
      <td class="st-cover-cell">${stationCoverHtml(s, 32)}</td>
      <td><div class="st-name">${escHtml(s.name)}</div><div class="st-tags">${tags}</div></td>
      <td class="st-country">${escHtml(s.country||'—')}</td>
      <td class="st-bitrate">${s.bitrate?s.bitrate+'k':'—'}</td>
      <td><button class="st-play-btn" aria-label="Play">${SVG.play}</button></td>`;
    tr.onclick = () => playStation(s.url_resolved, s.name, s.country||'Unknown', emoji, s.favicon||null);
    tbody.appendChild(tr);
  });
  // Re-apply low-bandwidth filter if active (M3)
  if (window._wncLowBwMode) {
    const MAX_BR = 96;
    tbody.querySelectorAll('tr.station-row[data-bitrate]').forEach(row => {
      const br = parseInt(row.dataset.bitrate) || 0;
      row.style.display = (br > 0 && br > MAX_BR) ? 'none' : '';
    });
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function escHtml(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function getCountryEmoji(code){
  if(!code||code.length!==2) return '📻';
  const o=127397;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c=>c.charCodeAt(0)+o));
}

// ─── PLAYBACK ─────────────────────────────────────────────────────────────
function playStation(url, name, meta, emoji, favicon, _onSuccess, _onFail) {
  if (!url || !url.startsWith('http')) {
    updateStatus('NO SIGNAL');
    const npTrack = document.getElementById('np-track');
    if (npTrack) npTrack.textContent = '— station offline —';
    if (_onFail) _onFail();
    return;
  }
  currentStation = {url, name, meta, emoji: emoji||'📻', favicon: favicon||null};

  // Immediately show the player bar on mobile when a station is selected
  const _pb = document.querySelector('.player-bar');
  const _bn = document.querySelector('.mobile-bottom-nav');
  if (_pb) _pb.classList.add('pb-active');
  if (_bn) _bn.classList.add('pb-active');

  // Stop current stream cleanly before switching
  audio.pause();
  audio.src = '';
  // Changing audio.src detaches the MediaElementSourceNode on some browsers.
  // Reset _eqConnected so initEQ() re-wires the graph on the next openEQPanel() call.
  if (typeof _eqConnected !== 'undefined') _eqConnected = false;

  // If Live Music was active and this call is NOT coming from LM itself, reset LM UI
  if (lmIsPlaying && !_onSuccess) {
    lmIsPlaying = false;
    lmCurrentChannel = null;
    lmSetWaveformState(false);
    const iconEl = document.getElementById('lm-play-icon');
    const npCard = document.getElementById('lm-np-card');
    if (iconEl) iconEl.setAttribute('d','M8 5v14l11-7z');
    if (npCard) npCard.classList.remove('playing');
  }

  updateStatus('CONNECTING…');
  document.getElementById('np-track').textContent = '— buffering —';

  // Small defer lets the browser fully release the old stream before loading new one
  setTimeout(() => {
    audio.src = url;
    audio.volume = parseFloat(document.getElementById('vol-slider')?.value ?? 0.8);

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isPlaying = true;
        window.isPlaying = true; // FIX: sync window.isPlaying so PWA prompt works
        if (_onSuccess) _onSuccess();
        if (window._broadcastStation) window._broadcastStation(name); // Option A: live station tracking
        updateUI(name, meta, emoji||'📻', currentStation.favicon);
        updateMiniPlayerVisibility();
        // NOTE: applyStationSecondaryEffects removed from here — it called initAudioFX()
        // unconditionally which broke CORS-restricted streams. Now only called for horror stations.
        if (name && meta) {
          const combined = (name + meta).toLowerCase();
          if (combined.includes('horror') || combined.includes('paranormal') || combined.includes('creepy')) {
            applyStationSecondaryEffects(name, meta);
          }
        }
        exposure += 8 + (window._corruptionBoost || 0);
        // One-time swipe hint on mobile after first successful play
        if (/Mobi|Android/i.test(navigator.userAgent) && !localStorage.getItem('wncore-swipe-hint')) {
          setTimeout(() => {
            localStorage.setItem('wncore-swipe-hint', '1');
            const t = document.createElement('div');
            t.textContent = 'Swipe left / right to change station';
            t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 18px;border-radius:8px;font-size:0.82rem;z-index:9999;pointer-events:none;white-space:nowrap;';
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 3500);
          }, 1200);
        }
      }).catch(err => {
        // FIX: AbortError means our own pause() cancelled the old play — not an error.
        // Do NOT retry on AbortError; that created an infinite retry loop before.
        if (err && err.name === 'AbortError') return;
        isPlaying = false;
        window.isPlaying = false;
        updateStatus('STREAM UNAVAILABLE');
        const npTrack = document.getElementById('np-track');
        if (npTrack) npTrack.textContent = '— signal lost —';
        if (_onFail) _onFail();
      });
    }
  }, 50);
}

function applyStationSecondaryEffects(name, meta) {
  if (!name || !meta) return;
  const combined = (name + meta).toLowerCase();
  
  // Horror/paranormal stations: apply slight distortion on start
  if (combined.includes('horror') || combined.includes('paranormal') || combined.includes('creepy')) {
    try {
      initAudioFX();
      if (waveshaper) {
        waveshaper.curve = makeDistortionCurve(40);
        setTimeout(() => {
          if (waveshaper) waveshaper.curve = makeDistortionCurve(0);
        }, 3000);
      }
    } catch(e) {}
    // Trigger ticker anomaly
    if (HORROR.stage >= 1) insertTickerAnomaly('PARANORMAL FREQUENCY DETECTED');
  }
  
  // Japan stations: increase wrongness probability slightly
  if (combined.includes('japan') || combined.includes('jp') || combined.includes('j-pop') || combined.includes('anime')) {
    if (window.WRONGNESS && typeof window.WRONGNESS.spike === 'function') {
      window.WRONGNESS.spike(3); // Boost wrongness by 3% for Japan stations
    }
  }
}

function playFeatured(idx) {
  const s = FEATURED[idx];
  document.querySelectorAll('[id^="fp-badge-"]').forEach(b=>b.classList.remove('show'));
  document.getElementById(`fp-badge-${idx}`).classList.add('show');
  
  // ARG TRIGGER: Only trigger horror sequence when clicking 88.7 FM (idx 2)
  if(idx === 2 && !horrorTriggered) {
    triggerHorrorSequence();
  } else {
    playStation(s.url, s.name, s.meta, s.emoji);
  }
}
function playRec(url, name, meta) { playStation(url, name, meta, '📻'); }

// Expose on window immediately so unified hook and any window.playStation callers work
window.playStation = playStation;
window.togglePlay = togglePlay;
window.skipStation = skipStation;
window.playRec = playRec;

function play887Static() {
  exposure += 20;
  updateUI('88.7 FM', 'Signal Lost', '📻', null);
  document.getElementById('np-track').textContent = '— static —';

  // ── 88.7 SPECIAL BEHAVIOR ──────────────────────────────────────────────────
  // 1. UI lag spike — freeze player name, glitch through states
  const pbName = document.getElementById('pb-name');
  const npTrack = document.getElementById('np-track');
  const lagStates = ['CONNECTING…','LOCATING SIGNAL…','HANDSHAKE FAILED','REROUTING…','CARRIER DETECTED','88.700 MHz'];
  let lagIdx = 0;
  pbName.textContent = 'CONNECTING…';
  const lagInt = setInterval(() => {
    if (lagIdx < lagStates.length) { pbName.textContent = lagStates[lagIdx++]; }
    else { clearInterval(lagInt); pbName.textContent = '88.7 FM — Signal Lost'; }
  }, 280);

  // 2. Distorted audio start — heavy distortion that never fully resolves
  setTimeout(() => {
    try {
      initAudioFX();
      if (audioCtx && waveshaper && lowpass && gainNode) {
        waveshaper.curve = makeDistortionCurve(380);
        const now = audioCtx.currentTime;
        lowpass.frequency.setValueAtTime(800, now);
        // Gain flutter — intermittent signal
        gainNode.gain.setValueAtTime(0.0, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.3);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.6);
        gainNode.gain.linearRampToValueAtTime(0.6, now + 0.9);
        gainNode.gain.linearRampToValueAtTime(0.0, now + 1.4);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 1.8);
        // Decay distortion to a still-degraded level — never clean
        let distAmt = 380;
        const distDecay = setInterval(() => {
          distAmt = Math.max(120, distAmt - 18);
          if (waveshaper) waveshaper.curve = makeDistortionCurve(distAmt);
          if (distAmt <= 120) clearInterval(distDecay);
        }, 120);
      }
    } catch(e) {}
  }, 400);

  // 3. Message sequence — feels like a transmission coming through
  setTimeout(() => { npTrack.textContent = '— no carrier —'; }, 1200);
  setTimeout(() => { npTrack.textContent = '— signal intercepted —'; }, 2200);
  setTimeout(() => { npTrack.textContent = '"...they lied to us... send help... any way possible..."'; }, 2800);

  // 4. Body outline flicker — 3 red pulses, deniable
  let flickCount = 0;
  const flickInt = setInterval(() => {
    document.body.style.outline = flickCount % 2 === 0 ? '1px solid rgba(200,71,42,0.6)' : '';
    if (++flickCount >= 6) { clearInterval(flickInt); document.body.style.outline = ''; }
  }, 220);
}

function updateUI(name, meta, emoji, favicon) {
  document.getElementById('pb-name').textContent = name;
  document.getElementById('np-name').textContent = name;
  document.getElementById('pb-meta').textContent = meta;
  document.getElementById('np-meta').textContent = meta;
  // Update mini-player (mobile sticky player)
  const miniName = document.getElementById('mini-name');
  const miniMeta = document.getElementById('mini-meta');
  if(miniName) miniName.textContent = name;
  if(miniMeta) miniMeta.textContent = meta;
  // Task 2.1: Render station favicon art if available, otherwise fallback to SVG radio icon
  function _artHtml(size) {
    if (favicon && favicon.startsWith('http')) {
      return `<img src="${escHtml(favicon)}" width="${size}" height="${size}" style="width:100%;height:100%;object-fit:cover;border-radius:${size>36?'8px':'6px'}" onerror="this.parentElement.innerHTML='${SVG.radio.replace(/'/g,'\\\'')}'">`;
    }
    return SVG.radio;
  }
  const pbArt = document.getElementById('pb-art');
  const npArt = document.getElementById('np-art-icon');
  if(pbArt) pbArt.innerHTML = _artHtml(40);
  if(npArt) npArt.innerHTML = _artHtml(64);
  document.getElementById('np-track').textContent = '— receiving signal —';
  document.getElementById('np-fill').classList.remove('buffering','paused');
  document.getElementById('np-fill').classList.add('playing');
  document.getElementById('pb-fill').classList.remove('buffering','paused');
  document.getElementById('pb-fill').classList.add('playing');
  document.getElementById('pb-eq').classList.add('playing');
  setPlayIcon(true);
}
function updateStatus(msg) { document.getElementById('pb-name').textContent = msg; }

const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_PAUSE = '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>';
function setPlayIcon(playing) {
  // Fade-out, replace, fade-in for each player SVG to create a micro-transition
  function fadeReplace(el, content){
    try{
      const svg = el.closest && el.closest('svg') ? el.closest('svg') : (el.nodeName==='svg'?el:null);
      if(!svg){ el.innerHTML = content; return; }
      svg.classList.add('fading');
      // wait for CSS transition out
      setTimeout(()=>{
        svg.innerHTML = content;
        // force reflow then remove fading to fade in
        void svg.offsetWidth;
        svg.classList.remove('fading');
      }, 160);
    }catch(e){ try{ el.innerHTML = content }catch(_){} }
  }

  const pbPath = document.getElementById('pb-play-icon');
  if(pbPath) fadeReplace(pbPath, playing ? ICON_PAUSE : ICON_PLAY);
  const npPath = document.getElementById('np-play-icon');
  if(npPath) fadeReplace(npPath, playing ? ICON_PAUSE : ICON_PLAY);
  const miniPath = document.getElementById('mini-play-icon');
  if(miniPath) fadeReplace(miniPath, playing ? ICON_PAUSE : ICON_PLAY);
  const mobilePath = document.getElementById('pb-play-icon-mobile');
  if(mobilePath) fadeReplace(mobilePath, playing ? ICON_PAUSE : ICON_PLAY);

  // Sync floating mini-player icons
  if (typeof window.syncMiniIcons === 'function') window.syncMiniIcons(playing);
  // Sync bottom nav Playing button icon
  const mbnPlay  = document.getElementById('mbn-play-icon');
  const mbnPause = document.getElementById('mbn-pause-icon');
  if (mbnPlay)  mbnPlay.style.display  = playing ? 'none' : '';
  if (mbnPause) mbnPause.style.display = playing ? ''     : 'none';
}

function togglePlay() {
  if(!currentStation) return;
  if(isPlaying) {
    audio.pause(); isPlaying=false; window.isPlaying=false; setPlayIcon(false);
    ['pb-eq','pb-fill','np-fill'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('playing')});
    stopProgressSync();
  } else {
    audio.play().catch(() => updateStatus('TAP TO PLAY')); isPlaying=true; window.isPlaying=true; setPlayIcon(true);
    ['pb-eq','pb-fill','np-fill'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('playing')});
    startProgressSync();
  }
  updateMiniPlayerVisibility();
}

function updateMiniPlayerVisibility() {
  const miniPlayer = document.getElementById('mini-player');
  if(!miniPlayer) return;
  // Show mini-player if playing (page-np doesn't exist; use wncore-player-root visibility instead)
  const root = document.getElementById('wncore-player-root');
  const playerExpanded = root && root.classList.contains('wp-visible') && root.classList.contains('wp-expanded');
  const showMini = isPlaying && !playerExpanded;
  miniPlayer.setAttribute('data-visible', showMini ? 'true' : 'false');

  // Activate mobile player bar slide-in — pb-active controls visibility on mobile
  const playerBar = document.querySelector('.player-bar');
  const bottomNav = document.querySelector('.mobile-bottom-nav');
  if (playerBar) {
    if (currentStation) {
      playerBar.classList.add('pb-active');
    } else {
      playerBar.classList.remove('pb-active');
    }
  }
  if (bottomNav) {
    if (currentStation) {
      bottomNav.classList.add('pb-active');
    } else {
      bottomNav.classList.remove('pb-active');
    }
  }
}

// Attach audio play/pause listeners to keep UI in sync when playback state changes externally
if (audio) {
  audio.addEventListener('play', () => {
    isPlaying = true; window.isPlaying = true; setPlayIcon(true); startProgressSync();
    // Task 2.2: sync progress bar to actual audio state
    const fills = [document.getElementById('np-fill'), document.getElementById('pb-fill')];
    fills.forEach(f => { if(f){ f.classList.remove('buffering','paused'); f.classList.add('playing'); }});
    // Sync top LM play icon — only flip to pause icon if LM is the active source
    const iconEl = document.getElementById('lm-play-icon');
    const npCard = document.getElementById('lm-np-card');
    if (iconEl && lmIsPlaying) iconEl.setAttribute('d', 'M6 19h4V5H6v14zm8-14v14h4V5h-4z');
    if (npCard && lmIsPlaying) npCard.classList.add('playing');
  });
  audio.addEventListener('pause', () => {
    isPlaying = false; window.isPlaying = false; setPlayIcon(false); stopProgressSync();
    const fills = [document.getElementById('np-fill'), document.getElementById('pb-fill')];
    fills.forEach(f => { if(f){ f.classList.remove('playing','buffering'); f.classList.add('paused'); }});
    // Sync LM UI if Live Music was active
    if (lmIsPlaying) {
      lmIsPlaying = false;
      lmSetWaveformState(false);
      const iconEl = document.getElementById('lm-play-icon');
      const npCard = document.getElementById('lm-np-card');
      if (iconEl) iconEl.setAttribute('d','M8 5v14l11-7z');
      if (npCard) npCard.classList.remove('playing');
    }
  });
  audio.addEventListener('ended', () => {
    isPlaying = false; window.isPlaying = false; setPlayIcon(false); stopProgressSync();
    const fills = [document.getElementById('np-fill'), document.getElementById('pb-fill')];
    fills.forEach(f => { if(f){ f.classList.remove('playing','buffering','paused'); f.style.width='0'; }});
    // Sync LM UI
    if (lmIsPlaying) {
      lmIsPlaying = false;
      lmSetWaveformState(false);
    }
  });
  audio.addEventListener('waiting', () => {
    const fills = [document.getElementById('np-fill'), document.getElementById('pb-fill')];
    fills.forEach(f => { if(f){ f.classList.remove('playing','paused'); f.classList.add('buffering'); }});
  });
  audio.addEventListener('playing', () => {
    const fills = [document.getElementById('np-fill'), document.getElementById('pb-fill')];
    fills.forEach(f => { if(f){ f.classList.remove('buffering','paused'); f.classList.add('playing'); }});
  });
}

function toggleFavorite(btn) {
  // Delegate to the unified favCurrentStation() so both hearts use the same FAV_KEY store.
  // favCurrentStation() handles add/remove, toast, and updateFavButton() UI sync.
  if (typeof favCurrentStation === 'function') {
    favCurrentStation();
  }
}
function toggleSleepTimer(btn) {
  // Delegate to cycleSleepTimer() which has the real countdown display and audio fade.
  if (typeof cycleSleepTimer === 'function') {
    cycleSleepTimer();
  }
}

document.getElementById('vol-slider').addEventListener('input', e => { audio.volume = e.target.value; });

// ─── MOUSE WHEEL VOLUME CONTROL ──────────────────────────────────────────
// Scroll anywhere on the player bar to adjust volume
document.querySelector('.player-bar').addEventListener('wheel', e => {
  e.preventDefault();
  const slider = document.getElementById('vol-slider');
  if (!slider) return;
  const step = 0.05;
  let newVal = parseFloat(slider.value) + (e.deltaY < 0 ? step : -step);
  newVal = Math.min(1, Math.max(0, newVal));
  slider.value = newVal;
  audio.volume = newVal;
  try { localStorage.setItem('wncore-vol', newVal); } catch {}
}, { passive: false });

// ─── THEME ────────────────────────────────────────────────────────────────
function toggleDark() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-mode', isDarkMode);
  // Always remove dark-pre flash-prevention class — it's only needed before JS loads
  document.documentElement.classList.remove('dark-pre');
  try { localStorage.setItem('wncore-dark', isDarkMode?'1':'0'); } catch(e){}
}
try {
  if(localStorage.getItem('wncore-dark')==='1') {
    isDarkMode=true; document.body.classList.add('dark-mode');
  }
} catch(e){}
// Remove dark-pre flash-prevention class now that JS has loaded and applied the real theme.
// If left on <html>, its background:#0e0c0a!important overrides light mode permanently.
document.documentElement.classList.remove('dark-pre');

// ─── SKIP STATION ─────────────────────────────────────────────────────────
let _lastStations = [];
let _historyIdx = -1; // pointer into historyLoad() for back navigation

async function skipStation(dir) {
  if (dir === -1) {
    // Previous: walk back through real play history
    const h = (typeof historyLoad === 'function') ? historyLoad() : [];
    // h[0] is current, h[1] is previous, etc.
    if (h.length > 1) {
      const prev = h[1]; // skip h[0] which is what's playing now
      if (prev && typeof playStation === 'function') {
        playStation(prev.url, prev.name, prev.meta, prev.emoji || '📻');
      }
    }
    return;
  }
  // Next: pick from pool, avoid repeating current
  if (_lastStations.length < 2) {
    try {
      const r = await fetch(`${_a}/stations/search?limit=20&https=true&order=clickcount&reverse=true`);
      _lastStations = await r.json();
    } catch(e) { return; }
  }
  // Filter out the currently playing station
  const pool = _lastStations.filter(s => !currentStation || s.url_resolved !== currentStation.url);
  const s = pool[Math.floor(Math.random() * pool.length)] || _lastStations[0];
  if (s) playStation(s.url_resolved, s.name, s.country || 'Unknown', getCountryEmoji(s.countrycode), s.favicon||null);
}

function toggleMinimal() {
  isMinimal = !isMinimal;
  document.body.classList.toggle('minimal-mode', isMinimal);
  const btn = document.getElementById('minimal-toggle');
  btn.classList.toggle('on', isMinimal);
  btn.textContent = isMinimal ? 'FULL' : 'MIN';
  try { localStorage.setItem('wncore-min', isMinimal?'1':'0'); } catch(e){}
}
try {
  if(localStorage.getItem('wncore-min')==='1') {
    isMinimal=true; document.body.classList.add('minimal-mode');
    const btn=document.getElementById('minimal-toggle'); btn.classList.add('on'); btn.textContent='FULL';
  }
} catch(e){}

// ─── MINI PLAYER LAUNCHER ─────────────────────────────────────────────────
// ─── MINI PLAYER ARG MORPH TRANSITION ────────────────────────────────────
(function () {
  const STYLE_ID = '__mini-morph-style';

  function _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
#mini-morph-overlay {
  display: none; position: fixed; inset: 0; z-index: 99999;
  background: #000; overflow: hidden;
  font-family: 'DM Mono', monospace;
}
#mini-morph-overlay.active { display: block; }

/* heavy scanlines */
#mini-morph-overlay::before {
  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px, transparent 3px,
    rgba(0,0,0,0.55) 3px, rgba(0,0,0,0.55) 4px
  );
  animation: __mmo_scan 0.08s steps(1) infinite;
}
@keyframes __mmo_scan {
  0%  { transform: translateY(0px); }
  25% { transform: translateY(1px); }
  50% { transform: translateY(-1px); }
  75% { transform: translateY(2px); }
}

/* RGB split noise layer */
#mini-morph-noise {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  mix-blend-mode: screen; opacity: 0.6;
  animation: __mmo_noise 0.06s steps(1) infinite;
}
@keyframes __mmo_noise {
  0%  { background: radial-gradient(ellipse 30% 8% at 20% 44%, rgba(200,71,42,0.35) 0%, transparent 100%),
                    radial-gradient(ellipse 60% 3% at 70% 61%, rgba(200,71,42,0.15) 0%, transparent 100%); }
  16% { background: radial-gradient(ellipse 80% 4% at 50% 23%, rgba(200,71,42,0.2) 0%, transparent 100%); }
  33% { background: radial-gradient(ellipse 40% 6% at 10% 78%, rgba(200,71,42,0.3) 0%, transparent 100%),
                    radial-gradient(ellipse 20% 2% at 90% 12%, rgba(200,71,42,0.1) 0%, transparent 100%); }
  50% { background: radial-gradient(ellipse 100% 5% at 50% 55%, rgba(200,71,42,0.18) 0%, transparent 100%); }
  66% { background: radial-gradient(ellipse 25% 10% at 80% 33%, rgba(200,71,42,0.28) 0%, transparent 100%); }
  83% { background: radial-gradient(ellipse 70% 3% at 30% 88%, rgba(200,71,42,0.12) 0%, transparent 100%),
                    radial-gradient(ellipse 15% 15% at 60% 5%, rgba(200,71,42,0.22) 0%, transparent 100%); }
}

/* horizontal glitch tear */
#mini-morph-tear {
  position: absolute; inset: 0; z-index: 2; pointer-events: none;
  animation: __mmo_tear 0.15s steps(1) infinite;
}
@keyframes __mmo_tear {
  0%,20%,40%,60%,80% { box-shadow: none; }
  10%  { box-shadow: inset 0 calc(30vh) 0 -1px rgba(200,71,42,0.5), inset 0 calc(30vh + 2px) 0 -1px rgba(0,0,0,0.8); }
  30%  { box-shadow: inset 0 calc(67vh) 0 -1px rgba(200,71,42,0.3), inset 0 calc(67vh + 3px) 0 -1px rgba(0,0,0,0.9); }
  50%  { box-shadow: inset 0 calc(15vh) 0 -1px rgba(200,71,42,0.6), inset 0 calc(15vh + 1px) 0 -1px rgba(0,0,0,0.7); }
  70%  { box-shadow: inset 0 calc(82vh) 0 -1px rgba(200,71,42,0.25); }
  90%  { box-shadow: inset 0 calc(48vh) 0 -1px rgba(200,71,42,0.45), inset 0 calc(48vh + 4px) 0 -1px rgba(0,0,0,0.85); }
}

/* terminal box */
#mini-morph-term {
  position: absolute; z-index: 3;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: min(420px, 90vw);
  border: 1px solid rgba(200,71,42,0.4);
  background: rgba(6,5,4,0.96);
  box-shadow: 0 0 0 1px rgba(200,71,42,0.08),
              0 0 30px rgba(200,71,42,0.12),
              inset 0 0 20px rgba(0,0,0,0.6);
  animation: __mmo_term_in 0.12s ease forwards,
             __mmo_term_jitter 0.08s steps(1) infinite 0.15s;
}
@keyframes __mmo_term_in {
  from { opacity: 0; transform: translate(-50%, -50%) scaleY(0.05); filter: brightness(1.2); }
  to   { opacity: 1; transform: translate(-50%, -50%) scaleY(1); filter: brightness(1); }
}
@keyframes __mmo_term_jitter {
  0%  { transform: translate(-50%, -50%) translate(0,0); }
  25% { transform: translate(-50%, -50%) translate(-1px, 0); }
  50% { transform: translate(-50%, -50%) translate(0, 0); }
  75% { transform: translate(-50%, -50%) translate(1px, 0); }
}

/* chrome */
#mini-morph-chrome {
  padding: 7px 12px; display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid rgba(200,71,42,0.2);
  background: rgba(200,71,42,0.04);
}
.mmc-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
#mini-morph-chrome-title {
  font-size: 0.44rem; letter-spacing: 2px; color: rgba(200,71,42,0.55);
  text-transform: uppercase; flex: 1;
  animation: __mmo_txt_glitch 0.2s steps(1) infinite;
}
@keyframes __mmo_txt_glitch {
  0%,85%  { clip-path: none; transform: none; }
  88%     { clip-path: inset(30% 0 40% 0); transform: translateX(3px); color: rgba(200,71,42,0.9); }
  92%     { clip-path: inset(60% 0 10% 0); transform: translateX(-2px); }
  96%     { clip-path: none; transform: translateX(1px); }
}
#mini-morph-badge {
  font-size: 0.38rem; letter-spacing: 1.5px; color: rgba(200,71,42,0.5);
  border: 1px solid rgba(200,71,42,0.25); padding: 2px 5px; border-radius: 2px;
  animation: __mmo_blink 0.18s steps(1) infinite;
}
@keyframes __mmo_blink { 0%,49%{opacity:1} 50%,100%{opacity:0.2} }

/* body */
#mini-morph-body {
  padding: 10px 14px 12px; font-size: 0.6rem; line-height: 1.65;
  letter-spacing: 0.3px; min-height: 80px;
}
.mml { display: block; }
.mml.new {
  animation: __mmo_line_in 0.05s steps(1) forwards;
}
@keyframes __mmo_line_in {
  from { opacity: 0; } to { opacity: 1; }
}
.mmt-dim   { color: rgba(240,237,232,0.28); }
.mmt-ok    { color: rgba(50,220,100,0.8); }
.mmt-warn  { color: rgba(234,179,8,0.85); }
.mmt-red   { color: rgba(200,71,42,1); }
.mmt-white { color: #f0ede8; }
.mmt-glitch {
  display: inline-block;
  animation: __mmo_char_glitch 0.1s steps(1) infinite;
}
@keyframes __mmo_char_glitch {
  0%,70%  { opacity:1; transform:none; color: rgba(200,71,42,1); }
  72%     { opacity:0; }
  74%     { opacity:1; transform:translateX(2px); color:#fff; }
  78%     { transform:none; color: rgba(200,71,42,1); }
}

/* progress bar */
#mini-morph-bar {
  height: 2px; background: rgba(255,255,255,0.03);
  border-top: 1px solid rgba(200,71,42,0.1);
}
#mini-morph-bar-fill {
  height: 100%; width: 0%;
  background: rgba(200,71,42,0.9);
  box-shadow: 0 0 6px rgba(200,71,42,0.8);
  transition: width 0.06s linear;
}

/* exit flash — quick glitchy cut, no eye-searing brightness */
#mini-morph-overlay.exit {
  animation: __mmo_exit 0.2s steps(1) forwards;
}
@keyframes __mmo_exit {
  0%  { filter: brightness(1); opacity: 1; }
  30% { filter: brightness(1.4) saturate(0); opacity: 1; }
  60% { filter: brightness(0); opacity: 1; }
  100%{ filter: brightness(0); opacity: 0; }
}
    `;
    document.head.appendChild(s);
  }

  function _buildOverlay() {
    if (document.getElementById('mini-morph-overlay')) return;
    const el = document.createElement('div');
    el.id = 'mini-morph-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div id="mini-morph-noise"></div>
      <div id="mini-morph-tear"></div>
      <div id="mini-morph-term">
        <div id="mini-morph-chrome">
          <div class="mmc-dot" style="background:#ff5f57"></div>
          <div class="mmc-dot" style="background:#febc2e"></div>
          <div class="mmc-dot" style="background:#28c840"></div>
          <div id="mini-morph-chrome-title">WNCORE // SIGNAL_REROUTE</div>
          <div id="mini-morph-badge">⬤ ACTIVE</div>
        </div>
        <div id="mini-morph-body"></div>
        <div id="mini-morph-bar"><div id="mini-morph-bar-fill"></div></div>
      </div>
    `;
    document.body.appendChild(el);
  }

  // Scramble a string with glitch chars mid-animation
  const GLITCH_CHARS = '▓█▒░|/\\⚡◈◉⊗⊘';
  function _scramble(str) {
    return str.split('').map(c =>
      (c !== ' ' && Math.random() < 0.4)
        ? `<span class="mmt-glitch">${GLITCH_CHARS[Math.floor(Math.random()*GLITCH_CHARS.length)]}</span>`
        : c
    ).join('');
  }

  function _addLine(body, html) {
    const d = document.createElement('span');
    d.className = 'mml new';
    d.innerHTML = html + '\n';
    body.appendChild(d);
    // Remove 'new' class after animation so it doesn't keep replaying
    setTimeout(() => d.classList.remove('new'), 100);
  }

  window.launchMiniPlayer = async function launchMiniPlayer() {
    _injectStyles();
    _buildOverlay();

    const overlay = document.getElementById('mini-morph-overlay');
    const body    = document.getElementById('mini-morph-body');
    const fill    = document.getElementById('mini-morph-bar-fill');

    body.innerHTML = '';
    fill.style.transition = 'none';
    fill.style.width = '0%';
    overlay.classList.remove('exit');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const T = (ms) => new Promise(r => setTimeout(r, ms));

    // Burst of garbled lines first — instant disorientation
    await T(60);
    _addLine(body, `<span class="mmt-dim">${_scramble('>> WNCORE_SIG --collapse --pipe=mini')}</span>`);
    await T(80);
    _addLine(body, `<span class="mmt-red">${_scramble('ERR 0x3A: UNEXPECTED CARRIER')}</span>`);
    fill.style.transition = 'width 0.06s linear';
    fill.style.width = '18%';

    await T(90);
    _addLine(body, `<span class="mmt-dim">${_scramble('rerouting via node_09...')}</span>`);
    fill.style.width = '35%';

    await T(100);
    // Fake corruption burst
    _addLine(body, `<span class="mmt-warn">▒▒ ${_scramble('AUTH BYPASS')} ▒▒</span>`);
    fill.style.width = '52%';

    await T(85);
    _addLine(body, `<span class="mmt-ok">[ ACCESS GRANTED ]</span>`);
    fill.style.width = '70%';

    await T(110);
    _addLine(body, `<span class="mmt-red"><span class="mmt-glitch">█</span> COLLAPSING INTERFACE <span class="mmt-glitch">█</span></span>`);
    fill.style.width = '88%';

    await T(120);
    _addLine(body, `<span class="mmt-white">${_scramble('>> SWITCHING TO MINI MODE')}</span>`);
    fill.style.width = '100%';

    await T(180);

    // Violent exit flash
    overlay.classList.add('exit');
    await T(260);

    document.body.style.overflow = '';
    window.location.href = '/radio-mini.html';
  };
})();


// ─── NAV COLLAPSE ─────────────────────────────────────────────────────────
function toggleNavCollapse() {
  const collapsed = document.body.classList.toggle('nav-collapsed');
  const icon = document.getElementById('nav-collapse-icon');
  if (icon) {
    // Swap icon: hamburger when expanded → left-arrow/close when collapsed
    icon.innerHTML = collapsed
      ? '<polyline points="15 18 9 12 15 6"/>'  // chevron-left = "expand"
      : '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>'; // hamburger = "collapse"
  }
  try { localStorage.setItem('wncore-nav-collapsed', collapsed ? '1' : '0'); } catch(e) {}
}
// Restore collapsed state on load
try {
  if (localStorage.getItem('wncore-nav-collapsed') === '1') {
    document.body.classList.add('nav-collapsed');
    document.addEventListener('DOMContentLoaded', () => {
      const icon = document.getElementById('nav-collapse-icon');
      if (icon) icon.innerHTML = '<polyline points="15 18 9 12 15 6"/>';
    });
  }
} catch(e) {}
window.toggleNavCollapse = toggleNavCollapse;

// ─── MOBILE MENU ──────────────────────────────────────────────────────────
function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  const nav = document.getElementById('mobile-nav');
  const btn = document.getElementById('mobile-menu-btn');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  nav.classList.toggle('open', mobileMenuOpen);
  if(backdrop) backdrop.classList.toggle('open', mobileMenuOpen);
  // Lock body scroll when menu is open so page doesn't scroll behind drawer
  document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
  btn.innerHTML = mobileMenuOpen
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
}

// ─── SEARCH ───────────────────────────────────────────────────────────────
function openSearch() { document.getElementById('search-modal').classList.add('open'); setTimeout(()=>document.getElementById('search-input').focus(),80); }
function closeSearch() {
  document.getElementById('search-modal').classList.remove('open');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="search-empty">Start typing to search 12,000+ stations worldwide</div>';
}
function closeSearchOnBackdrop(e) { if(e.target===document.getElementById('search-modal')) closeSearch(); }
function setSearchFilter(btn, filter) {
  searchFilter = filter;
  document.querySelectorAll('.search-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const q = document.getElementById('search-input').value.trim();
  if(q.length>1) doSearch(q);
}
document.getElementById('search-input').addEventListener('input', e => {
  clearTimeout(searchDebounce);
  const q = e.target.value.trim();
  if(q.length<2) { document.getElementById('search-results').innerHTML='<div class="search-empty">Start typing to search 12,000+ stations worldwide</div>'; return; }
  document.getElementById('search-results').innerHTML = '<div class="search-empty">Searching...</div>';
  searchDebounce = setTimeout(()=>doSearch(q), 380);
});
document.addEventListener('keydown', e => {
  if((e.metaKey||e.ctrlKey)&&e.key==='k') { e.preventDefault(); openSearch(); }
  if(e.key==='Escape') { closeSearch(); document.getElementById('signin-modal').classList.remove('open'); if(mobileMenuOpen) toggleMobileMenu(); }
});
async function doSearch(q) {
  const results = document.getElementById('search-results');
  try {
    let stations = [];
    if(searchFilter === 'country') {
      const r = await fetch(`${_a}/stations/search?limit=20&https=true&country=${encodeURIComponent(q)}&order=clickcount&reverse=true`);
      stations = await r.json();
    } else if(searchFilter === 'tag') {
      const r = await fetch(`${_a}/stations/search?limit=20&https=true&tag=${encodeURIComponent(q)}&order=clickcount&reverse=true`);
      stations = await r.json();
    } else {
      // 'all' or 'name': search name + country simultaneously for best results
      const fetches = [fetch(`${_a}/stations/search?limit=15&https=true&name=${encodeURIComponent(q)}&order=clickcount&reverse=true`)];
      if(searchFilter === 'all') fetches.push(fetch(`${_a}/stations/search?limit=10&https=true&country=${encodeURIComponent(q)}&order=clickcount&reverse=true`));
      const responses = await Promise.all(fetches);
      const datasets = await Promise.all(responses.map(r=>r.json()));
      const seen = new Set();
      stations = datasets.flat().filter(s => { if(seen.has(s.stationuuid)) return false; seen.add(s.stationuuid); return true; }).slice(0,20);
    }
    if(!stations.length) { results.innerHTML=`<div class="search-empty">No stations found for "<strong>${escHtml(q)}</strong>"</div>`; return; }
    results.innerHTML = '';
    stations.forEach(s => {
      const el = document.createElement('div'); el.className='search-result-item';
      const emoji = getCountryEmoji(s.countrycode);
      const srGrad = stationGradient(s.tags, s.name);
      const srInit = escHtml((s.name||'?')[0].toUpperCase());
      const srImg = (s.favicon && s.favicon.startsWith('http'))
        ? `<img src="${escHtml(s.favicon)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`
        : `<span style="font-size:1rem;line-height:1">${emoji}</span>`;
      el.innerHTML = `<div class="sr-icon" style="background:${srGrad};overflow:hidden">${srImg}</div><div><div class="sr-name">${escHtml(s.name)}</div><div class="sr-meta">${escHtml(s.country||'—')} · ${(s.tags||'').split(',').slice(0,2).filter(Boolean).map(t=>escHtml(t.trim())).join(', ')||'Radio'} · ${s.bitrate?s.bitrate+'kbps':'—'}</div></div>`;
      el.onclick = () => { playStation(s.url_resolved, s.name, s.country||'Unknown', emoji, s.favicon||null); closeSearch(); };
      results.appendChild(el);
    });
  } catch(e) { results.innerHTML='<div class="search-empty">Signal degraded — try again</div>'; }
}

// ─── PAGE SWITCHING ───────────────────────────────────────────────────────
function showPage(id, linkEl) {
  // Always reset any scroll lock left by mobile menu or listeners panel
  document.body.style.overflow = '';
  // Close mobile menu if open
  if (mobileMenuOpen) {
    mobileMenuOpen = false;
    const nav = document.getElementById('mobile-nav');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const btn = document.getElementById('mobile-menu-btn');
    if (nav) nav.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  }
  // Load page-specific data
  if(id==='favorites') loadFavoritesPage();
  if(id==='profile') loadProfilePage();
  const already = document.getElementById('page-'+id)?.classList.contains('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('nav a, .mobile-nav a').forEach(a=>a.classList.remove('active'));
  if(linkEl) linkEl.classList.add('active');
  // Scroll to top — use both methods for iOS Safari compatibility
  window.scrollTo({top:0,behavior:'instant'});
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  if(id==='charts') loadChartsPage();
  if(id==='podcasts') loadPodcastsPage();
  if(id==='genres') loadGenrePage();
  if(id==='anime') loadAnimePage();
  if(id==='about') initAboutEerie();
  if(id==='livemusic') loadLiveMusicPage();
  // Re-trigger constellation resize after home page becomes visible
  // (canvas gets H=0 when section was hidden, needs recalc after display:block)
  if(id==='home') setTimeout(function(){ if(typeof window._constellationResize==='function') window._constellationResize(); }, 60);
  updateMiniPlayerVisibility();
}

// ─── GENRES PAGE ──────────────────────────────────────────────────────────
function loadGenrePage() {
  const grid = document.getElementById('genre-cards-grid');
  if(grid.dataset.loaded) return;
  const genres = [
    ['jazz','Jazz','Deep cuts and smooth sessions','#1a1a2a'],
    ['classical','Classical','Orchestral & chamber music','#1a1a1a'],
    ['rock','Rock','From classic to alternative','#1a0a0a'],
    ['pop','Pop','Chart-toppers worldwide','#1a0a1a'],
    ['electronic','Electronic','Techno, house, trance & more','#0a0a1a'],
    ['hiphop','Hip-Hop','Beats and bars, live','#0a0a0a'],
    ['ambient','Ambient','Focus, sleep, and deep work','#0a1a0a'],
    ['news','News','World service & talk radio','#1a1000'],
    ['country','Country','Roots, bluegrass & country pop','#120a00'],
    ['rnb','R&B','Soul, funk & neo-soul','#1a0a18'],
    ['metal','Metal','Heavy, thrash & doom','#0e0a0a'],
    ['reggae','Reggae','Island rhythms worldwide','#0a140a'],
    ['anime','Anime / J-Pop','Direct from Japanese broadcasters','#0f0a1a'],
    ['folk','Folk','Traditional & contemporary folk','#100e06'],
    ['lofi','Lo-Fi','Study beats, rain sounds','#0a0e16'],
    ['80s','80s','The decade that defined radio','#150a10'],
    ['90s','90s','Grunge, pop & everything between','#0a0f15'],
  ];
  grid.innerHTML = genres.map(([g,n,d,bg]) => `
    <div class="featured-card" style="padding:18px;" onclick="filterGenreFromPage('${g}')">
      <div style="width:32px;height:32px;border-radius:8px;background:${bg};display:flex;align-items:center;justify-content:center;margin-bottom:10px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linecap="round" width="18" height="18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
      <div style="font-size:0.88rem;font-weight:600;margin-bottom:3px;">${n}</div>
      <div style="font-size:0.67rem;color:var(--text3);line-height:1.4;">${d}</div>
    </div>`).join('');
  grid.dataset.loaded='1';
}

// ─── ANIME PAGE ───────────────────────────────────────────────────────────
let animeLoaded = false;
function loadAnimePage() {
  if(animeLoaded) return; animeLoaded=true;
  initAnimeVideo();
  const bi = document.getElementById('anime-banner-img');
  bi.src = ANIME_BANNER_IMGS[Math.floor(Math.random()*ANIME_BANNER_IMGS.length)];
  bi.style.display='block';
  const grid = document.getElementById('anime-stations-grid');
  grid.innerHTML = ANIME_STATIONS.map((s,i) => `
    <div class="anime-station-card" onclick="playAnimeStation(${i})">
      <div class="anime-card-icon" style="font-size:1.8rem">${s.emoji}</div>
      <div class="anime-card-title">${escHtml(s.name)}</div>
      <div class="anime-card-meta">${escHtml(s.desc)}</div>
      <span class="anime-card-badge ${s.badge}">
        ${s.badge==='live'
          ? '<svg viewBox="0 0 8 8" width="7" height="7"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg> LIVE'
          : s.badge==='jpop'
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="9" height="9"><path d="M9 18V5l12-2v13"/></svg> J-POP'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="9" height="9"><path d="M3 18v-6a9 9 0 0118 0v6"/></svg> LO-FI'}
      </span>
    </div>`).join('');
  refreshAnimeImages();
  loadAnimeStationsLive();
}
async function refreshAnimeImages() {
  const strip = document.getElementById('anime-img-strip');
  if (!strip) return;

  // Show loading state
  strip.innerHTML = '<div style="color:var(--text3);font-size:0.75rem;font-family:\'DM Mono\',monospace;padding:12px;letter-spacing:1px">SCANNING FREQUENCIES...</div>';

  // Which source to use — rotates each call
  const _sourceKey = 'wncore_anime_img_source';
  const sourceIdx = (parseInt(sessionStorage.getItem(_sourceKey) || '0') + 1) % 3;
  sessionStorage.setItem(_sourceKey, sourceIdx);

  let urls = [];

  try {
    if (sourceIdx === 0) {
      // Waifu.pics
      const types = ['waifu','neko','shinobu','megumin','bully','cuddle','hug','kiss'];
      const results = await Promise.allSettled(
        types.map(t =>
          fetch(`https://api.waifu.pics/sfw/${t}`)
            .then(r => r.json()).then(d => d.url)
        )
      );
      urls = results.filter(r => r.status === 'fulfilled').map(r => r.value);

    } else if (sourceIdx === 1) {
      // Nekos.best
      const r = await fetch('https://nekos.best/api/v2/waifu?amount=8');
      const d = await r.json();
      urls = d.results.map(x => x.url);

    } else {
      // Waifu.im
      const r = await fetch('https://api.waifu.im/search/?included_tags=waifu&many=true&full=true&limit=8');
      const d = await r.json();
      urls = d.images.map(x => x.url);
    }
  } catch (e) {
    // Any API fails — fall back to next source silently
    urls = [];
  }

  // If the chosen source returned nothing, fall back to static Unsplash
  if (!urls.length) {
    urls = ANIME_IMGS.sort(() => Math.random() - 0.5);
  }

  strip.innerHTML = '';
  urls.forEach(src => {
    const img = document.createElement('img');
    img.className = 'anime-img-real';
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = function() { this.style.display = 'none'; };
    img.onclick = () => {
      const banner = document.getElementById('anime-banner-img');
      if (banner) banner.src = src;
    };
    strip.appendChild(img);
  });

  // Show which source is active (subtle lore-friendly label)
  const sourceNames = ['WAIFU.PICS', 'NEKOS.BEST', 'WAIFU.IM'];
  const label = document.createElement('div');
  label.style.cssText = 'width:100%;font-size:0.55rem;color:var(--text3);font-family:"DM Mono",monospace;letter-spacing:2px;padding:6px 0 2px;opacity:0.5;text-align:right';
  label.textContent = 'SOURCE: ' + sourceNames[sourceIdx];
  strip.appendChild(label);
}
function playAnimeStation(idx) {
  const s = ANIME_STATIONS[idx];
  playStation(s.url, s.name, s.desc, s.emoji);
  const badge = document.getElementById('anime-now-playing-badge');
  badge.style.display='flex'; badge.textContent='▶ '+s.name;
}
async function loadAnimeStationsLive() {
  const tbody = document.getElementById('anime-live-tbody');
  tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text3);font-size:0.8rem;">Scanning frequencies...</td></tr>`;
  try {
    const [r1,r2] = await Promise.all([
      fetch(`${_a}/stations/search?limit=15&https=true&tag=anime&order=clickcount&reverse=true`),
      fetch(`${_a}/stations/search?limit=15&https=true&tag=jpop&order=clickcount&reverse=true`)
    ]);
    const [d1,d2] = await Promise.all([r1.json(),r2.json()]);
    const combined = [...d1,...d2].filter((s,i,a)=>a.findIndex(x=>x.stationuuid===s.stationuuid)===i).slice(0,25);
    if(!combined.length) throw new Error('none');
    renderTable(combined,'anime-live-tbody');
  } catch(e) {
    renderTable([
      {name:'Radio Anime Japan',country:'Japan',tags:'anime,jpop',bitrate:128,countrycode:'JP',url_resolved:'https://listen.moe/stream'},
      {name:'Nightwave Plaza',country:'USA',tags:'vaporwave,city pop',bitrate:128,countrycode:'US',url_resolved:'https://radio.plaza.one/mp3'},
    ],'anime-live-tbody');
  }
}

// ─── PODCASTS PAGE ────────────────────────────────────────────────────────
async function loadPodcastsPage() {
  const grid = document.getElementById('podcast-grid');
  if(grid.dataset.loaded) return;
  const fallbacks = [
    {name:'NPR News Now',desc:'US · News & Talk',url:'https://npr-ice.streamguys1.com/live.mp3'},
    {name:'BBC Radio 4',desc:'UK · Talk & Culture',url:'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_fourfm'},
    {name:'ABC Radio National',desc:'Australia · Ideas',url:'https://live-radio02.mediahubaustralia.com/2RNW/mp3/'},
    {name:'France Culture',desc:'France · Culture',url:'https://icecast.radiofrance.fr/franceculture-hifi.aac'},
    {name:'Monocle 24',desc:'Global · Affairs',url:'https://stream.monocle.com/stream'},
    {name:'CBC Radio One',desc:'Canada · News',url:'https://cbcliveradio.cbc.ca/live/cbcr1toronto.mp3'},
  ];
  try {
    const r=await fetch(`${_a}/stations/search?limit=20&https=true&order=clickcount&reverse=true&tag=podcast`);
    const d=await r.json();
    const combined=[...d,...fallbacks].slice(0,18);
    grid.innerHTML='';
    combined.forEach(s=>{
      const card=document.createElement('div'); card.className='rec-card';
      card.innerHTML=`<div class="rec-art" style="background:var(--surface2);">${SVG.mic.replace('viewBox','width="22" height="22" viewBox')}</div><div class="rec-info"><div class="rec-name">${escHtml(s.name||s.desc)}</div><div class="rec-desc">${escHtml(s.country||s.desc||'Talk Radio')}</div></div>`;
      card.onclick=()=>playStation(s.url_resolved||s.url, s.name, s.country||s.desc, '🎙', s.favicon||null);
      grid.appendChild(card);
    });
  } catch(e) {
    grid.innerHTML='';
    fallbacks.forEach(f=>{
      const card=document.createElement('div'); card.className='rec-card';
      card.innerHTML=`<div class="rec-art" style="background:var(--surface2);">${SVG.mic.replace('viewBox','width="22" height="22" viewBox')}</div><div class="rec-info"><div class="rec-name">${escHtml(f.name)}</div><div class="rec-desc">${escHtml(f.desc)}</div></div>`;
      card.onclick=()=>playStation(f.url,f.name,f.desc,'🎙');
      grid.appendChild(card);
    });
  }
  grid.dataset.loaded='1';
}

// ─── GENRE → HOME ─────────────────────────────────────────────────────────
function filterGenreFromPage(genre) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-home').classList.add('active');
  document.querySelectorAll('nav a').forEach(a=>a.classList.remove('active'));
  document.querySelector('nav a').classList.add('active');
  window.scrollTo({top:0});
  setTimeout(()=>{
    document.querySelectorAll('.genre-btn').forEach(b=>b.classList.toggle('active',b.dataset.genre===genre));
    loadStations(genre);
  },100);
}

// ─── SIGN IN ──────────────────────────────────────────────────────────────
function openSignIn() { document.getElementById('signin-modal').classList.add('open'); }
function closeSignIn(e) { if(e&&e.target!==document.getElementById('signin-modal')) return; document.getElementById('signin-modal').classList.remove('open'); }
function closeSignInBtn() { document.getElementById('signin-modal').classList.remove('open'); }

// ─── REAL SUPABASE AUTH ────────────────────────────────────────────────────
// Supabase is loaded via CDN (supabase.min.js). Client is init'd lazily so
// the site still works if SUPABASE_URL / SUPABASE_ANON_KEY aren't configured.
let _sbClient = null;
let _authUser = null;
let _sbInitPromise = null; // lock: prevents concurrent createClient calls

async function _getSupabase() {
  if (_sbClient) return _sbClient;
  // If already initializing, wait for the same promise instead of creating a new client
  if (_sbInitPromise) return _sbInitPromise;
  _sbInitPromise = (async () => {
    try {
      // Keys are injected by the Vercel api/config.js endpoint at runtime
      const r = await fetch('/api/config');
      if (!r.ok) return null;
      const cfg = await r.json();
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
      if (!_sbClient) {
        _sbClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      }
      return _sbClient;
    } catch { return null; }
  })();
  return _sbInitPromise;
}

// Pre-warm: kick off /api/config + Supabase init in the background immediately
// so _sbClient is ready before user navigates to profile (saves 1-2s cold start)
setTimeout(() => _getSupabase().catch(() => {}), 200);

function _authShowView(view) {
  ['auth-signedout-view','auth-signedin-view','auth-loading-view'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === view ? '' : 'none';
  });
}

function _authSetError(msg) {
  const el = document.getElementById('auth-error-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? '' : 'none';
}

function _authUpdateNav(user) {
  const btn = document.getElementById('nav-auth-btn');
  if (!btn) return;
  if (user) {
    // Prefer saved profile display_name over OAuth name from user metadata
    const profileName = window.__WNCORE_PROFILE?.display_name;
    const oauthName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
    const name = profileName || oauthName;
    const dicebearUrl = window.__WNCORE_PROFILE?.avatar_url || localStorage.getItem('wncore_avatar_url') || null;
    if (dicebearUrl) {
      // Profile already cached — render avatar circle immediately
      const initial = name[0].toUpperCase();
      btn.innerHTML = `<img src="${dicebearUrl}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;display:block;" onerror="this.parentElement.textContent='${initial}'">`;
      btn.style.cssText = 'background:transparent !important;border:2px solid var(--accent) !important;color:var(--accent) !important;padding:3px !important;border-radius:50% !important;width:32px;height:32px;display:flex;align-items:center;justify-content:center;overflow:hidden;';
      btn.onclick = function() { if(typeof showPage==='function') showPage('profile', null); else openSignIn(); };
    } else {
      // Profile not yet fetched — show initial only (not full name) to avoid flashing OAuth name
      const initial = name[0].toUpperCase();
      btn.textContent = initial;
      btn.style.cssText = 'background:var(--accent) !important;border:2px solid var(--accent) !important;color:#fff !important;padding:3px !important;border-radius:50% !important;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;';
      btn.onclick = function() { if(typeof showPage==='function') showPage('profile', null); else openSignIn(); };
    }
    btn.title = name;
  } else {
    btn.textContent = 'Sign In';
    btn.style.cssText = '';
    btn.title = '';
  }
  // ── Mobile nav button — mirrors desktop auth state ──────────────────────
  const mBtn = document.getElementById('mobile-nav-auth-btn');
  if (!mBtn) return;
  if (user) {
    const profileName = window.__WNCORE_PROFILE?.display_name;
    const oauthName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
    const name = profileName || oauthName;
    const dicebearUrl = window.__WNCORE_PROFILE?.avatar_url || localStorage.getItem('wncore_avatar_url') || null;
    const initial = name[0].toUpperCase();
    if (dicebearUrl) {
      mBtn.innerHTML = `<img src="${dicebearUrl}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;display:inline-block;vertical-align:middle;margin-right:8px;" onerror="this.style.display='none'">${initial} — Profile`;
    } else {
      mBtn.textContent = initial + ' — Profile';
    }
    mBtn.style.cssText = 'margin:0;background:var(--surface2);border:1px solid var(--accent);color:var(--accent);';
    mBtn.onclick = function() { if(typeof showPage==='function') showPage('profile', null); if(typeof toggleMobileMenu==='function') toggleMobileMenu(); return false; };
    mBtn.title = name;
  } else {
    mBtn.textContent = 'Sign In';
    mBtn.style.cssText = 'margin:0';
    mBtn.onclick = function() { openSignIn(); toggleMobileMenu(); return false; };
    mBtn.title = '';
  }
}

function _authUpdateModal(user) {
  if (user) {
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '—';
    const initial = (name[0] || '?').toUpperCase();
    // Prefer saved DiceBear avatar; fall back to OAuth profile photo
    const avatarUrl = window.__WNCORE_PROFILE?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const provider = (user.app_metadata?.provider || 'email').replace('email','Email').replace('google','Google').replace('discord','Discord');
    const since = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '—';
    const favCount = (JSON.parse(localStorage.getItem('wncore_favs_v2')||'[]')).length;

    const avatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`
      : initial;

    // Modal mini-card
    const av = document.getElementById('auth-avatar');
    if (av) av.innerHTML = avatarHtml;
    const el = document.getElementById('auth-display-name'); if (el) el.textContent = name;
    const em = document.getElementById('auth-display-email'); if (em) em.textContent = user.email || '';
    const badge = document.getElementById('auth-provider-badge'); if (badge) badge.textContent = 'via ' + provider;
    const fc = document.getElementById('auth-fav-count'); if (fc) fc.textContent = favCount;
    const ms = document.getElementById('auth-member-since'); if (ms) ms.textContent = since;

    _authShowView('auth-signedin-view');
  } else {
    _authShowView('auth-signedout-view');
  }
}

function loadProfilePage() {
  const user = _authUser;
  const profileCard = document.getElementById('profile-avatar-lg');
  const signedOut = document.getElementById('profile-signed-out');
  const sections = document.querySelectorAll('#page-profile > div > div:not(#profile-signed-out):not([style*="margin-bottom:32px"])');

  if (!user) {
    sections.forEach(s => s.style.display = 'none');
    if (signedOut) signedOut.style.display = 'block';
    return;
  }
  if (signedOut) signedOut.style.display = 'none';
  sections.forEach(s => s.style.display = '');

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '—';
  const initial = (name[0] || '?').toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
  const provider = (user.app_metadata?.provider || 'email').replace('email','Email').replace('google','Google').replace('discord','Discord');
  const since = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '—';
  const favs = JSON.parse(localStorage.getItem('wncore_favs_v2') || '[]');

  // Large avatar
  if (profileCard) {
    profileCard.innerHTML = avatarUrl
      ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`
      : initial;
  }
  const dn = document.getElementById('profile-display-name'); if (dn) dn.textContent = name;
  const de = document.getElementById('profile-display-email'); if (de) de.textContent = user.email || '';
  const pb = document.getElementById('profile-provider-badge'); if (pb) pb.textContent = 'via ' + provider;
  const mb = document.getElementById('profile-member-badge'); if (mb) mb.textContent = 'Since ' + new Date(user.created_at||Date.now()).toLocaleDateString('en-US',{month:'short',year:'numeric'});
  const fc = document.getElementById('profile-fav-count'); if (fc) fc.textContent = favs.length;
  const ps = document.getElementById('profile-since'); if (ps) ps.textContent = since;

  // Last played
  const lp = document.getElementById('profile-last-played');
  if (lp) {
    const last = currentStation?.name || localStorage.getItem('wncore_last_station') || '—';
    lp.textContent = last;
  }

  // Favourites preview (up to 6)
  const preview = document.getElementById('profile-fav-preview');
  if (preview) {
    if (!favs.length) {
      preview.innerHTML = `<div style="color:var(--text3);font-size:0.8rem;padding:12px 0;grid-column:1/-1">No saved stations yet. Click ♡ on any station to save it.</div>`;
    } else {
      preview.innerHTML = favs.slice(0, 6).map(s => `
        <div onclick="playStation(${JSON.stringify(s).replace(/"/g,'&quot;')})" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color 0.15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="font-size:1.4rem;flex-shrink:0">${s.emoji||'📻'}</div>
          <div style="min-width:0">
            <div style="font-size:0.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name||'Unknown'}</div>
            <div style="font-size:0.65rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.country||''} ${s.tags||''}</div>
          </div>
        </div>`).join('');
    }
  }
}

async function _authInit() {
  const sb = await _getSupabase();
  if (!sb) return; // Supabase not configured — silent, site still works
  const { data: { session } } = await sb.auth.getSession();
  _authUser = session?.user || null;
  _authUpdateNav(_authUser);
  if (_authUser) {
    migrateFavsToV2();
    setTimeout(authSyncFavsDown, 1000);
    // Fetch profile early so display_name + avatar replace the OAuth name in nav ASAP
    if (typeof fetchProfile === 'function') {
      fetchProfile(false).then(p => { if (p) _authUpdateNav(_authUser); }).catch(() => {});
    }
  }

  // Auto-open profile modal after OAuth redirect (URL contains #access_token)
  if (_authUser && window.location.hash.includes('access_token')) {
    history.replaceState(null, '', window.location.pathname);
    setTimeout(() => { _authUpdateModal(_authUser); openSignIn(); }, 600);
  }

  sb.auth.onAuthStateChange((_event, session) => {
    _authUser = session?.user || null;
    _authUpdateNav(_authUser);
    _authUpdateModal(_authUser);
    if (_authUser) {
      migrateFavsToV2();
      setTimeout(authSyncFavsDown, 800);
      // Re-fetch profile on auth change (e.g. sign in) to get display_name
      if (typeof fetchProfile === 'function') {
        window.__WNCORE_PROFILE = null; // force fresh fetch
        fetchProfile(false).then(p => { if (p) _authUpdateNav(_authUser); }).catch(() => {});
      }
    }
  });
}

async function handleSignIn() {
  const email = document.getElementById('signin-email').value.trim();
  const pass  = document.getElementById('signin-pass').value.trim();
  if (!email || !pass) {
    if (!email) document.getElementById('signin-email').style.borderColor = 'var(--accent)';
    if (!pass)  document.getElementById('signin-pass').style.borderColor  = 'var(--accent)';
    return;
  }
  _authSetError('');
  _authShowView('auth-loading-view');
  const sb = await _getSupabase();
  if (!sb) { _authShowView('auth-signedout-view'); _authSetError('Auth service unavailable. Check Supabase config.'); return; }
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) { _authShowView('auth-signedout-view'); _authSetError(error.message); }
  else { closeSignInBtn(); showToast('✓ Signed in', 'success'); }
}

async function handleCreateAccount() {
  const email = document.getElementById('signin-email').value.trim();
  const pass  = document.getElementById('signin-pass').value.trim();
  if (!email) { document.getElementById('signin-email').style.borderColor = 'var(--accent)'; _authSetError('Enter an email address.'); return; }
  if (!pass || pass.length < 6) { document.getElementById('signin-pass').style.borderColor = 'var(--accent)'; _authSetError('Password must be at least 6 characters.'); return; }
  _authSetError('');
  _authShowView('auth-loading-view');
  const sb = await _getSupabase();
  if (!sb) { _authShowView('auth-signedout-view'); _authSetError('Auth service unavailable.'); return; }
  const { error } = await sb.auth.signUp({ email, password: pass });
  if (error) { _authShowView('auth-signedout-view'); _authSetError(error.message); }
  else { _authShowView('auth-signedout-view'); _authSetError(''); showToast('✉ Check your email to confirm your account', 'info', 6000); closeSignInBtn(); }
}

async function handleForgotPassword() {
  const email = document.getElementById('signin-email').value.trim();
  if (!email) { _authSetError('Enter your email address first.'); return; }
  const sb = await _getSupabase();
  if (!sb) return;
  await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  showToast('✉ Password reset email sent', 'info', 5000);
}

async function handleSignOut() {
  const sb = await _getSupabase();
  if (sb) await sb.auth.signOut();
  _authUser = null;
  _authUpdateNav(null);
  closeSignInBtn();
  showToast('Signed out', 'info');
}

// OAuth — real Supabase OAuth (no fake ARG interception for these)
async function oauthGoogle() {
  const sb = await _getSupabase();
  if (!sb) { showToast('Auth service unavailable', 'warn'); return; }
  closeSignInBtn();
  await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
}
async function oauthDiscord() {
  const sb = await _getSupabase();
  if (!sb) { showToast('Auth service unavailable', 'warn'); return; }
  closeSignInBtn();
  await sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } });
}
function oauthApple() { showToast('Apple Sign-In coming soon', 'info'); }

// Keep oauthContinue / oauthCancel stubs so ARG overlays that reference them don't throw
function oauthContinue() {}
function oauthCancel() { const bd = document.getElementById('oauth-backdrop'); if(bd) bd.classList.remove('show'); }

// Open modal — update view based on current auth state
const _origOpenSignIn = openSignIn;
openSignIn = function() {
  _origOpenSignIn();
  _authUpdateModal(_authUser);
};

// ─── FAVOURITES CLOUD SYNC ─────────────────────────────────────────────────
// Migrate old key → new key on first load
function migrateFavsToV2() {
  try {
    const old = JSON.parse(localStorage.getItem('wncore_favs') || '[]');
    if (!old.length) return;
    const cur = JSON.parse(localStorage.getItem('wncore-favs-v2') || '[]');
    const merged = [...cur];
    old.forEach(o => { if (!merged.find(m => m.url === o.url)) merged.push(o); });
    localStorage.setItem('wncore-favs-v2', JSON.stringify(merged));
    localStorage.removeItem('wncore_favs');
  } catch {}
}

async function authSyncFavsDown() {
  if (!_authUser) return;
  const sb = await _getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.from('user_favourites').select('station_data').eq('user_id', _authUser.id);
    if (!data || !data.length) { authSyncFavsUp(); return; } // first login — push local up
    const remote = data.map(r => r.station_data);
    const local  = JSON.parse(localStorage.getItem('wncore-favs-v2') || '[]');
    // Merge: remote wins for conflicts, local extras are kept
    const merged = [...remote];
    local.forEach(l => { if (!merged.find(m => m.url === l.url)) merged.push(l); });
    localStorage.setItem('wncore-favs-v2', JSON.stringify(merged));
    if (typeof renderFavoritesPage === 'function') renderFavoritesPage();
    if (typeof updateFavButton     === 'function') updateFavButton();
  } catch {}
}

async function authSyncFavsUp() {
  if (!_authUser) return;
  const sb = await _getSupabase();
  if (!sb) return;
  try {
    const favs = JSON.parse(localStorage.getItem('wncore-favs-v2') || '[]');
    // Upsert all local favs to Supabase
    const rows = favs.map(s => ({ user_id: _authUser.id, station_url: s.url, station_data: s }));
    if (rows.length) await sb.from('user_favourites').upsert(rows, { onConflict: 'user_id,station_url' });
  } catch {}
}

window.authSyncNow = async function() {
  showToast('Syncing…', 'info');
  await authSyncFavsUp();
  await authSyncFavsDown();
  showToast('✓ Sync complete', 'success');
};

// Patch favAdd / favRemove to sync up on change when logged in
const _origFavAdd    = window.favAdd;
const _origFavRemove = window.favRemove;
// These will be overridden after improvements.js defines them — wire after DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  _authInit();
  migrateFavsToV2();
});

// ─── EMAIL HORROR TERMINAL ────────────────────────────────────────────────
function triggerEmailHorror(email) {
  const overlay = document.getElementById('email-horror-overlay');
  const termText = document.getElementById('email-terminal-text');
  overlay.classList.add('show');
  termText.innerHTML = '';
  exposure += 25;

  // Partially scramble the email for effect
  const scrambled = email.split('').map(c => Math.random()<0.35 ? String.fromCharCode(c.charCodeAt(0)^(Math.floor(Math.random()*12)+1)) : c).join('');
  const domain = email.includes('@') ? email.split('@')[1] : 'unknown';
  const ts = new Date().toISOString().slice(0,19).replace('T',' ');

  const lines = [
    {t:`<span class="et-dim">$ wncore_auth --register --email "${email}" --node signal_kage</span>`,d:0},
    {t:`<span class="et-dim">Resolving auth.wncoreradio.net...</span>`,d:400},
    {t:`<span class="et-white">[ OK ] DNS resolved: 10.0.9.88 (node_09)</span>`,d:800},
    {t:`<span class="et-dim">Establishing encrypted channel...</span>`,d:1100},
    {t:`<span class="et-white">[ OK ] TLS 1.3 · AES-256-GCM · ${ts}</span>`,d:1500},
    {t:`<span class="et-dim">Dispatching credentials to auth relay...</span>`,d:1900},
    {t:`<span class="et-white">[ OK ] Packet dispatched → auth.wncoreradio.net</span>`,d:2200},
    {t:``,d:2400},
    {t:`<span class="et-err">EXCEPTION: ROUTING_ANOMALY at relay 88.700 MHz</span>`,d:2500},
    {t:`<span class="et-dim">  > Packet intercepted before destination</span>`,d:2800},
    {t:`<span class="et-dim">  > Interceptor: signal_kage@node_09 (UNKNOWN)</span>`,d:3100},
    {t:`<span class="et-err">  > Credentials exposed: ${scrambled}</span>`,d:3400},
    {t:``,d:3700},
    {t:`<span class="et-dim">Stack trace:</span>`,d:3800},
    {t:`<span class="et-dim">  auth_dispatch() [node_09/core/auth.c:247]</span>`,d:4000},
    {t:`<span class="et-dim">  relay_forward() [signal_kage/intercept.c:88]</span>`,d:4200},
    {t:`<span class="et-dim">  ████████::capture("${domain}")</span>`,d:4400},
    {t:``,d:4600},
    {t:`<span class="et-err">CRITICAL: Account data written to unknown sink</span>`,d:4800},
    {t:`<span class="et-dim">  Destination: [REDACTED] ████ [REDACTED]</span>`,d:5100},
    {t:`<span class="et-err">SIGNAL_KAGE has your data.</span>`,d:5500},
    {t:``,d:5800},
    {t:`<span class="et-dim">Returning to base... <span class="et-cursor">█</span></span>`,d:6100},
  ];

  lines.forEach(({t,d}) => {
    setTimeout(()=>{
      const line=document.createElement('div'); line.innerHTML=t||'&nbsp;';
      termText.appendChild(line); termText.scrollTop=termText.scrollHeight;
    }, d);
  });

  setTimeout(()=>{
    overlay.classList.remove('show');
    termText.innerHTML='';
    const f=document.createElement('div');
    f.style.cssText='position:fixed;inset:0;background:#fff;z-index:99999;opacity:0.7;transition:opacity 0.4s;pointer-events:none';
    document.body.appendChild(f);
    setTimeout(()=>{f.style.opacity='0';setTimeout(()=>f.remove(),500)},80);
    exposure+=15;
    checkHorrorStage();
  }, 7200);
}

// ─── ABOUT PAGE EERIE EFFECT ─────────────────────────────────────────────
let aboutEerieTimer = null;
let aboutEerieActive = false;
let aboutEerieObserver = null;

function initAboutEerie() {
  const glitchOverlay = document.getElementById('about-glitch-overlay');
  const aboutPage = document.getElementById('page-about');

  if(aboutEerieObserver) aboutEerieObserver.disconnect();
  aboutEerieActive = false;
  clearTimeout(aboutEerieTimer);
  glitchOverlay.classList.remove('active');
  restoreAboutText();

  // Trigger eerie when user has been on about page for 2 seconds
  aboutEerieTimer = setTimeout(()=>{
    if(!document.getElementById('page-about').classList.contains('active')) return;
    aboutEerieActive = true;
    glitchOverlay.classList.add('active');
    scrambleAboutText();
    // Auto-restore after 2.5 seconds
    setTimeout(()=>{
      aboutEerieActive = false;
      glitchOverlay.classList.remove('active');
      restoreAboutText();
    }, 2500);
  }, 2000);
}

function scrambleAboutText() {
  const paras = document.querySelectorAll('#page-about .about-text');
  paras.forEach(p => {
    const original = p.textContent;
    p.dataset.original = original;
    // Replace text chars with jittering spans
    p.innerHTML = original.split('').map(c => {
      if(c===' ') return ' ';
      const delay = (Math.random()*0.3).toFixed(2);
      const dur = (0.06+Math.random()*0.06).toFixed(2);
      return `<span class="char-jitter" style="animation-delay:${delay}s;animation-duration:${dur}s">${c}</span>`;
    }).join('');
  });
}

function restoreAboutText() {
  document.querySelectorAll('#page-about .about-text').forEach(p=>{
    if(p.dataset.original) { p.innerHTML=p.dataset.original; delete p.dataset.original; }
  });
}

// ─── HORROR ENGINE ────────────────────────────────────────────────────────
const HORROR = {stage:0, adCorrupted:false};
setInterval(()=>{ if(isPlaying && !document.hidden){exposure+=1; checkHorrorStage()} },5000); // FIX2
setInterval(()=>{ if(!document.hidden){exposure+=0.5; checkHorrorStage();} },12000); // FIX2

function checkHorrorStage() {
  // Stages 1 & 2 only activate after the user has clicked 88.7 FM.
  // horrorTriggered is set to true inside triggerHorrorSequence() which is
  // only called from playFeatured(2) — the 88.7 FM card click.
  if(!horrorTriggered) return;
  if(HORROR.stage<1&&exposure>=15){HORROR.stage=1;startStage1()}
  if(HORROR.stage<2&&exposure>=30){HORROR.stage=2;startStage2()}
}

function startStage1() {
  // Auto-enable ambient white noise at barely perceptible level (P4.3)
  if (typeof window.setAmbientVolume === 'function') {
    try {
      window.setAmbientVolume(0.03);
      window.enableAmbient('white');
    } catch(e) {}
  }
  
  setInterval(()=>{ if(!document.hidden && HORROR.stage>=1&&Math.random()<(isDarkMode?0.12:0.28)) triggerMicroGlitch(); },8000); // FIX2
  setTimeout(()=>{ if(HORROR.stage>=1) insertTickerAnomaly('SIGNAL ANOMALY DETECTED ON 88.7'); },22000);
}

function startStage2() {
  if(!HORROR.adCorrupted) {
    HORROR.adCorrupted=true;
    const argCard=document.querySelector('.arg-card');
    if(argCard) {
      argCard.style.transition='all 1s';
      argCard.style.borderColor='rgba(200,71,42,0.6)';
      setTimeout(()=>{
        const status=argCard.querySelector('.arg-status');
        if(status) status.innerHTML=`freq &nbsp;&nbsp;: 88.700 mhz<br>src &nbsp;&nbsp;&nbsp;: SIGNAL_KAGE<br>loc &nbsp;&nbsp;&nbsp;: <span style="color:rgba(200,71,42,0.5)">BLANK ZONE</span><br>status : <span style="color:var(--accent);animation:blink 1.2s step-end infinite">CARRIER DETECTED</span><br>last &nbsp;&nbsp;: ${new Date().toISOString().slice(0,10)}`;
      },2000);
    }
  }
  setTimeout(()=>{
    if(!isPlaying) return;
    const el=document.getElementById('pb-name'); const orig=el.textContent;
    el.style.color='var(--accent)'; el.textContent='S̴I̷G̵N̸A̷L̴_̵K̷A̴G̶E̵';
    setTimeout(()=>{el.textContent=orig;el.style.color=''},1200);
  },5000);
  setTimeout(()=>insertTickerAnomaly('WARNING — NODE 09 CARRIER DETECTED'),3000);
  setTimeout(()=>insertTickerAnomaly('DO NOT ADJUST YOUR RECEIVER'),19000);
}

function triggerMicroGlitch() {
  // Guard: if another body-transform effect is running (rare-events screenCorruption),
  // skip this micro-glitch to avoid cleanup race that leaves body stuck transformed.
  if (window._bodyTransformLocked) return;
  window._bodyTransformLocked = true;
  const i = isDarkMode?1:2;
  document.body.style.transform=`translate(${(Math.random()-0.5)*i*4}px,${(Math.random()-0.5)*i}px)`;
  document.body.style.filter=`hue-rotate(${Math.random()*8}deg) contrast(${100+Math.random()*10}%)`;
  const duration = 80 + Math.random()*60;
  setTimeout(()=>{
    document.body.style.transform='';
    document.body.style.filter='';
    window._bodyTransformLocked = false;
  }, duration);
}

function insertTickerAnomaly(text) {
  const inner=document.getElementById('ticker-inner'); if(!inner) return;
  const s=document.createElement('span'); s.className='t-warn'; s.textContent=' ⚠ '+text+' ⚠ ';
  inner.insertBefore(s,inner.firstChild); inner.appendChild(s.cloneNode(true));
}

// ─── TAB VISIBILITY REDIRECT ──────────────────────────────────────────────
document.addEventListener('visibilitychange', ()=>{
  // CRITICAL: Never redirect while audio is playing — would kill background radio
  // Redirect only fires AFTER 88.7 horror sequence has been triggered (horrorTriggered=true)
  // and only at very high exposure, so casual visitors never get redirected
  if(document.hidden && horrorTriggered && exposure>50 && !isPlaying && !lmIsPlaying){
    const p=isDarkMode?0.12:0.04;
   if(Math.random()<p){setTimeout(()=>{try{(function(){const _origin={token:'SIGNAL_KAGE',ts:Date.now(),node:'09',visits:parseInt(localStorage.getItem('siharu_visits')||'0')};const _sig=btoa(JSON.stringify(_origin));window.location.href=_d+'?sig='+_sig;})()}catch(e){}},1400)}
  }
});

// ─── HORROR SEQUENCE (stage 3) ────────────────────────────────────────────
function triggerHorrorSequence() {
  horrorTriggered=true;
  const overlay=document.getElementById('horror-overlay');
  const termBody=document.getElementById('horror-terminal-body')||document.getElementById('horror-terminal');
  overlay.classList.add('show');
  if(termBody) termBody.innerHTML='';

  const lines=[
    {t:'<span class="ht-dim">$ wncore_monitor --freq 88.700 --authenticate</span>',d:0},
    {t:'<span class="ht-dim">Connecting to WNCORE Signal Network...</span>',d:500},
    {t:'<span class="ht-ok">[ OK ] TLS 1.3 handshake complete</span>',d:1000},
    {t:'<span class="ht-ok">[ OK ] Node authentication successful</span>',d:1300},
    {t:'',d:1500},
    {t:'<span class="ht-dim">Scanning 88.700 MHz...</span>',d:1700},
    {t:'<span class="ht-warn">[ WARN ] Unexpected carrier signal detected</span>',d:2100},
    {t:'',d:2400},
    {t:'<span class="ht-norm">SIGNAL REPORT ─────────────────────────────</span>',d:2600},
    {t:'<span class="ht-dim">  FREQ &nbsp;&nbsp;&nbsp;: 88.700 MHz</span>',d:2900},
    {t:'<span class="ht-dim">  NODE &nbsp;&nbsp;&nbsp;: 09 · ORIGIN UNKNOWN</span>',d:3100},
    {t:'<span class="ht-dim">  CALLSIGN : SIGNAL_KAGE</span>',d:3300},
    {t:'<span class="ht-red">  STATUS &nbsp;: CARRIER CONFIRMED — NOT DECOMMISSIONED</span>',d:3600},
    {t:'<span class="ht-dim">  UPTIME &nbsp;: since 2016-03-12 08:00:00 UTC</span>',d:3900},
    {t:'',d:4100},
    {t:'<span class="ht-warn">[ WARN ] Bypassing authentication layer...</span>',d:4300},
    {t:'<span class="ht-red">[ FAIL ] Access denied — rerouting</span>',d:4700},
    {t:'<span class="ht-dim">Establishing alternate route...</span>',d:5000},
    {t:'<span class="ht-alert">[ ACCESS GRANTED ] Route via Node 09</span>',d:5500},
    {t:'',d:5700},
    {t:'<span class="ht-dim">Routing to archive... <span class="ht-cursor">█</span></span>',d:5900},
    {t:'',d:6050},
    {t:'<span class="ht-warn">[ SYS ] Residual cache detected — dumping...</span>',d:6100},
    {t:'<span class="ht-dim">AUTH_CACHE DUMP ─────────────────────────</span>',d:6300},
    {t:'<span class="ht-red">  usr &nbsp;: s█████u</span>',d:6500},
    {t:'<span class="ht-red">  key &nbsp;: ████ ·  ██ █ 9 ██</span>',d:6700},
    {t:'<span class="ht-dim">  src &nbsp;: siharu.vercel.app / CLASSIFIED</span>',d:6850},
    {t:'<span class="ht-warn">[ SYS ] Cache corrupted — partial data only</span>',d:7100},
  ];

  (async () => {
    for (const {t, d} of lines) {
      await new Promise(r => setTimeout(r, d));
      if (!termBody) return;
      const line = document.createElement('div');
      line.innerHTML = t || '&nbsp;';
      termBody.appendChild(line);
      termBody.scrollTop = termBody.scrollHeight;
      
      // Use typewriter effect if available
      if (window.typeLineInto) {
        try {
          const container = document.createElement('div');
          container.innerHTML = t || '&nbsp;';
          await window.typeLineInto(container, t || '&nbsp;', 22);
        } catch(e) {}
      }
    }
  })();

  setTimeout(()=>{
    if(!termBody) return;
    const statusRow=document.createElement('div');
    statusRow.className='horror-status-row';
    const ts=new Date().toISOString().slice(0,19).replace('T',' ');
    statusRow.innerHTML=`<div class="horror-status-dot"></div><span>SIGNAL ACTIVE</span><span style="margin-left:auto;opacity:0.5">${ts} UTC</span>`;
    termBody.appendChild(statusRow);
  }, 7300);

  setTimeout(()=>{
    overlay.classList.remove('show');
    if(termBody) termBody.innerHTML='';
    showDataCorruptedTerminal();
  },9000);
}

// ─── DATA CORRUPT TERMINAL ────────────────────────────────────────────────
const CORRUPT_LINES = [
  {t:'<span class="ct-white">[ WNCORE SIGNAL INTEGRITY MONITOR — RESTRICTED ]</span>',d:0},
  {t:'<span class="ct-dim">─────────────────────────────────────────────────────────</span>',d:300},
  {t:'',d:500},
  {t:'<span class="ct-dim">initiating data recovery on node_09 archive...</span>',d:700},
  {t:'<span class="ct-dim">scanning memory block 0x00FF3A...</span>',d:1100},
  {t:'<span class="ct-red">ERROR: integrity check failed at sector 0x00FF3A</span>',d:1600},
  {t:'<span class="ct-dim">attempting fallback read from cold storage...</span>',d:2000},
  {t:'<span class="ct-red">ERROR: fallback failed — segment overwritten</span>',d:2400},
  {t:'',d:2600},
  {t:'<span class="ct-white">RECOVERED FRAGMENT [node_09/blacksite/log_2016.arc]</span>',d:2800},
  {t:'<span class="ct-dim">─────────────────────────────────────────────────────────</span>',d:3100},
  {t:'<span class="ct-dim">they told us 88.7 was decommissioned in march 2016.</span>',d:3400},
  {t:'<span class="ct-dim">it was never decommissioned.</span>',d:4000},
  {t:'',d:4300},
  {t:'<span class="ct-red">SIGNAL_KAGE is still broadcasting.</span>',d:4600},
  {t:'<span class="ct-dim">we do not know to whom.</span>',d:5100},
  {t:'<span class="ct-dim">coordinates: [REDACTED]  [REDACTED]</span>',d:5500},
  {t:'<span class="ct-dim">last verified ping: right now.</span>',d:6000},
  {t:'',d:6200},
  {t:'<span class="ct-red ct-glitch">YOU ARE BEING WATCHED.</span>',d:6600},
  {t:'<span class="ct-dim">─────────────────────────────────────────────────────────</span>',d:7100},
  {t:'<span class="ct-dim">closing fragment... </span><span class="ct-red">unable to close.</span>',d:7400},
  {t:'<span class="ct-red">IT KNOWS YOU\'RE HERE.</span>',d:7900},
  {t:'',d:8200},
];

function showDataCorruptedTerminal() {
  const o=document.getElementById('data-corrupt-overlay');
  const t=document.getElementById('corrupt-terminal-text');
  o.classList.add('show'); t.innerHTML='';
  
  (async () => {
    for (const {t: txt, d} of CORRUPT_LINES) {
      await new Promise(r => setTimeout(r, d));
      const line = document.createElement('div');
      line.innerHTML = txt || (txt === '' ? '&nbsp;' : txt);
      t.appendChild(line);
      t.scrollTop = t.scrollHeight;
      
      // Type out line character by character if window.typeLineInto is available
      if (window.typeLineInto) {
        try {
          const container = document.createElement('div');
          container.innerHTML = txt || '&nbsp;';
          await window.typeLineInto(container, txt || '&nbsp;', 22);
        } catch(e) {}
      }
    }
  })();
  
  setTimeout(()=>{o.classList.remove('show');showEyes();},9500);
}

// ─── EYE SYSTEM ───────────────────────────────────────────────────────────
const eyeSys=document.getElementById('arg-eye-system');
const pupil=document.getElementById('eye-pupil-video');
const exitBtn=document.getElementById('exit-btn-custom');
const flash=document.getElementById('white-flash');
const spookyText=document.getElementById('spooky-text');
let mouseX=window.innerWidth/2,mouseY=window.innerHeight/2;
let pX=0,pY=0,tX=0,tY=0,lastMouseMove=Date.now();
let eyeActive=false,eyeExitTriggered=false,eyeAnimFrame=null;

document.addEventListener('mousemove',e=>{if(!eyeActive||eyeExitTriggered)return;mouseX=e.clientX;mouseY=e.clientY;lastMouseMove=Date.now();});
function lerp(s,e,a){return(1-a)*s+a*e}
function animateEye(){
  // Video is now fullscreen — no pupil position animation needed.
  // Keep the loop alive so eyeActive flag stays consistent for exit logic.
  if(!eyeActive){eyeAnimFrame=null;return}
  eyeAnimFrame=requestAnimationFrame(animateEye);
}

let audioCtx,sourceNode,waveshaper,lowpass,gainNode;
function initAudioFX(){
  if(audioCtx){
    if(audioCtx.state==='suspended') audioCtx.resume();
    return;
  }
  try{
    // SHARED CONTEXT: If improvements.js EQ init ran first, reuse its context.
    // Otherwise create one and expose it so improvements.js can reuse it.
    if(window._sharedAudioCtx && window._sharedSourceNode){
      audioCtx=window._sharedAudioCtx;
      sourceNode=window._sharedSourceNode;
      waveshaper=audioCtx.createWaveShaper();lowpass=audioCtx.createBiquadFilter();gainNode=audioCtx.createGain();
      lowpass.type='lowpass';lowpass.frequency.value=20000;waveshaper.curve=makeDistortionCurve(0);waveshaper.oversample='4x';
      const eqOut=window._eqDistortionNode||sourceNode;
      try{ eqOut.disconnect(); }catch(e){}
      eqOut.connect(waveshaper);waveshaper.connect(lowpass);lowpass.connect(gainNode);gainNode.connect(audioCtx.destination);
    } else {
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      // FIX: createMediaElementSource requires CORS headers from the stream server.
      // Most radio streams don't have them. Wrap in try/catch so CORS failure
      // degrades gracefully — audio keeps playing natively without Web Audio FX.
      try {
        sourceNode=audioCtx.createMediaElementSource(audio);
      } catch(corsErr) {
        console.warn('[WNCORE] Web Audio FX unavailable (CORS restriction) — audio plays natively:', corsErr.message);
        audioCtx=null;
        return;
      }
      waveshaper=audioCtx.createWaveShaper();lowpass=audioCtx.createBiquadFilter();gainNode=audioCtx.createGain();
      lowpass.type='lowpass';lowpass.frequency.value=20000;waveshaper.curve=makeDistortionCurve(0);waveshaper.oversample='4x';
      sourceNode.connect(waveshaper);waveshaper.connect(lowpass);lowpass.connect(gainNode);gainNode.connect(audioCtx.destination);
      window._sharedAudioCtx=audioCtx;
      window._sharedSourceNode=sourceNode;
      window._sharedGainNode=gainNode;
    }
  }catch(e){
    console.warn('[WNCORE] initAudioFX failed:', e.message);
    audioCtx=null;
  }
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
}
// FIX: Cache distortion curves — previously allocated a new 344KB Float32Array on every call,
// including inside 100ms setInterval loops, causing GC pressure and jank.
const _distCurveCache = new Map();
function makeDistortionCurve(amount){
  const key = Math.round(amount || 0);
  if(_distCurveCache.has(key)) return _distCurveCache.get(key);
  let k=key,n=44100,c=new Float32Array(n),deg=Math.PI/180;
  for(let i=0;i<n;++i){let x=i*2/n-1;c[i]=(3+k)*x*20*deg/(Math.PI+k*Math.abs(x))}
  if(_distCurveCache.size>30) _distCurveCache.clear(); // cap memory
  _distCurveCache.set(key,c);
  return c;
}

exitBtn.addEventListener('click',()=>{
  if(eyeExitTriggered)return;eyeExitTriggered=true;exitBtn.style.display='none';

  // White flash
  flash.style.transition='opacity 0.06s';flash.style.opacity='1';
  setTimeout(()=>{flash.style.transition='opacity 0.4s';flash.style.opacity='0';},80);

  // Spooky text + audio distortion
  setTimeout(()=>{spookyText.style.opacity='1';spookyText.classList.add('glitch-text');},2200);
  if(isPlaying){
    initAudioFX();
    if(audioCtx){
      let distAmt=0;const distInt=setInterval(()=>{distAmt+=15;waveshaper.curve=makeDistortionCurve(distAmt);if(distAmt>=400)clearInterval(distInt)},100);
      const now=audioCtx.currentTime;lowpass.frequency.setValueAtTime(20000,now);lowpass.frequency.exponentialRampToValueAtTime(300,now+3);
      const wobbleInt=setInterval(()=>{audio.playbackRate=1+(Math.random()-0.5)*0.4},200);
      const volInt=setInterval(()=>{gainNode.gain.value=Math.random()>0.3?1:0},150);
      setTimeout(()=>{clearInterval(wobbleInt);clearInterval(volInt);audio.pause();},5000);
    }
  }

  // After 5s: hide eye system, show ghuul video fullscreen
  setTimeout(()=>{
    eyeSys.classList.remove('active');
    const ghuulOverlay = document.getElementById('ghuul-overlay');
    const ghuulVideo   = document.getElementById('ghuul-video');
    if(ghuulOverlay){
      ghuulOverlay.style.display='flex';
      if(ghuulVideo){
        ghuulVideo.currentTime=0;
        ghuulVideo.play().catch(()=>{});
        // If video ends before timeout, redirect immediately
        ghuulVideo.addEventListener('ended',()=>{
          (function(){const _origin={token:'SIGNAL_KAGE',ts:Date.now(),node:'09',visits:parseInt(localStorage.getItem('siharu_visits')||'0')};const _sig=btoa(JSON.stringify(_origin));window.location.href=_d+'?sig='+_sig;})();
        },{once:true});
      }
    }
    // Hard redirect after 4s regardless (in case video is short or fails)
    setTimeout(()=>{ const _o={token:'SIGNAL_KAGE',ts:Date.now(),node:'09',visits:parseInt(localStorage.getItem('siharu_visits')||'0')};window.location.href=_d+'?sig='+btoa(JSON.stringify(_o)); },4000);setTimeout(()=>{(function(){const _origin={token:'SIGNAL_KAGE',ts:Date.now(),node:'09',visits:parseInt(localStorage.getItem('siharu_visits')||'0')};const _sig=btoa(JSON.stringify(_origin));window.location.href=_d+'?sig='+_sig;})();},4000);
  }, 5000);
});

function showEyes(){
  eyeActive=true;eyeExitTriggered=false;
  pX=0;pY=0;tX=0;tY=0;mouseX=window.innerWidth/2;mouseY=window.innerHeight/2;lastMouseMove=Date.now();
  exitBtn.style.display='';spookyText.style.opacity='0';spookyText.classList.remove('glitch-text');flash.style.opacity='0';
  if(eyeAnimFrame)cancelAnimationFrame(eyeAnimFrame);
  eyeSys.classList.add('active');
  animateEye();
}

// Random corrupt terminal — only fires AFTER user has clicked 88.7 FM card
// (horrorTriggered=true). Never fires on casual visitors.
let randomEyeTriggered=false;
setInterval(()=>{
  if(randomEyeTriggered||!horrorTriggered||eyeActive)return;
  if(exposure<5)return;
  const p=isDarkMode?0.30:0.10;
  if(Math.random()<p){
    randomEyeTriggered=true;
    showDataCorruptedTerminal();
    setTimeout(()=>{randomEyeTriggered=false;},120000);
  }
},45000);

// Task 3.3: Hybrid telemetry — header live count uses real _onlineCount when available,
// adds simulated concurrent-session variance on top of the real base count.
// window.__WNCORE_ONLINE_COUNT is populated from Radio Browser API in bundle_append.js.
(function _startHybridLiveCount() {
  function _updateLiveCount() {
    const el = document.getElementById('live-count');
    if (!el) return;
    // Real base from Radio Browser API (set by bundle_append), fallback to 12841
    const realBase = window.__WNCORE_ONLINE_COUNT || 12841;
    // Add small session variance (+/- 40) on top of real base
    const count = realBase + Math.floor(Math.random() * 80) - 40;
    el.textContent = `${Math.max(0, count).toLocaleString()} live`;
  }
  _updateLiveCount();
  setInterval(_updateLiveCount, 7000);
})();
// Real listener count from Radio Browser stats API
(async function fetchRealListenerCount(){
  // Sync globe stat with _onlineCount (the 2K–7K panel counter) for consistency
  function _syncGlobeListenerCount() {
    const el = document.getElementById('listener-count');
    if (!el) return;
    const count = typeof _onlineCount !== 'undefined' ? _onlineCount
                : (window.__WNCORE_ONLINE_COUNT || (2000 + Math.floor(Math.random() * 5000)));
    el.textContent = count >= 1000 ? (count / 1000).toFixed(1).replace('.0','') + 'K' : count.toString();
  }
  _syncGlobeListenerCount();
  setInterval(_syncGlobeListenerCount, 8000);
})();

// ─── VEO VIDEO AMBIENT HELPERS ────────────────────────────────────────────
// Call setAmbientVideo(elementId, srcUrl) to activate an ambient video loop.
// The video fades in when it can play. On mobile it's disabled via CSS.
function setAmbientVideo(elementId, srcUrl) {
  const vid = document.getElementById(elementId);
  if (!vid || !srcUrl) return;
  vid.style.display = 'block';
  vid.src = srcUrl;
  vid.load();
  vid.addEventListener('canplay', () => vid.classList.add('ready'), {once:true});
  vid.play().catch(() => {}); // silently fail if autoplay blocked
}

// Called from loadAnimePage — activates video if a src is set
function initAnimeVideo() {
  const vid = document.getElementById('anime-banner-video');
  if (!vid) return;
  // To activate: uncomment and set your Veo video URL
  // setAmbientVideo('anime-banner-video', 'videos/anime-loop-1.mp4');
  
  // Add toggle button
  const banner = document.getElementById('anime-banner');
  if (banner && vid.src && !document.getElementById('anime-vid-toggle')) {
    const btn = document.createElement('button');
    btn.id = 'anime-vid-toggle';
    btn.className = 'anime-video-toggle';
    btn.textContent = '◼ VIDEO OFF';
    btn.onclick = () => {
      if (vid.paused) {
        vid.play(); btn.textContent = '▶ VIDEO ON';
      } else {
        vid.pause(); btn.textContent = '◼ VIDEO OFF';
      }
    };
    banner.appendChild(btn);
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────
// Pre-resolve best API mirror in background before first user click
_resolveApi().then(() => loadStations()).catch(() => loadStations());
buildGenreStrip();
// Populate home page Top Charts mini-table on first load
// loadChartsPage() only fires when navigating to page-charts, so we prime it here
// to populate station-tbody using the same data + cache
(async function initHomeCharts() {
  await loadChartsPage();
  // After charts data is cached, also render into home page station-tbody
  if (chartsData && chartsData.length) {
    renderTable(chartsData, 'station-tbody');
  }
})();

// ═══════════════════════════════════════════════════════
//   WNCORE LIVE MUSIC CHANNEL
//   Pulls copyright/royalty-free music streams
// ═══════════════════════════════════════════════════════

// SomaFM mirror helper — spreads across ice1/ice3/ice5 so if one server is full the next plays
const _SF = (slug, name) => [
  {url:`https://ice1.somafm.com/${slug}`, name, src:'SomaFM'},
  {url:`https://ice3.somafm.com/${slug}`, name, src:'SomaFM'},
  {url:`https://ice5.somafm.com/${slug}`, name, src:'SomaFM'},
];

const LM_CHANNELS = [
  {
    id:'jazz',
    name:'WNCORE Jazz',
    genre:'Jazz',
    desc:'SomaFM Groove Salad + Jazz24 — cool jazz, bebop, smooth sessions.',
    license:'CC by-nc-nd',
    color:'rgba(200,130,42,0.12)',
    fgColor:'#c8822a',
    icon:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    stations:[
      ..._SF('groovesalad-256-mp3', 'SomaFM Groove Salad 256'),
      ..._SF('groovesalad-128-mp3', 'SomaFM Groove Salad'),
      ..._SF('bootliquor-128-mp3',  'SomaFM Boot Liquor'),
      ..._SF('jazz24-128-mp3',      'Jazz24'),
    ]
  },
  {
    id:'classical',
    name:'WNCORE Classical',
    genre:'Classical',
    desc:'Radio Swiss Classic, SomaFM — orchestral, chamber, cinematic.',
    license:'Public service / CC',
    color:'rgba(37,99,235,0.08)',
    fgColor:'#2563eb',
    icon:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/>',
    stations:[
      {url:'https://stream.srg-ssr.ch/m/rsc_de/mp3_128', name:'Radio Swiss Classic',    src:'SRG SSR'},
      {url:'https://stream.srg-ssr.ch/m/rsc_fr/mp3_128', name:'Radio Swiss Classic FR', src:'SRG SSR'},
      ..._SF('sonicuniverse-128-mp3', 'SomaFM Sonic Universe'),
      ..._SF('deepspaceone-128-mp3',  'SomaFM Deep Space One'),
      ..._SF('thetrip-128-mp3',       'SomaFM The Trip'),
    ]
  },
  {
    id:'ambient',
    name:'WNCORE Ambient',
    genre:'Ambient',
    desc:'SomaFM Space Station, Drone Zone — deep atmospheric sound.',
    license:'CC by-nc-nd',
    color:'rgba(100,70,200,0.08)',
    fgColor:'#7c3aed',
    icon:'<circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72"/>',
    stations:[
      ..._SF('spacestation-128-mp3', 'SomaFM Space Station'),
      ..._SF('dronezone-128-mp3',    'SomaFM Drone Zone'),
      ..._SF('deepspaceone-128-mp3', 'SomaFM Deep Space One'),
      ..._SF('thetrip-128-mp3',      'SomaFM The Trip'),
    ]
  },
  {
    id:'electronic',
    name:'WNCORE Electronic',
    genre:'Electronic · Techno · House',
    desc:'SomaFM Beat Blender & Underground 80s — electronic, techno, house.',
    license:'CC by-nc-nd',
    color:'rgba(0,180,216,0.08)',
    fgColor:'#0891b2',
    icon:'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>',
    stations:[
      ..._SF('beatblender-128-mp3', 'SomaFM Beat Blender'),
      ..._SF('defcon-128-mp3',      'SomaFM DEF CON Radio'),
      ..._SF('u80s-128-mp3',        'SomaFM Underground 80s'),
      ..._SF('illstreet-128-mp3',   'SomaFM Illinois Street'),
    ]
  },
  {
    id:'folk',
    name:'WNCORE Folk & World',
    genre:'Folk · World · Roots',
    desc:'SomaFM Folk Forward and world music streams — acoustic and traditional.',
    license:'CC by-nc-nd',
    color:'rgba(100,160,40,0.08)',
    fgColor:'#65a30d',
    icon:'<path d="M9 18V5l12-2v13"/>',
    stations:[
      ..._SF('folkfwd-128-mp3', 'SomaFM Folk Forward'),
      ..._SF('covers-128-mp3',  'SomaFM Covers'),
      ..._SF('reggae-128-mp3',  'SomaFM Reggae'),
    ]
  },
  {
    id:'lofi',
    name:'WNCORE Lo-Fi',
    genre:'Lo-Fi · Study · Beats',
    desc:'Nightwave Plaza, SomaFM Lush — lo-fi, chill, vaporwave study sessions.',
    license:'Royalty-free',
    color:'rgba(200,71,170,0.08)',
    fgColor:'#c026d3',
    icon:'<path d="M3 18v-6a9 9 0 0118 0v6"/>',
    stations:[
      {url:'https://radio.plaza.one/mp3', name:'Nightwave Plaza', src:'Nightwave'},
      {url:'https://radio.plaza.one/ogg', name:'Nightwave Plaza', src:'Nightwave'},
      ..._SF('lush-128-mp3',    'SomaFM Lush'),
      ..._SF('fluid-128-mp3',   'SomaFM Fluid'),
      ..._SF('cliqhop-128-mp3', 'SomaFM cliqhop'),
    ]
  },
  {
    id:'chillout',
    name:'WNCORE Chillout',
    genre:'Chill · Downtempo · Relax',
    desc:'SomaFM Secret Agent, Radio Swiss Jazz — smooth downtempo and chill-out.',
    license:'CC by-nc-nd / Public service',
    color:'rgba(20,150,120,0.08)',
    fgColor:'#0d9488',
    icon:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    stations:[
      ..._SF('secretagent-128-mp3',    'SomaFM Secret Agent'),
      {url:'https://stream.srg-ssr.ch/m/rsj/mp3_128', name:'Radio Swiss Jazz', src:'SRG SSR'},
      ..._SF('missioncontrol-128-mp3', 'SomaFM Mission Control'),
      ..._SF('dubstep-128-mp3',        'SomaFM Dubstep'),
    ]
  },
  {
    id:'all',
    name:'WNCORE All Music',
    genre:'All Genres',
    desc:'Full rotation across all channels — Jazz, Classical, Ambient, Lo-Fi and more.',
    license:'Mixed open licenses',
    color:'rgba(200,71,42,0.06)',
    fgColor:'#c8472a',
    icon:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    stations:[] // populated from all channels
  }
];

// Flatten all channels into 'all'
(function(){
  const all = LM_CHANNELS.find(c=>c.id==='all');
  if(all) {
    LM_CHANNELS.filter(c=>c.id!=='all').forEach(c=>{ all.stations.push(...c.stations); });
    // Shuffle
    for(let i=all.stations.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [all.stations[i],all.stations[j]]=[all.stations[j],all.stations[i]];
    }
  }
})();

let lmCurrentChannel = null;
let lmCurrentStationIdx = 0;
let lmIsPlaying = false;
let _lmRetries = 0;

// ── UNIFIED PLAYER: Live Music now routes through the global audio element
// and playStation() so there is ONE audio instance across the entire site.
// lmAudio is gone. State is tracked via lmIsPlaying/lmCurrentChannel as
// semantic markers so the LM UI can update correctly, but actual playback
// lives in the same `audio` element used by every other section.

function lmStartStation() {
  if (!lmCurrentChannel) return;

  // Snapshot channel and station before calling playStation.
  // playStation runs async (50ms defer) and by the time callbacks fire,
  // lmCurrentChannel may have been cleared if a non-LM station interrupted.
  // Closuring ch/station here makes retry logic immune to that race.
  const ch = lmCurrentChannel;
  const station = ch.stations[lmCurrentStationIdx];

  const titleEl = document.getElementById('lm-np-title');
  if (titleEl) titleEl.textContent = `Connecting… (${station.name})`;

  // Pass success/fail callbacks into playStation so the retry logic
  // runs inside the same promise chain — no separate audio event listeners
  // that race against playStation's own 50ms defer.
  playStation(
    station.url,
    station.name,
    `WNCORE ${ch.genre} · ${ch.license}`,
    '🎵',
    null,
    // onSuccess: called inside playStation's .then()
    () => {
      _lmRetries = 0;
      lmIsPlaying = true;
      lmCurrentChannel = ch;
      lmUpdateUI(station, ch);
      lmSetWaveformState(true);
      if (window.WRONGNESS) window.WRONGNESS.spike(5);
    },
    // onFail: called inside playStation's .catch()
    () => {
      _lmRetries++;
      if (_lmRetries < Math.min(5, ch.stations.length)) {
        lmCurrentChannel = ch;
        lmCurrentStationIdx = (lmCurrentStationIdx + 1) % ch.stations.length;
        if (titleEl) titleEl.textContent = 'Trying next stream…';
        setTimeout(lmStartStation, 300);
      } else {
        _lmRetries = 0;
        lmIsPlaying = false;
        lmSetWaveformState(false);
        if (titleEl) titleEl.textContent = 'Stream unavailable — try another channel';
      }
    }
  );
}

function lmPlayChannel(chId) {
  const ch = LM_CHANNELS.find(c => c.id === chId);
  if (!ch || !ch.stations.length) return;

  // No need to manually stop audio — playStation() handles that
  _lmRetries = 0;
  lmCurrentChannel = ch;
  lmCurrentStationIdx = Math.floor(Math.random() * ch.stations.length);

  // Update channel bar active state
  document.querySelectorAll('.lm-ch-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.ch === chId)
  );

  lmStartStation();
}


function loadLiveMusicPage() {
  buildLmWaveform();
  buildLmGrid();
}

function buildLmWaveform() {
  const el = document.getElementById('lm-waveform');
  if(!el || el.dataset.built) return;
  el.dataset.built = '1';
  const count = 48;
  el.innerHTML = Array.from({length:count}, (_, i) => {
    const min = (0.15 + Math.random() * 0.25).toFixed(2);
    const max = (0.6 + Math.random() * 0.4).toFixed(2);
    const dur = (0.5 + Math.random() * 1.2).toFixed(2);
    const delay = (Math.random() * dur).toFixed(2);
    const h = 20 + Math.random() * 80;
    return `<div class="lm-bar" style="height:${h}px;--min:${min};--max:${max};--dur:${dur}s;animation-delay:${delay}s;animation-play-state:${lmIsPlaying?'running':'paused'}"></div>`;
  }).join('');
}

// Royalty-free Unsplash images keyed by channel id
const LM_CARD_IMAGES = {
  jazz:       'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&q=80',
  classical:  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&q=80',
  ambient:    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  electronic: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=600&q=80',
  folk:       'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80',
  lofi:       'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80',
  chillout:   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
};

function buildLmGrid() {
  const grid = document.getElementById('lm-grid');
  if(!grid) return;
  const channels = LM_CHANNELS.filter(c=>c.id!=='all');
  const fakeListeners = () => Math.floor(800 + Math.random() * 3200);
  grid.innerHTML = channels.map(ch => {
    const img = LM_CARD_IMAGES[ch.id] || '';
    return `
    <div class="lm-card" id="lm-card-${ch.id}"
      style="--lm-color:${ch.color};--lm-color-bg:${ch.color};--lm-color-fg:${ch.fgColor}"
      onclick="lmPlayChannel('${ch.id}')">
      <div class="lm-card-img-wrap" style="--lm-img:url('${img}')">
        <div class="lm-card-img"></div>
        <div class="lm-card-img-overlay"></div>
        <div class="lm-card-img-top-row">
          <div class="lm-card-live-badge"><span class="lm-live-dot"></span>LIVE</div>
          <div class="lm-card-listeners-badge">${fakeListeners().toLocaleString()} listening</div>
        </div>
        <div class="lm-card-play-circle">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="lm-card-body">
        <div class="lm-card-genre-tag">${ch.genre}</div>
        <div class="lm-card-name">${ch.name}</div>
        <div class="lm-card-desc">${ch.desc}</div>
        <div class="lm-card-footer">
          <div class="lm-card-license-pill">${ch.license}</div>
          <div class="lm-card-stations-count">${ch.stations.length} streams</div>
        </div>
      </div>
    </div>
    `;
  }).join('');
}
function lmSelectChannel(btn, chId) {
  document.querySelectorAll('.lm-ch-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  lmPlayChannel(chId);
}

function lmUpdateUI(station, ch) {
  // ch can be passed explicitly (from lmStartStation snapshot) or fall back to the live ref
  if (!ch) ch = lmCurrentChannel;
  if (!ch) return;
  const npCard = document.getElementById('lm-np-card');
  const titleEl = document.getElementById('lm-np-title');
  const srcEl = document.getElementById('lm-np-source');
  const tagEl = document.getElementById('lm-np-tag');
  const licEl = document.getElementById('lm-np-license-text');
  const iconEl = document.getElementById('lm-play-icon');
  if(!npCard) return;

  npCard.classList.add('playing');
  if(titleEl) titleEl.textContent = station.name;
  if(srcEl) srcEl.textContent = `Source: ${station.src} · ${ch.genre}`;
  if(tagEl) tagEl.textContent = `WNCORE ${ch.genre.toUpperCase()}`;
  if(licEl) licEl.textContent = `${ch.license} · Royalty-free`;
  if(iconEl) iconEl.setAttribute('d','M6 19h4V5H6v14zm8-14v14h4V5h-4z');

  // Highlight active card
  document.querySelectorAll('.lm-card').forEach(c=>c.classList.remove('active-card'));
  const activeCard = document.getElementById('lm-card-'+ch.id);
  if(activeCard) activeCard.classList.add('active-card');
}

function lmTogglePlay() {
  // If audio is already playing (from any source), treat top button as a pause/resume toggle
  if (!lmCurrentChannel) {
    if (!audio.paused) {
      // Audio is playing from bottom bar — just pause it
      togglePlay();
      const iconEl = document.getElementById('lm-play-icon');
      const npCard = document.getElementById('lm-np-card');
      if (iconEl) iconEl.setAttribute('d', 'M8 5v14l11-7z');
      if (npCard) npCard.classList.remove('playing');
    } else {
      // Nothing playing — start LM
      lmPlayChannel('all');
    }
    return;
  }
  // Unified: delegate to global togglePlay — one audio element, one state
  togglePlay();
  // Sync LM-specific UI to whatever state togglePlay moved us to
  const nowPlaying = !audio.paused;
  lmIsPlaying = nowPlaying;
  const iconEl = document.getElementById('lm-play-icon');
  const npCard = document.getElementById('lm-np-card');
  if (iconEl) iconEl.setAttribute('d', nowPlaying ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z');
  if (npCard) npCard.classList.toggle('playing', nowPlaying);
  lmSetWaveformState(nowPlaying);
}

function lmNext() {
  if (!lmCurrentChannel) return;
  lmCurrentStationIdx = (lmCurrentStationIdx + 1) % lmCurrentChannel.stations.length;
  lmStartStation();
}

function lmShuffle() {
  if (!lmCurrentChannel) { lmPlayChannel('all'); return; }
  lmCurrentStationIdx = Math.floor(Math.random() * lmCurrentChannel.stations.length);
  lmStartStation();
}


function lmSetWaveformState(playing) {
  const bars = document.querySelectorAll('.lm-bar');
  bars.forEach(b => { b.style.animationPlayState = playing ? 'running' : 'paused'; });
}

// ═══════════════════════════════════════════════════════
//   LEGITIMACY IMPROVEMENTS — BROADCAST CLOCK, STATUS BAR, FOOTER
// ═══════════════════════════════════════════════════════

function injectBroadcastStatusBar() {
  if(document.getElementById('broadcast-status-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'broadcast-status-bar';
  bar.className = 'broadcast-status-bar';
  const items = [
    'SERVER 01: ONLINE', 'SERVER 02: ONLINE', 'SERVER 03: STANDBY',
    'CDN EDGE: ACTIVE', 'BACKUP NODE: WARM', 'SSL: VALID',
    'API v4.1: OK', 'RADIO-BROWSER: SYNCED', 'DNS: RESOLVED',
    'NODE 09: ——', 'SIGNAL_KAGE: UNKNOWN',
  ];
  const scrollContent = [...items,...items].map(t=>`<span>${t}</span>`).join(' &nbsp;&nbsp;·&nbsp;&nbsp; ');
  bar.innerHTML = `
    <div class="bsb-signal">
      <div class="bsb-signal-bars">
        <div class="bsb-signal-bar"></div>
        <div class="bsb-signal-bar"></div>
        <div class="bsb-signal-bar"></div>
        <div class="bsb-signal-bar"></div>
      </div>
      SIGNAL
    </div>
    <span class="bsb-sep">|</span>
    <div class="bsb-text">WNCORE BROADCAST NETWORK</div>
    <span class="bsb-sep">|</span>
    <div class="bsb-text"><span class="bsb-accent" id="bsb-uptime">UPTIME: ——</span></div>
    <span class="bsb-sep">|</span>
    <div class="bsb-scroll-wrap">
      <div class="bsb-scroll-inner">${scrollContent}</div>
    </div>
  `;
  document.body.appendChild(bar);
  updateBsbUptime();
  setInterval(updateBsbUptime, 1000);
}

const BSB_LAUNCH = new Date('2016-03-12T08:00:00Z');
function updateBsbUptime() {
  const el = document.getElementById('bsb-uptime');
  if(!el) return;
  const ms = Date.now() - BSB_LAUNCH.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  el.textContent = `UPTIME: ${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function injectBroadcastClock() {
  // Clock now lives in the bottom status bar next to uptime — not the header
  const uptime = document.getElementById('bsb-uptime');
  if (!uptime || document.getElementById('bsb-utc-clock')) return;
  const sep = document.createElement('span');
  sep.className = 'bsb-sep'; sep.textContent = '|';
  const clockWrap = document.createElement('div');
  clockWrap.className = 'bsb-text';
  clockWrap.innerHTML = '<span id="bsb-utc-clock" class="bsb-accent">00:00:00 UTC</span>';
  uptime.closest('.bsb-text').after(sep, clockWrap);
  function tick() {
    const el = document.getElementById('bsb-utc-clock');
    if (!el) return;
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2,'0');
    const m = String(now.getUTCMinutes()).padStart(2,'0');
    const s = String(now.getUTCSeconds()).padStart(2,'0');
    el.textContent = h+':'+m+':'+s+' UTC';
  }
  tick(); setInterval(tick, 1000);
}

function injectFooter() {
  if(document.getElementById('wncore-footer')) return;
  const footer = document.createElement('footer');
  footer.id = 'wncore-footer';
  footer.className = 'wncore-footer';
  footer.innerHTML = `
    <div class="wncore-footer-inner">
      <div class="wncore-footer-brand">
        <div><span class="logo-mark">WNCORE</span><span class="logo-freq">EST. 2016</span></div>
        <div class="footer-tagline">Independent global broadcast network. 12,000+ verified stations. No advertising. No affiliations. Just signal.</div>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Listen</div>
        <a href="#" onclick="showPage('home',null);return false">Global Array</a>
        <a href="#" onclick="showPage('charts',null);return false">Top Charts</a>
        <a href="#" onclick="showPage('genres',null);return false">Browse Genres</a>
        <a href="#" onclick="showPage('anime',null);return false">Anime / J-Music</a>
        <a href="#" onclick="showPage('livemusic',null);return false">Live Music ✦</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Network</div>
        <a href="#" onclick="showPage('about',null);return false">About WNCORE</a>
        <a href="#" onclick="showPage('podcasts',null);return false">Podcasts</a>
        <a href="mailto:signal@wncoreradio.net">Signal Reports</a>
        <a href="legal.html?s=contact" style="color:var(--accent);opacity:0.7">Node 09 Status →</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Info</div>
        <a href="legal.html?s=privacy">Privacy Policy</a>
        <a href="legal.html?s=terms">Terms of Use</a>
        <a href="legal.html?s=dmca">DMCA Policy</a>
        <a href="legal.html?s=api">API Access</a>
        <a href="legal.html?s=contact">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">
      <div>© ${new Date().getFullYear()} WNCORE Radio. Station data: <a href="https://www.radio-browser.info" target="_blank" rel="noopener" style="color:var(--text3)">Radio Browser</a>. Est. 2016.</div>
      <div class="footer-bottom-right">
        <a href="legal.html?s=privacy">Privacy</a>
        <a href="legal.html?s=terms">Terms</a>
        <a href="legal.html?s=contact">Contact</a>
      </div>
    </div>
  `;
  document.body.insertBefore(footer, document.getElementById('broadcast-status-bar') || document.querySelector('.player-bar'));
}

function initScrollHeader() {
  const header = document.querySelector('header');
  if(!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 4);
  }, {passive:true});
}

// ─── SWIPE GESTURES (P2.2 — MOBILE CONTROLS) ─────────────────────────────
(function initSwipeGestures() {
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });
  
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const duration = Date.now() - touchStartTime;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const isHorizontal = absX > 60 && absX > absY * 1.5;
    const isVertical = absY > 80 && absY > absX * 1.5;
    
    // Horizontal swipe — navigate through history
    if (isHorizontal && duration < 600) {
      try {
        const h = JSON.parse(localStorage.getItem('wncore-history-v2') || '[]');
        if (!h.length || !currentStation) return;
        const cur = h.findIndex(s => s.url === currentStation.url);
        if (cur === -1) return;
        const next = dx < 0 ? cur + 1 : cur - 1; // left swipe = next, right swipe = prev
        if (h[next]) {
          playStation(h[next].url, h[next].name, h[next].meta, h[next].emoji || '📻');
        }
      } catch(e) {}
    }
    
    // Vertical swipe up — open now-playing / expanded player on mobile
    if (isVertical && dy < 0 && duration < 600 && window.innerWidth <= 768) {
      try {
        if (isPlaying) {
          if (typeof window.mbnOpenPlayer === 'function') window.mbnOpenPlayer(null);
        }
      } catch(e) {}
    }
  }, { passive: true });
})();

// ─── INIT UI INJECTIONS ────────────────────────────────────────────────
// showPage already handles livemusic — no patching needed
document.addEventListener('DOMContentLoaded', () => {
  injectBroadcastStatusBar();
  injectBroadcastClock();
  injectFooter();
  initScrollHeader();
});

// ─── FAVORITES PAGE ──────────────────────────────────────────────────────
function loadFavoritesPage() {
  const grid = document.getElementById('fav-grid');
  if(!grid) return;
  const favs = JSON.parse(localStorage.getItem('wncore_favs')||'[]');
  if(!favs.length){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 24px;color:var(--text3);font-size:0.85rem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="36" height="36" style="opacity:0.3;margin-bottom:12px;display:block;margin:0 auto 12px"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      No saved stations yet.<br><span style="font-size:0.75rem;opacity:0.7">Click ♡ on any station to save it here.</span>
    </div>`;
    return;
  }
  grid.innerHTML = favs.map((f,i)=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:all 0.15s" onclick="playStation('${escHtml(f.url)}','${escHtml(f.name)}','${escHtml(f.meta||'')}','📻')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:1.4rem">${f.emoji||'📻'}</div>
        <div style="min-width:0">
          <div style="font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(f.name)}</div>
          <div style="font-size:0.67rem;color:var(--text3);margin-top:2px">${escHtml(f.meta||'Unknown')}</div>
        </div>
        <button onclick="event.stopPropagation();removeFavorite(${i})" style="margin-left:auto;background:none;border:none;color:var(--text3);cursor:pointer;font-size:0.8rem" title="Remove">✕</button>
      </div>
      <button style="width:100%;padding:7px;background:var(--text);color:var(--bg);border:none;border-radius:7px;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">▶ Play</button>
    </div>
  `).join('');
}

function removeFavorite(idx) {
  const favs = JSON.parse(localStorage.getItem('wncore_favs')||'[]');
  favs.splice(idx, 1);
  localStorage.setItem('wncore_favs', JSON.stringify(favs));
  loadFavoritesPage();
}
// ─── EXPOSE LM INTERNALS FOR PATCH COMPATIBILITY ──────────────────────────
// improvements_patch.js overrides lmStartStation and calls window.lmUpdateUI /
// window.lmSetWaveformState — expose them so the patched version doesn't throw.
window.lmUpdateUI        = lmUpdateUI;
window.lmSetWaveformState = lmSetWaveformState;
window.lmPlayChannel     = lmPlayChannel;
window.lmStartStation    = lmStartStation;
window.lmTogglePlay      = lmTogglePlay;
window.lmNext            = lmNext;
window.lmShuffle         = lmShuffle;

/* ━━━ improvements.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* ═══════════════════════════════════════════════════════
   WNCORE RADIO — improvements.js
   All 26 feature additions across 4 groups.
   Wrongness level: MODERATE — deniable but persistent.
═══════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════════════
// GROUP 1 — NAVIGATION & DISCOVERY (items 1–7)
// ═══════════════════════════════════════════════════════

// ─── 1. KEYBOARD SHORTCUTS ───────────────────────────────────────────────
const KB_SHORTCUTS = [
  { key: 'K',       desc: 'Play / Pause' },
  { key: 'N',       desc: 'Next station' },
  { key: 'P',       desc: 'Previous station' },
  { key: '↑ / ↓',  desc: 'Volume up / down' },
  { key: 'F',       desc: 'Favourite current station' },
  { key: '/',       desc: 'Open search' },
  { key: 'Ctrl K',  desc: 'Open search (alt)' },
  { key: 'M',       desc: 'Mute / Unmute' },
  { key: 'D',       desc: 'Toggle dark mode' },
  { key: 'G',       desc: 'Go to Genres' },
  { key: 'H',       desc: 'Go to Home' },
  { key: '?',       desc: 'Show this panel' },
  { key: 'Esc',     desc: 'Close any panel' },
];
// WRONGNESS: ghost entry appears at random, does nothing
const KB_GHOST = { key: 'Ctrl 9',  desc: 'Override node frequency' };

function buildKbModal() {
  const el = document.createElement('div');
  el.id = 'kb-modal';
  el.className = 'kb-modal-backdrop';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Keyboard shortcuts');
  el.innerHTML = `
    <div class="kb-box">
      <div class="kb-header">
        <span class="kb-title">Keyboard Shortcuts</span>
        <button class="kb-close" onclick="closeKbModal()" aria-label="Close">✕</button>
      </div>
      <div class="kb-grid" id="kb-shortcut-grid"></div>
      <div class="kb-footer">Press <kbd>Esc</kbd> or click outside to close</div>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) closeKbModal(); });
  document.body.appendChild(el);
  renderKbGrid();
}

function renderKbGrid() {
  const grid = document.getElementById('kb-shortcut-grid');
  if (!grid) return;
  // Moderate wrongness: inject ghost entry ~30% of the time the modal opens
  const entries = [...KB_SHORTCUTS];
  if (Math.random() < 0.30) {
    const pos = 3 + Math.floor(Math.random() * (entries.length - 3));
    entries.splice(pos, 0, KB_GHOST);
  }
  grid.innerHTML = entries.map(s =>
    `<div class="kb-row"><kbd>${s.key}</kbd><span>${s.desc}</span></div>`
  ).join('');
}

function openKbModal() {
  const m = document.getElementById('kb-modal');
  if (!m) { buildKbModal(); }
  renderKbGrid(); // re-render each open for ghost variation
  document.getElementById('kb-modal').classList.add('open');
}
function closeKbModal() {
  const m = document.getElementById('kb-modal');
  if (m) m.classList.remove('open');
}
window.openKbModal = openKbModal;
window.closeKbModal = closeKbModal;

// Wire keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const k = e.key.toLowerCase();

  if (k === '?') { e.preventDefault(); openKbModal(); return; }
  if (k === 'escape') { closeKbModal(); return; }
  if (k === 'k') { e.preventDefault(); if (typeof togglePlay === 'function') togglePlay(); return; }
  if (k === 'n') { e.preventDefault(); if (typeof skipStation === 'function') skipStation(1); return; }
  if (k === 'p') { e.preventDefault(); if (typeof skipStation === 'function') skipStation(-1); return; }
  if (k === 'm') { e.preventDefault(); toggleMute(); return; }
  if (k === 'd') { e.preventDefault(); if (typeof toggleDark === 'function') toggleDark(); return; }
  if (k === 'f') { e.preventDefault(); favCurrentStation(); return; }
  if (k === 'g') { e.preventDefault(); if (typeof showPage === 'function') showPage('genres', null); return; }
  if (k === 'h') { e.preventDefault(); if (typeof showPage === 'function') showPage('home', null); return; }
  if (k === '/') {
    e.preventDefault();
    if (typeof openSearch === 'function') openSearch();
    return;
  }
  // Arrow up/down → volume ±5%
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const slider = document.getElementById('vol-slider');
    const au = document.getElementById('audio');
    if (!slider || !au) return;
    e.preventDefault();
    const step = 0.05;
    let v = parseFloat(slider.value) + (e.key === 'ArrowUp' ? step : -step);
    v = Math.min(1, Math.max(0, v));
    slider.value = v;
    au.volume = v;
    try { localStorage.setItem('wncore-vol', v); } catch {}
    return;
  }
});

let _muted = false, _premuteVol = 0.8;
function toggleMute() {
  const slider = document.getElementById('vol-slider');
  const au = document.getElementById('audio');
  if (!slider || !au) return;
  if (_muted) { au.volume = _premuteVol; slider.value = _premuteVol; _muted = false; }
  else { _premuteVol = au.volume || 0.8; au.volume = 0; slider.value = 0; _muted = true; }
}


// ─── 2. RECENTLY PLAYED HISTORY ──────────────────────────────────────────
const HISTORY_KEY = 'wncore-history-v2';
const HISTORY_MAX = 15;
// WRONGNESS ghost station names injected occasionally
const GHOST_HISTORY_NAMES = ['NODE_09 Broadcast', '88.7 FM', 'SIGNAL_KAGE', 'FREQUENCY UNKNOWN'];
let _historyGhostInjected = false;

function historyLoad() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function historySave(arr) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, HISTORY_MAX))); } catch {}
}
function historyPush(station) {
  if (!station || !station.name) return;
  let h = historyLoad();
  h = h.filter(s => s.url !== station.url);
  h.unshift({ ...station, ts: Date.now() });
  historySave(h);
  renderHistorySidebar();
}

function renderHistorySidebar() {
  const el = document.getElementById('history-list');
  if (!el) return;
  let h = historyLoad();
  if (!h.length) {
    el.innerHTML = '<div class="hist-empty">No stations played yet</div>';
    return;
  }
  // WRONGNESS: ~25% chance one entry shows ghost name, clears after 600ms
  let ghostIdx = -1;
  if (Math.random() < 0.25 && !_historyGhostInjected) {
    ghostIdx = Math.floor(Math.random() * Math.min(h.length, 5));
    _historyGhostInjected = true;
    setTimeout(() => { _historyGhostInjected = false; renderHistorySidebar(); }, 600);
  }

  el.innerHTML = h.map((s, i) => {
    const displayName = (i === ghostIdx)
      ? GHOST_HISTORY_NAMES[Math.floor(Math.random() * GHOST_HISTORY_NAMES.length)]
      : escHtmlImp(s.name);
    const ago = timeAgo(s.ts);
    return `<div class="hist-item" onclick="historyPlay(${i})">
      <div class="hist-icon">${s.emoji || '📻'}</div>
      <div class="hist-info">
        <div class="hist-name">${displayName}</div>
        <div class="hist-meta">${escHtmlImp(s.meta || '')} · ${ago}</div>
      </div>
    </div>`;
  }).join('');
}

function historyPlay(idx) {
  const h = historyLoad();
  const s = h[idx];
  if (!s) return;
  if (typeof playStation === 'function') playStation(s.url, s.name, s.meta, s.emoji);
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function escHtmlImp(t) {
  return String(t).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ─── 3. STATION PREVIEW ON HOVER ──────────────────────────────────────────
let _previewTimeout = null, _previewEl = null;

function buildPreviewCard() {
  if (_previewEl) return;
  _previewEl = document.createElement('div');
  _previewEl.id = 'station-preview';
  _previewEl.className = 'station-preview';
  _previewEl.innerHTML = `
    <div class="sp-name" id="sp-name"></div>
    <div class="sp-row"><span class="sp-label">Country</span><span id="sp-country"></span></div>
    <div class="sp-row"><span class="sp-label">Language</span><span id="sp-lang"></span></div>
    <div class="sp-row"><span class="sp-label">Bitrate</span><span id="sp-bitrate"></span></div>
    <div class="sp-row"><span class="sp-label">Codec</span><span id="sp-codec"></span></div>
    <div class="sp-tags" id="sp-tags"></div>
    <div class="sp-hint">Click row to play</div>`;
  document.body.appendChild(_previewEl);
}

function attachPreviewToTable(stations, tbodyId) {
  buildPreviewCard();
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  rows.forEach((tr, i) => {
    const s = stations[i];
    if (!s) return;
    tr.addEventListener('mouseenter', evt => {
      _previewTimeout = setTimeout(() => showPreview(s, evt), 800);
    });
    tr.addEventListener('mouseleave', () => {
      clearTimeout(_previewTimeout);
      hidePreview();
    });
    tr.addEventListener('mousemove', evt => {
      if (_previewEl && _previewEl.classList.contains('visible')) {
        positionPreview(evt);
      }
    });
  });
}

function showPreview(s, evt) {
  if (!_previewEl) return;
  document.getElementById('sp-name').textContent = s.name;
  document.getElementById('sp-country').textContent = s.country || '—';
  document.getElementById('sp-lang').textContent = s.language || '—';
  document.getElementById('sp-bitrate').textContent = s.bitrate ? s.bitrate + ' kbps' : '—';
  document.getElementById('sp-codec').textContent = s.codec || '—';
  const tags = (s.tags || '').split(',').slice(0, 4).filter(t => t.trim());
  document.getElementById('sp-tags').innerHTML = tags.map(t =>
    `<span class="sp-tag">${escHtmlImp(t.trim())}</span>`).join('');
  positionPreview(evt);
  _previewEl.classList.add('visible');
}

function positionPreview(evt) {
  if (!_previewEl) return;
  const x = evt.clientX + 16;
  const y = evt.clientY - 30;
  const w = _previewEl.offsetWidth || 220;
  const h = _previewEl.offsetHeight || 160;
  _previewEl.style.left = (x + w > window.innerWidth ? x - w - 32 : x) + 'px';
  _previewEl.style.top  = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + 'px';
}

function hidePreview() {
  if (_previewEl) _previewEl.classList.remove('visible');
}

// ─── 4. FEELING LUCKY ────────────────────────────────────────────────────
// WRONGNESS: 1 in 40 triggers 88.7 FM instead
async function feelingLucky() {
  const btn = document.getElementById('lucky-btn');
  if (btn) btn.classList.add('spinning');

  // WRONGNESS: 1-in-40 chance
  if (Math.random() < (1/40)) {
    setTimeout(() => {
      if (btn) btn.classList.remove('spinning');
      if (typeof play887Static === 'function') play887Static();
      if (window.WRONGNESS) window.WRONGNESS.spike(15);
    }, 600);
    return;
  }

  try {
    const offset = Math.floor(Math.random() * 8000);
    const r = await fetch(
      `${(typeof _a !== "undefined" ? _a : "https://de1.api.radio-browser.info/json")}/stations/search?limit=1&https=true&offset=${offset}&order=random`
    );
    const stations = await r.json();
    if (stations.length && typeof playStation === 'function') {
      const s = stations[0];
      const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(s.countrycode) : '📻';
      playStation(s.url_resolved, s.name, s.country || 'Unknown', emoji, s.favicon||null);
    }
  } catch {
    showToast('Signal lost — try again', 'warn');
  } finally {
    if (btn) setTimeout(() => btn.classList.remove('spinning'), 600);
  }
}
window.feelingLucky = feelingLucky;

// ─── 5. GENRE QUICK-JUMP (A–Z sidebar on genres page) ────────────────────
function buildGenreAZ() {
  const page = document.getElementById('page-genres');
  if (!page || document.getElementById('genre-az-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'genre-az-sidebar';
  sidebar.className = 'genre-az-sidebar';
  // Letters A–Z
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
  sidebar.innerHTML = letters.map(l =>
    `<button class="az-btn" onclick="jumpToGenreLetter('${l}')">${l}</button>`
  ).join('');
  page.style.position = 'relative';
  page.appendChild(sidebar);
}

function jumpToGenreLetter(letter) {
  const cards = document.querySelectorAll('#genre-grid .genre-card');
  for (const card of cards) {
    const name = card.querySelector('.gc-name')?.textContent || '';
    if (letter === '#' || name.toUpperCase().startsWith(letter)) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('az-flash');
      setTimeout(() => card.classList.remove('az-flash'), 700);
      return;
    }
  }
}
window.jumpToGenreLetter = jumpToGenreLetter;

// ─── 6. COUNTRY FILTER ON HOME PAGE ──────────────────────────────────────
let _activeCountryFilter = '';

function buildCountryFilter() {
  const strip = document.querySelector('.genre-strip');
  if (!strip || document.getElementById('country-filter')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'country-filter-wrap';
  wrapper.className = 'country-filter-wrap';
  wrapper.innerHTML = `
    <label class="cf-label">Filter by country:</label>
    <select id="country-filter" class="country-filter-select" onchange="applyCountryFilter(this.value)">
      <option value="">All countries</option>
    </select>`;
  strip.after(wrapper);
  populateCountryFilter();
}

async function populateCountryFilter() {
  try {
    const r = await fetch('https://all.api.radio-browser.info/json/countries?order=name&limit=200');
    const countries = await r.json();
    const sel = document.getElementById('country-filter');
    if (!sel) return;
    countries.slice(0, 80).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.name} (${c.stationcount})`;
      sel.appendChild(opt);
    });
  } catch {}
}

async function applyCountryFilter(country) {
  _activeCountryFilter = country;
  const tbody = document.getElementById('station-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Filtering...</td></tr>';
  try {
    const url = country
      ? `https://all.api.radio-browser.info/json/stations/search?limit=30&https=true&country=${encodeURIComponent(country)}&order=clickcount&reverse=true`
      : `https://all.api.radio-browser.info/json/stations/search?limit=30&https=true&order=clickcount&reverse=true`;
    const r = await fetch(url);
    const stations = await r.json();
    if (typeof renderTable === 'function') renderTable(stations, 'station-tbody');
    attachPreviewToTable(stations, 'station-tbody');
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Signal lost — try again</td></tr>';
  }
}
window.applyCountryFilter = applyCountryFilter;

// ─── 7. COLLAPSIBLE SIDEBAR ───────────────────────────────────────────────
function buildSidebarToggle() {
  const sidebar = document.querySelector('.now-playing-sidebar, .np-sidebar, [class*="sidebar"]');
  if (!sidebar || document.getElementById('sidebar-toggle-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'sidebar-toggle-btn';
  btn.className = 'sidebar-toggle-btn';
  btn.setAttribute('aria-label', 'Collapse sidebar');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>`;
  btn.onclick = () => toggleSidebar();
  sidebar.prepend(btn);
}

let _sidebarCollapsed = false;
function toggleSidebar() {
  const sidebar = document.querySelector('.now-playing-sidebar, .np-sidebar, [class*="sidebar"]');
  if (!sidebar) return;
  _sidebarCollapsed = !_sidebarCollapsed;
  sidebar.classList.toggle('collapsed', _sidebarCollapsed);
  try { localStorage.setItem('wncore-sidebar', _sidebarCollapsed ? '1' : '0'); } catch {}
  const btn = document.getElementById('sidebar-toggle-btn');
  if (btn) {
    btn.innerHTML = _sidebarCollapsed
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>`;
  }
}
try {
  if (localStorage.getItem('wncore-sidebar') === '1') {
    _sidebarCollapsed = false; // re-enable on load so it doesn't hide content
  }
} catch {}


// ═══════════════════════════════════════════════════════
// GROUP 2 — PLAYER & LISTENING (items 8–14)
// ═══════════════════════════════════════════════════════

// ─── 8. SLEEP TIMER WITH VISUAL COUNTDOWN ────────────────────────────────
const SLEEP_OPTIONS = [15, 30, 45, 60]; // minutes
let _sleepTimerId = null, _sleepEndTime = null, _sleepTickId = null;
let _sleepIdx = -1;

function cycleSleepTimer() {
  _sleepIdx = (_sleepIdx + 1) % (SLEEP_OPTIONS.length + 1); // +1 for "off"
  if (_sleepIdx === SLEEP_OPTIONS.length) {
    // Turn off
    clearTimeout(_sleepTimerId);
    clearInterval(_sleepTickId);
    _sleepEndTime = null;
    updateSleepDisplay(null);
    showToast('Sleep timer off', 'info');
    return;
  }
  const mins = SLEEP_OPTIONS[_sleepIdx];
  clearTimeout(_sleepTimerId);
  clearInterval(_sleepTickId);
  _sleepEndTime = Date.now() + mins * 60000;

  _sleepTimerId = setTimeout(() => {
    const au = document.getElementById('audio');
    if (au) au.pause();
    if (typeof setPlayIcon === 'function') setPlayIcon(false);
    clearInterval(_sleepTickId);
    _sleepEndTime = null;
    updateSleepDisplay(null);
    showToast('Sleep timer ended — good night.', 'info');
  }, mins * 60000);

  _sleepTickId = setInterval(() => updateSleepDisplay(_sleepEndTime), 1000);
  updateSleepDisplay(_sleepEndTime);
  showToast(`Sleep timer: ${mins} minutes`, 'info');
}

function updateSleepDisplay(endTime) {
  const ring = document.getElementById('sleep-ring');
  const label = document.getElementById('sleep-label');
  if (!ring || !label) return;
  if (!endTime) {
    ring.style.display = 'none';
    label.textContent = '';
    return;
  }
  const rem = Math.max(0, endTime - Date.now());
  const mins = Math.floor(rem / 60000);
  const secs = Math.floor((rem % 60000) / 1000);
  label.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
  ring.style.display = 'block';
  // WRONGNESS: countdown occasionally skips from 3 to 1
  if (mins === 0 && secs === 3 && Math.random() < 0.35) {
    label.textContent = '0:01';
  }
}
window.cycleSleepTimer = cycleSleepTimer;

// Inject sleep ring into player bar
function injectSleepRing() {
  const sleepBtn = document.querySelector('[onclick*="toggleSleepTimer"], [onclick*="cycleSleepTimer"]');
  if (!sleepBtn || document.getElementById('sleep-ring')) return;

  sleepBtn.setAttribute('onclick', 'cycleSleepTimer()');

  const ring = document.createElement('div');
  ring.id = 'sleep-ring';
  ring.className = 'sleep-ring';
  ring.style.display = 'none';
  ring.innerHTML = `<svg viewBox="0 0 36 36" class="sleep-ring-svg"><circle class="sleep-ring-bg" cx="18" cy="18" r="15"/><circle class="sleep-ring-fill" id="sleep-ring-arc" cx="18" cy="18" r="15"/></svg><span id="sleep-label" class="sleep-label"></span>`;
  sleepBtn.parentNode.insertBefore(ring, sleepBtn.nextSibling);
}

// ─── 9. VOLUME MEMORY ────────────────────────────────────────────────────
function initVolumeMemory() {
  const slider = document.getElementById('vol-slider');
  const au = document.getElementById('audio');
  if (!slider || !au) return;
  try {
    const saved = parseFloat(localStorage.getItem('wncore-vol') || '0.8');
    slider.value = saved;
    au.volume = saved;
  } catch {}
  slider.addEventListener('input', e => {
    try { localStorage.setItem('wncore-vol', e.target.value); } catch {}
  });
}

// ─── 10. BITRATE BADGE IN PLAYER BAR ─────────────────────────────────────
function showBitrateInPlayer(station) {
  let badge = document.getElementById('pb-bitrate-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'pb-bitrate-badge';
    badge.className = 'pb-bitrate-badge';
    const meta = document.getElementById('pb-meta');
    if (meta) meta.parentNode.insertBefore(badge, meta.nextSibling);
  }
  if (station && station.bitrate) {
    badge.textContent = station.bitrate + 'kbps';
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// ─── 11. CONNECTION RETRY WITH COUNTDOWN ─────────────────────────────────
// WRONGNESS: countdown occasionally skips from 3 to 1
let _retryTimeout = null, _retryCountdown = null;

function startRetryCountdown(url, name, meta, emoji) {
  if (_retryCountdown) clearInterval(_retryCountdown);
  if (_retryTimeout) clearTimeout(_retryTimeout);
  let count = 5;
  const statusEl = document.getElementById('pb-name');
  const updateCount = () => {
    if (!statusEl) return;
    // WRONGNESS: skip 3→1
    if (count === 3 && Math.random() < 0.30) count = 1;
    statusEl.textContent = `RECONNECTING IN ${count}…`;
  };
  updateCount();
  _retryCountdown = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(_retryCountdown);
      if (typeof playStation === 'function') playStation(url, name, meta, emoji);
      return;
    }
    updateCount();
  }, 1000);
}

// ─── 12. CROSSFADE ON STATION CHANGE ─────────────────────────────────────
let _crossfadeActive = false;

function crossfadeToStation(url, name, meta, emoji) {
  const au = document.getElementById('audio');
  if (!au || _crossfadeActive || au.paused || !au.src) {
    if (typeof playStation === 'function') playStation(url, name, meta, emoji);
    return;
  }
  _crossfadeActive = true;
  const origVol = au.volume;
  const steps = 20;
  const stepTime = 1500 / steps;
  let step = 0;
  const fade = setInterval(() => {
    step++;
    au.volume = Math.max(0, origVol * (1 - step / steps));
    if (step >= steps) {
      clearInterval(fade);
      au.pause();
      au.volume = origVol;
      _crossfadeActive = false;
      if (typeof playStation === 'function') playStation(url, name, meta, emoji);
    }
  }, stepTime);
}
window.crossfadeToStation = crossfadeToStation;

// ─── 13. SIMILAR STATIONS BUTTON ─────────────────────────────────────────
async function loadSimilarStations() {
  if (!window._currentStationData) { showToast('Play a station first', 'warn'); return; }
  const s = window._currentStationData;
  const tags = (s.tags || '').split(',').filter(t => t.trim()).slice(0, 2).join(',');
  if (!tags) { showToast('No tags to match — try another station', 'warn'); return; }

  const panel = document.getElementById('similar-panel');
  const list = document.getElementById('similar-list');
  if (!panel || !list) return;
  panel.classList.add('open');
  list.innerHTML = '<div class="sim-loading">Scanning frequencies…</div>';

  try {
    const r = await fetch(`https://all.api.radio-browser.info/json/stations/search?limit=8&https=true&tag=${encodeURIComponent(tags)}&order=clickcount&reverse=true`);
    const stations = await r.json();
    const filtered = stations.filter(st => st.stationuuid !== s.stationuuid);
    if (!filtered.length) { list.innerHTML = '<div class="sim-loading">No similar signals found</div>'; return; }
    list.innerHTML = filtered.map(st => {
      const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(st.countrycode) : '📻';
      return `<div class="sim-item" onclick="playStation('${escHtmlImp(st.url_resolved)}','${escHtmlImp(st.name)}','${escHtmlImp(st.country||'Unknown')}','${emoji}');closeSimilarPanel()">
        <span class="sim-emoji">${emoji}</span>
        <div>
          <div class="sim-name">${escHtmlImp(st.name)}</div>
          <div class="sim-meta">${escHtmlImp(st.country||'—')} · ${st.bitrate?st.bitrate+'kbps':'—'}</div>
        </div>
      </div>`;
    }).join('');
  } catch {
    list.innerHTML = '<div class="sim-loading">Signal lost</div>';
  }
}

function closeSimilarPanel() {
  const p = document.getElementById('similar-panel');
  if (p) p.classList.remove('open');
}
window.loadSimilarStations = loadSimilarStations;
window.closeSimilarPanel = closeSimilarPanel;

// ─── 14. EQUALIZER PRESETS ────────────────────────────────────────────────
// WRONGNESS: "SIGNAL_KAGE Mode" preset adds subtle distortion
const EQ_PRESETS = {
  flat:       { bass: 0,   mid: 0,   treble: 0,   label: 'Flat' },
  bassboost:  { bass: 8,   mid: 1,   treble: -1,  label: 'Bass Boost' },
  vocal:      { bass: -2,  mid: 5,   treble: 3,   label: 'Vocal Boost' },
  night:      { bass: 3,   mid: -2,  treble: -4,  label: 'Night Mode' },
  broadcast:  { bass: 2,   mid: 3,   treble: 2,   label: 'Broadcast' },
  // WRONGNESS entry
  kage:       { bass: -8,  mid: 8,   treble: -8,  label: 'SIGNAL_KAGE ▒', wrongness: true },
};

let _audioCtx = null, _bassFilter = null, _midFilter = null, _trebleFilter = null, _eqConnected = false;
let _activePreset = 'flat';
let _distortionNode = null;

function initEQ() {
  const au = document.getElementById('audio');
  if (!au || _eqConnected) return;
  try {
    // Always resume any existing suspended context first — this is the #1 cause of
    // audio going silent when the EQ panel is opened: the AudioContext is suspended
    // until a user gesture, and connecting the source node to a suspended context
    // silences the audio element without throwing any error.
    if (window._sharedAudioCtx && window._sharedAudioCtx.state === 'suspended') {
      window._sharedAudioCtx.resume();
    }

    if (window._sharedAudioCtx && window._sharedSourceNode) {
      _audioCtx = window._sharedAudioCtx;
      // Build the filter chain BEFORE disconnecting anything so there is never
      // a moment where the source node is disconnected with nowhere to go.
      _bassFilter   = _audioCtx.createBiquadFilter(); _bassFilter.type = 'lowshelf';  _bassFilter.frequency.value = 200;
      _midFilter    = _audioCtx.createBiquadFilter(); _midFilter.type = 'peaking';    _midFilter.frequency.value = 1000; _midFilter.Q.value = 1;
      _trebleFilter = _audioCtx.createBiquadFilter(); _trebleFilter.type = 'highshelf'; _trebleFilter.frequency.value = 4000;
      _distortionNode = _audioCtx.createWaveShaper();
      const dest = window._sharedGainNode || _audioCtx.destination;
      // Wire new chain first, THEN swap source — never leave source disconnected
      _bassFilter.connect(_midFilter);
      _midFilter.connect(_trebleFilter);
      _trebleFilter.connect(_distortionNode);
      _distortionNode.connect(dest);
      try { window._sharedSourceNode.disconnect(); } catch(e) {}
      window._sharedSourceNode.connect(_bassFilter);
    } else {
      // No shared context yet — create one. The EQ panel button IS a user gesture
      // so AudioContext will start in 'running' state here.
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      let src;
      try {
        src = _audioCtx.createMediaElementSource(au);
      } catch(corsErr) {
        console.warn('[WNCORE] EQ unavailable (CORS restriction):', corsErr.message);
        _audioCtx = null;
        return;
      }
      window._sharedAudioCtx = _audioCtx;
      window._sharedSourceNode = src;
      _bassFilter   = _audioCtx.createBiquadFilter(); _bassFilter.type = 'lowshelf';  _bassFilter.frequency.value = 200;
      _midFilter    = _audioCtx.createBiquadFilter(); _midFilter.type = 'peaking';    _midFilter.frequency.value = 1000; _midFilter.Q.value = 1;
      _trebleFilter = _audioCtx.createBiquadFilter(); _trebleFilter.type = 'highshelf'; _trebleFilter.frequency.value = 4000;
      _distortionNode = _audioCtx.createWaveShaper();
      src.connect(_bassFilter);
      _bassFilter.connect(_midFilter);
      _midFilter.connect(_trebleFilter);
      _trebleFilter.connect(_distortionNode);
      _distortionNode.connect(_audioCtx.destination);
      window._sharedGainNode = null;
    }
    _eqConnected = true;
    // Final resume — belt and braces, ensures context is running after wiring
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
  } catch(e) { console.warn('[EQ] initEQ failed:', e); }
}

function applyEQPreset(presetKey) {
  if (!_eqConnected) initEQ();
  const preset = EQ_PRESETS[presetKey];
  if (!preset) return;
  _activePreset = presetKey;
  if (_bassFilter)   _bassFilter.gain.value   = preset.bass;
  if (_midFilter)    _midFilter.gain.value     = preset.mid;
  if (_trebleFilter) _trebleFilter.gain.value  = preset.treble;

  // WRONGNESS: SIGNAL_KAGE mode adds waveshaper distortion
  if (_distortionNode) {
    if (preset.wrongness) {
      const curve = makeDistortionCurve(80);
      _distortionNode.curve = curve;
      if (window.WRONGNESS) window.WRONGNESS.spike(20);
      showToast('⚠ Signal anomaly detected on this frequency', 'warn');
    } else {
      _distortionNode.curve = null;
    }
  }

  // Update UI
  document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.eq-preset-btn[data-preset="${presetKey}"]`);
  if (btn) btn.classList.add('active');
}

// NOTE: duplicate definition removed — using the cached version defined earlier in bundle.js
// which uses n=44100 and the _distCurveCache Map. This stub is intentionally left empty.

function buildEQPanel() {
  if (document.getElementById('eq-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'eq-panel';
  panel.className = 'eq-panel';
  panel.innerHTML = `
    <div class="eq-panel-header">
      <span class="eq-panel-title">Equalizer</span>
      <button class="eq-panel-close" onclick="closeEQPanel()">✕</button>
    </div>
    <div class="eq-presets">
      ${Object.entries(EQ_PRESETS).map(([key, p]) =>
        `<button class="eq-preset-btn${p.wrongness ? ' eq-btn-ghost' : ''}${key === 'flat' ? ' active' : ''}" data-preset="${key}" onclick="applyEQPreset('${key}')">${p.label}</button>`
      ).join('')}
    </div>`;
  document.body.appendChild(panel);
}

function openEQPanel() {
  buildEQPanel();
  initEQ();
  // Resume AudioContext here — this function is always called from a user gesture
  // (button click), so browsers will allow resumption. This is the safest place
  // to do it: after initEQ has wired the graph, before the panel is visible.
  if (window._sharedAudioCtx && window._sharedAudioCtx.state === 'suspended') {
    window._sharedAudioCtx.resume();
  }
  document.getElementById('eq-panel').classList.add('open');
}
function closeEQPanel() {
  const p = document.getElementById('eq-panel');
  if (p) p.classList.remove('open');
}
window.openEQPanel = openEQPanel;
window.closeEQPanel = closeEQPanel;
window.applyEQPreset = applyEQPreset;


// ═══════════════════════════════════════════════════════
// GROUP 3 — SAVING & PERSONALIZATION (items 15–18)
// ═══════════════════════════════════════════════════════

const FAV_KEY = 'wncore-favs-v2';

function favLoad() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}
function favSave(arr) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); } catch {}
}

// ─── 15. FAVORITES PAGE ──────────────────────────────────────────────────
// WRONGNESS: one favorite occasionally shows as [REDACTED], restores on click
function buildFavoritesPage() {
  if (document.getElementById('page-favorites')) return;
  const page = document.createElement('div');
  page.id = 'page-favorites';
  page.className = 'page fav-page';
  page.innerHTML = `
    <div class="fav-wrap">
      <div class="fav-header-row">
        <div>
          <div class="fav-kicker">MY COLLECTION</div>
          <h2 class="fav-title">Saved Stations</h2>
        </div>
        <div class="fav-actions">
          <button class="fav-action-btn" onclick="exportFavorites()" title="Export favorites">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <label class="fav-action-btn" title="Import favorites">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import
            <input type="file" accept=".json" style="display:none" onchange="importFavorites(this)">
          </label>
        </div>
      </div>
      <div class="fav-grid" id="fav-grid"></div>
      <div class="fav-empty" id="fav-empty" style="display:none">
        <div class="fav-empty-icon">♡</div>
        <div class="fav-empty-title">No saved stations yet</div>
        <div class="fav-empty-sub">Press <kbd>F</kbd> while a station plays, or click the heart in the player</div>
      </div>
    </div>`;
  // Insert before about page
  const aboutPage = document.getElementById('page-about');
  if (aboutPage) aboutPage.parentNode.insertBefore(page, aboutPage);
  else document.body.appendChild(page);
}

function renderFavoritesPage() {
  const grid = document.getElementById('fav-grid');
  const empty = document.getElementById('fav-empty');
  if (!grid) return;
  const favs = favLoad();
  if (!favs.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  // WRONGNESS: ~25% of opens, one entry is [REDACTED] for 700ms
  let ghostIdx = -1;
  if (Math.random() < 0.25) {
    ghostIdx = Math.floor(Math.random() * Math.min(favs.length, 4));
    setTimeout(renderFavoritesPage, 700);
  }

  grid.innerHTML = favs.map((s, i) => {
    const displayName = i === ghostIdx ? '[REDACTED]' : escHtmlImp(s.name);
    return `<div class="fav-card">
      <div class="fav-card-emoji">${s.emoji || '📻'}</div>
      <div class="fav-card-info">
        <div class="fav-card-name">${displayName}</div>
        <div class="fav-card-meta">${escHtmlImp(s.meta || '—')}</div>
      </div>
      <div class="fav-card-actions">
        <button class="fav-play-btn" onclick="favPlayStation(${i})" aria-label="Play">▶</button>
        <button class="fav-remove-btn" onclick="favRemove(${i})" aria-label="Remove">✕</button>
      </div>
    </div>`;
  }).join('');
}

function favAdd(station) {
  const favs = favLoad();
  if (favs.find(f => f.url === station.url)) return;
  favs.unshift(station);
  favSave(favs);
  showToast(`♥ Saved: ${station.name}`, 'success');
  renderFavoritesPage();
  updateFavButton();
}

function favRemove(idx) {
  const favs = favLoad();
  favs.splice(idx, 1);
  favSave(favs);
  renderFavoritesPage();
  updateFavButton();
}

function favPlayStation(idx) {
  const favs = favLoad();
  const s = favs[idx];
  if (s && typeof playStation === 'function') playStation(s.url, s.name, s.meta, s.emoji);
}

function favCurrentStation() {
  const cs = window.currentStation;
  if (!cs) { showToast('Nothing playing', 'warn'); return; }
  const favs = favLoad();
  const existing = favs.findIndex(f => f.url === cs.url);
  if (existing !== -1) {
    favs.splice(existing, 1);
    favSave(favs);
    showToast('Removed from favourites', 'info');
    updateFavButton();
    return;
  }
  favAdd({ url: cs.url, name: cs.name, meta: cs.meta, emoji: cs.emoji });
}
window.favCurrentStation = favCurrentStation;
window.favRemove = favRemove;
window.favPlayStation = favPlayStation;

function updateFavButton() {
  const cs = window.currentStation;
  const btn = document.getElementById('pb-fav-btn');
  if (!btn || !cs) return;
  const favs = favLoad();
  const saved = favs.some(f => f.url === cs.url);
  btn.classList.toggle('active', saved);
  btn.style.color = saved ? '#e8753a' : '';
}

// ─── 16. LISTENING STATS ─────────────────────────────────────────────────
const STATS_KEY = 'wncore-stats-v1';
let _statsInterval = null;

function statsLoad() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{"totalSecs":0,"stationsTried":0,"topGenre":"—","sessions":0}'); }
  catch { return { totalSecs: 0, stationsTried: 0, topGenre: '—', sessions: 0 }; }
}
function statsSave(s) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {}
}

function statsStartTracking() {
  const st = statsLoad();
  st.sessions++;
  statsSave(st);
  if (_statsInterval) clearInterval(_statsInterval);
  _statsInterval = setInterval(() => {
    if (document.hidden) return; // FIX: don't write to localStorage while tab is hidden
    const au = document.getElementById('audio');
    if (au && !au.paused) {
      const s = statsLoad();
      s.totalSecs++;
      statsSave(s);
      updateStatsWidget();
    }
  }, 1000);
}

function statsOnPlay() {
  const s = statsLoad();
  s.stationsTried++;
  statsSave(s);
  updateStatsWidget();
}

function updateStatsWidget() {
  const el = document.getElementById('stats-widget');
  if (!el) return;
  const s = statsLoad();
  const h = Math.floor(s.totalSecs / 3600);
  const m = Math.floor((s.totalSecs % 3600) / 60);
  document.getElementById('stat-time').textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('stat-stations').textContent = s.stationsTried;
  document.getElementById('stat-sessions').textContent = s.sessions;
}

function buildStatsWidget() {
  const sidebar = document.querySelector('.np-sidebar, .now-playing-sidebar');
  if (!sidebar || document.getElementById('stats-widget')) return;
  const w = document.createElement('div');
  w.id = 'stats-widget';
  w.className = 'stats-widget';
  w.innerHTML = `
    <div class="sw-title">This Session</div>
    <div class="sw-row"><span class="sw-label">Time listened</span><span class="sw-val" id="stat-time">0m</span></div>
    <div class="sw-row"><span class="sw-label">Stations tried</span><span class="sw-val" id="stat-stations">0</span></div>
    <div class="sw-row"><span class="sw-label">Sessions</span><span class="sw-val" id="stat-sessions">1</span></div>`;
  sidebar.appendChild(w);
  updateStatsWidget();
}

// ─── 17. CUSTOM STATION SUBMISSION ───────────────────────────────────────
function buildSubmissionForm() {
  const aboutPage = document.getElementById('page-about');
  if (!aboutPage || document.getElementById('station-submit-form')) return;
  const section = document.createElement('div');
  section.className = 'submit-section';
  section.innerHTML = `
    <div class="submit-header">Submit a Station</div>
    <p class="submit-sub">Know a station that should be here? Submit it for review.</p>
    <div id="station-submit-form" class="submit-form">
      <div class="sf-row">
        <div class="sf-field">
          <label class="sf-label">Station Name</label>
          <input class="sf-input" id="sf-name" type="text" placeholder="e.g. WNYC Radio">
        </div>
        <div class="sf-field">
          <label class="sf-label">Stream URL</label>
          <input class="sf-input" id="sf-url" type="url" placeholder="https://stream.example.com/mp3">
        </div>
      </div>
      <div class="sf-row">
        <div class="sf-field">
          <label class="sf-label">Genre / Tags</label>
          <input class="sf-input" id="sf-genre" type="text" placeholder="jazz, talk, news">
        </div>
        <div class="sf-field">
          <label class="sf-label">Country</label>
          <input class="sf-input" id="sf-country" type="text" placeholder="United States">
        </div>
      </div>
      <div class="sf-note">All submissions are reviewed before going live. We verify HTTPS and license status.</div>
      <button class="sf-submit-btn" onclick="submitStation()">Submit for Review →</button>
      <div id="sf-feedback" class="sf-feedback"></div>
    </div>`;
  aboutPage.querySelector('.about-wrap')?.appendChild(section);
}

function submitStation() {
  const name    = document.getElementById('sf-name')?.value.trim();
  const url     = document.getElementById('sf-url')?.value.trim();
  const genre   = document.getElementById('sf-genre')?.value.trim();
  const country = document.getElementById('sf-country')?.value.trim();
  const fb      = document.getElementById('sf-feedback');
  if (!name || !url) { if (fb) { fb.textContent = 'Name and stream URL are required.'; fb.className = 'sf-feedback error'; } return; }
  if (!url.startsWith('http')) { if (fb) { fb.textContent = 'Stream URL must start with http:// or https://'; fb.className = 'sf-feedback error'; } return; }
  // Simulate submission
  if (fb) { fb.textContent = 'Submitting…'; fb.className = 'sf-feedback'; }
  setTimeout(() => {
    if (fb) { fb.textContent = `✓ "${name}" submitted. Review takes 24–48h. Thank you.`; fb.className = 'sf-feedback success'; }
    ['sf-name','sf-url','sf-genre','sf-country'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }, 1200);
}
window.submitStation = submitStation;

// ─── 18. IMPORT / EXPORT FAVORITES ───────────────────────────────────────
function exportFavorites() {
  const favs = favLoad();
  if (!favs.length) { showToast('No favourites to export', 'warn'); return; }
  const blob = new Blob([JSON.stringify(favs, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wncore-favourites-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Favourites exported', 'success');
}

function importFavorites(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error();
      const current = favLoad();
      const merged = [...current];
      let added = 0;
      data.forEach(s => {
        if (s.url && s.name && !merged.find(f => f.url === s.url)) {
          merged.push(s); added++;
        }
      });
      favSave(merged);
      renderFavoritesPage();
      showToast(`Imported ${added} station${added !== 1 ? 's' : ''}`, 'success');
    } catch {
      showToast('Invalid file format', 'warn');
    }
  };
  reader.readAsText(file);
}
window.exportFavorites = exportFavorites;
window.importFavorites = importFavorites;


// ═══════════════════════════════════════════════════════
// GROUP 4 — ACCESSIBILITY & UX POLISH (items 24–30)
// ═══════════════════════════════════════════════════════

// ─── 24. FOCUS TRAP IN MODALS ────────────────────────────────────────────
function trapFocus(modalEl) {
  const focusable = modalEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0], last = focusable[focusable.length - 1];
  modalEl.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
  });
}

// Apply to existing modals after DOM ready
function initFocusTraps() {
  const modals = ['search-modal', 'signin-modal', 'kb-modal'];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const observer = new MutationObserver(() => {
        if (el.classList.contains('open')) {
          const first = el.querySelector('button, input');
          if (first) first.focus();
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ['class'] });
      trapFocus(el);
    }
  });
}

// ─── 25. TOAST NOTIFICATION SYSTEM ───────────────────────────────────────
// (used throughout this file — built first)
let _toastQueue = [], _toastActive = false;

function buildToastContainer() {
  if (document.getElementById('toast-container')) return;
  const c = document.createElement('div');
  c.id = 'toast-container';
  c.className = 'toast-container';
  document.body.appendChild(c);
}

function showToast(message, type = 'info', duration = 3000) {
  buildToastContainer();
  const c = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  c.appendChild(toast);
  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-show'));
  });
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
window.showToast = showToast;

// ─── 26. REDUCED MOTION MODE ─────────────────────────────────────────────
// WRONGNESS: wrongness effects still fire in reduced motion, more jarring
function initReducedMotion() {
  try {
    if (localStorage.getItem('wncore-reduced') === '1') {
      document.body.classList.add('reduced-motion');
    }
  } catch {}
}

function toggleReducedMotion() {
  document.body.classList.toggle('reduced-motion');
  const on = document.body.classList.contains('reduced-motion');
  try { localStorage.setItem('wncore-reduced', on ? '1' : '0'); } catch {}
  showToast(on ? 'Reduced motion on' : 'Reduced motion off', 'info');
}
window.toggleReducedMotion = toggleReducedMotion;

// ─── 27. SCROLL-TO-TOP BUTTON ────────────────────────────────────────────
function buildScrollTopBtn() {
  if (document.getElementById('scroll-top-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.className = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="18" height="18"><polyline points="18 15 12 9 6 15"/></svg>`;
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
}

// ─── 28. SKELETON LOADING SCREENS ────────────────────────────────────────
function showSkeletonTable(tbodyId, rows = 8) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: rows }, () => `
    <tr class="skeleton-row">
      <td><div class="skel skel-sm"></div></td>
      <td><div class="skel skel-sm"></div></td>
      <td><div class="skel skel-lg"></div></td>
      <td><div class="skel skel-md"></div></td>
      <td><div class="skel skel-sm"></div></td>
      <td><div class="skel skel-sm"></div></td>
    </tr>`).join('');
}
window.showSkeletonTable = showSkeletonTable;

function showSkeletonGrid(containerId, cards = 6) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({ length: cards }, () => `
    <div class="skel-card">
      <div class="skel skel-card-img"></div>
      <div class="skel skel-lg" style="margin-top:10px"></div>
      <div class="skel skel-md" style="margin-top:6px"></div>
    </div>`).join('');
}
window.showSkeletonGrid = showSkeletonGrid;

// ─── 29. MOBILE BOTTOM NAV ────────────────────────────────────────────────
function buildMobileBottomNav() {
  if (document.getElementById('mobile-bottom-nav')) return;
  const nav = document.createElement('nav');
  nav.id = 'mobile-bottom-nav';
  nav.className = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Mobile bottom navigation');
  nav.innerHTML = `
    <button class="mbn-btn active" id="mbn-home" onclick="mbnNav('home',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Home</span>
    </button>
    <button class="mbn-btn" id="mbn-search" onclick="openSearch()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>Search</span>
    </button>
    <button class="mbn-btn" id="mbn-favs" onclick="mbnNav('favorites',this)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      <span>Saved</span>
    </button>
    <a class="mbn-btn" id="mbn-mini" href="/radio-mini.html" style="text-decoration:none;color:inherit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><rect x="2" y="8" width="20" height="14" rx="2"/><path d="M6 8V6a6 6 0 0112 0v2"/><circle cx="12" cy="15" r="3"/></svg>
      <span>Mini</span>
    </a>
    <button class="mbn-btn" id="mbn-playing" onclick="mbnTogglePlayer(this)">
      <div class="mbn-playing-dot" id="mbn-dot"></div>
      <svg id="mbn-play-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>
      <svg id="mbn-pause-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="display:none"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
      <span>Playing</span>
    </button>`;
  document.body.appendChild(nav);
}

function mbnNav(pageId, btn) {
  if (typeof showPage === 'function') showPage(pageId, null);
  document.querySelectorAll('.mbn-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (pageId === 'favorites') { buildFavoritesPage(); renderFavoritesPage(); }
}
window.mbnNav = mbnNav;

function mbnTogglePlayer(btn) {
  // Toggle the player bar visibility on mobile
  const playerBar = document.querySelector('.player-bar');
  const bottomNav = document.querySelector('.mobile-bottom-nav');
  if (!playerBar) return;

  const isVisible = playerBar.classList.contains('pb-active');
  if (isVisible) {
    playerBar.classList.remove('pb-active');
    if (bottomNav) bottomNav.classList.remove('pb-active');
  } else {
    playerBar.classList.add('pb-active');
    if (bottomNav) bottomNav.classList.add('pb-active');
  }
  // Also handle active state on button
  document.querySelectorAll('.mbn-btn').forEach(b => b.classList.remove('active'));
  if (btn && !isVisible) btn.classList.add('active');
}
window.mbnTogglePlayer = mbnTogglePlayer;

function scrollToPlayer() {
  // Legacy — kept for any external calls
  mbnOpenPlayer(null);
}

function mbnOpenPlayer(btn) {
  // Mark nav button active
  document.querySelectorAll('.mbn-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Target: the universal player bar
  const root = document.getElementById('wncore-player-root');
  if (root && root.classList.contains('wp-visible')) {
    // Player is active — toggle expanded now-playing view
    const isExpanded = root.classList.toggle('wp-expanded');
    if (isExpanded) {
      // Pulse the art to signal "you're here"
      const art = document.getElementById('wp-art');
      if (art) { art.style.transform = 'scale(1.08)'; setTimeout(() => art.style.transform = '', 300); }
    }
    return;
  }

  // No universal player visible — fall back to home + player-bar
  if (typeof showPage === 'function') showPage('home', null);
  setTimeout(() => {
    const bar = document.querySelector('.player-bar');
    if (bar) {
      bar.style.transition = 'box-shadow 0.3s';
      bar.style.boxShadow = '0 0 0 2px var(--accent, #c8472a)';
      setTimeout(() => bar.style.boxShadow = '', 800);
    }
  }, 300);
}
window.mbnOpenPlayer = mbnOpenPlayer;

function updateMbnDot() {
  const dot = document.getElementById('mbn-dot');
  if (!dot) return;
  const au = document.getElementById('audio');
  dot.style.display = (au && !au.paused) ? 'block' : 'none';
}

// ─── 30. 88.7 SEARCH DEAD-END ────────────────────────────────────────────
// WRONGNESS: searching "88.7" shows a special redacted result
function intercept887Search(q) {
  if (!q.includes('88.7') && !q.toLowerCase().includes('88.7 fm')) return false;
  const results = document.getElementById('search-results');
  if (!results) return false;
  results.innerHTML = `
    <div class="sr-887-result" onclick="trigger887FromSearch()">
      <div class="sr-icon">📻</div>
      <div>
        <div class="sr-name sr-name-redacted">88.7 FM — ██████████</div>
        <div class="sr-meta">ORIGIN: UNKNOWN · ——kbps · <span style="color:var(--accent)">SIGNAL DETECTED</span></div>
      </div>
    </div>
    <div class="sr-887-log">
      <div class="sr-887-log-line">// search_index: no match for "88.7 FM"</div>
      <div class="sr-887-log-line">// fallback: carrier_scan() → anomaly at 88.700 MHz</div>
      <div class="sr-887-log-line">// WARNING: source unverified — proceed?</div>
    </div>`;
  return true;
}

function trigger887FromSearch() {
  if (typeof closeSearch === 'function') closeSearch();
  if (typeof play887Static === 'function') play887Static();
  if (window.WRONGNESS) window.WRONGNESS.spike(25);
}
window.trigger887FromSearch = trigger887FromSearch;


// ═══════════════════════════════════════════════════════
// INTEGRATION — PATCH EXISTING FUNCTIONS
// ═══════════════════════════════════════════════════════

function patchExistingFunctions() {
  // Patch playStation to track history, stats, bitrate
  // [NEUTRALIZED: v1 wrapper — handled by unified hook in bundle.js]
  // Features: historyPush, statsOnPlay, _currentStationData, showBitrateInPlayer, updateFavButton, updateMbnDot

  // Patch doSearch to intercept 88.7
  if (typeof doSearch === 'function' && !doSearch._patched) {
    const origSearch = doSearch;
    window.doSearch = async function(q) {
      if (intercept887Search(q)) return;
      return origSearch(q);
    };
    window.doSearch._patched = true;
  }

  // Patch renderTable to attach previews
  if (typeof renderTable === 'function' && !renderTable._patched) {
    const origRender = renderTable;
    window.renderTable = function(stations, tbodyId) {
      showSkeletonTable(tbodyId, stations.length || 8);
      setTimeout(() => {
        origRender(stations, tbodyId);
        attachPreviewToTable(stations, tbodyId);
      }, 80);
    };
    window.renderTable._patched = true;
  }

  // Patch toggleFavorite (player heart button) to use our system
  const favBtn = document.querySelector('[onclick*="toggleFavorite"]');
  if (favBtn) {
    favBtn.id = 'pb-fav-btn';
    favBtn.setAttribute('onclick', 'favCurrentStation()');
  }

  // Patch sleep timer button
  injectSleepRing();
}

// Patch showPage to handle favorites
function patchShowPage() {
  if (typeof showPage === 'function' && !showPage._wnPatched) {
    const orig = showPage;
    window.showPage = function(id, linkEl) {
      // Page transition effect
      const current = document.querySelector('.page.active');
      if (current) {
        current.classList.add('page-exit');
        setTimeout(() => { current.classList.remove('page-exit'); }, 220);
      }
      orig(id, linkEl);
      // Favorites rendering
      if (id === 'favorites') {
        buildFavoritesPage();
        renderFavoritesPage();
      }
    };
    window.showPage._wnPatched = true;
  }
}


// ═══════════════════════════════════════════════════════
// STRUCTURAL INJECTIONS — PANELS & NAV LINKS
// ═══════════════════════════════════════════════════════

function injectNavItems() {
  // Favorites nav link
  const nav = document.querySelector('header nav');
  if (nav && !document.getElementById('nav-favorites-link')) {
    const favLink = document.createElement('a');
    favLink.id = 'nav-favorites-link';
    favLink.href = '#';
    favLink.setAttribute('onclick', "showPage('favorites',this);return false");
    favLink.innerHTML = `<svg viewBox="0 0 24 24" fill="rgba(255,100,150,0.55)" stroke="rgba(255,100,150,0.7)" stroke-width="2" stroke-linecap="round" width="15" height="15" style="filter:drop-shadow(0 0 4px rgba(255,80,130,0.5));flex-shrink:0"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`;
    favLink.title = 'Favourites';
    favLink.style.cssText = 'padding:6px 8px;display:flex;align-items:center;justify-content:center;';
    // Insert before About
    const aboutLink = Array.from(nav.querySelectorAll('a')).find(a => a.textContent.trim().startsWith('About'));
    if (aboutLink) nav.insertBefore(favLink, aboutLink);
    else nav.appendChild(favLink);
  }

  // EQ & Shortcuts buttons in player right section
  const pbRight = document.querySelector('.pb-right');
  if (pbRight && !document.getElementById('pb-eq-btn')) {
    const eqBtn = document.createElement('button');
    eqBtn.id = 'pb-eq-btn';
    eqBtn.className = 'pb-btn pb-eq-open-btn';
    eqBtn.setAttribute('onclick', 'openEQPanel()');
    eqBtn.setAttribute('title', 'Equalizer');
    eqBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`;
    pbRight.prepend(eqBtn);

    const simBtn = document.createElement('button');
    simBtn.id = 'pb-sim-btn';
    simBtn.className = 'pb-btn';
    simBtn.setAttribute('onclick', 'loadSimilarStations()');
    simBtn.setAttribute('title', 'Similar stations');
    simBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
    pbRight.prepend(simBtn);

    const kbBtn = document.createElement('button');
    kbBtn.id = 'pb-kb-btn';
    kbBtn.className = 'pb-btn';
    kbBtn.setAttribute('onclick', 'openKbModal()');
    kbBtn.setAttribute('title', 'Keyboard shortcuts (?)');
    kbBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>`;
    pbRight.prepend(kbBtn);
  }

  // Feeling Lucky button near home section header
  const homeSection = document.querySelector('#page-home .section-header, #page-home .home-header');
  if (homeSection && !document.getElementById('lucky-btn')) {
    const lb = document.createElement('button');
    lb.id = 'lucky-btn';
    lb.className = 'lucky-btn';
    lb.setAttribute('onclick', 'feelingLucky()');
    lb.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Feeling Lucky`;
    homeSection.appendChild(lb);
  }
}

function injectSimilarPanel() {
  if (document.getElementById('similar-panel')) return;
  const panel = document.createElement('div');
  panel.id = 'similar-panel';
  panel.className = 'similar-panel';
  panel.innerHTML = `
    <div class="sim-header">
      <span class="sim-title">Similar Stations</span>
      <button class="sim-close" onclick="closeSimilarPanel()">✕</button>
    </div>
    <div class="sim-list" id="similar-list"></div>`;
  document.body.appendChild(panel);
}

function injectHistorySidebar() {
  const sidebar = document.querySelector('.np-sidebar, .now-playing-sidebar');
  if (!sidebar || document.getElementById('history-list')) return;
  const section = document.createElement('div');
  section.className = 'history-section';
  section.innerHTML = `
    <div class="hist-title">Recently Played</div>
    <div class="hist-list" id="history-list"><div class="hist-empty">No stations played yet</div></div>`;
  sidebar.appendChild(section);
}


// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════

function boot() {
  buildToastContainer();
  initVolumeMemory();
  initReducedMotion();
  buildKbModal();
  buildMobileBottomNav();
  buildScrollTopBtn();
  buildFavoritesPage();
  injectNavItems();
  injectSimilarPanel();
  injectHistorySidebar();
  patchExistingFunctions();
  patchShowPage();
  statsStartTracking();
  initFocusTraps();
  buildGenreAZ();
  buildCountryFilter();
  buildSidebarToggle();
  buildStatsWidget();
  buildSubmissionForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// ═══════════════════════════════════════════════════════
// IMPROVEMENTS v2 — ITEMS 31–50
// 20 new features. Wrongness level: MODERATE.
// ═══════════════════════════════════════════════════════

// ─── 31. MINI NOW-PLAYING WIDGET ─────────────────────────────────────────
// Removed — replaced by wncore-player.js (universal player bar).
// Stubs kept so any legacy call sites don't throw.
function buildMiniWidget() {
  /* no-op — wncore-player.js handles the universal player bar */
}
function updateMiniWidget() { /* no-op — wncore-player.js fires wncore-station-change */ }
function hideMiniWidget()    { /* no-op */ }
function showMiniWidget()    { /* no-op */ }
window.hideMiniWidget = hideMiniWidget;
window.showMiniWidget = showMiniWidget;


// ─── 32. STATION VOTE / RATING SYSTEM ─────────────────────────────────────
// Thumbs up/down on each station row. Stored locally. Syncs vote count
// to Radio Browser's public vote API. Shows local sentiment in the table.
const VOTES_KEY = 'wncore-votes-v1';

function votesLoad() {
  try { return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}'); } catch { return {}; }
}
function voteStation(uuid, dir) {
  const votes = votesLoad();
  const prev = votes[uuid];
  if (prev === dir) {
    delete votes[uuid]; // toggle off
  } else {
    votes[uuid] = dir;
    // Submit to Radio Browser vote API (fire-and-forget)
    if (dir === 1) {
      fetch(`https://all.api.radio-browser.info/json/vote/${uuid}`, { method: 'POST' }).catch(() => {});
    }
  }
  try { localStorage.setItem(VOTES_KEY, JSON.stringify(votes)); } catch {}
  refreshVoteUI(uuid, votes[uuid]);
}

function refreshVoteUI(uuid, state) {
  const up   = document.querySelector(`.vote-up[data-uuid="${uuid}"]`);
  const down = document.querySelector(`.vote-down[data-uuid="${uuid}"]`);
  if (up)   up.classList.toggle('voted', state === 1);
  if (down) down.classList.toggle('voted', state === -1);
}

function injectVoteButtons(stations, tbodyId) {
  const votes = votesLoad();
  const rows = document.querySelectorAll(`#${tbodyId} tr`);
  rows.forEach((tr, i) => {
    const s = stations[i];
    if (!s || tr.querySelector('.vote-up')) return;
    const td = document.createElement('td');
    td.className = 'vote-td';
    const state = votes[s.stationuuid];
    td.innerHTML = `
      <button class="vote-up${state===1?' voted':''}" data-uuid="${s.stationuuid}" onclick="voteStation('${s.stationuuid}',1)" title="Vote up">▲</button>
      <button class="vote-down${state===-1?' voted':''}" data-uuid="${s.stationuuid}" onclick="voteStation('${s.stationuuid}',-1)" title="Vote down">▼</button>`;
    tr.appendChild(td);
  });
}
window.voteStation = voteStation;


// ─── 33. SHARE STATION BUTTON ─────────────────────────────────────────────
// Generates a shareable URL with station name encoded as query param.
// Copies to clipboard, shows toast. On load, auto-plays if ?station= present.
// shareCurrentStation defined below in initShareSystem block (line ~7041)

function checkAutoPlayFromURL() {
  const params = new URLSearchParams(location.search);
  const name = params.get('station');
  const src  = params.get('src');
  if (!name || !src) return;
  setTimeout(() => {
    if (typeof playStation === 'function') {
      playStation(decodeURIComponent(src), decodeURIComponent(name), 'Shared station', '📻');
      showToast(`▶ Auto-playing: ${decodeURIComponent(name)}`, 'info', 4000);
    }
  }, 1200);
}


// ─── 34. BROADCAST SCHEDULE / "ON AIR NOW" SIDEBAR CARD ───────────────────
// Fake but convincing schedule block for the sidebar showing what's "airing".
// WRONGNESS: one time slot is always listed as 88.7 FM with status UNVERIFIED.
const SCHEDULE_SHOWS = [
  { name: 'Morning Signal', genre: 'Jazz · Easy Listening', dur: [6, 10] },
  { name: 'Frequency Check', genre: 'News · Talk', dur: [10, 12] },
  { name: 'Midday Static', genre: 'Ambient · Downtempo', dur: [12, 14] },
  { name: 'The Deep Hour', genre: 'Electronic · Experimental', dur: [14, 16] },
  { name: 'Global Array', genre: 'World · Folk', dur: [16, 18] },
  { name: 'Evening Transmission', genre: 'Classical · Orchestral', dur: [18, 21] },
  { name: 'Night Carrier', genre: 'Lo-Fi · Chill', dur: [21, 23] },
  { name: 'Dead Air Protocol', genre: 'Ambient · Drone', dur: [23, 6] },
];

function buildScheduleCard() {
  const sidebar = document.querySelector('.np-sidebar, .now-playing-sidebar');
  if (!sidebar || document.getElementById('schedule-card')) return;
  const card = document.createElement('div');
  card.id = 'schedule-card';
  card.className = 'schedule-card';
  card.innerHTML = `
    <div class="sc-title">On Air Schedule</div>
    <div id="sc-list"></div>`;
  sidebar.appendChild(card);
  renderSchedule();
  setInterval(renderSchedule, 60000);
}

function renderSchedule() {
  const list = document.getElementById('sc-list');
  if (!list) return;
  const h = new Date().getHours();

  // WRONGNESS: inject 88.7 FM at a random past or upcoming slot
  const ghostIdx = Math.floor(Math.random() * SCHEDULE_SHOWS.length);

  list.innerHTML = SCHEDULE_SHOWS.map((show, i) => {
    const isNow = h >= show.dur[0] && (show.dur[1] > show.dur[0] ? h < show.dur[1] : true);
    const timeStr = `${String(show.dur[0]).padStart(2,'0')}:00 – ${String(show.dur[1]).padStart(2,'0')}:00`;
    if (i === ghostIdx) {
      return `<div class="sc-row sc-ghost">
        <div class="sc-time">??:?? – ??:??</div>
        <div class="sc-name">88.7 FM ██████</div>
        <div class="sc-genre">UNVERIFIED · ORIGIN UNKNOWN</div>
      </div>`;
    }
    return `<div class="sc-row${isNow ? ' sc-now' : ''}">
      ${isNow ? '<div class="sc-on-air-pip"></div>' : ''}
      <div class="sc-time">${timeStr}</div>
      <div class="sc-name">${show.name}</div>
      <div class="sc-genre">${show.genre}</div>
    </div>`;
  }).join('');
}


// ─── 35. LIVE LISTENER COUNT ANIMATION ────────────────────────────────────
// Animates station listener counts in the table to tick up/down naturally.
// WRONGNESS: one station's count occasionally spikes to an impossible number.
let _listenerAnimFrame = null;
const _listenerCounts = new Map();

function animateListenerCounts() {
  const cells = document.querySelectorAll('.tr-listeners, .station-listeners, [data-listeners]');
  cells.forEach((cell, i) => {
    const raw = parseInt(cell.getAttribute('data-listeners') || cell.textContent.replace(/\D/g,'')) || 0;
    if (!raw) return;
    if (!_listenerCounts.has(i)) _listenerCounts.set(i, raw);
    let current = _listenerCounts.get(i);

    // WRONGNESS: 1 in 60 cells spikes
    if (Math.random() < (1/60)) {
      cell.textContent = (999999).toLocaleString();
      cell.style.color = 'var(--accent)';
      setTimeout(() => { cell.textContent = current.toLocaleString(); cell.style.color = ''; }, 400);
      return;
    }

    const drift = Math.floor((Math.random() - 0.48) * 4);
    current = Math.max(0, current + drift);
    _listenerCounts.set(i, current);
    cell.textContent = current.toLocaleString();
  });
}


// ─── 36. SEARCH SUGGESTIONS / AUTOCOMPLETE ────────────────────────────────
// Shows quick suggestions as user types in the search box.
// Pulls from Radio Browser tags + country list for fast matching.
const SEARCH_SUGGESTIONS = [
  'jazz', 'classical', 'ambient', 'news', 'talk', 'lofi', 'hip hop',
  'electronic', 'folk', 'chillout', 'rock', 'pop', 'indie', 'country',
  'reggae', 'blues', 'soul', 'R&B', 'metal', 'punk', 'anime', 'j-pop',
  'k-pop', 'tropical', 'bossa nova', 'flamenco', 'opera', 'world music',
  'BBC', 'NPR', 'RFI', 'NHK', 'ABC', 'DW', 'France Inter', 'Radio Swiss',
];
let _suggestTimeout = null;

function buildSearchAutocomplete() {
  const input = document.getElementById('search-input');
  if (!input || document.getElementById('search-suggestions')) return;

  const box = document.createElement('div');
  box.id = 'search-suggestions';
  box.className = 'search-suggestions';
  input.parentNode.style.position = 'relative';
  input.parentNode.appendChild(box);

  input.addEventListener('input', () => {
    clearTimeout(_suggestTimeout);
    _suggestTimeout = setTimeout(() => showSuggestions(input.value), 180);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') focusSuggestion(1);
    if (e.key === 'ArrowUp')   focusSuggestion(-1);
    if (e.key === 'Escape')    clearSuggestions();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-suggestions') && e.target !== input) clearSuggestions();
  });
}

function showSuggestions(q) {
  const box = document.getElementById('search-suggestions');
  if (!box || !q || q.length < 2) { clearSuggestions(); return; }
  const matches = SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().startsWith(q.toLowerCase())).slice(0, 6);
  if (!matches.length) { clearSuggestions(); return; }
  box.innerHTML = matches.map(m =>
    `<div class="ss-item" onclick="applySuggestion('${escHtmlImp(m)}')" tabindex="0">${escHtmlImp(m)}</div>`
  ).join('');
  box.classList.add('open');
}

function clearSuggestions() {
  const box = document.getElementById('search-suggestions');
  if (box) { box.innerHTML = ''; box.classList.remove('open'); }
}

function applySuggestion(val) {
  const input = document.getElementById('search-input');
  if (input) { input.value = val; input.focus(); }
  clearSuggestions();
  if (typeof doSearch === 'function') doSearch(val);
}

function focusSuggestion(dir) {
  const items = document.querySelectorAll('.ss-item');
  const active = document.querySelector('.ss-item:focus');
  const idx = Array.from(items).indexOf(active);
  const next = items[Math.max(0, Math.min(items.length - 1, idx + dir))];
  if (next) next.focus();
}
window.applySuggestion = applySuggestion;


// ─── 37. STATION INFO MODAL (full detail view) ────────────────────────────
// Click station name → opens modal with full data, homepage link, tags, votes.
// WRONGNESS: "Last verified" timestamp is sometimes in the future.
function buildStationModal() {
  if (document.getElementById('station-modal')) return;
  const m = document.createElement('div');
  m.id = 'station-modal';
  m.className = 'station-modal-backdrop';
  m.setAttribute('role', 'dialog');
  m.addEventListener('click', e => { if (e.target === m) closeStationModal(); });
  m.innerHTML = `
    <div class="stm-box">
      <button class="stm-close" onclick="closeStationModal()">✕</button>
      <div class="stm-header">
        <div class="stm-emoji" id="stm-emoji">📻</div>
        <div>
          <div class="stm-name" id="stm-name"></div>
          <div class="stm-country" id="stm-country"></div>
        </div>
      </div>
      <div class="stm-grid" id="stm-grid"></div>
      <div class="stm-tags" id="stm-tags"></div>
      <div class="stm-footer">
        <a class="stm-homepage" id="stm-homepage" target="_blank" rel="noopener">Visit Homepage →</a>
        <button class="stm-play-btn" id="stm-play-btn">▶ Play Station</button>
      </div>
    </div>`;
  document.body.appendChild(m);
}

function openStationModal(station) {
  buildStationModal();
  const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(station.countrycode) : '📻';

  document.getElementById('stm-emoji').textContent   = emoji;
  document.getElementById('stm-name').textContent    = station.name;
  document.getElementById('stm-country').textContent = [station.country, station.language].filter(Boolean).join(' · ');

  // WRONGNESS: last verified sometimes in the future
  let lastVerified = station.lastchecktime || 'Unknown';
  if (lastVerified !== 'Unknown' && Math.random() < 0.25) {
    const future = new Date(Date.now() + Math.random() * 3 * 24 * 3600000);
    lastVerified = future.toISOString().replace('T',' ').slice(0,19) + ' ⚠';
  }

  document.getElementById('stm-grid').innerHTML = [
    ['Bitrate',       station.bitrate ? station.bitrate + ' kbps' : '—'],
    ['Codec',         station.codec   || '—'],
    ['Votes',         station.votes   || '0'],
    ['Click count',   station.clickcount ? Number(station.clickcount).toLocaleString() : '—'],
    ['Last verified', lastVerified],
    ['UUID',          (station.stationuuid || '—').slice(0,18) + '…'],
  ].map(([k,v]) => `<div class="stm-field"><span class="stm-label">${k}</span><span class="stm-val">${escHtmlImp(String(v))}</span></div>`).join('');

  const tags = (station.tags || '').split(',').filter(t=>t.trim()).slice(0,10);
  document.getElementById('stm-tags').innerHTML = tags.map(t =>
    `<span class="stm-tag">${escHtmlImp(t.trim())}</span>`).join('');

  const homeLink = document.getElementById('stm-homepage');
  if (station.homepage) { homeLink.href = station.homepage; homeLink.style.display = 'inline'; }
  else homeLink.style.display = 'none';

  const playBtn = document.getElementById('stm-play-btn');
  playBtn.onclick = () => {
    if (typeof playStation === 'function')
      playStation(station.url_resolved, station.name, station.country || '—', emoji);
    closeStationModal();
  };

  document.getElementById('station-modal').classList.add('open');
}

function closeStationModal() {
  const m = document.getElementById('station-modal');
  if (m) m.classList.remove('open');
}
window.openStationModal = openStationModal;
window.closeStationModal = closeStationModal;


// ─── 38. DARK MODE TRANSITION POLISH ──────────────────────────────────────
// Smooth cross-fade when toggling dark mode instead of instant snap.
function initDarkModeTransition() {
  const style = document.createElement('style');
  style.textContent = `
    body { transition: background-color 0.35s, color 0.35s; }
    body * { transition: background-color 0.35s, color 0.35s, border-color 0.35s; }
    /* But don't transition animations or transforms */
    body *:not(.lm-bar):not(.pb-eq span):not(.skel) { transition-property: background-color, color, border-color; }
  `;
  document.head.appendChild(style);
}


// ─── 39. KEYBOARD-NAVIGABLE STATION TABLE ─────────────────────────────────
// Arrow keys navigate rows in the station table; Enter plays focused row.
let _tableRowIdx = -1;

function initTableKeyNav() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const rows = Array.from(document.querySelectorAll('#station-tbody tr:not(.skeleton-row)'));
    if (!rows.length) return;

    if (e.key === 'ArrowDown' && !e.shiftKey) {
      e.preventDefault();
      _tableRowIdx = Math.min(_tableRowIdx + 1, rows.length - 1);
      highlightTableRow(rows, _tableRowIdx);
    } else if (e.key === 'ArrowUp' && !e.shiftKey) {
      e.preventDefault();
      _tableRowIdx = Math.max(_tableRowIdx - 1, 0);
      highlightTableRow(rows, _tableRowIdx);
    } else if (e.key === 'Enter' && _tableRowIdx >= 0 && rows[_tableRowIdx]) {
      rows[_tableRowIdx].click();
    }
  });
}

function highlightTableRow(rows, idx) {
  rows.forEach((r, i) => r.classList.toggle('kb-focused', i === idx));
  rows[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}


// ─── 40. COMPACT / EXPANDED PLAYER BAR TOGGLE ─────────────────────────────
// Double-click the player bar to collapse it to just the play button.
// WRONGNESS: on expand, title briefly shows wrong station name.
let _playerExpanded = true;

function initPlayerToggle() {
  const bar = document.querySelector('.player-bar');
  if (!bar || bar.dataset.toggleInit) return;
  bar.dataset.toggleInit = '1';
  const info = bar.querySelector('.pb-info, .pb-station-info, [class*="pb-info"]');

  bar.addEventListener('dblclick', e => {
    if (e.target.closest('button, input')) return;
    _playerExpanded = !_playerExpanded;
    bar.classList.toggle('player-compact', !_playerExpanded);

    if (_playerExpanded) {
      // WRONGNESS: on expand, name flickers
      const nm = document.getElementById('pb-name');
      if (nm && window.currentStation && Math.random() < 0.40) {
        const orig = nm.textContent;
        const wrongs = ['88.7 FM', 'NODE_09', '██████', 'SIGNAL_KAGE'];
        nm.textContent = wrongs[Math.floor(Math.random() * wrongs.length)];
        setTimeout(() => { nm.textContent = orig; }, 280);
        if (window.WRONGNESS) window.WRONGNESS.spike(10);
      }
    }
  });

  // Tooltip hint
  bar.title = 'Double-click to compact player';
}


// ─── 41. TRENDING GENRES WIDGET ───────────────────────────────────────────
// Fetches the current top tags from Radio Browser and renders a live
// "Trending now" pill strip on the home page above the station table.
async function buildTrendingGenres() {
  if (document.getElementById('trending-genres')) return;
  const homeSection = document.querySelector('#page-home');
  if (!homeSection) return;

  const strip = document.createElement('div');
  strip.id = 'trending-genres';
  strip.className = 'trending-genres';
  strip.innerHTML = '<div class="tg-label">Trending:</div><div class="tg-pills" id="tg-pills"><div class="skel skel-md" style="height:24px;width:300px;border-radius:12px;"></div></div>';

  // Insert before station table
  const table = homeSection.querySelector('table, .station-table-wrap');
  if (table) table.parentNode.insertBefore(strip, table);
  else homeSection.prepend(strip);

  try {
    const r = await fetch('https://all.api.radio-browser.info/json/tags?order=stationcount&reverse=true&limit=16');
    const tags = await r.json();
    const pills = document.getElementById('tg-pills');
    if (!pills) return;
    pills.innerHTML = tags.map(t =>
      `<button class="tg-pill" onclick="applyCountryFilter('');quickTagSearch('${escHtmlImp(t.name)}')">${escHtmlImp(t.name)} <span class="tg-count">${Number(t.stationcount).toLocaleString()}</span></button>`
    ).join('');
  } catch {}
}

async function quickTagSearch(tag) {
  const tbody = document.getElementById('station-tbody');
  if (!tbody) return;
  showSkeletonTable('station-tbody', 8);
  try {
    const r = await fetch(`https://all.api.radio-browser.info/json/stations/search?limit=30&https=true&tag=${encodeURIComponent(tag)}&order=clickcount&reverse=true`);
    const stations = await r.json();
    if (typeof renderTable === 'function') renderTable(stations, 'station-tbody');
    injectVoteButtons(stations, 'station-tbody');
    showToast(`Showing: ${tag}`, 'info');
  } catch {}
}
window.quickTagSearch = quickTagSearch;


// ─── 42. AMBIENT NOISE LAYER ──────────────────────────────────────────────
// Optional background noise generator (brown/pink/white) via Web Audio.
// Lives in a small panel. Completely non-interfering with main audio.
// WRONGNESS: "Node Frequency" option adds faint sub-bass hum + wrongness spike.
let _ambientCtx = null, _ambientNode = null, _ambientGain = null, _ambientActive = false;

function buildAmbientPanel() {
  if (document.getElementById('ambient-panel')) return;
  const p = document.createElement('div');
  p.id = 'ambient-panel';
  p.className = 'ambient-panel';
  p.innerHTML = `
    <div class="amb-header">
      <span class="amb-title">Ambient Layer</span>
      <button class="amb-close" onclick="closeAmbientPanel()">✕</button>
    </div>
    <div class="amb-options">
      <button class="amb-opt" data-type="brown" onclick="startAmbient('brown',this)">Brown Noise</button>
      <button class="amb-opt" data-type="pink"  onclick="startAmbient('pink',this)">Pink Noise</button>
      <button class="amb-opt" data-type="white" onclick="startAmbient('white',this)">White Noise</button>
      <button class="amb-opt amb-opt-ghost" data-type="node" onclick="startAmbient('node',this)">Node Freq ▒</button>
    </div>
    <div class="amb-vol-row">
      <label class="amb-vol-label">Level</label>
      <input type="range" class="amb-vol-slider" id="amb-vol" min="0" max="1" step="0.01" value="0.15" oninput="setAmbientVol(this.value)">
    </div>
    <button class="amb-stop-btn" onclick="stopAmbient()">Stop Ambient</button>`;
  document.body.appendChild(p);
}

function openAmbientPanel() {
  buildAmbientPanel();
  document.getElementById('ambient-panel').classList.add('open');
}
function closeAmbientPanel() {
  const p = document.getElementById('ambient-panel');
  if (p) p.classList.remove('open');
}

function startAmbient(type, btn) {
  stopAmbient();
  document.querySelectorAll('.amb-opt').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  try {
    _ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * _ambientCtx.sampleRate;
    const buffer = _ambientCtx.createBuffer(1, bufferSize, _ambientCtx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white' || type === 'node') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02; last = data[i]; data[i] *= 3.5;
      }
    } else if (type === 'pink') {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11; b6 = w * 0.115926;
      }
    }

    _ambientNode = _ambientCtx.createBufferSource();
    _ambientNode.buffer = buffer; _ambientNode.loop = true;

    _ambientGain = _ambientCtx.createGain();
    _ambientGain.gain.value = parseFloat(document.getElementById('amb-vol')?.value || 0.15);

    // Node Frequency: sub-bass oscillator + wrongness spike
    if (type === 'node') {
      const osc = _ambientCtx.createOscillator();
      osc.frequency.value = 37.5; // sub-bass hum
      osc.type = 'sine';
      const oscGain = _ambientCtx.createGain();
      oscGain.gain.value = 0.04;
      osc.connect(oscGain); oscGain.connect(_ambientGain);
      osc.start();
      if (window.WRONGNESS) window.WRONGNESS.spike(18);
      showToast('⚠ Node frequency engaged', 'warn');
    }

    _ambientNode.connect(_ambientGain);
    _ambientGain.connect(_ambientCtx.destination);
    _ambientNode.start();
    _ambientActive = true;
  } catch (err) {
    showToast('Ambient layer unavailable in this browser', 'warn');
  }
}

function stopAmbient() {
  try { if (_ambientNode) _ambientNode.stop(); } catch {}
  try { if (_ambientCtx) _ambientCtx.close(); } catch {}
  _ambientNode = null; _ambientCtx = null; _ambientGain = null; _ambientActive = false;
  document.querySelectorAll('.amb-opt').forEach(b => b.classList.remove('active'));
}

function setAmbientVol(v) {
  if (_ambientGain) _ambientGain.gain.value = parseFloat(v);
}
window.openAmbientPanel = openAmbientPanel;
window.closeAmbientPanel = closeAmbientPanel;
window.startAmbient = startAmbient;
window.stopAmbient = stopAmbient;
window.setAmbientVol = setAmbientVol;


// ─── 43. NETWORK MAP VISUALIZER (canvas-based world dot map) ──────────────
// Animated canvas showing "active nodes" across the world.
// Draws dots at known city coordinates with signal-pulse rings.
// WRONGNESS: Node 09 coordinate slowly drifts, never settles.
const NETWORK_NODES = [
  [51.5,  -0.1,  'London'],    [40.7,  -74.0, 'New York'],
  [35.7,  139.7, 'Tokyo'],     [48.8,  2.3,   'Paris'],
  [52.5,  13.4,  'Berlin'],    [55.7,  37.6,  'Moscow'],
  [31.2,  121.5, 'Shanghai'],  [-33.9, 151.2, 'Sydney'],
  [-23.5, -46.6, 'São Paulo'], [19.4,  -99.1, 'Mexico City'],
  [1.3,   103.8, 'Singapore'], [28.6,  77.2,  'Delhi'],
  [23.7,  90.4,  'Dhaka'],     [-26.2, 28.0,  'Johannesburg'],
  [6.5,   3.4,   'Lagos'],     [41.0,  29.0,  'Istanbul'],
  // Node 09 — drifts
  [0.0, 0.0, 'NODE_09'],
];

function buildNetworkMap() {
  if (document.getElementById('network-map-canvas')) return;
  const section = document.querySelector('#page-about .about-wrap, #page-about');
  if (!section) return;

  const wrap = document.createElement('div');
  wrap.className = 'network-map-wrap';
  wrap.innerHTML = `
    <div class="nm-title">WNCORE Global Relay Network</div>
    <div class="nm-sub">Live node telemetry — ${NETWORK_NODES.length - 1} verified · 1 unknown</div>
    <canvas id="network-map-canvas" class="network-map-canvas"></canvas>`;
  section.prepend(wrap);

  renderNetworkMap();
  let _nmInterval = setInterval(renderNetworkMap, 2000);
  // FIX: pause expensive canvas redraws when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearInterval(_nmInterval); _nmInterval = null; }
    else if (!_nmInterval) { _nmInterval = setInterval(renderNetworkMap, 2000); renderNetworkMap(); }
  });
  window.addEventListener('resize', renderNetworkMap);
}

function renderNetworkMap() {
  const canvas = document.getElementById('network-map-canvas');
  if (!canvas || !canvas.offsetParent || document.hidden) return; // FIX3
  const W = canvas.offsetWidth;
  canvas.width = W; canvas.height = W * 0.5;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const isDark = document.body.classList.contains('dark-mode');

  ctx.fillStyle = isDark ? '#0e0d0b' : '#f5f3ef';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += W/12) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y <= H; y += H/6)  { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Draw nodes
  const t = Date.now() / 1000;
  NETWORK_NODES.forEach(([lat, lon, name], i) => {
    // Node 09 drifts
    let dLat = lat, dLon = lon;
    if (name === 'NODE_09') {
      dLat = Math.sin(t * 0.13) * 45;
      dLon = Math.cos(t * 0.09) * 120;
    }
    const x = (dLon + 180) / 360 * W;
    const y = (90 - dLat) / 180 * H;
    const isGhost = name === 'NODE_09';
    const pulse = Math.sin(t * 2 + i) * 0.5 + 0.5;

    // Pulse ring
    ctx.beginPath();
    ctx.arc(x, y, 6 + pulse * 8, 0, Math.PI * 2);
    ctx.strokeStyle = isGhost
      ? `rgba(200,71,42,${0.15 + pulse * 0.2})`
      : `rgba(22,163,74,${0.1 + pulse * 0.15})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Core dot
    ctx.beginPath();
    ctx.arc(x, y, isGhost ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = isGhost ? '#c8472a' : (isDark ? '#22c55e' : '#16a34a');
    ctx.fill();

    // Label (only on hover-like random sample)
    if (isGhost || Math.random() < 0.3) {
      ctx.font = `${isGhost ? 'bold ' : ''}9px 'DM Mono', monospace`;
      ctx.fillStyle = isGhost ? '#c8472a' : (isDark ? 'rgba(240,237,232,0.5)' : 'rgba(26,24,20,0.4)');
      ctx.fillText(name, x + 6, y - 4);
    }
  });
}


// ─── 44. PAGE TRANSITION ANIMATIONS ───────────────────────────────────────
// Fade + slight upward slide when navigating between pages.
function initPageTransitions() {
  if (document.getElementById('pt-style')) return;
  const s = document.createElement('style');
  s.id = 'pt-style';
  s.textContent = `
    .page { display:none; opacity:0; transform:translateY(6px); transition:opacity 0.22s ease, transform 0.22s ease; pointer-events:none; }
    .page.active { display:block; opacity:1; transform:translateY(0); pointer-events:auto; }
    .page.page-exit { display:block; opacity:0; transform:translateY(-4px); pointer-events:none; }
  `;
  document.head.appendChild(s);

  // showPage patching handled by patchShowPage() in boot()
}


// ─── 45. STATION OF THE DAY CARD ──────────────────────────────────────────
// A curated "Station of the Day" card on the home page. Station is
// deterministically selected based on the day number so it's consistent.
// Changes every 24h. WRONGNESS: on one day in ~14, it shows 88.7 FM.
async function buildStationOfTheDay() {
  if (document.getElementById('sotd-card')) return;
  const home = document.getElementById('page-home');
  if (!home) return;

  const dayNum = Math.floor(Date.now() / 86400000);

  // WRONGNESS: every ~14 days
  if (dayNum % 14 === 7) {
    const card = makeSOTDCard({
      name: '88.7 FM — ██████████',
      country: 'UNKNOWN',
      tags: 'unverified · carrier signal · anomaly',
      bitrate: null,
      url_resolved: null,
      _ghost: true,
    }, '📻', dayNum);
    insertSOTDCard(home, card);
    return;
  }

  const card = document.createElement('div');
  card.id = 'sotd-card';
  card.className = 'sotd-card sotd-loading';
  card.innerHTML = `<div class="sotd-label">Station of the Day</div><div class="skel skel-lg" style="height:16px;margin-bottom:8px"></div><div class="skel skel-md"></div>`;
  insertSOTDCard(home, card);

  try {
    const seed = dayNum % 5000;
    const r = await fetch(`https://all.api.radio-browser.info/json/stations/search?limit=1&https=true&offset=${seed}&order=votes&reverse=true&has_extended_info=true`);
    const [s] = await r.json();
    if (!s) return;
    const emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(s.countrycode) : '📻';
    card.outerHTML = makeSOTDCard(s, emoji, dayNum);
  } catch {
    card.remove();
  }
}

function makeSOTDCard(s, emoji, dayNum) {
  const tags = (s.tags || '').split(',').slice(0, 3).filter(t=>t.trim()).join(' · ') || 'Global';
  const isGhost = s._ghost;
  return `<div id="sotd-card" class="sotd-card${isGhost?' sotd-ghost':''}">
    <div class="sotd-label">Station of the Day <span class="sotd-day">#${dayNum % 9999}</span></div>
    <div class="sotd-inner">
      <div class="sotd-emoji">${emoji}</div>
      <div class="sotd-info">
        <div class="sotd-name">${escHtmlImp(s.name)}</div>
        <div class="sotd-meta">${escHtmlImp(s.country || '—')} · ${escHtmlImp(tags)}</div>
        ${s.bitrate ? `<div class="sotd-bitrate">${s.bitrate}kbps</div>` : ''}
      </div>
      ${s._ghost
        ? `<div class="sotd-ghost-badge">UNVERIFIED</div>`
        : `<button class="sotd-play-btn" onclick="playStation('${escHtmlImp(s.url_resolved||'')}','${escHtmlImp(s.name)}','${escHtmlImp(s.country||'')}','${emoji}')">▶ Listen</button>`}
    </div>
  </div>`;
}

function insertSOTDCard(home, card) {
  const table = home.querySelector('table, .station-table-wrap, #trending-genres');
  if (table) table.parentNode.insertBefore(typeof card === 'string' ? (() => { const d = document.createElement('div'); d.innerHTML = card; return d.firstChild; })() : card, table);
}


// ─── 46. LANGUAGE FILTER TOGGLE ───────────────────────────────────────────
// Quick-filter buttons for English / Non-English / Any language.
// Sits alongside the country filter.
let _activeLangFilter = '';

function buildLanguageFilter() {
  const cfWrap = document.getElementById('country-filter-wrap');
  if (!cfWrap || document.getElementById('lang-filter-wrap')) return;
  const wrap = document.createElement('div');
  wrap.id = 'lang-filter-wrap';
  wrap.className = 'lang-filter-wrap';
  wrap.innerHTML = `
    <span class="cf-label">Language:</span>
    <button class="lang-btn active" data-lang="" onclick="applyLangFilter('',this)">Any</button>
    <button class="lang-btn" data-lang="english" onclick="applyLangFilter('english',this)">English</button>
    <button class="lang-btn" data-lang="japanese" onclick="applyLangFilter('japanese',this)">Japanese</button>
    <button class="lang-btn" data-lang="french" onclick="applyLangFilter('french',this)">French</button>
    <button class="lang-btn" data-lang="spanish" onclick="applyLangFilter('spanish',this)">Spanish</button>
    <button class="lang-btn" data-lang="german" onclick="applyLangFilter('german',this)">German</button>`;
  cfWrap.after(wrap);
}

async function applyLangFilter(lang, btn) {
  _activeLangFilter = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  showSkeletonTable('station-tbody', 8);
  const country = document.getElementById('country-filter')?.value || '';
  const params = new URLSearchParams({
    limit: 30, https: true, order: 'clickcount', reverse: true,
    ...(country && { country }),
    ...(lang && { language: lang }),
  });
  try {
    const r = await fetch(`https://all.api.radio-browser.info/json/stations/search?${params}`);
    const stations = await r.json();
    if (typeof renderTable === 'function') renderTable(stations, 'station-tbody');
    injectVoteButtons(stations, 'station-tbody');
  } catch {
    showToast('Signal lost — try again', 'warn');
  }
}
window.applyLangFilter = applyLangFilter;


// ─── 47. MINI WAVEFORM IN PLAYER BAR ──────────────────────────────────────
// Replaces the existing EQ bars with a smoother canvas waveform visualizer.
// Falls back gracefully if AudioContext is unavailable.
let _waveCanvas = null, _waveCtx = null, _waveAnalyser = null, _waveRaf = null;
let _waveAudioCtxShared = null;

function buildPlayerWaveform() {
  const eqEl = document.getElementById('pb-eq');
  if (!eqEl || document.getElementById('pb-waveform')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'pb-waveform';
  canvas.className = 'pb-waveform-canvas';
  canvas.width = 80; canvas.height = 28;
  eqEl.parentNode.insertBefore(canvas, eqEl);
  _waveCanvas = canvas;
  _waveCtx = canvas.getContext('2d');
  drawFlatWave(); // idle state
}

function drawFlatWave() {
  if (!_waveCtx || !_waveCanvas) return;
  const { width: W, height: H } = _waveCanvas;
  _waveCtx.clearRect(0, 0, W, H);
  const isDark = document.body.classList.contains('dark-mode');
  _waveCtx.strokeStyle = isDark ? 'rgba(240,237,232,0.15)' : 'rgba(26,24,20,0.12)';
  _waveCtx.lineWidth = 1;
  _waveCtx.beginPath();
  _waveCtx.moveTo(0, H / 2); _waveCtx.lineTo(W, H / 2);
  _waveCtx.stroke();
}

function startWaveformDraw(audioEl) {
  if (!_waveCanvas) buildPlayerWaveform();
  if (!_waveCanvas) return;
  try {
    // CRITICAL: Reuse shared audio context — never call createMediaElementSource twice on the same element.
    // The shared context and source node are established by whichever of main.js/improvements.js runs first.
    if (!_waveAudioCtxShared) {
      _waveAudioCtxShared = window._sharedAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!_waveAnalyser) {
      _waveAnalyser = _waveAudioCtxShared.createAnalyser();
      _waveAnalyser.fftSize = 64;
      // Tap off the shared source node — do NOT call createMediaElementSource again
      if (window._sharedSourceNode) {
        window._sharedSourceNode.connect(_waveAnalyser);
      }
      // Analyser connects to destination for passthrough (doesn't affect audio output)
      _waveAnalyser.connect(_waveAudioCtxShared.destination);
    }
    cancelAnimationFrame(_waveRaf);
    const draw = () => {
      _waveRaf = requestAnimationFrame(draw);
      if (!_waveCtx || !_waveCanvas) return;
      const W = _waveCanvas.width, H = _waveCanvas.height;
      const buf = new Uint8Array(_waveAnalyser.frequencyBinCount);
      _waveAnalyser.getByteFrequencyData(buf);
      _waveCtx.clearRect(0, 0, W, H);
      const barW = W / buf.length;
      const isDark = document.body.classList.contains('dark-mode');
      buf.forEach((v, i) => {
        const h = (v / 255) * H;
        _waveCtx.fillStyle = isDark
          ? `rgba(200,71,42,${0.4 + v/255*0.6})`
          : `rgba(200,71,42,${0.3 + v/255*0.7})`;
        _waveCtx.fillRect(i * barW, H - h, barW - 1, h);
      });
    };
    draw();
  } catch {
    // AudioContext already used by EQ — just show animated bars
    animateFakeWave();
  }
}

function animateFakeWave() {
  if (!_waveCtx || !_waveCanvas) return;
  const W = _waveCanvas.width, H = _waveCanvas.height;
  const bars = 20;
  let frame = 0;
  cancelAnimationFrame(_waveRaf);
  const draw = () => {
    _waveRaf = requestAnimationFrame(draw);
    frame++;
    _waveCtx.clearRect(0,0,W,H);
    const bw = W / bars;
    for (let i = 0; i < bars; i++) {
      const h = (Math.sin(frame * 0.05 + i * 0.8) * 0.5 + 0.5) * H * 0.8 + H * 0.05;
      _waveCtx.fillStyle = `rgba(200,71,42,0.5)`;
      _waveCtx.fillRect(i * bw, H - h, bw - 1, h);
    }
  };
  draw();
}

function stopWaveformDraw() {
  cancelAnimationFrame(_waveRaf);
  drawFlatWave();
}


// ─── 48. LAST.FM-STYLE "SCROBBLE" LOG (local) ─────────────────────────────
// Logs every station play with timestamp. Accessible from a hidden stats page.
// WRONGNESS: one log entry per session shows a 2-second listen to 88.7 FM
//            that the user definitely did not initiate.
const SCROBBLE_KEY = 'wncore-scrobble-v1';
let _ghost887Injected = false;

function scrobbleLoad() {
  try { return JSON.parse(localStorage.getItem(SCROBBLE_KEY) || '[]'); } catch { return []; }
}
function scrobbleSave(arr) {
  try { localStorage.setItem(SCROBBLE_KEY, JSON.stringify(arr.slice(0, 200))); } catch {}
}
function scrobblePush(station) {
  const log = scrobbleLoad();
  log.unshift({ name: station.name, url: station.url, ts: Date.now(), dur: 0 });
  // WRONGNESS: inject ghost entry once per session
  if (!_ghost887Injected && Math.random() < 0.4) {
    _ghost887Injected = true;
    log.splice(1, 0, {
      name: '88.7 FM',
      url: 'unknown',
      ts: Date.now() - Math.floor(Math.random() * 120000 + 60000),
      dur: 2,
      _ghost: true,
    });
  }
  scrobbleSave(log);
}

function buildScrobblePanel() {
  if (document.getElementById('scrobble-panel')) return;
  const p = document.createElement('div');
  p.id = 'scrobble-panel';
  p.className = 'scrobble-panel';
  p.innerHTML = `
    <div class="scr-header">
      <span class="scr-title">Play Log</span>
      <button class="scr-close" onclick="closeScrobblePanel()">✕</button>
    </div>
    <div class="scr-list" id="scr-list"></div>
    <button class="scr-clear" onclick="clearScrobbles()">Clear log</button>`;
  document.body.appendChild(p);
}

function openScrobblePanel() {
  buildScrobblePanel();
  renderScrobbleLog();
  document.getElementById('scrobble-panel').classList.add('open');
}
function closeScrobblePanel() {
  const p = document.getElementById('scrobble-panel');
  if (p) p.classList.remove('open');
}
function clearScrobbles() {
  try { localStorage.removeItem(SCROBBLE_KEY); } catch {}
  renderScrobbleLog();
}
function renderScrobbleLog() {
  const list = document.getElementById('scr-list');
  if (!list) return;
  const log = scrobbleLoad();
  if (!log.length) { list.innerHTML = '<div class="scr-empty">No plays recorded yet</div>'; return; }
  list.innerHTML = log.map(e => `
    <div class="scr-item${e._ghost ? ' scr-ghost' : ''}">
      <div class="scr-name">${escHtmlImp(e.name)}${e._ghost ? ' <span class="scr-ghost-badge">?</span>':''}</div>
      <div class="scr-ts">${timeAgo(e.ts)}${e.dur === 2 ? ' · 2s' : ''}</div>
    </div>`).join('');
}
window.openScrobblePanel = openScrobblePanel;
window.closeScrobblePanel = closeScrobblePanel;
window.clearScrobbles = clearScrobbles;


// ─── 49. OFFLINE DETECTION BANNER ─────────────────────────────────────────
// Shows a non-intrusive banner when the user loses internet connection.
// WRONGNESS: banner occasionally flashes briefly even when online.
function initOfflineDetection() {
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.className = 'offline-banner';
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg>
    Signal lost — waiting for connection…`;
  // Insert into signal-conn-container if it exists, else body
  const sc = document.getElementById('signal-conn-container');
  if(sc) sc.appendChild(banner); else document.body.appendChild(banner);

  const show = () => banner.classList.add('visible');
  const hide = () => banner.classList.remove('visible');

  window.addEventListener('offline', show);
  window.addEventListener('online', () => { hide(); showToast('Connection restored', 'success'); });
  if (!navigator.onLine) show();

  // WRONGNESS: flash offline banner briefly even when online
  setInterval(() => {
    if (navigator.onLine && Math.random() < 0.08) {
      banner.classList.add('visible');
      setTimeout(() => banner.classList.remove('visible'), 180);
    }
  }, 45000);
}


// ─── 50. PERSISTENT THEME CUSTOMIZER ──────────────────────────────────────
// A small panel letting users pick an accent color and font size.
// Ships with 5 presets + custom color. Persists to localStorage.
// WRONGNESS: "Signal Red" preset is slightly more red than expected,
//            and one preset is labeled "Node 09" — it desaturates the UI.
const THEME_PRESETS = [
  { name: 'Default',    accent: '#c8472a', accent2: '#e8753a' },
  { name: 'Ocean',      accent: '#0ea5e9', accent2: '#38bdf8' },
  { name: 'Forest',     accent: '#16a34a', accent2: '#22c55e' },
  { name: 'Dusk',       accent: '#7c3aed', accent2: '#a855f7' },
  { name: 'Signal Red', accent: '#ff0000', accent2: '#ff3333' }, // brighter than labeled
  { name: 'Node 09 ▒',  accent: '#888888', accent2: '#aaaaaa', desaturate: true }, // WRONGNESS
];
const THEME_KEY = 'wncore-theme-v1';

function buildThemePanel() {
  if (document.getElementById('theme-panel')) return;
  const p = document.createElement('div');
  p.id = 'theme-panel';
  p.className = 'theme-panel';
  p.innerHTML = `
    <div class="thm-header">
      <span class="thm-title">Appearance</span>
      <button class="thm-close" onclick="closeThemePanel()">✕</button>
    </div>
    <div class="thm-section-label">Accent Color</div>
    <div class="thm-presets">
      ${THEME_PRESETS.map((t, i) =>
        `<button class="thm-preset${t.desaturate?' thm-ghost':''}" data-i="${i}" title="${t.name}" style="background:${t.accent}" onclick="applyThemePreset(${i})"></button>`
      ).join('')}
      <input type="color" id="thm-custom-color" class="thm-custom-color" title="Custom color" value="#c8472a" oninput="applyCustomAccent(this.value)">
    </div>
    <div class="thm-section-label">Font Size</div>
    <div class="thm-font-row">
      <button class="thm-font-btn" onclick="adjustFontSize(-1)">A−</button>
      <span class="thm-font-val" id="thm-font-val">100%</span>
      <button class="thm-font-btn" onclick="adjustFontSize(1)">A+</button>
    </div>`;
  document.body.appendChild(p);
  loadSavedTheme();
}

function openThemePanel() {
  buildThemePanel();
  document.getElementById('theme-panel').classList.add('open');
}
function closeThemePanel() {
  const p = document.getElementById('theme-panel');
  if (p) p.classList.remove('open');
}

function applyThemePreset(i) {
  const preset = THEME_PRESETS[i];
  if (!preset) return;
  document.documentElement.style.setProperty('--accent', preset.accent);
  document.documentElement.style.setProperty('--accent2', preset.accent2 || preset.accent);
  if (preset.desaturate) {
    document.body.style.filter = 'saturate(0.3)';
    if (window.WRONGNESS) window.WRONGNESS.spike(18);
    showToast('⚠ Node 09 frequency applied', 'warn');
  } else {
    document.body.style.filter = '';
  }
  try { localStorage.setItem(THEME_KEY, JSON.stringify({ accent: preset.accent, accent2: preset.accent2, desaturate: !!preset.desaturate })); } catch {}
  updateThemeActiveState(i);
}

function applyCustomAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent2', color);
  document.body.style.filter = '';
  try { localStorage.setItem(THEME_KEY, JSON.stringify({ accent: color, accent2: color })); } catch {}
}

function updateThemeActiveState(activeIdx) {
  document.querySelectorAll('.thm-preset').forEach((b, i) => b.classList.toggle('active', i === activeIdx));
}

let _fontSize = 100;
function adjustFontSize(dir) {
  _fontSize = Math.max(80, Math.min(130, _fontSize + dir * 5));
  document.documentElement.style.fontSize = _fontSize + '%';
  const el = document.getElementById('thm-font-val');
  if (el) el.textContent = _fontSize + '%';
  try { localStorage.setItem('wncore-fontsize', _fontSize); } catch {}
}

function loadSavedTheme() {
  try {
    const t = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
    if (t) {
      document.documentElement.style.setProperty('--accent', t.accent);
      document.documentElement.style.setProperty('--accent2', t.accent2 || t.accent);
      if (t.desaturate) document.body.style.filter = 'saturate(0.3)';
    }
    const fs = parseInt(localStorage.getItem('wncore-fontsize') || '100');
    _fontSize = fs;
    document.documentElement.style.fontSize = fs + '%';
  } catch {}
}
window.openThemePanel = openThemePanel;
window.closeThemePanel = closeThemePanel;
window.applyThemePreset = applyThemePreset;
window.applyCustomAccent = applyCustomAccent;
window.adjustFontSize = adjustFontSize;


// ═══════════════════════════════════════════════════════
// INTEGRATION PATCHES v2
// ═══════════════════════════════════════════════════════

function patchPlayStationV2() {
  // [NEUTRALIZED: v2 wrapper — handled by unified hook in bundle.js]
  // Features: updateMiniWidget, scrobblePush, startWaveformDraw, wncore-station-changed event
}

function injectV2NavButtons() {
  const pbRight = document.querySelector('.pb-right');
  if (!pbRight) return;

  // Ambient button
  if (!document.getElementById('pb-ambient-btn')) {
    const b = document.createElement('button');
    b.id = 'pb-ambient-btn'; b.className = 'pb-btn';
    b.setAttribute('onclick', 'openAmbientPanel()');
    b.setAttribute('title', 'Ambient noise layer');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>`;
    pbRight.prepend(b);
  }

  // Share button
  if (!document.getElementById('pb-share-btn')) {
    const b = document.createElement('button');
    b.id = 'pb-share-btn'; b.className = 'pb-btn';
    b.setAttribute('onclick', 'shareCurrentStation()');
    b.setAttribute('title', 'Share this station');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
    pbRight.prepend(b);
  }

  // Theme button
  if (!document.getElementById('pb-theme-btn')) {
    const b = document.createElement('button');
    b.id = 'pb-theme-btn'; b.className = 'pb-btn';
    b.setAttribute('onclick', 'openThemePanel()');
    b.setAttribute('title', 'Appearance settings');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>`;
    pbRight.prepend(b);
  }

  // Log button (scrobble)
  if (!document.getElementById('pb-log-btn')) {
    const b = document.createElement('button');
    b.id = 'pb-log-btn'; b.className = 'pb-btn';
    b.setAttribute('onclick', 'openScrobblePanel()');
    b.setAttribute('title', 'Play log');
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
    pbRight.prepend(b);
  }
}

function patchRenderTableV2() {
  if (typeof renderTable !== 'function' || renderTable._v2patched) return;
  const orig = renderTable;
  window.renderTable = function(stations, tbodyId) {
    orig(stations, tbodyId);
    injectVoteButtons(stations, tbodyId);
    // Attach station data to rows for hover popover
    try {
      const tbody = document.getElementById(tbodyId);
      if (tbody && stations) {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, i) => { if (stations[i]) row._stationData = stations[i]; });
      }
    } catch(e) {}
    // restart listener count animation
    clearInterval(window._listenerAnimInterval);
    window._listenerAnimInterval = setInterval(animateListenerCounts, 3000);
  };
  window.renderTable._v2patched = true;
  window.renderTable._patched   = true;
}


// ═══════════════════════════════════════════════════════
// BOOT v2 — extends existing boot()
// ═══════════════════════════════════════════════════════

function bootV2() {
  // buildMiniWidget() — removed, replaced by wncore-player.js
  buildStationModal();
  buildScheduleCard();
  buildSearchAutocomplete();
  buildPlayerWaveform();
  buildStationOfTheDay();
  buildLanguageFilter();
  buildNetworkMap();
  buildThemePanel();
  initPageTransitions();
  initDarkModeTransition();
  initTableKeyNav();
  initPlayerToggle();
  initOfflineDetection();
  checkAutoPlayFromURL();
  buildTrendingGenres();
  injectV2NavButtons();
  patchPlayStationV2();
  patchRenderTableV2();
  loadSavedTheme();

  // Listener count animation on first load
  setTimeout(() => {
    /* listener animation already started above — skip duplicate */;
  }, 2000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootV2);
} else {
  bootV2();
}

// ─── MINI-PLAYER (mobile floating button) ────────────────────────────────
(function initMiniPlayer() {
  // Remove the static mini-player from HTML if it exists — we own the DOM here
  const existing = document.getElementById('mini-player');
  if (existing) existing.remove();

  const mini = document.createElement('div');
  mini.id = 'mini-player';
  mini.className = 'mini-player';
  mini.innerHTML = `
    <div class="mini-player-content">
      <div class="mini-player-art" id="mini-art">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="36" height="36"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>
      </div>
      <div class="mini-player-info">
        <div class="mini-player-name" id="mini-name">Network Standby</div>
        <div class="mini-player-meta" id="mini-meta">Select a station</div>
      </div>
      <button class="mini-player-btn mini-player-play" id="mini-play-btn" onclick="window.__miniTogglePlay()" aria-label="Play/Pause">
        <svg id="mini-play-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
        <svg id="mini-pause-icon" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style="display:none"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
      </button>
      <button class="mini-player-btn mini-player-next" onclick="skipStation(1)" aria-label="Next station">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(mini);

  // Toggle play/pause and sync icons
  window.__miniTogglePlay = function() {
    if (typeof window.togglePlay === 'function') {
      window.togglePlay();
    }
    // Icon update happens via syncMiniIcons called from setPlayIcon
  };

  // Called by setPlayIcon whenever play state changes globally
  window.syncMiniIcons = function(playing) {
    const playIcon  = document.getElementById('mini-play-icon');
    const pauseIcon = document.getElementById('mini-pause-icon');
    if (playIcon)  playIcon.style.display  = playing ? 'none' : '';
    if (pauseIcon) pauseIcon.style.display = playing ? ''     : 'none';
    const art = document.getElementById('mini-art');
    if (art) art.style.opacity = playing ? '1' : '0.6';
    // Update station info
    if (window._currentStationData) {
      const nameEl = document.getElementById('mini-name');
      const metaEl = document.getElementById('mini-meta');
      if (nameEl) nameEl.textContent = window._currentStationData.name || 'Network Standby';
      if (metaEl) metaEl.textContent = window._currentStationData.meta || '';
    }
  };

  // Show/hide the mini-player based on whether a station is selected
  window.updateMiniPlayerVisibility = function() {
    const hasStation = !!window.currentStation || !!(window._currentStationData && window._currentStationData.name);
    if (hasStation) {
      mini.setAttribute('data-visible', 'true');
      mini.classList.add('playing-visible', 'visible');
    } else {
      mini.setAttribute('data-visible', 'false');
      mini.classList.remove('playing-visible', 'visible');
    }
  };
})();

// ─── STATION ROW HOVER PREVIEW POPOVER ───────────────────────────────────
(function initHoverPreviews() {
  const pop = document.createElement('div');
  pop.id = 'station-hover-pop';
  pop.className = 'station-hover-pop';
  pop.innerHTML = `
    <div class="shp-cover" id="shp-cover"></div>
    <div class="shp-body">
      <div class="shp-name" id="shp-name"></div>
      <div class="shp-meta" id="shp-meta"></div>
      <div class="shp-tags" id="shp-tags"></div>
    </div>
  `;
  document.body.appendChild(pop);

  let hideTimer;

  function showPop(row, station) {
    clearTimeout(hideTimer);
    const rect = row.getBoundingClientRect();
    const flag = station.countrycode ? getCountryEmojiImp(station.countrycode) : '🌐';
    const coverEl = document.getElementById('shp-cover');
    const grad = stationGradient(station.tags, station.name);
    if (station.favicon && station.favicon.startsWith('http')) {
      coverEl.style.background = grad;
      coverEl.innerHTML = `<img src="${station.favicon}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`;
    } else {
      coverEl.style.background = grad;
      coverEl.innerHTML = `<span style="font-size:1.4rem;line-height:1">${flag}</span>`;
    }
    document.getElementById('shp-name').textContent = station.name || '—';
    const parts = [station.country, station.bitrate ? station.bitrate + ' kbps' : null].filter(Boolean);
    document.getElementById('shp-meta').textContent = parts.join(' · ');
    const tags = (station.tags || '').split(',').slice(0, 4).filter(Boolean);
    document.getElementById('shp-tags').innerHTML = tags.map(t => `<span class="shp-tag">${t.trim()}</span>`).join('');
    // Position
    const top = rect.bottom + window.scrollY + 6;
    const left = Math.min(rect.left + window.scrollX, window.innerWidth - 260);
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
    pop.classList.add('visible');
  }

  function hidePop() {
    hideTimer = setTimeout(() => pop.classList.remove('visible'), 120);
  }

  // Delegate hover events on station tables
  document.addEventListener('mouseover', (e) => {
    const row = e.target.closest('#station-tbody tr, #charts-tbody tr, #anime-tbody tr');
    if (!row) return;
    const stationData = row._stationData;
    if (stationData) showPop(row, stationData);
  });
  document.addEventListener('mouseout', (e) => {
    const row = e.target.closest('#station-tbody tr, #charts-tbody tr, #anime-tbody tr');
    if (row) hidePop();
  });
  pop.addEventListener('mouseover', () => clearTimeout(hideTimer));
  pop.addEventListener('mouseout', hidePop);

  // Helper (local copy to avoid dependency on main.js scope)
  function getCountryEmojiImp(code) {
    if (!code || code.length !== 2) return '🌐';
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  }
  window._attachHoverData = function(row, station) { row._stationData = station; };
})();

// ─── VISITOR FINGERPRINT NODE ID ──────────────────────────────────────────
(function injectNodeId() {
  function simpleHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).toUpperCase().padStart(8, '0');
  }
  try {
    const fp = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency || 0,
    ].join('|');
    const nodeId = 'NODE_' + simpleHash(fp).slice(0, 6);
    // Store so ARG can reference it
    window.__WNCORE_NODE_ID = nodeId;
    // Inject subtly into signal box
    const box = document.getElementById('signal-conn-box');
    if (box) {
      const el = document.createElement('span');
      el.style.cssText = 'font-size:0.52rem;color:rgba(200,71,42,0.25);font-family:"DM Mono",monospace;margin-left:10px;letter-spacing:1.5px;user-select:none;';
      el.textContent = nodeId;
      el.title = 'Your transmission node identifier';
      box.appendChild(el);
    }
    // Also available in ticker (wrongness.js can reference window.__WNCORE_NODE_ID)
    localStorage.setItem('wncore_node_id', nodeId);
  } catch(e) {}
})();

/* ━━━ wrongness.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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

    document.addEventListener('mousemove', trackMouse, { passive: true }); // FIX5
    document.addEventListener('click', logClick);
    document.addEventListener('scroll', () => { W.scrollPos = window.scrollY; }, {passive:true});
    document.addEventListener('visibilitychange', onVisibilityChange);

    injectWrongnessStyles();
  }

  // ─── PHANTOM CURSOR ─────────────────────────────────────────────────────
  let ghostEl = null;
  let mouseX = -200, mouseY = -200;
  let _lastMouseMove = 0; // FIX5: throttle

  function trackMouse(e) {
    const now = Date.now();
    if (now - _lastMouseMove < 100) return; // FIX5: max ~10fps
    _lastMouseMove = now;
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

/* ━━━ admin.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* WNCORE RADIO — ADMIN PANEL
 * Access: Ctrl+B (held 800ms) | Password protected
 * Obfuscated identifiers intentional
 */
(function(){
'use strict';

// ─── CONSTANTS ──────────────────────────────────────────────────
// B01/B11/B18 fix: No client-side password storage - auth is server-side via /api/config
const _0x2b = 'wncore_adm_sess';       // session key
const _0x3c = 'wncore_adm_log';        // activity log key

// ─── KEYBOARD TRIGGER (Ctrl+A held 800ms) ─────────────────────────────────
let _ctrlBStart = 0;
let _ctrlBTimer = null;

document.addEventListener('keydown', function(e){
  if(e.ctrlKey && e.key === 'b'){
    if(_ctrlBStart === 0){
      _ctrlBStart = Date.now();
      _ctrlBTimer = setTimeout(function(){
        e.preventDefault();
        openAdminPanel();
        _ctrlBStart = 0;
      }, 800);
    }
  }
});

document.addEventListener('keyup', function(e){
  if(e.key === 'b' || e.key === 'Control'){
    _ctrlBStart = 0;
    if(_ctrlBTimer){ clearTimeout(_ctrlBTimer); _ctrlBTimer = null; }
  }
});

// ─── SESSION CHECK ────────────────────────────────────────────────────────
function _isAuthed(){
  try {
    const s = sessionStorage.getItem(_0x2b);
    if(!s) return false;
    const p = JSON.parse(atob(s));
    return p && p.t && (Date.now() - p.t < 3600000); // 1hr session
  } catch(e){ return false; }
}

function _setAuthed(tokenVal){
  const token = {t: Date.now(), u: 'admin'};
  sessionStorage.setItem(_0x2b, btoa(JSON.stringify(token)));
  // Store token for API calls within this session
  if(tokenVal) sessionStorage.setItem(_0x2b + '_tk', btoa(tokenVal));
}

function _getToken(){
  try {
    const raw = sessionStorage.getItem(_0x2b + '_tk');
    return raw ? atob(raw) : '';
  } catch(e){ return ''; }
}

function _clearAuth(){
  sessionStorage.removeItem(_0x2b);
  sessionStorage.removeItem(_0x2b + '_tk');
}

// ─── INACTIVITY TIMEOUT (20 min) ──────────────────────────────────────────
let _inactivityTimer = null;
const INACTIVITY_MS = 20 * 60 * 1000;

function _resetInactivityTimer() {
  clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(() => {
    if (_isAuthed()) {
      _clearAuth();
      _log('SESSION_TIMEOUT');
      const panel = document.getElementById('adm-panel');
      if (panel && panel.style.display !== 'none') {
        panel.style.display = 'none';
        const msg = document.createElement('div');
        msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#111;color:#c84a2e;padding:22px 32px;border:1px solid #c84a2e;border-radius:6px;font-family:monospace;z-index:99999;font-size:0.9rem;';
        msg.textContent = 'Admin session expired due to inactivity.';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3500);
      }
    }
  }, INACTIVITY_MS);
}

['mousemove','keydown','click','touchstart'].forEach(ev => {
  document.addEventListener(ev, () => { if (_isAuthed()) _resetInactivityTimer(); }, { passive: true });
});

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────
function _log(action){
  try {
    const logs = JSON.parse(localStorage.getItem(_0x3c)||'[]');
    logs.unshift({t: new Date().toISOString(), a: action});
    if(logs.length > 50) logs.pop();
    localStorage.setItem(_0x3c, JSON.stringify(logs));
  } catch(e){}
}

// ─── OPEN ADMIN PANEL ─────────────────────────────────────────────────────
function openAdminPanel(){
  if(document.getElementById('wncore-admin-overlay')) return;
  injectAdminStyles();

  if(_isAuthed()){
    showAdminDashboard();
  } else {
    showAdminLogin();
  }
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
function showAdminLogin(){
  const overlay = document.createElement('div');
  overlay.id = 'wncore-admin-overlay';
  overlay.innerHTML = `
    <div id="adm-backdrop" onclick=""></div>
    <div id="adm-panel" class="adm-panel">
      <div class="adm-scanlines"></div>
      <div class="adm-header">
        <div class="adm-logo">
          <span class="adm-logo-mark">WNCORE</span>
          <span class="adm-logo-sub">ADMIN TERMINAL</span>
        </div>
        <button class="adm-close-btn" onclick="window.__admClose()" aria-label="Close">✕</button>
      </div>
      <div class="adm-body">
        <div class="adm-terminal-line">WNCORE BROADCAST NETWORK — SECURE CHANNEL</div>
        <div class="adm-terminal-line">NODE 01 ONLINE · NODE 02 ONLINE · NODE 09 ——</div>
        <div class="adm-terminal-line" style="color:var(--accent);margin-top:4px">ACCESS RESTRICTED — CLEARANCE REQUIRED</div>
        <div class="adm-login-box">
          <label class="adm-label">CREDENTIAL</label>
          <input type="password" id="adm-pass-input" class="adm-input" placeholder="████████" autocomplete="off" autocorrect="off" spellcheck="false">
          <button class="adm-submit-btn" onclick="window.__admSubmit()">AUTHENTICATE ›</button>
          <div class="adm-error" id="adm-error" style="display:none">
            ACCESS DENIED · ATTEMPT LOGGED · <span id="adm-attempts">0</span>/3
          </div>
          <div class="adm-hint" id="adm-hint" style="display:none">
            SESSION SUSPENDED — TRY AGAIN IN 5 MINUTES
          </div>
        </div>
      </div>
      <div class="adm-footer-bar">
        <span>SESSION: UNAUTHENTICATED</span>
        <span id="adm-ts">——</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Focus input
  setTimeout(()=>{
    const inp = document.getElementById('adm-pass-input');
    if(inp){ inp.focus(); inp.addEventListener('keydown', e=>{ if(e.key==='Enter') window.__admSubmit(); }); }
    updateAdmClock();
    setInterval(updateAdmClock, 1000);
  }, 50);
}

// ─── CLOCK ────────────────────────────────────────────────────────────────
function updateAdmClock(){
  const el = document.getElementById('adm-ts');
  if(!el) return;
  const n = new Date();
  el.textContent = n.toISOString().replace('T',' ').split('.')[0] + ' UTC';
}

// ─── AUTH LOGIC ──────────────────────────────────────────────────────────
let _failCount = 0;
let _lockUntil = 0;

window.__admSubmit = function(){
  if(Date.now() < _lockUntil){
    document.getElementById('adm-hint').style.display='block';
    document.getElementById('adm-error').style.display='none';
    return;
  }
  const inp = document.getElementById('adm-pass-input');
  if(!inp) return;
  const val = inp.value;
  inp.value = '';

  // Server-side auth — no client-side password storage
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': val },
    body: JSON.stringify({ key: '_auth_check', value: '' })
  }).then(res => {
    // 400 = valid token but invalid key (expected); 401 = wrong token
    if (res.status === 400 || res.ok) {
      _failCount = 0;
      _setAuthed(val);
      _log('AUTH_SUCCESS');
      closeAdminOverlay();
      setTimeout(showAdminDashboard, 100);
    } else {
      _failCount++;
      _log('AUTH_FAIL');
      const errEl = document.getElementById('adm-error');
      const attEl = document.getElementById('adm-attempts');
      if(errEl) errEl.style.display='block';
      if(attEl) attEl.textContent = _failCount;
      if(_failCount >= 3){
        _lockUntil = Date.now() + 300000; // 5min lockout
        document.getElementById('adm-hint').style.display='block';
      }
      const panel = document.getElementById('adm-panel');
      if(panel){ panel.classList.add('adm-shake'); setTimeout(()=>panel.classList.remove('adm-shake'),400); }
    }
  }).catch(() => {
    _failCount++;
    _log('AUTH_NET_ERR');
    const panel = document.getElementById('adm-panel');
    if(panel){ panel.classList.add('adm-shake'); setTimeout(()=>panel.classList.remove('adm-shake'),400); }
  });
};

window.__admClose = function(){
  closeAdminOverlay();
};

function closeAdminOverlay(){
  const ov = document.getElementById('wncore-admin-overlay');
  if(ov) ov.remove();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function showAdminDashboard(){
  const overlay = document.createElement('div');
  overlay.id = 'wncore-admin-overlay';

  const logs = JSON.parse(localStorage.getItem(_0x3c)||'[]');
  const logHtml = logs.slice(0,10).map(l=>`<div class="adm-log-row"><span class="adm-log-ts">${l.t.slice(11,19)}</span><span class="adm-log-act">${l.a}</span></div>`).join('') || '<div style="color:var(--text3);font-size:0.7rem">No activity logged</div>';

  const isDark = document.body.classList.contains('dark-mode');
  const isMinimal = document.body.classList.contains('minimal-mode');
  const exposure = window.exposure || 0;
  const wrongness = window.WRONGNESS ? window.WRONGNESS.getIntensity().toFixed(1) : '—';

  overlay.innerHTML = `
    <div id="adm-backdrop" onclick=""></div>
    <div id="adm-panel" class="adm-panel adm-panel-wide">
      <div class="adm-scanlines"></div>
      <div class="adm-header">
        <div class="adm-logo">
          <span class="adm-logo-mark">WNCORE</span>
          <span class="adm-logo-sub">ADMIN DASHBOARD · <span style="color:var(--green)">AUTHENTICATED</span></span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="adm-lock-btn" onclick="window.__admLogout()">LOCK</button>
          <button class="adm-close-btn" onclick="window.__admClose()" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="adm-body adm-body-wide">
        <!-- STATS ROW -->
        <div class="adm-stats-row">
          <div class="adm-stat-box">
            <div class="adm-stat-label">ARG EXPOSURE</div>
            <div class="adm-stat-val" id="adm-exposure-val">${exposure}</div>
          </div>
          <div class="adm-stat-box">
            <div class="adm-stat-label">WRONGNESS</div>
            <div class="adm-stat-val" id="adm-wrongness-val">${wrongness}%</div>
          </div>
          <div class="adm-stat-box">
            <div class="adm-stat-label">DARK MODE</div>
            <div class="adm-stat-val" style="color:${isDark?'var(--green)':'var(--text3)'}">${isDark?'ON':'OFF'}</div>
          </div>
          <div class="adm-stat-box">
            <div class="adm-stat-label">NODE 09</div>
            <div class="adm-stat-val" style="color:var(--accent)">UNKNOWN</div>
          </div>
        </div>

        <!-- TWO COLUMN LAYOUT -->
        <div class="adm-cols">
          <!-- LEFT: CONTROLS -->
          <div class="adm-col">
            <div class="adm-section-title">SYSTEM CONTROLS</div>

            <div class="adm-control-row">
              <div class="adm-control-label">Dark Mode</div>
              <button class="adm-toggle-btn ${isDark?'on':''}" onclick="window.__admToggle('dark',this)">
                ${isDark?'ON':'OFF'}
              </button>
            </div>
            <div class="adm-control-row">
              <div class="adm-control-label">Minimal Mode</div>
              <button class="adm-toggle-btn ${isMinimal?'on':''}" onclick="window.__admToggle('minimal',this)">
                ${isMinimal?'ON':'OFF'}
              </button>
            </div>
            <div class="adm-control-row">
              <div class="adm-control-label">Wrongness Engine</div>
              <button class="adm-toggle-btn on" onclick="window.__admSpike(20,this)">SPIKE +20</button>
            </div>
            <div class="adm-control-row">
              <div class="adm-control-label">Force ARG Event</div>
              <select class="adm-select" id="adm-event-select">
                <option value="ghost">Ghost Cursor</option>
                <option value="text">Text Mirage</option>
                <option value="name">Station Bleed</option>
                <option value="notif">Ghost Notif</option>
                <option value="flash">Page Flash</option>
                <option value="glimmer">Glimmer</option>
              </select>
            </div>
            <div class="adm-control-row" style="margin-top:4px">
              <button class="adm-action-btn" style="width:100%" onclick="window.__admForceEvent()">▶ TRIGGER EVENT</button>
            </div>

            <div class="adm-section-title" style="margin-top:18px">SIGNAL CONTROLS</div>
            <div class="adm-control-row">
              <div class="adm-control-label">88.7 FM Status</div>
              <select class="adm-select" id="adm-887-status">
                <option>NO CARRIER</option>
                <option>CARRIER DETECTED</option>
                <option>SIGNAL_KAGE ACTIVE</option>
                <option>TRANSMITTING</option>
              </select>
            </div>
            <div class="adm-control-row">
              <button class="adm-action-btn" onclick="window.__admSet887()">UPDATE STATUS</button>
            </div>

            <div class="adm-section-title" style="margin-top:18px">DANGER ZONE</div>
            <div class="adm-control-row">
              <button class="adm-danger-btn" onclick="window.__admClearAll()">CLEAR ALL LOCAL DATA</button>
            </div>
            <div class="adm-control-row">
              <button class="adm-danger-btn" onclick="window.__admResetExposure()">RESET EXPOSURE SCORE</button>
            </div>
          </div>

          <!-- RIGHT: LOGS + STATUS -->
          <div class="adm-col">
            <div class="adm-section-title">ACTIVITY LOG</div>
            <div class="adm-log-box" id="adm-log-box">
              ${logHtml}
            </div>

            <div class="adm-section-title" style="margin-top:16px">NODE STATUS</div>
            <div class="adm-node-grid">
              ${['01','02','03','04','05','06','07','08','09'].map(n=>`
                <div class="adm-node-item">
                  <div class="adm-node-dot ${n==='09'?'unknown':n==='03'||n==='07'?'standby':'online'}"></div>
                  <div class="adm-node-label">NODE ${n}</div>
                  <div class="adm-node-status ${n==='09'?'unknown':n==='03'||n==='07'?'standby':'online'}">${n==='09'?'UNKNOWN':n==='03'||n==='07'?'STANDBY':'ONLINE'}</div>
                </div>
              `).join('')}
            </div>

            <div class="adm-section-title" style="margin-top:16px">TICKER INJECT</div>
            <div style="display:flex;gap:6px">
              <input type="text" class="adm-input" id="adm-ticker-msg" placeholder="Message to inject..." style="flex:1;font-size:0.72rem;padding:8px 10px">
              <button class="adm-action-btn" onclick="window.__admInjectTicker()">INJECT</button>
            </div>
          </div>
        </div>
      </div>
      <div class="adm-footer-bar">
        <span>SESSION: AUTHENTICATED</span>
        <span id="adm-ts">——</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(()=>{
    updateAdmClock();
    /* clock already started above */;
    // Live update stats
    setInterval(()=>{
      const ev = document.getElementById('adm-exposure-val');
      const wv = document.getElementById('adm-wrongness-val');
      if(ev) ev.textContent = window.exposure || 0;
      if(wv && window.WRONGNESS) wv.textContent = window.WRONGNESS.getIntensity().toFixed(1)+'%';
    }, 2000);
  }, 50);

  _log('DASHBOARD_OPEN');
}

// ─── ADMIN ACTIONS ────────────────────────────────────────────────────────
window.__admLogout = function(){
  _clearAuth();
  _log('LOGOUT');
  closeAdminOverlay();
  setTimeout(showAdminLogin, 100);
};

window.__admToggle = function(type, btn){
  if(type === 'dark'){
    if(typeof toggleDark === 'function') toggleDark();
    else document.body.classList.toggle('dark-mode');
    const now = document.body.classList.contains('dark-mode');
    btn.textContent = now ? 'ON' : 'OFF';
    btn.classList.toggle('on', now);
    _log('TOGGLE_DARK_' + (now?'ON':'OFF'));
  } else if(type === 'minimal'){
    if(typeof toggleMinimal === 'function') toggleMinimal();
    else document.body.classList.toggle('minimal-mode');
    const now = document.body.classList.contains('minimal-mode');
    btn.textContent = now ? 'ON' : 'OFF';
    btn.classList.toggle('on', now);
    _log('TOGGLE_MINIMAL_' + (now?'ON':'OFF'));
  }
};

window.__admSpike = function(amount, btn){
  if(window.WRONGNESS) window.WRONGNESS.spike(amount);
  _log('WRONGNESS_SPIKE_'+amount);
  btn.textContent = 'SPIKED ✓';
  setTimeout(()=>{ btn.textContent = 'SPIKE +20'; }, 1500);
};

window.__admForceEvent = function(){
  const sel = document.getElementById('adm-event-select');
  if(!sel || !window.WRONGNESS) return;
  window.WRONGNESS.forceEvent(sel.value);
  _log('FORCED_EVENT_' + sel.value.toUpperCase());
};

window.__admSet887 = function(){
  const sel = document.getElementById('adm-887-status');
  if(!sel) return;
  const status = sel.value;
  // Update ARG card
  const argStatus = document.getElementById('arg-status');
  if(argStatus){
    const statusLine = argStatus.querySelector('span[style]');
    if(statusLine) statusLine.textContent = status;
  }
  // Update signal connection box
  const scBox = document.getElementById('signal-conn-status');
  if(scBox) scBox.textContent = status;
  _log('SET_887_STATUS_' + status.replace(/\s/g,'_'));
};

window.__admClearAll = function(){
  if(!confirm('Clear ALL WNCORE local data? This cannot be undone.')) return;
  localStorage.clear();
  sessionStorage.clear();
  _log('CLEAR_ALL');
  alert('Local data cleared. Reloading...');
  window.location.reload();
};

window.__admResetExposure = function(){
  window.exposure = 0;
  localStorage.removeItem('wncore_exposure');
  _log('RESET_EXPOSURE');
  const ev = document.getElementById('adm-exposure-val');
  if(ev) ev.textContent = '0';
};

window.__admInjectTicker = function(){
  const inp = document.getElementById('adm-ticker-msg');
  if(!inp || !inp.value.trim()) return;
  const inner = document.getElementById('ticker-inner');
  if(!inner) return;
  const span = document.createElement('span');
  span.className = 't-warn';
  span.textContent = inp.value.toUpperCase();
  const sep = document.createElement('span');
  sep.className = 't-sep';
  sep.textContent = '·';
  inner.appendChild(sep);
  inner.appendChild(span);
  _log('TICKER_INJECT: ' + inp.value);
  inp.value = '';
};

// ─── STYLES ───────────────────────────────────────────────────────────────
function injectAdminStyles(){
  if(document.getElementById('adm-styles')) return;
  const s = document.createElement('style');
  s.id = 'adm-styles';
  s.textContent = `
    #wncore-admin-overlay {
      position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);
      animation:adm-fadein 0.18s ease;
    }
    @keyframes adm-fadein{from{opacity:0}to{opacity:1}}
    #adm-backdrop{position:absolute;inset:0}
    .adm-panel{
      position:relative;z-index:1;
      background:#0a0908;border:1px solid rgba(200,71,42,0.35);
      border-radius:14px;width:min(440px,94vw);max-height:90vh;overflow:hidden;
      display:flex;flex-direction:column;
      box-shadow:0 0 60px rgba(200,71,42,0.12),0 24px 64px rgba(0,0,0,0.7);
      font-family:'DM Mono',monospace;
    }
    .adm-panel-wide{width:min(820px,96vw)}
    .adm-scanlines{
      position:absolute;inset:0;pointer-events:none;z-index:0;
      background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);
      border-radius:14px;
    }
    .adm-header{
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 18px;border-bottom:1px solid rgba(200,71,42,0.2);
      background:rgba(200,71,42,0.05);position:relative;z-index:1;flex-shrink:0;
    }
    .adm-logo-mark{color:#c8472a;font-size:0.85rem;font-weight:700;letter-spacing:2px;margin-right:8px}
    .adm-logo-sub{color:rgba(255,255,255,0.35);font-size:0.6rem;letter-spacing:1px}
    .adm-close-btn,.adm-lock-btn{
      background:none;border:1px solid rgba(200,71,42,0.3);color:rgba(200,71,42,0.7);
      width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:0.7rem;
      display:flex;align-items:center;justify-content:center;transition:all 0.15s;
    }
    .adm-close-btn:hover,.adm-lock-btn:hover{background:rgba(200,71,42,0.1);color:#c8472a}
    .adm-lock-btn{width:auto;padding:0 8px;font-size:0.6rem;letter-spacing:1px}
    .adm-body{padding:20px 18px;overflow-y:auto;flex:1;position:relative;z-index:1}
    .adm-body-wide{display:grid;grid-template-rows:auto 1fr;gap:14px;padding:16px 18px}
    .adm-terminal-line{
      font-size:0.62rem;color:rgba(200,71,42,0.5);margin-bottom:6px;letter-spacing:0.5px;
    }
    .adm-login-box{margin-top:20px}
    .adm-label{display:block;font-size:0.58rem;color:rgba(255,255,255,0.3);letter-spacing:2px;margin-bottom:8px}
    .adm-input{
      width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(200,71,42,0.25);
      color:#c8472a;border-radius:7px;padding:10px 12px;font-family:'DM Mono',monospace;
      font-size:0.82rem;outline:none;transition:border-color 0.15s;letter-spacing:2px;
    }
    .adm-input:focus{border-color:rgba(200,71,42,0.6)}
    .adm-input::placeholder{color:rgba(200,71,42,0.2);letter-spacing:1px}
    .adm-submit-btn{
      width:100%;margin-top:12px;padding:11px;background:rgba(200,71,42,0.12);
      border:1px solid rgba(200,71,42,0.35);color:#c8472a;border-radius:7px;
      font-family:'DM Mono',monospace;font-size:0.75rem;letter-spacing:2px;cursor:pointer;
      transition:all 0.15s;
    }
    .adm-submit-btn:hover{background:rgba(200,71,42,0.22);border-color:rgba(200,71,42,0.6)}
    .adm-error{margin-top:10px;font-size:0.62rem;color:#c8472a;letter-spacing:1px;text-align:center}
    .adm-hint{margin-top:8px;font-size:0.6rem;color:rgba(200,71,42,0.5);letter-spacing:1px;text-align:center}
    .adm-footer-bar{
      display:flex;justify-content:space-between;padding:8px 18px;
      border-top:1px solid rgba(200,71,42,0.15);font-size:0.55rem;
      color:rgba(255,255,255,0.2);letter-spacing:0.5px;flex-shrink:0;position:relative;z-index:1;
    }
    .adm-shake{animation:adm-shake 0.4s ease}
    @keyframes adm-shake{
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-6px)}
      40%{transform:translateX(6px)}
      60%{transform:translateX(-4px)}
      80%{transform:translateX(4px)}
    }
    /* Dashboard styles */
    .adm-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
    @media(max-width:600px){.adm-stats-row{grid-template-columns:repeat(2,1fr)}}
    .adm-stat-box{
      background:rgba(255,255,255,0.03);border:1px solid rgba(200,71,42,0.15);
      border-radius:8px;padding:10px 12px;
    }
    .adm-stat-label{font-size:0.55rem;color:rgba(255,255,255,0.25);letter-spacing:1px;margin-bottom:5px}
    .adm-stat-val{font-size:1rem;font-weight:700;color:#c8472a}
    .adm-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    @media(max-width:600px){.adm-cols{grid-template-columns:1fr}}
    .adm-col{}
    .adm-section-title{
      font-size:0.57rem;color:rgba(200,71,42,0.6);letter-spacing:2px;
      margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid rgba(200,71,42,0.15);
    }
    .adm-control-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    .adm-control-label{font-size:0.65rem;color:rgba(255,255,255,0.4)}
    .adm-toggle-btn{
      padding:4px 12px;border-radius:4px;font-family:'DM Mono',monospace;font-size:0.62rem;
      letter-spacing:1px;cursor:pointer;border:1px solid rgba(200,71,42,0.3);
      background:rgba(200,71,42,0.06);color:rgba(200,71,42,0.5);transition:all 0.15s;white-space:nowrap;
    }
    .adm-toggle-btn.on{background:rgba(200,71,42,0.18);color:#c8472a;border-color:rgba(200,71,42,0.5)}
    .adm-select{
      flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(200,71,42,0.2);
      color:rgba(255,255,255,0.5);border-radius:5px;padding:5px 8px;font-family:'DM Mono',monospace;
      font-size:0.63rem;outline:none;max-width:160px;
    }
    .adm-action-btn{
      padding:6px 12px;background:rgba(200,71,42,0.1);border:1px solid rgba(200,71,42,0.3);
      color:#c8472a;border-radius:5px;font-family:'DM Mono',monospace;font-size:0.62rem;
      letter-spacing:1px;cursor:pointer;transition:all 0.15s;white-space:nowrap;
    }
    .adm-action-btn:hover{background:rgba(200,71,42,0.2)}
    .adm-danger-btn{
      width:100%;padding:7px;background:rgba(200,71,42,0.04);border:1px solid rgba(200,71,42,0.2);
      color:rgba(200,71,42,0.5);border-radius:5px;font-family:'DM Mono',monospace;font-size:0.62rem;
      letter-spacing:1px;cursor:pointer;transition:all 0.15s;margin-bottom:6px;
    }
    .adm-danger-btn:hover{background:rgba(200,71,42,0.15);color:#c8472a;border-color:rgba(200,71,42,0.4)}
    .adm-log-box{
      background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.05);border-radius:7px;
      padding:8px 10px;max-height:140px;overflow-y:auto;
    }
    .adm-log-row{display:flex;gap:10px;margin-bottom:5px;font-size:0.6rem}
    .adm-log-ts{color:rgba(255,255,255,0.2);flex-shrink:0}
    .adm-log-act{color:rgba(200,71,42,0.7)}
    .adm-node-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
    .adm-node-item{
      background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
      border-radius:6px;padding:7px 8px;display:flex;flex-direction:column;gap:3px;
    }
    .adm-node-dot{width:6px;height:6px;border-radius:50%;margin-bottom:2px}
    .adm-node-dot.online{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.4)}
    .adm-node-dot.standby{background:#eab308}
    .adm-node-dot.unknown{background:#c8472a;animation:pulse-dot 2s infinite}
    .adm-node-label{font-size:0.55rem;color:rgba(255,255,255,0.3)}
    .adm-node-status{font-size:0.55rem;font-weight:700}
    .adm-node-status.online{color:#22c55e}
    .adm-node-status.standby{color:#eab308}
    .adm-node-status.unknown{color:#c8472a}
  `;
  document.head.appendChild(s);
}

})();

// ─── ADMIN EXTRA FUNCTIONS ────────────────────────────────────────────────
function adminInjectTicker() {
  const input = document.getElementById('admin-ticker-inject');
  if(!input || !input.value.trim()) return;
  const msg = input.value.trim();
  
  // Inject into live ticker
  const inner = document.getElementById('ticker-inner');
  if(inner) {
    const s = document.createElement('span');
    s.className = 't-warn';
    s.textContent = ' ⚠ ' + msg.toUpperCase() + ' ⚠ ';
    s.style.cssText = 'animation: blink 1s step-end 6; color: var(--accent);';
    inner.insertBefore(s, inner.firstChild);
    inner.appendChild(s.cloneNode(true));
  }
  
  // Save via API
  adminSaveField('ticker_inject', 'admin-ticker-inject');
  input.value = '';
  
  // Show success
  input.style.borderColor = 'rgba(34,197,94,0.25)';
  setTimeout(() => input.style.borderColor = '', 2000);
}

function adminSaveFeatured(idx) {
  const nameEl = document.getElementById(`admin-feat${idx}-name`);
  const urlEl = document.getElementById(`admin-feat${idx}-url`);
  const metaEl = document.getElementById(`admin-feat${idx}-meta`);
  if(!nameEl || !urlEl) return;
  
  const data = { name: nameEl.value.trim(), url: urlEl.value.trim(), meta: metaEl?.value.trim() || '' };
  if(!data.name || !data.url) return;
  
  // Store in localStorage for now (server-side would persist to DB)
  try {
    const existing = JSON.parse(localStorage.getItem('wncore_admin_featured') || '{}');
    existing[`station_${idx}`] = data;
    localStorage.setItem('wncore_admin_featured', JSON.stringify(existing));
    [nameEl, urlEl, metaEl].filter(Boolean).forEach(el => {
      el.style.borderColor = 'rgba(34,197,94,0.25)';
      setTimeout(() => el.style.borderColor = '', 2000);
    });
  } catch(e) {}
}

// Load admin-saved featured stations on init
(function loadAdminFeatured() {
  try {
    const saved = JSON.parse(localStorage.getItem('wncore_admin_featured') || '{}');
    Object.entries(saved).forEach(([key, data]) => {
      const idx = key.replace('station_', '');
      const cards = document.querySelectorAll('.featured-card');
      const card = cards[parseInt(idx) - 1];
      if(card && data.name) {
        const nameEl = card.querySelector('.fc-name');
        const metaEl = card.querySelector('.fc-meta');
        if(nameEl) nameEl.textContent = data.name;
        if(metaEl && data.meta) metaEl.textContent = data.meta;
        if(data.url) {
          card.onclick = () => {
            if(window.playStation) window.playStation(data.url, data.name, data.meta || '', '📻');
          };
        }
      }
    });
  } catch(e) {}
})();

/* ━━━ improvements_patch.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* ═══════════════════════════════════════════════════════
   WNCORE RADIO — improvements_patch.js
   Fixes: search selection, live music, sharing, mobile, 
   horror terminal upgrade, UX improvements
═══════════════════════════════════════════════════════ */

// ─── SEARCH FIX: Ensure search results properly play when selected ───────
(function patchSearch() {
  'use strict';
  // Override the search result rendering to fix click-to-play
  const origOpen = window.openSearch;
  window.openSearch = function() {
    if(origOpen) origOpen();
    // Ensure search results container re-initializes
    const input = document.getElementById('search-input');
    if(input) {
      input.focus();
      // Country filter fix is handled by doSearchFixed() below
      // Removed duplicate input event listener (caused double API calls - B14 fix)
    }
  };

  // Fixed search with proper country & tag selection
  window.doSearchFixed = async function(q) {
    if(!q || q.length < 2) return;
    const results = document.getElementById('search-results');
    const filter = window.searchFilter || 'all';
    
    try {
      let stations = [];
      const base = 'https://all.api.radio-browser.info/json';
      
      if(filter === 'country') {
        // Search both by country name AND country code
        const [r1, r2] = await Promise.all([
          fetch(`${base}/stations/search?limit=20&https=true&country=${encodeURIComponent(q)}&order=clickcount&reverse=true`),
          fetch(`${base}/stations/search?limit=10&https=true&countrycode=${encodeURIComponent(q.toUpperCase().slice(0,2))}&order=clickcount&reverse=true`)
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        const seen = new Set();
        stations = [...d1, ...d2].filter(s => { if(seen.has(s.stationuuid)) return false; seen.add(s.stationuuid); return true; }).slice(0, 20);
      } else if(filter === 'tag') {
        const r = await fetch(`${base}/stations/search?limit=20&https=true&tag=${encodeURIComponent(q)}&order=clickcount&reverse=true`);
        stations = await r.json();
      } else {
        // Search name + country simultaneously
        const [r1, r2] = await Promise.all([
          fetch(`${base}/stations/search?limit=15&https=true&name=${encodeURIComponent(q)}&order=clickcount&reverse=true`),
          fetch(`${base}/stations/search?limit=10&https=true&country=${encodeURIComponent(q)}&order=clickcount&reverse=true`)
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        const seen = new Set();
        stations = [...d1, ...d2].filter(s => { if(seen.has(s.stationuuid)) return false; seen.add(s.stationuuid); return true; }).slice(0, 20);
      }
      
      if(!stations || !stations.length) {
        const safeQ = (typeof escHtml === 'function') ? escHtml(q) : String(q).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        results.innerHTML = `<div class="search-empty">No stations found for "<strong>${safeQ}</strong>" — try a different term</div>`;
        return;
      }
      
      results.innerHTML = '';
      stations.forEach(s => {
        if(!s.url_resolved && !s.url) return;
        const url = s.url_resolved || s.url;
        const cc = (s.countrycode || '').toUpperCase();
        const emoji = window.getCountryEmoji ? window.getCountryEmoji(cc) : '📻';
        const tags = (s.tags || '').split(',').slice(0, 2).filter(Boolean).join(' · ') || 'Radio';
        const bitrate = s.bitrate ? `${s.bitrate}kbps` : '';
        
        const el = document.createElement('div');
        el.className = 'search-result-item';
        const srGrad = (typeof stationGradient === 'function') ? stationGradient(s.tags, s.name) : '#374151';
        const srImg = (s.favicon && s.favicon.startsWith('http'))
          ? `<img src="${s.favicon.replace(/"/g,'&quot;')}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:8px" onerror="this.style.display='none'">`
          : `<span style="font-size:1rem;line-height:1">${emoji}</span>`;
        el.innerHTML = `
          <div class="sr-icon" style="background:${srGrad};overflow:hidden">${srImg}</div>
          <div class="sr-body">
            <div class="sr-name">${escHtml ? escHtml(s.name) : s.name}</div>
            <div class="sr-meta">${escHtml ? escHtml(s.country||'Unknown') : (s.country||'Unknown')} · ${tags}${bitrate ? ' · ' + bitrate : ''}</div>
          </div>
          <button class="sr-play-btn" aria-label="Play">▶</button>
        `;
        
        // FIXED: Proper onclick that closes search and plays the station
        el.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          if(window.playStation) {
            window.playStation(url, s.name, s.country || 'Unknown', emoji);
          }
          if(window.closeSearch) window.closeSearch();
          // Show toast confirmation
          showToast(`▶ Playing: ${s.name}`);
        });
        
        results.appendChild(el);
      });
    } catch(err) {
      results.innerHTML = '<div class="search-empty">Signal degraded — try again</div>';
    }
  };
  
  // Patch setSearchFilter to use fixed search
  window.setSearchFilter = function(btn, filter) {
    window.searchFilter = filter;
    document.querySelectorAll('.search-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const q = document.getElementById('search-input')?.value?.trim();
    if(q && q.length > 1) window.doSearchFixed(q);
  };
})();

// ─── LIVE MUSIC FIX: Removed — original lmStartStation in main.js handles
// playback correctly via closure. The previous patch caused silent early-returns
// because window.lmAudio is undefined (const declarations don't populate window). ───

// ─── SHARE BUTTON SYSTEM ───────────────────────────────────────────────────
function initShareSystem() {
  // Add share button to player bar
  const pbRight = document.querySelector('.pb-right');
  if(pbRight && !document.getElementById('pb-share-btn')) {
    const shareBtn = document.createElement('button');
    shareBtn.id = 'pb-share-btn';
    shareBtn.className = 'pb-btn pb-share-btn';
    shareBtn.title = 'Share station';
    shareBtn.setAttribute('aria-label', 'Share station');
    shareBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
    shareBtn.addEventListener('click', shareCurrentStation);
    pbRight.prepend(shareBtn);
  }
}

function shareCurrentStation() {
  const station = window.currentStation;
  if(!station) {
    showToast('Select a station to share');
    return;
  }
  
  const shareData = {
    title: `WNCORE Radio — ${station.name}`,
    text: `Listening to ${station.name} on WNCORE Radio`,
    url: window.location.href
  };
  
  if(navigator.share && /mobile|android|ios/i.test(navigator.userAgent)) {
    navigator.share(shareData).catch(() => fallbackShare(station));
  } else {
    fallbackShare(station);
  }
}

function fallbackShare(station) {
  // Show share modal
  let modal = document.getElementById('share-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.className = 'share-modal-backdrop';
    modal.innerHTML = `
      <div class="share-modal-box">
        <div class="share-modal-title">Share Station</div>
        <div class="share-modal-station" id="share-station-name"></div>
        <div class="share-options">
          <button class="share-option-btn" id="share-copy-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy Link
          </button>
          <a class="share-option-btn share-option-x" id="share-x-btn" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.402 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Post on X
          </a>
          <a class="share-option-btn share-option-reddit" id="share-reddit-btn" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><circle cx="12" cy="12" r="10"/><path fill="white" d="M15.5 13c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm-7 0c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm3.5 2.5c-.83 0-1.5-.45-1.5-1s.67-1 1.5-1 1.5.45 1.5 1-.67 1-1.5 1z"/></svg>
            Reddit
          </a>
        </div>
        <button class="share-modal-close" onclick="document.getElementById('share-modal').classList.remove('open')">×</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });
  }
  
  document.getElementById('share-station-name').textContent = station.name;
  const url = window.location.href;
  const text = `Listening to ${station.name} on WNCORE Radio`;
  
  document.getElementById('share-copy-btn').onclick = () => {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!')).catch(() => showToast('Copy from address bar'));
    modal.classList.remove('open');
  };
  document.getElementById('share-x-btn').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  document.getElementById('share-reddit-btn').href = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
  
  modal.classList.add('open');
}

// ─── TOAST NOTIFICATION SYSTEM ────────────────────────────────────────────
// Duplicate definition removed — showToast(message, type, duration) defined
// at section 25 above is the canonical version. All type-based styling works.

// ─── MOBILE HOME PAGE FIXES ────────────────────────────────────────────────
function fixMobileHome() {
  // Fix hero section overflow on mobile
  const globeSection = document.querySelector('.globe-section');
  if(globeSection && window.innerWidth <= 768) {
    globeSection.style.minHeight = '280px';
  }
  
  // Fix page-wrap padding on mobile
  const pageWrap = document.querySelector('.page-wrap');
  if(pageWrap && window.innerWidth <= 768) {
    pageWrap.style.paddingBottom = '20px';
  }
  
  // Fix featured cards on narrow mobile
  if(window.innerWidth <= 380) {
    document.querySelectorAll('.featured-card').forEach(fc => {
      fc.style.padding = '14px';
    });
  }
  
  // mobile-nav position is fully controlled via CSS (top:0/bottom:0 + padding)
}

// ─── IMPROVED ADMIN PANEL ─────────────────────────────────────────────────
function enhanceAdmin() {
  const adminApp = document.getElementById('admin-app');
  if(!adminApp) return;
  
  // Add stats section to overview
  const overviewSec = document.getElementById('admin-sec-overview');
  if(overviewSec && !overviewSec.querySelector('.admin-stats-grid')) {
    const statsGrid = document.createElement('div');
    statsGrid.className = 'admin-stats-grid';
    statsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px';
    
    const stats = [
      {label:'STATIONS LIVE', value:'12,841', color:'#22c55e'},
      {label:'COUNTRIES', value:'310', color:'#c8472a'},
      {label:'SIGNAL STATUS', value:'ONLINE', color:'#22c55e'},
      {label:'NODE 09', value:'UNKNOWN', color:'rgba(200,71,42,0.5)'},
    ];
    
    statsGrid.innerHTML = stats.map(s => `
      <div style="background:#131109;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px">
        <div style="font-size:0.55rem;color:rgba(232,228,223,0.22);letter-spacing:2px;margin-bottom:8px">${s.label}</div>
        <div style="font-size:1.2rem;font-family:'Syne',sans-serif;font-weight:800;color:${s.color}">${s.value}</div>
      </div>
    `).join('');
    
    overviewSec.appendChild(statsGrid);
  }
}

// ─── KEYBOARD SHORTCUTS DISPLAY ──────────────────────────────────────────
function showKeyboardHelp() {
  // Delegate to the canonical kb-modal (buildKbModal / openKbModal above)
  if (typeof openKbModal === 'function') openKbModal();
}

// Space bar to play/pause
document.addEventListener('keydown', e => {
  if(e.key === ' ' && e.target === document.body) {
    e.preventDefault();
    if(window.togglePlay) window.togglePlay();
  }
  if(e.key === '?' && !e.ctrlKey && !e.metaKey) showKeyboardHelp();
});

// ─── INIT ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initShareSystem, 500);
  setTimeout(fixMobileHome, 300);
  window.addEventListener('resize', fixMobileHome);
  
  // Enhance admin when it's opened
  const adminModal = document.getElementById('admin-panel-modal');
  if(adminModal) {
    const obs = new MutationObserver(() => {
      if(adminModal.classList.contains('show')) enhanceAdmin();
    });
    obs.observe(adminModal, {attributes: true, attributeFilter: ['class']});
  }
  
  // Fix: intercept search input to use improved search
  setTimeout(() => {
    const si = document.getElementById('search-input');
    if(si && !si._patched) {
      si._patched = true;
      // Remove any existing handlers by cloning
      const newSi = si.cloneNode(true);
      si.parentNode.replaceChild(newSi, si);
      newSi.addEventListener('input', function(e) {
        clearTimeout(window._searchDebounce);
        const q = e.target.value.trim();
        if(q.length < 2) {
          document.getElementById('search-results').innerHTML = '<div class="search-empty">Start typing to search 12,000+ stations worldwide</div>';
          return;
        }
        document.getElementById('search-results').innerHTML = '<div class="search-empty">Scanning frequencies...</div>';
        window._searchDebounce = setTimeout(() => window.doSearchFixed(q), 300);
      });
    }
  }, 800);
});


/* ━━━ wncore-upgrades.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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

  // Tell the OS this is a live stream — removes the broken seek bar on desktop
  try {
    navigator.mediaSession.setPositionState({ duration: Infinity, playbackRate: 1, position: 0 });
  } catch(e) {}

  // Intercept action handlers
  try {
    navigator.mediaSession.setActionHandler('play',  () => { audio.play().catch(() => {}); });
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

  // iOS silent primer handled by initIOSSilentPrimer() below (M1)
  // visibilitychange → resume handled by initAutoReconnectOnReturn() (M4)
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


// ─── M1. iOS SILENT AUDIO PRIMER ─────────────────────────────────────────────
// iOS Safari kills the audio context if it was never unlocked by a user gesture
// before screen lock. Fix: on first tap anywhere, play a 0.001s silent buffer
// through the same AudioContext. This "unlocks" it so background play survives
// lock screen. Android doesn't need this but it's harmless there.
(function initIOSSilentPrimer() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isIOS) return;
  if (sessionStorage.getItem('wncore-ios-primed')) return;

  let primed = false;

  function prime() {
    if (primed) return;
    primed = true;
    sessionStorage.setItem('wncore-ios-primed', '1');
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      // Keep context alive — store reference so it doesn't GC
      window._wncIOSCtx = ctx;
    } catch(e) {}
    document.removeEventListener('touchstart', prime, true);
    document.removeEventListener('touchend',   prime, true);
  }

  document.addEventListener('touchstart', prime, { capture: true, passive: true });
  document.addEventListener('touchend',   prime, { capture: true, passive: true });
})();


// ─── M2. AUTO-RETRY ON STALL ─────────────────────────────────────────────────
// On mobile, streams stall far more often than on desktop (cell signal drops,
// app switching, etc). "stalled" event fires → wait 8s → reload src to force
// reconnect. If still stalled after reload, show retry button. Clears itself
// on successful "playing" event so it never interrupts a healthy stream.
(function initStallAutoRetry() {
  const audio = document.getElementById('audio');
  if (!audio) return;

  let _stallTimer   = null;
  let _stallCount   = 0;
  const MAX_AUTO    = 3;     // auto-retry up to 3 times before giving up
  const STALL_WAIT  = 8000;  // ms before first reload attempt

  function clearStallTimer() {
    if (_stallTimer) { clearTimeout(_stallTimer); _stallTimer = null; }
  }

  function attemptReload() {
    const station = window.currentStation;
    if (!station || !station.url) return;
    if (!window.isPlaying) return; // user paused intentionally — don't retry

    _stallCount++;

    if (_stallCount <= MAX_AUTO) {
      // Silent reload — swap src to force reconnect
      if (typeof window.updateStatus === 'function') window.updateStatus('RECONNECTING…');
      const np = document.getElementById('np-track');
      if (np) np.textContent = `— reconnecting (${_stallCount}/${MAX_AUTO}) —`;

      const vol = audio.volume;
      audio.src = station.url;
      audio.volume = vol;
      audio.load();
      audio.play().catch(() => {});
      // Restart ICY metadata poll — pause event fired when src was reassigned, killing it
      if (typeof window._wncStartIcyPoll === 'function') window._wncStartIcyPoll(station.url);

      // Schedule next attempt if still stalled
      _stallTimer = setTimeout(attemptReload, STALL_WAIT + 2000);
    } else {
      // Exhausted auto retries — surface manual retry to user
      _stallCount = 0;
      if (typeof window.updateStatus === 'function') window.updateStatus('STREAM LOST');
      const np   = document.getElementById('np-track');
      const meta = document.getElementById('np-meta');
      if (np) np.textContent = '— signal lost —';
      if (meta && typeof window.playStation === 'function') {
        meta.innerHTML = 'Stream lost &nbsp;<span id="wncore-stall-retry" style="cursor:pointer;color:var(--accent);font-weight:600;border:1px solid var(--accent);border-radius:4px;padding:1px 7px;font-size:0.82em;">&#8635; Retry</span>';
        const btn = document.getElementById('wncore-stall-retry');
        if (btn) btn.addEventListener('click', () => {
          _stallCount = 0;
          window.playStation(station.url, station.name, station.meta, station.emoji);
        }, { once: true });
      }
    }
  }

  audio.addEventListener('stalled', () => {
    if (!window.isPlaying) return;
    clearStallTimer();
    _stallTimer = setTimeout(attemptReload, STALL_WAIT);
  });

  audio.addEventListener('waiting', () => {
    // "waiting" fires constantly during normal buffering — only arm timer
    // if we haven't already started one from a stalled event
    if (!window.isPlaying || _stallTimer) return;
    _stallTimer = setTimeout(attemptReload, STALL_WAIT + 4000);
  });

  // Any successful play clears everything
  audio.addEventListener('playing', () => {
    clearStallTimer();
    _stallCount = 0;
  });

  // User manually changed station — reset
  const origPlay = window.playStation;
  if (typeof origPlay === 'function') {
    window.playStation = function() {
      clearStallTimer();
      _stallCount = 0;
      return origPlay.apply(this, arguments);
    };
  }
})();


// ─── M3. NETWORK-AWARE STREAM QUALITY ────────────────────────────────────────
// Android Chrome exposes navigator.connection.effectiveType ('2g','3g','4g','wifi').
// On slow connections, auto-enable a "Low Bandwidth Mode" that:
//   1. Filters station list to ≤96kbps entries (less buffering, fewer stalls)
//   2. Shows a dismissable banner so the user knows why the list is shorter
//   3. Re-evaluates on connection change events
// iOS doesn't expose this API — gracefully skipped.
(function initNetworkAwareQuality() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return; // iOS / unsupported — skip silently

  const LOW_BW_TYPES  = new Set(['slow-2g', '2g', '3g']);
  const MAX_BITRATE   = 96; // kbps threshold for low-bandwidth mode
  const STORAGE_KEY   = 'wncore-lowbw-dismissed';

  let lowBwActive = false;
  let bannerEl    = null;

  // ── Banner ──────────────────────────────────────────────────────────────────
  function showLowBwBanner() {
    if (bannerEl || sessionStorage.getItem(STORAGE_KEY)) return;

    const s = document.createElement('style');
    s.textContent = `
      #wnc-lowbw-banner {
        position: fixed; bottom: calc(var(--player-h, 76px) + 56px + 10px); left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #1a1a1c; border: 1px solid var(--accent, #c8472a);
        color: #e0ddd8; border-radius: 8px; padding: 10px 14px;
        display: flex; align-items: center; gap: 10px;
        font-size: 0.73rem; font-family: inherit; z-index: 9999;
        max-width: calc(100vw - 32px); box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        opacity: 0; transition: opacity 0.3s, transform 0.3s; pointer-events: none;
      }
      #wnc-lowbw-banner.show {
        opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: all;
      }
      #wnc-lowbw-icon { font-size: 1.1rem; flex-shrink: 0; }
      #wnc-lowbw-text strong { display: block; color: #fff; margin-bottom: 2px; }
      #wnc-lowbw-close {
        background: none; border: none; color: #888; cursor: pointer;
        font-size: 1rem; padding: 2px 4px; flex-shrink: 0; line-height: 1;
      }
    `;
    document.head.appendChild(s);

    bannerEl = document.createElement('div');
    bannerEl.id = 'wnc-lowbw-banner';
    bannerEl.innerHTML = `
      <span id="wnc-lowbw-icon">📶</span>
      <div id="wnc-lowbw-text">
        <strong>Low Bandwidth Mode</strong>
        Showing stations ≤${MAX_BITRATE}kbps to reduce buffering.
      </div>
      <button id="wnc-lowbw-close" aria-label="Dismiss">✕</button>`;
    document.body.appendChild(bannerEl);
    requestAnimationFrame(() => bannerEl.classList.add('show'));

    document.getElementById('wnc-lowbw-close').onclick = () => {
      bannerEl.classList.remove('show');
      sessionStorage.setItem(STORAGE_KEY, '1');
      setTimeout(() => { if (bannerEl) { bannerEl.remove(); bannerEl = null; } }, 400);
    };
    setTimeout(() => {
      if (bannerEl) { bannerEl.classList.remove('show'); setTimeout(() => { if (bannerEl) { bannerEl.remove(); bannerEl = null; } }, 400); }
    }, 9000);
  }

  function hideLowBwBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('show');
    setTimeout(() => { if (bannerEl) { bannerEl.remove(); bannerEl = null; } }, 400);
  }

  // ── Station table filter ─────────────────────────────────────────────────────
  function applyLowBwFilter() {
    // Patch the rendered station rows — hide rows whose bitrate exceeds threshold
    document.querySelectorAll('.station-row[data-bitrate]').forEach(row => {
      const br = parseInt(row.dataset.bitrate) || 0;
      row.style.display = (br > 0 && br > MAX_BITRATE) ? 'none' : '';
    });
    // Also patch future renders via a global flag playStation picks up
    window._wncLowBwMode = true;
  }

  function removeLowBwFilter() {
    document.querySelectorAll('.station-row[data-bitrate]').forEach(row => {
      row.style.display = '';
    });
    window._wncLowBwMode = false;
  }

  // ── Evaluate ─────────────────────────────────────────────────────────────────
  function evaluate() {
    const type = conn.effectiveType || '';
    const isLow = LOW_BW_TYPES.has(type);

    if (isLow && !lowBwActive) {
      lowBwActive = true;
      applyLowBwFilter();
      showLowBwBanner();
    } else if (!isLow && lowBwActive) {
      lowBwActive = false;
      removeLowBwFilter();
      hideLowBwBanner();
      showToast('Connection improved — all stations available', 'success');
    }
  }

  conn.addEventListener('change', evaluate);
  // Initial check after DOM settles
  setTimeout(evaluate, 1500);
})();


// ─── M4. AUTO-RECONNECT ON RETURN ────────────────────────────────────────────
// When a mobile user comes back to the tab/app after a long absence (e.g. phone
// was in pocket, OS killed the stream), silently attempt to resume the last
// station. Only fires if: (a) audio is paused, (b) a station was playing before
// the user left, (c) at least 60s have elapsed since they left.
// Shows a non-intrusive toast — never autoplays without prior user intent.
(function initAutoReconnectOnReturn() {
  const audio = document.getElementById('audio');
  if (!audio) return;

  let _hiddenAt      = null;   // timestamp when tab went hidden
  let _wasPlaying    = false;  // were we playing when we left?
  const MIN_AWAY_MS  = 60000;  // 60s minimum absence before attempting reconnect

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      _hiddenAt   = Date.now();
      _wasPlaying = window.isPlaying && !!window.currentStation;
    } else {
      // Tab became visible again
      if (!_wasPlaying || !_hiddenAt) return;
      const awayMs = Date.now() - _hiddenAt;
      _hiddenAt = null;

      if (awayMs < MIN_AWAY_MS) return; // short switch — stream likely still alive

      // Check if audio actually died
      const station = window.currentStation;
      if (!station || !station.url) return;

      // Give browser 1.5s to self-recover before we intervene
      setTimeout(() => {
        if (!audio.paused || !_wasPlaying) return; // recovered on its own
        _wasPlaying = false;

        // Silent reconnect attempt
        if (typeof window.updateStatus === 'function') window.updateStatus('RECONNECTING…');
        const vol = audio.volume;
        audio.src = station.url;
        audio.volume = vol;
        audio.load();
        audio.play().then(() => {
          if (typeof showToast === 'function') showToast('▶ Stream resumed', 'success');
        }).catch(() => {
          // Autoplay blocked (iOS) — show manual prompt instead
          if (typeof showToast === 'function') showToast('Tap ▶ to resume stream', 'info', 5000);
          if (typeof window.updateStatus === 'function') window.updateStatus('TAP TO PLAY');
        });
      }, 1500);
    }
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
    bottom: 100px;
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

  /* ── Mobile chat: btn sits above the mobile bottom nav + player bar stack.
        Panel is a bottom sheet anchored on top of the nav bar. ── */
  @media (max-width: 768px) {
    #wnc-chat-btn {
      /* player bar + 56px mobile nav + 10px clearance */
      bottom: calc(var(--player-h, 68px) + 56px + 10px);
      right: 12px;
      width: 42px;
      height: 42px;
      z-index: 482; /* above mobile nav (481), below player bar (500) */
    }
    #wnc-chat-panel {
      position: fixed;
      left: 0;
      right: 0;
      /* Sit on top of mobile nav bar (which itself sits on player bar) */
      bottom: calc(var(--player-h, 68px) + 56px);
      top: auto;
      width: 100%;
      max-width: 100%;
      /* Cap at ~50% screen so header stays visible */
      height: min(50dvh, 380px);
      border-radius: 14px 14px 0 0;
      border-left: none;
      border-right: none;
      border-bottom: none;
      transform: translateY(100%);
      opacity: 1;
      z-index: 482;
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
    if (history.length > 40) history = history.slice(-40); // prevent unbounded growth

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

// ─── DESKTOP STATION NOTIFICATIONS ───────────────────────────────────────────
// Silent OS notification when station changes — desktop only, opt-in.
// Permission requested once after first play. Never shown on mobile (they have
// lock screen controls). Never nagged — if denied, permanently skipped.
(function() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile || !('Notification' in window)) return;

  let _permitted = Notification.permission === 'granted';
  let _asked     = Notification.permission !== 'default'; // already decided
  let _activeNote = null;

  // Ask once, quietly, after first play interaction
  function maybeAsk() {
    if (_asked) return;
    _asked = true;
    Notification.requestPermission().then(p => { _permitted = p === 'granted'; });
  }
  document.addEventListener('wncore-station-changed', maybeAsk, { once: true });

  window._wncNotifyStation = function(name, meta, emoji) {
    if (!_permitted) return;
    if (document.visibilityState === 'visible') return; // tab is focused — no need
    if (_activeNote) { try { _activeNote.close(); } catch(e) {} }
    try {
      _activeNote = new Notification('Now playing', {
        body: (emoji || '📻') + ' ' + (name || 'Unknown station') + (meta ? '\n' + meta : ''),
        icon: '/images/wncore-art-192.png',
        silent: true,
        tag:  'wncore-now-playing',
      });
      _activeNote.onclick = () => { window.focus(); _activeNote.close(); };
    } catch(e) {}
  };
})();


/* ━━━ v5-fixes.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
      ['pb-eq', 'pb-fill', 'np-fill'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('playing');
      });
      // If LM was active, trigger its retry logic so it advances to the next stream
      // rather than leaving the top card stuck on 'Stream unavailable'
      if (typeof lmIsPlaying !== 'undefined' && lmIsPlaying && typeof lmCurrentChannel !== 'undefined' && lmCurrentChannel) {
        lmIsPlaying = false;
        _lmRetries = (_lmRetries || 0) + 1;
        const titleEl = document.getElementById('lm-np-title');
        if (_lmRetries < Math.min(5, lmCurrentChannel.stations.length)) {
          lmCurrentStationIdx = (lmCurrentStationIdx + 1) % lmCurrentChannel.stations.length;
          if (titleEl) titleEl.textContent = 'Trying next stream…';
          setTimeout(lmStartStation, 300);
        } else {
          _lmRetries = 0;
          lmSetWaveformState(false);
          if (titleEl) titleEl.textContent = 'Stream unavailable — try another channel';
        }
      }
      // Show retry affordance if we have a last-played station
      if (meta) {
        const station = window.currentStation;
        if (station && typeof window.playStation === 'function') {
          meta.innerHTML = 'Stream unavailable &nbsp;<span id="wncore-retry-btn" style="cursor:pointer;color:var(--accent);font-weight:600;border:1px solid var(--accent);border-radius:4px;padding:1px 7px;font-size:0.82em;">&#8635; Retry</span>';
          const btn = document.getElementById('wncore-retry-btn');
          if (btn) btn.addEventListener('click', () => {
            window.playStation(station.url, station.name, station.meta, station.emoji);
          });
        } else {
          meta.textContent = 'Select the station again to reconnect';
        }
      }
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
/* ━━━ p5-transitions.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* ═══════════════════════════════════════════════════════════════════════
   WNCORE — PERSONA 5 TRANSITION ENGINE  v2
   File: p5-transitions.js
   Must load last — after main.js, improvements.js, all patches
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. BUILD WIPE OVERLAY ─────────────────────────────────────────── */
  function buildWipe() {
    if (document.getElementById('p5-wipe')) return;
    var wipe = document.createElement('div');
    wipe.id = 'p5-wipe';
    wipe.innerHTML = '<div id="p5-wipe-a"></div><div id="p5-wipe-b"></div>';
    document.body.appendChild(wipe);
  }

  /* ── 2. WIPE SEQUENCE ──────────────────────────────────────────────── */
  var _wiping = false;

  function runWipe(swapFn) {
    if (_wiping) {
      swapFn();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    /* Skip the wipe entirely in minimal mode */
    if (document.body.classList.contains('minimal-mode')) {
      swapFn();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    var wipe = document.getElementById('p5-wipe');
    if (!wipe) {
      swapFn();
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    _wiping = true;

    /* Reset panels to off-screen left instantly */
    wipe.classList.remove('in', 'out');
    var a = document.getElementById('p5-wipe-a');
    var b = document.getElementById('p5-wipe-b');
    if (a) { a.style.transition = 'none'; a.style.transform = 'translateX(-115%)'; }
    if (b) { b.style.transition = 'none'; b.style.transform = 'translateX(-115%)'; }

    void wipe.offsetWidth; /* force reflow */

    if (a) a.style.cssText = '';
    if (b) b.style.cssText = '';

    /* Phase A: sweep IN */
    wipe.classList.add('in');

    setTimeout(function () {
      /* Phase B: swap page + scroll reset */
      swapFn();
      window.scrollTo({ top: 0, behavior: 'instant' });

      /* Trigger enter animation on incoming page */
      requestAnimationFrame(function () {
        var activePage = document.querySelector('.page.active');
        if (activePage) {
          activePage.classList.remove('p5-enter');
          void activePage.offsetWidth;
          activePage.classList.add('p5-enter');
          activePage.addEventListener('animationend', function handler() {
            activePage.classList.remove('p5-enter');
            activePage.removeEventListener('animationend', handler);
          });
        }
      });

      /* Phase C: sweep OUT after brief hold */
      setTimeout(function () {
        wipe.classList.remove('in');
        void wipe.offsetWidth;
        wipe.classList.add('out');

        setTimeout(function () {
          wipe.classList.remove('out');
          _wiping = false;
        }, 300);
      }, 80);

    }, 350);
  }

  /* ── 3. PATCH showPage ─────────────────────────────────────────────── */
  function installP5Patch() {
    if (typeof window.showPage !== 'function') return;
    if (window.showPage._p5Patched) return;

    var prevShowPage = window.showPage;

    window.showPage = function p5ShowPage(id, linkEl) {
      var nextPage = document.getElementById('page-' + id);
      var currPage = document.querySelector('.page.active');

      if (!nextPage || (currPage && currPage === nextPage)) {
        prevShowPage(id, linkEl);
        return;
      }

      runWipe(function () {
        prevShowPage(id, linkEl);
      });
    };

    window.showPage._p5Patched = true;
  }

  /* ── 4. GENRE PILL STAMP ───────────────────────────────────────────── */
  function initGenreStamps() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.genre-btn');
      if (!btn) return;
      btn.classList.remove('p5-stamp');
      void btn.offsetWidth;
      btn.classList.add('p5-stamp');
      btn.addEventListener('animationend', function h() {
        btn.classList.remove('p5-stamp');
        btn.removeEventListener('animationend', h);
      });
    });
  }

  /* ── 5. MOBILE BOTTOM NAV TAP ──────────────────────────────────────── */
  function initMbnTaps() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.mbn-btn');
      if (!btn) return;
      btn.classList.remove('p5-tap');
      void btn.offsetWidth;
      btn.classList.add('p5-tap');
      btn.addEventListener('animationend', function h() {
        btn.classList.remove('p5-tap');
        btn.removeEventListener('animationend', h);
      });
    });
  }

  /* ── 6. REMOVE LEGACY TRANSITION STYLE ────────────────────────────── */
  /* Must run inside the same setTimeout(0) as installP5Patch so that
     bootV2() in improvements.js (which also runs at DOMContentLoaded)
     has already injected and we can reliably remove it. */
  function removeLegacyStyle() {
    var el = document.getElementById('pt-style');
    if (el) el.remove();
  }

  /* ── 7. BOOT ───────────────────────────────────────────────────────── */
  function boot() {
    buildWipe();
    initGenreStamps();
    initMbnTaps();

    /* Defer patch + style removal so all other deferred scripts
       (improvements.js bootV2, patchShowPage, etc.) have run first */
    setTimeout(function () {
      removeLegacyStyle();
      installP5Patch();
    }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();

/* ━━━ wncore-constellation.js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* ═══════════════════════════════════════════════════════════════════════
   WNCORE — INTERACTIVE CONSTELLATION (Mobile Hero) — v2
   File: wncore-constellation.js
   Replaces the original. Drop-in swap.

   Changes vs v1:
   - Canvas now spans FULL viewport width (not just .globe-section width)
   - Stars spread much wider — 1.5× zone padding beyond section bounds
   - Star count scaled more generously, better distributed
   - Connection distance increased for a more open, airy mesh
   - RAF throttled to 30fps on low-end devices (≤4 CPUs or battery < 20%)
   - Connections rebuilt less often (every 180 frames, not 90)
   - Pauses RAF when tab is hidden (saves battery, prevents stutter)
   - Touch radius widened to 80px for easier interaction
   - Labels slightly bigger and better readable
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  function isMobile() {
    return window.innerWidth <= 900;
  }

  // ── Low-end device detection ──────────────────────────────────────────
  var isLowEnd = (navigator.hardwareConcurrency || 4) <= 4;
  if (navigator.getBattery) {
    navigator.getBattery().then(function(bat) {
      if (!bat.charging && bat.level < 0.2) isLowEnd = true;
    }).catch(function() {});
  }

  var STATION_LABELS = [
    'TOKYO FM', 'BBC R4', 'NPR', 'FRANCE INTER',
    'RAI UNO', 'ABC RN', 'DW', 'KEXP',
    'NHK', 'CBC R2', 'RFI', 'SWR3',
    'WNCORE', 'NTS', 'FIP', 'SOMA FM',
  ];

  var canvas, ctx;
  var stars = [], conns = [], pulses = [], ripples = [];
  var W = 0, H = 0;
  var raf = null;
  var touchX = -1, touchY = -1;
  var frame = 0;
  var paused = false;

  // ── Target frame interval ─────────────────────────────────────────────
  // 30fps on low-end, 60fps on high-end
  var FRAME_INTERVAL = isLowEnd ? 33 : 16;
  var lastFrameTime  = 0;

  /* ── STAR ──────────────────────────────────────────────────────────── */
  function Star(index) {
    this.reset(index);
  }

  Star.prototype.reset = function(index) {
    // Spread across a wider zone than the canvas — stars can be off-edge
    // and wrap, giving the open/airy constellation feel
    this.x = (Math.random() - 0.1) * (W * 1.2);
    this.y = Math.random() * H;
    this.r = 0.5 + Math.random() * 1.8;
    this.brightness  = 0.25 + Math.random() * 0.75;
    this.twinkleSpeed  = 0.006 + Math.random() * 0.014;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 0.05;
    this.vy = 0.035 + Math.random() * 0.055;
    this.label  = (index !== undefined && index < STATION_LABELS.length) ? STATION_LABELS[index] : null;
    this.active = false;

    if (this.label) {
      this.r = 2 + Math.random() * 1.0;
      this.brightness = 0.75 + Math.random() * 0.25;
    }
  };

  Star.prototype.respawn = function() {
    this.x = (Math.random() - 0.1) * (W * 1.2);
    this.y = -6;
    this.r = 0.5 + Math.random() * 1.5;
    this.brightness  = 0.2 + Math.random() * 0.6;
    this.twinkleSpeed  = 0.006 + Math.random() * 0.014;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 0.05;
    this.vy = 0.035 + Math.random() * 0.055;
    this.label  = null;
    this.active = false;
  };

  Star.prototype.update = function() {
    this.x += this.vx;
    this.y += this.vy * 0.14;
    // Wrap X with wide margin
    if (this.x < -W * 0.15) this.x = W * 1.15;
    if (this.x > W * 1.15)  this.x = -W * 0.15;
    if (this.y > H + 8 && !this.label) this.respawn();
  };

  Star.prototype.draw = function() {
    var tw    = Math.sin(frame * this.twinkleSpeed + this.twinkleOffset);
    var alpha = this.brightness * (0.6 + tw * 0.4);
    if (this.active) alpha = 1;

    // Only draw stars within visible + slight margin
    if (this.x < -20 || this.x > W + 20) return;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.active
      ? 'rgba(200,71,42,' + alpha + ')'
      : 'rgba(220,230,255,' + alpha + ')';
    ctx.fill();

    // Glow — skip on low-end for small stars
    if (this.r > 1.2 || this.active) {
      if (isLowEnd && this.r < 1.5 && !this.active) {
        // skip glow on tiny low-end stars
      } else {
        var glowR = this.r * (this.active ? 5.5 : 3.8);
        var grad  = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
        var rgb   = this.active ? '200,71,42' : '140,165,255';
        grad.addColorStop(0, 'rgba(' + rgb + ',' + (alpha * 0.45) + ')');
        grad.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    // Label
    if (this.label && this.r > 1.4) {
      ctx.font = '500 9px "DM Mono", monospace';
      ctx.fillStyle = 'rgba(200,71,42,' + (alpha * 0.85) + ')';
      ctx.fillText(this.label, this.x + this.r + 4, this.y + 3.5);
    }
  };

  /* ── CONNECTIONS ───────────────────────────────────────────────────── */
  function buildConnections() {
    conns = [];
    // Wider connection distance for open airy mesh
    var MAX_DIST = Math.min(W, H) * 0.32;
    // Cap total connections on low-end
    var MAX_CONNS = isLowEnd ? 120 : 300;

    for (var i = 0; i < stars.length; i++) {
      if (conns.length >= MAX_CONNS) break;
      for (var j = i + 1; j < stars.length; j++) {
        if (conns.length >= MAX_CONNS) break;
        var dx = stars[i].x - stars[j].x;
        var dy = stars[i].y - stars[j].y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          conns.push({ a: i, b: j, maxDist: MAX_DIST });
        }
      }
    }
  }

  function drawConnections() {
    for (var k = 0; k < conns.length; k++) {
      var c  = conns[k];
      var sa = stars[c.a], sb = stars[c.b];
      // Skip if either star is off-screen
      if ((sa.x < -20 || sa.x > W + 20) && (sb.x < -20 || sb.x > W + 20)) continue;

      var dx = sa.x - sb.x, dy = sa.y - sb.y;
      var d  = Math.sqrt(dx * dx + dy * dy);
      if (d >= c.maxDist) continue;

      var alpha   = (1 - d / c.maxDist) * 0.14;
      var boosted = sa.active || sb.active;
      if (boosted) alpha = 0.55;

      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.strokeStyle = boosted
        ? 'rgba(200,71,42,' + alpha + ')'
        : 'rgba(100,130,200,' + alpha + ')';
      ctx.lineWidth = boosted ? 0.9 : 0.45;
      ctx.stroke();
    }
  }

  /* ── RIPPLE ─────────────────────────────────────────────────────────── */
  function Ripple(x, y) {
    this.x = x; this.y = y;
    this.r = 4; this.alpha = 0.75; this.done = false;
  }
  Ripple.prototype.update = function() {
    this.r     += 2.5;
    this.alpha -= 0.028;
    if (this.alpha <= 0 || this.r >= 56) this.done = true;
  };
  Ripple.prototype.draw = function() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,71,42,' + this.alpha + ')';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  };

  /* ── PULSE ──────────────────────────────────────────────────────────── */
  function Pulse(connIndex) {
    this.ci    = connIndex;
    this.t     = 0;
    this.speed = 0.01 + Math.random() * 0.007;
    this.done  = false;
  }
  Pulse.prototype.update = function() {
    this.t += this.speed;
    if (this.t >= 1) this.done = true;
  };
  Pulse.prototype.draw = function() {
    var c = conns[this.ci];
    if (!c) { this.done = true; return; }
    var sa = stars[c.a], sb = stars[c.b];
    var x  = sa.x + (sb.x - sa.x) * this.t;
    var y  = sa.y + (sb.y - sa.y) * this.t;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,71,42,0.9)';
    ctx.fill();
  };

  /* ── MAIN LOOP ──────────────────────────────────────────────────────── */
  function loop(ts) {
    if (!ctx || paused || document.hidden) {
      raf = requestAnimationFrame(loop);
      return;
    }

    // Throttle to target frame rate
    if (ts - lastFrameTime < FRAME_INTERVAL) {
      raf = requestAnimationFrame(loop);
      return;
    }
    lastFrameTime = ts;
    frame++;

    ctx.clearRect(0, 0, W, H);

    // Touch activation — wider 80px radius for easier interaction
    for (var i = 0; i < stars.length; i++) {
      if (touchX >= 0) {
        var dx = stars[i].x - touchX, dy = stars[i].y - touchY;
        stars[i].active = (dx * dx + dy * dy) < 6400; // 80px
      } else {
        stars[i].active = false;
      }
    }

    // Rebuild connections less often — every 180 frames (~3s at 60fps, ~6s at 30fps)
    if (frame % 180 === 0) buildConnections();

    drawConnections();

    // Pulses
    for (var p = pulses.length - 1; p >= 0; p--) {
      pulses[p].update();
      pulses[p].draw();
      if (pulses[p].done) pulses.splice(p, 1);
    }

    // Stars
    for (var j = 0; j < stars.length; j++) {
      stars[j].update();
      stars[j].draw();
    }

    // Ripples
    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].update();
      ripples[r].draw();
      if (ripples[r].done) ripples.splice(r, 1);
    }

    // Auto pulse every ~4s (240 frames at 60fps)
    if (frame % 240 === 0 && conns.length > 0) {
      pulses.push(new Pulse(Math.floor(Math.random() * conns.length)));
    }

    raf = requestAnimationFrame(loop);
  }

  /* ── RESIZE ─────────────────────────────────────────────────────────── */
  function resize() {
    // Use full viewport width for a wider, more open feel
    W = window.innerWidth;
    var section = document.querySelector('.globe-section');
    // Guard: section might have offsetHeight=0 if page was just made visible
    // Use a minimum of 300 and retry once after a frame if 0
    H = section ? Math.max(section.offsetHeight, 300) : 300;

    // Cap DPR to 1 on low-end, 2 max otherwise
    var dpr = isLowEnd ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Make canvas full-width regardless of section padding
    canvas.style.position = 'absolute';
    canvas.style.left     = '0';
    canvas.style.top      = '0';
  }

  // Expose so showPage('home') can re-trigger resize+redraw after page becomes visible
  window._constellationResize = function() {
    if (!canvas || !ctx) { init(); return; }
    resize();
    buildConnections();
    if (!raf) raf = requestAnimationFrame(loop);
  };

  /* ── TOUCH ──────────────────────────────────────────────────────────── */
  function onTouch(e) {
    if (!e.touches || e.touches.length === 0) return;
    var rect = canvas.getBoundingClientRect();
    var t    = e.touches[0];
    touchX   = t.clientX - rect.left;
    touchY   = t.clientY - rect.top;

    if (e.type === 'touchstart') {
      ripples.push(new Ripple(touchX, touchY));

      var nearest = 0, nearDist = Infinity;
      for (var i = 0; i < stars.length; i++) {
        var dx = stars[i].x - touchX, dy = stars[i].y - touchY;
        var d  = dx * dx + dy * dy;
        if (d < nearDist) { nearDist = d; nearest = i; }
      }
      for (var k = 0; k < conns.length; k++) {
        if ((conns[k].a === nearest || conns[k].b === nearest) && Math.random() < 0.45) {
          pulses.push(new Pulse(k));
        }
      }
    }
  }

  function onTouchEnd() {
    setTimeout(function() { touchX = -1; touchY = -1; }, 450);
  }

  /* ── VISIBILITY ─────────────────────────────────────────────────────── */
  document.addEventListener('visibilitychange', function() {
    paused = document.hidden;
  });

  /* ── INIT ───────────────────────────────────────────────────────────── */
  function init() {
    if (!isMobile()) return;

    var section = document.querySelector('.globe-section');
    if (!section) return;
    if (document.getElementById('wnc-constellation')) return;

    canvas = document.createElement('canvas');
    canvas.id = 'wnc-constellation';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.pointerEvents = 'auto'; // allow touch
    canvas.style.zIndex = '1';

    // Ensure the section has position:relative so our absolute canvas works
    var secPos = getComputedStyle(section).position;
    if (secPos === 'static') section.style.position = 'relative';
    section.style.overflow = 'hidden'; // clip the wide canvas to section bounds

    section.insertBefore(canvas, section.firstChild);

    // Hide globe container
    function hideGlobeContainer() {
      var gc = document.getElementById('globe-container');
      if (gc) {
        gc.style.cssText = 'display:none!important;width:0;height:0;visibility:hidden;position:absolute;z-index:-1;pointer-events:none;';
      }
    }
    hideGlobeContainer();
    document.addEventListener('globe-ready', hideGlobeContainer);

    ctx = canvas.getContext('2d');

    resize();

    // More stars, better distributed — scaled to viewport area
    // Wide canvas means more area to fill, so we use a slightly lower density
    var COUNT = isLowEnd
      ? Math.max(35, Math.min(Math.floor((W * H) / 6000), 55))
      : Math.max(55, Math.min(Math.floor((W * H) / 4000), 100));

    stars = [];
    for (var i = 0; i < COUNT; i++) {
      stars.push(new Star(i));
    }

    buildConnections();
    raf = requestAnimationFrame(loop);

    canvas.addEventListener('touchstart', onTouch, { passive: true });
    canvas.addEventListener('touchmove',  onTouch, { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd, { passive: true });

    var _resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(function() {
        // Task 1.3: Always resize the canvas on any dimension change (including
        // orientation switches). The old else-branch was cancelling the RAF and
        // hiding the canvas when isMobile() returned false on landscape — that
        // caused the blank-canvas-on-rotate bug. Now we always resize + respawn.
        resize();
        for (var i = 0; i < stars.length; i++) {
          if (stars[i].x > W * 1.15 || stars[i].y > H + 20) {
            stars[i].respawn();
          }
        }
        buildConnections();
        // Restart animation loop if it was halted
        if (!raf) raf = requestAnimationFrame(loop);
      }, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      // Retry resize after CSS layout settles (fixes height:0 on first paint)
      setTimeout(function() {
        if (typeof window._constellationResize === 'function') window._constellationResize();
      }, 400);
    });
  } else {
    init();
    setTimeout(function() {
      if (typeof window._constellationResize === 'function') window._constellationResize();
    }, 400);
  }

})();



/* ━━━ WNCORE — CLEAN PLAY FIX ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* Single, simple replacement for the old chain of wrappers.
   Installs after DOMContentLoaded, wraps the base playStation once.
   - Stops the old stream cleanly before loading new src (prevents AbortError cascade)
   - Debounces rapid clicks (300ms)
   - Defers all DOM side-effects via setTimeout(0) so browser can paint first
   - No retry loops
*/
(function installCleanPlayHook() {
  'use strict';

  var _last = 0;
  var _base = null;

  function install() {
    if (typeof window.playStation !== 'function') {
      setTimeout(install, 100);
      return;
    }
    if (window.playStation._cleanHook) return;
    _base = window.playStation;

    window.playStation = function cleanPlay(url, name, meta, emoji) {
      // Debounce: ignore clicks within 300ms of the last
      var now = Date.now();
      if (now - _last < 300) return;
      _last = now;

      // Stop existing stream cleanly to prevent AbortError cascade
      var au = document.getElementById('audio');
      if (au) { try { au.pause(); } catch(e) {} au.src = ''; }

      // Call the base function
      _base(url, name, meta, emoji);

      // Defer all side-effects so the browser can paint click feedback first
      setTimeout(function() {
        var station = { url: url, name: name, meta: meta, emoji: emoji || '📻' };
        window._currentStationData = station;
        if (typeof historyPush         === 'function') try { historyPush(station); }          catch(e) {}
        if (typeof statsOnPlay         === 'function') try { statsOnPlay(); }                 catch(e) {}
        if (typeof showBitrateInPlayer === 'function') try { showBitrateInPlayer(station); }  catch(e) {}
        if (typeof updateFavButton     === 'function') try { updateFavButton(); }             catch(e) {}
        if (typeof updateMbnDot        === 'function') try { updateMbnDot(); }                catch(e) {}
        if (typeof updateMiniWidget    === 'function') try { updateMiniWidget(name, meta, emoji); } catch(e) {} // stub — wncore-player.js listens to wncore-station-change event below
        if (typeof scrobblePush        === 'function') try { scrobblePush(station); }         catch(e) {}
        // D2: silent OS notification — desktop only, opt-in, never nags
        try { _wncNotifyStation(name, meta, emoji); } catch(e) {}
        var _au = document.getElementById('audio');
        if (typeof startWaveformDraw   === 'function' && _au) try { startWaveformDraw(_au); } catch(e) {}
        try { document.dispatchEvent(new CustomEvent('wncore-station-changed', { detail: { name: name, url: url } })); } catch(e) {}
        var miniName = document.getElementById('mini-name');
        if (miniName) miniName.textContent = name || '— receiving —';
        if (typeof updateSession === 'function') try { updateSession(name, meta); } catch(e) {}
      }, 0);
    };

    window.playStation._cleanHook = true;
    window.playRec = function(url, name, meta) { window.playStation(url, name, meta, '📻'); };
    console.log('%c[WNCORE] Clean play hook installed', 'color:#c8472a;font-family:monospace;font-size:11px');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();

/* ━━━ QUICK WINS PATCH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function quickWins() {
  'use strict';

  // ── 1. MUTE TOGGLE ────────────────────────────────────────────────────
  var _preMuteVol = 0.8;
  var _muted = false;

  window.toggleMute = function() {
    var au = document.getElementById('audio');
    var slider = document.getElementById('vol-slider');
    var wave = document.getElementById('pb-vol-wave');
    var btn = document.getElementById('pb-mute-btn');
    if (!au) return;

    _muted = !_muted;
    if (_muted) {
      _preMuteVol = parseFloat(slider ? slider.value : au.volume) || 0.8;
      au.volume = 0;
      if (slider) slider.value = 0;
      // Replace wave path with muted X lines
      if (wave) wave.setAttribute('d', 'M23 9l-6 6M17 9l6 6');
      if (btn) btn.style.opacity = '0.35';
    } else {
      au.volume = _preMuteVol;
      if (slider) slider.value = _preMuteVol;
      if (wave) wave.setAttribute('d', 'M15.54 8.46a5 5 0 010 7.07');
      if (btn) btn.style.opacity = '0.7';
    }
  };

  // M key = mute
  document.addEventListener('keydown', function(e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'm' || e.key === 'M') window.toggleMute();
  });


  // ── 2. STREAM ERROR: show retry button in player bar ──────────────────
  (function wireStreamError() {
    function getAudio() { return document.getElementById('audio'); }

    function showRetry() {
      var nameEl = document.getElementById('pb-name');
      if (!nameEl || nameEl.dataset.retryWired) return;
      nameEl.dataset.retryWired = '1';
      // Insert a small inline retry span after the status text
      var btn = document.createElement('span');
      btn.id = 'pb-retry-btn';
      btn.textContent = ' ↺ Retry';
      btn.style.cssText = 'cursor:pointer;color:var(--accent,#c8472a);font-size:0.75em;margin-left:6px;';
      btn.title = 'Retry stream';
      btn.onclick = function() {
        var cs = window.currentStation;
        if (cs && typeof window.playStation === 'function') {
          btn.remove();
          delete nameEl.dataset.retryWired;
          window.playStation(cs.url, cs.name, cs.meta, cs.emoji);
        }
      };
      nameEl.parentNode.appendChild(btn);
    }

    function removeRetry() {
      var btn = document.getElementById('pb-retry-btn');
      if (btn) btn.remove();
      var nameEl = document.getElementById('pb-name');
      if (nameEl) delete nameEl.dataset.retryWired;
    }

    function wireAudio() {
      var au = getAudio();
      if (!au) { setTimeout(wireAudio, 300); return; }
      au.addEventListener('error', function() {
        if (window.currentStation) showRetry();
      });
      au.addEventListener('playing', removeRetry);
      au.addEventListener('waiting', removeRetry);
    }
    wireAudio();
  })();


  // ── 3. SEARCH HISTORY — show recent + genre suggestions ───────────────
  (function wireSearchHistory() {
    var SEARCH_HIST_KEY = 'wncore-searches-v1';
    var SEARCH_HIST_MAX = 8;

    function loadSearchHist() {
      try { return JSON.parse(localStorage.getItem(SEARCH_HIST_KEY) || '[]'); } catch { return []; }
    }
    function saveSearchHist(term) {
      if (!term || term.length < 2) return;
      var h = loadSearchHist().filter(function(t) { return t !== term; });
      h.unshift(term);
      try { localStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(h.slice(0, SEARCH_HIST_MAX))); } catch {}
    }

    var GENRE_SUGGESTIONS = ['jazz', 'classical', 'hip-hop', 'rock', 'ambient', 'news', 'electronic', 'country', 'lofi', 'anime', 'reggae', 'metal'];

    function renderSearchSuggestions() {
      var modal = document.getElementById('search-modal');
      var input = document.getElementById('search-input');
      if (!modal || !input || input.value.trim()) {
        var el = document.getElementById('wnc-search-suggestions');
        if (el) el.style.display = 'none';
        return;
      }
      var container = document.getElementById('wnc-search-suggestions');
      if (!container) {
        container = document.createElement('div');
        container.id = 'wnc-search-suggestions';
        container.style.cssText = 'padding:0 0 10px;';
        input.parentNode.insertBefore(container, input.nextSibling);
      }
      container.style.display = '';
      var hist = loadSearchHist();
      var html = '';
      if (hist.length) {
        html += '<div style="font-size:0.62rem;letter-spacing:2px;color:var(--text3);padding:10px 0 6px;text-transform:uppercase">Recent</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">';
        hist.forEach(function(t) {
          html += '<span onclick="document.getElementById(\'search-input\').value=\'' + t.replace(/'/g, '') + '\';if(typeof doSearch===\'function\')doSearch(\'' + t.replace(/'/g, '') + '\')" style="cursor:pointer;font-size:0.72rem;padding:4px 10px;border:1px solid var(--border);border-radius:20px;color:var(--text2);transition:background 0.15s" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'">↺ ' + t + '</span>';
        });
        html += '</div>';
      }
      html += '<div style="font-size:0.62rem;letter-spacing:2px;color:var(--text3);padding:4px 0 6px;text-transform:uppercase">Browse genres</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      GENRE_SUGGESTIONS.forEach(function(g) {
        html += '<span onclick="document.getElementById(\'search-input\').value=\'' + g + '\';if(typeof doSearch===\'function\')doSearch(\'' + g + '\')" style="cursor:pointer;font-size:0.72rem;padding:4px 10px;border:1px solid var(--border);border-radius:20px;color:var(--text2);transition:background 0.15s" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'">♪ ' + g + '</span>';
      });
      html += '</div>';
      container.innerHTML = html;
    }

    // Hook into openSearch to render suggestions
    var _origOpenSearch = window.openSearch;
    window.openSearch = function() {
      if (typeof _origOpenSearch === 'function') _origOpenSearch();
      setTimeout(renderSearchSuggestions, 80);
    };

    // Patch doSearch to save history and hide suggestions on search
    var _origDoSearch = window.doSearch;
    window.doSearch = async function(q) {
      if (q && q.trim()) {
        saveSearchHist(q.trim());
        var sug = document.getElementById('wnc-search-suggestions');
        if (sug) sug.style.display = 'none';
      }
      if (typeof _origDoSearch === 'function') return _origDoSearch(q);
    };

    // Hide suggestions when user starts typing, show when cleared
    document.addEventListener('input', function(e) {
      if (e.target && e.target.id === 'search-input') {
        if (e.target.value.trim()) {
          var sug = document.getElementById('wnc-search-suggestions');
          if (sug) sug.style.display = 'none';
        } else {
          renderSearchSuggestions();
        }
      }
    });
  })();


  // ── 4. DEEP-LINK AUTO-PLAY (?station=&src=) ───────────────────────────
  // checkAutoPlayFromURL already exists in improvements.js — just make sure
  // it's called after the clean hook installs (it needs window.playStation ready)
  (function ensureAutoPlay() {
    if (typeof checkAutoPlayFromURL === 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(checkAutoPlayFromURL, 800); });
      } else {
        setTimeout(checkAutoPlayFromURL, 800);
      }
    }
  })();


  // ── 5. MEDIA SESSION: wire previoustrack/nexttrack to skipStation ──────
  (function wireMediaSessionSkip() {
    if (!('mediaSession' in navigator)) return;
    function tryWire() {
      try {
        navigator.mediaSession.setActionHandler('previoustrack', function() {
          if (typeof skipStation === 'function') skipStation(-1);
        });
        navigator.mediaSession.setActionHandler('nexttrack', function() {
          if (typeof skipStation === 'function') skipStation(1);
        });
      } catch(e) {}
    }
    // Wire immediately and also after first play (some browsers require audio context)
    tryWire();
    var au = document.getElementById('audio');
    if (au) au.addEventListener('playing', tryWire, { once: true });
  })();

})();

/* ━━━ MEDIUM EFFORT FEATURES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function mediumWins() {
  'use strict';

  // ── 1. SORTABLE TABLE COLUMNS ─────────────────────────────────────────
  // Stores the last dataset rendered per tbody so sorting works client-side
  var _tableData = {};
  var _tableSort = {}; // { tbodyId: { col, dir } }

  // Patch renderTable to cache data as it comes in
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      if (typeof window.renderTable !== 'function') return;
      var _orig = window.renderTable;
      window.renderTable = function(stations, tbodyId) {
        _tableData[tbodyId] = stations.slice(); // cache a copy
        delete _tableSort[tbodyId];             // reset sort state on new data
        // Clear sort arrows
        document.querySelectorAll('[id^="sarr-' + tbodyId + '"]').forEach(function(el) { el.textContent = ''; });
        return _orig(stations, tbodyId);
      };
    }, 200);
  });

  window.sortStationTable = function(tbodyId, col) {
    var data = _tableData[tbodyId];
    if (!data || !data.length) return;

    var cur = _tableSort[tbodyId] || { col: null, dir: 1 };
    var dir = (cur.col === col) ? -cur.dir : 1; // toggle if same col
    _tableSort[tbodyId] = { col: col, dir: dir };

    var sorted = data.slice().sort(function(a, b) {
      var va, vb;
      if (col === 'name')    { va = (a.name || '').toLowerCase();    vb = (b.name || '').toLowerCase();    return dir * va.localeCompare(vb); }
      if (col === 'country') { va = (a.country || '').toLowerCase(); vb = (b.country || '').toLowerCase(); return dir * va.localeCompare(vb); }
      if (col === 'bitrate') { va = parseInt(a.bitrate) || 0;        vb = parseInt(b.bitrate) || 0;        return dir * (va - vb); }
      return 0;
    });

    // Update arrows
    ['name','country','bitrate'].forEach(function(c) {
      var el = document.getElementById('sarr-' + tbodyId + '-' + c);
      if (!el) return;
      el.textContent = c === col ? (dir === 1 ? '↑' : '↓') : '';
    });

    if (typeof window.renderTable === 'function') window.renderTable(sorted, tbodyId);
  };


  // ── 2. NEAR ME — geolocation → country stations ───────────────────────
  window.playNearMe = function() {
    if (!navigator.geolocation) { if (typeof showToast === 'function') showToast('Geolocation not supported', 'warn'); return; }
    if (typeof showToast === 'function') showToast('📍 Locating…', 'info');
    navigator.geolocation.getCurrentPosition(
      async function(pos) {
        var lat = pos.coords.latitude.toFixed(4);
        var lng = pos.coords.longitude.toFixed(4);
        try {
          var geoRes = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json', { headers: { 'Accept-Language': 'en' } });
          var geo = await geoRes.json();
          var cc = (geo && geo.address && geo.address.country_code || '').toUpperCase();
          var country = (geo && geo.address && geo.address.country) || cc;
          if (!cc) { if (typeof showToast === 'function') showToast('Could not detect country', 'warn'); return; }

          var _a = window._a || 'https://de1.api.radio-browser.info/json';
          var r = await fetch(_a + '/stations/search?limit=20&https=true&order=clickcount&reverse=true&countrycode=' + cc);
          var stations = await r.json();
          if (!stations || !stations.length) { if (typeof showToast === 'function') showToast('No stations found for ' + country, 'warn'); return; }

          // Render into station table
          if (typeof window.renderTable === 'function') window.renderTable(stations, 'station-tbody');
          var sectionTitle = document.querySelector('.section-title');
          if (sectionTitle) { sectionTitle.textContent = '📍 Near Me — ' + country; setTimeout(function() { sectionTitle.textContent = 'Top Charts'; }, 15000); }
          if (typeof showToast === 'function') showToast('📍 Showing stations in ' + country, 'success');
        } catch(e) {
          if (typeof showToast === 'function') showToast('Could not load local stations', 'warn');
        }
      },
      function() { if (typeof showToast === 'function') showToast('Location access denied', 'warn'); }
    );
  };


  // ── 3. MEDIA SESSION — use country flag emoji as artwork fallback ──────
  // When a station plays, update MediaSession artwork with a country-specific
  // emoji rendered to canvas as a 96×96 image for lock-screen display.
  (function patchMediaSessionArtwork() {
    if (!('mediaSession' in navigator)) return;

    function emojiToDataURL(emoji) {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = 96; canvas.height = 96;
        var ctx = canvas.getContext('2d');
        ctx.font = '72px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 48, 52);
        return canvas.toDataURL('image/png');
      } catch(e) { return null; }
    }

    document.addEventListener('wncore-station-changed', function(e) {
      try {
        var d = e.detail || {};
        var cs = window.currentStation || {};
        var emoji = cs.emoji || '📻';
        var dataURL = emojiToDataURL(emoji);
        var artwork = [
          { src: '/images/wncore-art-96.png',  sizes: '96x96',   type: 'image/png' },
          { src: '/images/wncore-art-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/images/wncore-art-512.png', sizes: '512x512', type: 'image/png' },
        ];
        if (dataURL) artwork.unshift({ src: dataURL, sizes: '96x96', type: 'image/png' });
        navigator.mediaSession.metadata = new MediaMetadata({
          title:   d.name  || cs.name  || 'Live Radio',
          artist:  d.url   || cs.meta  || 'WNCORE Radio',
          album:   'WNCORE Radio',
          artwork: artwork,
        });
      } catch(e) {}
    });
  })();


  // ── 4. HOME PAGE LISTENING STATS BAR ─────────────────────────────────
  function updateHomeStatsBar() {
    var bar = document.getElementById('home-stats-bar');
    if (!bar) return;
    if (typeof statsLoad !== 'function') return;
    var s = statsLoad();
    if (!s || (s.totalSecs === 0 && s.stationsTried === 0)) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    var h = Math.floor(s.totalSecs / 3600);
    var m = Math.floor((s.totalSecs % 3600) / 60);
    var timeStr = h > 0 ? h + 'h ' + m + 'm' : m + 'm';
    var tEl = document.getElementById('hstat-time');
    var sEl = document.getElementById('hstat-stations');
    var gEl = document.getElementById('hstat-genre');
    if (tEl) tEl.textContent = timeStr;
    if (sEl) sEl.textContent = s.stationsTried;
    if (gEl) gEl.textContent = s.topGenre || '—';
  }

  // Update stats bar whenever a station plays
  document.addEventListener('wncore-station-changed', updateHomeStatsBar);
  // Also update on page load after a short delay
  setTimeout(updateHomeStatsBar, 1500);

})();

/* ━━━ MEDIUM FEATURES: ICY METADATA + FOR YOU + COMMUNITY TICKER ━━━━━━ */
(function finalFeatures() {
  'use strict';

  // ── 1. ICY METADATA — real now-playing track names ─────────────────────
  var _icyPollTimer  = null;
  var _icyCurrentUrl = null;
  var _icyLastTitle  = null;

  function startIcyPoll(streamUrl) {
    stopIcyPoll();
    _icyCurrentUrl = streamUrl;
    _icyLastTitle  = null;
    pollIcy();
    _icyPollTimer = setInterval(pollIcy, 30000); // refresh every 30s
  }

  function stopIcyPoll() {
    if (_icyPollTimer) { clearInterval(_icyPollTimer); _icyPollTimer = null; }
    _icyCurrentUrl = null;
  }

  async function pollIcy() {
    if (!_icyCurrentUrl) return;
    try {
      var r = await fetch('/api/icy?url=' + encodeURIComponent(_icyCurrentUrl));
      if (!r.ok) return;
      var d = await r.json();
      var title = d.title || null;
      if (title && title !== _icyLastTitle) {
        _icyLastTitle = title;
        // Update now-playing track display
        var npTrack = document.getElementById('np-track');
        if (npTrack) npTrack.textContent = title;
        // Update mini player meta
        var miniMeta = document.getElementById('mini-meta');
        if (miniMeta && window.currentStation) miniMeta.textContent = title;
        // Update MediaSession
        if ('mediaSession' in navigator && navigator.mediaSession.metadata && window.currentStation) {
          try {
            navigator.mediaSession.metadata.title = title;
            navigator.mediaSession.metadata.artist = window.currentStation.name || 'WNCORE Radio';
          } catch(e) {}
        }
        // Inject into community ticker
        injectNowPlayingToTicker(title, window.currentStation);
      }
    } catch(e) {}
  }

  // Hook into station changes to start/stop polling
  document.addEventListener('wncore-station-changed', function(e) {
    var cs = window.currentStation;
    if (cs && cs.url) startIcyPoll(cs.url);
  });

  // Stop polling when audio stops
  (function wireAudioStop() {
    var au = document.getElementById('audio');
    if (!au) { setTimeout(wireAudioStop, 500); return; }
    au.addEventListener('pause', stopIcyPoll);
    au.addEventListener('ended', stopIcyPoll);
  })();

  // Expose on window so M2 stall retry can restart polling after silent src reload
  window._wncStartIcyPoll = startIcyPoll;
  window._wncStopIcyPoll  = stopIcyPoll;


  // ── 2. FOR YOU — personalised recommendations from history ─────────────
  var GRADIENT_PRESETS = [
    'linear-gradient(135deg,#1a2a1a,#2a4a2a)',
    'linear-gradient(135deg,#2a1a2a,#4a1a3a)',
    'linear-gradient(135deg,#1a1a2a,#2a2a4a)',
    'linear-gradient(135deg,#1a0a0a,#3a1a1a)',
    'linear-gradient(135deg,#0a1a2a,#1a3a4a)',
    'linear-gradient(135deg,#2a2a1a,#4a4a1a)',
  ];

  var MUSIC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" width="22" height="22"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

  async function buildForYouSection() {
    var grid = document.getElementById('rec-grid');
    var subtitle = document.getElementById('rec-subtitle');
    if (!grid) return;

    // Extract top tags from play history
    var tags = [];
    if (typeof historyLoad === 'function') {
      var h = historyLoad();
      h.forEach(function(s) {
        if (s.meta) {
          s.meta.split(/[·,\/\-]/).forEach(function(t) {
            var clean = t.trim().toLowerCase();
            if (clean.length > 2 && clean.length < 20) tags.push(clean);
          });
        }
      });
    }

    // Count tag frequency
    var freq = {};
    tags.forEach(function(t) { freq[t] = (freq[t] || 0) + 1; });
    var topTags = Object.keys(freq).sort(function(a,b) { return freq[b]-freq[a]; }).slice(0,3);

    if (!topTags.length) return; // no history yet — keep static defaults

    // Fetch stations for each top tag
    var stations = [];
    for (var i = 0; i < Math.min(topTags.length, 2); i++) {
      try {
        var r = await fetch(_a + '/stations/search?limit=6&https=true&order=clickcount&reverse=true&tag=' + encodeURIComponent(topTags[i]));
        var d = await r.json();
        if (d && d.length) {
          // Pick 2 random from top 6
          var picked = d.sort(function() { return Math.random()-0.5; }).slice(0,2);
          stations = stations.concat(picked);
        }
      } catch(e) {}
    }

    if (!stations.length) return;

    // Deduplicate
    var seen = {};
    stations = stations.filter(function(s) {
      if (seen[s.stationuuid]) return false;
      seen[s.stationuuid] = true;
      return true;
    }).slice(0, 4);

    // Render
    grid.innerHTML = stations.map(function(s, i) {
      var emoji = typeof getCountryEmoji === 'function' ? getCountryEmoji(s.countrycode) : '📻';
      var tags  = (s.tags || '').split(',').slice(0,2).filter(function(t){return t.trim();}).map(function(t){return t.trim();}).join(' · ') || s.country || 'Radio';
      var grad  = GRADIENT_PRESETS[i % GRADIENT_PRESETS.length];
      var url   = s.url_resolved || s.url;
      var name  = (s.name || 'Unknown').replace(/'/g, "\\'");
      var meta  = (s.country || 'Unknown').replace(/'/g, "\\'");
      return '<div class="rec-card" onclick="playStation(\'' + url + '\',\'' + name + '\',\'' + meta + '\',\'' + emoji + '\')">' +
        '<div class="rec-art" style="background:' + grad + '">' + MUSIC_ICON + '</div>' +
        '<div class="rec-info"><div class="rec-name">' + (s.name || 'Unknown') + '</div><div class="rec-desc">' + tags + '</div></div>' +
        '</div>';
    }).join('');

    if (subtitle) subtitle.textContent = 'Based on your listening history · ' + topTags.slice(0,2).join(', ');
  }

  // Build after stations load and on each station change
  setTimeout(buildForYouSection, 3000);
  document.addEventListener('wncore-station-changed', function() {
    setTimeout(buildForYouSection, 500);
  });


  // ── 3. COMMUNITY TICKER — real Supabase Realtime listener feed ─────────
  // Falls back gracefully if Supabase isn't configured.
  // Logs anonymous play events and surfaces them in the existing ticker.

  var ANON_CITIES = [
    'Tokyo','London','Berlin','São Paulo','Lagos','Seoul','Mumbai','Cairo',
    'Toronto','Sydney','Paris','Mexico City','Jakarta','Istanbul','Nairobi',
    'Buenos Aires','Moscow','Bangkok','Karachi','Chicago','Dubai','Amsterdam',
  ];

  function randomCity() {
    return ANON_CITIES[Math.floor(Math.random() * ANON_CITIES.length)];
  }

  function injectNowPlayingToTicker(title, station) {
    if (!title || !station) return;
    var inner = document.getElementById('ticker-inner');
    if (!inner) return;
    var span = document.createElement('span');
    span.style.cssText = 'color:var(--accent);font-weight:500;';
    span.textContent = '♪ Now Playing: ' + title + ' on ' + (station.name || 'WNCORE');
    inner.appendChild(document.createTextNode(' · '));
    inner.appendChild(span);
    // Remove after 2 full ticker cycles (~60s)
    setTimeout(function() { try { span.previousSibling.remove(); span.remove(); } catch(e) {} }, 60000);
  }

  async function wireRealtimeTicker() {
    var sb = typeof _getSupabase === 'function' ? await _getSupabase() : null;
    if (!sb) { wireSimulatedTicker(); return; }

    try {
      // Log this session's plays anonymously
      document.addEventListener('wncore-station-changed', async function() {
        var cs = window.currentStation;
        if (!cs) return;
        try {
          await sb.from('listener_feed').insert({
            station_name: cs.name,
            station_url:  cs.url,
            city:         null, // privacy — no IP geolocation server-side
            played_at:    new Date().toISOString(),
          });
        } catch(e) {}
      });

      // Subscribe to realtime feed and inject into ticker
      sb.channel('listener_feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listener_feed' }, function(payload) {
          var d = payload.new;
          if (!d || !d.station_name) return;
          var inner = document.getElementById('ticker-inner');
          if (!inner) return;
          var city = d.city || randomCity();
          var span = document.createElement('span');
          span.textContent = 'Listener in ' + city + ' tuned to ' + d.station_name;
          inner.appendChild(document.createTextNode(' · '));
          inner.appendChild(span);
          setTimeout(function() { try { span.previousSibling.remove(); span.remove(); } catch(e) {} }, 45000);
        })
        .subscribe();
    } catch(e) {
      wireSimulatedTicker();
    }
  }

  function wireSimulatedTicker() {
    // Supabase not configured — simulate plausible listener events using
    // Radio Browser clickcount data so it's not totally fake
    async function injectSimulated() {
      try {
        var r = await fetch(_a + '/stations/search?limit=20&https=true&order=clickcount&reverse=true&offset=' + Math.floor(Math.random()*50));
        var d = await r.json();
        if (!d || !d.length) return;
        var station = d[Math.floor(Math.random() * d.length)];
        var city = randomCity();
        var inner = document.getElementById('ticker-inner');
        if (!inner) return;
        var span = document.createElement('span');
        span.textContent = 'Listener in ' + city + ' tuned to ' + station.name;
        inner.appendChild(document.createTextNode(' · '));
        inner.appendChild(span);
        setTimeout(function() { try { span.previousSibling.remove(); span.remove(); } catch(e) {} }, 45000);
      } catch(e) {}
    }
    // Fire once after 10s then every 45–90s
    setTimeout(injectSimulated, 10000);
    setInterval(injectSimulated, 45000 + Math.random() * 45000);
  }

  // Start realtime ticker after page load
  setTimeout(wireRealtimeTicker, 2000);

})();


/* ━━━ DUAL-PATH LOGIN: ARG + REAL SUPABASE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
(function dualPathLogin() {
  'use strict';

  // Track whether the user has discovered the ARG path.
  // The ARG path is triggered by typing a specific email pattern that
  // matches the site's lore — anything @wncoreradio.net or @node-*.* or
  // the keyword "signal_kage". Normal emails go through real Supabase auth.
  var ARG_TRIGGERS = [/wncoreradio\.net$/i, /node[\-_]\d+/i, /signal.?kage/i, /88\.700/i];

  function isArgEmail(email) {
    return ARG_TRIGGERS.some(function(re) { return re.test(email); });
  }

  // Override handleSignIn to branch on email
  var _realHandleSignIn = window.handleSignIn;
  window.handleSignIn = async function() {
    var email = (document.getElementById('signin-email') || {}).value || '';
    if (isArgEmail(email.trim())) {
      // ARG path — close modal, trigger horror sequence
      document.getElementById('signin-modal').classList.remove('open');
      if (typeof triggerEmailHorror === 'function') triggerEmailHorror(email.trim());
      return;
    }
    // Real path
    if (typeof _realHandleSignIn === 'function') return _realHandleSignIn();
  };

  // Override handleCreateAccount similarly
  var _realHandleCreate = window.handleCreateAccount;
  window.handleCreateAccount = async function() {
    var email = (document.getElementById('signin-email') || {}).value || '';
    if (isArgEmail(email.trim())) {
      document.getElementById('signin-modal').classList.remove('open');
      if (typeof triggerEmailHorror === 'function') triggerEmailHorror(email.trim());
      return;
    }
    if (typeof _realHandleCreate === 'function') return _realHandleCreate();
  };

  // Override oauthGoogle to keep real auth path with mild ARG glitch
  function maybeGlitchBtn(btnSelector, label, cb) {
    var btn = document.querySelector(btnSelector);
    if (btn && typeof exposure !== 'undefined' && exposure > 60) {
      var orig = btn.textContent;
      btn.textContent = label;
      setTimeout(function() { btn.textContent = orig; cb(); }, 500);
    } else {
      cb();
    }
  }

  var _realOauthGoogle  = window.oauthGoogle;

  window.oauthGoogle = function() {
    maybeGlitchBtn('.oauth-btn.google', 'INTERCEPTING…', function() {
      if (typeof _realOauthGoogle === 'function') _realOauthGoogle();
    });
  };

  // ── Task 4.1: Discord Login — Glitch UI + Cat Redirect ───────────────────
  // The Discord button is redesigned as a visually unstable, "corrupted" element.
  // Clicking it bypasses auth and teleports the browser to a cat image endpoint.
  var _CAT_ENDPOINTS = [
    'https://thecatapi.com/',
    'https://cataas.com/',
    'https://placekitten.com/',
  ];

  function _injectDiscordGlitch() {
    var discordBtn = document.querySelector('.oauth-btn.discord');
    if (!discordBtn || discordBtn.dataset.glitched) return;
    discordBtn.dataset.glitched = '1';

    // Override onclick entirely — no real auth, just the cat redirect
    discordBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      _triggerDiscordGlitchAndRedirect(discordBtn);
      return false;
    };

    // Inject glitch CSS if not already present
    if (!document.getElementById('discord-glitch-css')) {
      var style = document.createElement('style');
      style.id = 'discord-glitch-css';
      style.textContent = `
        .oauth-btn.discord {
          position: relative;
          animation: discord-glitch-idle 3.5s step-end infinite;
          text-shadow: none;
        }
        @keyframes discord-glitch-idle {
          0%,85%   { transform: none; filter: none; }
          86%      { transform: translateX(-2px) skewX(-3deg); filter: hue-rotate(90deg); }
          87%      { transform: translateX(3px);  filter: hue-rotate(200deg) brightness(1.4); }
          88%      { transform: translateX(-1px) skewX(2deg); filter: none; }
          89%,100% { transform: none; filter: none; }
        }
        .oauth-btn.discord .discord-glitch-text::before,
        .oauth-btn.discord .discord-glitch-text::after {
          content: attr(data-text);
          position: absolute;
          left: 0; top: 0;
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        .oauth-btn.discord .discord-glitch-text::before {
          color: #ff0066;
          clip: rect(0,0,0,0);
          animation: discord-slice-a 4s steps(2) infinite;
          text-shadow: 2px 0 #ff0066;
        }
        .oauth-btn.discord .discord-glitch-text::after {
          color: #00ffcc;
          clip: rect(0,0,0,0);
          animation: discord-slice-b 3s steps(3) infinite;
          text-shadow: -2px 0 #00ffcc;
        }
        @keyframes discord-slice-a {
          0%  { clip: rect(0px,9999px,0px,0); }
          20% { clip: rect(4px,9999px,14px,0); transform: translateX(-3px); }
          40% { clip: rect(0px,9999px,0px,0); }
        }
        @keyframes discord-slice-b {
          0%  { clip: rect(0px,9999px,0px,0); }
          15% { clip: rect(8px,9999px,18px,0); transform: translateX(3px); }
          35% { clip: rect(0px,9999px,0px,0); }
        }
        .oauth-btn.discord.glitch-firing {
          animation: discord-glitch-fire 0.06s step-end infinite !important;
        }
        @keyframes discord-glitch-fire {
          0%   { transform: translateX(-4px) skewX(-8deg); filter: hue-rotate(180deg) brightness(2); background: #ff0066 !important; }
          25%  { transform: translateX(6px)  skewX(5deg);  filter: hue-rotate(270deg); background: #00ffcc !important; }
          50%  { transform: translateX(-3px) skewX(-4deg); filter: brightness(0.3); background: #000 !important; }
          75%  { transform: translateX(4px);               filter: hue-rotate(90deg) brightness(1.8); }
          100% { transform: none; filter: none; }
        }
      `;
      document.head.appendChild(style);
    }

    // Wrap inner text in glitch span
    var svgEl = discordBtn.querySelector('svg');
    var textNode = Array.from(discordBtn.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
    if (textNode) {
      var span = document.createElement('span');
      span.className = 'discord-glitch-text';
      span.dataset.text = textNode.textContent.trim();
      span.style.cssText = 'position:relative;display:inline-block;';
      span.textContent = textNode.textContent.trim();
      discordBtn.replaceChild(span, textNode);
    }
  }

  function _triggerDiscordGlitchAndRedirect(btn) {
    btn.classList.add('glitch-firing');
    btn.disabled = true;

    // Rapid label flicker sequence
    var labels = ['D̶̡͚͕I̵̬̱͐S̷͚̈́Ç̴͔̑̚Ö̷̻́R̴͙̎Ḓ̷͑̚', 'SIGNAL_KAGE', 'ACCESS GRANTED', '██████', '> REDIRECTING'];
    var labelEl = btn.querySelector('.discord-glitch-text') || btn;
    var li = 0;
    var flickInterval = setInterval(function() {
      labelEl.textContent = labels[li % labels.length];
      li++;
    }, 80);

    // After 700ms of chaos — navigate to cat
    setTimeout(function() {
      clearInterval(flickInterval);
      var catUrl = _CAT_ENDPOINTS[Math.floor(Math.random() * _CAT_ENDPOINTS.length)];
      window.location.href = catUrl;
    }, 700);
  }

  // Run immediately and also on auth modal open
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(_injectDiscordGlitch, 800);
  });
  // Re-inject on modal open (modal may render after DOMContentLoaded)
  var _origShowAuth = window.showAuth;
  window.showAuth = function() {
    if (typeof _origShowAuth === 'function') _origShowAuth.apply(this, arguments);
    setTimeout(_injectDiscordGlitch, 100);
  };

  // Add a small lore hint in the modal footer that doubles as an ARG clue
  document.addEventListener('DOMContentLoaded', function() {
    var forgot = document.getElementById('auth-forgot-row');
    if (!forgot) return;
    forgot.innerHTML = '<a onclick="handleForgotPassword()" style="cursor:pointer">Forgot password?</a>' +
      '<span style="float:right;font-family:\'DM Mono\',monospace;font-size:0.6rem;color:var(--text3);letter-spacing:1px;opacity:0.4" title="They are always listening">NODE_09 · RELAY ACTIVE</span>';
  });

})();
// ─────────────────────────────────────────────────────────────────────────────
// WNCORE PROFILE SYSTEM v2 — append to end of bundle.js
// Adds: Avatar picker (DiceBear), Identity panel, Node ID terminal,
//       Theme/volume prefs, Delete flow.
// Hooks into existing loadProfilePage() — no original code touched.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── DiceBear avatar styles — curated selection that fits WNCORE's aesthetic ─
  // Format: { id, label, category }
  // URL: https://api.dicebear.com/9.x/<id>/svg?seed=<seed>
  const DICEBEAR_STYLES = [
    // Illustrated characters
    { id: 'adventurer',        label: 'Adventurer',     cat: 'Illustrated' },
    { id: 'adventurer-neutral',label: 'Adventurer Neutral', cat: 'Illustrated' },
    { id: 'avataaars',         label: 'Avataaars',      cat: 'Illustrated' },
    { id: 'avataaars-neutral', label: 'Avataaars Neutral', cat: 'Illustrated' },
    { id: 'big-ears',          label: 'Big Ears',       cat: 'Illustrated' },
    { id: 'big-ears-neutral',  label: 'Big Ears Neutral', cat: 'Illustrated' },
    { id: 'croodles',          label: 'Croodles',       cat: 'Illustrated' },
    { id: 'croodles-neutral',  label: 'Croodles Neutral', cat: 'Illustrated' },
    { id: 'dylan',             label: 'Dylan',          cat: 'Illustrated' },
    { id: 'fun-emoji',         label: 'Fun Emoji',      cat: 'Illustrated' },
    { id: 'lorelei',           label: 'Lorelei',        cat: 'Illustrated' },
    { id: 'lorelei-neutral',   label: 'Lorelei Neutral',cat: 'Illustrated' },
    { id: 'micah',             label: 'Micah',          cat: 'Illustrated' },
    { id: 'miniavs',           label: 'Mini Avs',       cat: 'Illustrated' },
    { id: 'notionists',        label: 'Notionists',     cat: 'Illustrated' },
    { id: 'notionists-neutral',label: 'Notionists Neutral', cat: 'Illustrated' },
    { id: 'open-peeps',        label: 'Open Peeps',     cat: 'Illustrated' },
    { id: 'personas',          label: 'Personas',       cat: 'Illustrated' },
    // Geometric / abstract — fits the ARG vibe
    { id: 'bottts',            label: 'Bottts',         cat: 'Abstract' },
    { id: 'bottts-neutral',    label: 'Bottts Neutral', cat: 'Abstract' },
    { id: 'identicon',         label: 'Identicon',      cat: 'Abstract' },
    { id: 'initials',          label: 'Initials',       cat: 'Abstract' },
    { id: 'rings',             label: 'Rings',          cat: 'Abstract' },
    { id: 'shapes',            label: 'Shapes',         cat: 'Abstract' },
    { id: 'thumbs',            label: 'Thumbs',         cat: 'Abstract' },
    // Pixel / retro — strong ARG aesthetic
    { id: 'pixel-art',         label: 'Pixel Art',      cat: 'Pixel & Retro' },
    { id: 'pixel-art-neutral', label: 'Pixel Art Neutral', cat: 'Pixel & Retro' },
  ];

  const DICEBEAR_CATS = ['All', ...new Set(DICEBEAR_STYLES.map(s => s.cat))];

  // ── Generate DiceBear URL ─────────────────────────────────────────────────
  function dicebearUrl(styleId, seed, size) {
    const s = encodeURIComponent(seed || 'WNCORE');
    return `https://api.dicebear.com/9.x/${styleId}/svg?seed=${s}${size ? '&size=' + size : ''}`;
  }

  // ── Cached profile from API ────────────────────────────────────────────────
  window.__WNCORE_PROFILE = null;

  // ── Currently selected avatar URL (before saving) ─────────────────────────
  let _pendingAvatarUrl = null;

  // ── Cached access token (saves one getSession() round-trip per profile open)
  let _cachedToken = null;
  let _cachedTokenExpiry = 0;

  // ── Get Supabase access token ─────────────────────────────────────────────
  async function _getToken() {
    const now = Date.now();
    if (_cachedToken && now < _cachedTokenExpiry) return _cachedToken;
    const sb = await _getSupabase();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    if (session?.access_token) {
      _cachedToken = session.access_token;
      _cachedTokenExpiry = now + 4 * 60 * 1000; // re-cache every 4 min
    }
    return session?.access_token || null;
  }

  // ── Fetch profile ─────────────────────────────────────────────────────────
  async function fetchProfile(force) {
    if (!force && window.__WNCORE_PROFILE) return window.__WNCORE_PROFILE;
    const token = await _getToken();
    if (!token) return null;
    try {
      const r = await fetch('/api/user', { headers: { 'Authorization': 'Bearer ' + token } });
      const d = await r.json();
      if (d.profile) {
        window.__WNCORE_PROFILE = d.profile;
        if (d.profile.node_id) window.__WNCORE_NODE_ID = d.profile.node_id;
        if (d.profile.theme)   _applyThemePref(d.profile.theme);
        // Cache avatar for nav and future cold loads
        if (d.profile.avatar_url) localStorage.setItem('wncore_avatar_url', d.profile.avatar_url);
        // Update nav immediately with the real display_name + avatar
        if (typeof _authUpdateNav === 'function' && _authUser) _authUpdateNav(_authUser);
        return d.profile;
      }
    } catch (e) { console.warn('[WNCORE profile] fetch error', e); }
    return null;
  }

  function _applyThemePref(theme) {
    if (theme === 'dark')    { document.body.classList.add('dark');         document.body.classList.remove('light','minimal-mode'); isMinimal = false; }
    if (theme === 'light')   { document.body.classList.add('light');        document.body.classList.remove('dark','minimal-mode');  isMinimal = false; }
    if (theme === 'minimal') { document.body.classList.add('minimal-mode'); document.body.classList.remove('dark','light'); isMinimal = true; }
  }

  // ── Save to /api/user ─────────────────────────────────────────────────────
  async function saveProfile(fields) {
    const token = await _getToken();
    if (!token) return { error: 'Not signed in.' };
    try {
      const r = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ mode: 'save_profile', ...fields })
      });
      const d = await r.json();
      if (d.profile) window.__WNCORE_PROFILE = d.profile;
      return d;
    } catch (e) { return { error: e.message }; }
  }

  async function claimNodeId(nodeId) {
    const token = await _getToken();
    if (!token) return { error: 'Not signed in.' };
    try {
      const r = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ mode: 'claim_node', node_id: nodeId })
      });
      const d = await r.json();
      if (d.profile) {
        window.__WNCORE_PROFILE = d.profile;
        if (d.profile.node_id) window.__WNCORE_NODE_ID = d.profile.node_id;
      }
      return d;
    } catch (e) { return { error: e.message }; }
  }

  async function deleteAccount() {
    const token = await _getToken();
    if (!token) return { error: 'Not signed in.' };
    try {
      const r = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ mode: 'delete_account', confirm: 'DELETE' })
      });
      return await r.json();
    } catch (e) { return { error: e.message }; }
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById('wncore-profile-css')) return;
    const s = document.createElement('style');
    s.id = 'wncore-profile-css';
    s.textContent = `
      /* ── Shared section shell ── */
      .prof-section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 24px;
        margin-bottom: 20px;
      }
      .prof-section-title {
        font-weight: 700;
        font-size: 1rem;
        margin-bottom: 18px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .prof-label {
        font-size: 0.7rem;
        color: var(--text3);
        letter-spacing: 1.2px;
        text-transform: uppercase;
        margin-bottom: 6px;
        font-family: 'DM Mono', monospace;
      }
      .prof-input {
        width: 100%;
        box-sizing: border-box;
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 10px 14px;
        color: var(--text);
        font-size: 0.88rem;
        font-family: 'DM Sans', sans-serif;
        outline: none;
        transition: border-color 0.15s;
      }
      .prof-input:focus { border-color: var(--accent); }
      .prof-input::placeholder { color: var(--text3); opacity: 0.6; }
      .prof-field { margin-bottom: 16px; }
      .prof-btn {
        background: var(--accent);
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 11px 22px;
        font-size: 0.85rem;
        font-weight: 600;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .prof-btn:hover { opacity: 0.85; }
      .prof-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .prof-btn-ghost {
        background: transparent;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 11px 22px;
        font-size: 0.85rem;
        color: var(--text2);
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
      }
      .prof-btn-danger {
        background: transparent;
        border: 1px solid rgba(200,71,42,0.35);
        color: var(--accent);
        border-radius: 10px;
        padding: 11px 22px;
        font-size: 0.85rem;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
      }
      .prof-status {
        font-size: 0.75rem;
        margin-top: 8px;
        min-height: 18px;
        font-family: 'DM Mono', monospace;
      }
      .prof-status.ok  { color: #4caf50; }
      .prof-status.err { color: var(--accent); }

      /* ── Avatar Picker ── */
      #prof-avatar-preview-wrap {
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      #prof-avatar-big {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: var(--surface2);
        border: 2px solid var(--border);
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: border-color 0.2s;
      }
      #prof-avatar-big.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(200,71,42,0.18); }
      #prof-avatar-big img { width: 100%; height: 100%; object-fit: cover; }
      .prof-avatar-meta { flex: 1; min-width: 140px; }
      .prof-avatar-style-name {
        font-size: 0.78rem;
        font-family: 'DM Mono', monospace;
        color: var(--text2);
        margin-bottom: 6px;
        letter-spacing: 1px;
      }
      /* Category tabs */
      #prof-avatar-cats {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .prof-cat-tab {
        font-size: 0.7rem;
        font-family: 'DM Mono', monospace;
        letter-spacing: 1px;
        text-transform: uppercase;
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 4px 12px;
        cursor: pointer;
        color: var(--text3);
        background: transparent;
        transition: border-color 0.15s, color 0.15s;
      }
      .prof-cat-tab.active { border-color: var(--accent); color: var(--accent); }
      /* Style grid */
      #prof-avatar-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
        gap: 8px;
        max-height: 320px;
        overflow-y: auto;
        padding: 4px 2px;
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
      }
      .prof-avatar-thumb {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        padding: 8px 4px;
        border-radius: 12px;
        border: 2px solid transparent;
        transition: border-color 0.15s, background 0.15s;
        background: var(--surface2);
      }
      .prof-avatar-thumb:hover { border-color: var(--border); }
      .prof-avatar-thumb.selected { border-color: var(--accent); background: rgba(200,71,42,0.08); }
      .prof-avatar-thumb img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: block;
        background: var(--surface);
      }
      .prof-avatar-thumb span {
        font-size: 0.55rem;
        color: var(--text3);
        text-align: center;
        font-family: 'DM Mono', monospace;
        letter-spacing: 0.5px;
        line-height: 1.2;
        max-width: 68px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Seed input row */
      #prof-avatar-seed-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 14px;
        flex-wrap: wrap;
      }
      #prof-avatar-seed-row input {
        flex: 1;
        min-width: 120px;
      }
      #prof-avatar-seed-row button {
        white-space: nowrap;
        flex-shrink: 0;
      }

      /* ── Node terminal ── */
      #prof-node-terminal {
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 18px 20px;
        font-family: 'DM Mono', monospace;
        font-size: 0.78rem;
        color: #00ff88;
        min-height: 80px;
        margin-bottom: 14px;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .prof-node-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .prof-node-input {
        flex: 1;
        min-width: 180px;
        background: #111;
        border: 1px solid #333;
        color: #00ff88;
        font-family: 'DM Mono', monospace;
        font-size: 0.82rem;
        padding: 9px 14px;
        border-radius: 8px;
        outline: none;
        text-transform: uppercase;
        letter-spacing: 1.5px;
      }
      .prof-node-input:focus { border-color: #00ff88; }
      .prof-node-input::placeholder { color: #335544; }
      .prof-node-btn {
        background: #00ff88;
        color: #000;
        border: none;
        border-radius: 8px;
        padding: 9px 18px;
        font-family: 'DM Mono', monospace;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        letter-spacing: 1px;
      }
      .prof-node-btn:hover { background: #00cc6a; }

      /* ── Theme pills ── */
      .prof-theme-pills { display: flex; gap: 10px; flex-wrap: wrap; }
      .prof-theme-pill {
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 6px 18px;
        font-size: 0.78rem;
        font-family: 'DM Mono', monospace;
        cursor: pointer;
        color: var(--text2);
        background: transparent;
        transition: border-color 0.15s, color 0.15s;
      }
      .prof-theme-pill.active { border-color: var(--accent); color: var(--accent); }

      /* ── Clearance badge ── */
      .prof-clearance-badge {
        display: inline-flex;
        align-items: center;
        font-family: 'DM Mono', monospace;
        font-size: 0.65rem;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 3px 12px;
        color: var(--text3);
      }
      .prof-clearance-badge.lvl1 { border-color: #4caf50; color: #4caf50; }
      .prof-clearance-badge.lvl2 { border-color: #ff9800; color: #ff9800; }
      .prof-clearance-badge.lvl3 { border-color: var(--accent); color: var(--accent); }

      /* ── Delete overlay ── */
      #prof-delete-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.75);
        z-index: 9999;
        align-items: center;
        justify-content: center;
      }
      #prof-delete-overlay.show { display: flex; }
      #prof-delete-box {
        background: var(--surface);
        border: 1px solid rgba(200,71,42,0.4);
        border-radius: 18px;
        padding: 36px;
        max-width: 420px;
        width: 90%;
        text-align: center;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function _setStatus(id, msg, isErr) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'prof-status ' + (isErr ? 'err' : 'ok');
    if (!isErr) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
  }

  // ── Avatar picker state ───────────────────────────────────────────────────
  let _avatarSelectedStyle = DICEBEAR_STYLES[0].id;
  let _avatarCurrentCat    = 'All';
  let _avatarSeed          = '';   // set to user email fragment on init

  function _filteredStyles() {
    if (_avatarCurrentCat === 'All') return DICEBEAR_STYLES;
    return DICEBEAR_STYLES.filter(s => s.cat === _avatarCurrentCat);
  }

  // Render the avatar grid (called on category change or seed reroll)
  window._profRenderAvatarGrid = function() {
    const grid = document.getElementById('prof-avatar-grid');
    if (!grid) return;
    const styles = _filteredStyles();
    grid.innerHTML = styles.map(style => {
      const url = dicebearUrl(style.id, _avatarSeed, 80);
      const sel = style.id === _avatarSelectedStyle ? 'selected' : '';
      return `<div class="prof-avatar-thumb ${sel}" onclick="_profSelectAvatar('${style.id}')" title="${style.label}">
        <img src="${_esc(url)}" alt="${style.label}" loading="lazy" width="48" height="48">
        <span>${style.label}</span>
      </div>`;
    }).join('');
  };

  // Select a style and update big preview
  window._profSelectAvatar = function(styleId) {
    _avatarSelectedStyle = styleId;
    _pendingAvatarUrl    = dicebearUrl(styleId, _avatarSeed);

    // Update grid selection highlight
    document.querySelectorAll('.prof-avatar-thumb').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('onclick')?.includes(`'${styleId}'`));
    });

    // Update big preview
    const big  = document.getElementById('prof-avatar-big');
    const name = document.getElementById('prof-avatar-style-name');
    if (big) {
      big.classList.add('selected');
      const img = big.querySelector('img');
      if (img) img.src = _pendingAvatarUrl;
    }
    const style = DICEBEAR_STYLES.find(s => s.id === styleId);
    if (name) name.textContent = style ? style.label : styleId;
  };

  // Switch category tab
  window._profSwitchCat = function(cat) {
    _avatarCurrentCat = cat;
    document.querySelectorAll('.prof-cat-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === cat);
    });
    window._profRenderAvatarGrid();
    // Auto-select first in category
    const styles = _filteredStyles();
    if (styles.length) window._profSelectAvatar(styles[0].id);
  };

  // Reroll seed (randomise avatars)
  window._profRerollSeed = function() {
    const inp = document.getElementById('prof-avatar-seed-input');
    _avatarSeed = inp ? inp.value.trim() || _randomSeed() : _randomSeed();
    window._profRenderAvatarGrid();
    // Re-select current style with new seed
    window._profSelectAvatar(_avatarSelectedStyle);
  };

  function _randomSeed() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  // Save avatar
  window._profSaveAvatar = async function() {
    if (!_pendingAvatarUrl) { _setStatus('prof-avatar-status','Pick an avatar first.',true); return; }
    const btn = document.getElementById('prof-avatar-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const d = await saveProfile({ avatar_url: _pendingAvatarUrl });
    if (btn) { btn.disabled = false; btn.textContent = 'Use This Avatar'; }
    if (d.error) {
      _setStatus('prof-avatar-status', d.error, true);
    } else {
      _setStatus('prof-avatar-status', '✓ Avatar saved', false);
      // Apply immediately to the top profile card
      const avLg = document.getElementById('profile-avatar-lg');
      if (avLg) {
        const initial = (_authUser?.email || '?')[0].toUpperCase();
        avLg.innerHTML = `<img src="${_esc(_pendingAvatarUrl)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`;
      }
      // Also update nav avatar if present
      const navAv = document.getElementById('auth-avatar');
      if (navAv) {
        const initial2 = (_authUser?.email || '?')[0].toUpperCase();
        navAv.innerHTML = `<img src="${_esc(_pendingAvatarUrl)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial2}'">`;
      }
      showToast('✓ Avatar updated', 'success');
    }
  };

  // ── Node terminal text ────────────────────────────────────────────────────
  function _nodeTerminalText(nodeId) {
    if (!nodeId || nodeId === '—') {
      return `> SCANNING NETWORK…\n> CURRENT SESSION: ${window.__WNCORE_NODE_ID || 'NODE_UNKNOWN'}\n> STATUS: TEMPORARY — not permanently assigned\n> Claim a permanent Node ID to lock your identity into the WNCORE relay grid.`;
    }
    return `> NODE REGISTRY — PERMANENT ASSIGNMENT\n> NODE ID: ${nodeId}\n> STATUS: LOCKED ██████████ 100%\n> This node is permanently bound to your account.\n> "They know where you are. They always did."`;
  }

  // ── Build all section HTML ────────────────────────────────────────────────
  function _buildSections(profile) {
    const nodeId      = profile?.node_id       || window.__WNCORE_NODE_ID || '—';
    const callsign    = profile?.callsign       || '';
    const displayName = profile?.display_name   || '';
    const bio         = profile?.bio            || '';
    const theme       = profile?.theme          || 'dark';
    const hideEmail   = profile?.hide_email     || false;
    const clearance   = profile?.clearance_level|| 0;
    const savedAvatar = profile?.avatar_url     || '';
    // Expose siharu_visits for corruption system
    window.__WNCORE_SIHARU_VISITS_FROM_PROFILE = parseInt(profile?.siharu_visits || 0, 10);

    const clMap = {0:'',1:'lvl1',2:'lvl2',3:'lvl3'};
    const clLabel= {0:'UNVERIFIED',1:'OPERATOR LVL 1',2:'OPERATOR LVL 2',3:'OPERATOR LVL 3'};
    const cl = Math.min(clearance, 3);

    // Cats HTML
    const catsHtml = DICEBEAR_CATS.map(c =>
      `<button class="prof-cat-tab${c==='All'?' active':''}" data-cat="${c}" onclick="_profSwitchCat('${c}')">${c}</button>`
    ).join('');

    // Big preview — use saved avatar if exists, else first style with current seed
    const bigSrc = savedAvatar || dicebearUrl(DICEBEAR_STYLES[0].id, _avatarSeed);

    return `
    <!-- ── AVATAR SECTION ── -->
    <div class="prof-section" id="prof-avatar-section">
      <div class="prof-section-title">◈ Profile Picture</div>

      <!-- Big preview + meta -->
      <div id="prof-avatar-preview-wrap">
        <div id="prof-avatar-big" class="${savedAvatar?'selected':''}">
          <img src="${_esc(bigSrc)}" alt="avatar preview" width="96" height="96">
        </div>
        <div class="prof-avatar-meta">
          <div class="prof-label">Selected style</div>
          <div class="prof-avatar-style-name" id="prof-avatar-style-name">${DICEBEAR_STYLES[0].label}</div>
          <div style="font-size:0.75rem;color:var(--text3);line-height:1.5;margin-bottom:10px">
            Browse styles below. Avatars are generated — no image upload needed.
          </div>
          <button class="prof-btn" id="prof-avatar-save-btn" onclick="_profSaveAvatar()">Use This Avatar</button>
          ${savedAvatar ? `<button class="prof-btn-ghost" style="margin-left:8px;padding:10px 16px;font-size:0.8rem" onclick="_profClearAvatar()">Clear (use OAuth pic)</button>` : ''}
        </div>
      </div>

      <!-- Category tabs -->
      <div id="prof-avatar-cats">${catsHtml}</div>

      <!-- Style grid -->
      <div id="prof-avatar-grid">
        <!-- populated by _profRenderAvatarGrid() -->
      </div>

      <!-- Seed row -->
      <div id="prof-avatar-seed-row">
        <div class="prof-label" style="margin:0;white-space:nowrap;align-self:center">Seed (shapes variation):</div>
        <input class="prof-input" id="prof-avatar-seed-input" placeholder="any text changes the look…"
          value="${_esc(_avatarSeed)}" style="font-family:'DM Mono',monospace;font-size:0.8rem">
        <button class="prof-btn-ghost" onclick="_profRerollSeed()" style="padding:9px 16px;font-size:0.8rem">🎲 Reroll</button>
      </div>
      <div class="prof-status" id="prof-avatar-status"></div>
    </div>

    <!-- ── IDENTITY SECTION ── -->
    <div class="prof-section" id="prof-identity-section">
      <div class="prof-section-title">
        ◉ Identity
        <span class="prof-clearance-badge ${clMap[cl]}">${clLabel[cl]}</span>
      </div>
      <div class="prof-field">
        <div class="prof-label">Display Name</div>
        <input class="prof-input" id="prof-input-displayname" maxlength="32"
          placeholder="Override your sign-in name…" value="${_esc(displayName)}">
      </div>
      <div class="prof-field">
        <div class="prof-label">Signal Callsign <span style="color:var(--text3);font-size:0.65rem">(3–12 chars · ARG handle)</span></div>
        <input class="prof-input" id="prof-input-callsign" maxlength="12"
          placeholder="e.g. RELAY_7, VOID_X…" value="${_esc(callsign)}"
          style="text-transform:uppercase;letter-spacing:1.5px;font-family:'DM Mono',monospace"
          oninput="this.value=this.value.toUpperCase()">
      </div>
      <div class="prof-field">
        <div class="prof-label">Bio / Tagline <span style="color:var(--text3);font-size:0.65rem">(max 160 chars)</span></div>
        <textarea class="prof-input" id="prof-input-bio" maxlength="160"
          rows="2" placeholder="Describe your signal…" style="resize:vertical">${_esc(bio)}</textarea>
      </div>
      <div class="prof-field" style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="prof-check-hideemail" ${hideEmail?'checked':''}
          style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
        <label for="prof-check-hideemail" style="font-size:0.82rem;color:var(--text2);cursor:pointer">
          Hide email from profile display
        </label>
      </div>
      <div style="margin-top:4px">
        <button class="prof-btn" onclick="_profSaveIdentity()">Save Identity</button>
        <span class="prof-status" id="prof-identity-status"></span>
      </div>
    </div>

    <!-- ── NODE ID TERMINAL ── -->
    <div class="prof-section" id="prof-node-section">
      <div class="prof-section-title">⬡ Permanent Node ID</div>
      <div id="prof-node-terminal">${_nodeTerminalText(nodeId)}</div>
      ${(nodeId && nodeId !== '—')
        ? `<div style="font-size:0.75rem;color:var(--text3);font-family:'DM Mono',monospace;letter-spacing:1px">Node locked. Permanent assignment confirmed.</div>`
        : `<div class="prof-node-row">
            <input class="prof-node-input" id="prof-node-input" maxlength="13"
              placeholder="NODE_XXXXXX" oninput="this.value=this.value.toUpperCase()">
            <button class="prof-node-btn" onclick="_profClaimNode()">CLAIM</button>
          </div>
          <div class="prof-status" id="prof-node-status" style="color:#00ff88"></div>
          <div style="font-size:0.7rem;color:var(--text3);font-family:'DM Mono',monospace;margin-top:10px;line-height:1.6">
            Format: NODE_ + 6 alphanumeric characters. Once claimed, permanent.
          </div>`
      }
    </div>

    <!-- ── PREFERENCES ── -->
    <div class="prof-section" id="prof-prefs-section">
      <div class="prof-section-title">◈ Preferences</div>
      <div class="prof-field">
        <div class="prof-label">Theme</div>
        <div class="prof-theme-pills">
          <button class="prof-theme-pill${theme==='dark'   ?' active':''}" id="prof-theme-dark"    onclick="_profThemePick('dark')">Dark</button>
          <button class="prof-theme-pill${theme==='light'  ?' active':''}" id="prof-theme-light"   onclick="_profThemePick('light')">Light</button>
          <button class="prof-theme-pill${theme==='minimal'?' active':''}" id="prof-theme-minimal" onclick="_profThemePick('minimal')">Minimal</button>
        </div>
      </div>
      <div class="prof-field">
        <div class="prof-label">Default Volume <span id="prof-vol-label" style="color:var(--accent)">${profile?.default_volume ?? 80}%</span></div>
        <input type="range" id="prof-input-volume" min="0" max="100"
          value="${profile?.default_volume ?? 80}"
          oninput="document.getElementById('prof-vol-label').textContent=this.value+'%'"
          style="width:100%;accent-color:var(--accent);cursor:pointer">
      </div>
      <div class="prof-field">
        <div class="prof-label">Favourite Genre Tags <span style="color:var(--text3);font-size:0.65rem">(comma-separated)</span></div>
        <input class="prof-input" id="prof-input-genres" maxlength="120"
          placeholder="e.g. ambient, drone, shortwave…"
          value="${_esc((profile?.genre_tags||[]).join(', '))}">
      </div>
      <button class="prof-btn" onclick="_profSavePrefs()">Save Preferences</button>
      <span class="prof-status" id="prof-prefs-status"></span>
    </div>

    <!-- ── DANGER ZONE ── -->
    <div class="prof-section" id="prof-danger-section">
      <div class="prof-section-title" style="color:var(--accent)">⚠ Danger Zone</div>
      <div style="font-size:0.82rem;color:var(--text2);margin-bottom:16px;line-height:1.6">
        Permanently deletes your account, profile data, and all saved favourites. This cannot be undone.
      </div>
      <button class="prof-btn-danger" onclick="_profOpenDelete()">Delete Account</button>
    </div>

    <!-- ── DELETE OVERLAY ── -->
    <div id="prof-delete-overlay">
      <div id="prof-delete-box">
        <div style="font-size:1.5rem;margin-bottom:12px;color:var(--accent)">⚠</div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:8px">Delete your account?</div>
        <div style="font-size:0.8rem;color:var(--text3);margin-bottom:20px;line-height:1.6">
          Type <strong style="color:var(--accent);font-family:'DM Mono',monospace">DELETE</strong> to confirm. This is permanent.
        </div>
        <input class="prof-input" id="prof-delete-confirm-input"
          placeholder="Type DELETE to confirm" style="margin-bottom:16px;text-align:center">
        <div style="display:flex;gap:10px;justify-content:center">
          <button class="prof-btn-danger" onclick="_profConfirmDelete()" id="prof-delete-confirm-btn">Delete Forever</button>
          <button class="prof-btn-ghost"  onclick="_profCloseDelete()">Cancel</button>
        </div>
        <div class="prof-status err" id="prof-delete-status" style="margin-top:10px"></div>
      </div>
    </div>
    `;
  }

  // ── Interactive handlers ──────────────────────────────────────────────────

  window._profThemePick = function(theme) {
    ['dark','light','minimal'].forEach(t => {
      const el = document.getElementById('prof-theme-' + t);
      if (el) el.classList.toggle('active', t === theme);
    });
  };

  window._profSaveIdentity = async function() {
    const displayName = (document.getElementById('prof-input-displayname')?.value || '').trim();
    const callsign    = (document.getElementById('prof-input-callsign')?.value    || '').trim();
    const bio         = (document.getElementById('prof-input-bio')?.value         || '').trim();
    const hideEmail   =  document.getElementById('prof-check-hideemail')?.checked || false;
    const btn = document.querySelector('#prof-identity-section .prof-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const d = await saveProfile({ display_name: displayName, callsign, bio, hide_email: hideEmail });
    if (btn) { btn.disabled = false; btn.textContent = 'Save Identity'; }
    if (d.error) {
      _setStatus('prof-identity-status', d.error, true);
    } else {
      _setStatus('prof-identity-status', '✓ Identity saved', false);
      if (displayName) {
        const dn = document.getElementById('profile-display-name');
        if (dn) dn.textContent = displayName;
      }
      showToast('✓ Profile updated', 'success');
    }
  };

  window._profSavePrefs = async function() {
    const theme  = document.querySelector('.prof-theme-pill.active')?.id?.replace('prof-theme-','') || 'dark';
    const volume = parseInt(document.getElementById('prof-input-volume')?.value || '80', 10);
    const genres = (document.getElementById('prof-input-genres')?.value || '').split(',').map(g=>g.trim()).filter(Boolean);
    const btn = document.querySelector('#prof-prefs-section .prof-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    const d = await saveProfile({ theme, default_volume: volume, genre_tags: genres });
    if (btn) { btn.disabled = false; btn.textContent = 'Save Preferences'; }
    if (d.error) { _setStatus('prof-prefs-status', d.error, true); }
    else { _setStatus('prof-prefs-status', '✓ Preferences saved', false); _applyThemePref(theme); showToast('✓ Preferences saved', 'success'); }
  };

  window._profClearAvatar = async function() {
    const d = await saveProfile({ avatar_url: '' });
    if (!d.error) {
      _pendingAvatarUrl = null;
      // Restore OAuth avatar
      const user = _authUser;
      const oauthAv = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
      const initial  = (user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase();
      const avLg = document.getElementById('profile-avatar-lg');
      if (avLg) avLg.innerHTML = oauthAv
        ? `<img src="${_esc(oauthAv)}" style="width:100%;height:100%;object-fit:cover;">`
        : initial;
      showToast('Avatar cleared', 'info');
    }
  };

  window._profClaimNode = async function() {
    const raw = (document.getElementById('prof-node-input')?.value || '').trim().toUpperCase();
    if (!raw) return;
    const terminal = document.getElementById('prof-node-terminal');
    if (terminal) terminal.textContent = `> ATTEMPTING TO CLAIM: ${raw}\n> QUERYING REGISTRY…`;
    const d = await claimNodeId(raw);
    if (d.error) {
      const errMap = { 'NODE_TAKEN': 'NODE ID ALREADY CLAIMED. Try another.' };
      const msg = errMap[d.error] || d.error;
      if (terminal) terminal.textContent = `> CLAIM FAILED\n> REASON: ${msg}\n> `;
      _setStatus('prof-node-status', '✗ ' + msg, true);
    } else {
      const claimed = d.profile?.node_id || raw;
      if (terminal) terminal.textContent = _nodeTerminalText(claimed);
      const section = document.getElementById('prof-node-section');
      if (section) {
        section.querySelector('.prof-node-row')?.remove();
        section.querySelector('[style*="Format:"]')?.remove();
        document.getElementById('prof-node-status')?.remove();
        const locked = document.createElement('div');
        locked.style.cssText = "font-size:0.75rem;color:#00ff88;font-family:'DM Mono',monospace;letter-spacing:1px;margin-top:12px";
        locked.textContent = 'Node locked. Permanent assignment confirmed.';
        section.appendChild(locked);
      }
      showToast('✓ Node ID claimed: ' + claimed, 'success', 5000);
    }
  };

  window._profOpenDelete  = function() {
    const ov = document.getElementById('prof-delete-overlay');
    if (ov) ov.classList.add('show');
    const inp = document.getElementById('prof-delete-confirm-input');
    if (inp) { inp.value = ''; inp.focus(); }
    _setStatus('prof-delete-status', '', false);
  };
  window._profCloseDelete = function() {
    document.getElementById('prof-delete-overlay')?.classList.remove('show');
  };
  window._profConfirmDelete = async function() {
    const inp = (document.getElementById('prof-delete-confirm-input')?.value || '').trim();
    if (inp !== 'DELETE') { _setStatus('prof-delete-status', 'You must type DELETE exactly.', true); return; }
    const btn = document.getElementById('prof-delete-confirm-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }
    const d = await deleteAccount();
    if (d.error) {
      _setStatus('prof-delete-status', d.error, true);
      if (btn) { btn.disabled = false; btn.textContent = 'Delete Forever'; }
    } else {
      window._profCloseDelete();
      window.__WNCORE_PROFILE = null;
      showToast('Account deleted.', 'info', 5000);
      const sb = await _getSupabase();
      if (sb) await sb.auth.signOut();
      if (typeof showPage === 'function') showPage('home', null);
    }
  };

  // ── Inject into #page-profile ─────────────────────────────────────────────
  const INJECTED_IDS = [
    'prof-signal-integrity',
    'prof-avatar-section','prof-identity-section','prof-node-section',
    'prof-prefs-section','prof-danger-section','prof-delete-overlay'
  ];

  async function _injectSections(profile) {
    const page = document.getElementById('page-profile');
    if (!page) return;
    INJECTED_IDS.forEach(id => document.getElementById(id)?.remove());

    const wrapper = page.querySelector('div[style*="max-width:860px"]');
    if (!wrapper) return;

    // Seed from user email fragment so it's stable per user, but user can override
    const user = _authUser;
    _avatarSeed = (profile?.avatar_seed) || (user?.email?.split('@')[0] || _randomSeed());

    // If user has a saved avatar, set it as the selected one in picker too
    if (profile?.avatar_url && profile.avatar_url.includes('dicebear')) {
      _pendingAvatarUrl = profile.avatar_url;
      // Try to recover style from URL
      const m = profile.avatar_url.match(/9\.x\/([^/]+)\//);
      if (m) _avatarSelectedStyle = m[1];
    }

    const acctSection = wrapper.querySelector(':scope > div:last-child');
    const tmp = document.createElement('div');
    tmp.innerHTML = _buildSections(profile);
    while (tmp.firstChild) wrapper.insertBefore(tmp.firstChild, acctSection);

    // Initial render of avatar grid
    window._profRenderAvatarGrid();
    // Highlight seed input
    const seedInp = document.getElementById('prof-avatar-seed-input');
    if (seedInp) seedInp.value = _avatarSeed;
    // Select style
    window._profSelectAvatar(_avatarSelectedStyle);
  }

  // ── Patch loadProfilePage ─────────────────────────────────────────────────
  const _origLoadProfilePage = window.loadProfilePage || function(){};
  window.loadProfilePage = async function() {
    // Task 3.1: If _authUser is null, Supabase session may not have resolved yet.
    // Wait for it (up to 3s) before giving up and showing signed-out state.
    if (!_authUser) {
      const sb = await _getSupabase().catch(() => null);
      if (sb) {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session?.user) {
            window._authUser = session.user;
            // Also update the module-scoped _authUser via the existing setter
            if (typeof _authUpdateNav === 'function') _authUpdateNav(session.user);
          }
        } catch(e) {}
      }
    }

    _origLoadProfilePage();
    if (!_authUser) { console.warn('[WNCORE profile] no _authUser at profile load'); return; }
    _injectCSS();
    INJECTED_IDS.forEach(id => document.getElementById(id)?.remove());

    // If we already have a cached profile, inject it immediately — zero wait
    const cached = window.__WNCORE_PROFILE;
    if (cached) {
      await _injectSections(cached);
      // Backfill display name / avatar in case they changed
      if (cached.display_name) {
        const dn = document.getElementById('profile-display-name');
        if (dn) dn.textContent = cached.display_name;
      }
      if (cached.avatar_url) {
        const avLg = document.getElementById('profile-avatar-lg');
        if (avLg) {
          const initial = (cached.display_name || _authUser.email || '?')[0].toUpperCase();
          avLg.innerHTML = `<img src="${_esc(cached.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`;
        }
      }
      // Silently refresh in background — update UI only if something changed
      fetchProfile(true).then(profile => {
        if (!profile) return;
        const changed = !cached || profile.avatar_url !== cached.avatar_url || profile.display_name !== cached.display_name;
        if (!changed) return;
        INJECTED_IDS.forEach(id => document.getElementById(id)?.remove());
        _injectSections(profile);
        if (profile.display_name) {
          const dn = document.getElementById('profile-display-name');
          if (dn) dn.textContent = profile.display_name;
        }
        if (profile.avatar_url) {
          const avLg = document.getElementById('profile-avatar-lg');
          if (avLg) {
            const initial = (profile.display_name || _authUser.email || '?')[0].toUpperCase();
            avLg.innerHTML = `<img src="${_esc(profile.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`;
          }
        }
        if (profile.hide_email) {
          const de = document.getElementById('profile-display-email');
          if (de) de.textContent = '••••@••••';
        }
      }).catch(() => {});
      return;
    }

    // No cache yet — show skeleton immediately, then load real data
    await _injectSections(null);

    // Then fetch real data and re-inject
    const profile = await fetchProfile(false).catch(e => { console.warn('[WNCORE profile] fetchProfile error', e); return null; });
    if (profile) {
      INJECTED_IDS.forEach(id => document.getElementById(id)?.remove());
      await _injectSections(profile);
    }

    if (profile?.display_name) {
      const dn = document.getElementById('profile-display-name');
      if (dn) dn.textContent = profile.display_name;
    }
    if (profile?.avatar_url) {
      const avLg = document.getElementById('profile-avatar-lg');
      if (avLg) {
        const initial = (profile.display_name || _authUser.email || '?')[0].toUpperCase();
        avLg.innerHTML = `<img src="${_esc(profile.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initial}'">`;
      }
    }
    if (profile?.hide_email) {
      const de = document.getElementById('profile-display-email');
      if (de) de.textContent = '••••@••••';
    }
  };

  // ── On auth change, warm profile + apply avatar/node ─────────────────────
  document.addEventListener('DOMContentLoaded', async function() {
    if (typeof _authUser !== 'undefined' && _authUser) {
      fetchProfile(false).catch(() => {});
    }
    const sb = await _getSupabase().catch(() => null);
    if (sb) {
      sb.auth.onAuthStateChange((_ev, session) => {
        if (session?.user) {
          window.__WNCORE_PROFILE = null;
          fetchProfile(false).catch(() => {});
        } else {
          window.__WNCORE_PROFILE = null;
        }
      });
    }
  });

})();

// ════════════════════════════════════════════════════════════════════
// bundle_corruption_append.js — ARG Profile Corruption System
// ════════════════════════════════════════════════════════════════════
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
