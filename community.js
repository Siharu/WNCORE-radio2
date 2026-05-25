// WNCORE Community API
// GET  /api/community  — fetch leaderboard (top 100 by score)
// POST /api/community  — upsert a user's progress entry

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

function sbHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    ...extra,
  };
}

// Score weights per system
const WEIGHTS = {
  constellation: 10,  // per constellation solved (max 200)
  cygnus:        25,  // per cygnus section read  (max ~75)
  earth_arg:      5,  // per earth signal node found
  legacy:        50,  // legacy.html unlocked
};

function calcScore(data) {
  return (
    (data.constellation_solved || 0) * WEIGHTS.constellation +
    (data.cygnus_sections     || 0) * WEIGHTS.cygnus +
    (data.earth_nodes_found   || 0) * WEIGHTS.earth_arg +
    (data.legacy_unlocked ? WEIGHTS.legacy : 0)
  );
}

// Generate a deterministic codename from fingerprint
function codenamefrom(fp) {
  // Simple hash → pick from word lists
  let h = 0;
  for (let i = 0; i < fp.length; i++) {
    h = ((h << 5) - h) + fp.charCodeAt(i);
    h |= 0;
  }
  const abs = Math.abs(h);
  const prefixes = ['NODE','RELAY','SIGNAL','ECHO','CARRIER','STATIC','VOID','PULSE','DRIFT','VECTOR','NULL','PROXY','KAGE','BLANK','SHADE'];
  const suffixes = ['ALPHA','BETA','ECHO','DELTA','OMEGA','PRIME','GHOST','ZERO','DEEP','WIRE','CORE','DARK','PALE','LOST','THIN'];
  const p = prefixes[abs % prefixes.length];
  const s = suffixes[Math.floor(abs / prefixes.length) % suffixes.length];
  const n = String(abs % 9999).padStart(4, '0');
  return `${p}-${s}-${n}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  /* ── GET: leaderboard ──────────────────────────────────────── */
  if (req.method === 'GET') {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/community_progress?select=*&order=score.desc&limit=100`,
        { headers: { ...sbHeaders(), Accept: 'application/json' } }
      );
      if (!r.ok) return res.status(200).json({ entries: [] });
      const rows = await r.json();
      // Strip fingerprint from public response — only return codename + scores
      const safe = (rows || []).map(row => ({
        codename:             row.codename,
        score:                row.score,
        constellation_solved: row.constellation_solved || 0,
        cygnus_sections:      row.cygnus_sections || 0,
        earth_nodes_found:    row.earth_nodes_found || 0,
        legacy_unlocked:      row.legacy_unlocked || false,
        updated_at:           row.updated_at,
        rank:                 0, // filled client-side
      }));
      return res.status(200).json({ entries: safe });
    } catch (e) {
      console.error('community GET error:', e);
      return res.status(200).json({ entries: [] });
    }
  }

  /* ── POST: upsert progress ─────────────────────────────────── */
  if (req.method === 'POST') {
    const {
      fingerprint,
      constellation_solved = 0,
      cygnus_sections = 0,
      earth_nodes_found = 0,
      legacy_unlocked = false,
    } = req.body || {};

    if (!fingerprint || fingerprint.length < 8) {
      return res.status(400).json({ error: 'Invalid fingerprint' });
    }

    const codename = codenamefrom(fingerprint);
    const score = calcScore({ constellation_solved, cygnus_sections, earth_nodes_found, legacy_unlocked });

    const row = {
      fingerprint,
      codename,
      score,
      constellation_solved: Math.min(constellation_solved, 20),
      cygnus_sections:      Math.min(cygnus_sections, 10),
      earth_nodes_found:    Math.min(earth_nodes_found, 50),
      legacy_unlocked,
      updated_at: new Date().toISOString(),
    };

    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/community_progress?on_conflict=fingerprint`,
        {
          method: 'POST',
          headers: {
            ...sbHeaders(),
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(row),
        }
      );
      const saved = await r.json().catch(() => ({}));
      return res.status(r.ok ? 200 : 500).json({
        ok: r.ok,
        codename,
        score,
        entry: r.ok ? saved : null,
      });
    } catch (e) {
      console.error('community POST error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
