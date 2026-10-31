import type { Cell, Level } from '../types.ts';
import { keyOf, sameCell } from '../types.ts';
import type { Rules } from './Rules.ts';
import { solve, val } from './Rules.ts';

/**
 * אולם הקפיצות: על כל אבן חרות תרגיל, והתוצאה היא כמה אבנים צל קופצת - בקו
 * ישר, לכל כיוון, מעל האבנים שבדרך. כאן החשבון הוא כוח התנועה עצמו.
 *
 * `tiles` = מרחק הקפיצה (התוצאה), `exprs` = התרגיל שמוצג. 0 בלי תרגיל = אבן
 * שבורה עם בור: נחיתה עליה עולה פעמון וצל מטפסת חזרה (החלטת אלעד).
 * טעויות (פעמון): אבן בקו ישר אבל במרחק לא נכון - טעות חישוב; נפילה לבור.
 * אבן שלא בקו ישר - הסבר בלי פעמון, זו שאלה של חוק ולא של חשבון.
 * מבוי סתום (אבנים שרק מקפיצות זו לזו) - פעמון והחדר מתאפס.
 */
export interface LeapState {
  at: Cell;
}

const expr = (level: Level, c: Cell) => level.exprs?.[c.row]?.[c.col] ?? String(val(level, c));
const isPit = (level: Level, c: Cell) => val(level, c) === 0 && !sameCell(c, level.exit);
const stones = (n: number) => (n === 1 ? 'אבן אחת' : `${n} אבנים`);

export const leap: Rules<LeapState> = {
  initial: (level) => ({ at: level.start }),

  initialMarks: (level) => [[level.start, 'good']],

  label(level, c) {
    if (sameCell(c, level.exit) || isPit(level, c)) return '';
    return expr(level, c);
  },

  tileClass: (level, c) => (isPit(level, c) ? 'is-pit' : null),

  attempt(level, s, to) {
    const dr = to.row - s.at.row;
    const dc = to.col - s.at.col;
    if (dr !== 0 && dc !== 0) {
      return { kind: 'refuse', why: 'קופצים רק בקו ישר — למעלה, למטה, ימינה או שמאלה.', known: false, flash: true };
    }
    const n = val(level, s.at);
    const e = expr(level, s.at);
    const d = Math.abs(dr) + Math.abs(dc);
    if (d !== n) {
      return { kind: 'wrong', why: `${e} = ${n}, אז קופצים ${stones(n)} — והאבן הזאת במרחק ${d}.` };
    }
    if (isPit(level, to)) {
      return { kind: 'wrong', why: `${e} = ${n} — נכון! אבל שם יש בור. מכאן צריך כיוון אחר.`, fall: true };
    }
    return {
      kind: 'move',
      state: { at: to },
      step: 'valid',
      marks: [[to, 'good']],
      lit: [to],
      float: `${e} = ${n}`,
    };
  },

  candidates(level, s) {
    const n = val(level, s.at);
    const out: Cell[] = [];
    if (!n) return out;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const r = s.at.row + dr * n;
      const c = s.at.col + dc * n;
      if (r >= 0 && c >= 0 && r < level.tiles.length && c < level.tiles[0].length) out.push({ row: r, col: c });
    }
    return out;
  },

  isWin: (level, s) => sameCell(s.at, level.exit),

  sig: (s) => keyOf(s.at),

  // מסמנים את הקווים הישרים ולא את נקודות הנחיתה - אחרת הלוח פותר את התרגיל במקום הילדה
  reachable(level, s) {
    const out: Cell[] = [];
    for (let r = 0; r < level.tiles.length; r++) if (r !== s.at.row) out.push({ row: r, col: s.at.col });
    for (let c = 0; c < level.tiles[0].length; c++) if (c !== s.at.col) out.push({ row: s.at.row, col: c });
    return out;
  },

  keys: 'focus',

  hud: (level, s) => ({ type: 'leap', expr: expr(level, s.at) }),

  intro: () => 'פתרי את התרגיל שעל האבן — התוצאה היא כמה אבנים קופצים, בקו ישר.',

  deadEnd(level, s) {
    if (leap.isWin(level, s) || solve(leap, level, s)) return null;
    const stuck = !leap.candidates!(level, s).some((to) => leap.attempt(level, s, to).kind === 'move');
    return stuck
      ? 'מהאבן הזאת כל זינוק נוחת בבור או מחוץ ללוח — אין ממנה דרך לשער.'
      : 'מהאבנים כאן אפשר רק לקפוץ הלוך ושוב — אין מהן דרך לשער.';
  },
};
