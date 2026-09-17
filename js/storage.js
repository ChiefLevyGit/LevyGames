// שכבת האחסון של Levy Games. *כל* שמירה באתר עוברת מכאן.
//
// למה: כל משחק כתב פעם ל-localStorage ישירות, עם שם מפתח משלו. ברגע שרוצים
// פרופילים - כל שמירה חייבת להיות מתוייגת "של מי זה", ולכן צריך מקום אחד
// שמרכיב את המפתח. הצורה: levygames.<profileId>.<namespace>
//
// מה גלובלי ומה מתוייג-פרופיל:
//   מתוייג-פרופיל - התקדמות, שיאים, משחק שמור, משימת היום
//   גלובלי        - השתקת סאונד (העדפת מכשיר), רשימת משאלות (משפחתית), הרג'יסטרי
//
// כל הפונקציות async בכוונה, גם כשהמימוש סינכרוני - ראו js/local-store.js.

import { getRaw, getJSON, setJSON, removeRaw, listKeys } from './local-store.js?v=1';
import { getActiveProfile } from './profiles.js?v=1';

const PREFIX = 'levygames';
const MIGRATED_FLAG = 'levygames.migrated.v1';

// אם משחק נפתח ישירות ב-URL לפני שנוצר פרופיל, השמירות נכנסות לדלי הזה.
// המיגרציה ביצירת הפרופיל הראשון גורפת אותו פנימה, כך שכלום לא נאבד.
const GUEST_ID = 'guest';

async function activeId() {
  const profile = await getActiveProfile();
  return profile?.id || GUEST_ID;
}

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

/* ================= מתוייג-פרופיל ================= */

// namespace כולל את גרסת הסכמה של המשחק, למשל 'chess.v1'.
// הגרסה בשם המפתח ולא בתוך המידע - כדי שהוולידציה של המשחק עצמו לא תשתנה.
export async function read(namespace, fallback = null) {
  const id = await activeId();
  return getJSON(`${PREFIX}.${id}.${namespace}`, fallback);
}

// אובייקט מקבל חתימת savedAt אוטומטית; מערך/מספר נשמרים כמו שהם.
// שדות שהמשחק שולח (כולל v משלו) נשמרים בלי שינוי.
export async function write(namespace, data) {
  const id = await activeId();
  const payload = isPlainObject(data) ? { ...data, savedAt: Date.now() } : data;
  return setJSON(`${PREFIX}.${id}.${namespace}`, payload);
}

export async function clear(namespace) {
  const id = await activeId();
  return removeRaw(`${PREFIX}.${id}.${namespace}`);
}

/* ================= גלובלי (העדפות מכשיר) ================= */

export async function readGlobal(key, fallback = null) {
  return getJSON(`${PREFIX}.${key}`, fallback);
}

export async function writeGlobal(key, data) {
  return setJSON(`${PREFIX}.${key}`, data);
}

export async function clearGlobal(key) {
  return removeRaw(`${PREFIX}.${key}`);
}

/* ================= חוזה ההתקדמות ================= */
// כל משחק מדווח אותו רקורד, והפורטל יודע להציג אותו בלי להכיר את המשחק:
//   { kind: 'levels',  done, total }   פס התקדמות
//   { kind: 'score',   best }          שיא
//   { kind: 'session', hasSave }       "יש משחק שמור"
//
// הדיווח הוא *נגזרת* של מה שהמשחק כבר שומר - לא מצב חדש. לקרוא לו באותו
// מקום שבו המשחק שומר, כדי שלא ייווצר מקור אמת שני שיכול להתנתק.

const PROGRESS_NS = 'progress';

export async function reportProgress(gameId, record) {
  if (!gameId || !isPlainObject(record)) return false;
  return write(`${PROGRESS_NS}.${gameId}`, { v: 1, lastPlayed: Date.now(), ...record });
}

export async function readProgress(gameId) {
  return read(`${PROGRESS_NS}.${gameId}`, null);
}

// הפורטל קורא את הכל בקריאה אחת - לא פר כרטיס
export async function readAllProgress() {
  const id = await activeId();
  const prefix = `${PREFIX}.${id}.${PROGRESS_NS}.`;
  const keys = await listKeys(prefix);
  const out = {};
  await Promise.all(keys.map(async (key) => {
    const record = await getJSON(key, null);
    if (record) out[key.slice(prefix.length)] = record;
  }));
  return out;
}

/* ================= מיגרציה חד-פעמית ================= */
// לדניאל ולאופיר יש התקדמות אמיתית בדפדפן מלפני הפרופילים. מעבירים אותה
// לפרופיל הראשון שנוצר, ולא מאבדים כלום.

const LEGACY_KEYS = [
  { from: 'levygames.chess.v1', to: 'chess.v1' },
  { from: 'levygames.tasks.v1', to: 'tasks.v1' },
  { from: 'littleDetectiveProgress', to: 'littleDetective.v1' },
  { from: 'code-a-bot-progress', to: 'codeABot.v1' },
  // siHi היה מספר גלוי ולא JSON - עוטפים אותו בדרך
  { from: 'siHi', to: 'spaceinvaders.v1', wrap: (raw) => ({ hi: Number(raw) || 0 }) },
];

// מפתחות משימת היום הם לפי תאריך, ולכן מיגרציה לפי תחילית
const LEGACY_PREFIXES = [
  { from: 'levygames.dailyMission.done.', to: 'dailyMission.done.' },
];

// הטוטאלים האלה משמשים *רק* לגזירת רקורד התקדמות התחלתי מהשמירות הישנות,
// כדי שהכרטיסים יציגו מצב נכון עוד לפני שנכנסו למשחק. המשחק עצמו מדווח
// טוטאל אמיתי בפעם הבאה ששיחקו בו, ודורס את זה.
const DERIVED_TOTALS = { 'little-detective': 10, 'code-a-bot': 15 };

async function moveKey(fromKey, toKey, wrap) {
  const raw = await getRaw(fromKey); // קריאה גולמית - המידע הישן לא בהכרח JSON
  if (raw === null) return null;
  let value;
  if (wrap) {
    value = wrap(raw);
  } else {
    try { value = JSON.parse(raw); } catch { value = raw; }
  }
  await setJSON(toKey, value);
  await removeRaw(fromKey);
  return value;
}

// גוזר רקורדי התקדמות מהשמירות שהועברו, לפי אותו חוזה של reportProgress
async function deriveProgressFrom(moved, profileId) {
  const put = (gameId, record) => setJSON(
    `${PREFIX}.${profileId}.${PROGRESS_NS}.${gameId}`,
    { v: 1, lastPlayed: Date.now(), ...record, savedAt: Date.now() },
  );

  if (moved['chess.v1']) await put('chess', { kind: 'session', hasSave: true });
  if (moved['tasks.v1']) await put('tasks', { kind: 'session', hasSave: true });

  const detective = moved['littleDetective.v1'];
  if (detective?.solved) {
    await put('little-detective', {
      kind: 'levels',
      done: Object.keys(detective.solved).length,
      total: DERIVED_TOTALS['little-detective'],
    });
  }

  const robot = moved['codeABot.v1'];
  if (Array.isArray(robot) && robot.length) {
    await put('code-a-bot', { kind: 'levels', done: robot.length, total: DERIVED_TOTALS['code-a-bot'] });
  }

  const space = moved['spaceinvaders.v1'];
  if (space?.hi > 0) await put('spaceinvaders', { kind: 'score', best: space.hi });
}

// נקרא פעם אחת, מיד אחרי יצירת הפרופיל הראשון. מוגן בדגל - לא ירוץ שוב.
export async function migrateLegacyData(profileId) {
  if (!profileId) return false;
  const alreadyDone = await getJSON(MIGRATED_FLAG, null);
  if (alreadyDone) return false;

  const moved = {};
  for (const { from, to, wrap } of LEGACY_KEYS) {
    const value = await moveKey(from, `${PREFIX}.${profileId}.${to}`, wrap);
    if (value !== null) moved[to] = value;
  }

  for (const { from, to } of LEGACY_PREFIXES) {
    const keys = await listKeys(from);
    for (const key of keys) {
      await moveKey(key, `${PREFIX}.${profileId}.${to}${key.slice(from.length)}`);
    }
  }

  // שמירות שנוצרו בדלי האורח (משחק שנפתח ישירות ב-URL לפני שהיה פרופיל)
  const guestPrefix = `${PREFIX}.${GUEST_ID}.`;
  for (const key of await listKeys(guestPrefix)) {
    const namespace = key.slice(guestPrefix.length);
    const target = `${PREFIX}.${profileId}.${namespace}`;
    if (await getRaw(target) === null) await moveKey(key, target);
    else await removeRaw(key); // לפרופיל כבר יש מידע אמיתי - הוא מנצח
  }

  await deriveProgressFrom(moved, profileId);
  await setJSON(MIGRATED_FLAG, { v: 1, at: Date.now(), profileId });
  return true;
}
