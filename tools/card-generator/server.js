import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { qwenEditImage } from './qwenEditImage.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Card template is cached in memory after first upload — avoids re-sending it with every card request
let cachedTemplate = null; // { buffer, width, height }

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ── Upload template ───────────────────────────────────────────────────────────

app.post('/api/set-template', async (req, res) => {
  try {
    const { templateBase64 } = req.body;
    const raw = Buffer.from(templateBase64, 'base64');
    // Normalise to PNG — rejects unsupported formats (HEIC etc.) at upload time
    let buffer;
    try {
      buffer = await sharp(raw).png().toBuffer();
    } catch (e) {
      return res.status(400).json({
        error: `Template format not supported: ${e.message}. Please export your template as PNG or JPG.`,
      });
    }
    const { width, height } = await sharp(buffer).metadata();
    cachedTemplate = { buffer, width, height };
    res.json({ ok: true, width, height, defaultLayout: defaultLayout(width, height) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Import CSV rows → Supabase ────────────────────────────────────────────────

app.post('/api/import', async (req, res) => {
  try {
    const { rows, marathonId } = req.body;
    const familyNames = [...new Set(rows.map(r => r.family).filter(Boolean))];

    // Resolve existing families
    const { data: existingFamilies } = await supabase
      .from('families')
      .select('id, name')
      .eq('marathon_id', marathonId)
      .in('name', familyNames);

    const familyMap = new Map(existingFamilies?.map(f => [f.name, f.id]) ?? []);

    // Create any missing families
    const missing = familyNames.filter(n => !familyMap.has(n));
    if (missing.length) {
      const { data: created, error } = await supabase
        .from('families')
        .insert(missing.map(name => ({ name, marathon_id: Number(marathonId) })))
        .select('id, name');
      if (error) return res.status(500).json({ error: error.message });
      created?.forEach(f => familyMap.set(f.name, f.id));
    }

    // Upsert participants
    const results = [];
    for (const row of rows) {
      const familyId = familyMap.get(row.family);
      if (!familyId) {
        results.push({ ...row, error: `Family "${row.family}" not found` });
        continue;
      }

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('full_name', row.name)
        .eq('family_id', familyId)
        .maybeSingle();

      if (existing) {
        results.push({ ...row, id: existing.id, familyId, isNew: false });
      } else {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            full_name: row.name,
            family_id: familyId,
            avatar_url: row.photo_url || null,
            role: 'participant',
          })
          .select('id')
          .single();
        if (error) {
          results.push({ ...row, familyId, error: error.message });
          continue;
        }
        results.push({ ...row, id: newUser.id, familyId, isNew: true });
      }
    }

    res.json({ participants: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Generate single card ──────────────────────────────────────────────────────

app.post('/api/generate-card', async (req, res) => {
  try {
    if (!cachedTemplate) return res.status(400).json({ error: 'No template uploaded. Upload a template first.' });

    const { participant, layout, prompt } = req.body;
    const { id, name, family, photo_url, familyId } = participant;
    const { buffer: tmpl, width: cardW, height: cardH } = cachedTemplate;
    const L = layout || defaultLayout(cardW, cardH);

    const composites = [];

    // 1. AI-edited photo (falls back to original, then skips if unavailable)
    let photoBuffer = null;
    if (photo_url && process.env.QWEN_API_KEY && prompt) {
      try {
        photoBuffer = await qwenEditImage([photo_url], prompt, process.env.QWEN_API_KEY, { aspectRatio: '1:1' });
      } catch (e) {
        console.warn(`  Qwen failed for "${name}": ${e.message} — using original photo`);
      }
    }
    if (!photoBuffer && photo_url) {
      try {
        const buf = await fetch(photo_url).then(r => r.arrayBuffer());
        // Normalise to PNG so HEIC/HEIF/AVIF from Google Drive don't crash sharp
        photoBuffer = await sharp(Buffer.from(buf)).png().toBuffer();
      } catch (e) {
        console.warn(`  Photo download/decode failed for "${name}": ${e.message}`);
      }
    }
    if (photoBuffer) {
      const pw = L.photo.width, ph = L.photo.height;
      let resized = await sharp(photoBuffer)
        .resize(pw, ph, { fit: 'cover' })
        .png()
        .toBuffer();

      if (L.photo.circular !== false) {
        const r = Math.min(pw, ph) / 2;
        const mask = Buffer.from(
          `<svg width="${pw}" height="${ph}"><circle cx="${r}" cy="${r}" r="${r}"/></svg>`
        );
        resized = await sharp(resized)
          .composite([{ input: mask, blend: 'dest-in' }])
          .png()
          .toBuffer();
      }

      composites.push({ input: resized, top: L.photo.y, left: L.photo.x });
    }

    // 2. QR code — same payload the attendance scanner reads
    const qrPayload = JSON.stringify({ pid: id, fid: familyId, team: family, name });
    const qrBuf = await QRCode.toBuffer(qrPayload, { width: L.qr.width, margin: 1 });
    composites.push({ input: qrBuf, top: L.qr.y, left: L.qr.x });

    // 3. Name + team text via SVG overlay
    composites.push({
      input: Buffer.from(buildTextSvg(name, family, cardW, cardH, L)),
      top: 0,
      left: 0,
    });

    const cardBuf = await sharp(tmpl).composite(composites).png().toBuffer();
    res.json({ card: cardBuf.toString('base64') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultLayout(w, h) {
  return {
    photo: { x: 40,      y: 80,      width: 220,            height: 220 },
    qr:   { x: w - 195, y: h - 195, width: 170 },
    name: { x: 40,      y: h - 110, fontSize: Math.round(h * 0.046), color: '#FFFFFF', fontWeight: 'bold' },
    team: { x: 40,      y: h - 65,  fontSize: Math.round(h * 0.033), color: '#FFD700', fontWeight: 'normal' },
  };
}

function buildTextSvg(name, team, w, h, L) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])
  );
  const anchor = align => align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="${L.name.x}" y="${L.name.y}"
      font-family="Arial,sans-serif" font-size="${L.name.fontSize}"
      font-weight="${L.name.fontWeight || 'bold'}" fill="${L.name.color}"
      text-anchor="${anchor(L.name.align)}">${esc(name)}</text>
    <text x="${L.team.x}" y="${L.team.y}"
      font-family="Arial,sans-serif" font-size="${L.team.fontSize}"
      font-weight="${L.team.fontWeight || 'normal'}" fill="${L.team.color}"
      text-anchor="${anchor(L.team.align)}">${esc(team)}</text>
  </svg>`;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`\n✅  Card Generator API → http://localhost:${PORT}\n`)
);
