/**
 * מוכיח שכל כספת פתירה ושהתוכן שלה תקין.
 *   npm run validate     (node מריץ TypeScript ישירות - type stripping)
 *
 * בודק לכל שלב: רשת מלבנית, התחלה ויציאה בתוכה, מסלול מההתחלה ליציאה (אותו
 * פותר ואותם חוקים שמשמשים לרמזים), ולפי המכניקה:
 *   - חוק קלאסי: התחלה ויציאה תקינות, ולכל אריח יש טקסט - משוואה שלמה לאריח
 *     תקין והסבר לאריח שגוי.
 *   - שביל משוואה: כמה שבילים פותרים יש, מכמה כיווני פתיחה, ושהשביל הישר
 *     (הניחוש הראשון של ילדה) לא פותר.
 */
import { LEVELS, SECRET_LEVEL, vaultNo } from '../src/config/levels.ts';
import { equationFor, explainInvalid, isValid } from '../src/systems/MathSystem.ts';
import { rulesFor, solveLevel } from '../src/rules/index.ts';
import type { Level } from '../src/types.ts';
import { keyOf, sameCell } from '../src/types.ts';

let failed = 0;
const fail = (id: number, msg: string) => {
  failed++;
  console.error(`  ✗ שלב ${id}: ${msg}`);
};

const isClassic = (l: Level) => l.mechanic !== 'complement_to_100' && l.mechanic !== 'equation_trail';

/** כל השבילים הפותרים בשביל המשוואה (DFS - הלוח קטן) */
function trailSolutions(level: Level): string[][] {
  const out: string[][] = [];
  const target = level.targetNumber!;
  const rows = level.tiles.length;
  const cols = level.tiles[0].length;
  const walk = (r: number, c: number, sum: number, seen: Set<string>, path: string[]) => {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const R = r + dr;
      const C = c + dc;
      if (R < 0 || C < 0 || R >= rows || C >= cols) continue;
      const k = keyOf({ row: R, col: C });
      if (seen.has(k)) continue;
      if (sameCell({ row: R, col: C }, level.exit)) {
        if (sum === target) out.push([...path]);
        continue;
      }
      const next = sum + level.tiles[R][C];
      if (next < 0) continue;
      seen.add(k);
      path.push(k);
      walk(R, C, next, seen, path);
      path.pop();
      seen.delete(k);
    }
  };
  walk(level.start.row, level.start.col, 0, new Set([keyOf(level.start)]), []);
  return out;
}

for (const level of LEVELS) {
  const { id, tiles, start, exit } = level;
  const rows = tiles.length;
  const cols = tiles[0].length;

  if (!tiles.every((r) => r.length === cols)) fail(id, 'הרשת לא מלבנית');
  for (const [name, c] of [['התחלה', start], ['יציאה', exit]] as const) {
    if (c.row < 0 || c.col < 0 || c.row >= rows || c.col >= cols) fail(id, `${name} מחוץ לרשת`);
  }

  let extra = '';
  if (isClassic(level)) {
    if (!isValid(level, tiles[start.row][start.col])) fail(id, 'אריח ההתחלה לא תקין');
    if (!isValid(level, tiles[exit.row][exit.col])) fail(id, 'אריח היציאה לא תקין');
    let validCount = 0;
    for (const row of tiles) {
      for (const v of row) {
        if (isValid(level, v)) {
          validCount++;
          const eq = equationFor(level, v);
          if (!eq || /\d\.\d/.test(eq)) fail(id, `משוואה לא שלמה ל-${v}: "${eq}"`);
        } else if (!explainInvalid(level, v)) {
          fail(id, `אין הסבר ל-${v}`);
        }
      }
    }
    extra = `, ${validCount} אריחים תקינים`;
  }

  if (level.mechanic === 'equation_trail') {
    if (!level.targetNumber) fail(id, 'אין targetNumber');
    const sols = trailSolutions(level);
    const openings = new Set(sols.map((p) => p[0]));
    const straight = [];
    for (let r = start.row - 1; r > exit.row; r--) straight.push(tiles[r][start.col]);
    const straightSum = straight.reduce((a, b) => a + b, 0);
    if (start.col === exit.col && straightSum === level.targetNumber) fail(id, 'השביל הישר פותר - אין חידה');
    if (sols.length < 3) fail(id, `רק ${sols.length} שבילים פותרים - קשה מדי`);
    if (openings.size < 2) fail(id, 'רק כיוון פתיחה אחד - כל צעד ראשון אחר הוא מבוי סתום');
    extra = `, ${sols.length} שבילים פותרים, ${openings.size} כיווני פתיחה, השביל הישר ${straightSum}`;
  }

  const path = solveLevel(level);
  if (!path) {
    fail(id, 'אין מסלול מההתחלה ליציאה');
    continue;
  }
  const r = rulesFor(level);
  const tag = level.secret ? ' (סודית)' : ` (כספת ${vaultNo(level)})`;
  const route = [start, ...path].map((c) => r.label(level, c) || '•').join(' → ');
  console.log(`✓ שלב ${String(id).padStart(2)}${tag}: ${path.length} צעדים${extra}\n    ${route}`);
}

if (!SECRET_LEVEL) {
  failed++;
  console.error('  ✗ אין כספת סודית');
}

if (failed) {
  console.error(`\n${failed} בעיות`);
  process.exit(1);
}
console.log(`\nכל ${LEVELS.length} הכספות פתירות ותקינות.`);
