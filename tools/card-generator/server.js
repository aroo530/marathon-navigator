import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "child_process";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { qwenEditImage } from "./qwenEditImage.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Card template is cached in memory after first upload — avoids re-sending it with every card request
let cachedTemplate = null; // { buffer, width, height }

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/api/health", (_, res) => res.json({ ok: true }));

// ── Upload template ───────────────────────────────────────────────────────────

app.post("/api/set-template", async (req, res) => {
  try {
    const { templateBase64 } = req.body;
    const raw = Buffer.from(templateBase64, "base64");
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
    res.json({
      ok: true,
      width,
      height,
      defaultLayout: defaultLayout(width, height),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Import CSV rows → Supabase ────────────────────────────────────────────────

app.post("/api/import", async (req, res) => {
  try {
    const { rows, marathonId, dryRun = false } = req.body;
    const familyNames = [...new Set(rows.map((r) => r.family).filter(Boolean))];

    // Resolve existing families
    const { data: existingFamilies } = await supabase
      .from("families")
      .select("id, name")
      .eq("marathon_id", marathonId)
      .in("name", familyNames);

    const familyMap = new Map(
      existingFamilies?.map((f) => [f.name, f.id]) ?? [],
    );

    // Create any missing families (skipped in dry run)
    const missing = familyNames.filter((n) => !familyMap.has(n));
    if (missing.length && !dryRun) {
      const { data: created, error } = await supabase
        .from("families")
        .insert(
          missing.map((name) => ({ name, marathon_id: Number(marathonId) })),
        )
        .select("id, name");
      if (error) return res.status(500).json({ error: error.message });
      created?.forEach((f) => familyMap.set(f.name, f.id));
    }

    // Check / upsert participants
    const results = [];
    for (const row of rows) {
      const familyKnown = familyMap.has(row.family);

      if (!familyKnown && dryRun) {
        // Family would be created — participant is implicitly new
        results.push({
          ...row,
          familyId: null,
          isNew: true,
          isNewFamily: true,
        });
        continue;
      }

      const familyId = familyMap.get(row.family);
      if (!familyId) {
        results.push({ ...row, error: `Family "${row.family}" not found` });
        continue;
      }

      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("full_name", row.name)
        .eq("family_id", familyId)
        .maybeSingle();

      if (existing) {
        results.push({ ...row, id: existing.id, familyId, isNew: false });
        continue;
      }

      if (dryRun) {
        results.push({ ...row, familyId, isNew: true });
        continue;
      }

      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          full_name: row.name,
          family_id: familyId,
          avatar_url: row.photo_url || null,
          role: "participant",
        })
        .select("id")
        .single();
      if (error) {
        results.push({ ...row, familyId, error: error.message });
        continue;
      }
      results.push({ ...row, id: newUser.id, familyId, isNew: true });
    }

    res.json({ participants: results, dryRun, newFamilies: missing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Face detection via Python/MediaPipe ──────────────────────────────────────

const FACE_SCRIPT = new URL("./face_center.py", import.meta.url).pathname;
// Use the Homebrew Python that has mediapipe/opencv installed
const PYTHON = "/opt/homebrew/bin/python3.12";

function getFaceCenter(imageBuffer) {
  const tmp = join(tmpdir(), `card-face-${Date.now()}.jpg`);
  try {
    writeFileSync(tmp, imageBuffer);
    const result = spawnSync(PYTHON, [FACE_SCRIPT, "--image", tmp], {
      encoding: "utf8",
      timeout: 10000,
    });
    if (result.status !== 0 || !result.stdout) return null;
    const data = JSON.parse(result.stdout.trim());
    return data.found ? { cx: data.cx, cy: data.cy } : null;
  } catch {
    return null; // Python not available or script error — fall back silently
  } finally {
    try {
      unlinkSync(tmp);
    } catch {}
  }
}

// Given a face centre (cx/cy as 0–1 fractions), calculate the sharp extract region
// that crops the image to targetW×targetH aspect ratio centred on the face.
function faceExtractRegion(naturalW, naturalH, cx, cy, targetW, targetH) {
  const targetAspect = targetW / targetH;
  const imageAspect = naturalW / naturalH;

  let extractW, extractH;
  if (imageAspect > targetAspect) {
    extractH = naturalH;
    extractW = extractH * targetAspect;
  } else {
    extractW = naturalW;
    extractH = extractW / targetAspect;
  }

  let left = cx * naturalW - extractW / 2;
  let top = cy * naturalH - extractH / 2;

  left = Math.max(0, Math.min(naturalW - extractW, left));
  top = Math.max(0, Math.min(naturalH - extractH, top));

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(extractW),
    height: Math.round(extractH),
  };
}

// ── Google Drive URL normaliser ───────────────────────────────────────────────

function normalisePhotoUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("drive.google.com")) return url;

    // Extract file ID from any Drive share format
    let id = u.searchParams.get("id");
    if (!id) {
      const match = u.pathname.match(/\/d\/([^/]+)/);
      if (match) id = match[1];
    }
    if (!id) return url;

    // Thumbnail endpoint works server-side without session cookies for public files
    return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
  } catch {
    return url;
  }
}

// ── Photo proxy (for client-side crop editor) ─────────────────────────────────
// Fetches any photo server-side (where Drive auth works) and returns it as a
// same-origin data URL so the canvas in CropEditor isn't tainted by CORS.

app.get("/api/proxy-photo", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });
  try {
    const fetchUrl = normalisePhotoUrl(decodeURIComponent(url));
    const resp = await fetch(fetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!resp.ok)
      return res.status(resp.status).json({ error: `Upstream ${resp.status}` });
    const buf = Buffer.from(await resp.arrayBuffer());
    // Auto-rotate and normalise to JPEG via sharp
    const normalised = await sharp(buf)
      .rotate()
      .jpeg({ quality: 92 })
      .toBuffer();
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=300");
    res.send(normalised);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Generate single card ──────────────────────────────────────────────────────

app.post("/api/generate-card", async (req, res) => {
  try {
    if (!cachedTemplate)
      return res
        .status(400)
        .json({ error: "No template uploaded. Upload a template first." });

    const { participant, layout, prompt, photoBase64 } = req.body;
    const { id, name, family, photo_url, familyId } = participant;
    const { buffer: tmpl, width: cardW, height: cardH } = cachedTemplate;
    const L = layout || defaultLayout(cardW, cardH);

    const composites = [];

    // 1. Photo: manual override → AI edit → original URL fetch
    let photoBuffer = null;
    if (photoBase64) {
      try {
        photoBuffer = await sharp(Buffer.from(photoBase64, "base64"))
          .png()
          .toBuffer();
      } catch (e) {
        console.warn(
          `  Manual photo decode failed for "${name}": ${e.message}`,
        );
      }
    }
    if (!photoBuffer && photo_url && process.env.QWEN_API_KEY && prompt) {
      try {
        photoBuffer = await qwenEditImage(
          [normalisePhotoUrl(photo_url)],
          prompt,
          process.env.QWEN_API_KEY,
          { aspectRatio: "1:1" },
        );
      } catch (e) {
        console.warn(
          `  Qwen failed for "${name}": ${e.message} — using original photo`,
        );
      }
    }
    if (!photoBuffer && photo_url) {
      try {
        const fetchUrl = normalisePhotoUrl(photo_url);
        const buf = await fetch(fetchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          },
        }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.arrayBuffer();
        });
        photoBuffer = await sharp(Buffer.from(buf)).png().toBuffer();
      } catch (e) {
        console.warn(
          `  Photo download/decode failed for "${name}": ${e.message}`,
        );
      }
    }
    if (photoBuffer) {
      // Auto-rotate based on EXIF orientation (common with phone photos)
      photoBuffer = await sharp(photoBuffer).rotate().png().toBuffer();

      const pw = L.photo.width,
        ph = L.photo.height;
      const meta = await sharp(photoBuffer).metadata();
      const face = getFaceCenter(photoBuffer);

      let pipeline = sharp(photoBuffer);
      if (face) {
        const region = faceExtractRegion(
          meta.width,
          meta.height,
          face.cx,
          face.cy,
          pw,
          ph,
        );
        pipeline = pipeline.extract(region);
      }
      let resized = await pipeline
        .resize(pw, ph, {
          fit: face ? "fill" : "cover",
          position: face ? undefined : "attention",
          kernel: "lanczos3",
        })
        .png()
        .toBuffer();

      if (L.photo.circular !== false) {
        const r = Math.min(pw, ph) / 2;
        const mask = Buffer.from(
          `<svg width="${pw}" height="${ph}"><circle cx="${r}" cy="${r}" r="${r}"/></svg>`,
        );
        resized = await sharp(resized)
          .composite([{ input: mask, blend: "dest-in" }])
          .png()
          .toBuffer();
      }

      composites.push({ input: resized, top: L.photo.y, left: L.photo.x });
    }

    // 2. QR code — same payload the attendance scanner reads
    const nameParts = name.trim().split(/\s+/);
    const displayName =
      nameParts.length >= 3 && nameParts[1].length === 1
        ? nameParts.slice(0, 3).join(" ") // "Ereny A Samy" — initial in position 2
        : nameParts.slice(0, 2).join(" "); // "John Smith" — normal 2-word name
    const qrPayload = JSON.stringify({
      pid: id,
      fid: familyId,
      team: family,
      name,
    });
    const qrBuf = await QRCode.toBuffer(qrPayload, {
      width: L.qr.width,
      margin: 1,
    });
    composites.push({ input: qrBuf, top: L.qr.y, left: L.qr.x });

    // 3. Name + team text via SVG overlay
    composites.push({
      input: Buffer.from(buildTextSvg(displayName, family, cardW, cardH, L)),
      top: 0,
      left: 0,
    });

    const cardBuf = await sharp(tmpl)
      .composite(composites)
      .withMetadata({ density: 300 })
      .png()
      .toBuffer();
    res.json({ card: cardBuf.toString("base64") });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultLayout(w, h) {
  return {
    photo: { x: 40, y: 80, width: 220, height: 220 },
    qr: { x: w - 195, y: h - 195, width: 170 },
    name: {
      x: 40,
      y: h - 110,
      fontSize: Math.round(h * 0.046),
      maxWidth: w - 40 - 20,
      color: "#FFFFFF",
      fontWeight: "bold",
    },
    team: {
      x: 40,
      y: h - 65,
      fontSize: Math.round(h * 0.033),
      color: "#FFD700",
      fontWeight: "normal",
    },
  };
}

function autoFitName(text, maxW, baseSize, fontWeight) {
  // Approximate character width: Arial bold ~0.62em, normal ~0.55em
  const ratio = fontWeight === "bold" ? 0.62 : 0.55;

  const fits = (str, size) => str.length * size * ratio <= maxW;

  // 1. Try at full size, single line
  if (fits(text, baseSize)) return { lines: [text], fontSize: baseSize };

  // 2. Try 2-line wrap at full size (split at first space = first / second name)
  const words = text.split(" ");
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    const l1 = words.slice(0, mid).join(" ");
    const l2 = words.slice(mid).join(" ");
    if (fits(l1, baseSize) && fits(l2, baseSize))
      return { lines: [l1, l2], fontSize: baseSize };
  }

  // 3. Scale font to fit single line (floor at 60% of base)
  const scaled = Math.max(
    Math.floor((baseSize * maxW) / (text.length * baseSize * ratio)),
    Math.round(baseSize * 0.6),
  );

  // 4. Try 2-line at scaled size
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    const l1 = words.slice(0, mid).join(" ");
    const l2 = words.slice(mid).join(" ");
    if (fits(l1, scaled) && fits(l2, scaled))
      return { lines: [l1, l2], fontSize: scaled };
  }

  return { lines: [text], fontSize: scaled };
}

function buildTextSvg(name, team, w, h, L) {
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const anchor = (align) =>
    align === "center" ? "middle" : align === "right" ? "end" : "start";

  // Available width: use explicit maxWidth from layout, or derive from card width
  const availW = L.name.maxWidth ?? (w - L.name.x - 20);
  const { lines, fontSize } = autoFitName(
    name,
    availW,
    L.name.fontSize,
    L.name.fontWeight || "bold",
  );
  const lineH = Math.round(fontSize * 1.25);

  // Centre the text block around the configured Y when wrapping to 2 lines
  const blockH = (lines.length - 1) * lineH;
  const startY = L.name.y - Math.round(blockH / 2);

  const nameElements = lines
    .map(
      (line, i) =>
        `<tspan x="${L.name.x}" dy="${i === 0 ? 0 : lineH}">${esc(line)}</tspan>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="${L.name.x}" y="${startY}"
      font-family="Arial,sans-serif" font-size="${fontSize}"
      font-weight="${L.name.fontWeight || "bold"}" fill="${L.name.color}"
      text-anchor="${anchor(L.name.align)}">${nameElements}</text>
    <text x="${L.team.x}" y="${L.team.y}"
      font-family="Arial,sans-serif" font-size="${L.team.fontSize}"
      font-weight="${L.team.fontWeight || "normal"}" fill="${L.team.color}"
      text-anchor="${anchor(L.team.align)}">${esc(team)}</text>
  </svg>`;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`\n✅  Card Generator API → http://localhost:${PORT}\n`),
);
