import type { SaveData } from '../types.ts';
import { LEVELS, MAIN_LEVELS, MAIN_TOTAL } from '../config/levels.ts';

/**
 * שכבת השמירה. בתוך הפורטל היא עוברת דרך `js/storage.js` (בגשר
 * `js/levygames-bridge.js`) ומתויגת לפרופיל שמשחקת עכשיו - חוק ראשון ב-CLAUDE.md.
 * כשהמשחק רץ לבד (npm run dev) הגשר לא קיים ונופלים ל-localStorage.
 * אותה תבנית בדיוק כמו alfa-town. הכול אסינכרוני בכוונה.
 */

const STORE_NS = 'cipherRogue.v1';
export const GAME_ID = 'cipher-rogue'; // חייב להיות זהה ל-id ב-js/games-data.js
const MUTE_KEY = 'sound.muted'; // גלובלי: העדפת מכשיר, משותף עם הפורטל
const FALLBACK_KEY = 'cipherrogue:v1';
const FALLBACK_MUTE = 'cipherrogue:muted';

type LevyStorage = {
  read: (ns: string, fallback?: unknown) => Promise<unknown>;
  write: (ns: string, data: unknown) => Promise<unknown>;
  readGlobal: (key: string, fallback?: unknown) => Promise<unknown>;
  writeGlobal: (key: string, data: unknown) => Promise<unknown>;
  reportProgress: (gameId: string, record: Record<string, unknown>) => Promise<unknown>;
};
type BridgeWindow = { LevyGames?: { ready?: Promise<{ storage?: LevyStorage } | null> } };

async function portal(): Promise<LevyStorage | null> {
  const bridge = (window as unknown as BridgeWindow).LevyGames;
  if (!bridge?.ready) return null;
  try {
    return (await bridge.ready)?.storage ?? null;
  } catch {
    return null;
  }
}

export const EMPTY: SaveData = {
  v: 1,
  stars: {},
  tutorialSeen: false,
  finaleSeen: false,
  secretFinaleSeen: false,
};

const KNOWN = new Set(LEVELS.map((l) => String(l.id)));

/** הוולידציה היא של המשחק, לא של שכבת האחסון. */
function sane(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return structuredClone(EMPTY);
  const p = raw as Partial<SaveData>;
  if (p.v !== 1) return structuredClone(EMPTY);
  const stars: Record<string, number> = {};
  if (p.stars && typeof p.stars === 'object') {
    for (const [id, n] of Object.entries(p.stars)) {
      if (KNOWN.has(id) && (n === 1 || n === 2 || n === 3)) stars[id] = n;
    }
  }
  return {
    v: 1,
    stars,
    tutorialSeen: p.tutorialSeen === true,
    finaleSeen: p.finaleSeen === true,
    secretFinaleSeen: p.secretFinaleSeen === true,
  };
}

export const completedMain = (s: SaveData) =>
  MAIN_LEVELS.filter((l) => (s.stars[l.id] ?? 0) > 0).length;

export const mainStars = (s: SaveData) =>
  MAIN_LEVELS.reduce((sum, l) => sum + (s.stars[l.id] ?? 0), 0);

export const store = {
  async load(): Promise<SaveData> {
    const s = await portal();
    if (s) return sane(await s.read(STORE_NS, null));
    try {
      return sane(JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? 'null'));
    } catch {
      return structuredClone(EMPTY);
    }
  },

  async save(data: SaveData): Promise<void> {
    const s = await portal();
    if (s) {
      await s.write(STORE_NS, data);
      // הדיווח הוא נגזרת של השמירה - ולכן הוא כאן, באותו מקום בדיוק (חוק שני).
      // הכספת הסודית היא בונוס ולא נספרת בפס ההתקדמות של הכרטיס.
      await s.reportProgress(GAME_ID, { kind: 'levels', done: completedMain(data), total: MAIN_TOTAL });
      return;
    }
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(data));
    } catch {
      /* מצב פרטי / אחסון מלא - המשחק ממשיך בלי שמירה */
    }
  },

  async loadMuted(): Promise<boolean> {
    const s = await portal();
    if (s) return (await s.readGlobal(MUTE_KEY, false)) === true;
    try {
      return localStorage.getItem(FALLBACK_MUTE) === '1';
    } catch {
      return false;
    }
  },

  async saveMuted(v: boolean): Promise<void> {
    const s = await portal();
    if (s) {
      await s.writeGlobal(MUTE_KEY, v);
      return;
    }
    try {
      localStorage.setItem(FALLBACK_MUTE, v ? '1' : '0');
    } catch {
      /* ראו למעלה */
    }
  },
};
