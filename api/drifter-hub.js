// WNCORE — Drifter Hub Signal Feed
// Powered by OpenRouter (llama-3.1-8b-instruct:free)
// Vercel Serverless — Node 20.x, CommonJS

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!OPENROUTER_API_KEY) {
    console.warn('[drifter-hub] OPENROUTER_API_KEY not set — returning fallback');
    return res.status(200).json({ signals: FALLBACKS, fallback: true });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Rate limit reached.' });
  }

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://wncore-radio.vercel.app',
        'X-Title': 'WNCORE Another Sky',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        temperature: 0.88,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Generate 3 new signal entries. Seed: ${Date.now()}` }
        ]
      })
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.error('[drifter-hub] OpenRouter error:', orRes.status, errText);
      return res.status(200).json({ signals: FALLBACKS, fallback: true });
    }

    const data = await orRes.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let signals;
    try {
      signals = JSON.parse(clean);
      if (!Array.isArray(signals)) throw new Error('not array');
      // Validate each entry
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
