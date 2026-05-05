// WNCORE Radio — Vercel Serverless API Route
// Handles admin config reads/writes via Supabase
// Compatible with Vercel Free (Hobby) plan — Node 20.x, CommonJS

const { createClient } = require('@supabase/supabase-js');

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

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Guard: if Supabase is not configured, return empty config gracefully
  if (!supabaseUrl || !supabaseKey) {
    if (req.method === 'GET') {
      return res.status(200).json({});
    }
    return res.status(503).json({ error: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to Vercel environment variables.' });
  }

  // Auth guard for POST
  if (req.method === 'POST') {
    const token = req.headers['x-admin-token'];
    if (token !== adminToken) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to init Supabase client', details: err.message });
  }

  try {
    // ── POST: save a config value ──────────────────────────────────────────
    if (req.method === 'POST') {
      const { key, value } = req.body || {};

      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
      }
      if (!VALID_KEYS.has(key)) {
        return res.status(400).json({ error: `Invalid key: ${key}. Allowed: ${[...VALID_KEYS].join(', ')}` });
      }

      const { data, error } = await supabase
        .from('wncore_config')
        .upsert(
          { config_key: key, config_value: value, updated_at: new Date().toISOString() },
          { onConflict: 'config_key' }
        )
        .select();

      if (error) {
        return res.status(500).json({ error: 'Failed to save config', details: error.message });
      }
      return res.status(200).json({ success: true, key, value, data });
    }

    // ── GET: fetch config values ───────────────────────────────────────────
    if (req.method === 'GET') {
      const { key } = req.query || {};

      if (key) {
        // Single key fetch
        const { data, error } = await supabase
          .from('wncore_config')
          .select('config_value')
          .eq('config_key', key)
          .single();

        // PGRST116 = row not found — that's fine, return null
        if (error && error.code !== 'PGRST116') {
          return res.status(500).json({ error: 'Failed to fetch config' });
        }
        return res.status(200).json({ [key]: data ? data.config_value : null });
      }

      // Fetch all keys
      const { data, error } = await supabase
        .from('wncore_config')
        .select('config_key, config_value');

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch config', details: error.message });
      }

      const config = {};
      (data || []).forEach(item => {
        config[item.config_key] = item.config_value;
      });

      // Cache on CDN edge for 30s, stale for 60s — reduces Supabase reads
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      return res.status(200).json(config);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
