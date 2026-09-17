import { motion } from 'framer-motion';
import type { Hood, Tier, WordLevel } from '../types';
import { HOODS, TIER_LABEL, mapSpot } from '../data/levels';
import { spriteUrl } from '../data/sprites';

/**
 * מסך הפתיחה: מבט מלא על העיר, בחירת גיל, ובחירת שכונה.
 *
 * כל השכונות פתוחות מההתחלה. בגרסה הקודמת השכונות היו רצף נעול בפועל —
 * רמה 1 הגיעה לחלל רק אחרי 21 מילים, ואלעד פשוט לא הגיע לשם. כאן נוגעים
 * בשכונה ומשחקים בה, והמשחק רק *ממליץ* איפה להמשיך.
 */

const TONE: Record<Tier, string> = {
  1: 'border-emerald-600 bg-emerald-400',
  2: 'border-sky-600 bg-sky-400',
  3: 'border-violet-700 bg-violet-500',
};

export function CityMap({
  tier, onTier, unlocked, progressOf, onEnter,
}: {
  tier: Tier;
  onTier: (t: Tier) => void;
  unlocked: WordLevel[];
  progressOf: (h: Hood) => { done: number; total: number };
  onEnter: (h: Hood) => void;
}) {
  // ההמלצה: השכונה הראשונה שעוד לא הושלמה ברמה הנבחרת.
  const suggested = HOODS.find((h) => {
    const p = progressOf(h.id);
    return p.done < p.total;
  })?.id;

  // אינדקס בתוך השכונה קובע את המיקום על המפה — יציב בין רינדורים.
  const spotOf = (l: WordLevel) => {
    const sameHood = unlocked.filter((u) => u.hood === l.hood);
    return mapSpot(l.hood, sameHood.indexOf(l));
  };

  return (
    // בלי כותרת פנימית: הכותרת של האפליקציה כבר מציגה את השם ואת המונה,
    // ושתי שורות כותרת זו על גבי זו נראו כמו תקלה.
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] gap-2">
      {/* ── המפה ─────────────────────────────────────────────── */}
      <div
        dir="ltr"
        className="relative min-h-0 overflow-hidden rounded-2xl bg-emerald-100 bg-cover bg-center"
        style={{ backgroundImage: 'url(bg/bg-citymap.webp)' }}
      >
        {unlocked.map((l) => {
          const s = spotOf(l);
          return (
            <motion.img
              key={l.id}
              src={spriteUrl(l.sprite)}
              alt={l.word}
              title={l.word}
              draggable={false}
              loading="lazy"
              className="absolute w-[7%] select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
              style={{ left: `${s.x}%`, top: `${s.y}%`, translate: '-50% -80%' }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            />
          );
        })}

        {HOODS.map((h) => {
          const p = progressOf(h.id);
          const done = p.done >= p.total;
          const isSuggested = h.id === suggested;
          return (
            <div
              key={h.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${h.map.x}%`, top: `${h.map.y}%`, zIndex: 20 }}
            >
              {/* ההילה פועמת, לא הכפתור. מטרת לחיצה שזזה היא מטרה שקשה
                  לקלוע אליה — גם לאצבע של בת חמש וגם לבדיקה אוטומטית. */}
              {isSuggested && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-amber-300"
                  animate={{ scale: [1, 1.45, 1], opacity: [0.75, 0, 0.75] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <button
                type="button"
                onClick={() => onEnter(h.id)}
                aria-label={`${h.label} — ${p.done} מתוך ${p.total} מילים`}
                className={[
                  'flex items-center gap-1.5 rounded-full border-b-4 px-3 py-1.5',
                  'text-sm font-black shadow-lg active:scale-95',
                  done
                    ? 'border-emerald-700 bg-emerald-500 text-white'
                    : 'border-white bg-white/95 text-slate-700',
                ].join(' ')}
              >
                <span aria-hidden>{h.emoji}</span>
                <span dir="rtl">{h.label}</span>
                <span className={done ? 'text-emerald-100' : 'text-violet-600'}>
                  {p.done}/{p.total}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── בורר הגיל ────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-center gap-2">
        {([1, 2, 3] as Tier[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTier(t)}
            aria-pressed={tier === t}
            className={[
              'rounded-2xl border-b-4 px-4 py-2.5 text-base font-black text-white active:scale-95',
              TONE[t],
              tier === t ? 'ring-4 ring-amber-300' : 'opacity-70',
            ].join(' ')}
          >
            {TIER_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
