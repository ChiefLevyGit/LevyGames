/**
 * מוכיח שכל כספת פתירה ושהתוכן שלה תקין.
 *   npm run validate     (node מריץ TypeScript ישירות - type stripping)
 *
 * בודק לכל שלב: רשת מלבנית, התחלה ויציאה בתוכה, התחלה תקינה, מסלול
 * מההתחלה ליציאה (אותו פותר שמשמש לרמזים), ושלכל אריח יש טקסט - משוואה
 * שלמה לאריח תקין והסבר לאריח שגוי.
 */
import { LEVELS, SECRET_LEVEL } from '../src/config/levels.ts';
import {
  equationFor,
  explainInvalid,
  initialState,
  isValid,
  isValve,
  solve,
} from '../src/systems/MathSystem.ts';

let failed = 0;
const fail = (id: number, msg: string) => {
  failed++;
  console.error(`  ✗ שלב ${id}: ${msg}`);
};

for (const level of LEVELS) {
  const { id, tiles, start, exit } = level;
  const rows = tiles.length;
  const cols = tiles[0].length;

  if (!tiles.every((r) => r.length === cols)) fail(id, 'הרשת לא מלבנית');
  for (const [name, c] of [['התחלה', start], ['יציאה', exit]] as const) {
    if (c.row < 0 || c.col < 0 || c.row >= rows || c.col >= cols) fail(id, `${name} מחוץ לרשת`);
  }

  const valve = isValve(level);
  if (!valve && !isValid(level, tiles[start.row][start.col])) fail(id, 'אריח ההתחלה לא תקין');
  if (!valve && !isValid(level, tiles[exit.row][exit.col])) fail(id, 'אריח היציאה לא תקין');

  let validCount = 0;
  for (const row of tiles) {
    for (const v of row) {
      if (valve) continue;
      if (isValid(level, v)) {
        validCount++;
        const eq = equationFor(level, v);
        if (!eq || /\d\.\d/.test(eq)) fail(id, `משוואה לא שלמה ל-${v}: "${eq}"`);
      } else if (!explainInvalid(level, v)) {
        fail(id, `אין הסבר ל-${v}`);
      }
    }
  }

  const path = solve(level, initialState(level));
  if (!path) {
    fail(id, 'אין מסלול מההתחלה ליציאה');
    continue;
  }
  const tag = level.secret ? ' (סודית)' : '';
  const route = path.map((c) => tiles[c.row][c.col]).join(' → ');
  console.log(
    `✓ שלב ${String(id).padStart(2)}${tag}: ${path.length} צעדים` +
      (valve ? '' : `, ${validCount} אריחים תקינים`) +
      `\n    ${tiles[start.row][start.col]} → ${route}`,
  );
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
