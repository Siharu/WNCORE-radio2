// WNCORE Radio — Vercel Serverless API Route
// Proxies file uploads to Supabase Storage
// Accepts multipart/form-data with a `file` field and optional `bucket` + `path` fields

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
if (!process.env.WNCORE_ADMIN_TOKEN) {
  module.exports = async (req, res) => res.status(503).json({ error: 'Admin token not configured' });
  return;
}
const adminToken = process.env.WNCORE_ADMIN_TOKEN;

// Vercel needs this to read raw body for multipart
export const config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth guard
  const token = req.headers['x-admin-token'];
  if (token !== adminToken) return res.status(401).json({ error: 'Unauthorized' });

  // Supabase guard
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to Vercel env vars.' });
  }

  try {
    // Read raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    // Parse content-type to get boundary
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Expected multipart/form-data' });
    }

    // Simple multipart parser — extract file data, name, and mimetype
    const boundary = '--' + contentType.split('boundary=')[1];
    const parts = rawBody.toString('binary').split(boundary);

    const ALLOWED_MIME = [
      'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
      'video/mp4','video/webm',
      'audio/mpeg','audio/ogg','audio/wav','audio/aac',
    ];
    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

    let fileBuffer = null;
    let fileMime = 'application/octet-stream';
    const destBucket = 'wncore-media'; // never trust client — always hardcoded
    let destPath = null;

    for (const part of parts) {
      if (part.includes('Content-Disposition')) {
        const nameMatch = part.match(/name="([^"]+)"/);
        const filenameMatch = part.match(/filename="([^"]+)"/);
        const mimeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);

        const fieldName = nameMatch ? nameMatch[1] : '';
        const fileName = filenameMatch ? filenameMatch[1] : null;

        // Double CRLF separates headers from body in each part
        const bodyStart = part.indexOf('\r\n\r\n');
        if (bodyStart === -1) continue;
        const rawValue = part.slice(bodyStart + 4, part.lastIndexOf('\r\n'));

        if (fieldName === 'bucket') {
          // bucket is hardcoded — ignore client value
        } else if (fieldName === 'path') {
          // Sanitize: strip path traversal and leading slashes
          destPath = rawValue.trim().replace(/\.\./g, '').replace(/^[\/]+/, '').slice(0, 256) || null;
        } else if (fieldName === 'file' && fileName) {
          if (mimeMatch) fileMime = mimeMatch[1].trim();
          if (!destPath) destPath = `uploads/${Date.now()}-${fileName}`;
          fileBuffer = Buffer.from(rawValue, 'binary');
        }
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file found in request' });
    if (!ALLOWED_MIME.includes(fileMime)) return res.status(400).json({ error: 'File type not allowed: ' + fileMime });
    if (fileBuffer.length > MAX_SIZE) return res.status(400).json({ error: 'File too large (max 25 MB)' });

    // Upload to Supabase Storage
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${destBucket}/${destPath}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': fileMime,
        'Cache-Control': '3600',
        'x-upsert': 'true',
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      let err = '';
      try { err = await uploadRes.text(); } catch(_) {}
      console.error('Supabase upload error:', uploadRes.status, err);
      return res.status(500).json({ error: 'Upload failed', details: err });
    }

    // Build public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${destBucket}/${destPath}`;
    return res.status(200).json({ success: true, url: publicUrl, bucket: destBucket, path: destPath });

  } catch (err) {
    console.error('WNCORE upload error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
