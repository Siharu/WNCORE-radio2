// WNCORE Radio — Vercel Serverless API Route
// Handles admin config reads/writes via Supabase
// Compatible with Vercel Free (Hobby) plan — Node 20.x, CommonJS

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const adminToken  = process.env.WNCORE_ADMIN_TOKEN || 'WNCORE_ADMIN';

const VALID_KEYS = new Set([
  'globe_bg_video',
  'anime_banner_img',
  'anime_banner_video',
  'livemusic_hero_bg',
  'eye_spooky_video',
  'eye_spooky_text',
  'signal_status_text',
  'ticker_inject',
]);

// Lazy-load createClient only when env vars are present — prevents crash when package missing
function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('Supabase init failed:', err.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Guard: Supabase not configured — return gracefully (never 500)
  if (!supabaseUrl || !supabaseKey) {
    if (req.method === 'GET') return res.status(200).json({});
    return res.status(503).json({ error: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to Vercel env vars.' });
  }

  if (req.method === 'POST') {
    const token = req.headers['x-admin-token'];
    if (token !== adminToken) return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    if (req.method === 'GET') return res.status(200).json({});
    return res.status(503).json({ error: 'Failed to initialize Supabase client' });
  }

  try {
    if (req.method === 'POST') {
      const { key, value } = req.body || {};
      if (!key || value === undefined) return res.status(400).json({ error: 'Missing key or value' });
      if (!VALID_KEYS.has(key)) return res.status(400).json({ error: 'Invalid key: ' + key });

      const { data, error } = await supabase
        .from('wncore_config')
        .upsert({ config_key: key, config_value: value, updated_at: new Date().toISOString() }, { onConflict: 'config_key' })
        .select();

      if (error) return res.status(500).json({ error: 'Failed to save config', details: error.message });
      return res.status(200).json({ success: true, key, value, data });
    }

    if (req.method === 'GET') {
      const { key } = req.query || {};
      if (key) {
        const { data, error } = await supabase.from('wncore_config').select('config_value').eq('config_key', key).single();
        if (error && error.code !== 'PGRST116') return res.status(500).json({ error: 'Failed to fetch config' });
        return res.status(200).json({ [key]: data ? data.config_value : null });
      }

      const { data, error } = await supabase.from('wncore_config').select('config_key, config_value');
      if (error) return res.status(200).json({}); // fail open on read
      const config = {};
      (data || []).forEach(item => { config[item.config_key] = item.config_value; });
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
