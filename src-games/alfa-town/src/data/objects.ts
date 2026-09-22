import type { CityObject, Hood } from '../types';

/**
 * 40 האובייקטים של העיר — הפרסים.
 *
 * אובייקט אינו קשור למילה מסוימת: הוא נפתח כל `WORDS_PER_PRIZE` מילים
 * שנפתרות **באותה שכונה**, בסדר הרשימה כאן. זה מה שמאפשר 120 מילים בלי
 * 120 ספרייטים, וזה גם מה שהופך את הפרס למשהו שצריך להתאמץ בשבילו.
 *
 * כמה נפתחו נגזר מ-`solved` ולא נשמר בנפרד — אין מקור אמת שני.
 *
 * `pos` — אחוזים בתוך פאנל השכונה. y קובע גם את הגודל (גבוה = רחוק = קטן),
 * ולכן פריטי שמיים יושבים גבוה ומקבלים גודל קטן בחינם.
 */

/** כמה מילים בשכונה שוות אובייקט אחד. */
export const WORDS_PER_PRIZE = 3;

const o = (
  hood: Hood,
  sprite: string,
  x: number,
  y: number,
  alive?: CityObject['alive'],
): CityObject => ({ id: `${hood}-${sprite}`, hood, sprite, pos: { x, y }, alive });

export const OBJECTS: CityObject[] = [
  // ── מרכז העיר — 12 ─────────────────────────────────────
  o('downtown', 'house', 12, 46),
  o('downtown', 'apartment', 37, 44),
  o('downtown', 'tower', 62, 46),
  o('downtown', 'shop', 88, 48),
  o('downtown', 'station', 10, 64),
  o('downtown', 'bridge', 34, 66),
  o('downtown', 'fountain', 60, 64, 'splash'),
  o('downtown', 'castle', 86, 68),
  o('downtown', 'trafficlight', 20, 84),
  o('downtown', 'train', 46, 86, 'drive'),
  o('downtown', 'bus', 72, 84, 'drive'),
  o('downtown', 'car', 92, 88, 'drive'),

  // ── פארק החיות — 12 ────────────────────────────────────
  o('park', 'tree', 14, 42, 'sway'),
  o('park', 'giraffe', 40, 40),
  o('park', 'elephant', 66, 42),
  o('park', 'butterfly', 90, 44, 'sway'),
  o('park', 'lion', 12, 62),
  o('park', 'zebra', 38, 64),
  o('park', 'bear', 64, 62),
  o('park', 'panda', 88, 66),
  o('park', 'monkey', 22, 84, 'hop'),
  o('park', 'kangaroo', 48, 86, 'hop'),
  o('park', 'tiger', 74, 84),
  o('park', 'frog', 94, 88, 'hop'),

  // ── החוף — 9 ───────────────────────────────────────────
  o('shore', 'rainbow', 20, 20),
  o('shore', 'palm', 56, 18, 'sway'),
  o('shore', 'umbrella', 86, 22),
  o('shore', 'boat', 14, 50, 'sway'),
  o('shore', 'fish', 48, 48),
  o('shore', 'tent', 82, 52),
  o('shore', 'turtle', 28, 78),
  o('shore', 'puddle', 60, 80, 'splash'),
  o('shore', 'stones', 90, 84),

  // ── מגרש החלל — 7 ──────────────────────────────────────
  o('space', 'star', 16, 20, 'orbit'),
  o('space', 'satellite', 52, 18, 'orbit'),
  o('space', 'planet', 86, 24, 'orbit'),
  o('space', 'rocket', 24, 52),
  o('space', 'shuttle', 62, 50),
  o('space', 'astronaut', 90, 56),
  o('space', 'alien', 44, 84, 'hop'),
];

export const objectsIn = (hood: Hood): CityObject[] =>
  OBJECTS.filter((x) => x.hood === hood);
