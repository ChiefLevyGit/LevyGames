// לוח הקומות: אילו מכונות יש בכל קומה. זהה בשני המסלולים - הקושי עצמו
// נקבע ב-generate.js לפי מסלול + מספר קומה.
// מקור האמת לעקומת הקושי: Design.info/math-tower-gdd.md

export const FLOORS = [
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

export const TOTAL_FLOORS = FLOORS.length;

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
