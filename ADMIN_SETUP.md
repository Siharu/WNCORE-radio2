# WNCORE Radio — Deployment & Admin Setup

## Vercel Free (Hobby) Deployment

This project is configured for **Vercel Free plan** with:
- Node.js 20.x serverless functions (Free plan max)
- Static file serving for all HTML/CSS/JS
- Two API routes: `/api/config` (Supabase-backed) and `/api/chat` (Groq AI live chat)

---

## Step 1 — Supabase Table

In your Supabase dashboard → SQL Editor, run:

```sql
CREATE TABLE wncore_config (
  config_key   TEXT PRIMARY KEY,
  config_value TEXT,
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE wncore_config ENABLE ROW LEVEL SECURITY;

-- Allow full access (the API enforces its own auth token)
CREATE POLICY "Allow all" ON wncore_config
  FOR ALL USING (true) WITH CHECK (true);
```

---

## Step 2 — Vercel Environment Variables

In **Vercel Dashboard → Project → Settings → Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Project URL from Supabase > Settings > API |
| `SUPABASE_ANON_KEY` | `eyJ...` | anon/public key |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | service_role key (needed for writes) |
| `WNCORE_ADMIN_TOKEN` | `WNCORE_ADMIN` | Change this if you want a custom token |
| `GROQ_API_KEY` | `gsk_...` | **Required for live chat.** Get free key at console.groq.com |

> **Without Supabase**: The site works fine — `/api/config` will return `{}` and admin saves will show a 503.
> **Without Groq**: The live chat widget will still appear but will show "Chat service temporarily unavailable."

---

## Step 3 — Deploy

```bash
# If using Vercel CLI
vercel deploy

# Or just push to GitHub — Vercel auto-deploys on push
git add .
git commit -m "v4.1"
git push
```

---

## Admin Panel

- **Open**: `Ctrl+B` anywhere on the site
- **Password**: `Siharu847` (stored as bcrypt hash in index.html)
- **Sections**:
  - **Overview** — system status
  - **Video Media** — set background videos for Globe, Anime, Live Music sections
  - **ARG Signals** — configure 88.7 FM text, eye system, ticker
  - **Ticker Feed** — inject live ticker messages with presets
  - **Featured Stations** — override the 3 home page featured cards

---

## Config Keys

| Key | What it controls |
|---|---|
| `globe_bg_video` | Ambient video behind the home globe |
| `anime_banner_img` | Anime page banner image URL |
| `anime_banner_video` | Anime page banner video (overrides image) |
| `livemusic_hero_bg` | Live Music page hero background video |
| `eye_spooky_video` | Video playing inside the eye pupil |
| `eye_spooky_text` | Text shown in the eye sequence (default: "I see you.") |
| `signal_status_text` | 88.7 FM status line at bottom of home page |
| `ticker_inject` | Extra message injected into the live ticker |

---

## Mobile Background Play

- **MediaSession API** is now active — lock screen controls appear automatically when a station is playing
- **Wake Lock API** prevents screen sleep while playing (where supported)
- **iOS Safari**: After tapping play, lock the screen — audio continues and controls appear in the Lock Screen media widget
- **Android Chrome**: Swipe down the notification shade — WNCORE Radio controls appear
- The visibilitychange ARG redirect is now **suppressed while audio is playing** (was breaking mobile background audio)

---

## File Structure

```
index.html              — Main app
main.js                 — Core radio + ARG logic
improvements.js         — UI enhancements (broadcast bar, footer, etc.)
improvements_patch.js   — v4 fixes (search, live music, sharing, toasts)
wrongness.js            — Psychological dread effects
admin.js                — Admin panel logic
wncore-upgrades.js      — v4.1: MediaSession, WakeLock, live chat, ARG micro-horrors
style.css               — Core styles
mobile.css              — Mobile overrides + ARG card styles
horror_upgrade.css      — v4 horror terminal redesign + share/toast UI
manifest.json           — PWA manifest (add-to-home-screen support)
api/config.js           — Vercel serverless: Supabase CRUD
api/chat.js             — Vercel serverless: Groq AI live chat support
vercel.json             — Vercel deployment config
package.json            — Node 20.x, @supabase/supabase-js dependency
```

