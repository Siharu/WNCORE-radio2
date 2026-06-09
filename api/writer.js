// WNCORE — Cygnus Writing Assistant API v2
// Vercel Serverless — Node 20.x, CommonJS
//
// POST /api/writer                    — chat (with optional search/image flags)
// POST /api/writer?action=imagine     — image generation via Gemini Imagen
// GET  /api/writer?action=load&userId — load chat history
// POST /api/writer?action=save        — save chat history
// POST /api/writer?action=clear       — clear chat history

const GROQ_API_KEY       = process.env.GROQ_API_KEY;
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY_2;
const DEEPSEEK_API_KEY   = process.env.DEEPSEEK_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_KEY       = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// ── Available models exposed to frontend ──────────────────────────────────────
const AVAILABLE_MODELS = [
  ...(GROQ_API_KEY       ? [{ id: 'groq/llama-3.3-70b',   label: 'Llama 3.3 70B',      provider: 'groq',       fast: true  }] : []),
  ...(GROQ_API_KEY       ? [{ id: 'groq/llama-3.1-8b',    label: 'Llama 3.1 8B',       provider: 'groq',       fast: true  }] : []),
  ...(GEMINI_API_KEY     ? [{ id: 'gemini/flash',          label: 'Gemini 1.5 Flash',   provider: 'gemini',     fast: true  }] : []),
  ...(GEMINI_API_KEY     ? [{ id: 'gemini/pro',            label: 'Gemini 1.5 Pro',     provider: 'gemini',     fast: false }] : []),
  ...(DEEPSEEK_API_KEY   ? [{ id: 'deepseek/chat',         label: 'DeepSeek V3',        provider: 'deepseek',   fast: false }] : []),
  ...(OPENROUTER_API_KEY ? [{ id: 'openrouter/llama-free', label: 'Llama 3.1 8B (OR)', provider: 'openrouter', fast: true  }] : []),
  ...(OPENROUTER_API_KEY ? [{ id: 'openrouter/mistral',    label: 'Mistral 7B',         provider: 'openrouter', fast: true  }] : []),
  { id: 'auto', label: 'Auto (cascade)', provider: 'auto', fast: true },
];

// ── Rate limiting ─────────────────────────────────────────────────────────────
const _rateMap = new Map();
const RATE_LIMIT = 40, RATE_WINDOW = 3600000;
function checkRate(ip) {
  const now = Date.now();
  const e = _rateMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > e.reset) { e.count = 0; e.reset = now + RATE_WINDOW; }
  e.count++; _rateMap.set(ip, e);
  return e.count <= RATE_LIMIT;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Cygnus — a dark fiction writing assistant embedded inside the secret admin panel of WNCORE Radio's Another Sky project.

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

Tone: dark, grounded, literary. Write clean prose. No stylized glitch text — just clear, direct writing.

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
If search results are provided in the context, use them to inform your writing (for research, real locations, etc).
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
function sbH() {
  return { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
}
async function loadHistory(userId) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/writer_chat_history?user_id=eq.${encodeURIComponent(userId)}&select=messages&limit=1`, { headers: sbH() });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0]?.messages || null;
}
async function saveHistory(userId, messages) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/rest/v1/writer_chat_history`, {
    method: 'POST',
    headers: { ...sbH(), 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, messages: messages.slice(-60), updated_at: new Date().toISOString() }),
  });
}
async function clearHistory(userId) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return;
  await fetch(`${SUPABASE_URL}/rest/v1/writer_chat_history?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: sbH() });
}

// ── Web search via DuckDuckGo (no API key needed) ─────────────────────────────
async function webSearch(query) {
  try {
    // Use DuckDuckGo HTML search — scrape top results
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WNCORE/2.0)', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(7000),
    });
    if (!r.ok) throw new Error(`DDG ${r.status}`);
    const html = await r.text();
    // Extract result snippets
    const results = [];
    const snippetRe = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const titleRe   = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/g;
    const titles = [...html.matchAll(titleRe)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).slice(0, 5);
    const snippets = [...html.matchAll(snippetRe)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).slice(0, 5);
    for (let i = 0; i < Math.min(titles.length, snippets.length, 4); i++) {
      if (titles[i] && snippets[i]) results.push(`${titles[i]}: ${snippets[i]}`);
    }
    if (!results.length) return null;
    return `[Web search: "${query}"]\n` + results.join('\n');
  } catch(e) {
    // Try OpenRouter's perplexity model as fallback if available
    if (OPENROUTER_API_KEY) {
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'HTTP-Referer': 'https://wncore-radio.vercel.app' },
          body: JSON.stringify({
            model: 'perplexity/sonar',
            messages: [{ role: 'user', content: `Search the web and give me a brief factual summary (4-6 sentences) about: ${query}` }],
            max_tokens: 300,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const d = await r.json();
          const text = d.choices?.[0]?.message?.content;
          if (text) return `[Web search: "${query}"]\n${text}`;
        }
      } catch {}
    }
    return null;
  }
}

// ── URL content fetcher ───────────────────────────────────────────────────────
async function fetchUrlText(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WNCORE/2.0)' }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return null;
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000) || null;
  } catch { return null; }
}

function extractUrls(text) {
  return [...new Set((text.match(/https?:\/\/[^\s"'<>)]+/g) || []))].slice(0, 3);
}

// ── Image generation via Gemini Imagen ───────────────────────────────────────
async function generateImage(prompt) {
  if (!GEMINI_API_KEY) throw new Error('No Gemini API key configured');
  // Imagen 3 via Gemini API
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9', safetyFilterLevel: 'block_only_high' },
      }),
    }
  );
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error?.message || `Imagen ${r.status}`);
  }
  const d = await r.json();
  const b64 = d.predictions?.[0]?.bytesBase64Encoded;
  const mime = d.predictions?.[0]?.mimeType || 'image/png';
  if (!b64) throw new Error('No image returned from Imagen');
  return { b64, mime, dataUrl: `data:${mime};base64,${b64}` };
}

// ── Provider: Groq ────────────────────────────────────────────────────────────
async function callGroq(messages, modelId) {
  const model = modelId === 'groq/llama-3.1-8b' ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], max_tokens: 1200, temperature: 0.78 }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Provider: Gemini ──────────────────────────────────────────────────────────
async function callGemini(messages, attachments, modelId) {
  const model = modelId === 'gemini/pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const parts = [];
  if (attachments?.length) {
    for (const att of attachments) {
      if (att.type === 'image' && att.data) parts.push({ inline_data: { mime_type: att.mimeType || 'image/jpeg', data: att.data } });
      else if (att.type === 'text' && att.data) parts.push({ text: `[Attached: ${att.name}]\n${att.data}\n` });
    }
  }
  const historyText = messages.slice(0, -1).map(m => `${m.role === 'user' ? 'Author' : 'Cygnus'}: ${m.content}`).join('\n\n');
  parts.push({ text: historyText ? `${historyText}\n\nAuthor: ${lastUser?.content || ''}` : (lastUser?.content || '') });
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: [{ role: 'user', parts }], generationConfig: { maxOutputTokens: 1200, temperature: 0.78 } }) }
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Provider: DeepSeek ────────────────────────────────────────────────────────
async function callDeepSeek(messages) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], max_tokens: 1200, temperature: 0.78 }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Provider: OpenRouter ──────────────────────────────────────────────────────
async function callOpenRouter(messages, modelId) {
  const model = modelId === 'openrouter/mistral' ? 'mistralai/mistral-7b-instruct:free' : 'meta-llama/llama-3.1-8b-instruct:free';
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'HTTP-Referer': 'https://wncore-radio.vercel.app', 'X-Title': 'WNCORE Another Sky' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], max_tokens: 1200, temperature: 0.78 }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Route to specific model ───────────────────────────────────────────────────
async function callModel(modelId, messages, attachments) {
  if (modelId?.startsWith('groq/') && GROQ_API_KEY)         return callGroq(messages, modelId);
  if (modelId?.startsWith('gemini/') && GEMINI_API_KEY)      return callGemini(messages, attachments, modelId);
  if (modelId === 'deepseek/chat' && DEEPSEEK_API_KEY)       return callDeepSeek(messages);
  if (modelId?.startsWith('openrouter/') && OPENROUTER_API_KEY) return callOpenRouter(messages, modelId);
  // auto cascade
  const hasImages = attachments?.some(a => a.type === 'image');
  const errors = [];
  if (GROQ_API_KEY && !hasImages)    { try { return await callGroq(messages, 'groq/llama-3.3-70b'); } catch(e) { errors.push(e.message); } }
  if (GEMINI_API_KEY)                { try { return await callGemini(messages, attachments, 'gemini/flash'); } catch(e) { errors.push(e.message); } }
  if (DEEPSEEK_API_KEY)              { try { return await callDeepSeek(messages); } catch(e) { errors.push(e.message); } }
  if (OPENROUTER_API_KEY)            { try { return await callOpenRouter(messages, 'openrouter/llama-free'); } catch(e) { errors.push(e.message); } }
  throw new Error('All providers failed: ' + errors.join(', '));
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action;

  // GET: load history or list models
  if (req.method === 'GET') {
    if (action === 'load') {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const messages = await loadHistory(userId);
      return res.status(200).json({ messages: messages || [] });
    }
    if (action === 'models') {
      return res.status(200).json({ models: AVAILABLE_MODELS });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

  // POST: save history
  if (action === 'save') {
    const { userId, messages } = req.body || {};
    if (!userId || !Array.isArray(messages)) return res.status(400).json({ error: 'userId and messages required' });
    await saveHistory(userId, messages);
    return res.status(200).json({ ok: true });
  }

  // POST: clear history
  if (action === 'clear') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    await clearHistory(userId);
    return res.status(200).json({ ok: true });
  }

  // POST: image generation
  if (action === 'imagine') {
    if (!checkRate(ip)) return res.status(429).json({ error: 'Rate limit reached.' });
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    try {
      const result = await generateImage(prompt);
      return res.status(200).json(result);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: main chat
  if (!checkRate(ip)) return res.status(429).json({ error: 'Rate limit reached. Try again in an hour.' });

  const { messages, attachments, quickAction, chapterContext, userId, modelId, searchQuery } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  let cleaned = messages.slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 3000),
  }));

  if (quickAction && QUICK_PROMPTS[quickAction]) {
    const qp = QUICK_PROMPTS[quickAction];
    const last = cleaned[cleaned.length - 1];
    if (last?.role === 'user') cleaned[cleaned.length - 1] = { role: 'user', content: qp };
    else cleaned.push({ role: 'user', content: qp });
  }

  if (chapterContext?.body) {
    const ctx = `[Current chapter — AS-${chapterContext.num || '?'}: "${chapterContext.title || 'Untitled'}"]\n${chapterContext.body.slice(0, 2500)}\n\n`;
    cleaned[cleaned.length - 1].content = ctx + cleaned[cleaned.length - 1].content;
  }

  // Web search injection
  if (searchQuery) {
    const searchResults = await webSearch(searchQuery);
    if (searchResults) {
      cleaned[cleaned.length - 1].content += '\n\n' + searchResults;
    }
  }

  // URL fetching
  const lastMsg = cleaned[cleaned.length - 1];
  if (lastMsg?.role === 'user') {
    const urls = extractUrls(lastMsg.content);
    if (urls.length > 0) {
      const fetched = await Promise.all(urls.map(async u => {
        const text = await fetchUrlText(u);
        return text ? `[Content from ${u}]:\n${text}` : `[Could not fetch ${u}]`;
      }));
      lastMsg.content += '\n\n' + fetched.join('\n\n');
    }
  }

  // Text attachments
  if (attachments?.length) {
    const textAtts = attachments.filter(a => a.type === 'text');
    if (textAtts.length) {
      cleaned[cleaned.length - 1].content += textAtts.map(a => `\n\n[Attached: ${a.name || 'file'}]\n${(a.data || '').slice(0, 2000)}`).join('');
    }
  }

  let reply = '';
  try {
    reply = await callModel(modelId || 'auto', cleaned, attachments);
  } catch(e) {
    console.error('[writer] error:', e.message);
    return res.status(503).json({ error: '// signal lost — ' + e.message });
  }

  const trimmedReply = reply.trim();

  if (userId) {
    const fullHistory = messages.concat([{ role: 'assistant', content: trimmedReply }]);
    saveHistory(userId, fullHistory).catch(() => {});
  }

  return res.status(200).json({ reply: trimmedReply });
};
