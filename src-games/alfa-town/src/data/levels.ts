import type { Hood, Tier, WordLevel } from '../types';

/**
 * 45 מילים — 15 לכל רמת גיל. **אובייקט אחד לכל מילה, וזה הפרס היחיד.**
 *
 * שני כללים שנובעים מהסבב הראשון ואסור לשבור:
 *  1. כל רמה חייבת לכלול מילים בכל ארבע השכונות. בגרסה הקודמת לרמה 1 הייתה
 *     מילה אחת בלבד בשכונת החלל, וילדה שלא סיימה 22 מילים פשוט לא הגיעה לשם.
 *  2. אין שתי מילים שמצביעות על אותו ספרייט. 45 מילים = 45 אובייקטים שונים.
 *
 * pos — אחוזים בתוך פאנל השכונה. y קובע גם את הגודל (גבוה = רחוק = קטן).
 * המיקומים פרוסים על ~12 סלוטים לשכונה, ומשולבים בין הרמות כדי שגם מי
 * ששיחקה רמה אחת בלבד תקבל פיזור על כל המסך ולא שורה אחת.
 */

type Draft = Omit<WordLevel, 'tier' | 'hood'>;

const w = (
  id: string,
  word: string,
  clue: string,
  sprite: string,
  x: number,
  y: number,
  revealed?: number[],
  alive?: WordLevel['alive'],
): Draft => ({ id, word, clue, sprite, pos: { x, y }, revealed, alive });

const group = (tier: Tier, hood: Hood, items: Draft[]): WordLevel[] =>
  items.map((it) => ({ ...it, tier, hood }));

// ── רמה 1 — גילאי 5-6 ────────────────────────────────────────────────────
// מילים קצרות ומוחשיות. הרמז הוא התמונה עצמה; הטקסט רק מלווה אותה.
const TIER1: WordLevel[] = [
  ...group(1, 'downtown', [
    w('t1-bait', 'בית', 'פה גרים!', 'house', 15, 48, [0, 2]),
    w('t1-gesher', 'גשר', 'עוברים עליו מעל המים', 'bridge', 62, 66, [1, 2]),
    w('t1-kelev', 'כלב', 'עושה האו-האו', 'dog', 38, 84, [0, 2], 'hop'),
    w('t1-panas', 'פנס', 'מאיר את הרחוב בלילה', 'lamp', 85, 48, [0, 2]),
  ]),
  ...group(1, 'park', [
    w('t1-pil', 'פיל', 'יש לו חדק ארוך', 'elephant', 18, 50, [1, 2]),
    w('t1-arye', 'אריה', 'מלך החיות, עם רעמה', 'lion', 45, 68, [0, 2, 3]),
    w('t1-kof', 'קוף', 'מטפס על עצים ואוהב בננה', 'monkey', 72, 50, [1, 2], 'hop'),
    w('t1-etz', 'עץ', 'גבוה, ירוק, עם ענפים', 'tree', 88, 84, [0], 'sway'),
  ]),
  ...group(1, 'shore', [
    w('t1-dag', 'דג', 'שוחה במים', 'fish', 40, 80, [0]),
    w('t1-shemesh', 'שמש', 'צהובה ומחממת ביום', 'sun', 85, 18, [1, 2]),
    w('t1-anan', 'ענן', 'לבן ורך בשמיים', 'cloud', 30, 24, [0, 2], 'sway'),
    w('t1-tzav', 'צב', 'הולך לאט עם שריון', 'turtle', 62, 88, [1]),
  ]),
  ...group(1, 'space', [
    w('t1-yareah', 'ירח', 'מאיר בלילה בשמיים', 'moon', 20, 20, [0, 1], 'orbit'),
    w('t1-til', 'טיל', 'ממריא למעלה עם אש ורעש', 'rocket', 50, 70, [1, 2]),
    w('t1-kochav', 'כוכב', 'מנצנץ בשמיים בלילה', 'star', 80, 18, [0, 2, 3], 'orbit'),
  ]),
];

// ── רמה 2 — גילאי 7-8 ────────────────────────────────────────────────────
// הגדרה עקיפה. כל האותיות חבויות, המקלדת מאותיות המילה + מסיחות.
const TIER2: WordLevel[] = [
  ...group(2, 'downtown', [
    w('t2-rakevet', 'רכבת', 'נוסעת על פסים ומשמיעה טו-טו', 'train', 38, 48, undefined, 'drive'),
    w('t2-mechonit', 'מכונית', 'ארבעה גלגלים, והורים נוהגים בה', 'car', 85, 66, undefined, 'drive'),
    w('t2-ramzor', 'רמזור', 'שלוש עיניים: אדומה, כתומה וירוקה', 'trafficlight', 15, 84),
    w('t2-mizraka', 'מזרקה', 'מתיזה מים למעלה וזורקים בה מטבעות', 'fountain', 62, 84, undefined, 'splash'),
  ]),
  ...group(2, 'park', [
    w('t2-zebra', 'זברה', 'סוס עם פסים שחור-לבן', 'zebra', 45, 50),
    w('t2-parpar', 'פרפר', 'היה זחל, ועכשיו יש לו כנפיים צבעוניות', 'butterfly', 18, 32, undefined, 'sway'),
    w('t2-tzipor', 'ציפור', 'עפה בשמיים ובונה קן', 'bird', 72, 30, undefined, 'sway'),
    w('t2-tzfardea', 'צפרדע', 'ירוקה, קופצת ועושה קווה-קווה', 'frog', 18, 84, undefined, 'hop'),
  ]),
  ...group(2, 'shore', [
    w('t2-sira', 'סירה', 'שטה על המים עם מפרש', 'boat', 62, 50, undefined, 'sway'),
    w('t2-dekel', 'דקל', 'עץ גבוה בלי ענפים, ותמרים בראשו', 'palm', 12, 58, undefined, 'sway'),
    w('t2-mitriya', 'מטרייה', 'פותחים אותה כשיורד גשם', 'umbrella', 38, 62),
    w('t2-balon', 'בלון', 'מנפחים אותו באוויר ובמסיבות הוא עף', 'balloon', 85, 40, undefined, 'sway'),
  ]),
  ...group(2, 'space', [
    w('t2-matos', 'מטוס', 'כנפיים גדולות, ועף בין מדינות', 'plane', 50, 32, undefined, 'drive'),
    w('t2-masok', 'מסוק', 'יש לו מדחף מסתובב למעלה והוא ממריא ישר', 'helicopter', 20, 52),
    w('t2-hayzar', 'חייזר', 'יצור ירוק שאולי חי על כוכב אחר', 'alien', 78, 84, undefined, 'hop'),
  ]),
];

// ── רמה 3 — גילאי 9-10 ───────────────────────────────────────────────────
// חידות והגדרות עשירות. מקלדת עברית מלאה כולל אותיות סופיות.
const TIER3: WordLevel[] = [
  ...group(3, 'downtown', [
    w('t3-binyan', 'בניין', 'מבנה רב-קומתי שבו דירות רבות זו מעל זו', 'apartment', 62, 48),
    w('t3-masait', 'משאית', 'רכב כבד שתפקידו להוביל מטענים', 'truck', 15, 66, undefined, 'drive'),
    w('t3-migdal', 'מגדל', 'מבנה צר וגבוה מאוד, ודגל מתנוסס בראשו', 'tower', 85, 84),
    w('t3-hanut', 'חנות', 'נכנסים אליה עם כסף ויוצאים עם סחורה', 'shop', 38, 66),
  ]),
  ...group(3, 'park', [
    w('t3-kanguru', 'קנגורו', 'נע בקפיצות, ונושא את גורו בכיס שבבטנו', 'kangaroo', 72, 68, undefined, 'hop'),
    w('t3-hamor', 'חמור', 'קרוב משפחה של הסוס, עקשן ובעל אוזניים ארוכות', 'donkey', 18, 68),
    w('t3-pitriya', 'פטרייה', 'צומחת ביער אחרי גשם, וכובעה עגול', 'mushroom', 45, 86),
    w('t3-ohel', 'אוהל', 'בית זמני מבד, שלוקחים לטיול', 'tent', 88, 52),
  ]),
  ...group(3, 'shore', [
    w('t3-shlulit', 'שלולית', 'מים שנשארו על הכביש אחרי הגשם', 'puddle', 18, 88, undefined, 'splash'),
    w('t3-keshet', 'קשת', 'נמתחת בשמיים אחרי הגשם, בשבעה צבעים', 'rainbow', 58, 22),
    w('t3-sela', 'סלע', 'גוש אבן ענק שאי אפשר להזיז', 'rock', 88, 68),
    w('t3-ofanaim', 'אופניים', 'שני גלגלים, דוושות וכידון — ואין להם מנוע', 'bicycle', 40, 44),
  ]),
  ...group(3, 'space', [
    w('t3-lavyan', 'לוויין', 'מקיף את כדור הארץ ומשדר שידורים', 'satellite', 80, 45, undefined, 'orbit'),
    w('t3-astronaut', 'אסטרונאוט', 'אדם בחליפה לבנה שמרחף בחלל', 'astronaut', 22, 84),
    w('t3-maaboret', 'מעבורת', 'חללית שחוזרת לכדור הארץ ונוחתת כמו מטוס', 'shuttle', 52, 50),
  ]),
];

export const LEVELS: WordLevel[] = [...TIER1, ...TIER2, ...TIER3];

export const LEVELS_BY_TIER = (tier: Tier): WordLevel[] =>
  LEVELS.filter((l) => l.tier === tier);

export const levelsIn = (tier: Tier, hood: Hood): WordLevel[] =>
  LEVELS.filter((l) => l.tier === tier && l.hood === hood);

/**
 * השכונות. `map` הוא מרכז האזור על מפת המבט-על, ו-`spread` הרדיוס שבתוכו
 * מפוזרים האובייקטים שנפתחו. המפה היא מפה — המיקום שם אזורי, ובכוונה לא
 * זהה ל-`pos` של מסך המשחק.
 */
export const HOODS: {
  id: Hood;
  label: string;
  emoji: string;
  bg: string;
  map: { x: number; y: number };
  spread: number;
}[] = [
  { id: 'downtown', label: 'מרכז העיר', emoji: '🏙️', bg: 'bg/bg-downtown.webp', map: { x: 50, y: 56 }, spread: 13 },
  { id: 'park', label: 'פארק החיות', emoji: '🦁', bg: 'bg/bg-park.webp', map: { x: 24, y: 28 }, spread: 14 },
  { id: 'shore', label: 'החוף', emoji: '🌊', bg: 'bg/bg-shore.webp', map: { x: 76, y: 81 }, spread: 14 },
  { id: 'space', label: 'מגרש החלל', emoji: '🚀', bg: 'bg/bg-space.webp', map: { x: 80, y: 24 }, spread: 12 },
];

export const HOOD_BY_ID = new Map(HOODS.map((h) => [h.id, h]));

/**
 * מיקום פריט על מפת העיר — נגזר מהשכונה ומהאינדקס, ולא נשמר בדאטה.
 * ספירלה קצרה סביב מרכז האזור: דטרמיניסטי, תמיד בתוך האזור, ואפס תחזוקה.
 */
export function mapSpot(hood: Hood, index: number): { x: number; y: number } {
  const h = HOOD_BY_ID.get(hood)!;
  // מתחילים מהטבעת הראשונה ולא מהמרכז: במרכז יושבת תווית השכונה,
  // ופריט שמונח בדיוק שם מסתתר מאחוריה.
  const ring = Math.floor(index / 6) + 1;
  const step = index % 6;
  const angle = (step / 6) * Math.PI * 2 + ring * 0.7;
  const r = (h.spread * ring) / 2.2;
  return {
    x: Math.round((h.map.x + Math.cos(angle) * r) * 10) / 10,
    y: Math.round((h.map.y + Math.sin(angle) * r * 0.72) * 10) / 10,
  };
}

export const TIER_LABEL: Record<Tier, string> = {
  1: 'גילאי 5-6',
  2: 'גילאי 7-8',
  3: 'גילאי 9-10',
};
