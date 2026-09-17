import type { Sprite } from '../types';

/**
 * מאגר הספרייטים — נגזר ממה שיש בפועל בתמונות, לא מרשימת הפרומפט.
 * Gemini החזיר גם פריטים שלא נתבקשו (סוס, חמור, פילים בגיליון הטבע) וגם
 * כפילויות. הכפילויות **לא** נכללות כאן: בסבב הראשון הן שימשו כפריטי נוי
 * שצמחו על כל אות נכונה, וזה גם דילל את הפרס וגם מילא את המסך בשני נמרים
 * ושלושה דוכנים. היום אובייקט נכנס לעיר רק כשנפתרת מילה שלמה.
 * נחתך ע"י Design.info/cut-sheets.mjs.
 */
const S = (id: string, file: string, label: string): Sprite => ({ id, file, label });

export const SPRITES: Sprite[] = [
  // ── מבנים ──────────────────────────────────────────────
  S('house', 'sheet-city-1-01.webp', 'בית'),
  S('apartment', 'sheet-city-1-02.webp', 'בניין'),
  S('tower', 'sheet-city-1-03.webp', 'מגדל'),
  S('school', 'sheet-city-1-04.webp', 'בית ספר'),
  S('shop', 'sheet-city-1-05.webp', 'חנות'),
  S('station', 'sheet-city-1-06.webp', 'תחנה'),
  S('bridge', 'sheet-city-1-07.webp', 'גשר'),
  S('fountain', 'sheet-city-1-08.webp', 'מזרקה'),
  S('castle', 'sheet-city-1-09.webp', 'טירה'),

  // ── רחוב ───────────────────────────────────────────────
  S('trafficlight', 'sheet-city-2-01.webp', 'רמזור'),
  S('lamp', 'sheet-city-2-02.webp', 'פנס'),
  S('bench', 'sheet-city-2-03.webp', 'ספסל'),
  S('kiosk', 'sheet-city-2-04.webp', 'דוכן'),
  S('sign', 'sheet-city-2-05.webp', 'שלט'),
  S('bin', 'sheet-city-2-06.webp', 'פח'),
  S('fence', 'sheet-city-2-07.webp', 'גדר'),
  S('clock', 'sheet-city-2-09.webp', 'שעון'),
  S('mailbox', 'sheet-city-2-10.webp', 'תיבת דואר'),

  // ── תחבורה ─────────────────────────────────────────────
  S('train', 'sheet-transport-01.webp', 'רכבת'),
  S('bus', 'sheet-transport-02.webp', 'אוטובוס'),
  S('car', 'sheet-transport-03.webp', 'מכונית'),
  S('truck', 'sheet-transport-04.webp', 'משאית'),
  S('bicycle', 'sheet-transport-06.webp', 'אופניים'),
  S('plane', 'sheet-transport-07.webp', 'מטוס'),
  S('helicopter', 'sheet-transport-09.webp', 'מסוק'),
  S('boat', 'sheet-transport-10.webp', 'סירה'),
  S('hotballoon', 'sheet-transport-11.webp', 'כדור פורח'),

  // ── חיות גדולות ────────────────────────────────────────
  S('lion', 'sheet-animals-1-01.webp', 'אריה'),
  S('elephant', 'sheet-animals-1-02.webp', 'פיל'),
  S('giraffe', 'sheet-animals-1-03.webp', "ג'ירפה"),
  S('horse', 'sheet-animals-1-04.webp', 'סוס'),
  S('monkey', 'sheet-animals-1-05.webp', 'קוף'),
  S('bear', 'sheet-animals-1-06.webp', 'דוב'),
  S('zebra', 'sheet-animals-1-07.webp', 'זברה'),
  S('donkey', 'sheet-animals-1-08.webp', 'חמור'),
  S('kangaroo', 'sheet-animals-1-09.webp', 'קנגורו'),
  S('panda', 'sheet-animals-1-10.webp', 'פנדה'),
  S('tiger', 'sheet-animals-1-11.webp', 'נמר'),

  // ── חיות קטנות ─────────────────────────────────────────
  S('bird', 'sheet-animals-2-01.webp', 'ציפור'),
  S('butterfly', 'sheet-animals-2-02.webp', 'פרפר'),
  S('fish', 'sheet-animals-2-03.webp', 'דג'),
  S('turtle', 'sheet-animals-2-05.webp', 'צב'),
  S('cat', 'sheet-animals-2-06.webp', 'חתול'),
  S('dog', 'sheet-animals-2-07.webp', 'כלב'),
  S('rabbit', 'sheet-animals-2-10.webp', 'ארנב'),
  S('frog', 'sheet-animals-2-12.webp', 'צפרדע'),

  // ── טבע ────────────────────────────────────────────────
  S('tree', 'sheet-nature-01.webp', 'עץ'),
  S('palm', 'sheet-nature-02.webp', 'דקל'),
  S('bush', 'sheet-nature-03.webp', 'שיח'),
  S('flower', 'sheet-nature-05.webp', 'פרח'),
  S('mountain', 'sheet-nature-06.webp', 'הר'),
  S('rock', 'sheet-nature-07.webp', 'סלע'),
  S('cloud', 'sheet-nature-09.webp', 'ענן'),
  S('sun', 'sheet-nature-10.webp', 'שמש'),
  S('moon', 'sheet-nature-11.webp', 'ירח'),

  // ── חלל ────────────────────────────────────────────────
  S('rocket', 'sheet-space-01.webp', 'טיל'),
  S('shuttle', 'sheet-space-02.webp', 'מעבורת'),
  S('satellite', 'sheet-space-03.webp', 'לוויין'),
  S('earth', 'sheet-space-04.webp', 'כדור הארץ'),
  S('astronaut', 'sheet-space-05.webp', 'אסטרונאוט'),
  S('star', 'sheet-space-06.webp', 'כוכב'),
  S('planet', 'sheet-space-07.webp', 'צדק'),
  S('meteor', 'sheet-space-09.webp', 'מטאור'),
  S('spacestation', 'sheet-space-10.webp', 'תחנת חלל'),
  S('alien', 'sheet-space-12.webp', 'חייזר'),

  // ── נוי ואביזרים ───────────────────────────────────────
  S('balloon', 'sheet-decor-01.webp', 'בלון'),
  S('flag', 'sheet-decor-02.webp', 'דגל'),
  S('umbrella', 'sheet-decor-03.webp', 'מטרייה'),
  S('goldstar', 'sheet-decor-04.webp', 'כוכב זהב'),
  S('crate', 'sheet-decor-05.webp', 'ארגז'),
  S('mushroom', 'sheet-decor-06.webp', 'פטרייה'),
  S('rainbow', 'sheet-decor-07.webp', 'קשת'),
  S('stones', 'sheet-decor-08.webp', 'אבן'),
  S('puddle', 'sheet-decor-10.webp', 'שלולית'),
  S('tent', 'sheet-decor-11.webp', 'אוהל'),
];

export const SPRITE_BY_ID = new Map(SPRITES.map((s) => [s.id, s]));

export function spriteUrl(id: string): string {
  const s = SPRITE_BY_ID.get(id);
  return s ? `sprites/${s.file}` : '';
}
