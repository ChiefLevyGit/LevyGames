// לוח הקומות לכל מסלול. הקושי עצמו נקבע ב-generate.js לפי מסלול + מספר קומה.
// מקור האמת לעקומת הקושי: Design.info/math-tower-gdd.md
//
// קומות 1-12 זהות בשני המסלולים. מסלול "קטנה" ממשיך ל-36: ארבעה "אגפים" של
// 6 קומות, וכל אגף נגמר בקומת בוס עם כל המכונות (18, 24, 30, 36).

const BASE = [
  ['scale', 'scale'],
  ['scale', 'pipes'],
  ['pipes', 'scale', 'scale'],
  ['gears', 'scale'],
  ['gears', 'pipes'],
  ['gears', 'scale', 'pipes'],
  ['shapes', 'scale'],
  ['shapes', 'gears'],
  ['shapes', 'pipes', 'gears'],
  ['scale', 'gears', 'shapes'],
  ['pipes', 'shapes', 'scale'],
  ['scale', 'pipes', 'gears', 'shapes'],
];

const LITTLE_EXTRA = [
  // אגף 1 (13-18): סכומים עד 14, ספירה עד 30, חלוקה לשניים עד 20
  ['gears', 'scale'],
  ['pipes', 'gears'],
  ['scale', 'scale'],
  ['shapes', 'scale'],
  ['gears', 'pipes', 'scale'],
  ['scale', 'gears', 'pipes', 'shapes'], // בוס
  // אגף 2 (19-24): חיבור עד 16, השלמה, ספירה בקפיצות עד 100, חלוקה ל-3
  ['scale', 'gears'],
  ['pipes', 'scale'],
  ['shapes', 'gears', 'scale'],
  ['gears', 'pipes'],
  ['scale', 'scale', 'shapes'],
  ['pipes', 'scale', 'gears', 'shapes'], // בוס
  // אגף 3 (25-30): חיבור עד 20, שלושה מחוברים, ספירה לאחור, חלוקה ל-4
  ['gears', 'scale'],
  ['scale', 'pipes'],
  ['shapes', 'gears'],
  ['scale', 'shapes', 'pipes'],
  ['gears', 'scale', 'scale'],
  ['shapes', 'scale', 'pipes', 'gears'], // בוס
  // אגף 4 (31-36): חילוק עד 20 (מחלק עד 10), הכול בערבוב
  ['scale', 'gears'],
  ['pipes', 'scale', 'shapes'],
  ['gears', 'scale', 'pipes'],
  ['shapes', 'scale', 'gears'],
  ['scale', 'pipes', 'gears', 'shapes'],
  ['scale', 'gears', 'pipes', 'shapes'], // בוס סופי (4 מכונות: 5 כפתורים לא נכנסים בכותרת בטלפון)
];

export const FLOORS_BY_TRACK = {
  little: [...BASE, ...LITTLE_EXTRA],
  g3: BASE,
};

export const floorsOf = (track) => FLOORS_BY_TRACK[track];
export const totalOf = (track) => FLOORS_BY_TRACK[track].length;

// קומות ציון דרך (חגיגה גדולה יותר): סוף כל אגף
export const MILESTONES = { little: [12, 18, 24, 30, 36], g3: [12] };

export const TRACKS = {
  little: { id: 'little', name: 'קטנה', icon: '🐣', grade: 'לפני כיתה א\'' },
  g3: { id: 'g3', name: 'גדולה', icon: '🚀', grade: 'כיתה ג\'' },
};

export const MACHINE_META = {
  scale: { icon: '⚖️', name: 'מאזניים' },
  pipes: { icon: '💧', name: 'צינורות' },
  gears: { icon: '⚙️', name: 'גלגלי שיניים' },
  shapes: { icon: '🔷', name: 'מנעול צורות' },
};
