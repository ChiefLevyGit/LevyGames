import type { Level } from '../types.ts';

/**
 * הליבה החשבונית. טבלת dispatch לפי `mechanic` - בלי eval על validCondition
 * (שהוא תיעוד קריא בלבד ב-levels.json המקורי). פונקציות טהורות בלבד, כדי
 * ש-scripts/validate-levels.ts יוכל להריץ אותן ב-node בלי דפדפן.
 * הפותר וחוקי התנועה עברו ל-src/rules/.
 */

const MULTIPLE_OF: Partial<Record<Level['mechanic'], number>> = {
  multiples_of_5: 5,
  multiples_of_10: 10,
  multiples_of_3: 3,
  multiples_of_4: 4,
  multiples_of_7: 7,
  multiples_of_9: 9,
  common_multiples: 12,
};

export const isValve = (level: Level) => level.mechanic === 'complement_to_100';

/** תוצאה של תרגיל קצר "a op b" (×, ÷, +, −). NaN אם הוא לא תקין או לא יוצא שלם. */
export function evalExpr(e: string): number {
  const m = /^\s*(\d+)\s*([×÷+−])\s*(\d+)\s*$/.exec(e);
  if (!m) return NaN;
  const a = Number(m[1]);
  const b = Number(m[3]);
  const r = { '×': a * b, '÷': a / b, '+': a + b, '−': a - b }[m[2] as '×' | '÷' | '+' | '−'];
  return Number.isInteger(r) ? r : NaN;
}
export const VALVE_SUM = 100;

/** תקינות אריח בודד. לא רלוונטי לשסתום, שם התקינות תלויה בצעד הקודם. */
export function isValid(level: Level, v: number): boolean {
  switch (level.mechanic) {
    case 'even_numbers':
      return v % 2 === 0;
    case 'factors_of_target':
      return v > 0 && level.targetNumber! % v === 0;
    case 'complement_to_100':
      return true;
    default: {
      const k = MULTIPLE_OF[level.mechanic]!;
      // 0 הוא כפולה מתמטית, אבל ב-levels.json המקורי רק שלב 2 מקבל אותו (שם
      // הוא אריח הפתיחה). את התנאי `value > 0` שם המחבר בשאר השלבים.
      return level.mechanic === 'multiples_of_5' ? v % k === 0 : v > 0 && v % k === 0;
    }
  }
}

const digitSum = (v: number) => String(v).split('').reduce((s, d) => s + Number(d), 0);

/** המשוואה שצפה מעל אריח אחרי צעד נכון - חיזוק של העובדה, לא רק "כל הכבוד". */
export function equationFor(level: Level, v: number): string {
  switch (level.mechanic) {
    case 'even_numbers':
      return v === 0 ? '0 = 0 + 0' : `${v} = ${v / 2} + ${v / 2}`;
    case 'factors_of_target': {
      const t = level.targetNumber!;
      return `${v} × ${t / v} = ${t}`;
    }
    case 'common_multiples':
      return `${v} = 3×${v / 3} = 4×${v / 4}`;
    case 'multiples_of_9':
      return v < 100 && v % 9 === 0 && v <= 90
        ? `9 × ${v / 9} = ${v}   (${String(v).split('').join('+')}=9)`
        : `9 × ${v / 9} = ${v}`;
    case 'complement_to_100':
      return '';
    default: {
      const k = MULTIPLE_OF[level.mechanic]!;
      return `${k} × ${v / k} = ${v}`;
    }
  }
}

/** הסבר סיבתי לצעד שגוי: למה בדיוק המספר הזה לא עובד. */
export function explainInvalid(level: Level, v: number): string {
  switch (level.mechanic) {
    case 'even_numbers': {
      const h = Math.floor(v / 2);
      return `${v} לא זוגי: ${v} = ${h} + ${h} + 1, ונשאר 1.`;
    }
    case 'multiples_of_10': {
      const lo = Math.floor(v / 10) * 10;
      return `${v} הוא לא עשרת שלמה — הוא בין ${lo} ל-${lo + 10}.`;
    }
    case 'factors_of_target': {
      const t = level.targetNumber!;
      if (v > t) return `${v} גדול מ-${t}, אז הוא לא יכול לחלק אותו.`;
      const q = Math.floor(t / v);
      return `${v} לא מחלק את ${t}: ${t} ÷ ${v} = ${q}, ונשאר ${t - q * v}.`;
    }
    case 'common_multiples': {
      const by3 = v % 3 === 0;
      const by4 = v % 4 === 0;
      if (by3 && !by4) return `${v} בלוח ה-3, אבל לא בלוח ה-4.`;
      if (by4 && !by3) return `${v} בלוח ה-4, אבל לא בלוח ה-3.`;
      return `${v} לא בלוח ה-3 וגם לא בלוח ה-4.`;
    }
    case 'multiples_of_9': {
      const ds = digitSum(v);
      return v < 100
        ? `${v} לא בלוח ה-9: סכום הספרות שלו ${ds}, ולא 9.`
        : `${v} לא בלוח ה-9.`;
    }
    case 'complement_to_100':
      return '';
    default: {
      const k = MULTIPLE_OF[level.mechanic]!;
      const q = Math.floor(v / k);
      if (q === 0) return `${v} קטן מ-${k}, אז הוא לא בלוח ה-${k}.`;
      return `${v} לא בלוח ה-${k}: ${k}×${q}=${k * q}, ואחריו ${k}×${q + 1}=${k * (q + 1)}.`;
    }
  }
}

export function explainValve(open: number, v: number): string {
  return `${open} + ${v} = ${open + v}, ולא 100. ל-${open} צריך להוסיף ${VALVE_SUM - open}.`;
}
