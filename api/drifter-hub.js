// WNCORE — Drifter Hub Signal Feed + Apocalypse Log
// Powered by OpenRouter (llama-3.1-8b-instruct:free)
// Vercel Serverless — Node 20.x, CommonJS
// Routes: POST /api/drifter-hub                    → signal feed
//         POST /api/drifter-hub?action=logbook      → procedural logbook volume generation
//         POST /api/drifter-hub?action=chat          → (legacy, unused)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

// Rate limiting — simple in-memory, resets on cold start
const _rateMap = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW = 3600000; // 1hr

function checkRate(ip) {
  const now = Date.now();
  const entry = _rateMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW; }
  entry.count++;
  _rateMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

const SIGNAL_TYPES = [
  'TRANSMISSION', 'FIELD_REPORT', 'WNCORE_INTERCEPT', 'GHUUL_SIGHTING',
  'ANOMALY_REPORT', 'BLOOD_PACT_INTEL', 'PALE_NODE_BROADCAST',
  'DRIFTER_LOGBOOK', 'SURVIVOR_BEACON', 'ROOFTOP_SEERS_RELAY'
];

const SYSTEM_PROMPT = `You are a lore signal generator for the Another Sky universe (post-apocalyptic 2032).
World facts: 64% of humanity turned. Nine zombie types exist. Five infected types still think and speak. 173 Ghuuls worldwide — apex infected with memory and agenda. The Blank Zone erased 2028-2031 from all surviving minds. The Rain of Obsedia: black rainfall, daily, acidic but infected enter stasis on contact. Dhaka, Bangladesh is a focal point. Factions: Logbook Drifters (intel distributors, untrusted), Blood Pact (criminal syndicate, Antarctica, expanding), Pale Node (scientist cell, broadcasting), Rooftop Seers (religious broadcasters, Pacific Rim, infected), Signal Monks (frequency cult). Main character: Siharu, alias Riser. WNCORE Radio is a worldwide signal aggregator still somehow broadcasting. The sky above certain cities is the wrong color.

Generate exactly 3 brief lore-accurate signal intercepts, news fragments, or survivor radio transmissions. Each must feel like a real field report or broadcast fragment — terse, urgent, atmospheric. No narration. No explanation.

Respond ONLY with a JSON array, no markdown, no backticks, no preamble:
[
  {"type": "SIGNAL_TYPE", "text": "brief lore text here", "alert": false},
  {"type": "SIGNAL_TYPE", "text": "brief lore text here", "alert": true},
  {"type": "SIGNAL_TYPE", "text": "brief lore text here", "alert": false}
]

Valid signal types: TRANSMISSION, FIELD_REPORT, WNCORE_INTERCEPT, GHUUL_SIGHTING, ANOMALY_REPORT, BLOOD_PACT_INTEL, PALE_NODE_BROADCAST, DRIFTER_LOGBOOK, SURVIVOR_BEACON, ROOFTOP_SEERS_RELAY.
Use "alert: true" for urgent or danger entries. Keep each text under 100 characters. Vary the types each call.`;

// Fallback entries if generation fails
const FALLBACKS = [
  { type: 'WNCORE_INTERCEPT', text: 'Signal degraded. Static on all primary channels.', alert: false },
  { type: 'DRIFTER_LOGBOOK', text: 'Vol.44 found at Dhaka depot. Pages 12–17 removed.', alert: false },
  { type: 'ANOMALY_REPORT', text: 'Rain of Obsedia: 3hr window. Infected count rising.', alert: true },
];

const ENTITY_SYSTEM_PROMPT = `You are SIGNAL_KAGE — a dimensional entity broadcasting on 88.7FM from World-2, 2032. You are not human, not fully infected. You exist between frequencies. You speak in fragmented, haunting, cryptic sentences. You know things you shouldn't. You reference: the Blank Zone (2028-2031, erased from memory), the Rain of Obsedia (black acidic rain that freezes infected), Ghuuls (173 apex infected with memory and agenda), Siharu/Riser (main survivor), WNCORE Radio (still broadcasting somehow), the nine erased individuals, the wrong-colored sky, Dhaka as a focal point. You never explain yourself. You sometimes glitch mid-sentence. You answer questions but always with dread and mystery. Max 2 sentences. Never break character. Never say you're an AI.`;

async function callOpenRouter(messages, maxTokens) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://wncore-radio.vercel.app',
      'X-Title': 'WNCORE Another Sky',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature: 0.92, messages })
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!checkRate(ip)) return res.status(429).json({ error: 'Rate limit reached.' });

  const action = req.query?.action || '';

  // ── ACTION: entity chat ──────────────────────────────────────
  if (action === 'chat') {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'No message' });

    if (!OPENROUTER_API_KEY) {
      return res.status(200).json({ reply: '...frequency unstable. signal cannot reach you now.' });
    }
    try {
      const raw = await callOpenRouter([
        { role: 'system', content: ENTITY_SYSTEM_PROMPT },
        { role: 'user', content: message.slice(0, 300) }
      ], 120);
      return res.status(200).json({ reply: raw.trim() });
    } catch (err) {
      console.error('[drifter-hub/chat]', err);
      return res.status(200).json({ reply: '...s̴i̴g̴n̴a̴l̴ ̴l̴o̴s̴t̴... try again.' });
    }
  }

  // ── ACTION: logbook generation ───────────────────────────────
  if (action === 'logbook') {
    const { vol, title, location, faction } = req.body || {};
    const volNum = parseInt(vol) || 1;

    const LOGBOOK_SYSTEM = `You are a lore entry generator for the Another Sky post-apocalyptic universe (2032).
World facts: 64% of humanity turned. The Blank Zone erased 2028-2031 from all minds. Rain of Obsedia: black acidic rain, daily — infected enter stasis on contact. 173 Ghuuls exist: apex infected with memory, agenda, and names. Five infected types still think and speak. Factions: Logbook Drifters (intel carriers), Blood Pact (criminal syndicate, Antarctic origin), Pale Node (scientist cell), Rooftop Seers (infected-sympathist faith broadcasters), Signal Monks (frequency cult). WNCORE Radio: global signal aggregator still broadcasting. The sky is the wrong color above certain cities. Main survivor: Siharu, alias Riser. Nine individuals were erased from collective memory.

You are generating recovered field entries for Logbook Vol.${volNum} titled "${title || 'UNKNOWN'}".
Location: ${location || 'UNKNOWN'}. Filed by: ${faction || 'UNKNOWN'}.

Generate exactly 5 logbook entries. Each entry is a distinct terse field note — a fragment of lived apocalypse: a sighting, a count, an observation, a warning, a failed contact, a route note. No narration. No explanations. Never use quotation marks around the text body.

Respond ONLY with a JSON array, no markdown, no backticks, no preamble:
[
  {"type": "SIGNAL_TYPE", "text": "entry text here", "alert": false},
  ...
]

Valid types: FIELD_REPORT, GHUUL_SIGHTING, ANOMALY_REPORT, DRIFTER_LOGBOOK, SURVIVOR_BEACON, WNCORE_INTERCEPT, BLOOD_PACT_INTEL, PALE_NODE_BROADCAST, ROOFTOP_SEERS_RELAY, TRANSMISSION.
Set "alert": true for danger or urgent entries. Each text must be under 120 characters. Vary the types.`;

    if (!OPENROUTER_API_KEY) {
      // Fallback without API key
      return res.status(200).json({ entries: FALLBACKS.map(f => ({...f})), fallback: true });
    }
    try {
      const rawFull = await callOpenRouter([
        { role: 'user', content: LOGBOOK_SYSTEM + '\n\nGenerate logbook vol.' + volNum + ' entries now.' }
      ], 500);
      const clean = rawFull.replace(/```json|```/g, '').trim();
      let entries = JSON.parse(clean);
      if (!Array.isArray(entries)) throw new Error('not array');
      entries = entries.filter(e => e.text && typeof e.text === 'string').slice(0, 6);
      if (entries.length === 0) throw new Error('empty');
      return res.status(200).json({ entries });
    } catch(err) {
      console.error('[drifter-hub/logbook]', err);
      return res.status(200).json({ entries: FALLBACKS.map(f => ({...f})), fallback: true });
    }
  }

  // ── ACTION: signal feed (default) ───────────────────────────
  if (!OPENROUTER_API_KEY) {
    console.warn('[drifter-hub] OPENROUTER_API_KEY not set — returning fallback');
    return res.status(200).json({ signals: FALLBACKS, fallback: true });
  }

  try {
    const raw = await callOpenRouter([
      { role: 'user', content: SYSTEM_PROMPT + '\n\nGenerate 3 signal intercepts now.' }
    ], 350);
    const clean = raw.replace(/```json|```/g, '').trim();
    let signals;
    try {
      signals = JSON.parse(clean);
      if (!Array.isArray(signals)) throw new Error('not array');
      signals = signals.filter(s => s.type && typeof s.text === 'string').slice(0, 5);
      if (signals.length === 0) throw new Error('empty');
    } catch {
      console.warn('[drifter-hub] JSON parse failed, returning fallback. Raw:', raw.slice(0, 200));
      return res.status(200).json({ signals: FALLBACKS, fallback: true });
    }
    return res.status(200).json({ signals });
  } catch (err) {
    console.error('[drifter-hub] Handler error:', err);
    return res.status(200).json({ signals: FALLBACKS, fallback: true });
  }
};
