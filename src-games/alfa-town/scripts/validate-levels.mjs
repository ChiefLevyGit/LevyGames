#!/usr/bin/env node
/**
 * ולידציה למאגר המילים. להריץ אחרי כל שינוי ב-levels.ts או ב-sprites.ts.
 *   node scripts/validate-levels.mjs
 *
 * בודק: מזהים ייחודיים, ספרייט קיים וקובץ קיים בדיסק, טווח `revealed`,
 * שכל אות חסרה ניתנת ללחיצה במקלדת של הרמה, מינימום 20 מילים לרמה,
 * ושאין שתי מילים שנוחתות באותו מקום בשכונה.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES_DIR = join(ROOT, 'public', 'sprites');
const BG_DIR = join(ROOT, 'public', 'bg');

// טעינת המודולים דרך תעתיק זמני — הקבצים הם TS, אז מפרקים אותם בקריאה ישירה
// של המבנים. פשוט יותר: מייבאים דרך transpile של esbuild שמגיע עם vite.
const { build } = await import('esbuild');
const bundle = await build({
  entryPoints: [join(ROOT, 'scripts', 'validate-entry.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

const { LEVELS, SPRITE_BY_ID, HOODS, levelsIn, buildKeyboard, baseOf } = mod;

const errors = [];
const warn = [];
const err = (m) => errors.push(m);

// 1. מזהים ייחודיים
const ids = new Set();
for (const l of LEVELS) {
  if (ids.has(l.id)) err(`מזהה כפול: ${l.id}`);
  ids.add(l.id);
}

// 2. מילים ייחודיות
const words = new Map();
for (const l of LEVELS) {
  if (words.has(l.word)) err(`המילה "${l.word}" מופיעה פעמיים: ${words.get(l.word)} ו-${l.id}`);
  words.set(l.word, l.id);
}

// 3. ספרייטים
for (const l of LEVELS) {
  const s = SPRITE_BY_ID.get(l.sprite);
  if (!s) { err(`${l.id}: ספרייט לא קיים במאגר — ${l.sprite}`); continue; }
  if (!existsSync(join(SPRITES_DIR, s.file))) err(`${l.id}: הקובץ חסר בדיסק — ${s.file}`);
}
// אובייקט אחד לכל מילה: שני מזהי מילים שמצביעים על אותו ספרייט היו
// מכניסים לעיר שני עותקים זהים — בדיוק מה שהסבב הזה בא לנקות.
const bySprite = new Map();
for (const l of LEVELS) {
  if (bySprite.has(l.sprite)) {
    err(`ספרייט כפול "${l.sprite}": ${bySprite.get(l.sprite)} ו-${l.id}`);
  }
  bySprite.set(l.sprite, l.id);
}
for (const h of HOODS) {
  if (!existsSync(join(BG_DIR, h.bg.replace('bg/', '')))) err(`רקע חסר: ${h.bg}`);
}

// 4. revealed בטווח, ולפחות אות אחת להשלמה
for (const l of LEVELS) {
  if (l.tier === 1) {
    if (!l.revealed || l.revealed.length === 0) { err(`${l.id}: רמה 1 בלי revealed`); continue; }
    for (const i of l.revealed) {
      if (i < 0 || i >= l.word.length) err(`${l.id}: revealed מחוץ לטווח — ${i}`);
    }
    const missing = l.word.length - new Set(l.revealed).size;
    if (missing < 1) err(`${l.id}: אין אף אות לגלות`);
    if (missing > 2) warn.push(`${l.id}: ${missing} אותיות חסרות ברמה 1 (מומלץ 1-2)`);
  } else if (l.revealed) {
    err(`${l.id}: revealed מוגדר ברמה ${l.tier} — רלוונטי רק לרמה 1`);
  }
}

// 5. כל אות חסרה ניתנת ללחיצה במקלדת של הרמה
for (const l of LEVELS) {
  const keys = new Set(buildKeyboard(l.word, l.tier, l.revealed ?? []).flat());
  [...l.word].forEach((ch, i) => {
    if (l.revealed?.includes(i)) return;
    if (!keys.has(baseOf(ch))) err(`${l.id}: האות "${ch}" לא קיימת במקלדת של רמה ${l.tier}`);
  });
}

// 6. בדיוק 15 מילים לרמה, וכל שכונה מיוצגת בכל רמה.
//    הכלל השני הוא תיקון לבאג אמיתי: לרמה 1 הייתה מילה אחת בלבד בשכונת
//    החלל, וילדה שלא סיימה את כל הרמה פשוט לא הגיעה לשם.
for (const tier of [1, 2, 3]) {
  const n = LEVELS.filter((l) => l.tier === tier).length;
  if (n !== 15) err(`רמה ${tier}: ${n} מילים (נדרש בדיוק 15)`);
  for (const h of HOODS) {
    const inHood = levelsIn(tier, h.id).length;
    if (inHood < 3) err(`רמה ${tier}, ${h.label}: רק ${inHood} מילים (נדרש 3 לפחות)`);
  }
}

// 7. התנגשות מיקומים בתוך שכונה
const MIN_DIST = 15;
for (const h of HOODS) {
  const inHood = LEVELS.filter((l) => l.hood === h.id);
  for (let i = 0; i < inHood.length; i++) {
    for (let j = i + 1; j < inHood.length; j++) {
      const a = inHood[i].pos, b = inHood[j].pos;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < MIN_DIST) {
        warn.push(`${h.id}: ${inHood[i].id} ו-${inHood[j].id} קרובים מדי (${d.toFixed(1)}%)`);
      }
    }
  }
}

// ── דוח ────────────────────────────────────────────────────────────────────
const byTier = [1, 2, 3].map((t) => `רמה ${t}: ${LEVELS.filter((l) => l.tier === t).length}`);
const byHood = HOODS.map((h) => `${h.label}: ${LEVELS.filter((l) => l.hood === h.id).length}`);
console.log(`${LEVELS.length} מילים — ${byTier.join(' | ')}`);
console.log(`שכונות — ${byHood.join(' | ')}`);

for (const m of warn) console.log(`  ⚠ ${m}`);
if (errors.length) {
  console.error(`\n${errors.length} שגיאות:`);
  for (const m of errors) console.error(`  ✗ ${m}`);
  process.exit(1);
}
console.log(`\n✓ המאגר תקין${warn.length ? ` (${warn.length} אזהרות)` : ''}.`);
