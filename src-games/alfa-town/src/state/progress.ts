import type { SavedProgress, Tier } from '../types';
import { LEVELS } from '../data/levels';

/**
 * שכבת השמירה.
 *
 * בתוך הפורטל השמירה עוברת דרך `js/storage.js` (בגשר `js/levygames-bridge.js`)
 * ומתויגת לפרופיל שמשחקת כרגע — זה חוק ראשון ב-CLAUDE.md של הפורטל.
 * כשהמשחק רץ לבד (dev / preview) הגשר לא קיים, ואז נופלים ל-localStorage
 * כדי שאפשר יהיה לפתח ולבדוק. אותה תבנית בדיוק כמו ב-code-a-bot.
 *
 * כל הפונקציות אסינכרוניות בכוונה — כך שהחלפת המימוש לסנכרון בענן
 * לא תיגע במשחק.
 */

// v2: השדה `decor` של הצמיחה-לפי-אות ירד, ורשימת המילים הצטמצמה ל-45.
// שמירת v1 לא נטענת — היא מכילה מזהי מילים שכבר לא קיימים.
const STORE_NS = 'alfaTown.v2';
export const GAME_ID = 'alfa-town'; // חייב להיות זהה ל-id ב-js/games-data.js
const MUTE_KEY = 'sound.muted';     // גלובלי: העדפת מכשיר, לא של הפרופיל
const FALLBACK_KEY = 'alfatown:v2';
const FALLBACK_MUTE = 'alfatown:muted';

type LevyStorage = {
  read: (ns: string, fallback?: unknown) => Promise<unknown>;
  write: (ns: string, data: unknown) => Promise<unknown>;
  readGlobal: (key: string, fallback?: unknown) => Promise<unknown>;
  writeGlobal: (key: string, data: unknown) => Promise<unknown>;
  reportProgress: (gameId: string, record: Record<string, unknown>) => Promise<unknown>;
};

type BridgeWindow = {
  LevyGames?: { ready?: Promise<{ storage?: LevyStorage } | null> };
};

/** שכבת האחסון של הפורטל, או null כשהמשחק רץ לבד. */
async function portal(): Promise<LevyStorage | null> {
  const bridge = (window as unknown as BridgeWindow).LevyGames;
  if (!bridge?.ready) return null;
  try {
    return (await bridge.ready)?.storage ?? null;
  } catch {
    return null;
  }
}

export const EMPTY: SavedProgress = {
  v: 2,
  tier: 1,
  solved: [],
  stars: {},
};

const KNOWN_IDS = new Set(LEVELS.map((l) => l.id));

/** הוולידציה היא של המשחק, לא של שכבת האחסון. */
function sane(raw: unknown): SavedProgress {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const p = raw as Partial<SavedProgress>;
  if (p.v !== 2) return { ...EMPTY };
  const tier = ([1, 2, 3] as Tier[]).includes(p.tier as Tier) ? (p.tier as Tier) : 1;
  // סינון מזהים שלא קיימים: מילה שהוסרה ממאגר לא תשאיר אובייקט רפאים בעיר.
  const solved = Array.isArray(p.solved)
    ? p.solved.filter((x): x is string => typeof x === 'string' && KNOWN_IDS.has(x))
    : [];
  const stars: SavedProgress['stars'] = {};
  if (p.stars && typeof p.stars === 'object') {
    for (const [id, n] of Object.entries(p.stars)) {
      if (KNOWN_IDS.has(id) && (n === 1 || n === 2 || n === 3)) stars[id] = n;
    }
  }
  return { v: 2, tier, solved, stars };
}

export interface ProgressStore {
  load(): Promise<SavedProgress>;
  save(p: SavedProgress, total: number): Promise<void>;
  loadMuted(): Promise<boolean>;
  saveMuted(v: boolean): Promise<void>;
}

export const store: ProgressStore = {
  async load() {
    const s = await portal();
    if (s) return sane(await s.read(STORE_NS, null));
    try {
      return sane(JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? 'null'));
    } catch {
      return { ...EMPTY };
    }
  },

  async save(p, total) {
    const s = await portal();
    if (s) {
      await s.write(STORE_NS, p);
      // דיווח ההתקדמות הוא נגזרת של השמירה — ולכן הוא כאן, באותו מקום בדיוק.
      await s.reportProgress(GAME_ID, { kind: 'levels', done: p.solved.length, total });
      return;
    }
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(p));
    } catch {
      /* מצב פרטי / אחסון מלא — המשחק ממשיך, פשוט בלי שמירה */
    }
  },

  async loadMuted() {
    const s = await portal();
    if (s) return (await s.readGlobal(MUTE_KEY, false)) === true;
    return localStorage.getItem(FALLBACK_MUTE) === '1';
  },

  async saveMuted(v) {
    const s = await portal();
    if (s) {
      await s.writeGlobal(MUTE_KEY, v);
      return;
    }
    try {
      localStorage.setItem(FALLBACK_MUTE, v ? '1' : '0');
    } catch {
      /* ראה למעלה */
    }
  },
};
