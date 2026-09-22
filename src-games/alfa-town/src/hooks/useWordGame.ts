import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CityObject, Hood, SavedProgress, Status, Tier, WordLevel } from '../types';
import { LEVELS, levelsIn, wordsInHood, HOODS } from '../data/levels';
import { OBJECTS, WORDS_PER_PRIZE, objectsIn } from '../data/objects';
import { baseOf, buildKeyboard, lettersMatch, taughtFinal } from '../hebrew';
import { store, EMPTY } from '../state/progress';
import * as sfx from '../audio';

export type KeyState = 'idle' | 'correct' | 'wrong';

/** משך רצף הנחיתה לפני שכרטיס הסיכום נכנס. זה הפרס — נותנים לו לנשום. */
export const LANDING_MS = 1750;

/** 0-1 טעויות = 3 כוכבים, 2-3 = 2, מעבר לזה = 1. כל רמז מוריד כוכב. */
function starsFor(mistakes: number, hints: number): 1 | 2 | 3 {
  const base = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
  return Math.max(1, base - hints) as 1 | 2 | 3;
}

const firstUnsolved = (pool: WordLevel[], solved: Set<string>) =>
  pool.find((l) => !solved.has(l.id))?.id ?? null;

/** כמה מילים נפתרו בשכונה, מכל הרמות. הבסיס לכל חשבון הפרסים. */
const solvedCountIn = (hood: Hood, solved: Set<string>) =>
  wordsInHood(hood).filter((l) => solved.has(l.id)).length;

/** כמה אובייקטים נפתחו בשכונה — נגזר, לא נשמר. */
const earnedIn = (hood: Hood, solved: Set<string>) =>
  Math.min(
    Math.floor(solvedCountIn(hood, solved) / WORDS_PER_PRIZE),
    objectsIn(hood).length,
  );

export function useWordGame() {
  // הקריאה מהאחסון אסינכרונית (היא עוברת דרך שכבת הפרופילים של הפורטל),
  // ולכן מתחילים ריק ומתמלאים כשהיא חוזרת. אסור לשמור לפני שהיא חזרה —
  // אחרת השמירה הראשונה תדרוס התקדמות קיימת בעיר ריקה.
  const [saved, setSaved] = useState<SavedProgress>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [tier, setTierState] = useState<Tier>(1);
  const [hood, setHoodState] = useState<Hood>('downtown');

  const solvedSet = useMemo(() => new Set(saved.solved), [saved.solved]);
  const pool = useMemo(() => levelsIn(tier, hood), [tier, hood]);

  /**
   * המילה הנוכחית מוחזקת ב-state ולא נגזרת מ-`solved`: אחרת ברגע שמילה
   * נפתרת היא יוצאת מהמאגר, המילה הבאה נכנסת מיד, ורצף הנחיתה וכרטיס
   * הסיכום לא מספיקים להופיע. `null` = נמצאים במפה.
   */
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [found, setFound] = useState<Set<number>>(new Set());
  const [keyStates, setKeyStates] = useState<Record<string, KeyState>>({});
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [status, setStatus] = useState<Status>('playing');
  const [finalLesson, setFinalLesson] = useState<string | null>(null);
  /** האובייקט שנוחת ממש עכשיו — null כשהמילה לא הספיקה לפרס. */
  const [landing, setLanding] = useState<CityObject | null>(null);

  const lessonTimer = useRef<number | undefined>(undefined);
  const landTimer = useRef<number | undefined>(undefined);

  const level = useMemo(
    () => pool.find((l) => l.id === currentId) ?? null,
    [pool, currentId],
  );

  useEffect(() => () => {
    window.clearTimeout(lessonTimer.current);
    window.clearTimeout(landTimer.current);
  }, []);

  useEffect(() => {
    let alive = true;
    void store.load().then((p) => {
      if (!alive) return;
      setSaved(p);
      setTierState(p.tier);
      setHydrated(true);
    });
    return () => { alive = false; };
  }, []);

  // איפוס מצב בכל מעבר למילה אחרת
  useEffect(() => {
    setFound(new Set());
    setKeyStates({});
    setMistakes(0);
    setHints(0);
    setFinalLesson(null);
    setLanding(null);
    setStatus(currentId ? 'playing' : 'done');
  }, [currentId]);

  const persist = useCallback(
    (next: SavedProgress) => {
      setSaved(next);
      if (hydrated) void store.save(next, LEVELS.length);
    },
    [hydrated],
  );

  const keyboard = useMemo(
    () => (level ? buildKeyboard(level.word, level.tier, level.revealed ?? []) : []),
    [level],
  );

  /** משבצות המילה בסדר לוגי — אינדקס 0 הוא האות הראשונה (מימין ב-RTL). */
  const slots = useMemo(() => {
    if (!level) return [];
    return [...level.word].map((ch, i) => ({
      char: ch,
      shown: level.revealed?.includes(i) === true || found.has(i),
    }));
  }, [level, found]);

  // ── חשבון הפרסים ───────────────────────────────────────────────────────
  const earnedHere = earnedIn(hood, solvedSet);
  const hoodObjects = useMemo(() => objectsIn(hood), [hood]);
  /** האובייקט שעובדים עליו עכשיו — מה שמוצג במד. */
  const nextObject: CityObject | null = hoodObjects[earnedHere] ?? null;
  /** כמה מילים כבר נאספו לקראת הפרס הבא (0..2). */
  const meterFilled = nextObject
    ? solvedCountIn(hood, solvedSet) % WORDS_PER_PRIZE
    : WORDS_PER_PRIZE;

  /** כל האובייקטים שנפתחו בכל השכונות — אלה שמצוירים בעיר ובמפה. */
  const unlockedObjects = useMemo(() => {
    const out: CityObject[] = [];
    for (const h of HOODS) {
      const n = earnedIn(h.id, solvedSet);
      out.push(...objectsIn(h.id).slice(0, n));
    }
    return out;
  }, [solvedSet]);

  const press = useCallback(
    (letter: string) => {
      if (!level || status !== 'playing') return;
      const key = baseOf(letter);
      if (keyStates[key]) return; // כבר נלחץ — נכון או שגוי

      const hits: number[] = [];
      [...level.word].forEach((ch, i) => {
        if (!found.has(i) && !level.revealed?.includes(i) && lettersMatch(letter, ch)) hits.push(i);
      });

      if (hits.length === 0) {
        // אין עונש: המקש רוטט, מתעמעם, וממשיכים.
        setKeyStates((s) => ({ ...s, [key]: 'wrong' }));
        setMistakes((m) => m + 1);
        sfx.letterWrong();
        return;
      }

      setKeyStates((s) => ({ ...s, [key]: 'correct' }));
      const nextFound = new Set([...found, ...hits]);
      setFound(nextFound);

      // אות סופית: הלחיצה על הצורה הרגילה מתקבלת, ומסבירים מה קרה.
      const taughtAt = hits.find((i) => taughtFinal(letter, level.word[i]));
      if (taughtAt !== undefined) {
        setFinalLesson(level.word[taughtAt]);
        sfx.finalLetter();
        window.clearTimeout(lessonTimer.current);
        lessonTimer.current = window.setTimeout(() => setFinalLesson(null), 2800);
      } else {
        sfx.letterRight();
      }

      const complete = [...level.word].every(
        (_, i) => nextFound.has(i) || level.revealed?.includes(i) === true,
      );
      if (!complete) return;

      // ── המילה הושלמה ────────────────────────────────────────────────
      const nextSolved = saved.solved.includes(level.id)
        ? saved.solved
        : [...saved.solved, level.id];
      const nextSet = new Set(nextSolved);

      persist({
        ...saved,
        solved: nextSolved,
        stars: { ...saved.stars, [level.id]: starsFor(mistakes, hints) },
      });

      // אובייקט נכנס לעיר רק כשהמד נסגר — לא בכל מילה.
      const before = earnedIn(hood, solvedSet);
      const after = earnedIn(hood, nextSet);
      const prize = after > before ? hoodObjects[after - 1] ?? null : null;

      sfx.wordDone();
      const step = (solvedCountIn(hood, nextSet) % WORDS_PER_PRIZE) || WORDS_PER_PRIZE;
      window.setTimeout(() => sfx.meterTick(step as 1 | 2 | 3), 220);

      if (!prize) {
        setStatus('won');
        return;
      }

      setLanding(prize);
      setStatus('landing');
      window.setTimeout(sfx.prizeFall, 120);
      window.setTimeout(sfx.prizeLand, 790);
      window.setTimeout(sfx.prizeFanfare, 900);
      window.clearTimeout(landTimer.current);
      landTimer.current = window.setTimeout(() => setStatus('won'), LANDING_MS);
    },
    [level, status, keyStates, found, mistakes, hints, saved, solvedSet, hood, hoodObjects, persist],
  );

  /** חושף אות אחת שעוד לא נמצאה, במחיר כוכב. */
  const hint = useCallback(() => {
    if (!level || status !== 'playing') return;
    const idx = [...level.word].findIndex(
      (_, i) => !found.has(i) && !level.revealed?.includes(i),
    );
    if (idx < 0) return;
    setHints((h) => h + 1);
    sfx.hintSparkle();
    press(level.word[idx]);
  }, [level, status, found, press]);

  /** נגיעה במסך מקצרת את רצף הנחיתה למי שכבר ראתה אותו מספיק פעמים. */
  const skipLanding = useCallback(() => {
    if (status !== 'landing') return;
    window.clearTimeout(landTimer.current);
    setStatus('won');
  }, [status]);

  const next = useCallback(() => {
    setCurrentId(firstUnsolved(pool, new Set(saved.solved)));
  }, [pool, saved.solved]);

  /** שיחוק מחדש של מילה שכבר נפתרה — לא מוחק אותה מהעיר. */
  const replay = useCallback(() => {
    setFound(new Set());
    setKeyStates({});
    setMistakes(0);
    setHints(0);
    setLanding(null);
    setStatus('playing');
  }, []);

  /** כניסה לשכונה מהמפה. */
  const enterHood = useCallback(
    (h: Hood, t: Tier = tier) => {
      setHoodState(h);
      setTierState(t);
      setCurrentId(firstUnsolved(levelsIn(t, h), new Set(saved.solved)));
    },
    [tier, saved.solved],
  );

  const setTier = useCallback(
    (t: Tier) => {
      setTierState(t);
      persist({ ...saved, tier: t });
    },
    [saved, persist],
  );

  /** חזרה למפה. */
  const leaveHood = useCallback(() => {
    window.clearTimeout(landTimer.current);
    setCurrentId(null);
    setLanding(null);
  }, []);

  /** תמונת המצב של שכונה — מה שמפת העיר ופאנל האוסף צריכים. */
  const hoodStatus = useCallback(
    (h: Hood) => {
      const all = objectsIn(h);
      const earned = earnedIn(h, solvedSet);
      const inTier = levelsIn(tier, h);
      return {
        objects: all,
        earned,
        found: all.slice(0, earned),
        nextObject: all[earned] ?? null,
        meter: all[earned] ? solvedCountIn(h, solvedSet) % WORDS_PER_PRIZE : WORDS_PER_PRIZE,
        wordsDone: inTier.filter((l) => solvedSet.has(l.id)).length,
        wordsTotal: inTier.length,
      };
    },
    [solvedSet, tier],
  );

  return {
    hydrated,
    tier, setTier,
    hood, enterHood, leaveHood,
    level, slots, keyboard, keyStates,
    mistakes, hints, status, finalLesson, landing,
    stars: status === 'landing' || status === 'won' ? starsFor(mistakes, hints) : 0,
    press, hint, next, replay, skipLanding,
    unlockedObjects, allStars: saved.stars, hoodStatus,
    nextObject, meterFilled, wordsPerPrize: WORDS_PER_PRIZE,
    solvedInHood: pool.filter((l) => solvedSet.has(l.id)).length,
    hoodTotal: pool.length,
    totalSolved: saved.solved.length,
    totalWords: LEVELS.length,
    totalObjects: OBJECTS.length,
    earnedObjects: unlockedObjects.length,
  };
}
