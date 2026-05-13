// WNCORE Radio — /api/user.js
// Unified user profile API. Three modes in one route, zero external dependencies.
//
//   GET  /api/user                        → fetch own profile row
//   POST /api/user  mode=save_profile     → upsert all editable profile fields
//   POST /api/user  mode=claim_node       → validate + reserve a permanent Node ID
//   POST /api/user  mode=delete_account   → permanently delete account + cascade
//
// Auth pattern (all modes):
//   Authorization: Bearer <supabase_access_token>
//   The token is the session access_token from sb.auth.getSession() on the client.
//   We verify it server-side with auth.getUser() using the service key.
//   No admin token involved — fully user-scoped.

'use strict';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

// ─── RESERVED / BLOCKED NAMES ────────────────────────────────────────────────
// Covers: lore-significant node numbers, canonical character identifiers,
// faction names, ARG-critical signals, world lore terms from both
// WNCORE Radio and the Siharu Archive (siharu.vercel.app/characters.html).

const RESERVED_NODE_IDS = new Set([
  // Canon two-digit node numbers — lore reserved
  'NODE_09','NODE_10','NODE_11','NODE_12','NODE_13','NODE_14','NODE_15',
  'NODE_16','NODE_17','NODE_18','NODE_19','NODE_20','NODE_21',
  // Survivor node derivations (Lars_09, Amara_21, Dmitri_15)
  'NODE_LA09','NODE_AM21','NODE_DM15',
  // System sentinel values
  'NODE_000000','NODE_111111','NODE_FFFFFF',
  'NODE_ADMIN','NODE_WNCORE','NODE_SIHARU',
]);

// Blocked callsigns and display names — character names, faction names,
// lore signals, world terms. Users cannot impersonate any of these.
const RESERVED_NAMES = new Set([
  // Canon signal identifiers
  'SIGNAL_KAGE','KAGE','NODE09',
  // Canonical survivor characters (Siharu Archive)
  'LARS','LARS_09','AMARA','AMARA_21','DMITRI','DMITRI_15',
  // Faction / world lore
  'OBSEDIA','GHUUL','GHUULS','BLANK_ZONE','BLANKZONE',
  'MOON_DOME','MOONDOME','WNCORE','SIHARU',
  // ARG keywords that appear verbatim in horror text / ticker
  'FREQUENCY','UNKNOWN','REDACTED','EXPUNGED','SIGNAL',
  // Admin / impersonation vectors
  'ADMIN','OPERATOR','SYSTEM','ROOT','NULL',
  'MODERATOR','MOD','STAFF','SUPPORT','OFFICIAL',
]);

// Regex patterns always blocked regardless of exact match
// (catches variants like SIGKAGE, LARSNODE, GHUUL99, OBSEDIA_X, etc.)
const BLOCKED_PATTERNS = [
  /^SIGNAL/i, /GHUUL/i, /OBSEDIA/i, /BLANKZONE/i,
  /MOONDOME/i, /^ADMIN/i, /^MOD$/i, /^STAFF/i,
  /^SYSTEM/i, /^ROOT$/i, /^NULL$/i,
];

// ─── VALIDATION ───────────────────────────────────────────────────────────────

// Node ID: NODE_ + exactly 6 uppercase alphanumeric chars
function validateNodeId(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Node ID must be a string.' };
  const id = raw.trim().toUpperCase();
  if (!/^NODE_[A-Z0-9]{6}$/.test(id)) {
    return { ok: false, error: 'Node ID must be NODE_ followed by exactly 6 alphanumeric characters.' };
  }
  if (RESERVED_NODE_IDS.has(id)) return { ok: false, error: 'NODE_TAKEN' };
  return { ok: true, value: id };
}

// Callsign: 3–12 chars, uppercase alphanum + underscore
function validateCallsign(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Callsign must be a string.' };
  const cs = raw.trim().toUpperCase();
  if (cs.length === 0) return { ok: true, value: '' }; // allow clearing
  if (cs.length < 3 || cs.length > 12) return { ok: false, error: 'Callsign must be 3–12 characters.' };
  if (!/^[A-Z0-9_]+$/.test(cs)) {
    return { ok: false, error: 'Callsign may only contain letters, numbers, and underscores.' };
  }
  if (RESERVED_NAMES.has(cs)) return { ok: false, error: 'CALLSIGN_RESERVED' };
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(cs)) return { ok: false, error: 'CALLSIGN_RESERVED' };
  }
  return { ok: true, value: cs };
}

// Display name: 1–32 chars, no HTML, no lore impersonation
function validateDisplayName(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Display name must be a string.' };
  const name = raw.trim();
  if (name.length === 0) return { ok: true, value: '' };
  if (name.length > 32) return { ok: false, error: 'Display name must be 32 characters or fewer.' };
  if (/<|>|javascript:/i.test(name)) return { ok: false, error: 'Display name contains invalid characters.' };
  if (RESERVED_NAMES.has(name.toUpperCase())) return { ok: false, error: 'That name is reserved.' };
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(name)) return { ok: false, error: 'That name is reserved.' };
  }
  return { ok: true, value: name };
}

function validateBio(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Bio must be a string.' };
  return { ok: true, value: raw.trim().slice(0, 160) };
}

function validateTheme(raw) {
  if (!['dark', 'light'].includes(raw)) return { ok: false, error: 'Theme must be "dark" or "light".' };
  return { ok: true, value: raw };
}

function validateVolume(raw) {
  const v = parseFloat(raw);
  if (isNaN(v) || v < 0 || v > 1) return { ok: false, error: 'Volume must be between 0.0 and 1.0.' };
  return { ok: true, value: Math.round(v * 100) / 100 };
}

function validateGenreTags(raw) {
  if (!Array.isArray(raw)) return { ok: false, error: 'genre_tags must be an array.' };
  const allowed = new Set([
    'jazz','classical','pop','rock','electronic','hiphop','ambient','news',
    'talk','country','rnb','metal','reggae','jpop','anime','lofi','folk','80s','90s',
  ]);
  const tags = raw.filter(t => typeof t === 'string' && allowed.has(t)).slice(0, 10);
  return { ok: true, value: tags };
}

function validateAvatarUrl(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'avatar_url must be a string.' };
  const url = raw.trim();
  if (url.length === 0) return { ok: true, value: '' };
  if (!/^https:\/\//i.test(url)) return { ok: false, error: 'avatar_url must be HTTPS.' };
  if (url.length > 512) return { ok: false, error: 'avatar_url is too long.' };
  return { ok: true, value: url };
}

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────

const sbRest  = path => `${SUPABASE_URL}/rest/v1/${path}`;
const sbAuth  = path => `${SUPABASE_URL}/auth/v1/${path}`;
const sbAdmin = path => `${SUPABASE_URL}/auth/v1/admin/${path}`;

function sbHeaders(key, extra = {}) {
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    ...extra,
  };
}

// Verify the client's Supabase access token and return the user object.
async function verifyUser(accessToken) {
  if (!accessToken) return null;
  try {
    const res = await fetch(sbAuth('user'), {
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? user : null;
  } catch { return null; }
}

// Fetch the user_profiles row for this user (returns null if not yet created)
async function fetchProfile(userId) {
  try {
    const res = await fetch(
      sbRest(`user_profiles?user_id=eq.${userId}&limit=1`),
      { headers: sbHeaders(SUPABASE_SERVICE_KEY, { 'Accept': 'application/json' }) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0] : null;
  } catch { return null; }
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'Supabase not configured.' });
  }

  // Extract Bearer token
  const authHeader  = req.headers['authorization'] || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // Verify user for all methods
  const user = await verifyUser(accessToken);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid Supabase session token.' });
  }

  try {

    // ══════════════════════════════════════════════════════════
    // GET — fetch own profile
    // ══════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const profile = await fetchProfile(user.id);
      return res.status(200).json({ profile: profile || null, user_id: user.id });
    }

    // ══════════════════════════════════════════════════════════
    // POST — dispatch by mode
    // ══════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      const body = req.body || {};
      const { mode } = body;

      if (!mode) {
        return res.status(400).json({
          error: 'Missing mode.',
          valid_modes: ['save_profile', 'claim_node', 'delete_account'],
        });
      }

      // ── save_profile ──────────────────────────────────────
      if (mode === 'save_profile') {
        const updates = { user_id: user.id, updated_at: new Date().toISOString() };
        const errors  = {};

        const field = (key, validator, bodyKey) => {
          const k = bodyKey || key;
          if (k in body) {
            const v = validator(body[k]);
            if (!v.ok) errors[key] = v.error;
            else updates[key] = (v.value === '' ? null : v.value);
          }
        };

        field('display_name',   validateDisplayName);
        field('bio',            validateBio);
        field('callsign',       validateCallsign);
        field('theme',          validateTheme);
        field('default_volume', validateVolume);
        field('avatar_url',     validateAvatarUrl);
        field('genre_tags',     validateGenreTags);
        if ('hide_email' in body) updates.hide_email = !!body.hide_email;

        if (Object.keys(errors).length > 0) {
          return res.status(422).json({ error: 'Validation failed', fields: errors });
        }

        // Store genre_tags as JSON string for TEXT[] compatibility
        if ('genre_tags' in updates && Array.isArray(updates.genre_tags)) {
          updates.genre_tags = JSON.stringify(updates.genre_tags);
        }

        const upsertRes = await fetch(
          sbRest('user_profiles?on_conflict=user_id'),
          {
            method: 'POST',
            headers: sbHeaders(SUPABASE_SERVICE_KEY, {
              'Prefer': 'resolution=merge-duplicates,return=representation',
            }),
            body: JSON.stringify(updates),
          }
        );

        if (!upsertRes.ok) {
          const detail = await upsertRes.text().catch(() => '');
          console.error('[user.js] save_profile upsert failed:', upsertRes.status, detail);
          return res.status(500).json({ error: 'Failed to save profile.', detail });
        }

        const saved = await upsertRes.json().catch(() => [{}]);
        return res.status(200).json({ ok: true, profile: saved[0] || updates });
      }

      // ── claim_node ────────────────────────────────────────
      if (mode === 'claim_node') {
        const validation = validateNodeId(body.node_id);

        if (!validation.ok) {
          return res.status(409).json({
            error: validation.error,
            code:  validation.error === 'NODE_TAKEN' ? 'NODE_TAKEN' : 'INVALID_FORMAT',
          });
        }

        const nodeId = validation.value;

        // Pre-check — cleaner error than letting the unique constraint fire
        const checkRes = await fetch(
          sbRest(`user_profiles?node_id=eq.${encodeURIComponent(nodeId)}&select=user_id&limit=1`),
          { headers: sbHeaders(SUPABASE_SERVICE_KEY, { 'Accept': 'application/json' }) }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json().catch(() => []);
          if (existing.length > 0 && existing[0].user_id !== user.id) {
            return res.status(409).json({ error: 'NODE_TAKEN', code: 'NODE_TAKEN' });
          }
        }

        // Upsert with node_id
        const upsertRes = await fetch(
          sbRest('user_profiles?on_conflict=user_id'),
          {
            method: 'POST',
            headers: sbHeaders(SUPABASE_SERVICE_KEY, {
              'Prefer': 'resolution=merge-duplicates,return=representation',
            }),
            body: JSON.stringify({
              user_id:    user.id,
              node_id:    nodeId,
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (!upsertRes.ok) {
          const detail = await upsertRes.text().catch(() => '');
          // Unique constraint race condition
          if (detail.includes('23505') || detail.includes('unique') || detail.includes('duplicate')) {
            return res.status(409).json({ error: 'NODE_TAKEN', code: 'NODE_TAKEN' });
          }
          console.error('[user.js] claim_node upsert failed:', upsertRes.status, detail);
          return res.status(500).json({ error: 'Failed to register node ID.', detail });
        }

        const saved = await upsertRes.json().catch(() => [{}]);
        return res.status(200).json({ ok: true, node_id: nodeId, profile: saved[0] });
      }

      // ── delete_account ────────────────────────────────────
      if (mode === 'delete_account') {
        // Require typed confirmation to prevent accidental deletion
        if (body.confirm !== 'DELETE MY ACCOUNT') {
          return res.status(400).json({
            error: 'Confirmation string missing or incorrect.',
            hint:  'Include { confirm: "DELETE MY ACCOUNT" } in the request body.',
          });
        }

        // Supabase Admin API — requires service key.
        // ON DELETE CASCADE on both user_favourites and user_profiles handles cleanup.
        const deleteRes = await fetch(
          sbAdmin(`users/${user.id}`),
          {
            method:  'DELETE',
            headers: {
              'apikey':        SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );

        if (!deleteRes.ok) {
          const detail = await deleteRes.text().catch(() => '');
          console.error('[user.js] delete_account failed:', deleteRes.status, detail);
          return res.status(500).json({ error: 'Account deletion failed.', detail });
        }

        return res.status(200).json({ ok: true, deleted: true, user_id: user.id });
      }

      // Unknown mode
      return res.status(400).json({
        error:       `Unknown mode: "${mode}".`,
        valid_modes: ['save_profile', 'claim_node', 'delete_account'],
      });
    }

    return res.status(405).json({ error: 'Method not allowed.' });

  } catch (err) {
    console.error('[user.js] unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
