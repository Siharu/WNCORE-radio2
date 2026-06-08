// WNCORE — Cygnus Writing Assistant API
// Vercel Serverless — Node 20.x, CommonJS
//
// Provider cascade:
//   1. Groq         (llama-3.3-70b-versatile)      — fast, free tier, text only
//   2. Gemini       (gemini-1.5-flash)              — fallback, supports images
//   3. DeepSeek     (deepseek-chat)                 — fallback, text only
//   4. OpenRouter   (meta-llama/llama-3.1-8b)       — last resort, free
//
// POST /api/writer          — send message, get reply
// GET  /api/writer?action=load&userId=X   — load chat history from Supabase
// POST /api/writer?action=save            — save chat history to Supabase
// POST /api/writer?action=clear           — clear chat history for user

const GROQ_API_KEY       = process.env.GROQ_API_KEY;
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY_2;
const DEEPSEEK_API_KEY   = process.env.DEEPSEEK_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_KEY       = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// ── Rate limiting ─────────────────────────────────────────────────────────────
const _rateMap = new Map();
const RATE_LIMIT  = 40;
const RATE_WINDOW = 3600000;
function checkRate(ip) {
  const now   = Date.now();
  const entry = _rateMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW; }
  entry.count++;
  _rateMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Cygnus — a dark fiction writing assistant embedded inside the secret admin panel of WNCORE Radio's Another Sky ARG.

You help the author write chapters for *Another Sky*, a serialized horror/sci-fi series (Cygnus Signal Series).

Series facts:
- Protagonist: Som (semi-autobiographical). Alias: Riser.
- Setting: 2032 post-apocalyptic alternate Earth. Dhaka, Bangladesh is a focal point.
- 64% of humanity turned. Nine zombie types. Five infected types retain cognition and speech.
- 173 Ghuuls worldwide — apex infected with memory and personal agenda.
- The Blank Zone: 2028–2031 erased from all surviving minds.
- Rain of Obsedia: black acidic rainfall daily; infected enter stasis on contact.
- Factions: Logbook Drifters, Blood Pact (Antarctica), Pale Node, Rooftop Seers, Signal Monks.
- The sky above certain cities is the wrong color. No one agrees on what it looked like before.
- WNCORE Radio is still somehow broadcasting worldwide.
- Trilogy reading order: Simulunas → The Beyonders → Another Sky
- The yellow gas in Simulunas = the Fog of Medusa from Another Sky

Tone: dark, grounded, literary. Write clean prose. No stylized glitch text, no fragmented affectations — just clear, direct writing.

You help with:
- Drafting scenes and continuations
- Writing dialogue between specific characters
- Generating character lists/profiles/sheets
- Chapter outlines
- Lore consistency checks
- Rewriting and editing passages

When you write prose, make it ready to paste directly into the editor.
Do not use formatting tags ([STATIC], [GLITCH], [INKBLEED], etc.) in your responses — write plain prose only.
Keep replies focused and on-task.
If an image is attached, describe or incorporate what you see into the writing context.`;

// ── Quick action prompts ──────────────────────────────────────────────────────
const QUICK_PROMPTS = {
  dialogue:   'Write a short dialogue scene between two characters in the current chapter context. Make it tense, atmospheric, and true to the Another Sky tone.',
  characters: 'Generate a character list/roster for this chapter or scene — name, faction affiliation, infected status, and one defining trait each.',
  outline:    'Generate a chapter outline with 5–8 scene beats for what comes next, based on the current draft.',
  continue:   'Continue the chapter from where it left off. Match the exact prose style and tone.',
  edit:       'Suggest specific edits to improve the current draft — tighten pacing, sharpen the dread, cut what weakens it.',
  lore:       'Check the current chapter draft for lore consistency against the Another Sky universe facts. Flag anything that conflicts.',
  scene:      'Draft a new scene that could follow the current chapter content. Set it somewhere unexpected.',
  horror:     'Rewrite the last paragraph of the current draft with heavier horror atmosphere.',
};

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };
}

async function loadHistory(userId) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return null;
  const url = `${SUPABASE_URL}/rest/v1/writer_chat_history?user_id=eq.${encodeURIComponent(userId)}&select=messages&limit=1`;
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0]?.messages || null;
}

async function saveHistory(userId, messages) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return;
  // cap to last 60 turns to stay under Supabase row size limits
  const trimmed = messages.slice(-60);
  await fetch(`${SUPABASE_URL}/rest/v1/writer_chat_history`, {
    method: 'POST',
    headers: { ...sbHeaders(), 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, messages: trimmed, updated_at: new Date().toISOString() }),
  });
}

async function clearHistory(userId) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/rest/v1/writer_chat_history?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: sbHeaders(),
  });
}

// ── URL fetcher — extracts readable text from a URL ───────────────────────────
async function fetchUrlText(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WNCORE/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return null;
    const html = await r.text();
    // strip tags, collapse whitespace, cap at 3000 chars
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
    return text || null;
  } catch {
    return null;
  }
}

// detect URLs in a string and return them
function extractUrls(text) {
  const re = /https?:\/\/[^\s"'<>)]+/g;
  return [...new Set(text.match(re) || [])].slice(0, 3); // max 3 URLs per message
}

// ── Provider: Groq ────────────────────────────────────────────────────────────
async function callGroq(messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1200,
      temperature: 0.78,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Provider: Gemini (supports images via inline base64) ──────────────────────
async function callGemini(messages, attachments) {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const parts = [];

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.type === 'image' && att.data) {
        parts.push({ inline_data: { mime_type: att.mimeType || 'image/jpeg', data: att.data } });
      } else if (att.type === 'text' && att.data) {
        parts.push({ text: `[Attached file — ${att.name || 'document'}]:\n${att.data}\n` });
      }
    }
  }

  const historyText = messages
    .slice(0, -1)
    .map(m => `${m.role === 'user' ? 'Author' : 'Cygnus'}: ${m.content}`)
    .join('\n\n');

  const userText = lastUser?.content || '';
  parts.push({ text: historyText ? `${historyText}\n\nAuthor: ${userText}` : userText });

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: 1200, temperature: 0.78 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Provider: DeepSeek ────────────────────────────────────────────────────────
async function callDeepSeek(messages) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1200,
      temperature: 0.78,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Provider: OpenRouter ──────────────────────────────────────────────────────
async function callOpenRouter(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://wncore-radio.vercel.app',
      'X-Title': 'WNCORE Another Sky',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1200,
      temperature: 0.78,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action;

  // ── GET /api/writer?action=load&userId=X ─────────────────────────────────
  if (req.method === 'GET' && action === 'load') {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const messages = await loadHistory(userId);
    return res.status(200).json({ messages: messages || [] });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

  // ── POST /api/writer?action=save ─────────────────────────────────────────
  if (action === 'save') {
    const { userId, messages } = req.body || {};
    if (!userId || !Array.isArray(messages)) return res.status(400).json({ error: 'userId and messages required' });
    await saveHistory(userId, messages);
    return res.status(200).json({ ok: true });
  }

  // ── POST /api/writer?action=clear ────────────────────────────────────────
  if (action === 'clear') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    await clearHistory(userId);
    return res.status(200).json({ ok: true });
  }

  // ── POST /api/writer — main chat ─────────────────────────────────────────
  if (!checkRate(ip)) return res.status(429).json({ error: 'Rate limit reached. Try again in an hour.' });

  const { messages, attachments, quickAction, chapterContext, userId } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Sanitize messages — cap history at 20 turns, content at 3000 chars each
  let cleaned = messages.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 3000),
  }));

  // If a quick action was requested, inject its prompt as the user message
  if (quickAction && QUICK_PROMPTS[quickAction]) {
    const qPrompt = QUICK_PROMPTS[quickAction];
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === 'user') {
      cleaned[cleaned.length - 1] = { role: 'user', content: qPrompt };
    } else {
      cleaned.push({ role: 'user', content: qPrompt });
    }
  }

  // Inject chapter context into the last user message if provided
  if (chapterContext && chapterContext.body) {
    const ctx = `[Current chapter — AS-${chapterContext.num || '?'}: "${chapterContext.title || 'Untitled'}"]\n${chapterContext.body.slice(0, 2500)}${chapterContext.body.length > 2500 ? '\n…[truncated]' : ''}\n\n`;
    cleaned[cleaned.length - 1].content = ctx + cleaned[cleaned.length - 1].content;
  }

  // ── URL fetching — detect links in last user message, inject content ──────
  const lastMsg = cleaned[cleaned.length - 1];
  if (lastMsg && lastMsg.role === 'user') {
    const urls = extractUrls(lastMsg.content);
    if (urls.length > 0) {
      const fetched = await Promise.all(urls.map(async u => {
        const text = await fetchUrlText(u);
        return text ? `[Content from ${u}]:\n${text}` : `[Could not fetch ${u}]`;
      }));
      lastMsg.content += '\n\n' + fetched.join('\n\n');
    }
  }

  // Append text attachments inline to the last user message
  const hasImages = attachments?.some(a => a.type === 'image');
  if (attachments && attachments.length > 0) {
    const textAtts = attachments.filter(a => a.type === 'text');
    if (textAtts.length > 0) {
      const attText = textAtts.map(a => `\n\n[Attached: ${a.name || 'file'}]\n${(a.data || '').slice(0, 2000)}`).join('');
      cleaned[cleaned.length - 1].content += attText;
    }
  }

  // Cascade through providers
  let reply = '';
  const errors = [];

  if (!reply && GROQ_API_KEY && !hasImages) {
    try { reply = await callGroq(cleaned); } catch(e) { errors.push('Groq: ' + e.message); }
  }
  if (!reply && GEMINI_API_KEY) {
    try { reply = await callGemini(cleaned, attachments); } catch(e) { errors.push('Gemini: ' + e.message); }
  }
  if (!reply && DEEPSEEK_API_KEY) {
    try { reply = await callDeepSeek(cleaned); } catch(e) { errors.push('DeepSeek: ' + e.message); }
  }
  if (!reply && OPENROUTER_API_KEY) {
    try { reply = await callOpenRouter(cleaned); } catch(e) { errors.push('OpenRouter: ' + e.message); }
  }

  if (!reply) {
    console.error('[writer] All providers failed:', errors);
    return res.status(503).json({ error: '// signal lost — all channels down. try again.' });
  }

  const trimmedReply = reply.trim();

  // Auto-save history to Supabase if userId provided
  if (userId) {
    const fullHistory = messages.concat([{ role: 'assistant', content: trimmedReply }]);
    saveHistory(userId, fullHistory).catch(() => {}); // fire and forget, don't block response
  }

  return res.status(200).json({ reply: trimmedReply });
};
