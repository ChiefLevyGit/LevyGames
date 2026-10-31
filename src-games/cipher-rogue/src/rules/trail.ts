import type { Cell } from '../types.ts';
import { keyOf, sameCell } from '../types.ts';
import type { Rules } from './Rules.ts';
import { NOT_ADJACENT, isAdjacent, neighbors, runningEq, signed, solve, val } from './Rules.ts';

/**
 * שביל המשוואה: כל אבן מוסיפה (או מורידה) אנרגיה למאזניים, ונכנסים לשער רק
 * עם הסכום המדויק. אבן שעוזבים נשרפת ואי אפשר לחזור אליה (החלטת אלעד).
 * כאן החשבון הוא המטרה ולא תנאי מעבר: אין אבן "שגויה", רק מסלול לא מתוכנן.
 *
 * טעויות (פעמון): כניסה לשער עם סכום לא נכון, וירידה מתחת לאפס.
 * מבוי סתום - מצב שממנו כבר אין שביל ל-target - מאפס את החדר עם פעמון,
 * כדי שילדה לא תסתובב דקות בחדר שכבר אי אפשר לפתוח.
 */
export interface TrailState {
  at: Cell;
  sum: number;
  burnt: Set<string>;
}

const T = (level: { targetNumber?: number }) => level.targetNumber!;

export const trail: Rules<TrailState> = {
  initial: (level) => ({ at: level.start, sum: 0, burnt: new Set() }),

  initialMarks: (level) => [[level.start, 'good']],

  label(level, c) {
    if (sameCell(c, level.start)) return '';
    if (sameCell(c, level.exit)) return `=${T(level)}`;
    return signed(val(level, c));
  },

  attempt(level, s, to) {
    if (!isAdjacent(s.at, to)) return NOT_ADJACENT;
    const k = keyOf(to);
    if (s.burnt.has(k) || sameCell(to, s.at)) {
      return { kind: 'refuse', why: 'האבן הזאת כבר נשרפה — אי אפשר לדרוך עליה שוב.', known: true };
    }
    const burnt = new Set(s.burnt).add(keyOf(s.at));
    const target = T(level);

    if (sameCell(to, level.exit)) {
      if (s.sum === target) {
        return {
          kind: 'move',
          state: { at: to, sum: s.sum, burnt },
          step: 'valid',
          marks: [[s.at, 'burnt'], [to, 'good']],
          lit: [to],
        };
      }
      const why =
        s.sum < target
          ? `יש לך ${s.sum}, והמנעול צריך בדיוק ${target}. חסרים עוד ${target - s.sum}.`
          : `יש לך ${s.sum} — יותר מ-${target} ב-${s.sum - target}. צריך אבן מינוס בדרך.`;
      return { kind: 'wrong', why };
    }

    // ילדים בכיתה ד' עוד לא לומדים מספרים שליליים - המאזניים לא יורדים מתחת ל-0
    const v = val(level, to);
    const next = s.sum + v;
    if (next < 0) {
      return { kind: 'wrong', why: `${s.sum} − ${-v} זה פחות מאפס — אין לך מספיק אנרגיה לאבן הזאת.` };
    }
    return {
      kind: 'move',
      state: { at: to, sum: next, burnt },
      step: next === target ? 'valid' : 'neutral',
      marks: [[s.at, 'burnt'], [to, 'good']],
      lit: [to],
      float: runningEq(s.sum, v),
    };
  },

  isWin: (level, s) => sameCell(s.at, level.exit),

  sig: (s) => `${keyOf(s.at)}|${s.sum}|${[...s.burnt].sort().join(';')}`,

  reachable: (level, s) => neighbors(level, s.at).filter((c) => !s.burnt.has(keyOf(c))),

  intro: (level) => `אספי בדיוק ${T(level)} אנרגיה בדרך לשער. כל אבן שעוזבים — נשרפת!`,

  hud: (level, s) => ({ type: 'balance', value: s.sum, target: T(level) }),

  deadEnd(level, s) {
    if (trail.isWin(level, s) || solve(trail, level, s)) return null;
    const target = T(level);
    if (s.sum > target) return `יש לך ${s.sum} — יותר מ-${target}, ומכאן כבר אין שביל שיחזיר בדיוק ל-${target}.`;
    if (s.sum === target) return `יש לך בדיוק ${target} — אבל מכאן אין דרך לשער בלי לדרוך על עוד אבנים.`;
    return `יש לך ${s.sum} וחסרים ${target - s.sum} — אבל מכאן כבר אין שביל שמשלים בדיוק את זה.`;
  },
};
