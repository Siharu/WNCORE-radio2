# WNCORE — SESSION HANDOFF
*For the next Claude session working on this project*
*Last updated: May 2026*

---

## What this project is

WNCORE (World Net Core) is a **dual-layer website**:

**Surface layer** — a legitimate worldwide internet radio aggregator. Real working stations, real audio playback, real genre filtering, a 3D globe, live station data. People should be able to use it as a normal radio site without ever knowing anything is unusual.

**Hidden layer** — a slow-burn mystery embedded inside the radio site. Strange signals, locked pages, unexplained coordinates, things that don't quite add up. **Never call it an ARG, never use the word ARG anywhere on the site or in copy.** People discover it by noticing things.

**Critical rule:** the two layers must never break each other. If a user just wants to listen to jazz radio, they get jazz radio. The mystery is opt-in by curiosity, not mandatory.

---

## Deployment

- **Live URL:** `wncoreradio.vercel.app` (and `WNCORERADIO.vercel.app`)
- **Platform:** Vercel (serverless)
- **Backend:** Supabase (Postgres + Row Level Security)
- **Repo:** GitHub, edited via web interface — Shag does not use a local dev environment
- **API routes:** all in `/api/` folder as Vercel serverless functions

---

## Tech stack

- Vanilla HTML/CSS/JS — no framework, no build step
- `bundle.js` — main JS for the radio interface (globe, player, genres, stations)
- `bundle_append.js` — appended logic
- `style.css` — main stylesheet
- `fonts.css` — **universal font system** (link this in every HTML page)
- `font-glitch.js` — **universal word glitch engine** (include in every HTML page)
- `three.min.js` — 3D globe
- `sw.js` — service worker

---

## Font system (fonts.css + font-glitch.js)

Both files live at repo root and are linked in every HTML page.

```html
<link rel="stylesheet" href="/fonts.css">
<!-- near </body>: -->
<script src="/font-glitch.js" defer></script>
```

Font variables defined in `fonts.css`:
- `--font-display` → Special Gothic Expanded One (headings, titles)
- `--font-body` → Comic Neue / Comic Sans MS (all body text)
- `--font-mono` → IBM Plex Mono (labels, data, frequencies, all terminal text)
- `--font-glitch` → Rubik Glitch (horror/signal triggers only)

Glitch engine behaviour:
- T+40–50s → phase 1 starts (one word micro-glitch every ~4.5s)
- T+60s → phase 2 (every ~2.8s, slightly more visible)
- `window.WNCOREGlitch.burst(count)` — call from any trigger for a burst
- `window.WNCOREGlitch.horrorFont(el)` — apply Rubik Glitch to an element
- Elements with `data-no-glitch` attribute are skipped by the engine

**To add Brink font later:** add webfont files to repo, add `@font-face` to `fonts.css`, update `--font-display`. Nothing else needs changing.

---

## Pages

| File | Purpose | Notes |
|------|---------|-------|
| `index.html` | Main radio interface | Globe, player, genres, about, live music, podcasts |
| `constellation.html` | Signal map puzzle | Users must complete 10 constellations to unlock legacy.html |
| `cygnus.html` | Cygnus lore hub | Entry point to the hidden layer |
| `earth.html` | Globe overlay | Post-outbreak 2032 situation map with country intel |
| `legacy.html` | Cygnus X-1 system | Locked until 10 constellations solved. 10 fictional planets + KAGE |
| `legal.html` | Legal/terms | Standard but styled in WNCORE voice |
| `radio-mini.html` | Minimal player | Embeddable/lightweight version |
| `404.html` | Custom 404 | CRT terminal aesthetic, scanning frequency animation, source-code easter egg |

---

## API routes

| Route | File | Purpose |
|-------|------|---------|
| `/api/config` | `config.js` | Frontend config, keys |
| `/api/chat` | `chat.js` | AI character chat (Gemini/Groq/Anthropic) |
| `/api/upload` | `upload.js` | File upload handler |
| `/api/user` | `user.js` | User session/auth |
| `/api/icy` | `icy.js` | ICY metadata proxy for now-playing |
| `/api/earth-admin` | `earth-admin.js` | **Earth admin panel** — password auth + Groq lore generation + Supabase save |

---

## Earth admin panel

Hidden panel in `earth.html`. Access: **Ctrl+Shift+E** on the live page.

Password: `EARTH_ADMIN` environment variable on Vercel.

Flow: admin writes lore notes → Groq generates a situation report in WNCORE voice → saves to Supabase `earth_lore` table → immediately live for all visitors.

**Required Vercel env vars:**
- `EARTH_ADMIN` — admin password
- `GROQ_API_KEY` — Groq API key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key

**Required Supabase table** (run once):
```sql
create table earth_lore (
  id uuid default gen_random_uuid() primary key,
  country_code text unique not null,
  country_name text,
  situation_text text,
  admin_notes text,
  generated boolean default false,
  updated_at timestamptz default now()
);
alter table earth_lore enable row level security;
create policy "Public read" on earth_lore for select using (true);
create policy "Service write" on earth_lore for all using (auth.role() = 'service_role');
```

---

## Lore / universe quick reference

- **Setting:** post-apocalyptic 2032. Outbreak began Nepal/Bangladesh early April 2032
- **The Blank Zone:** 2028–2031 period of signal blackout
- **Obsedia:** black rain phenomenon
- **173 Ghuul:** entities / infected types
- **SIGNAL_KAGE:** transmits on **88.7 FM**. Origin world: KAGE (planet in Cygnus X-1 system). First Earth transmission: September 12, 2007
- **S / Siharu847:** key character, disappeared April 1st
- **NODE-09:** WNCORE's own relay node, went dark at some point
- **Factions:** Remaining Government (Alaska), Blood Pact (Antarctica), White Flag NGO, Logbook Drifters, Rooftop Seers, Signal Monks, Pale Node, Cartographers, Kraken's Paw
- **Cygnus X-1 planets:** Drev, Obsidis, Vael, KAGE, Shurn, Mourne, Orveth, Calyx, Thresh, Nullen
- **Constellation system:** users solve 10 constellations (localStorage key: `wncore-constellation-solved`) to unlock `legacy.html`

---

## What's been done (this session batch)

- ✅ `earth.html` — moon orbit (CSS, no images), black hole nav button (SVG), country panel hoisting bug fixed
- ✅ `earth-admin.js` — new API route: password auth, Groq generation, Supabase upsert
- ✅ `legacy.html` — Cygnus X-1 system page, 10 planets, KAGE highlighted, lock screen, info panel
- ✅ `fonts.css` + `font-glitch.js` — universal font system, word glitch engine
- ✅ All 7 HTML pages — old DM Sans/Mono/Playfair removed, new system linked
- ✅ `style.css` — 147 font references updated to CSS variables
- ✅ `index.html` — major copy rewrite (hero taglines, about page, section labels, genre descriptions, ticker clock, trusted-by companies)
- ✅ `bundle.js` — all 17 genre descriptions rewritten
- ✅ `404.html` — custom CRT terminal 404 with scanning frequency animation
- ✅ `vercel.json` — earth-admin route, 404 error route

---

## ⚠️ THINGS NOT DONE YET — do these next

### Copy / credibility (high priority)
- [ ] **Radio Paradise "now playing"** — currently hardcoded `"Running on Empty — Jackson Browne"`. Wire up to Radio Paradise API: `https://api.radioparadise.com/api/now_playing?chan=0` — returns JSON with `title` and `artist`
- [ ] **`cygnus.html` copy** — not audited yet. Likely has the same AI em-dash literary cadence. Needs the same roughness pass as index.html
- [ ] **`legal.html` copy** — standard AI legal boilerplate. Should feel like it was written by the same person who wrote the about page, not ChatGPT
- [ ] **`constellation.html` copy** — check all UI strings for AI patterns
- [ ] **Listener counter base number** — currently `291,447`. Should be lower and more specific: try `73,441` as base. The fluctuation logic already exists in bundle.js

### Visual / UX roughness (medium priority)
- [ ] **Genre card icons** — 7 genres share identical SVG music note paths. Each genre needs a distinct custom SVG. Jazz, Classical, Rock, Pop, Electronic, Hip-Hop, Ambient, News, Country, R&B, Metal, Reggae, Anime, Folk, Lo-Fi, 80s, 90s — 17 unique icons needed
- [ ] **SSL certificate block** — currently a fabricated certificate with fake SHA-256, fake serial number, wrong domain. Replace entirely — either remove or make it an in-universe WNCORE signal verification block
- [ ] **Featured station cards** — `"Running on Empty"` never changes, card heights are identical, hover states are all the same. Give cards slight height variation, make the now-playing actually pull from the ICY metadata API that already exists in `api/icy.js`
- [ ] **Card hover timing** — all cards use same `0.15s ease`. Vary to `0.1s`, `0.18s`, `0.22s` across different component types. Reads more handmade

### Structure (lower priority)
- [ ] **Source code comments** — add developer voice to HTML comments. Frustration notes, TODO items, inside references. Real projects have this. Currently the HTML is perfectly clean which reads generated
- [ ] **One intentionally "older" section** — a part of the page that looks like it was written in 2018 and never updated. Different font-size, slightly different spacing, a comment that says `<!-- TODO: update this at some point -->`
- [ ] **External links** — the site references nothing outside itself. Add a few real outbound links: Radio Browser database, Internet Archive radio collection, a specific WFMU archive page. Real projects link outward
- [ ] **`humans.txt`** — currently generic. Rewrite in the same rough human voice as the about page

---

## Tone guide for copy

**DO:**
- Specific numbers over round ones (`12,841` not `12,000+`)
- Incomplete thoughts, em-dashes used mid-sentence for genuine interruption
- Passive voice occasionally — real technical documentation uses it
- Self-referential asides (`"we kept the index running"`, `"it wasn't planned to get this big"`)
- Present tense for ongoing things (`"is indexing"` not `"has indexed"`)
- Short sentences after long ones. For rhythm.

**DON'T:**
- `"Curated"` — banned word
- `"Delve"` — banned word  
- `"[noun phrase], [verb phrase]."` hero tagline formula
- Three-part `"No X. No Y. Just Z."` constructions
- `"Founded in [year] by a small team of [job titles] and [hobbyists]"`
- Perfect grammar throughout — one or two sentences that trail off or start lowercase in informal contexts
- Exclamation marks anywhere

---

## Notes on the hidden layer voice

The mystery text (cygnus.html, earth.html situation reports, legacy.html planet entries, constellation clues) should feel like **found documents** — intelligence briefings, signal logs, field notes. Not literary. Not poetic. Specific and dry with one strange detail per paragraph that doesn't get explained.

Good: `"The seventh moon, Noth, is on an orbit that should have decayed in 3,000 years."`
Bad: `"Something ancient and unknowable lurks beneath the surface of this mysterious world."`

---

*End of handoff. Good luck.*
