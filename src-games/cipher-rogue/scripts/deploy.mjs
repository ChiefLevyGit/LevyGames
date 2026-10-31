#!/usr/bin/env node
/**
 * פריסה לפורטל: dist/ -> ../../games/cipher-rogue/
 *   npm run build && npm run deploy
 *
 * התיקייה games/cipher-rogue/ היא תוצר build בלבד, ולכן היא נמחקת במלואה לפני
 * ההעתקה. כך לא נשארים בנדלים ישנים עם hash וגם לא נכסים שנמחקו מהמקור -
 * שתי המלכודות ש-CLAUDE.md מזהיר מהן ("rm -rf assets" ו-"cp -r לא מוחק").
 */
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const TARGET = resolve(ROOT, '..', '..', 'games', 'cipher-rogue');

if (!existsSync(resolve(DIST, 'index.html'))) {
  console.error('אין dist/index.html - קודם npm run build');
  process.exit(1);
}

rmSync(TARGET, { recursive: true, force: true });
cpSync(DIST, TARGET, { recursive: true });
console.log(`נפרס: ${TARGET}`);
console.log(readdirSync(TARGET).map((f) => `  ${f}`).join('\n'));
