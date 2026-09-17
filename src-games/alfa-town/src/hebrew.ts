/** אותיות האלף-בית בסדר אלפביתי — לא בפריסת QWERTY.
 *  ילדה בת חמש מחפשת אות לפי הסדר שהיא שרה אותו, לא לפי מקלדת מחשב. */
export const ALEF_BET = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז',
  'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ',
  'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת',
];

/** אותיות סופיות, לפי האות הרגילה שממנה הן נגזרות. */
export const FINALS: Record<string, string> = {
  'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ',
};

const BASE_OF: Record<string, string> = Object.fromEntries(
  Object.entries(FINALS).map(([base, fin]) => [fin, base]),
);

export const FINAL_LETTERS = Object.values(FINALS);

/** מחזיר את הצורה הרגילה של אות: ם → מ. אות רגילה חוזרת כמו שהיא. */
export const baseOf = (letter: string): string => BASE_OF[letter] ?? letter;

export const isFinal = (letter: string): boolean => letter in BASE_OF;

/**
 * האם לחיצה על `pressed` מתאימה לאות `target` שבמילה.
 * השוואה על הצורה הבסיסית — כך ש-מ' פותחת גם את ה-ם' של "עולם",
 * וזו הזדמנות ללמד במקום טעות.
 */
export const lettersMatch = (pressed: string, target: string): boolean =>
  baseOf(pressed) === baseOf(target);

/** האם הלחיצה הזו לימדה משהו על אות סופית (לחצה מ' וקיבלה ם'). */
export const taughtFinal = (pressed: string, target: string): boolean =>
  !isFinal(pressed) && isFinal(target) && lettersMatch(pressed, target);

/** ערבוב דטרמיניסטי לפי מפתח, כדי שאותה מילה תיתן אותה מקלדת בכל רענון. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 48271) + 11) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * בונה את מערך המקלדת לפי רמה.
 *  רמה 1 — רק האותיות החסרות + מסיחות, עד 6 מקשים.
 *  רמה 2 — אותיות המילה מעורבבות + 4 מסיחות.
 *  רמה 3 — האלף-בית המלא כולל אותיות סופיות.
 */
export function buildKeyboard(
  word: string,
  tier: 1 | 2 | 3,
  revealed: number[] = [],
): string[][] {
  if (tier === 3) {
    return [
      ALEF_BET.slice(0, 7),
      ALEF_BET.slice(7, 14),
      ALEF_BET.slice(14, 22),
      FINAL_LETTERS,
    ];
  }

  const needed = [...word]
    .map((ch, i) => ({ ch, i }))
    .filter(({ i }) => !revealed.includes(i))
    .map(({ ch }) => baseOf(ch));
  const unique = [...new Set(needed)];

  const decoyCount = tier === 1 ? Math.max(0, 5 - unique.length) : 4;
  const pool = ALEF_BET.filter((l) => !unique.includes(l));
  const decoys = seededShuffle(pool, word).slice(0, decoyCount);

  const keys = seededShuffle([...unique, ...decoys], word + tier);
  const perRow = Math.ceil(keys.length / (keys.length > 6 ? 2 : 1));
  const rows: string[][] = [];
  for (let i = 0; i < keys.length; i += perRow) rows.push(keys.slice(i, i + perRow));
  return rows;
}
