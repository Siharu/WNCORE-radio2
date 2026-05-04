# WNCORE Admin Panel Setup Guide

## Supabase Configuration

### 1. Create Supabase Table

In your Supabase dashboard, run this SQL:

```sql
CREATE TABLE wncore_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Grant RLS policy for the anon key to insert/update
ALTER TABLE wncore_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON wncore_config
  FOR ALL USING (true) WITH CHECK (true);
```

### 2. Set Environment Variables in Vercel

Add these to your Vercel project settings under **Environment Variables**:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
WNCORE_ADMIN_TOKEN=WNCORE_ADMIN
```

Find these in your Supabase dashboard under **Settings > API**.

### 3. Add Dependency

Your `package.json` needs:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0"
  }
}
```

### 4. Deploy

Push your changes to Vercel:
```bash
git add .
git commit -m "Add Supabase config API"
git push
```

### 5. Test

In the admin panel:
1. Press `Ctrl+B` to open
2. Log in with password: `Siharu847`
3. Go to **Video Media** section
4. Try saving a video URL
5. Should work now! ✅

---

## Config Keys Used

The admin panel saves these keys to the database:

- `globe_bg_video` - Home globe section video
- `anime_banner_img` - Anime page banner image
- `livemusic_hero_bg` - Live music page hero video
- `signal_status_text` - 88.7 FM status message
- `eye_spooky_text` - Eye system text
- `ticker_inject` - Ticker message

All are retrieved and displayed in the main website automatically.
