import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key for writes; falls back to anon for reads
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const adminToken = process.env.WNCORE_ADMIN_TOKEN || 'WNCORE_ADMIN';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const token = req.headers['x-admin-token'];
    if (token !== adminToken) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  try {
    if (req.method === 'POST') {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
      }
      if (!VALID_KEYS.has(key)) {
        return res.status(400).json({ error: `Invalid key: ${key}` });
      }
      const { data, error } = await supabase
        .from('wncore_config')
        .upsert(
          { config_key: key, config_value: value, updated_at: new Date().toISOString() },
          { onConflict: 'config_key' }
        )
        .select();
      if (error) return res.status(500).json({ error: 'Failed to save config', details: error.message });
      return res.status(200).json({ success: true, key, value, data });
    }

    if (req.method === 'GET') {
      const { key } = req.query;
      if (key) {
        const { data, error } = await supabase
          .from('wncore_config').select('config_value').eq('config_key', key).single();
        if (error && error.code !== 'PGRST116') return res.status(500).json({ error: 'Failed to fetch config' });
        return res.status(200).json({ [key]: data?.config_value || null });
      } else {
        const { data, error } = await supabase
          .from('wncore_config').select('config_key, config_value');
        if (error) return res.status(500).json({ error: 'Failed to fetch config' });
        const config = {};
        data.forEach(item => { config[item.config_key] = item.config_value; });
        // Cache for 30s on CDN
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
        return res.status(200).json(config);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET is public. Only POST requires admin token.
  if (req.method === 'POST') {
    const token = req.headers['x-admin-token'];
    if (token !== adminToken) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  try {
    if (req.method === 'POST') {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
      }
      const { data, error } = await supabase
        .from('wncore_config')
        .upsert(
          { config_key: key, config_value: value, updated_at: new Date().toISOString() },
          { onConflict: 'config_key' }
        )
        .select();
      if (error) return res.status(500).json({ error: 'Failed to save config', details: error.message });
      return res.status(200).json({ success: true, key, value, data });
    }

    if (req.method === 'GET') {
      const { key } = req.query;
      if (key) {
        const { data, error } = await supabase
          .from('wncore_config').select('config_value').eq('config_key', key).single();
        if (error && error.code !== 'PGRST116') return res.status(500).json({ error: 'Failed to fetch config' });
        return res.status(200).json({ [key]: data?.config_value || null });
      } else {
        const { data, error } = await supabase
          .from('wncore_config').select('config_key, config_value');
        if (error) return res.status(500).json({ error: 'Failed to fetch config' });
        const config = {};
        data.forEach(item => { config[item.config_key] = item.config_value; });
        return res.status(200).json(config);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
