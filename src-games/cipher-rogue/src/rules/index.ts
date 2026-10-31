import type { Level } from '../types.ts';
import type { BaseState, Rules } from './Rules.ts';
import { solve } from './Rules.ts';
import { classic } from './classic.ts';
import { valve } from './valve.ts';
import { trail } from './trail.ts';

export type { Rules, Outcome, Mark, StepKind, Hud, BaseState } from './Rules.ts';

/** איזה מודול חוקים מפעיל כל כספת */
export function rulesFor(level: Level): Rules<BaseState> {
  switch (level.mechanic) {
    case 'complement_to_100':
      return valve as unknown as Rules<BaseState>;
    case 'equation_trail':
      return trail as unknown as Rules<BaseState>;
    default:
      return classic as unknown as Rules<BaseState>;
  }
}

/** המסלול המלא מתחילת החדר - ל-validate ול-e2e */
export function solveLevel(level: Level) {
  const r = rulesFor(level);
  return solve(r, level, r.initial(level));
}

export { solve };
