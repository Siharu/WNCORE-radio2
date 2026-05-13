// WNCORE Radio — ICY Metadata Proxy
// Fetches a small chunk of a stream and extracts the StreamTitle from ICY headers.
// Browsers can't read ICY headers directly (CORS + non-standard protocol),
// so this serverless function acts as a pass-through.
//
// Usage: GET /api/icy?url=https://...stream-url...
// Returns: { title: "Artist - Track" | null, station: "Station Name" | null }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid url param' });
  }

  // Safety: only allow audio stream domains, block internal/private IPs
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    // Block private ranges and localhost
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
      return res.status(400).json({ error: 'Private URLs not allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const controller = new AbortController();
    // Abort after 4 seconds — we only need the headers + first few KB
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Request ICY metadata injection at regular intervals
        'Icy-MetaData': '1',
        'User-Agent': 'WNCORE-Radio/6.0 (ICY Metadata Proxy)',
        'Range': 'bytes=0-16383', // Only fetch first 16KB — enough for headers + one metadata block
      },
    });

    clearTimeout(timeout);

    // ── Extract from ICY response headers ─────────────────────────────────
    // These are non-standard headers sent by most Shoutcast/Icecast streams
    const icyName    = response.headers.get('icy-name')        || null;
    const icyTitle   = response.headers.get('icy-description') || null;
    const metaInt    = parseInt(response.headers.get('icy-metaint') || '0');

    let streamTitle = null;

    if (metaInt > 0) {
      // ── Parse inline ICY metadata from stream body ───────────────────────
      // ICY metadata is injected every `metaInt` bytes in the stream.
      // Format: [1 byte length-word] [length*16 bytes: "StreamTitle='...';StreamUrl='...';"]
      try {
        const buf = await response.arrayBuffer();
        const bytes = new Uint8Array(buf);

        // Find metadata block: at offset `metaInt`, read the length word
        if (bytes.length > metaInt) {
          const lenWord = bytes[metaInt]; // number of 16-byte blocks
          if (lenWord > 0) {
            const metaStart = metaInt + 1;
            const metaEnd   = metaStart + lenWord * 16;
            if (metaEnd <= bytes.length) {
              const metaStr = new TextDecoder('utf-8', { fatal: false })
                .decode(bytes.slice(metaStart, metaEnd))
                .replace(/\0/g, '');
              const match = metaStr.match(/StreamTitle='([^']*)'/);
              if (match && match[1].trim()) streamTitle = match[1].trim();
            }
          }
        }
      } catch { /* body parse failed — fall through */ }
    }

    // Cache for 30s — track titles change, but not that fast
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
    return res.status(200).json({
      title:   streamTitle || null,
      station: icyName     || null,
      desc:    icyTitle    || null,
    });

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(200).json({ title: null, station: null, desc: null, error: 'timeout' });
    }
    return res.status(200).json({ title: null, station: null, desc: null, error: err.message });
  }
};
