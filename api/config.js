// WNCORE Radio — Vercel Serverless API Route
// Handles admin config reads/writes via Supabase REST API
// Uses native fetch — zero npm dependencies, works on Vercel Hobby free tier

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
if (!process.env.WNCORE_ADMIN_TOKEN) {
  module.exports = async (req, res) => {
    if (req.method === 'GET') return res.status(200).json({});
    return res.status(503).json({ error: 'Admin token not configured — set WNCORE_ADMIN_TOKEN in Vercel env vars' });
  };
  return;
}
const adminToken = process.env.WNCORE_ADMIN_TOKEN;

const VALID_KEYS = new Set([
  'globe_bg_video',
  'anime_banner_img',
  'anime_banner_video',
  'livemusic_hero_bg',
  'eye_spooky_video',
  'eye_spooky_text',
  'signal_status_text',
  'ticker_inject',
  'featured_station_1',
  'featured_station_2',
  'featured_station_3',
  // New media slots
  'genre_hero_video',
  'charts_hero_video',
  'podcasts_hero_video',
  'about_bg_video',
  'ghuul_video_url',
  'home_hero_video',
]);

// Supabase REST API base
function sbUrl(path) {
  return `${supabaseUrl}/rest/v1/${path}`;
}

// Shared headers for all Supabase REST calls
function sbHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    ...extra,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Guard: Supabase not configured
  if (!supabaseUrl || !supabaseKey) {
    if (req.method === 'GET') return res.status(200).json({});
    return res.status(503).json({ error: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to Vercel env vars.' });
  }

  // Auth guard for writes
  if (req.method === 'POST') {
    const token = req.headers['x-admin-token'];
    if (token !== adminToken) return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // ── POST: upsert a config value ──────────────────────────────────────────
    if (req.method === 'POST') {
      const { key, value } = req.body || {};
      if (!key || value === undefined) return res.status(400).json({ error: 'Missing key or value' });
      // Auth probe — admin.js sends this to verify the token is valid; just confirm and return
      if (key === '_auth_check') return res.status(200).json({ ok: true });
      if (!VALID_KEYS.has(key)) return res.status(400).json({ error: 'Invalid key: ' + key });

      const upsertRes = await fetch(
        sbUrl('wncore_config?on_conflict=config_key'),
        {
          method: 'POST',
          headers: sbHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
          body: JSON.stringify({
            config_key: key,
            config_value: value,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!upsertRes.ok) {
        let err = '';
        try { err = await upsertRes.text(); } catch(_) {}
        console.error('Supabase upsert error:', upsertRes.status, err);
        // If table doesn't exist yet, give a helpful message
        if (err.includes('does not exist') || err.includes('relation')) {
          return res.status(500).json({ error: 'Supabase table "wncore_config" not found. Run the setup SQL in your Supabase project.', details: err });
        }
        return res.status(500).json({ error: 'Failed to save config', details: err });
      }

      let data = null;
      try { data = await upsertRes.json(); } catch(_) {}
      return res.status(200).json({ success: true, key, value, data });
    }

    // ── GET: fetch one or all config values ──────────────────────────────────
    if (req.method === 'GET') {
      const { key } = req.query || {};

      if (key) {
        const getRes = await fetch(
          sbUrl(`wncore_config?config_key=eq.${encodeURIComponent(key)}&select=config_value&limit=1`),
          { headers: sbHeaders({ 'Accept': 'application/json' }) }
        );
        if (!getRes.ok) return res.status(500).json({ error: 'Failed to fetch config' });
        const rows = await getRes.json();
        return res.status(200).json({ [key]: rows.length ? rows[0].config_value : null });
      }

      // All keys
      const allRes = await fetch(
        sbUrl('wncore_config?select=config_key,config_value'),
        { headers: sbHeaders({ 'Accept': 'application/json' }) }
      );
      if (!allRes.ok) return res.status(200).json({}); // fail open on read

      const rows = await allRes.json();
      const config = {};
      (rows || []).forEach(item => { config[item.config_key] = item.config_value; });
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      return res.status(200).json(config);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('WNCORE config error:', err);
    if (req.method === 'GET') return res.status(200).json({});
    return res.status(500).json({ error: 'Internal server error' });
  }
};
