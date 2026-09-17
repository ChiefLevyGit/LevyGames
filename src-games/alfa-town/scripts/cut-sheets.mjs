#!/usr/bin/env node
/**
 * חותך את גיליונות הספרייטים של אלפא־טאון.
 *
 * למה לא חיתוך לפי רשת: הגיליונות שחזרו מ-Gemini לא אחידים — חלק 3x3 (9 פריטים)
 * וחלק 4x3 (12), חלק עם קווי רשת מצוירים ועם שני גוונים שונים של מג'נטה.
 * לכן: מסכה לפי גוון (hue) → רכיבים מקושרים → חיתוך לפי bbox של כל רכיב.
 *
 *   node scripts/cut-sheets.mjs          # חותך הכל
 *   node scripts/cut-sheets.mjs --report # מדפיס מה נמצא בלי לכתוב קבצים
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'art-src');
const OUT_SPRITES = join(ROOT, 'public', 'sprites');
const OUT_BG = join(ROOT, 'public', 'bg');

const REPORT_ONLY = process.argv.includes('--report');

// ── מסכת רקע ───────────────────────────────────────────────────────────────
// רקע = משפחת המג'נטה. גוון 285°-332° ורוויה מעל 0.28 תופסים גם את המג'נטה
// החזקה של המרזבים וגם את הסגול-בהיר של מילוי התאים, בלי לתפוס גגות סגולים
// (גוון ~255°), ורדרד של פרחים (~345°) או כתום-אלמוג (~5°).
const HUE_MIN = 285;
const HUE_MAX = 332;
const SAT_MIN = 0.28;

function isBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return false;
  const sat = (max - min) / max;
  if (sat < SAT_MIN) return false;
  if (max !== r && max !== b) return false; // ירוק דומיננטי = לא מג'נטה

  const d = max - min;
  let hue;
  if (max === r) hue = 60 * (((g - b) / d) % 6);
  else if (max === g) hue = 60 * ((b - r) / d + 2);
  else hue = 60 * ((r - g) / d + 4);
  if (hue < 0) hue += 360;

  return hue >= HUE_MIN && hue <= HUE_MAX;
}

// ── רכיבים מקושרים (flood fill איטרטיבי) ──────────────────────────────────
function components(mask, w, h, minArea) {
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = new Int32Array(w * h);

  for (let start = 0; start < w * h; start++) {
    if (seen[start] || mask[start] === 0) continue;
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    let minX = w, minY = h, maxX = -1, maxY = -1, area = 0;

    while (sp > 0) {
      const p = stack[--sp];
      const x = p % w;
      const y = (p - x) / w;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // 8-קישוריות — מחזיק יחד פרטים דקים כמו רגליים וזנבות
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = ny * w + nx;
          if (seen[np] || mask[np] === 0) continue;
          seen[np] = 1;
          stack[sp++] = np;
        }
      }
    }
    if (area >= minArea) out.push({ minX, minY, maxX, maxY, area });
  }
  return out;
}

// ── עיבוד גיליון אחד ───────────────────────────────────────────────────────
async function cutSheet(file) {
  const name = basename(file, '.jpg');
  const img = sharp(join(SRC, file));
  const { width: w, height: h } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();

  // 1. מסכת חזית + אלפא
  const fg = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    fg[i] = isBackground(raw[p], raw[p + 1], raw[p + 2]) ? 0 : 1;
  }

  // 2. ניקוי רעש: פיקסל חזית בודד מוקף רקע הוא ארטיפקט דחיסה
  const clean = Uint8Array.from(fg);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!fg[i]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (dx || dy) n += fg[i + dy * w + dx];
      if (n <= 1) clean[i] = 0;
    }
  }

  // 2b. החזרת טבעת הגבול.
  //     הפיקסלים המעורבבים בין הקו הכהה למג'נטה נופלים בטווח הגוון של הרקע
  //     ונחתכים — מה שמנקב את קו המתאר. מרחיבים את החזית ומחזירים אותם,
  //     ואת הגלישה הוורודה שלהם מנקים בהמשך ב-despill חזק.
  const DILATE = Number(process.env.DILATE ?? 2);
  const reclaimed = new Uint8Array(w * h); // מי הוחזר — צריך despill אגרסיבי
  for (let pass = 0; pass < DILATE; pass++) {
    const prev = Uint8Array.from(clean);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (prev[i]) continue;
        if (prev[i - 1] || prev[i + 1] || prev[i - w] || prev[i + w]) {
          clean[i] = 1;
          reclaimed[i] = 1;
        }
      }
    }
  }

  // 3. רכיבים — מתחת ל-0.25% משטח הגיליון זה זבל (הכוכבונים ב-sheet-city-1)
  const minArea = Math.round(w * h * 0.0025);
  let comps = components(clean, w, h, minArea);

  // 3b. איחוד חלקים של אותו פריט.
  //     פריט אחד מתפצל לרכיבים כשחלקים ממנו לא נוגעים (גג מעל גוף, טיפות מזרקה,
  //     דגל על מגדל). בין פריטים שונים בגיליון יש מרווח של מאות פיקסלים, ובתוך
  //     פריט אחד הפער זעיר — ולכן איחוד לפי קרבת bbox מפריד נכון.
  //     הסף קטן בכוונה: חלקים של אותו פריט כמעט תמיד חופפים ב-bbox (גג מעל גוף),
  //     בעוד פריטים שכנים מופרדים בעשרות פיקסלים לפחות.
  const GAP = Number(process.env.MERGE_GAP ?? 6);
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const a = comps[i], b = comps[j];
        const near =
          a.minX - GAP <= b.maxX && b.minX - GAP <= a.maxX &&
          a.minY - GAP <= b.maxY && b.minY - GAP <= a.maxY;
        if (!near) continue;
        comps[i] = {
          minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
          maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
          area: a.area + b.area,
        };
        comps.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }

  // 4. סדר קריאה: שורות לפי מרכז Y, ובתוך שורה לפי X
  const rowTol = h * 0.12;
  comps.sort((a, b) => (a.minY + a.maxY) - (b.minY + b.maxY));
  const rows = [];
  for (const c of comps) {
    const cy = (c.minY + c.maxY) / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < rowTol);
    if (row) { row.items.push(c); row.cy = (row.cy + cy) / 2; }
    else rows.push({ cy, items: [c] });
  }
  for (const r of rows) r.items.sort((a, b) => a.minX - b.minX);
  comps = rows.flatMap((r) => r.items);

  console.log(`\n${name}: ${comps.length} פריטים (${rows.length} שורות)`);
  comps.forEach((c, i) => {
    const touches = c.minX <= 1 || c.minY <= 1 || c.maxX >= w - 2 || c.maxY >= h - 2;
    console.log(
      `  ${String(i + 1).padStart(2)}. ${String(c.maxX - c.minX + 1).padStart(4)}x${String(c.maxY - c.minY + 1).padStart(4)}` +
      ` @ (${String(c.minX).padStart(4)},${String(c.minY).padStart(4)})${touches ? '  ⚠ נוגע בשוליים' : ''}`
    );
  });
  if (REPORT_ONLY) return { name, count: comps.length };

  // 5. אלפא + despill, וחיתוך לכל רכיב
  //    חצי-שקיפות בקצוות היא מה שמרכך את הפרינג' של ה-JPEG.
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    let r = raw[p], g = raw[p + 1], b = raw[p + 2];
    if (!clean[i]) { rgba[p + 3] = 0; continue; }

    // שכן רקע = פיקסל קצה: מסירים את גלישת המג'נטה
    let edge = false;
    const x = i % w, y = (i - x) / w;
    for (let dy = -1; dy <= 1 && !edge; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (!clean[ny * w + nx]) { edge = true; break; }
      }
    if (edge || reclaimed[i]) {
      const m = (r + b) / 2;
      if (m > g) {
        const k = reclaimed[i] ? 0.92 : 0.55;
        r = Math.round(r - (r - g) * k);
        b = Math.round(b - (b - g) * k);
      }
    }
    rgba[p] = r; rgba[p + 1] = g; rgba[p + 2] = b; rgba[p + 3] = 255;
  }

  const base = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
  const pad = 6;
  const written = [];
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i];
    const left = Math.max(0, c.minX - pad);
    const top = Math.max(0, c.minY - pad);
    const width = Math.min(w - left, c.maxX - c.minX + 1 + pad * 2);
    const height = Math.min(h - top, c.maxY - c.minY + 1 + pad * 2);
    const outName = `${name}-${String(i + 1).padStart(2, '0')}.webp`;
    await base
      .clone()
      .extract({ left, top, width, height })
      .resize({ width: 420, height: 420, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(join(OUT_SPRITES, outName));
    written.push(outName);
  }
  return { name, count: comps.length, written };
}

// ── רקעים: הקטנה ל-WebP (1.9MB לרקע זה יותר מדי לטעינה ראשונה) ───────────
async function convertBg(file) {
  const name = basename(file, '.jpg');
  const out = join(OUT_BG, `${name}.webp`);
  const info = await sharp(join(SRC, file))
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`  ${name}.webp — ${(info.size / 1024).toFixed(0)}KB`);
}

// ── הרצה ───────────────────────────────────────────────────────────────────
const files = readdirSync(SRC).filter((f) => f.endsWith('.jpg'));
// גיליון = sheet-*. כל שאר ה-JPG הם רקעים ועוברים המרה ל-WebP —
// כך שתמונה חדשה שאלעד מפיל ל-art-src/ נקלטת בלי לגעת בסקריפט.
const sheets = files.filter((f) => f.startsWith('sheet-')).sort();
const bgs = files.filter((f) => !f.startsWith('sheet-')).sort();

if (!REPORT_ONLY) {
  mkdirSync(OUT_SPRITES, { recursive: true });
  mkdirSync(OUT_BG, { recursive: true });
  console.log('רקעים:');
  for (const f of bgs) await convertBg(f);
}

const results = [];
for (const f of sheets) results.push(await cutSheet(f));

const total = results.reduce((s, r) => s + r.count, 0);
console.log(`\nסה"כ ${total} ספרייטים מ-${sheets.length} גיליונות.`);

if (!REPORT_ONLY) {
  writeFileSync(
    join(ROOT, 'Design.info', 'cut-manifest.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('נכתב Design.info/cut-manifest.json');
}
