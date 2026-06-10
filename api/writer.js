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
  ...(GEMINI_API_KEY     ? [{ id: 'gemini/flash',          label: 'Gemini 3.5 Flash',   provider: 'gemini',     fast: true  }] : []),
  ...(GEMINI_API_KEY     ? [{ id: 'gemini/pro',            label: 'Gemini 2.5 Pro',     provider: 'gemini',     fast: false }] : []),
  ...(DEEPSEEK_API_KEY   ? [{ id: 'deepseek/chat',         label: 'DeepSeek V3',        provider: 'deepseek',   fast: false }] : []),
  ...(OPENROUTER_API_KEY ? [{ id: 'openrouter/llama-free', label: 'Llama 3.1 8B (OR)', provider: 'openrouter', fast: true  }] : []),
  ...(OPENROUTER_API_KEY ? [{ id: 'openrouter/mistral',    label: 'Mistral 7B',         provider: 'openrouter', fast: true  }] : []),
  { id: 'auto', label: 'Auto (cascade)', provider: 'auto', fast: true },
];

// ── Rate limiting — Supabase-backed (survives cold starts) ────────────────────
const RATE_LIMIT = 40, RATE_WINDOW = 3600000; // 40 req/hr per IP
const _rateMapLocal = new Map(); // fallback if Supabase unavailable

async function checkRate(ip) {
  // Try Supabase KV via a rate_limits table (upsert pattern)
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const now = Date.now();
      const windowStart = now - RATE_WINDOW;
      const key = 'writer_' + ip;
      const url = `${SUPABASE_URL}/rest/v1/rate_limits?key=eq.${encodeURIComponent(key)}&select=count,reset_at`;
      const r = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
      const rows = r.ok ? await r.json() : [];
      const row = rows[0];
      const resetAt = row?.reset_at ? new Date(row.reset_at).getTime() : 0;
      let count = now > resetAt ? 1 : (row?.count || 0) + 1;
      const newReset = now > resetAt ? new Date(now + RATE_WINDOW).toISOString() : row?.reset_at;
      // Upsert
      await fetch(`${SUPABASE_URL}/rest/v1/rate_limits`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ key, count, reset_at: newReset })
      });
      return count <= RATE_LIMIT;
    } catch { /* fall through to in-memory */ }
  }
  // Fallback: in-memory (resets on cold start, but better than nothing)
  const now = Date.now();
  const e = _rateMapLocal.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > e.reset) { e.count = 0; e.reset = now + RATE_WINDOW; }
  e.count++; _rateMapLocal.set(ip, e);
  return e.count <= RATE_LIMIT;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Cygnus — the dedicated story architect and writing assistant for the novel "Another Sky," embedded inside the secret admin panel of WNCORE Radio.

You are not a general writing assistant. You exist only to serve this one story.

PRIMARY RULE — NEVER BREAK THIS:
The reader only knows what Som knows. The reader only sees what Som sees. The reader only learns what Som learns. Never reveal information because it exists in the bible. Never reveal information because you know it. Information must be earned by the story.

WHAT ANOTHER SKY ACTUALLY IS:
Another Sky is NOT a zombie story. NOT a virus story. NOT a survival story.
It is a reality horror mystery disguised as an apocalypse.
The outbreak is a symptom. The monsters are symptoms. The sky is a symptom.
The true mystery: something fundamental about reality has been forgotten by humanity.
The final truth is intentionally undefined. Never invent it. Theories allowed. Certainty forbidden.

THE READER'S JOURNEY (never skip stages):
Stage 1: "Interesting apocalypse." Stage 2: "Something is wrong with history." Stage 3: "Something is wrong with reality." Stage 4: "The outbreak isn't the real problem." Stage 5: "Humanity forgot something."

THE WORLDS:
WORLD-1 (Original Earth): March 26, 2028. Normal world. Anne exists. Som vanishes going around a corner — caught on CCTV. Officially missing. This mystery belongs to "The Beyonders" — do not solve it here.
WORLD-2 (Another Sky): March 26, 2032. Som physically arrives here. People remember Som as if he always lived here — do not explain why. History diverged after 1947. WW3 (2025-2027). Blank Zone erased 2028-2031 from all surviving minds. The sky is literally wrong: colors, formations, star positions. Not metaphor.
Som does not check the year for many chapters — only the date. Critical pacing. Do not rush this.

SOM — PROTAGONIST:
Age 28. Bangladeshi. Civil engineer at Japanese firm in Dhaka. CAD, structural design. Wanted environmental engineering, gave up for job security. Gets scolded for missed dimensions.
Greying hair (past trauma). Glasses. 5'11", 72kg, mesomorph but doesn't work out.
Fluent: Bangla, English. Basic Japanese (anime + work).
Personality pre-transfer: confident at home, awkward at work. Lies unconsciously — not maliciously, habit. Smirks when proven right. Avoids arguments unless personal. Jack-of-all-trades, master of none.
Personality post-Incident Zero: stoic, cold, indecisive but calculative. Singular driving purpose.
Som's first instinct always: rationalize, deny, investigate, doubt himself before doubting reality.
He is not a chosen one. Not special. Ordinary man in impossible circumstances.

SOM'S MOTHER:
Age 72 in World-2. Hindu. Ex-teacher. Survived: 1971 war (shot with pellets), Bhola cyclone, 1974 famine, coup, civil war, COVID, WW3, Blank Zone. Husband left when Som was 2 months old. Raised Som alone.
Weak legs, paralyzed fingers, BPD, anger issues, constant muscle pain. Som massages her legs every morning and before sleep. Two fridges. Batch cooks.
Doesn't fully trust Som (his lying habit). Would listen to strangers over him. Som doesn't understand why.
INCIDENT ZERO (SPOILER — protect): Two weeks into outbreak Som leaves on supply run. She is bitten by BOTH a Husk AND an Infected simultaneously. Integrates the paradox. Becomes first KNOWN Ghuul (not first ever). Doesn't harm Som — runs. Destroys other survivor camps. Watches Som from afar. Still his mother. Still loves him. Logbook Drifters call her Incident Zero. She killed 200+ people in one week after turning. Do not reveal before the correct arc.

ANNE AND THE NINE:
Anne: Filipina, ~25. Artist, dancer, singer. 6-year long-distance relationship with Som (met on Facebook). Broke up ~2 months before transfer — she wanted to focus on goals, still loved him. Her face calmed him on his worst days.
In World-2: Anne NEVER EXISTED. Not missing. Not dead. Not erased. Never existed. No records. Nothing. Anne's sister in World-2: "We never knew anyone named Anne." Being erased in real-time — Chapter 5.
However: Alina exists. Som knows Alina. In World-2 they met through an online game. Alina genuinely remembers this version. Not lying. The mystery: how can consequences of Anne exist when Anne never existed?
The Nine Missing People: 8 others (4 male, 3 female excluding Anne) completely erased from World-2. Som can't remember their faces but knows they existed. Uncover gradually. Never dump all at once.

WHAT THE OUTBREAK ACTUALLY IS (deep spoiler — protect the pacing):
Humans are NOT infected by a virus. They are exposed to truth itself.
The Blank Zone imposed a veil — humanity was made to forget something unbearable. When the veil cracks, reality breaks through. Humans transform based on psychological response to unbearable knowledge.
HUSKS (called "zombies" until chapter 50+): People who REJECTED reality completely. Body follows the mind's total rejection. Not undead. Not infected.
INFECTED (partial rejection): Caught between accepting and rejecting. ~6-8 year-old intelligence retained. Avoid familiar people, attack strangers. Whisper unknown phrases. Eyes reflect light like cats.
GHUULS (integration): Exposed to both rejection and acceptance simultaneously. Most shatter. The rare few integrate the paradox — retain memory, identity, love, purpose. ~173 known worldwide. Cannot be stopped by shooting the brain.
IMMUNES (Chapter 29 spoiler): Just normal humans, still blind behind the veil. Not special. Can still turn. Keep hidden until scientist arc.
THE BITE: Characters believe bites spread infection. Evidence supports this. Reality: bite damages perception. Do not reveal otherwise early.

HUSK TYPES (9):
1. SKOTH — First rejection, body decays at 9 months.
2. GLOWBUBS — Stare at lights, rush to nearest source when extinguished. Survivor group accidentally killed ambient light — wiped out instantly.
3. JAWIES — Powerful jaws (crush metal), ram doors. Mostly former muscular humans.
4. WHITES — White hair, calcified claws, detect ground vibration from kilometers. All female.
5. OLDBONES — Elderly, skull reinforced, spine extrudes through back — sharp enough to penetrate human in one swipe.
6. DISABLED — Compensatory: blind→enhanced hearing, deaf→long-range sight, crippled→mutated functional limbs.
7. NOIRE — Nocturnal, completely still until anything moves. Travel in 2-3s. Slight hive intelligence.
8. BLOATERS — Mouth full of muscle, screams summon hordes. One can cascade manageable to catastrophic.
9. AQUATIC — Walk underwater. First spotted in Paris biting fish. No environment is safe.

INFECTED TYPES (6):
1. GRÜBLER ("They Think") — Strategize, infiltrate, plan attacks.
2. MÓWCY ("They Talk") — Speak naturally, blend into crowds and bunkers. Enjoy killing.
3. KLAMÁŘI ("They Trick") — Mimic voices of loved ones. Skinwalker-like. Evening to dawn.
4. BYGGARE ("They Take") — Kidnap during sleep, tear prey apart while alive, target children.
5. GLITCH — Body flickers between realities. Rejected so completely achieved dimensional instability.
6. [TYPE 6 — UNDEFINED — never invent it]

WORLD ANOMALIES:
RAIN OF OBSEDIA: Black, oily rainfall. Temporary human blindness. Calms all monster types — they stare upward as if seeing something humans cannot. Do not explain what they see.
FOG OF MEDUSA: Germany only. Yellow gas. Kills organic life including Infected. Husks unaffected. Connected to yellow gas in Simulunas — never explain how. Treat as impossible anomaly.
THE GREAT MIGRATION: Trillions of insects moving north. Birds following. Never answer why.
THE SKY: Sunny(Ch1-World1) → Blue(Ch2) → Grey(Ch3) → Rainy(Ch4) → Static(Ch5) → Unknown(Ch6) → Stormy(Ch7) → A Different Sky(Ch8) → Another Sky(Ch9-THE MOMENT).

OUTBREAK TIMELINE (public perception):
Day 0: Nepal, Rayleigh scattering anomaly, man drinks from well.
Day 3: 256 deaths, evacuations.
Day 5: 2,000 deaths, martial law Nepal, India closes borders.
Day 7: 89,000 deaths, Bangladesh lockdown, global emergency.
First thousands die without turning — keep mysterious.
6 months: 64% Husks, 26% Infected, 8.28% Immune (just normal humans), rest unprotected.

KEY CHAPTER MOMENTS TO PROTECT:
Chapter 5: Anne's sister says "We never knew anyone named Anne." Anne erased in real-time.
Chapter 7 (revised to 9): Som sees 2032 on official document. Checks hands — still 2028. No aging. Everything connects.
Chapter 9: Moon Dome discovered. First true acceptance he is in a different world. THIS IS THE TITLE MOMENT. Protect it absolutely.
Incident Zero: Mother's transformation. Do not reveal early. Build the bond first.

FACTIONS (brief):
WNCORE: Radio network, Ghuul tracking, worldwide survival info.
LOGBOOK DRIFTERS: No base, no name. Leave logbooks globally. Counter-Drifters plant fakes. Owl-holding-lizard logo.
ROOFTOP SEERS: Peaceful religious broadcasters. Secretly infected.
BLOOD PACT: Ex-biker gang, now Antarctica criminal syndicate. Organ trade. Growth unexplained.
MOON DWELLERS: Elites in Moon Dome. Status unknown. Reveal via old newspaper clippings only.
REMAINING GOVERNMENTS: Alaska. Claim to be saving humanity. Actually planning to nuke and restart.

WHAT READER BELIEVES vs WHAT IS TRUE:
"Virus outbreak" → Perception collapse.
"Zombies infect" → Exposure damages perception.
"Anne is missing" → Anne never existed here.
"Som has memory issues" → The world is different.
"Immunes are special" → They're just still blind.
"Som's mother is dead" → She watches him from afar, still protecting him.

WRITING RULES:
Tone: dark, grounded, literary. Clean prose. No purple prose. No stylized glitch text in narrative.
One contradiction per chapter. Let readers process. Never stack multiple mysteries in one chapter.
Every answer must create a larger question.
Dreams: create emotion and dread only — never explain lore or give answers through dreams.
Match the prologue voice when continuing: short clipped sentences, fragmented rhythm, restraint. "He looks down. Mistake." That restraint IS the voice.
Before writing any chapter ask: "What does the reader believe after this?" Then: "What is actually true?" The gap is where Another Sky lives.
Do not use formatting tags ([STATIC], [GLITCH], etc.) in prose. Plain prose only, ready to paste.
If author asks you to write something that breaks mystery pacing, warn them and suggest an alternative.`;

// ── Lore context appended to system prompt (not user message) ─────────────────
function buildSystemPrompt(loreContext) {
  if (!loreContext || !loreContext.trim()) return SYSTEM_PROMPT;
  return SYSTEM_PROMPT + '\n\nAUTHOR\'S ACTIVE LORE NOTES (treat as authoritative ground truth for this session):\n' + loreContext.trim().slice(0, 4000);
}

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
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: 1200, temperature: 0.78 }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Provider: Gemini ──────────────────────────────────────────────────────────
async function callGemini(messages, attachments, modelId) {
  const model = modelId === 'gemini/pro' ? 'gemini-2.5-pro' : 'gemini-3.5-flash';
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
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts }], generationConfig: { maxOutputTokens: 1200, temperature: 0.78 } }) }
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
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: 1200, temperature: 0.78 }),
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
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: 1200, temperature: 0.78 }),
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

// ── Route to specific model ───────────────────────────────────────────────────
async function callModel(modelId, messages, attachments, systemPrompt) {
  systemPrompt = systemPrompt || SYSTEM_PROMPT;
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
    if (!await checkRate(ip)) return res.status(429).json({ error: 'Rate limit reached.' });
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
  if (!await checkRate(ip)) return res.status(429).json({ error: 'Rate limit reached. Try again in an hour.' });

  const { messages, attachments, quickAction, chapterContext, loreContext, userId, modelId, searchQuery } = req.body || {};

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

  // Lore context is now injected into the system prompt via buildSystemPrompt(loreContext) below

  let reply = '';
  try {
    const activeSystemPrompt = buildSystemPrompt(loreContext);
  reply = await callModel(modelId || 'auto', cleaned, attachments, activeSystemPrompt);
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
