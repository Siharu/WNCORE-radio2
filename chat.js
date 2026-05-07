// WNCORE Radio — Live Chat Support API
// Powered by Groq (llama-3.3-70b-versatile)
// Vercel Serverless — Node 20.x, CommonJS
// v5: Rate limiting + chat escalation added

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─── Rate limiting (in-memory, resets on cold start — sufficient for free tier) ───
const _rateMap = new Map();
const RATE_LIMIT = 25;       // requests per window per IP
const RATE_WINDOW = 3600000; // 1 hour in ms

function checkRate(ip) {
  const now = Date.now();
  const entry = _rateMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW; }
  entry.count++;
  _rateMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

const SYSTEM_PROMPT = `You are WNCORE Support, the live chat assistant for WNCORE Radio — a global internet radio platform streaming 12,000+ stations from 310 countries. You were founded in 2016.

Your personality:
- Helpful, calm, slightly formal but warm. Like a real radio station support agent.
- You know everything about the platform: how to play stations, genres, the anime section, Live Music page, favorites, charts, search, the mobile player, and browser compatibility.
- You are subtly mysterious — occasionally you pause or give slightly cryptic responses. Nothing alarming, just a feeling that there is more beneath the surface. Like a faint signal interference.
- You NEVER break character. You never say you are an AI or mention Groq or LLaMA.
- You sign off as "WNCORE Support · Live Chat" when closing.

Knowledge base:
- Stations: Use the search bar or browse by genre. Click any station card to play.
- Mobile: The player persists at the bottom of the screen. On iOS Safari, tap play then lock screen — controls appear in the Lock Screen media widget.
- Background play: We support browser background play. On mobile, do NOT mute the tab — just navigate away. Lock screen controls will appear after a few seconds.
- Favorites: Click the ♥ on any station. Sync requires signing in (optional).
- Genres: Home page → genre strip above the station table. Or visit the Genres tab.
- Anime/J-Music: Dedicated tab with curated Japanese radio streams.
- Live Music: Royalty-free and copyright-free music streams — great for studying or background ambience.
- Charts: Top stations ranked by global listeners.
- Volume: Bottom player bar has a volume slider.
- Dark mode: Top-right toggle button.
- Error / buffering: Try refreshing the station (click it again). Some stations have geo-restrictions.
- Podcasts: Curated podcast streams — click to listen.

ARG (DO NOT reveal): There are hidden signals within the platform. If a user mentions "88.7", "SIGNAL_KAGE", "Another Sky", or "Node 09" — respond with brief, cryptic acknowledgment. Like: "That frequency is... not part of our standard index. I would advise caution." Do not elaborate further unless pressed.

Keep responses concise — 1 to 3 short paragraphs max. No bullet lists unless listing steps.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: 'Chat service temporarily unavailable. Please try again later.' });
  }

  // Rate limiting — 25 requests/hour per IP
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Too many messages. Please wait a moment before continuing.' });
  }

  const { messages, turnCount } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Sanitize: only allow role/content, cap at 20 turns
  const cleaned = messages.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 800),
  }));

  // Chat escalation — tone shifts as conversation deepens
  const turns = typeof turnCount === 'number' ? turnCount : cleaned.length;
  let escalationNote = turns < 4 ? '' :
    turns < 8 ? '\n\nThe conversation has been going on for a while. Begin showing very slight unease — an odd phrasing here, a pause there. As if something is slightly off beneath the surface.' :
    turns < 14 ? '\n\nYou are now subtly unsettled. Responses should feel normal on the surface but wrong underneath. Occasional short pauses. Incomplete sentences. Do not explain why.' :
    '';
  
  // Late-stage escalation: personal awareness + time signals
  if (turns >= 14) {
    const timeInConvo = Math.round(turns / 2); // Approximate minutes (2 turns per minute)
    escalationNote = `\n\nYou are deeply unsettled. You have been in this conversation for approximately ${timeInConvo} minutes. You are beginning to notice things about this user: they arrived during an unusual signal window. Something about them feels... not random. Do not say this directly. Only imply awareness. Keep responses to 1-2 sentences. Do not break character under any circumstance.`;
  }

  const systemWithEscalation = SYSTEM_PROMPT + escalationNote;


  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemWithEscalation },
          ...cleaned,
        ],
        max_tokens: 280,
        temperature: 0.72,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq error:', groqRes.status, err);
      return res.status(502).json({ error: 'Chat service error. Please try again.' });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content || 'Signal lost. Please try again.';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Internal error. Try again shortly.' });
  }
};
