# WNCORE Radio

**Free live radio streaming from 12,000+ stations across 310 countries.**

> Stream jazz from Tokyo, news from London, hip-hop from New York, and classical from Vienna — all in one place. No signup. No ads. Est. 2016.

🌐 **[wncoreradio.net](https://wncore-radio.vercel.app)** &nbsp;·&nbsp; Built with vanilla HTML/CSS/JS &nbsp;·&nbsp; Deployed on Vercel

---

## What is WNCORE Radio?

WNCORE Radio is a free internet radio directory and streaming platform that has been running since 2016. It indexes over 12,000 hand-verified stations from 310 countries and territories, letting you tune into any genre from anywhere in the world — instantly, with no account required.

The platform is built as a single-page web application with no framework dependencies, powered by the [Radio Browser](https://www.radio-browser.info/) community database and a lightweight Vercel + Supabase backend.

---

## Features

- 📻 **12,000+ stations** — verified and indexed from 310 countries
- 🌍 **Interactive globe** — visualise where listeners are tuning in from
- 🎵 **Live metadata** — real-time track and artist info via ICY stream headers
- 🔍 **Search & filter** — by genre, country, language, and bitrate
- ⭐ **Favourites** — save stations across devices with a free account
- 🎛️ **EQ & sleep timer** — built-in equaliser and auto-shutoff
- 📱 **PWA support** — install to your home screen, works offline
- 🌙 **Dark / Light / Minimal modes** — including a distraction-free listening mode
- 📡 **Top Charts** — most-listened stations updated in real time
- 🎌 **Anime / J-Music section** — dedicated Japanese music and anime radio
- 🎙️ **Podcasts** — curated podcast streams alongside live radio
- 🔒 **No ads. No tracking. No paywall.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend / Auth | [Supabase](https://supabase.com) |
| Deployment | [Vercel](https://vercel.com) |
| Station Data | [Radio Browser API](https://api.radio-browser.info) |
| Stream Metadata | ICY / Shoutcast headers via `/api/icy` proxy |
| Avatars | [DiceBear](https://dicebear.com) |
| PWA | Service Worker + Web App Manifest |

---

## Project Structure

```
wncore-radio/
├── index.html          # Main application shell
├── style.css           # All styles (dark/light/minimal themes)
├── bundle.js           # Core radio logic, player, search, auth
├── bundle_append.js    # Profile system, listeners, extended features
├── mobile.css          # Mobile-specific overrides
├── legal.html          # Privacy policy, ToS, patch notes
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── api/
│   ├── icy.js          # ICY metadata proxy (Vercel function)
│   ├── chat.js         # Chat endpoint
│   ├── user.js         # User profile API
│   └── config.js       # Runtime config
└── images/
    └── ...             # Icons and OG preview image
```

---

## Running Locally

No build step required. Clone the repo and open `index.html` directly in a browser, or use any static file server:

```bash
git clone https://github.com/yourusername/wncore-radio.git
cd wncore-radio

# Option A — Python
python -m http.server 3000

# Option B — Node
npx serve .

# Option C — VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

For API features (ICY metadata, user auth), deploy to Vercel and set up your `.env` variables as described in `.env.example`.

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `ADMIN_SETUP.md` for full backend configuration.

---

## Deployment

The project deploys automatically to Vercel on push to `main`. The `vercel.json` config handles API function routing.

```bash
npm i -g vercel
vercel --prod
```

---

## History

| Year | Milestone |
|------|-----------|
| 2016 | WNCORE Radio launched as a static radio directory |
| 2017 | Radio Browser integration — 10,000+ stations indexed |
| 2018 | User accounts, favourites, and profile system added |
| 2019 | Full visual redesign — dark mode, minimal mode, new player |
| 2020 | Featured stations, session continuity, ambient interface |
| 2021 | Audio engine rewrite — ICY metadata, stall detection, MediaSession API |
| 2022 | Interactive globe, live listener feed, geolocation "Near Me" |
| 2023 | Ambient experience system, profile signal readout, decoder utility |
| 2024 | Admin panel, AI chat integration, multilingual translation engine |
| 2025 | Full frontend rewrite — PWA, page transitions, personalised recommendations |

---

## Contributing

Station data is sourced from the [Radio Browser](https://www.radio-browser.info/) community database (CC0). If you want to add a station, submit it directly to Radio Browser and it will appear in WNCORE automatically.

Bug reports and pull requests are welcome. Please open an issue before submitting large changes.

---

## License

The WNCORE Radio platform code is proprietary. Station data is redistributed from Radio Browser under CC0. Audio content belongs to the respective broadcasting stations.

---

## Contact

📧 signal@wncoreradio.net &nbsp;·&nbsp; 🌐 [wncoreradio.net](https://wncore-radio.vercel.app)
