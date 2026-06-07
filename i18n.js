/**
 * WNCORE i18n — Signal Translation Layer
 * Supports: en, ja, fr, es, de, pt, ar, ko, zh, bn
 * Auto-detects navigator.language on first load.
 * Manual choice saved to localStorage('wncore-lang').
 * RTL applied automatically for Arabic.
 * ARG/horror text intentionally left in English — the signal doesn't localise.
 */

const WNCORE_LANGS = {
  en: { label: 'EN', name: 'English', rtl: false },
  ja: { label: 'JP', name: '日本語', rtl: false },
  fr: { label: 'FR', name: 'Français', rtl: false },
  es: { label: 'ES', name: 'Español', rtl: false },
  de: { label: 'DE', name: 'Deutsch', rtl: false },
  pt: { label: 'PT', name: 'Português', rtl: false },
  ar: { label: 'AR', name: 'العربية', rtl: true },
  ko: { label: 'KR', name: '한국어', rtl: false },
  zh: { label: 'ZH', name: '中文', rtl: false },
  bn: { label: 'BN', name: 'বাংলা', rtl: false },
};

const WNCORE_I18N = {
  // ── Navigation ──────────────────────────────────────────────────────────
  'nav.home':       { en:'Global Array', ja:'グローバル配列', fr:'Tableau Mondial', es:'Red Global', de:'Globales Netz', pt:'Matriz Global', ar:'المصفوفة العالمية', ko:'글로벌 배열', zh:'全球阵列', bn:'গ্লোবাল অ্যারে' },
  'nav.charts':     { en:'Top Charts', ja:'チャート', fr:'Classements', es:'Clasificaciones', de:'Charts', pt:'Paradas', ar:'قوائم الأفضل', ko:'차트', zh:'排行榜', bn:'শীর্ষ চার্ট' },
  'nav.genres':     { en:'Genres', ja:'ジャンル', fr:'Genres', es:'Géneros', de:'Genres', pt:'Gêneros', ar:'الأنواع', ko:'장르', zh:'类型', bn:'ধরন' },
  'nav.anime':      { en:'Anime / J-Music', ja:'アニメ / J-ミュージック', fr:'Anime / J-Music', es:'Anime / J-Music', de:'Anime / J-Musik', pt:'Anime / J-Music', ar:'أنيمي / موسيقى يابانية', ko:'애니메이션 / J-뮤직', zh:'动漫 / J-音乐', bn:'অ্যানিমে / জে-মিউজিক' },
  'nav.podcasts':   { en:'Podcasts', ja:'ポッドキャスト', fr:'Podcasts', es:'Podcasts', de:'Podcasts', pt:'Podcasts', ar:'البودكاست', ko:'팟캐스트', zh:'播客', bn:'পডকাস্ট' },
  'nav.livemusic':  { en:'Live Music', ja:'ライブ音楽', fr:'Musique Live', es:'Música En Vivo', de:'Live-Musik', pt:'Música ao Vivo', ar:'موسيقى مباشرة', ko:'라이브 음악', zh:'现场音乐', bn:'লাইভ মিউজিক' },
  'nav.tv':         { en:'TV', ja:'テレビ', fr:'TV', es:'TV', de:'TV', pt:'TV', ar:'تلفزيون', ko:'TV', zh:'电视', bn:'টিভি' },
  'nav.favourites': { en:'Favourites', ja:'お気に入り', fr:'Favoris', es:'Favoritos', de:'Favoriten', pt:'Favoritos', ar:'المفضلة', ko:'즐겨찾기', zh:'收藏', bn:'পছন্দের' },
  'nav.about':      { en:'About', ja:'について', fr:'À propos', es:'Acerca de', de:'Über uns', pt:'Sobre', ar:'حول', ko:'소개', zh:'关于', bn:'সম্পর্কে' },
  'nav.signin':     { en:'Sign In', ja:'ログイン', fr:'Connexion', es:'Iniciar sesión', de:'Anmelden', pt:'Entrar', ar:'تسجيل الدخول', ko:'로그인', zh:'登录', bn:'সাইন ইন' },
  'nav.signout':    { en:'Sign Out', ja:'ログアウト', fr:'Déconnexion', es:'Cerrar sesión', de:'Abmelden', pt:'Sair', ar:'تسجيل الخروج', ko:'로그아웃', zh:'退出', bn:'সাইন আউট' },

  // ── Hero / Globe ─────────────────────────────────────────────────────────
  'hero.title':     { en:'310 countries.', ja:'310カ国。', fr:'310 pays.', es:'310 países.', de:'310 Länder.', pt:'310 países.', ar:'.310 دولة', ko:'310개국.', zh:'310个国家。', bn:'৩১০টি দেশ।' },
  'hero.subtitle':  { en:'One index.', ja:'ひとつのインデックス。', fr:'Un seul index.', es:'Un índice.', de:'Ein Index.', pt:'Um índice.', ar:'.فهرس واحد', ko:'하나의 인덱스.', zh:'一个索引。', bn:'একটি সূচী।' },
  'hero.desc':      { en:'WNCORE — World Net Core — has been indexing live radio frequencies since 2016. Over 12,000 stations across 310 countries, pulled directly from source. No curation. No editorial layer. Just what\'s on the air.',
                      ja:'WNCORE — ワールド・ネット・コア — は2016年から世界中のライブ無線周波数をインデックスしています。310カ国以上の12,000以上の放送局をソースから直接取得。編集なし。ただ、電波に乗っているものだけ。',
                      fr:'WNCORE — World Net Core — indexe les fréquences radio en direct depuis 2016. Plus de 12 000 stations dans 310 pays, tirées directement de la source. Aucune curation. Aucune couche éditoriale. Juste ce qui est sur les ondes.',
                      es:'WNCORE — World Net Core — indexa frecuencias de radio en vivo desde 2016. Más de 12,000 estaciones en 310 países, obtenidas directamente de la fuente. Sin curaduría. Sin capa editorial. Solo lo que está en el aire.',
                      de:'WNCORE — World Net Core — indiziert seit 2016 Live-Radiofrequenzen. Über 12.000 Sender in 310 Ländern, direkt aus der Quelle. Keine Kuratierung. Kein redaktioneller Layer. Nur was auf Sendung ist.',
                      pt:'WNCORE — World Net Core — indexa frequências de rádio ao vivo desde 2016. Mais de 12.000 estações em 310 países, direto da fonte. Sem curadoria. Sem camada editorial. Apenas o que está no ar.',
                      ar:'WNCORE — World Net Core — يُفهرس ترددات الراديو المباشرة منذ عام 2016. أكثر من 12,000 محطة في 310 دولة، مسحوبة مباشرةً من المصدر. لا انتقاء. لا طبقة تحريرية. فقط ما يُبثّ على الهواء.',
                      ko:'WNCORE — World Net Core — 는 2016년부터 라이브 라디오 주파수를 인덱싱해 왔습니다. 310개국 12,000개 이상의 방송국을 직접 소스에서 가져옵니다. 큐레이션 없음. 편집 없음. 그저 방송 중인 것만.',
                      zh:'WNCORE — World Net Core — 自2016年起索引全球直播电台频率。310个国家超过12,000个电台，直接从源头拉取。无策划。无编辑层。只有正在播出的内容。',
                      bn:'WNCORE — ওয়ার্ল্ড নেট কোর — ২০১৬ সাল থেকে লাইভ রেডিও ফ্রিকোয়েন্সি সূচীবদ্ধ করছে। ৩১০টি দেশে ১২,০০০-এরও বেশি স্টেশন, সরাসরি উৎস থেকে। কোনো সম্পাদনা নেই। শুধু যা বাতাসে আছে।' },
  'hero.stations':  { en:'Stations', ja:'放送局', fr:'Stations', es:'Estaciones', de:'Sender', pt:'Estações', ar:'محطات', ko:'방송국', zh:'电台', bn:'স্টেশন' },
  'hero.countries': { en:'Countries', ja:'カ国', fr:'Pays', es:'Países', de:'Länder', pt:'Países', ar:'دولة', ko:'국가', zh:'国家', bn:'দেশ' },
  'hero.listening': { en:'Listening now', ja:'今聴いている', fr:'À l\'écoute', es:'Escuchando ahora', de:'Gerade live', pt:'Ouvindo agora', ar:'يستمعون الآن', ko:'지금 청취 중', zh:'正在收听', bn:'এখন শুনছেন' },

  // ── Home page sections ───────────────────────────────────────────────────
  'home.ondial':    { en:'On the Dial', ja:'放送中', fr:'Sur les ondes', es:'En el dial', de:'Auf Sendung', pt:'No Dial', ar:'على الهواء', ko:'방송 중', zh:'播出中', bn:'ডায়ালে' },
  'home.seeall':    { en:'See all →', ja:'すべて見る →', fr:'Tout voir →', es:'Ver todo →', de:'Alle anzeigen →', pt:'Ver tudo →', ar:'← عرض الكل', ko:'전체 보기 →', zh:'查看全部 →', bn:'সব দেখুন →' },

  // ── Charts ───────────────────────────────────────────────────────────────
  'charts.title':   { en:'Top Charts', ja:'トップチャート', fr:'Classements', es:'Clasificaciones', de:'Top-Charts', pt:'Paradas', ar:'أفضل القوائم', ko:'인기 차트', zh:'排行榜', bn:'শীর্ষ চার্ট' },
  'charts.desc':    { en:'The most-listened stations on WNCORE right now, updated every hour.', ja:'現在WNCOREで最も聴かれている放送局（毎時更新）。', fr:'Les stations les plus écoutées sur WNCORE, mises à jour chaque heure.', es:'Las estaciones más escuchadas en WNCORE ahora mismo, actualizadas cada hora.', de:'Die meistgehörten Sender auf WNCORE, stündlich aktualisiert.', pt:'As estações mais ouvidas no WNCORE agora, atualizadas a cada hora.', ar:'أكثر المحطات استماعاً على WNCORE الآن، تُحدَّث كل ساعة.', ko:'현재 WNCORE에서 가장 많이 청취되는 방송국, 매시간 업데이트.', zh:'当前WNCORE收听最多的电台，每小时更新。', bn:'এখন WNCORE-এ সবচেয়ে বেশি শোনা স্টেশন, প্রতি ঘণ্টায় আপডেট হয়।' },

  // ── Genres ───────────────────────────────────────────────────────────────
  'genres.title':   { en:'Browse by Genre', ja:'ジャンルで探す', fr:'Parcourir par genre', es:'Explorar por género', de:'Nach Genre durchsuchen', pt:'Navegar por gênero', ar:'تصفح حسب النوع', ko:'장르별 탐색', zh:'按类型浏览', bn:'ধরন অনুযায়ী ব্রাউজ করুন' },
  'genres.desc':    { en:'Every kind of sound, live from around the world.', ja:'世界中からのあらゆる音、ライブで。', fr:'Tous les styles musicaux, en direct du monde entier.', es:'Todo tipo de sonido, en vivo desde todo el mundo.', de:'Jede Art von Klang, live aus aller Welt.', pt:'Todo tipo de som, ao vivo de todo o mundo.', ar:'كل أنواع الصوت، مباشرةً من حول العالم.', ko:'전 세계에서 온 모든 종류의 사운드, 라이브.', zh:'来自全球的各种声音，实时直播。', bn:'পৃথিবীর প্রতিটি কোণ থেকে, সরাসরি সব ধরনের সাউন্ড।' },

  // ── Podcasts ─────────────────────────────────────────────────────────────
  'podcasts.title': { en:'Podcasts & Talk Radio', ja:'ポッドキャスト＆トークラジオ', fr:'Podcasts & Radio parlée', es:'Podcasts y radio hablada', de:'Podcasts & Talksender', pt:'Podcasts e rádio falada', ar:'البودكاست والراديو الحواري', ko:'팟캐스트 & 토크 라디오', zh:'播客与谈话广播', bn:'পডকাস্ট ও টক রেডিও' },

  // ── Live Music ───────────────────────────────────────────────────────────
  'livemusic.title':{ en:'Live Music', ja:'ライブ音楽', fr:'Musique Live', es:'Música En Vivo', de:'Live-Musik', pt:'Música ao Vivo', ar:'موسيقى مباشرة', ko:'라이브 음악', zh:'现场音乐', bn:'লাইভ মিউজিক' },

  // ── TV / IPTV ────────────────────────────────────────────────────────────
  'tv.title':       { en:'WNCORE TV', ja:'WNCOREテレビ', fr:'WNCORE TV', es:'WNCORE TV', de:'WNCORE TV', pt:'WNCORE TV', ar:'تلفزيون WNCORE', ko:'WNCORE TV', zh:'WNCORE 电视', bn:'WNCORE টিভি' },
  'tv.desc':        { en:'Free live television from around the world — streamed directly from public broadcast sources', ja:'世界中の無料ライブテレビ — 公共放送から直接配信', fr:'Télévision en direct gratuite du monde entier — diffusée directement depuis les sources publiques', es:'Televisión en vivo gratuita de todo el mundo — transmitida directamente desde fuentes públicas', de:'Kostenloses Live-TV aus aller Welt — direkt aus öffentlichen Quellen', pt:'Televisão ao vivo gratuita do mundo todo — transmitida diretamente de fontes públicas', ar:'تلفزيون مباشر مجاني من حول العالم — مبثوث مباشرةً من مصادر البث العام', ko:'전 세계 무료 라이브 TV — 공영 방송 소스에서 직접 스트리밍', zh:'来自全球的免费直播电视 — 直接从公共广播源流式传输', bn:'বিশ্বজুড়ে বিনামূল্যে লাইভ টেলিভিশন — সরাসরি সম্প্রচার উৎস থেকে স্ট্রিম করা হয়েছে' },
  'tv.region':      { en:'Region', ja:'地域', fr:'Région', es:'Región', de:'Region', pt:'Região', ar:'المنطقة', ko:'지역', zh:'地区', bn:'অঞ্চল' },
  'tv.all':         { en:'All', ja:'全て', fr:'Tous', es:'Todos', de:'Alle', pt:'Todos', ar:'الكل', ko:'전체', zh:'全部', bn:'সব' },
  'tv.americas':    { en:'Americas', ja:'南北アメリカ', fr:'Amériques', es:'Américas', de:'Amerika', pt:'Américas', ar:'الأمريكتان', ko:'아메리카', zh:'美洲', bn:'আমেরিকাস' },
  'tv.europe':      { en:'Europe', ja:'ヨーロッパ', fr:'Europe', es:'Europa', de:'Europa', pt:'Europa', ar:'أوروبا', ko:'유럽', zh:'欧洲', bn:'ইউরোপ' },
  'tv.asia':        { en:'Asia', ja:'アジア', fr:'Asie', es:'Asia', de:'Asien', pt:'Ásia', ar:'آسيا', ko:'아시아', zh:'亚洲', bn:'এশিয়া' },
  'tv.middleeast':  { en:'Middle East', ja:'中東', fr:'Moyen-Orient', es:'Oriente Medio', de:'Naher Osten', pt:'Oriente Médio', ar:'الشرق الأوسط', ko:'중동', zh:'中东', bn:'মধ্যপ্রাচ্য' },
  'tv.africa':      { en:'Africa', ja:'アフリカ', fr:'Afrique', es:'África', de:'Afrika', pt:'África', ar:'أفريقيا', ko:'아프리카', zh:'非洲', bn:'আফ্রিকা' },
  'tv.oceania':     { en:'Oceania', ja:'オセアニア', fr:'Océanie', es:'Oceanía', de:'Ozeanien', pt:'Oceania', ar:'أوقيانوسيا', ko:'오세아니아', zh:'大洋洲', bn:'ওশেনিয়া' },
  'tv.search':      { en:'Search channels...', ja:'チャンネルを検索...', fr:'Rechercher des chaînes...', es:'Buscar canales...', de:'Sender suchen...', pt:'Buscar canais...', ar:'البحث عن قنوات...', ko:'채널 검색...', zh:'搜索频道...', bn:'চ্যানেল খুঁজুন...' },
  'tv.scanning':    { en:'SCANNING FREQUENCIES', ja:'周波数スキャン中', fr:'SCAN DES FRÉQUENCES', es:'ESCANEANDO FRECUENCIAS', de:'FREQUENZEN SCANNEN', pt:'VARRENDO FREQUÊNCIAS', ar:'مسح الترددات', ko:'주파수 스캔 중', zh:'扫描频率中', bn:'ফ্রিকোয়েন্সি স্ক্যান করা হচ্ছে' },
  'tv.unavailable': { en:'Stream unavailable — broadcaster may be offline or geo-restricted', ja:'ストリームが利用できません — 放送局がオフラインまたは地域制限の可能性があります', fr:'Flux indisponible — le diffuseur peut être hors ligne ou géo-bloqué', es:'Transmisión no disponible — la emisora puede estar fuera de línea o con restricción geográfica', de:'Stream nicht verfügbar — Sender offline oder geo-gesperrt', pt:'Stream indisponível — a emissora pode estar offline ou com restrição geográfica', ar:'البث غير متاح — قد تكون المحطة غير متصلة أو محظورة جغرافياً', ko:'스트림 불가 — 방송국이 오프라인이거나 지역 제한이 있을 수 있습니다', zh:'流不可用 — 广播商可能离线或有地区限制', bn:'স্ট্রিম অনুপলব্ধ — ব্রডকাস্টার অফলাইন বা জিও-রেস্ট্রিক্টেড হতে পারে' },

  // ── Favourites ───────────────────────────────────────────────────────────
  'fav.title':      { en:'Favourites', ja:'お気に入り', fr:'Favoris', es:'Favoritos', de:'Favoriten', pt:'Favoritos', ar:'المفضلة', ko:'즐겨찾기', zh:'收藏', bn:'পছন্দের' },
  'fav.saved':      { en:'Saved Stations', ja:'保存された放送局', fr:'Stations sauvegardées', es:'Estaciones guardadas', de:'Gespeicherte Sender', pt:'Estações salvas', ar:'المحطات المحفوظة', ko:'저장된 방송국', zh:'已保存电台', bn:'সংরক্ষিত স্টেশন' },
  'fav.sync':       { en:'↑ Sync Favourites to Cloud', ja:'↑ お気に入りをクラウドに同期', fr:'↑ Synchroniser les favoris', es:'↑ Sincronizar favoritos', de:'↑ Favoriten synchronisieren', pt:'↑ Sincronizar favoritos', ar:'↑ مزامنة المفضلة', ko:'↑ 즐겨찾기 동기화', zh:'↑ 同步收藏', bn:'↑ পছন্দের সিঙ্ক করুন' },

  // ── Search ───────────────────────────────────────────────────────────────
  'search.placeholder': { en:'Search stations, countries, genres...', ja:'放送局、国、ジャンルを検索...', fr:'Rechercher stations, pays, genres...', es:'Buscar estaciones, países, géneros...', de:'Sender, Länder, Genres suchen...', pt:'Buscar estações, países, gêneros...', ar:'ابحث عن محطات، دول، أنواع...', ko:'방송국, 국가, 장르 검색...', zh:'搜索电台、国家、类型...', bn:'স্টেশন, দেশ, ধরন খুঁজুন...' },

  // ── About ────────────────────────────────────────────────────────────────
  'about.title':    { en:'About WNCORE', ja:'WNCOREについて', fr:'À propos de WNCORE', es:'Acerca de WNCORE', de:'Über WNCORE', pt:'Sobre o WNCORE', ar:'حول WNCORE', ko:'WNCORE 소개', zh:'关于WNCORE', bn:'WNCORE সম্পর্কে' },

  // ── Player ───────────────────────────────────────────────────────────────
  'player.live':    { en:'LIVE', ja:'ライブ', fr:'EN DIRECT', es:'EN VIVO', de:'LIVE', pt:'AO VIVO', ar:'مباشر', ko:'라이브', zh:'直播', bn:'লাইভ' },

  // ── Language selector UI ─────────────────────────────────────────────────
  'lang.select':    { en:'Language', ja:'言語', fr:'Langue', es:'Idioma', de:'Sprache', pt:'Idioma', ar:'اللغة', ko:'언어', zh:'语言', bn:'ভাষা' },

  // ── About stats ──────────────────────────────────────────────────────────
  'about.stations_in_index': { en:'Stations in index', ja:'インデックス内の放送局', fr:'Stations dans l\'index', es:'Estaciones en el índice', de:'Sender im Index', pt:'Estações no índice', ar:'محطات في الفهرس', ko:'인덱스의 방송국', zh:'索引中的电台', bn:'সূচীতে স্টেশন' },
  'about.countries_verified':{ en:'Countries with verified stations', ja:'認証済み放送局のある国', fr:'Pays avec stations vérifiées', es:'Países con estaciones verificadas', de:'Länder mit verifizierten Sendern', pt:'Países com estações verificadas', ar:'دول ذات محطات موثقة', ko:'검증된 방송국이 있는 국가', zh:'拥有已验证电台的国家', bn:'যাচাইকৃত স্টেশন সহ দেশ' },
};

// ── Core translation engine ──────────────────────────────────────────────────
let _currentLang = 'en';

function _detectLang() {
  // 1. Manual override in localStorage
  try {
    const stored = localStorage.getItem('wncore-lang');
    if (stored && WNCORE_LANGS[stored]) return stored;
  } catch(e) {}
  // 2. navigator.language — map full locales to our supported codes
  const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  const map = {
    'ja':'ja','ko':'ko','zh':'zh','zh-cn':'zh','zh-tw':'zh','zh-hk':'zh',
    'fr':'fr','fr-be':'fr','fr-ca':'fr','fr-ch':'fr',
    'es':'es','es-419':'es','es-mx':'es',
    'de':'de','de-at':'de','de-ch':'de',
    'pt':'pt','pt-br':'pt','pt-pt':'pt',
    'ar':'ar','ar-sa':'ar','ar-eg':'ar',
    'bn':'bn','bn-bd':'bn','bn-in':'bn',
  };
  // Try full locale first, then language prefix
  return map[nav] || map[nav.split('-')[0]] || 'en';
}

function t(key) {
  const entry = WNCORE_I18N[key];
  if (!entry) return key;
  return entry[_currentLang] || entry['en'] || key;
}

function applyTranslations(lang) {
  _currentLang = lang;
  const isRTL = WNCORE_LANGS[lang]?.rtl || false;

  // RTL document direction
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;

  // Translate all [data-i18n] text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });

  // Translate [data-i18n-title] for title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });

  // Update IPTV region pills if the TV page has been loaded
  const iptvPills = document.querySelectorAll('.iptv-pill[data-i18n]');
  iptvPills.forEach(pill => {
    pill.textContent = t(pill.dataset.i18n);
  });

  // Update IPTV search placeholder
  const iptvSearch = document.getElementById('iptv-search');
  if (iptvSearch) iptvSearch.placeholder = t('tv.search');

  // Update IPTV scanning text
  const iptvScanning = document.querySelector('.iptv-loading span');
  if (iptvScanning) iptvScanning.textContent = t('tv.scanning');

  // Persist choice
  try { localStorage.setItem('wncore-lang', lang); } catch(e) {}

  // Update selector button label
  const btn = document.getElementById('lang-selector-btn');
  if (btn) {
    const info = WNCORE_LANGS[lang];
    btn.querySelector('.lang-btn-code').textContent = info.label;
  }

  // Mark active item in dropdown
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.lang === lang);
  });
}

// ── Language selector UI ─────────────────────────────────────────────────────
function buildLangSelector() {
  if (document.getElementById('lang-selector')) return;

  const sel = document.createElement('div');
  sel.id = 'lang-selector';
  sel.className = 'lang-selector';
  sel.innerHTML = `
    <button id="lang-selector-btn" class="lang-selector-btn" onclick="toggleLangDropdown()" aria-label="Select language" title="Select language">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
      <span class="lang-btn-code">${WNCORE_LANGS[_currentLang].label}</span>
    </button>
    <div class="lang-dropdown" id="lang-dropdown">
      ${Object.entries(WNCORE_LANGS).map(([code, info]) => `
        <button class="lang-option${code === _currentLang ? ' active' : ''}" data-lang="${code}" onclick="selectLang('${code}')">
          <span class="lang-option-code">${info.label}</span>
          <span class="lang-option-name">${info.name}</span>
        </button>
      `).join('')}
    </div>`;

  // Insert before the sign-in button in header-right
  const authBtn = document.getElementById('nav-auth-btn');
  if (authBtn) authBtn.parentNode.insertBefore(sel, authBtn);

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!sel.contains(e.target)) closeLangDropdown();
  });
}

window.toggleLangDropdown = function() {
  const dd = document.getElementById('lang-dropdown');
  if (dd) dd.classList.toggle('open');
};
window.closeLangDropdown = function() {
  const dd = document.getElementById('lang-dropdown');
  if (dd) dd.classList.remove('open');
};
window.selectLang = function(lang) {
  if (!WNCORE_LANGS[lang]) return;
  applyTranslations(lang);
  closeLangDropdown();
};

// ── Initialise on DOM ready ──────────────────────────────────────────────────
(function init() {
  function run() {
    _currentLang = _detectLang();
    buildLangSelector();
    applyTranslations(_currentLang);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

// Expose for bundle.js use
window.WNCORE_t = t;
window.WNCORE_applyTranslations = applyTranslations;
