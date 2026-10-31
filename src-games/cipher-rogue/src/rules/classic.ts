import type { Cell } from '../types.ts';
import { keyOf, sameCell } from '../types.ts';
import { equationFor, explainInvalid, isValid } from '../systems/MathSystem.ts';
import type { Rules } from './Rules.ts';
import { neighbors, val } from './Rules.ts';

/**
 * כספות 1-8, 10 והסודית: דורכים רק על אבן שעונה לחוק המנעול.
 * אבן ירוקה היא מעבר חופשי; אבן שגויה הופכת למלכודת ידועה.
 */
export interface ClassicState {
  at: Cell;
  green: Set<string>;
  traps: Set<string>;
}

export const classic: Rules<ClassicState> = {
  initial: (level) => ({ at: level.start, green: new Set([keyOf(level.start)]), traps: new Set() }),

  initialMarks: (level) => [[level.start, 'good']],

  label: (level, c) => String(val(level, c)),

  attempt(level, s, to) {
    const k = keyOf(to);
    const v = val(level, to);
    if (s.green.has(k)) return { kind: 'move', state: { ...s, at: to }, step: 'revisit' };
    if (s.traps.has(k)) return { kind: 'refuse', why: `כבר גילית שזו מלכודת: ${explainInvalid(level, v)}`, known: true };
    if (isValid(level, v)) {
      return {
        kind: 'move',
        state: { ...s, at: to, green: new Set(s.green).add(k) },
        step: 'valid',
        marks: [[to, 'good']],
        lit: [to],
        float: equationFor(level, v),
      };
    }
    return {
      kind: 'wrong',
      why: explainInvalid(level, v),
      state: { ...s, traps: new Set(s.traps).add(k) },
      marks: [[to, 'trap']],
    };
  },

  isWin: (level, s) => sameCell(s.at, level.exit) && s.green.has(keyOf(level.exit)),

  // התקינות תלויה רק באבן עצמה, ולכן המיקום לבדו מגדיר את המצב
  sig: (s) => keyOf(s.at),

  reachable: (level, s) => neighbors(level, s.at).filter((c) => !s.traps.has(keyOf(c))),

  intro: (level) => `דרכי רק על ${level.target}. מאיזו אבן ממשיכים?`,
};
