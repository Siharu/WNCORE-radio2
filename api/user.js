// WNCORE Radio — /api/user.js
// Unified user profile + Siharu ARG badge API.
// Zero external dependencies. Runs as a Vercel serverless function.
//
//   GET  /api/user                         → fetch own profile row
//   POST /api/user  mode=save_profile      → upsert all editable profile fields
//   POST /api/user  mode=claim_node        → validate + reserve a permanent Node ID
//   POST /api/user  mode=delete_account    → permanently delete account + cascade
//   POST /api/user  mode=siharu_visit      → log a Siharu ARG visit, award cred XP
//                                            (IP-rate-limited: once per 3–4 days)
//   GET  /api/user  mode=listeners         → public listener list (no auth needed)
//
// Auth pattern (all modes except listeners):
//   Authorization: Bearer <supabase_access_token>
//   We verify server-side with auth.getUser() using the service key.
//
// ─── Siharu Cred / Badge System ──────────────────────────────────────────────
//
//   Each visit to siharu.vercel.app that resolves back to WNCORE awards XP.
//   XP is stored in `siharu_xp` (int, cumulative). `clearance_level` is derived
//   server-side so it cannot be spoofed by the client:
//
//     Level 0 — UNVERIFIED     (0 xp)
//     Level 1 — OPERATOR       (≥ 1 confirmed visits)
//     Level 2 — RELAY NODE     (≥ 5 confirmed visits)
//     Level 3 — SIGNAL BREACH  (≥ 12 confirmed visits)
//     Level 4 — GHOST PROTOCOL (≥ 25 confirmed visits — rarest badge)
//
//   Badge pixel art is served as a DiceBear pixel-art SVG with a deterministic
//   seed built from the user's node_id + clearance_level, so each user gets a
//   unique-looking badge that upgrades visually with their level.
//
//   Rate limit: one XP award per IP per 3–4 day window (stored in Supabase).
//   The cooldown scales: first visit = 3 days, subsequent = 4 days.
//   This prevents abuse while letting dedicated ARG explorers level up.

'use strict';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

// ─── CRED LEVEL THRESHOLDS ────────────────────────────────────────────────────

const CRED_LEVELS = [
  { level: 4, visits: 25, label: 'GHOST PROTOCOL',  badge: 'GHOST'  },
  { level: 3, visits: 12, label: 'SIGNAL BREACH',   badge: 'BREACH' },
  { level: 2, visits:  5, label: 'RELAY NODE',      badge: 'RELAY'  },
  { level: 1, visits:  1, label: 'OPERATOR',        badge: 'OP'     },
  { level: 0, visits:  0, label: 'UNVERIFIED',      badge: null     },
];

// Cooldown windows per visit number (ms)
// First visit → 3 days, subsequent → 4 days
const COOLDOWN_FIRST_MS     = 3 * 24 * 60 * 60 * 1000; // 72 h
const COOLDOWN_STANDARD_MS  = 4 * 24 * 60 * 60 * 1000; // 96 h

function computeClearance(siharuVisits) {
  const v = parseInt(siharuVisits || 0, 10);
  for (const tier of CRED_LEVELS) {
    if (v >= tier.visits) return tier.level;
  }
  return 0;
}

// Pixel badge URL — deterministic per user so it's visually unique and upgrades
// visually as the user's level increases.
function badgeUrl(nodeId, clearanceLevel) {
  if (!clearanceLevel) return null;
  // Seed = node_id (or a fallback) combined with level so avatar changes on level-up
  const seed = encodeURIComponent((nodeId || 'NODE_WNCORE') + '_L' + clearanceLevel);
  // pixel-art style for lore badge, shields overlay style for plain badges
  const style = clearanceLevel >= 3 ? 'pixel-art' : 'pixel-art-neutral';
  const bg = clearanceLevel >= 3 ? '&backgroundColor=111827' : '&backgroundColor=1a1a1a';
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&size=64${bg}`;
}

// ─── RESERVED / BLOCKED NAMES ────────────────────────────────────────────────

const RESERVED_NODE_IDS = new Set([
  'NODE_09','NODE_10','NODE_11','NODE_12','NODE_13','NODE_14','NODE_15',
  'NODE_16','NODE_17','NODE_18','NODE_19','NODE_20','NODE_21',
  'NODE_LA09','NODE_AM21','NODE_DM15',
  'NODE_000000','NODE_111111','NODE_FFFFFF',
  'NODE_ADMIN','NODE_WNCORE','NODE_SIHARU',
]);

const RESERVED_NAMES = new Set([
  'SIGNAL_KAGE','KAGE','NODE09',
  'LARS','LARS_09','AMARA','AMARA_21','DMITRI','DMITRI_15',
  'OBSEDIA','GHUUL','GHUULS','BLANK_ZONE','BLANKZONE',
  'MOON_DOME','MOONDOME','WNCORE','SIHARU',
  'FREQUENCY','UNKNOWN','REDACTED','EXPUNGED','SIGNAL',
  'ADMIN','OPERATOR','SYSTEM','ROOT','NULL',
  'MODERATOR','MOD','STAFF','SUPPORT','OFFICIAL',
]);

const BLOCKED_PATTERNS = [
  /^SIGNAL/i, /GHUUL/i, /OBSEDIA/i, /BLANKZONE/i,
  /MOONDOME/i, /^ADMIN/i, /^MOD$/i, /^STAFF/i,
  /^SYSTEM/i, /^ROOT$/i, /^NULL$/i,
];

// ─── VALIDATION ───────────────────────────────────────────────────────────────

function validateNodeId(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Node ID must be a string.' };
  const id = raw.trim().toUpperCase();
  if (!/^NODE_[A-Z0-9]{6}$/.test(id)) {
    return { ok: false, error: 'Node ID must be NODE_ followed by exactly 6 alphanumeric characters.' };
  }
  if (RESERVED_NODE_IDS.has(id)) return { ok: false, error: 'NODE_TAKEN' };
  return { ok: true, value: id };
}

function validateCallsign(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'Callsign must be a string.' };
  const cs = raw.trim().toUpperCase();
  if (cs.length === 0) return { ok: true, value: '' };
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
  if (!['dark', 'light', 'minimal'].includes(raw)) return { ok: false, error: 'Theme must be "dark", "light", or "minimal".' };
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

// ─── IP HELPERS ───────────────────────────────────────────────────────────────

function getClientIp(req) {
  // Vercel sets x-forwarded-for; take only the first (real client IP)
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Sanitise IP for use as a Supabase record key (strip IPv6 brackets, colons → dashes)
function sanitiseIp(ip) {
  return ip.replace(/[\[\]:]/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 64);
}

// ─── SIHARU VISIT RATE LIMITER ────────────────────────────────────────────────
// Uses a Supabase table `siharu_ip_log` (see SQL below) to track IP+user pairs.
//
// Required SQL (run once in Supabase SQL editor):
// ─────────────────────────────────────────────
// CREATE TABLE IF NOT EXISTS public.siharu_ip_log (
//   id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   ip_hash      text NOT NULL,
//   visit_count  int  NOT NULL DEFAULT 1,
//   last_visit   timestamptz NOT NULL DEFAULT now(),
//   next_allowed timestamptz NOT NULL DEFAULT now(),
//   UNIQUE (user_id, ip_hash)
// );
// ALTER TABLE public.siharu_ip_log ENABLE ROW LEVEL SECURITY;
// -- Service key only — no public access
// CREATE POLICY "service_only" ON public.siharu_ip_log FOR ALL USING (false);
// ─────────────────────────────────────────────

async function checkAndLogSiharuVisit(userId, rawIp) {
  const ip = sanitiseIp(rawIp);
  const now = new Date();

  // Fetch existing log for this user+ip
  const logRes = await fetch(
    sbRest(`siharu_ip_log?user_id=eq.${userId}&ip_hash=eq.${encodeURIComponent(ip)}&limit=1`),
    { headers: sbHeaders(SUPABASE_SERVICE_KEY, { 'Accept': 'application/json' }) }
  );
  if (!logRes.ok) throw new Error('DB read failed');
  const rows = await logRes.json();

  if (rows.length > 0) {
    const row = rows[0];
    const nextAllowed = new Date(row.next_allowed);

    if (now < nextAllowed) {
      // Still in cooldown
      const msLeft = nextAllowed - now;
      const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
      const daysLeft  = (msLeft / (1000 * 60 * 60 * 24)).toFixed(1);
      return {
        allowed: false,
        reason: 'RATE_LIMITED',
        cooldown_hours: hoursLeft,
        cooldown_days: daysLeft,
        next_allowed: nextAllowed.toISOString(),
        visit_count: row.visit_count,
      };
    }

    // Cooldown passed — allow, update record
    // Each subsequent visit costs 4-day cooldown
    const newCount   = row.visit_count + 1;
    const cooldownMs = COOLDOWN_STANDARD_MS;
    const nextDate   = new Date(now.getTime() + cooldownMs);

    await fetch(
      sbRest(`siharu_ip_log?user_id=eq.${userId}&ip_hash=eq.${encodeURIComponent(ip)}`),
      {
        method: 'PATCH',
        headers: sbHeaders(SUPABASE_SERVICE_KEY),
        body: JSON.stringify({
          visit_count:  newCount,
          last_visit:   now.toISOString(),
          next_allowed: nextDate.toISOString(),
        }),
      }
    );

    return { allowed: true, visit_count: newCount, next_allowed: nextDate.toISOString() };
  }

  // First-ever visit from this IP — insert log row (3-day first cooldown)
  const nextDate = new Date(now.getTime() + COOLDOWN_FIRST_MS);
  await fetch(
    sbRest('siharu_ip_log'),
    {
      method: 'POST',
      headers: sbHeaders(SUPABASE_SERVICE_KEY, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        user_id:      userId,
        ip_hash:      ip,
        visit_count:  1,
        last_visit:   now.toISOString(),
        next_allowed: nextDate.toISOString(),
      }),
    }
  );

  return { allowed: true, visit_count: 1, next_allowed: nextDate.toISOString() };
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── LISTENERS (public, no auth) ─────────────────────────────────────────────
// Returns a combined list of real users (public-safe fields only) for the
// "Who's Listening" panel. Fake users are injected on the client side.

async function handleListeners(res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(200).json({ users: [], total: 0 });
  }

  try {
    const r = await fetch(
      sbRest('user_profiles?select=display_name,avatar_url,node_id,clearance_level,siharu_visits&display_name=not.is.null&order=updated_at.desc&limit=20'),
      { headers: sbHeaders(SUPABASE_SERVICE_KEY, { 'Accept': 'application/json' }) }
    );
    if (!r.ok) return res.status(200).json({ users: [], total: 0 });

    const rows = await r.json();
    const users = rows.map(row => {
      const cl = computeClearance(row.siharu_visits);
      return {
        display_name:    row.display_name,
        avatar_url:      row.avatar_url || null,
        node_id:         row.node_id    || null,
        clearance_level: cl,
        tainted:         (row.siharu_visits || 0) > 0,
        // Send pixel badge URL for ARG cred holders
        badge_url:       cl > 0 ? badgeUrl(row.node_id, cl) : null,
      };
    });

    return res.status(200).json({ users, total: users.length });
  } catch {
    return res.status(200).json({ users: [], total: 0 });
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Public: listeners list (no auth) ──────────────────────────────────────
  if (req.method === 'GET' && req.query?.mode === 'listeners') {
    return handleListeners(res);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'Supabase not configured.' });
  }

  // Extract Bearer token
  const authHeader  = req.headers['authorization'] || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // Verify user for all authenticated methods
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
      if (profile) {
        // Always recompute clearance server-side from siharu_visits
        profile.clearance_level = computeClearance(profile.siharu_visits);
        profile.badge_url = badgeUrl(profile.node_id, profile.clearance_level);
      }
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
          valid_modes: ['save_profile', 'claim_node', 'delete_account', 'siharu_visit'],
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
        // NOTE: siharu_visits/clearance_level are NOT settable here — only via siharu_visit mode
        if ('hide_email' in body) updates.hide_email = !!body.hide_email;

        if (Object.keys(errors).length > 0) {
          return res.status(422).json({ error: 'Validation failed', fields: errors });
        }

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
        const savedProfile = saved[0] || updates;
        // Always recompute clearance
        savedProfile.clearance_level = computeClearance(savedProfile.siharu_visits);
        savedProfile.badge_url = badgeUrl(savedProfile.node_id, savedProfile.clearance_level);
        return res.status(200).json({ ok: true, profile: savedProfile });
      }

      // ── siharu_visit — award cred XP for visiting Siharu ARG ─────────────
      if (mode === 'siharu_visit') {
        const clientIp = getClientIp(req);

        let limitResult;
        try {
          limitResult = await checkAndLogSiharuVisit(user.id, clientIp);
        } catch (e) {
          console.error('[user.js] siharu_visit rate-limit check failed:', e);
          return res.status(500).json({ error: 'Rate-limit check failed. Try again shortly.' });
        }

        if (!limitResult.allowed) {
          return res.status(429).json({
            error:         'RATE_LIMITED',
            message:       `Signal already logged. Next visit allowed in ${limitResult.cooldown_days} days.`,
            cooldown_hours: limitResult.cooldown_hours,
            next_allowed:  limitResult.next_allowed,
            visit_count:   limitResult.visit_count,
          });
        }

        // Increment siharu_visits in user_profiles
        const profile = await fetchProfile(user.id);
        const currentVisits = parseInt(profile?.siharu_visits || 0, 10);
        const newVisits = currentVisits + 1;
        const newClearance = computeClearance(newVisits);
        const oldClearance = computeClearance(currentVisits);
        const leveledUp = newClearance > oldClearance;

        const upsertRes = await fetch(
          sbRest('user_profiles?on_conflict=user_id'),
          {
            method: 'POST',
            headers: sbHeaders(SUPABASE_SERVICE_KEY, {
              'Prefer': 'resolution=merge-duplicates,return=representation',
            }),
            body: JSON.stringify({
              user_id:         user.id,
              siharu_visits:   newVisits,
              clearance_level: newClearance,
              updated_at:      new Date().toISOString(),
            }),
          }
        );

        if (!upsertRes.ok) {
          const detail = await upsertRes.text().catch(() => '');
          return res.status(500).json({ error: 'Failed to record visit.', detail });
        }

        const saved = (await upsertRes.json().catch(() => [{}]))[0] || {};
        const levelInfo = CRED_LEVELS.find(l => l.level === newClearance);

        return res.status(200).json({
          ok:             true,
          visit_count:    newVisits,
          clearance_level: newClearance,
          clearance_label: levelInfo?.label || 'UNVERIFIED',
          leveled_up:     leveledUp,
          badge_url:      newClearance > 0 ? badgeUrl(saved.node_id || profile?.node_id, newClearance) : null,
          next_allowed:   limitResult.next_allowed,
          // ARG lore hint for the client to display if they leveled up
          lore_signal:    leveledUp ? _loreSignal(newClearance) : null,
        });
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
        if (body.confirm !== 'DELETE MY ACCOUNT') {
          return res.status(400).json({
            error: 'Confirmation string missing or incorrect.',
            hint:  'Include { confirm: "DELETE MY ACCOUNT" } in the request body.',
          });
        }

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

      return res.status(400).json({
        error:       `Unknown mode: "${mode}".`,
        valid_modes: ['save_profile', 'claim_node', 'delete_account', 'siharu_visit'],
      });
    }

    return res.status(405).json({ error: 'Method not allowed.' });

  } catch (err) {
    console.error('[user.js] unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// ─── LORE SIGNALS (ARG flavour on level-up) ───────────────────────────────────

function _loreSignal(level) {
  const signals = {
    1: '> OPERATOR STATUS CONFIRMED. WELCOME TO THE GRID.',
    2: '> RELAY NODE ACTIVE. SIGNAL STRENGTH INCREASING. THEY HAVE NOTICED.',
    3: '> SIGNAL BREACH DETECTED. THE ARCHIVE REMEMBERS YOU. SIHARU SEES.',
    4: '> GHOST PROTOCOL ENGAGED. YOU SHOULD NOT BE HERE. AND YET — HERE YOU ARE.',
  };
  return signals[level] || null;
}

// ─── SQL SETUP REMINDER ───────────────────────────────────────────────────────
// Run this SQL in Supabase to add the required columns + IP log table:
//
// -- Add ARG columns to user_profiles (if not already present)
// ALTER TABLE public.user_profiles
//   ADD COLUMN IF NOT EXISTS siharu_visits   int  NOT NULL DEFAULT 0,
//   ADD COLUMN IF NOT EXISTS clearance_level int  NOT NULL DEFAULT 0;
//
// -- Siharu IP rate-limit log
// CREATE TABLE IF NOT EXISTS public.siharu_ip_log (
//   id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   ip_hash      text NOT NULL,
//   visit_count  int  NOT NULL DEFAULT 1,
//   last_visit   timestamptz NOT NULL DEFAULT now(),
//   next_allowed timestamptz NOT NULL DEFAULT now(),
//   UNIQUE (user_id, ip_hash)
// );
// ALTER TABLE public.siharu_ip_log ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "service_only" ON public.siharu_ip_log FOR ALL USING (false);
