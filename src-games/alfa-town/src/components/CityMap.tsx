import { motion } from 'framer-motion';
import type { Hood, Tier } from '../types';
import { HOODS, TIER_LABEL } from '../data/levels';
import { spriteUrl } from '../data/sprites';
import type { HoodStatus } from './HoodPanel';

/**
 * מסך הפתיחה: מבט מלא על העולם, בחירת גיל, ובחירת שכונה.
 *
 * הרקע הוא `full-town` — אותה תמונה של מסך הכניסה. השבילים שרואים הם חלק
 * מהציור עצמו, ולכן אין כאן קווים מצוירים שצריך להתאים להם צבע.
 *
 * על כל שכונה יושב **צ'יפ אוסף**: שלושת הפריטים האחרונים שנפתחו, חופפים
 * כמו קלפים ביד, ומונה. האוסף המלא נפתח בלחיצה (`HoodPanel`) — פיזור עשרה
 * ספרייטים ישירות על ציור עמוס היה הופך לרעש.
 */

const TONE: Record<Tier, string> = {
  1: 'border-emerald-600 bg-emerald-400',
  2: 'border-sky-600 bg-sky-400',
  3: 'border-violet-700 bg-violet-500',
};

export function CityMap({
  tier, onTier, statusOf, onOpen,
}: {
  tier: Tier;
  onTier: (t: Tier) => void;
  statusOf: (h: Hood) => HoodStatus;
  onOpen: (h: Hood) => void;
}) {
  // ההמלצה: השכונה הראשונה שעוד נשארו בה מילים ברמה הנבחרת.
  const suggested = HOODS.find((h) => {
    const s = statusOf(h.id);
    return s.wordsDone < s.wordsTotal;
  })?.id;

  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] gap-2">
      <div
        dir="ltr"
        className="relative min-h-0 overflow-hidden rounded-2xl bg-sky-100 bg-cover bg-center"
        style={{ backgroundImage: 'url(bg/full-town.webp)' }}
      >
        {HOODS.map((h) => {
          const s = statusOf(h.id);
          const isSuggested = h.id === suggested;
          const chips = s.found.slice(-3);
          return (
            <div
              key={h.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${h.map.x}%`, top: `${h.map.y}%`, zIndex: 20 }}
            >
              {/* ההילה פועמת, לא הכפתור. מטרת לחיצה שזזה קשה לפגיעה —
                  גם לאצבע של בת חמש וגם לבדיקה אוטומטית. */}
              {isSuggested && (
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-amber-300"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <button
                type="button"
                onClick={() => onOpen(h.id)}
                aria-label={`${h.label} — ${s.earned} מתוך ${s.objects.length} פריטים`}
                className="flex flex-col items-center gap-1 rounded-2xl border-b-4 border-white bg-white/95 px-2.5 py-1.5 shadow-lg active:scale-95"
              >
                <span dir="rtl" className="flex items-center gap-1.5 text-sm font-black text-slate-700">
                  <span aria-hidden>{h.emoji}</span>
                  {h.label}
                  <span className="text-violet-600">{s.earned}/{s.objects.length}</span>
                </span>
                {chips.length > 0 && (
                  <span className="flex" aria-hidden>
                    {chips.map((o, i) => (
                      <img
                        key={o.id}
                        src={spriteUrl(o.sprite)}
                        alt=""
                        draggable={false}
                        loading="lazy"
                        className="h-7 w-7 object-contain drop-shadow-sm"
                        style={{ marginInlineStart: i === 0 ? 0 : -8 }}
                      />
                    ))}
                  </span>
                )}
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
