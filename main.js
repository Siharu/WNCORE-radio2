/* ═══════════════════════════════════════════════════════
   WNCORE RADIO v3 — MAIN JS
   ARG / Radio hybrid frontend
═══════════════════════════════════════════════════════ */

const _a = "https://all.api.radio-browser.info/json";
const _d = (function(){const p=['s','i','h','a','r','u','.','v','e','r','c','e','l','.','a','p','p'];return 'https://'+p.join('')})();

const audio = document.getElementById('audio');
let isPlaying=false, isDarkMode=false, isMinimal=false;
let currentStation=null, exposure=0, horrorTriggered=false;
let searchFilter='all', searchDebounce, mobileMenuOpen=false;

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
    const offsetX = Math.cos(angle) * Math.min(distance * 0.1, maxOffset);
    const offsetY = Math.sin(angle) * Math.min(distance * 0.1, maxOffset);
    
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
    const offsetX = Math.cos(angle) * Math.min(distance * 0.1, maxOffset);
    const offsetY = Math.sin(angle) * Math.min(distance * 0.1, maxOffset);
    
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
    globeContainer.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    globeContainer.innerHTML = `
      <div style="text-align:center;color:rgba(255,255,255,0.5);padding:20px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="80" height="80" style="opacity:0.4;margin-bottom:12px;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        <div style="font-size:0.7rem;letter-spacing:2px;opacity:0.5;">TAP A STATION TO TUNE IN</div>
      </div>`;
  } else {
    try {
      globe = Globe()(globeContainer)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .atmosphereColor('#1e40af').atmosphereAltitude(0.18)
        .onGlobeClick(async () => {
          updateStatus('SCANNING FREQUENCIES...');exposure+=5;
          try {
            const r=await fetch(`${_a}/stations/search?limit=1&https=true&order=clickcount&reverse=true&offset=${Math.floor(Math.random()*200)}`);
            const d=await r.json();
            if(d[0]) playStation(d[0].url_resolved, d[0].name, d[0].country||'Unknown', '📡');
          } catch(e) { updateStatus('LOCK FAILED — SIGNAL DEGRADED') }
        });
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.35;
      globe.controls().enableZoom = false; // disable zoom to prevent accidental pinch issues
      globe.pointOfView({altitude:2.2});
    } catch(e) {}
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
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text3);font-size:0.8rem;">Loading stations...</td></tr>`;
  try {
    const offset = Math.floor(Math.random()*30); // randomise slightly for variety
    const tag = genre ? `&tag=${encodeURIComponent(genre)}` : '';
    const r = await fetch(`${_a}/stations/search?limit=20&https=true&order=clickcount&reverse=true${tag}&offset=${genre?0:offset}`);
    const d = await r.json();
    renderTable(d, 'station-tbody');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text3);font-size:0.8rem;">Signal degraded. <span style="cursor:pointer;color:var(--accent)" onclick="loadStations('')">Retry</span></td></tr>`;
  }
}

async function loadChartsPage() {
  const tbody = document.getElementById('charts-tbody');
  if(chartsData) { renderTable(chartsData,'charts-tbody'); return; }
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3);font-size:0.8rem;">Loading top charts...</td></tr>`;
  try {
    // Pull from multiple pages and shuffle to get fresh charts each visit
    const offsets = [0, 50, 100];
    const pick = offsets[Math.floor(Math.random()*offsets.length)];
    const r = await fetch(`${_a}/stations/search?limit=50&https=true&order=clickcount&reverse=true&offset=${pick}`);
    const d = await r.json();
    chartsData = d; // cache within session
    renderTable(d, 'charts-tbody');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3);">Signal degraded. <span style="cursor:pointer;color:var(--accent)" onclick="loadChartsPage()">Retry</span></td></tr>`;
  }
}

function renderTable(stations, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';
  stations.forEach((s, i) => {
    const tags = (s.tags||'').split(',').slice(0,2).filter(t=>t.trim()).map(t=>`<span class="st-tag">${t.trim()}</span>`).join('');
    const emoji = getCountryEmoji(s.countrycode);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="st-num">${i+1}</td>
      <td class="st-eq"><div class="st-eq-bars" id="eq-${i}-${tbodyId}"><span></span><span></span><span></span></div></td>
      <td><div class="st-name">${escHtml(s.name)}</div><div class="st-tags">${tags}</div></td>
      <td class="st-country">${escHtml(s.country||'—')}</td>
      <td class="st-bitrate">${s.bitrate?s.bitrate+'k':'—'}</td>
      <td><button class="st-play-btn" aria-label="Play">${SVG.play}</button></td>`;
    tr.onclick = () => playStation(s.url_resolved, s.name, s.country||'Unknown', emoji);
    tbody.appendChild(tr);
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function escHtml(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function getCountryEmoji(code){
  if(!code||code.length!==2) return '📻';
  const o=127397;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c=>c.charCodeAt(0)+o));
}

// ─── PLAYBACK ─────────────────────────────────────────────────────────────
function playStation(url, name, meta, emoji) {
  if(!url) { play887Static(); return; }
  currentStation = {url, name, meta, emoji: emoji||'📻'};
  audio.src = url;
  audio.volume = document.getElementById('vol-slider').value;
  audio.play().then(() => {
    isPlaying = true;
    updateUI(name, meta, emoji||'📻');
  }).catch(() => updateStatus('STREAM UNAVAILABLE'));
  exposure += 8;
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

function play887Static() {
  exposure += 20;
  updateUI('88.7 FM', 'Signal Lost', '📻');
  document.getElementById('np-track').textContent = '— static —';
  // Spooky message always shows when 88.7 is clicked
  setTimeout(() => {
    document.getElementById('np-track').textContent = '"...they lied to us... send help... any way possible..."';
  }, 2800);
}

function updateUI(name, meta, emoji) {
  document.getElementById('pb-name').textContent = name;
  document.getElementById('np-name').textContent = name;
  document.getElementById('pb-meta').textContent = meta;
  document.getElementById('np-meta').textContent = meta;
  // SVG radio icon in player art instead of emoji
  document.getElementById('pb-art').innerHTML = SVG.radio;
  document.getElementById('np-art-icon').innerHTML = SVG.radio;
  document.getElementById('np-track').textContent = '— receiving signal —';
  document.getElementById('np-fill').classList.add('playing');
  document.getElementById('pb-fill').classList.add('playing');
  document.getElementById('pb-eq').classList.add('playing');
  setPlayIcon(true);
}
function updateStatus(msg) { document.getElementById('pb-name').textContent = msg; }

const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_PAUSE = '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>';
function setPlayIcon(playing) {
  document.getElementById('pb-play-icon').innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  document.getElementById('np-play-icon').innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
}

function togglePlay() {
  if(!currentStation) return;
  if(isPlaying) {
    audio.pause(); isPlaying=false; setPlayIcon(false);
    ['pb-eq','pb-fill','np-fill'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('playing')});
  } else {
    audio.play(); isPlaying=true; setPlayIcon(true);
    ['pb-eq','pb-fill','np-fill'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('playing')});
  }
}

function toggleFavorite(btn) {
  btn.classList.toggle('active');
  const isNowActive = btn.classList.contains('active');
  btn.innerHTML = isNowActive ? SVG.heartFill : SVG.heart;
  btn.style.color = isNowActive ? '#e8753a' : '';
  // Persist to localStorage
  if(currentStation) {
    const favs = JSON.parse(localStorage.getItem('wncore_favs')||'[]');
    if(isNowActive) {
      if(!favs.find(f=>f.url===currentStation.url)) {
        favs.push({url:currentStation.url,name:currentStation.name,meta:currentStation.meta,emoji:currentStation.emoji||'📻'});
        localStorage.setItem('wncore_favs', JSON.stringify(favs));
        showToast && showToast('Station saved to Favourites', 'success');
      }
    } else {
      const idx = favs.findIndex(f=>f.url===currentStation.url);
      if(idx>-1){ favs.splice(idx,1); localStorage.setItem('wncore_favs',JSON.stringify(favs)); }
    }
  }
}
function toggleSleepTimer(btn) {
  btn.classList.toggle('active');
  if(btn.classList.contains('active')) updateStatus('TIMER: 30M');
  else if(currentStation) updateStatus(currentStation.name);
}

document.getElementById('vol-slider').addEventListener('input', e => { audio.volume = e.target.value; });

// ─── THEME ────────────────────────────────────────────────────────────────
function toggleDark() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-mode', isDarkMode);
  try { localStorage.setItem('wncore-dark', isDarkMode?'1':'0'); } catch(e){}
}
try {
  if(localStorage.getItem('wncore-dark')==='1') {
    isDarkMode=true; document.body.classList.add('dark-mode');
  }
} catch(e){}

// ─── SKIP STATION ─────────────────────────────────────────────────────────
let _lastStations = [];
async function skipStation(dir) {
  if(_lastStations.length < 2) {
    try {
      const r = await fetch(`${_a}/stations/search?limit=20&https=true&order=clickcount&reverse=true`);
      _lastStations = await r.json();
    } catch(e) { return; }
  }
  const idx = Math.floor(Math.random() * _lastStations.length);
  const s = _lastStations[idx];
  if(s) playStation(s.url_resolved, s.name, s.country||'Unknown', getCountryEmoji(s.countrycode));
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

// ─── MOBILE MENU ──────────────────────────────────────────────────────────
function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  const nav = document.getElementById('mobile-nav');
  const btn = document.getElementById('mobile-menu-btn');
  nav.classList.toggle('open', mobileMenuOpen);
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
      el.innerHTML = `<div class="sr-icon">${emoji}</div><div><div class="sr-name">${escHtml(s.name)}</div><div class="sr-meta">${escHtml(s.country||'—')} · ${(s.tags||'').split(',').slice(0,2).filter(Boolean).join(', ')||'Radio'} · ${s.bitrate?s.bitrate+'kbps':'—'}</div></div>`;
      el.onclick = () => { playStation(s.url_resolved, s.name, s.country||'Unknown', emoji); closeSearch(); };
      results.appendChild(el);
    });
  } catch(e) { results.innerHTML='<div class="search-empty">Signal degraded — try again</div>'; }
}

// ─── PAGE SWITCHING ───────────────────────────────────────────────────────
function showPage(id, linkEl) {
  // Load page-specific data
  if(id==='favorites') loadFavoritesPage();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('nav a, .mobile-nav a').forEach(a=>a.classList.remove('active'));
  if(linkEl) linkEl.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='charts') loadChartsPage();
  if(id==='podcasts') loadPodcastsPage();
  if(id==='genres') loadGenrePage();
  if(id==='anime') loadAnimePage();
  if(id==='about') initAboutEerie();
  if(id==='livemusic') loadLiveMusicPage();
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
function refreshAnimeImages() {
  const strip = document.getElementById('anime-img-strip');
  const shuffled = [...ANIME_IMGS].sort(()=>Math.random()-0.5);
  strip.innerHTML='';
  shuffled.forEach(src => {
    const img=document.createElement('img'); img.className='anime-img-real';
    img.src=src; img.alt=''; img.loading='lazy';
    img.onerror=function(){this.style.display='none'};
    img.onclick=()=>{document.getElementById('anime-banner-img').src=src};
    strip.appendChild(img);
  });
}
function playAnimeStation(idx) {
  const s = ANIME_STATIONS[idx];
  playStation(s.url, s.name, s.desc, s.emoji);
  const badge = document.getElementById('anime-now-playing-badge');
  badge.style.display='flex'; badge.textContent='▶ '+s.name;
}
async function loadAnimeStationsLive() {
  const tbody = document.getElementById('anime-live-tbody');
  tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text3);font-size:0.8rem;">Scanning frequencies...</td></tr>`;
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
      card.onclick=()=>playStation(s.url_resolved||s.url, s.name, s.country||s.desc, '🎙');
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

function handleSignIn() {
  const email = document.getElementById('signin-email').value.trim();
  const pass = document.getElementById('signin-pass').value.trim();
  if(!email||!pass) {
    if(!email) document.getElementById('signin-email').style.borderColor='var(--accent)';
    if(!pass) document.getElementById('signin-pass').style.borderColor='var(--accent)';
    return;
  }
  // Trigger eerie email horror terminal
  document.getElementById('signin-modal').classList.remove('open');
  triggerEmailHorror(email);
}

function handleCreateAccount() {
  const email = document.getElementById('signin-email').value.trim();
  const pass = document.getElementById('signin-pass').value.trim();
  if(!email) { document.getElementById('signin-email').style.borderColor='var(--accent)'; return; }
  document.getElementById('signin-modal').classList.remove('open');
  triggerEmailHorror(email);
}

// OAuth — link to actual dashboards
function oauthGoogle() {
  window.open('https://myaccount.google.com/', '_blank');
}
function oauthApple() {
  window.open('https://appleid.apple.com/', '_blank');
}
function oauthDiscord() {
  window.open('https://discord.com/channels/@me', '_blank');
}

// ─── EMAIL HORROR TERMINAL ────────────────────────────────────────────────
function triggerEmailHorror(email) {
  const overlay = document.getElementById('email-horror-overlay');
  const termText = document.getElementById('email-terminal-text');
  overlay.classList.add('show');
  termText.innerHTML = '';
  exposure += 25;

  // Partially scramble the email for effect
  const scrambled = email.split('').map(c => Math.random()<0.4 ? String.fromCharCode(c.charCodeAt(0)^(Math.floor(Math.random()*15)+1)) : c).join('');

  const lines = [
    {t:`<span class="et-dim">$ WNCORE_AUTH --register --email "${email}"</span>`,d:0},
    {t:`<span class="et-dim">connecting to auth.wncoreradio.net...</span>`,d:400},
    {t:`<span class="et-white">[ OK ] TLS handshake complete</span>`,d:900},
    {t:`<span class="et-dim">sending credentials to node_09...</span>`,d:1400},
    {t:`<span class="et-white">[ OK ] packet dispatched</span>`,d:1800},
    {t:``,d:2000},
    {t:`<span class="et-err">EXCEPTION: ROUTING_ANOMALY</span>`,d:2100},
    {t:`<span class="et-err">packet intercepted at relay 88.700 MHz</span>`,d:2400},
    {t:`<span class="et-dim">attempting recovery...</span>`,d:2700},
    {t:``,d:2900},
    {t:`<span class="et-err">ERROR: memory segment 0x${Math.floor(Math.random()*0xFFFF).toString(16).toUpperCase()} corrupted</span>`,d:3000},
    {t:`<span class="et-dim">dumping stack trace:</span>`,d:3300},
    {t:`<span class="et-dim">&nbsp;&nbsp;&nbsp;&gt; auth_dispatch() [node_09/core/auth.c:247]</span>`,d:3500},
    {t:`<span class="et-dim">&nbsp;&nbsp;&nbsp;&gt; relay_forward() [signal_kage/intercept.c:88]</span>`,d:3700},
    {t:`<span class="et-dim">&nbsp;&nbsp;&nbsp;&gt; ██████████::██████(${scrambled})</span>`,d:3900},
    {t:`<span class="et-dim">&nbsp;&nbsp;&nbsp;&gt; [CALL STACK OVERFLOW]</span>`,d:4100},
    {t:``,d:4300},
    {t:`<span class="et-err">CRITICAL: account data written to unknown sink</span>`,d:4400},
    {t:`<span class="et-dim">destination: [REDACTED] ██████████ [REDACTED]</span>`,d:4700},
    {t:`<span class="et-err">SIGNAL_KAGE has your data.</span>`,d:5100},
    {t:``,d:5400},
    {t:`<span class="et-dim">returning to base... <span class="et-cursor">_</span></span>`,d:5700},
  ];

  lines.forEach(({t,d}) => {
    setTimeout(()=>{
      const line=document.createElement('div'); line.innerHTML=t||'&nbsp;';
      termText.appendChild(line); termText.scrollTop=termText.scrollHeight;
    }, d);
  });

  // Auto-dismiss and go home
  setTimeout(()=>{
    overlay.classList.remove('show');
    termText.innerHTML='';
    // Flash screen
    const f=document.createElement('div');
    f.style.cssText='position:fixed;inset:0;background:#fff;z-index:99999;opacity:0.8;transition:opacity 0.5s;pointer-events:none';
    document.body.appendChild(f);
    setTimeout(()=>{f.style.opacity='0';setTimeout(()=>f.remove(),500)},80);
    // Bump exposure to escalate horror
    exposure+=15;
    checkHorrorStage();
  }, 6800);
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
setInterval(()=>{ if(isPlaying){exposure+=1; checkHorrorStage()} },5000);
setInterval(()=>{ exposure+=0.5; checkHorrorStage(); },12000);

function checkHorrorStage() {
  if(HORROR.stage<1&&exposure>=15){HORROR.stage=1;startStage1()}
  if(HORROR.stage<2&&exposure>=30){HORROR.stage=2;startStage2()}
  // Full horror sequence only triggers when clicking 88.7 FM, not automatically
}

function startStage1() {
  setInterval(()=>{ if(HORROR.stage>=1&&Math.random()<(isDarkMode?0.12:0.28)) triggerMicroGlitch(); },8000);
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
  const i = isDarkMode?1:2;
  document.body.style.transform=`translate(${(Math.random()-0.5)*i*4}px,${(Math.random()-0.5)*i}px)`;
  document.body.style.filter=`hue-rotate(${Math.random()*8}deg) contrast(${100+Math.random()*10}%)`;
  setTimeout(()=>{document.body.style.transform='';document.body.style.filter=''},80+Math.random()*60);
}

function insertTickerAnomaly(text) {
  const inner=document.getElementById('ticker-inner'); if(!inner) return;
  const s=document.createElement('span'); s.className='t-warn'; s.textContent=' ⚠ '+text+' ⚠ ';
  inner.insertBefore(s,inner.firstChild); inner.appendChild(s.cloneNode(true));
}

// ─── TAB VISIBILITY REDIRECT ──────────────────────────────────────────────
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden&&exposure>10){
    const p=isDarkMode?0.30:0.10;
    if(Math.random()<p){setTimeout(()=>{try{window.location.href=_d}catch(e){}},420)}
  }
});

// ─── HORROR SEQUENCE (stage 3) ────────────────────────────────────────────
function triggerHorrorSequence() {
  horrorTriggered=true;
  const overlay=document.getElementById('horror-overlay');
  const terminal=document.getElementById('horror-terminal');
  overlay.classList.add('show');
  const lines=[
    {t:'WNCORE SIGNAL MONITOR v2.1',d:0},{t:'————————————————————————',d:600},
    {t:'',d:800},{t:'CRITICAL ANOMALY DETECTED.',d:1000,r:true},{t:'',d:1600},
    {t:'SOURCE FREQ : 88.700 MHz',d:1800},{t:'ORIGIN NODE : 09',d:2200},
    {t:'CALLSIGN &nbsp;&nbsp;: <span style="letter-spacing:2px">SIGNAL_KAGE</span>',d:2600},
    {t:'STATUS &nbsp;&nbsp;&nbsp;&nbsp;: CARRIER CONFIRMED',d:3000,r:true},{t:'',d:3400},
    {t:'BYPASSING AUTHENTICATION LAYER...',d:3600},
    {t:'<span style="color:rgba(200,71,42,0.5)">ACCESS GRANTED</span>',d:4400},{t:'',d:4600},
    {t:'ROUTING TO ARCHIVE...',d:4800},{t:'<span class="h-cursor">_</span>',d:5400},
  ];
  lines.forEach(({t,d,r})=>{
    setTimeout(()=>{terminal.innerHTML+=`<div style="${r?'color:#ff5533;':''}">${t}</div>`;terminal.scrollTop=terminal.scrollHeight;},d);
  });
  setTimeout(()=>{overlay.classList.remove('show');showDataCorruptedTerminal();},6500);
}

// ─── DATA CORRUPT TERMINAL ────────────────────────────────────────────────
const CORRUPT_LINES = [
  {t:'<span class="ct-red">DATA CORRUPTED</span>',d:0},
  {t:'<span class="ct-dim">initializing recovery protocol...</span>',d:500},
  {t:'',d:700},
  {t:'<span class="ct-dim">scanning memory block 0x00FF3A...</span>',d:900},
  {t:'<span class="ct-red">ERROR: integrity check failed</span>',d:1400},
  {t:'<span class="ct-dim">attempting fallback read...</span>',d:1900},
  {t:'',d:2100},
  {t:'<span class="ct-white">RECOVERED FRAGMENT [node_09/blacksite/log_2016.arc]</span>',d:2300},
  {t:'<span class="ct-dim">——————————————————————————</span>',d:2700},
  {t:'<span class="ct-dim">they told us 88.7 was decommissioned.</span>',d:3000},
  {t:'<span class="ct-dim">it was never decommissioned.</span>',d:3600},
  {t:'<span class="ct-red">SIGNAL_KAGE is still broadcasting.</span>',d:4200},
  {t:'<span class="ct-dim">we don\'t know to whom.</span>',d:4800},
  {t:'',d:5100},
  {t:'<span class="ct-dim">coordinates: [REDACTED]  [REDACTED]</span>',d:5300},
  {t:'<span class="ct-dim">last ping: right now.</span>',d:5800},
  {t:'',d:6000},
  {t:'<span class="ct-red ct-glitch">YOU ARE BEING WATCHED.</span>',d:6400},
  {t:'<span class="ct-dim">——————————————————————————</span>',d:6900},
  {t:'<span class="ct-dim">closing fragment... </span><span class="ct-red">unable to close.</span>',d:7200},
  {t:'<span class="ct-red">IT KNOWS YOU\'RE HERE.</span>',d:7900},
  {t:'',d:8200},
];

function showDataCorruptedTerminal() {
  const o=document.getElementById('data-corrupt-overlay');
  const t=document.getElementById('corrupt-terminal-text');
  o.classList.add('show'); t.innerHTML='';
  CORRUPT_LINES.forEach(({t:txt,d})=>{
    setTimeout(()=>{const line=document.createElement('div');line.innerHTML=txt||(txt===''?'&nbsp;':txt);t.appendChild(line);t.scrollTop=t.scrollHeight;},d);
  });
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
  if(!eyeActive){eyeAnimFrame=null;return}
  const idle=(Date.now()-lastMouseMove)>2000;
  if(eyeExitTriggered){tX=0;tY=0}
  else if(idle){tX=0;tY=0}
  else{
    const cx=window.innerWidth/2,cy=window.innerHeight/2;
    const maxR=Math.min(window.innerWidth,window.innerHeight)*0.05;
    const dx=mouseX-cx,dy=mouseY-cy;
    const angle=Math.atan2(dy,dx),dist=Math.min(Math.hypot(dx,dy)*0.12,maxR);
    tX=Math.cos(angle)*dist;tY=Math.sin(angle)*dist;
  }
  const jX=(Math.random()-0.5)*1.5,jY=(Math.random()-0.5)*1.5;
  const speed=eyeExitTriggered?0.02:(idle?0.04:0.08);
  pX=lerp(pX,tX,speed);pY=lerp(pY,tY,speed);
  pupil.style.transform=`translate(calc(-50% + ${pX+jX}px), calc(-50% + ${pY+jY}px))`;
  eyeAnimFrame=requestAnimationFrame(animateEye);
}

let audioCtx,sourceNode,waveshaper,lowpass,gainNode;
function initAudioFX(){
  if(!audioCtx){
    try{
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      sourceNode=audioCtx.createMediaElementSource(audio);
      waveshaper=audioCtx.createWaveShaper();lowpass=audioCtx.createBiquadFilter();gainNode=audioCtx.createGain();
      lowpass.type='lowpass';lowpass.frequency.value=20000;waveshaper.curve=makeDistortionCurve(0);waveshaper.oversample='4x';
      sourceNode.connect(waveshaper);waveshaper.connect(lowpass);lowpass.connect(gainNode);gainNode.connect(audioCtx.destination);
    }catch(e){}
  }
  if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
}
function makeDistortionCurve(amount){
  let k=typeof amount==='number'?amount:50,n=44100,c=new Float32Array(n),deg=Math.PI/180;
  for(let i=0;i<n;++i){let x=i*2/n-1;c[i]=(3+k)*x*20*deg/(Math.PI+k*Math.abs(x))}return c;
}

exitBtn.addEventListener('click',()=>{
  if(eyeExitTriggered)return;eyeExitTriggered=true;exitBtn.style.display='none';
  flash.style.transition='opacity 0.06s';flash.style.opacity='1';
  setTimeout(()=>{flash.style.transition='opacity 0.4s';flash.style.opacity='0';},80);
  setTimeout(()=>{spookyText.style.opacity='1';spookyText.classList.add('glitch-text');},2200);
  if(isPlaying){
    initAudioFX();
    if(audioCtx){
      let distAmt=0;const distInt=setInterval(()=>{distAmt+=15;waveshaper.curve=makeDistortionCurve(distAmt);if(distAmt>=400)clearInterval(distInt)},100);
      const now=audioCtx.currentTime;lowpass.frequency.setValueAtTime(20000,now);lowpass.frequency.exponentialRampToValueAtTime(300,now+3);
      const wobbleInt=setInterval(()=>{audio.playbackRate=1+(Math.random()-0.5)*0.4},200);
      const volInt=setInterval(()=>{gainNode.gain.value=Math.random()>0.3?1:0},150);
      setTimeout(()=>{clearInterval(wobbleInt);clearInterval(volInt);audio.pause();},6000);
    }
  }
  setTimeout(()=>{window.location.href=_d},7000);
});

function showEyes(){
  eyeActive=true;eyeExitTriggered=false;
  pX=0;pY=0;tX=0;tY=0;mouseX=window.innerWidth/2;mouseY=window.innerHeight/2;lastMouseMove=Date.now();
  exitBtn.style.display='';spookyText.style.opacity='0';spookyText.classList.remove('glitch-text');flash.style.opacity='0';
  if(eyeAnimFrame)cancelAnimationFrame(eyeAnimFrame);
  eyeSys.classList.add('active');
  animateEye();
}

// Random eye trigger (every 45s check after exposure > 5)
let randomEyeTriggered=false;
setInterval(()=>{
  if(randomEyeTriggered||horrorTriggered||eyeActive)return;
  if(exposure<5)return;
  const p=isDarkMode?0.30:0.10;
  if(Math.random()<p){
    randomEyeTriggered=true;
    showDataCorruptedTerminal();
    setTimeout(()=>{randomEyeTriggered=false;},120000);
  }
},45000);

// ─── LIVE FLUCTUATION ─────────────────────────────────────────────────────
setInterval(()=>{const el=document.getElementById('live-count');if(el)el.textContent=`${(12841+Math.floor(Math.random()*40)-20).toLocaleString()} live`;},7000);
// Real listener count from Radio Browser stats API
(async function fetchRealListenerCount(){
  try {
    const r = await fetch('https://all.api.radio-browser.info/json/stats');
    const d = await r.json();
    if (d && d.clicks_last_hour) {
      const count = parseInt(d.clicks_last_hour, 10);
      const fmt = count >= 1000 ? Math.round(count/1000)+'K' : count.toString();
      const el = document.getElementById('listener-count');
      if (el) el.textContent = fmt;
    }
  } catch(e) {}
  // Gentle drift every 90s
  setInterval(async function(){
    try {
      const r = await fetch('https://all.api.radio-browser.info/json/stats');
      const d = await r.json();
      if (d && d.clicks_last_hour) {
        const count = parseInt(d.clicks_last_hour, 10);
        const fmt = count >= 1000 ? Math.round(count/1000)+'K' : count.toString();
        const el = document.getElementById('listener-count');
        if (el) el.textContent = fmt;
      }
    } catch(e) {}
  }, 90000);
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
buildGenreStrip();
loadStations();

// ═══════════════════════════════════════════════════════
//   WNCORE LIVE MUSIC CHANNEL
//   Pulls copyright/royalty-free music streams
// ═══════════════════════════════════════════════════════

const LM_CHANNELS = [
  {
    id:'jazz',
    name:'WNCORE Jazz',
    genre:'Jazz',
    desc:'SomaFM Groove Salad + Radio Swiss Jazz — cool jazz, bebop, smooth sessions.',
    license:'CC by-nc-nd',
    color:'rgba(200,130,42,0.12)',
    fgColor:'#c8822a',
    icon:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    stations:[
      {url:'https://stream.soma.fm/groovesalad256.mp3',   name:'SomaFM Groove Salad',  src:'SomaFM'},
      {url:'https://stream.soma.fm/groovesalad.mp3',      name:'SomaFM Groove Salad',  src:'SomaFM'},
      {url:'https://www.radioswissjazz.ch/live/mp3_128.m3u', name:'Radio Swiss Jazz', src:'Radio Swiss'},
      {url:'https://listen.181fm.com/181-jazz_128k.mp3',  name:'181.fm Jazz',          src:'181.fm'},
    ]
  },
  {
    id:'classical',
    name:'WNCORE Classical',
    genre:'Classical',
    desc:'Radio Swiss Classic and symphonic streams — orchestral, chamber, opera.',
    license:'Public service',
    color:'rgba(37,99,235,0.08)',
    fgColor:'#2563eb',
    icon:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/>',
    stations:[
      {url:'https://www.radioswissclassic.ch/live/mp3_128.m3u', name:'Radio Swiss Classic', src:'Radio Swiss'},
      {url:'https://listen.181fm.com/181-classical_128k.mp3',   name:'181.fm Classical',    src:'181.fm'},
      {url:'https://stream.soma.fm/thetrip128.mp3',             name:'SomaFM The Trip',     src:'SomaFM'},
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
      {url:'https://stream.soma.fm/spacestation128.mp3', name:'SomaFM Space Station', src:'SomaFM'},
      {url:'https://stream.soma.fm/dronezone128.mp3',    name:'SomaFM Drone Zone',    src:'SomaFM'},
      {url:'https://stream.soma.fm/thetrip128.mp3',      name:'SomaFM The Trip',      src:'SomaFM'},
      {url:'https://stream.soma.fm/deepspaceone.mp3',    name:'SomaFM Deep Space One',src:'SomaFM'},
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
      {url:'https://stream.soma.fm/beatblender128.mp3',    name:'SomaFM Beat Blender',   src:'SomaFM'},
      {url:'https://stream.soma.fm/u80s128.mp3',           name:'SomaFM Underground 80s', src:'SomaFM'},
      {url:'https://stream.soma.fm/defcon128.mp3',         name:'SomaFM DEF CON Radio',   src:'SomaFM'},
      {url:'https://stream.soma.fm/illstreet128.mp3',      name:'SomaFM Illinois Street', src:'SomaFM'},
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
      {url:'https://stream.soma.fm/folkfwd128.mp3',    name:'SomaFM Folk Forward',    src:'SomaFM'},
      {url:'https://stream.soma.fm/covers128.mp3',     name:'SomaFM Covers',          src:'SomaFM'},
      {url:'https://stream.soma.fm/reggae128.mp3',     name:'SomaFM Reggae',          src:'SomaFM'},
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
      {url:'https://radio.plaza.one/mp3',              name:'Nightwave Plaza',        src:'Nightwave'},
      {url:'https://ice1.somafm.com/lush-128-mp3',     name:'SomaFM Lush',            src:'SomaFM'},
      {url:'https://stream.soma.fm/fluid128.mp3',      name:'SomaFM Fluid',           src:'SomaFM'},
      {url:'https://pool.nightwave.io/plaza.mp3',      name:'Nightwave Lo-Fi',        src:'Nightwave'},
    ]
  },
  {
    id:'chillout',
    name:'WNCORE Chillout',
    genre:'Chill · Downtempo · Relax',
    desc:'SomaFM Secret Agent, Illinois Street — smooth downtempo and chill-out.',
    license:'CC by-nc-nd',
    color:'rgba(20,150,120,0.08)',
    fgColor:'#0d9488',
    icon:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    stations:[
      {url:'https://stream.soma.fm/secretagent128.mp3',  name:'SomaFM Secret Agent',   src:'SomaFM'},
      {url:'https://stream.soma.fm/missioncontrol.mp3',  name:'SomaFM Mission Control', src:'SomaFM'},
      {url:'https://stream.soma.fm/cliqhop128.mp3',      name:'SomaFM cliqhop idm',    src:'SomaFM'},
      {url:'https://stream.soma.fm/dubstep128.mp3',      name:'SomaFM Dubstep',         src:'SomaFM'},
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
const lmAudio = new Audio();
lmAudio.crossOrigin = 'anonymous';

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

function buildLmGrid() {
  const grid = document.getElementById('lm-grid');
  if(!grid) return;
  const channels = LM_CHANNELS.filter(c=>c.id!=='all');
  const fakeListeners = () => Math.floor(800 + Math.random() * 3200);
  grid.innerHTML = channels.map(ch => `
    <div class="lm-card" id="lm-card-${ch.id}"
      style="--lm-color:${ch.color};--lm-color-bg:${ch.color};--lm-color-fg:${ch.fgColor}"
      onclick="lmPlayChannel('${ch.id}')">
      <div class="lm-card-top">
        <div class="lm-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20">${ch.icon}</svg>
        </div>
        <div>
          <div class="lm-card-name">${ch.name}</div>
          <div class="lm-card-genre">${ch.genre}</div>
        </div>
      </div>
      <div class="lm-card-desc">${ch.desc}</div>
      <div class="lm-card-meta">
        <div class="lm-card-listeners"><div class="lm-live-dot"></div>${fakeListeners().toLocaleString()} listening</div>
        <div class="lm-card-license">${ch.license}</div>
      </div>
    </div>
  `).join('');
}

function lmSelectChannel(btn, chId) {
  document.querySelectorAll('.lm-ch-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  lmPlayChannel(chId);
}

function lmPlayChannel(chId) {
  const ch = LM_CHANNELS.find(c=>c.id===chId);
  if(!ch || !ch.stations.length) return;
  lmCurrentChannel = ch;
  lmCurrentStationIdx = Math.floor(Math.random() * ch.stations.length);
  lmStartStation();
}

function lmStartStation() {
  if(!lmCurrentChannel) return;
  const station = lmCurrentChannel.stations[lmCurrentStationIdx];
  lmAudio.src = station.url;
  lmAudio.play().then(()=>{
    lmIsPlaying = true;
    lmUpdateUI(station);
    lmSetWaveformState(true);
    // Spike wrongness when music starts
    if(window.WRONGNESS) window.WRONGNESS.spike(5);
  }).catch(()=>{
    // Try next station
    lmCurrentStationIdx = (lmCurrentStationIdx + 1) % lmCurrentChannel.stations.length;
    lmStartStation();
  });
}

function lmUpdateUI(station) {
  const ch = lmCurrentChannel;
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
  if(!lmCurrentChannel) {
    // Auto-start all channels
    lmPlayChannel('all');
    return;
  }
  if(lmIsPlaying) {
    lmAudio.pause();
    lmIsPlaying = false;
    const iconEl = document.getElementById('lm-play-icon');
    if(iconEl) iconEl.setAttribute('d','M8 5v14l11-7z');
    const npCard = document.getElementById('lm-np-card');
    if(npCard) npCard.classList.remove('playing');
    lmSetWaveformState(false);
  } else {
    lmAudio.play().then(()=>{
      lmIsPlaying = true;
      const station = lmCurrentChannel.stations[lmCurrentStationIdx];
      lmUpdateUI(station);
      lmSetWaveformState(true);
    }).catch(()=>{ lmCurrentStationIdx=0; lmStartStation(); });
  }
}

function lmNext() {
  if(!lmCurrentChannel) return;
  lmCurrentStationIdx = (lmCurrentStationIdx + 1) % lmCurrentChannel.stations.length;
  lmStartStation();
}

function lmShuffle() {
  if(!lmCurrentChannel) { lmPlayChannel('all'); return; }
  const idx = Math.floor(Math.random() * lmCurrentChannel.stations.length);
  lmCurrentStationIdx = idx;
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
  const hdr = document.querySelector('.header-right');
  if(!hdr || document.getElementById('header-clock')) return;
  const clock = document.createElement('div');
  clock.id = 'header-clock';
  clock.className = 'header-clock minimal-hidden';
  hdr.prepend(clock);
  function tick() {
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2,'0');
    const m = String(now.getUTCMinutes()).padStart(2,'0');
    const s = String(now.getUTCSeconds()).padStart(2,'0');
    clock.innerHTML = `<span>${h}:${m}:${s}</span> UTC`;
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
