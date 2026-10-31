import type { Cell } from '../types.ts';
import { keyOf, sameCell } from '../types.ts';
import { explainValve, VALVE_SUM } from '../systems/MathSystem.ts';
import type { Rules } from './Rules.ts';
import { neighbors, val } from './Rules.ts';

/**
 * כספת 9 - שסתום המאה: הצעד הראשון פותח שסתום, הצעד שאחריו חייב להשלים
 * אותו ל-100. חזרה לאבן ירוקה משחררת שסתום פתוח בלי עונש.
 */
export interface ValveState {
  at: Cell;
  /** האבן שפתחה זוג וממתינה להשלמה */
  pending: Cell | null;
  green: Set<string>;
}

export const valve: Rules<ValveState> = {
  initial: (level) => ({ at: level.start, pending: null, green: new Set([keyOf(level.start)]) }),

  initialMarks: (level) => [[level.start, 'good']],

  label: (level, c) => String(val(level, c)),

  attempt(level, s, to) {
    const v = val(level, to);
    if (s.green.has(keyOf(to))) {
      if (s.pending) {
        return {
          kind: 'move',
          state: { ...s, at: to, pending: null },
          step: 'valve_release',
          marks: [[s.pending, 'normal']],
          whisper: 'השסתום שוחרר בשקט. אפשר לבחור אבן פתיחה אחרת.',
        };
      }
      return { kind: 'move', state: { ...s, at: to }, step: 'revisit' };
    }

    if (!s.pending) {
      return {
        kind: 'move',
        state: { ...s, at: to, pending: to },
        step: 'valve_open',
        marks: [[to, 'pending']],
        whisper: `השסתום פתוח על ${v}. עכשיו צריך אבן צמודה עם ${VALVE_SUM - v}.`,
      };
    }

    const a = val(level, s.pending);
    if (a + v === VALVE_SUM) {
      const green = new Set(s.green).add(keyOf(s.pending)).add(keyOf(to));
      return {
        kind: 'move',
        state: { at: to, pending: null, green },
        step: 'valve_close',
        marks: [[s.pending, 'good'], [to, 'good']],
        lit: [s.pending, to],
        float: `${a} + ${v} = ${VALVE_SUM}`,
      };
    }
    return { kind: 'wrong', why: explainValve(a, v) };
  },

  isWin: (level, s) => sameCell(s.at, level.exit) && !s.pending && s.green.has(keyOf(level.exit)),

  sig: (s) => `${keyOf(s.at)}|${s.pending ? keyOf(s.pending) : '-'}|${[...s.green].sort().join(';')}`,

  reachable: (level, s) => neighbors(level, s.at),

  intro: () => 'פתחי שסתום באבן אחת — והשלימי אותו ל-100 באבן שלידה.',

  hud: (level, s) => ({ type: 'valve', open: s.pending ? val(level, s.pending) : null }),
};
