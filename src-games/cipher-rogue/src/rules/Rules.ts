import type { Cell, Level } from '../types.ts';
import { isAdjacent } from '../types.ts';

/**
 * מנוע החוקים: כל מכניקה היא מודול טהור שעונה על "מה קורה אם צל מנסה לדרוך
 * כאן?". מסך הכספת לא יודע שום דבר על חשבון - הוא רק מתרגם תוצאה לתנועה,
 * סימון אבנים, צליל וטקסט. אותו מודול משמש את הפותר (רמזים), את
 * scripts/validate-levels.ts ואת בדיקת ה-e2e, ולכן אין בו DOM.
 *
 * להוסיף מכניקה = קובץ חדש בתיקייה הזאת + שורה ב-index.ts.
 */

export type Mark = 'normal' | 'good' | 'pending' | 'trap' | 'burnt';

/** איזה צליל/אירוע מלווה צעד מוצלח */
export type StepKind = 'valid' | 'neutral' | 'revisit' | 'valve_open' | 'valve_close' | 'valve_release';

export interface BaseState {
  at: Cell;
}

export type Outcome<S> =
  /** הצעד מתקבל: צל עוברת, האבנים מסומנות מחדש */
  | {
      kind: 'move';
      state: S;
      step: StepKind;
      marks?: [Cell, Mark][];
      /** אבנים שמקבלות את אנימציית ההצלחה */
      lit?: Cell[];
      float?: string;
      whisper?: string;
    }
  /** טעות חשבונית: פעמון, הסבר, וצל נשארת במקום */
  /** fall - צל נופלת לבור ומטפסת חזרה, במקום לקפוץ ולהיבהל */
  | { kind: 'wrong'; why: string; state?: S; marks?: [Cell, Mark][]; fall?: boolean }
  /**
   * לא טעות - אסור לדרוך שם (מלכודת ידועה, אבן שרופה). בלי פעמון.
   * flash - בקשה שלא עומדת בחוק התנועה עצמו: בלי צליל, והאבנים הנגישות מהבהבות.
   */
  | { kind: 'refuse'; why: string; known: boolean; flash?: boolean };

export type Hud =
  | { type: 'valve'; open: number | null }
  | { type: 'balance'; value: number; target: number }
  /** אולם הקפיצות: התרגיל שמתחת לצל (היא מסתירה אותו על האבן) */
  | { type: 'leap'; expr: string };

export interface Rules<S extends BaseState> {
  initial(level: Level): S;
  initialMarks(level: Level): [Cell, Mark][];
  /** מה כתוב על האבן */
  label(level: Level, c: Cell): string;
  attempt(level: Level, s: S, to: Cell): Outcome<S>;
  isWin(level: Level, s: S): boolean;
  /** חתימת מצב לפותר - שני מצבים עם אותה חתימה שקולים */
  sig(s: S): string;
  /** אבנים שמסומנות כנגישות (הילת ציאן) */
  reachable(level: Level, s: S): Cell[];
  /** לאן הפותר מנסה לזוז (ברירת מחדל: ארבעת השכנים) */
  candidates?(level: Level, s: S): Cell[];
  /** מחלקת CSS קבועה לאבן (למשל אבן שבורה) */
  tileClass?(level: Level, c: Cell): string | null;
  /** חיצים: step - צעד לשכן (ברירת מחדל); focus - מזיזים פוקוס, ו-Enter קופץ */
  keys?: 'step' | 'focus';
  /** משפט הפתיחה בבועה של צל */
  intro(level: Level): string;
  hud?(level: Level, s: S): Hud;
  /** אם מהמצב הזה כבר אי אפשר לנצח - ההסבר. החדר יתאפס עם פעמון. */
  deadEnd?(level: Level, s: S): string | null;
}

// ------------------------------------------------------------------ helpers

export const val = (level: Level, c: Cell) => level.tiles[c.row][c.col];

export function neighbors(level: Level, c: Cell): Cell[] {
  const out: Cell[] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const r = c.row + dr;
    const k = c.col + dc;
    if (r >= 0 && k >= 0 && r < level.tiles.length && k < level.tiles[0].length) out.push({ row: r, col: k });
  }
  return out;
}

/** "−10" עם סימן מינוס אמיתי - מקף רגיל נראה קצר מדי ליד ספרות גדולות */
export const signed = (v: number) => (v < 0 ? `−${-v}` : `+${v}`);

/** פעולה על סכום מצטבר: "35 + 15 = 50", "50 − 10 = 40" */
export const runningEq = (sum: number, v: number) =>
  v < 0 ? `${sum} − ${-v} = ${sum + v}` : `${sum} + ${v} = ${sum + v}`;

/** חוק התנועה של רוב המכניקות: רק לאבן צמודה */
export const NOT_ADJACENT = {
  kind: 'refuse',
  why: 'צל יכולה לקפוץ רק לאבן שצמודה אליה — אחת מהאבנים שזוהרות בתכלת.',
  known: false,
  flash: true,
} as const;

export { isAdjacent };

// ------------------------------------------------------------------ solver

/**
 * BFS מהמצב הנוכחי אל ניצחון, דרך אותו attempt() שהמשחק משתמש בו.
 * מחזיר את רצף האבנים (בלי נקודת המוצא), או null.
 */
export function solve<S extends BaseState>(rules: Rules<S>, level: Level, from: S, maxStates = 400_000): Cell[] | null {
  type Node = { s: S; prev: Node | null };
  const start: Node = { s: from, prev: null };
  const seen = new Set([rules.sig(from)]);
  const queue: Node[] = [start];

  for (let qi = 0; qi < queue.length; qi++) {
    const n = queue[qi];
    if (rules.isWin(level, n.s)) {
      const path: Cell[] = [];
      for (let x: Node | null = n; x && x.prev; x = x.prev) path.push(x.s.at);
      return path.reverse();
    }
    if (queue.length > maxStates) return null;

    for (const to of rules.candidates?.(level, n.s) ?? neighbors(level, n.s.at)) {
      const o = rules.attempt(level, n.s, to);
      if (o.kind !== 'move') continue;
      const sig = rules.sig(o.state);
      if (seen.has(sig)) continue;
      seen.add(sig);
      queue.push({ s: o.state, prev: n });
    }
  }
  return null;
}
