import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Hood, SavedProgress, Status, Tier, WordLevel } from '../types';
import { LEVELS, levelsIn } from '../data/levels';
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
  /** המילה שנוחתת ממש עכשיו — CityPanel מנגן עליה את אנימציית הפרס. */
  const [landingId, setLandingId] = useState<string | null>(null);

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
    setLandingId(null);
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
        sfx.sfxWrong();
        return;
      }

      setKeyStates((s) => ({ ...s, [key]: 'correct' }));
      const nextFound = new Set([...found, ...hits]);
      setFound(nextFound);

      // אות סופית: הלחיצה על הצורה הרגילה מתקבלת, ומסבירים מה קרה.
      const taughtAt = hits.find((i) => taughtFinal(letter, level.word[i]));
      if (taughtAt !== undefined) {
        setFinalLesson(level.word[taughtAt]);
        sfx.sfxTeach();
        window.clearTimeout(lessonTimer.current);
        lessonTimer.current = window.setTimeout(() => setFinalLesson(null), 2800);
      } else {
        sfx.sfxCorrect();
      }

      const complete = [...level.word].every(
        (_, i) => nextFound.has(i) || level.revealed?.includes(i) === true,
      );
      if (!complete) return;

      // מילה שלמה = האובייקט נכנס לעיר. זה הפרס היחיד; אות בודדת לא מוסיפה
      // כלום לעיר, וזו בדיוק התקלה שהסבב הזה מתקן.
      persist({
        ...saved,
        solved: saved.solved.includes(level.id) ? saved.solved : [...saved.solved, level.id],
        stars: { ...saved.stars, [level.id]: starsFor(mistakes, hints) },
      });
      setLandingId(level.id);
      setStatus('landing');
      window.setTimeout(sfx.sfxWin, 420);
      window.clearTimeout(landTimer.current);
      landTimer.current = window.setTimeout(() => setStatus('won'), LANDING_MS);
    },
    [level, status, keyStates, found, mistakes, hints, saved, persist],
  );

  /** חושף אות אחת שעוד לא נמצאה, במחיר כוכב. */
  const hint = useCallback(() => {
    if (!level || status !== 'playing') return;
    const idx = [...level.word].findIndex(
      (_, i) => !found.has(i) && !level.revealed?.includes(i),
    );
    if (idx < 0) return;
    setHints((h) => h + 1);
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
    setLandingId(null);
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
    setLandingId(null);
  }, []);

  /** הפריטים שמצוירים בעיר — כל המילים שנפתרו, מכל הרמות. */
  const unlocked = useMemo(() => LEVELS.filter((l) => solvedSet.has(l.id)), [solvedSet]);

  /** התקדמות לכל שכונה ברמה הנבחרת — מפת העיר מציגה את זה. */
  const hoodProgress = useCallback(
    (h: Hood) => {
      const all = levelsIn(tier, h);
      return { done: all.filter((l) => solvedSet.has(l.id)).length, total: all.length };
    },
    [tier, solvedSet],
  );

  return {
    hydrated,
    tier, setTier,
    hood, enterHood, leaveHood,
    level, slots, keyboard, keyStates,
    mistakes, hints, status, finalLesson, landingId,
    stars: status === 'landing' || status === 'won' ? starsFor(mistakes, hints) : 0,
    press, hint, next, replay, skipLanding,
    unlocked, allStars: saved.stars, hoodProgress,
    solvedInHood: pool.filter((l) => solvedSet.has(l.id)).length,
    hoodTotal: pool.length,
    totalSolved: saved.solved.length,
    totalWords: LEVELS.length,
  };
}
