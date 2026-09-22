#!/usr/bin/env node
/**
 * ולידציה למאגר. להריץ אחרי כל שינוי ב-levels.ts, objects.ts או sprites.ts.
 *   npm run validate
 *
 * הכללים כאן הם תיעוד של באגים אמיתיים שכבר קרו, לא קישוט:
 *  - שכונה שלא מתחלקת ב-3 משאירה מד שלא נסגר לעולם.
 *  - רמה בלי מילים בשכונה מסוימת = שכונה שלא מגיעים אליה (קרה עם החלל).
 *  - שני אובייקטים עם אותו ספרייט = שני עותקים זהים בעיר.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES_DIR = join(ROOT, 'public', 'sprites');
const BG_DIR = join(ROOT, 'public', 'bg');

const { build } = await import('esbuild');
const bundle = await build({
  entryPoints: [join(ROOT, 'scripts', 'validate-entry.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const mod = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
const {
  LEVELS, HOODS, levelsIn, wordsInHood,
  OBJECTS, WORDS_PER_PRIZE, objectsIn,
  SPRITE_BY_ID, buildKeyboard, baseOf,
} = mod;

const errors = [];
const warn = [];
const err = (m) => errors.push(m);

// ── מילים ────────────────────────────────────────────────────────────────
const ids = new Set();
const words = new Map();
for (const l of LEVELS) {
  if (ids.has(l.id)) err(`מזהה כפול: ${l.id}`);
  ids.add(l.id);
  if (words.has(l.word)) err(`המילה "${l.word}" מופיעה פעמיים: ${words.get(l.word)} ו-${l.id}`);
  words.set(l.word, l.id);
}

for (const tier of [1, 2, 3]) {
  const n = LEVELS.filter((l) => l.tier === tier).length;
  if (n !== 40) err(`רמה ${tier}: ${n} מילים (נדרש 40)`);
  for (const h of HOODS) {
    if (levelsIn(tier, h.id).length === 0) {
      err(`רמה ${tier}, ${h.label}: אין אף מילה — לא מגיעים לשכונה הזו`);
    }
  }
}

// כל שכונה חייבת להתחלק ב-WORDS_PER_PRIZE, אחרת המד נתקע פתוח
for (const h of HOODS) {
  const total = wordsInHood(h.id).length;
  if (total % WORDS_PER_PRIZE !== 0) {
    err(`${h.label}: ${total} מילים — לא מתחלק ב-${WORDS_PER_PRIZE}, המד לא ייסגר`);
  }
  const expected = total / WORDS_PER_PRIZE;
  const actual = objectsIn(h.id).length;
  if (actual !== expected) {
    err(`${h.label}: ${actual} אובייקטים אבל ${total} מילים — נדרש ${expected}`);
  }
}

// ── רמה 1: תמונה ואותיות גלויות ──────────────────────────────────────────
for (const l of LEVELS) {
  if (l.tier === 1) {
    if (!l.pic) { err(`${l.id}: רמה 1 בלי תמונת רמז`); }
    else {
      const s = SPRITE_BY_ID.get(l.pic);
      if (!s) err(`${l.id}: תמונת רמז לא קיימת במאגר — ${l.pic}`);
      else if (!existsSync(join(SPRITES_DIR, s.file))) err(`${l.id}: קובץ חסר — ${s.file}`);
    }
    if (!l.revealed?.length) { err(`${l.id}: רמה 1 בלי revealed`); continue; }
    for (const i of l.revealed) {
      if (i < 0 || i >= l.word.length) err(`${l.id}: revealed מחוץ לטווח — ${i}`);
    }
    const missing = l.word.length - new Set(l.revealed).size;
    if (missing < 1) err(`${l.id}: אין אף אות לגלות`);
    if (missing > 2) warn.push(`${l.id}: ${missing} אותיות חסרות ברמה 1 (מומלץ 1-2)`);
  } else {
    if (l.revealed) err(`${l.id}: revealed רלוונטי רק לרמה 1`);
    if (l.pic) err(`${l.id}: תמונת רמז רלוונטית רק לרמה 1`);
  }
}

// ── מקלדת ────────────────────────────────────────────────────────────────
for (const l of LEVELS) {
  const keys = new Set(buildKeyboard(l.word, l.tier, l.revealed ?? []).flat());
  [...l.word].forEach((ch, i) => {
    if (l.revealed?.includes(i)) return;
    if (!keys.has(baseOf(ch))) err(`${l.id}: האות "${ch}" לא קיימת במקלדת של רמה ${l.tier}`);
  });
}

// ── אובייקטים ────────────────────────────────────────────────────────────
const bySprite = new Map();
for (const o of OBJECTS) {
  const s = SPRITE_BY_ID.get(o.sprite);
  if (!s) { err(`${o.id}: ספרייט לא קיים — ${o.sprite}`); continue; }
  if (!existsSync(join(SPRITES_DIR, s.file))) err(`${o.id}: קובץ חסר — ${s.file}`);
  if (bySprite.has(o.sprite)) err(`ספרייט כפול "${o.sprite}": ${bySprite.get(o.sprite)} ו-${o.id}`);
  bySprite.set(o.sprite, o.id);
}

const MIN_DIST = 15;
for (const h of HOODS) {
  const list = objectsIn(h.id);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i].pos, b = list[j].pos;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < MIN_DIST) warn.push(`${h.label}: ${list[i].id} ו-${list[j].id} קרובים מדי (${d.toFixed(1)}%)`);
    }
  }
  if (!existsSync(join(BG_DIR, h.bg.replace('bg/', '')))) err(`רקע חסר: ${h.bg}`);
}
if (!existsSync(join(BG_DIR, 'full-town.webp'))) err('רקע המפה חסר: bg/full-town.webp');

// ── דוח ──────────────────────────────────────────────────────────────────
const byTier = [1, 2, 3].map((t) => `רמה ${t}: ${LEVELS.filter((l) => l.tier === t).length}`);
const byHood = HOODS.map((h) => `${h.label}: ${wordsInHood(h.id).length}מ׳/${objectsIn(h.id).length}א׳`);
console.log(`${LEVELS.length} מילים, ${OBJECTS.length} אובייקטים — ${byTier.join(' | ')}`);
console.log(`שכונות — ${byHood.join(' | ')}`);
for (const m of warn) console.log(`  ⚠ ${m}`);
if (errors.length) {
  console.error(`\n${errors.length} שגיאות:`);
  for (const m of errors) console.error(`  ✗ ${m}`);
  process.exit(1);
}
console.log(`\n✓ המאגר תקין${warn.length ? ` (${warn.length} אזהרות)` : ''}.`);
