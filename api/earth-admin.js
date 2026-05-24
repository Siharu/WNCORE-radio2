// WNCORE Earth Admin — Vercel Serverless API Route
// POST /api/earth-admin  — authenticate + generate lore via Groq + save to Supabase
// GET  /api/earth-admin  — load all saved earth lore entries (public read)

const supabaseUrl   = process.env.SUPABASE_URL;
const supabaseKey   = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const earthPassword = process.env.EARTH_ADMIN;
const groqKey       = process.env.GROQ_API_KEY;

/* ─── Supabase helpers ─────────────────────────────────────────── */
function sbUrl(path)        { return `${supabaseUrl}/rest/v1/${path}`; }
function sbHeaders(extra={}) {
  return { 'Content-Type':'application/json', 'apikey':supabaseKey,
    'Authorization':`Bearer ${supabaseKey}`, ...extra };
}

/* ─── Groq call ────────────────────────────────────────────────── */
async function callGroq(systemPrompt, userPrompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.85,
      messages: [
        { role:'system', content: systemPrompt },
        { role:'user',   content: userPrompt   },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(()=>'');
    throw new Error(`Groq error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/* ─── Main handler ──────────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-earth-password');
  if (req.method === 'OPTIONS') return res.status(200).end();

  /* ── GET: load all saved lore ─────────────────────────────── */
  if (req.method === 'GET') {
    if (!supabaseUrl || !supabaseKey) return res.status(200).json({ entries: [] });
    try {
      const r = await fetch(
        sbUrl('earth_lore?select=*&order=updated_at.desc'),
        { headers: sbHeaders({ Accept:'application/json' }) }
      );
      if (!r.ok) return res.status(200).json({ entries: [] });
      const rows = await r.json();
      return res.status(200).json({ entries: rows || [] });
    } catch(e) {
      console.error('earth-admin GET error:', e);
      return res.status(200).json({ entries: [] });
    }
  }

  /* ── POST: auth + generate + save ────────────────────────── */
  if (req.method === 'POST') {
    // 1. Password check
    if (!earthPassword) return res.status(503).json({ error: 'EARTH_ADMIN env var not set on Vercel.' });
    const submitted = req.headers['x-earth-password'] || req.body?.password;
    if (submitted !== earthPassword) return res.status(401).json({ error: 'Wrong password.' });

    // 2. Parse body
    const {
      action,          // 'auth_check' | 'generate' | 'save_raw' | 'delete'
      countryCode,     // e.g. 'BD'
      countryName,     // e.g. 'Bangladesh'
      countryStatus,   // e.g. 'overrun'
      existingSituation,
      adminNotes,      // what the admin typed
      entryId,         // for delete
    } = req.body || {};

    // Auth probe
    if (action === 'auth_check') return res.status(200).json({ ok: true });

    // Delete entry
    if (action === 'delete') {
      if (!entryId) return res.status(400).json({ error: 'Missing entryId' });
      if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Supabase not configured' });
      const delRes = await fetch(
        sbUrl(`earth_lore?id=eq.${entryId}`),
        { method:'DELETE', headers: sbHeaders() }
      );
      return res.status(delRes.ok ? 200 : 500).json({ ok: delRes.ok });
    }

    // Save raw (no Groq, just store the admin's text directly)
    if (action === 'save_raw') {
      if (!countryCode || !adminNotes) return res.status(400).json({ error: 'Missing countryCode or adminNotes' });
      if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Supabase not configured' });
      const row = {
        country_code:   countryCode.toUpperCase(),
        country_name:   countryName || countryCode,
        situation_text: adminNotes.trim(),
        admin_notes:    adminNotes.trim(),
        updated_at:     new Date().toISOString(),
        generated:      false,
      };
      const upsertRes = await fetch(
        sbUrl('earth_lore?on_conflict=country_code'),
        {
          method:'POST',
          headers: sbHeaders({ Prefer:'resolution=merge-duplicates,return=representation' }),
          body: JSON.stringify(row),
        }
      );
      const saved = await upsertRes.json().catch(()=>({}));
      return res.status(upsertRes.ok ? 200 : 500).json({ ok: upsertRes.ok, entry: saved });
    }

    // Generate with Groq
    if (action === 'generate') {
      if (!countryCode || !adminNotes) return res.status(400).json({ error: 'Missing countryCode or adminNotes' });
      if (!groqKey) return res.status(503).json({ error: 'GROQ_API_KEY not set on Vercel.' });

      const systemPrompt = `You are a lore writer for WNCORE, a post-apocalyptic alternate reality game set in 2032.
An outbreak began in Nepal/Bangladesh in early April 2032. The world is devastated.
Factions include: Remaining Government (Alaska stronghold), Blood Pact (criminal Antarctica base), White Flag NGO, Logbook Drifters, Rooftop Seers, Signal Monks, Pale Node, Cartographers, Kraken's Paw.
Key lore: SIGNAL_KAGE transmits on 88.7 FM, there are 173 Ghuul entities, the Blank Zone (2028–2031), Obsedia black rain, a character called "S" (Siharu847) who disappeared April 1st.
You write terse, atmospheric situation reports — the kind that would appear in a classified intelligence briefing. 2-4 short paragraphs. No headers. No bullet points. No markdown. Pure prose. 
Dark, specific, haunting. Include radio signals, faction activity, strange anomalies. Every situation should feel like it has a secret underneath it.
Do NOT start with the country name. Do NOT use generic phrases like "the situation is dire". Be specific and strange.`;

      const userPrompt = `Country: ${countryName} (${countryCode}) — Status: ${countryStatus}
Previous situation (for context only, do NOT copy it): ${existingSituation || 'None'}
Admin notes to work into the new situation: ${adminNotes}
Write a new situation report for ${countryName} incorporating the admin notes.`;

      let generated = '';
      try {
        generated = await callGroq(systemPrompt, userPrompt);
      } catch(e) {
        console.error('Groq failed:', e);
        return res.status(502).json({ error: 'Groq generation failed: ' + e.message });
      }

      // Save to Supabase
      let saved = null;
      if (supabaseUrl && supabaseKey) {
        const row = {
          country_code:   countryCode.toUpperCase(),
          country_name:   countryName || countryCode,
          situation_text: generated,
          admin_notes:    adminNotes.trim(),
          updated_at:     new Date().toISOString(),
          generated:      true,
        };
        const upsertRes = await fetch(
          sbUrl('earth_lore?on_conflict=country_code'),
          {
            method:'POST',
            headers: sbHeaders({ Prefer:'resolution=merge-duplicates,return=representation' }),
            body: JSON.stringify(row),
          }
        );
        saved = await upsertRes.json().catch(()=>null);
      }

      return res.status(200).json({ ok:true, situationText: generated, saved });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
