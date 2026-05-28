/**
 * Participant Card Generator
 * ─────────────────────────
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-cards.mjs [marathonId]
 *
 * Generates a print-ready HTML file with one card per participant.
 * Each card contains: name, team name, avatar (photo or initials), QR code.
 *
 * QR payload: { pid, fid, team, name }
 *   pid  — users.id (UUID)  ← what the scanner resolves
 *   fid  — families.id (integer)
 *   team — family name
 *   name — participant full name
 *
 * Open the output HTML in any browser → Ctrl/Cmd+P → Save as PDF.
 */

import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://asygijgyvplutjujdiic.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const marathonId = parseInt(process.argv[2] ?? '2', 10);
if (isNaN(marathonId)) {
  console.error('❌  Invalid marathonId. Usage: node generate-cards.mjs <marathonId>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Fetch data ───────────────────────────────────────────────────────────────

console.log(`Fetching data for marathon ${marathonId}…`);

const { data: marathon, error: mErr } = await supabase
  .from('marathon_with_family_count')
  .select('id, title, accent_color')
  .eq('id', marathonId)
  .single();

if (mErr || !marathon) {
  console.error('❌  Marathon not found:', mErr?.message);
  process.exit(1);
}

const { data: families, error: fErr } = await supabase
  .from('families')
  .select('id, name')
  .eq('marathon_id', marathonId)
  .order('name');

if (fErr || !families?.length) {
  console.error('❌  No families found:', fErr?.message);
  process.exit(1);
}

const familyIds = families.map(f => f.id);

const { data: participants, error: pErr } = await supabase
  .from('users')
  .select('id, full_name, avatar_url, family_id')
  .eq('role', 'participant')
  .in('family_id', familyIds)
  .order('family_id')
  .order('full_name');

if (pErr) {
  console.error('❌  Error fetching participants:', pErr.message);
  process.exit(1);
}

if (!participants?.length) {
  console.error('❌  No participants found for this marathon.');
  process.exit(1);
}

console.log(`✓  Found ${participants.length} participants across ${families.length} families.`);

// ── Helpers ──────────────────────────────────────────────────────────────────

const accent = marathon.accent_color ?? '#46188F';

/** Lighten a hex color by blending with white (amount 0–1). */
function lighten(hex, amount = 0.85) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2,'0')}${lg.toString(16).padStart(2,'0')}${lb.toString(16).padStart(2,'0')}`;
}

/** Determine whether text on this background should be black or white. */
function onColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '#000000' : '#FFFFFF';
}

/** Initials from a full name (up to 2 chars). */
function initials(name) {
  return (name ?? '?')
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Generate an inline SVG QR code string. */
async function qrSVG(data) {
  return QRCode.toString(data, {
    type: 'svg',
    margin: 1,
    width: 160,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

// ── Build cards ───────────────────────────────────────────────────────────────

const familyMap = new Map(families.map(f => [f.id, f]));
const tint = lighten(accent, 0.88);
const onAccent = onColor(accent);

let cardsHtml = '';
let count = 0;

for (const p of participants) {
  const family = familyMap.get(p.family_id);
  if (!family) continue;

  const qrPayload = JSON.stringify({
    pid:  p.id,
    fid:  family.id,
    team: family.name,
    name: p.full_name ?? '',
  });

  const qr = await qrSVG(qrPayload);
  const ini = initials(p.full_name);

  const avatarBlock = p.avatar_url
    ? `<img class="avatar-img" src="${p.avatar_url}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
            alt="${ini}" />
       <div class="avatar-ini" style="display:none">${ini}</div>`
    : `<div class="avatar-ini">${ini}</div>`;

  cardsHtml += `
    <div class="card">
      <div class="card-header">
        <span class="marathon-label">${marathon.title}</span>
      </div>
      <div class="card-body">
        <div class="avatar-wrap">${avatarBlock}</div>
        <p class="participant-name">${p.full_name ?? '—'}</p>
        <p class="team-name">${family.name}</p>
      </div>
      <div class="card-qr">${qr}</div>
    </div>`;

  count++;
  if (count % 10 === 0) process.stdout.write(`  ${count}/${participants.length} QR codes generated…\r`);
}

process.stdout.write('\n');

// ── Assemble HTML ─────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${marathon.title} — Participant Cards</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Segoe UI', Arial, sans-serif;
      background: #e8e8e8;
      padding: 12px;
    }

    /* ── Page header (screen only) ── */
    .page-header {
      text-align: center;
      padding: 16px 0 20px;
      font-size: 22px;
      font-weight: 800;
      color: ${accent};
    }
    .page-sub {
      text-align: center;
      font-size: 13px;
      color: #888;
      margin-bottom: 24px;
    }

    /* ── Grid ── */
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
    }

    /* ── Card — 85 × 120 mm portrait badge ── */
    .card {
      width: 85mm;
      height: 120mm;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 3px 12px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ── Header strip ── */
    .card-header {
      background: ${accent};
      padding: 8px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .marathon-label {
      color: ${onAccent};
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      text-align: center;
    }

    /* ── Body ── */
    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px 8px 4px;
      gap: 6px;
      background: ${tint};
    }

    /* ── Avatar ── */
    .avatar-wrap { position: relative; }
    .avatar-img {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
      border: 2.5px solid ${accent};
    }
    .avatar-ini {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${accent};
      color: ${onAccent};
      font-size: 20px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid ${accent};
    }

    /* ── Text ── */
    .participant-name {
      font-size: 13px;
      font-weight: 800;
      color: #111;
      text-align: center;
      line-height: 1.25;
      max-width: 75mm;
    }
    .team-name {
      font-size: 10px;
      font-weight: 600;
      color: ${accent};
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* ── QR ── */
    .card-qr {
      padding: 4px 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      flex-shrink: 0;
    }
    .card-qr svg {
      width: 68px;
      height: 68px;
    }

    /* ── Print overrides ── */
    @media print {
      body { background: white; padding: 0; }
      .page-header, .page-sub { display: none; }
      .grid { gap: 5mm; padding: 5mm; }
      .card { box-shadow: none; border: 1px solid #ccc; }
    }
  </style>
</head>
<body>
  <p class="page-header">${marathon.title}</p>
  <p class="page-sub">${participants.length} participant cards — Print: Ctrl+P → Save as PDF</p>
  <div class="grid">${cardsHtml}</div>
</body>
</html>`;

// ── Write & open ──────────────────────────────────────────────────────────────

const outFile = path.resolve(`cards-marathon-${marathonId}.html`);
await fs.writeFile(outFile, html, 'utf-8');

console.log(`\n✅  Generated ${count} cards → ${outFile}`);
console.log('   Open in browser → Ctrl/Cmd+P → Save as PDF\n');

// Auto-open in default browser
const opener =
  process.platform === 'darwin' ? 'open' :
  process.platform === 'win32'  ? 'start' : 'xdg-open';
exec(`${opener} "${outFile}"`);
