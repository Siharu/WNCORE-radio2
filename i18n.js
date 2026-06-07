/**
 * WNCORE i18n — Signal Translation Layer
 * Supports: en, ja, fr, es, de, pt, ko, zh, bn, hi, tl, ceb, vi, th
 * Auto-detects navigator.language on first load.
 * Manual choice saved to localStorage('wncore-lang').
 * ARG/horror text intentionally left in English — the signal doesn't localise.
 */

const WNCORE_LANGS = {
  en:  { label: 'EN',  name: 'English',    rtl: false },
  ja:  { label: 'JP',  name: '日本語',      rtl: false },
  fr:  { label: 'FR',  name: 'Français',   rtl: false },
  es:  { label: 'ES',  name: 'Español',    rtl: false },
  de:  { label: 'DE',  name: 'Deutsch',    rtl: false },
  pt:  { label: 'PT',  name: 'Português',  rtl: false },
  ko:  { label: 'KR',  name: '한국어',      rtl: false },
  zh:  { label: 'ZH',  name: '中文',        rtl: false },
  bn:  { label: 'BN',  name: 'বাংলা',       rtl: false },
  hi:  { label: 'HI',  name: 'हिन्दी',       rtl: false },
  tl:  { label: 'TL',  name: 'Tagalog',    rtl: false },
  ceb: { label: 'CEB', name: 'Bisaya',     rtl: false },
  vi:  { label: 'VI',  name: 'Tiếng Việt', rtl: false },
  th:  { label: 'TH',  name: 'ภาษาไทย',    rtl: false },
};

const WNCORE_I18N = {
  // ── Navigation ──────────────────────────────────────────────────────────
  'nav.home':       { en:'Global Array', ja:'グローバル配列', fr:'Tableau Mondial', es:'Red Global', de:'Globales Netz', pt:'Matriz Global', ko:'글로벌 배열', zh:'全球阵列', bn:'গ্লোবাল অ্যারে', hi:'वैश्विक सरणी', tl:'Pandaigdigang Array', ceb:'Global Array', vi:'Mạng Lưới Toàn Cầu', th:'เครือข่ายทั่วโลก' },
  'nav.charts':     { en:'Top Charts', ja:'チャート', fr:'Classements', es:'Clasificaciones', de:'Charts', pt:'Paradas', ko:'차트', zh:'排行榜', bn:'শীর্ষ চার্ট', hi:'टॉप चार्ट', tl:'Nangungunang Tsart', ceb:'Top Charts', vi:'Bảng Xếp Hạng', th:'ชาร์ตยอดนิยม' },
  'nav.genres':     { en:'Genres', ja:'ジャンル', fr:'Genres', es:'Géneros', de:'Genres', pt:'Gêneros', ko:'장르', zh:'类型', bn:'ধরন', hi:'शैलियाँ', tl:'Mga Genre', ceb:'Mga Genre', vi:'Thể Loại', th:'ประเภทเพลง' },
  'nav.anime':      { en:'Anime / J-Music', ja:'アニメ / J-ミュージック', fr:'Anime / J-Music', es:'Anime / J-Music', de:'Anime / J-Musik', pt:'Anime / J-Music', ko:'애니메이션 / J-뮤직', zh:'动漫 / J-音乐', bn:'অ্যানিমে / জে-মিউজিক', hi:'एनिमे / जे-म्यूजिक', tl:'Anime / J-Music', ceb:'Anime / J-Music', vi:'Anime / Nhạc Nhật', th:'อนิเมะ / เจ-มิวสิก' },
  'nav.podcasts':   { en:'Podcasts', ja:'ポッドキャスト', fr:'Podcasts', es:'Podcasts', de:'Podcasts', pt:'Podcasts', ko:'팟캐스트', zh:'播客', bn:'পডকাস্ট', hi:'पॉडकास्ट', tl:'Mga Podcast', ceb:'Mga Podcast', vi:'Podcast', th:'พอดแคสต์' },
  'nav.livemusic':  { en:'Live Music', ja:'ライブ音楽', fr:'Musique Live', es:'Música En Vivo', de:'Live-Musik', pt:'Música ao Vivo', ko:'라이브 음악', zh:'现场音乐', bn:'লাইভ মিউজিক', hi:'लाइव संगीत', tl:'Live na Musika', ceb:'Live Music', vi:'Nhạc Trực Tiếp', th:'ดนตรีสด' },
  'nav.tv':         { en:'TV', ja:'テレビ', fr:'TV', es:'TV', de:'TV', pt:'TV', ko:'TV', zh:'电视', bn:'টিভি', hi:'टीवी', tl:'TV', ceb:'TV', vi:'TV', th:'ทีวี' },
  'nav.favourites': { en:'Favourites', ja:'お気に入り', fr:'Favoris', es:'Favoritos', de:'Favoriten', pt:'Favoritos', ko:'즐겨찾기', zh:'收藏', bn:'পছন্দের', hi:'पसंदीदा', tl:'Mga Paborito', ceb:'Mga Paborito', vi:'Yêu Thích', th:'รายการโปรด' },
  'nav.about':      { en:'About', ja:'について', fr:'À propos', es:'Acerca de', de:'Über uns', pt:'Sobre', ko:'소개', zh:'关于', bn:'সম্পর্কে', hi:'के बारे में', tl:'Tungkol Sa', ceb:'Mahitungod', vi:'Giới Thiệu', th:'เกี่ยวกับ' },
  'nav.signin':     { en:'Sign In', ja:'ログイン', fr:'Connexion', es:'Iniciar sesión', de:'Anmelden', pt:'Entrar', ko:'로그인', zh:'登录', bn:'সাইন ইন', hi:'साइन इन', tl:'Mag-sign In', ceb:'Mag-sign In', vi:'Đăng Nhập', th:'เข้าสู่ระบบ' },
  'nav.signout':    { en:'Sign Out', ja:'ログアウト', fr:'Déconnexion', es:'Cerrar sesión', de:'Abmelden', pt:'Sair', ko:'로그아웃', zh:'退出', bn:'সাইন আউট', hi:'साइन आउट', tl:'Mag-sign Out', ceb:'Mag-sign Out', vi:'Đăng Xuất', th:'ออกจากระบบ' },

  // ── Hero / Globe ─────────────────────────────────────────────────────────
  'hero.title':     { en:'310 countries.', ja:'310カ国。', fr:'310 pays.', es:'310 países.', de:'310 Länder.', pt:'310 países.', ko:'310개국.', zh:'310个国家。', bn:'৩১০টি দেশ।', hi:'310 देश।', tl:'310 bansa.', ceb:'310 ka nasud.', vi:'310 quốc gia.', th:'310 ประเทศ' },
  'hero.subtitle':  { en:'One index.', ja:'ひとつのインデックス。', fr:'Un seul index.', es:'Un índice.', de:'Ein Index.', pt:'Um índice.', ko:'하나의 인덱스.', zh:'一个索引。', bn:'একটি সূচী।', hi:'एक सूचकांक।', tl:'Isang index.', ceb:'Usa ka index.', vi:'Một chỉ mục.', th:'หนึ่งดัชนี' },
  'hero.desc':      { en:'WNCORE — World Net Core — has been indexing live radio frequencies since 2016. Over 12,000 stations across 310 countries, pulled directly from source. No curation. No editorial layer. Just what\'s on the air.',
                      ja:'WNCORE — ワールド・ネット・コア — は2016年から世界中のライブ無線周波数をインデックスしています。310カ国以上の12,000以上の放送局をソースから直接取得。編集なし。ただ、電波に乗っているものだけ。',
                      fr:'WNCORE — World Net Core — indexe les fréquences radio en direct depuis 2016. Plus de 12 000 stations dans 310 pays, tirées directement de la source. Aucune curation. Aucune couche éditoriale. Juste ce qui est sur les ondes.',
                      es:'WNCORE — World Net Core — indexa frecuencias de radio en vivo desde 2016. Más de 12,000 estaciones en 310 países, obtenidas directamente de la fuente. Sin curaduría. Sin capa editorial. Solo lo que está en el aire.',
                      de:'WNCORE — World Net Core — indiziert seit 2016 Live-Radiofrequenzen. Über 12.000 Sender in 310 Ländern, direkt aus der Quelle. Keine Kuratierung. Kein redaktioneller Layer. Nur was auf Sendung ist.',
                      pt:'WNCORE — World Net Core — indexa frequências de rádio ao vivo desde 2016. Mais de 12.000 estações em 310 países, direto da fonte. Sem curadoria. Sem camada editorial. Apenas o que está no ar.',
                      ko:'WNCORE — World Net Core — 는 2016년부터 라이브 라디오 주파수를 인덱싱해 왔습니다. 310개국 12,000개 이상의 방송국을 직접 소스에서 가져옵니다. 큐레이션 없음. 편집 없음. 그저 방송 중인 것만.',
                      zh:'WNCORE — World Net Core — 自2016年起索引全球直播电台频率。310个国家超过12,000个电台，直接从源头拉取。无策划。无编辑层。只有正在播出的内容。',
                      bn:'WNCORE — ওয়ার্ল্ড নেট কোর — ২০১৬ সাল থেকে লাইভ রেডিও ফ্রিকোয়েন্সি সূচীবদ্ধ করছে। ৩১০টি দেশে ১২,০০০-এরও বেশি স্টেশন, সরাসরি উৎস থেকে। কোনো সম্পাদনা নেই। শুধু যা বাতাসে আছে।',
                      hi:'WNCORE — वर्ल्ड नेट कोर — 2016 से लाइव रेडियो फ्रीक्वेंसी इंडेक्स कर रहा है। 310 देशों में 12,000 से अधिक स्टेशन, सीधे स्रोत से। कोई क्यूरेशन नहीं। कोई संपादकीय परत नहीं। बस जो हवा पर है।',
                      tl:'Ang WNCORE — World Net Core — ay nag-i-index ng mga live na radio frequency mula 2016. Mahigit 12,000 estasyon sa 310 bansa, direkta mula sa pinagmulan. Walang kurasyon. Walang editorial na layer. Ang nasa hangin lamang.',
                      ceb:'Ang WNCORE — World Net Core — nag-index sa live nga mga radio frequency sukad 2016. Labaw sa 12,000 ka estasyon sa 310 ka nasud, gikuha direkta gikan sa tinubdan. Walay kurason. Walay editorial. Ang anaa lang sa hangin.',
                      vi:'WNCORE — World Net Core — đã lập chỉ mục các tần số radio trực tiếp từ năm 2016. Hơn 12.000 đài phát thanh tại 310 quốc gia, lấy trực tiếp từ nguồn. Không có tuyển chọn. Không có lớp biên tập. Chỉ là những gì đang phát sóng.',
                      th:'WNCORE — World Net Core — ทำดัชนีความถี่วิทยุสดมาตั้งแต่ปี 2016 มีสถานีมากกว่า 12,000 แห่งใน 310 ประเทศ ดึงข้อมูลโดยตรงจากแหล่ง ไม่มีการคัดกรอง ไม่มีชั้นบรรณาธิการ มีเพียงสิ่งที่ออกอากาศอยู่' },
  'hero.stations':  { en:'Stations', ja:'放送局', fr:'Stations', es:'Estaciones', de:'Sender', pt:'Estações', ko:'방송국', zh:'电台', bn:'স্টেশন', hi:'स्टेशन', tl:'Mga Estasyon', ceb:'Mga Estasyon', vi:'Đài', th:'สถานี' },
  'hero.countries': { en:'Countries', ja:'カ国', fr:'Pays', es:'Países', de:'Länder', pt:'Países', ko:'국가', zh:'国家', bn:'দেশ', hi:'देश', tl:'Mga Bansa', ceb:'Mga Nasud', vi:'Quốc Gia', th:'ประเทศ' },
  'hero.listening': { en:'Listening now', ja:'今聴いている', fr:'À l\'écoute', es:'Escuchando ahora', de:'Gerade live', pt:'Ouvindo agora', ko:'지금 청취 중', zh:'正在收听', bn:'এখন শুনছেন', hi:'अभी सुन रहे हैं', tl:'Nakikinig ngayon', ceb:'Nagpaminaw karon', vi:'Đang nghe', th:'กำลังฟัง' },

  // ── Home page sections ───────────────────────────────────────────────────
  'home.ondial':    { en:'On the Dial', ja:'放送中', fr:'Sur les ondes', es:'En el dial', de:'Auf Sendung', pt:'No Dial', ko:'방송 중', zh:'播出中', bn:'ডায়ালে', hi:'डायल पर', tl:'Sa Dial', ceb:'Sa Dial', vi:'Đang Phát Sóng', th:'กำลังออกอากาศ' },
  'home.seeall':    { en:'See all →', ja:'すべて見る →', fr:'Tout voir →', es:'Ver todo →', de:'Alle anzeigen →', pt:'Ver tudo →', ko:'전체 보기 →', zh:'查看全部 →', bn:'সব দেখুন →', hi:'सब देखें →', tl:'Tingnan lahat →', ceb:'Tan-awa tanan →', vi:'Xem tất cả →', th:'ดูทั้งหมด →' },

  // ── Charts ───────────────────────────────────────────────────────────────
  'charts.title':   { en:'Top Charts', ja:'トップチャート', fr:'Classements', es:'Clasificaciones', de:'Top-Charts', pt:'Paradas', ko:'인기 차트', zh:'排行榜', bn:'শীর্ষ চার্ট', hi:'टॉप चार्ट', tl:'Nangungunang Tsart', ceb:'Top Charts', vi:'Bảng Xếp Hạng', th:'ชาร์ตยอดนิยม' },
  'charts.desc':    { en:'The most-listened stations on WNCORE right now, updated every hour.', ja:'現在WNCOREで最も聴かれている放送局（毎時更新）。', fr:'Les stations les plus écoutées sur WNCORE, mises à jour chaque heure.', es:'Las estaciones más escuchadas en WNCORE ahora mismo, actualizadas cada hora.', de:'Die meistgehörten Sender auf WNCORE, stündlich aktualisiert.', pt:'As estações mais ouvidas no WNCORE agora, atualizadas a cada hora.', ko:'현재 WNCORE에서 가장 많이 청취되는 방송국, 매시간 업데이트.', zh:'当前WNCORE收听最多的电台，每小时更新。', bn:'এখন WNCORE-এ সবচেয়ে বেশি শোনা স্টেশন, প্রতি ঘণ্টায় আপডেট হয়।', hi:'WNCORE पर अभी सबसे ज़्यादा सुने जाने वाले स्टेशन, हर घंटे अपडेट।', tl:'Ang pinaka-pinakinggangng mga estasyon sa WNCORE ngayon, ina-update bawat oras.', ceb:'Ang labing madungog nga mga estasyon sa WNCORE karon, gi-update matag oras.', vi:'Các đài được nghe nhiều nhất trên WNCORE ngay bây giờ, cập nhật mỗi giờ.', th:'สถานีที่ฟังมากที่สุดบน WNCORE ตอนนี้ อัปเดตทุกชั่วโมง' },

  // ── Genres ───────────────────────────────────────────────────────────────
  'genres.title':   { en:'Browse by Genre', ja:'ジャンルで探す', fr:'Parcourir par genre', es:'Explorar por género', de:'Nach Genre durchsuchen', pt:'Navegar por gênero', ko:'장르별 탐색', zh:'按类型浏览', bn:'ধরন অনুযায়ী ব্রাউজ করুন', hi:'शैली के अनुसार खोजें', tl:'Mag-browse ayon sa Genre', ceb:'I-browse pinaagi sa Genre', vi:'Duyệt Theo Thể Loại', th:'เรียกดูตามประเภท' },
  'genres.desc':    { en:'Every kind of sound, live from around the world.', ja:'世界中からのあらゆる音、ライブで。', fr:'Tous les styles musicaux, en direct du monde entier.', es:'Todo tipo de sonido, en vivo desde todo el mundo.', de:'Jede Art von Klang, live aus aller Welt.', pt:'Todo tipo de som, ao vivo de todo o mundo.', ko:'전 세계에서 온 모든 종류의 사운드, 라이브.', zh:'来自全球的各种声音，实时直播。', bn:'পৃথিবীর প্রতিটি কোণ থেকে, সরাসরি সব ধরনের সাউন্ড।', hi:'दुनिया भर से हर तरह की आवाज़, लाइव।', tl:'Bawat uri ng tunog, live mula sa buong mundo.', ceb:'Matag matang tingog, live gikan sa tibuok kalibutan.', vi:'Mọi loại âm thanh, phát trực tiếp từ khắp nơi trên thế giới.', th:'เสียงทุกประเภท ถ่ายทอดสดจากทั่วโลก' },

  // ── Podcasts ─────────────────────────────────────────────────────────────
  'podcasts.title': { en:'Podcasts & Talk Radio', ja:'ポッドキャスト＆トークラジオ', fr:'Podcasts & Radio parlée', es:'Podcasts y radio hablada', de:'Podcasts & Talksender', pt:'Podcasts e rádio falada', ko:'팟캐스트 & 토크 라디오', zh:'播客与谈话广播', bn:'পডকাস্ট ও টক রেডিও', hi:'पॉडकास्ट और टॉक रेडियो', tl:'Mga Podcast at Talk Radio', ceb:'Mga Podcast ug Talk Radio', vi:'Podcast & Radio Nói Chuyện', th:'พอดแคสต์และวิทยุสนทนา' },

  // ── Live Music ───────────────────────────────────────────────────────────
  'livemusic.title':{ en:'Live Music', ja:'ライブ音楽', fr:'Musique Live', es:'Música En Vivo', de:'Live-Musik', pt:'Música ao Vivo', ko:'라이브 음악', zh:'现场音乐', bn:'লাইভ মিউজিক', hi:'लाइव संगीत', tl:'Live na Musika', ceb:'Live Music', vi:'Nhạc Trực Tiếp', th:'ดนตรีสด' },

  // ── TV / IPTV ────────────────────────────────────────────────────────────
  'tv.title':       { en:'WNCORE TV', ja:'WNCOREテレビ', fr:'WNCORE TV', es:'WNCORE TV', de:'WNCORE TV', pt:'WNCORE TV', ko:'WNCORE TV', zh:'WNCORE 电视', bn:'WNCORE টিভি', hi:'WNCORE टीवी', tl:'WNCORE TV', ceb:'WNCORE TV', vi:'WNCORE TV', th:'WNCORE ทีวี' },
  'tv.desc':        { en:'Free live television from around the world — streamed directly from public broadcast sources', ja:'世界中の無料ライブテレビ — 公共放送から直接配信', fr:'Télévision en direct gratuite du monde entier — diffusée directement depuis les sources publiques', es:'Televisión en vivo gratuita de todo el mundo — transmitida directamente desde fuentes públicas', de:'Kostenloses Live-TV aus aller Welt — direkt aus öffentlichen Quellen', pt:'Televisão ao vivo gratuita do mundo todo — transmitida diretamente de fontes públicas', ko:'전 세계 무료 라이브 TV — 공영 방송 소스에서 직접 스트리밍', zh:'来自全球的免费直播电视 — 直接从公共广播源流式传输', bn:'বিশ্বজুড়ে বিনামূল্যে লাইভ টেলিভিশন — সরাসরি সম্প্রচার উৎস থেকে স্ট্রিম করা হয়েছে', hi:'दुनिया भर से मुफ्त लाइव टेलीविज़न — सार्वजनिक प्रसारण स्रोतों से सीधे स्ट्रीम', tl:'Libreng live na telebisyon mula sa buong mundo — direktang streamed mula sa mga pampublikong broadcast', ceb:'Libre nga live nga telebisyon gikan sa tibuok kalibutan — direkta nga gi-stream gikan sa mga publikong broadcast', vi:'Truyền hình trực tiếp miễn phí từ khắp nơi trên thế giới — phát trực tiếp từ các nguồn phát sóng công cộng', th:'โทรทัศน์สดฟรีจากทั่วโลก — สตรีมโดยตรงจากแหล่งออกอากาศสาธารณะ' },
  'tv.region':      { en:'Region', ja:'地域', fr:'Région', es:'Región', de:'Region', pt:'Região', ko:'지역', zh:'地区', bn:'অঞ্চল', hi:'क्षेत्र', tl:'Rehiyon', ceb:'Rehiyon', vi:'Khu Vực', th:'ภูมิภาค' },
  'tv.all':         { en:'All', ja:'全て', fr:'Tous', es:'Todos', de:'Alle', pt:'Todos', ko:'전체', zh:'全部', bn:'সব', hi:'सभी', tl:'Lahat', ceb:'Tanan', vi:'Tất Cả', th:'ทั้งหมด' },
  'tv.americas':    { en:'Americas', ja:'南北アメリカ', fr:'Amériques', es:'Américas', de:'Amerika', pt:'Américas', ko:'아메리카', zh:'美洲', bn:'আমেরিকাস', hi:'अमेरिका', tl:'Amerika', ceb:'Amerika', vi:'Châu Mỹ', th:'อเมริกา' },
  'tv.europe':      { en:'Europe', ja:'ヨーロッパ', fr:'Europe', es:'Europa', de:'Europa', pt:'Europa', ko:'유럽', zh:'欧洲', bn:'ইউরোপ', hi:'यूरोप', tl:'Europa', ceb:'Europa', vi:'Châu Âu', th:'ยุโรป' },
  'tv.asia':        { en:'Asia', ja:'アジア', fr:'Asie', es:'Asia', de:'Asien', pt:'Ásia', ko:'아시아', zh:'亚洲', bn:'এশিয়া', hi:'एशिया', tl:'Asya', ceb:'Asya', vi:'Châu Á', th:'เอเชีย' },
  'tv.middleeast':  { en:'Middle East', ja:'中東', fr:'Moyen-Orient', es:'Oriente Medio', de:'Naher Osten', pt:'Oriente Médio', ko:'중동', zh:'中东', bn:'মধ্যপ্রাচ্য', hi:'मध्य पूर्व', tl:'Middle East', ceb:'Middle East', vi:'Trung Đông', th:'ตะวันออกกลาง' },
  'tv.africa':      { en:'Africa', ja:'アフリカ', fr:'Afrique', es:'África', de:'Afrika', pt:'África', ko:'아프리카', zh:'非洲', bn:'আফ্রিকা', hi:'अफ्रीका', tl:'Aprika', ceb:'Aprika', vi:'Châu Phi', th:'แอฟริกา' },
  'tv.oceania':     { en:'Oceania', ja:'オセアニア', fr:'Océanie', es:'Oceanía', de:'Ozeanien', pt:'Oceania', ko:'오세아니아', zh:'大洋洲', bn:'ওশেনিয়া', hi:'ओशिनिया', tl:'Oceania', ceb:'Oceania', vi:'Châu Đại Dương', th:'โอเชียเนีย' },
  'tv.search':      { en:'Search channels...', ja:'チャンネルを検索...', fr:'Rechercher des chaînes...', es:'Buscar canales...', de:'Sender suchen...', pt:'Buscar canais...', ko:'채널 검색...', zh:'搜索频道...', bn:'চ্যানেল খুঁজুন...', hi:'चैनल खोजें...', tl:'Maghanap ng mga channel...', ceb:'Pangita ug mga channel...', vi:'Tìm kiếm kênh...', th:'ค้นหาช่อง...' },
  'tv.scanning':    { en:'SCANNING FREQUENCIES', ja:'周波数スキャン中', fr:'SCAN DES FRÉQUENCES', es:'ESCANEANDO FRECUENCIAS', de:'FREQUENZEN SCANNEN', pt:'VARRENDO FREQUÊNCIAS', ko:'주파수 스캔 중', zh:'扫描频率中', bn:'ফ্রিকোয়েন্সি স্ক্যান করা হচ্ছে', hi:'फ्रीक्वेंसी स्कैन हो रही है', tl:'NINI-SCAN ANG MGA FREQUENCY', ceb:'GI-SCAN ANG MGA FREQUENCY', vi:'ĐANG QUÉT TẦN SỐ', th:'กำลังสแกนความถี่' },
  'tv.unavailable': { en:'Stream unavailable — broadcaster may be offline or geo-restricted', ja:'ストリームが利用できません — 放送局がオフラインまたは地域制限の可能性があります', fr:'Flux indisponible — le diffuseur peut être hors ligne ou géo-bloqué', es:'Transmisión no disponible — la emisora puede estar fuera de línea o con restricción geográfica', de:'Stream nicht verfügbar — Sender offline oder geo-gesperrt', pt:'Stream indisponível — a emissora pode estar offline ou com restrição geográfica', ko:'스트림 불가 — 방송국이 오프라인이거나 지역 제한이 있을 수 있습니다', zh:'流不可用 — 广播商可能离线或有地区限制', bn:'স্ট্রিম অনুপলব্ধ — ব্রডকাস্টার অফলাইন বা জিও-রেস্ট্রিক্টেড হতে পারে', hi:'स्ट्रीम उपलब्ध नहीं — ब्रॉडकास्टर ऑफलाइन या जियो-रेस्ट्रिक्टेड हो सकता है', tl:'Hindi available ang stream — maaaring offline o geo-restricted ang broadcaster', ceb:'Dili available ang stream — mahimo nga offline o geo-restricted ang broadcaster', vi:'Stream không khả dụng — đài phát có thể ngoại tuyến hoặc bị giới hạn địa lý', th:'สตรีมไม่พร้อมใช้งาน — ผู้ออกอากาศอาจออฟไลน์หรือถูกจำกัดทางภูมิศาสตร์' },

  // ── Favourites ───────────────────────────────────────────────────────────
  'fav.title':      { en:'Favourites', ja:'お気に入り', fr:'Favoris', es:'Favoritos', de:'Favoriten', pt:'Favoritos', ko:'즐겨찾기', zh:'收藏', bn:'পছন্দের', hi:'पसंदीदा', tl:'Mga Paborito', ceb:'Mga Paborito', vi:'Yêu Thích', th:'รายการโปรด' },
  'fav.saved':      { en:'Saved Stations', ja:'保存された放送局', fr:'Stations sauvegardées', es:'Estaciones guardadas', de:'Gespeicherte Sender', pt:'Estações salvas', ko:'저장된 방송국', zh:'已保存电台', bn:'সংরক্ষিত স্টেশন', hi:'सेव किए गए स्टेशन', tl:'Mga Naka-save na Estasyon', ceb:'Mga Gitipigan nga Estasyon', vi:'Đài Đã Lưu', th:'สถานีที่บันทึกไว้' },
  'fav.sync':       { en:'↑ Sync Favourites to Cloud', ja:'↑ お気に入りをクラウドに同期', fr:'↑ Synchroniser les favoris', es:'↑ Sincronizar favoritos', de:'↑ Favoriten synchronisieren', pt:'↑ Sincronizar favoritos', ko:'↑ 즐겨찾기 동기화', zh:'↑ 同步收藏', bn:'↑ পছন্দের সিঙ্ক করুন', hi:'↑ पसंदीदा क्लाउड से सिंक करें', tl:'↑ I-sync ang Mga Paborito sa Cloud', ceb:'↑ I-sync ang Mga Paborito sa Cloud', vi:'↑ Đồng Bộ Yêu Thích lên Cloud', th:'↑ ซิงค์รายการโปรดไปยังคลาวด์' },

  // ── Search ───────────────────────────────────────────────────────────────
  'search.placeholder': { en:'Search stations, countries, genres...', ja:'放送局、国、ジャンルを検索...', fr:'Rechercher stations, pays, genres...', es:'Buscar estaciones, países, géneros...', de:'Sender, Länder, Genres suchen...', pt:'Buscar estações, países, gêneros...', ko:'방송국, 국가, 장르 검색...', zh:'搜索电台、国家、类型...', bn:'স্টেশন, দেশ, ধরন খুঁজুন...', hi:'स्टेशन, देश, शैलियाँ खोजें...', tl:'Maghanap ng mga estasyon, bansa, genre...', ceb:'Pangita ug mga estasyon, nasud, genre...', vi:'Tìm đài, quốc gia, thể loại...', th:'ค้นหาสถานี ประเทศ ประเภท...' },

  // ── About ────────────────────────────────────────────────────────────────
  'about.title':    { en:'About WNCORE', ja:'WNCOREについて', fr:'À propos de WNCORE', es:'Acerca de WNCORE', de:'Über WNCORE', pt:'Sobre o WNCORE', ko:'WNCORE 소개', zh:'关于WNCORE', bn:'WNCORE সম্পর্কে', hi:'WNCORE के बारे में', tl:'Tungkol sa WNCORE', ceb:'Mahitungod sa WNCORE', vi:'Giới Thiệu WNCORE', th:'เกี่ยวกับ WNCORE' },

  // ── Player ───────────────────────────────────────────────────────────────
  'player.live':    { en:'LIVE', ja:'ライブ', fr:'EN DIRECT', es:'EN VIVO', de:'LIVE', pt:'AO VIVO', ko:'라이브', zh:'直播', bn:'লাইভ', hi:'लाइव', tl:'LIVE', ceb:'LIVE', vi:'TRỰC TIẾP', th:'สด' },

  // ── Language selector UI ─────────────────────────────────────────────────
  'lang.select':    { en:'Language', ja:'言語', fr:'Langue', es:'Idioma', de:'Sprache', pt:'Idioma', ko:'언어', zh:'语言', bn:'ভাষা', hi:'भाषा', tl:'Wika', ceb:'Pinulongan', vi:'Ngôn Ngữ', th:'ภาษา' },

  // ── About stats ──────────────────────────────────────────────────────────
  'about.stations_in_index':  { en:'Stations in index', ja:'インデックス内の放送局', fr:'Stations dans l\'index', es:'Estaciones en el índice', de:'Sender im Index', pt:'Estações no índice', ko:'인덱스의 방송국', zh:'索引中的电台', bn:'সূচীতে স্টেশন', hi:'इंडेक्स में स्टेशन', tl:'Mga Estasyon sa index', ceb:'Mga Estasyon sa index', vi:'Đài trong chỉ mục', th:'สถานีในดัชนี' },
  'about.countries_verified': { en:'Countries with verified stations', ja:'認証済み放送局のある国', fr:'Pays avec stations vérifiées', es:'Países con estaciones verificadas', de:'Länder mit verifizierten Sendern', pt:'Países com estações verificadas', ko:'검증된 방송국이 있는 국가', zh:'拥有已验证电台的国家', bn:'যাচাইকৃত স্টেশন সহ দেশ', hi:'सत्यापित स्टेशन वाले देश', tl:'Mga bansa na may mga verified na estasyon', ceb:'Mga nasud nga adunay verified nga mga estasyon', vi:'Quốc gia có đài đã xác minh', th:'ประเทศที่มีสถานีที่ยืนยันแล้ว' },
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
    'en':'en','en-us':'en','en-gb':'en','en-au':'en',
    'ja':'ja','ja-jp':'ja',
    'fr':'fr','fr-be':'fr','fr-ca':'fr','fr-ch':'fr',
    'es':'es','es-419':'es','es-mx':'es','es-ar':'es',
    'de':'de','de-at':'de','de-ch':'de',
    'pt':'pt','pt-br':'pt','pt-pt':'pt',
    'ko':'ko','ko-kr':'ko',
    'zh':'zh','zh-cn':'zh','zh-tw':'zh','zh-hk':'zh','zh-sg':'zh',
    'bn':'bn','bn-bd':'bn','bn-in':'bn',
    'hi':'hi','hi-in':'hi',
    'tl':'tl','fil':'tl',
    'ceb':'ceb',
    'vi':'vi','vi-vn':'vi',
    'th':'th','th-th':'th',
  };
  return map[nav] || map[nav.split('-')[0]] || 'en';
}

function t(key) {
  const entry = WNCORE_I18N[key];
  if (!entry) return key;
  return entry[_currentLang] || entry['en'] || key;
}

function applyTranslations(lang) {
  _currentLang = lang;

  // No RTL langs in this set — keep ltr always
  document.documentElement.dir = 'ltr';
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

  // Update IPTV region pills
  document.querySelectorAll('.iptv-pill[data-i18n]').forEach(pill => {
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
    btn.querySelector('.lang-btn-code').textContent = WNCORE_LANGS[lang].label;
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

  // Insert before the mobile-menu-btn so it doesn't push hamburger off screen
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const authBtn = document.getElementById('nav-auth-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.parentNode.insertBefore(sel, mobileMenuBtn);
  } else if (authBtn) {
    authBtn.parentNode.insertBefore(sel, authBtn);
  }

  // Populate mobile lang row inside the mobile nav
  const mobileRow = document.getElementById('mobile-lang-row');
  if (mobileRow) {
    mobileRow.innerHTML = `
      <div class="mobile-lang-selector">
        <button id="mobile-lang-selector-btn" class="lang-selector-btn" onclick="toggleMobileLangDropdown()" aria-label="Select language" title="Select language">
          <span class="lang-btn-code">${WNCORE_LANGS[_currentLang].label}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="lang-dropdown mobile-lang-dropdown" id="mobile-lang-dropdown">
          ${Object.entries(WNCORE_LANGS).map(([code, info]) => `
            <button class="lang-option${code === _currentLang ? ' active' : ''}" data-lang="${code}" onclick="selectLang('${code}');toggleMobileMenu()">
              <span class="lang-option-code">${info.label}</span>
              <span class="lang-option-name">${info.name}</span>
            </button>
          `).join('')}
        </div>
      </div>`;
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (e.target.closest('.lang-selector') || e.target.closest('.mobile-lang-selector')) return;
    closeLangDropdown();
    closeMobileLangDropdown();
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
window.toggleMobileLangDropdown = function() {
  const dd = document.getElementById('mobile-lang-dropdown');
  if (dd) dd.classList.toggle('open');
};
window.closeMobileLangDropdown = function() {
  const dd = document.getElementById('mobile-lang-dropdown');
  if (dd) dd.classList.remove('open');
};
window.selectLang = function(lang) {
  if (!WNCORE_LANGS[lang]) return;
  applyTranslations(lang);
  const btn = document.getElementById('lang-selector-btn');
  if (btn) btn.querySelector('.lang-btn-code').textContent = WNCORE_LANGS[lang].label;
  const mobileBtn = document.getElementById('mobile-lang-selector-btn');
  if (mobileBtn) mobileBtn.querySelector('.lang-btn-code').textContent = WNCORE_LANGS[lang].label;
  closeLangDropdown();
  closeMobileLangDropdown();
  if (desktopMenuOpen) toggleDesktopMenu();
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
