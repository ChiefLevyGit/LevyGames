import { motion } from 'framer-motion';
import type { CityObject } from '../types';
import { spriteUrl, SPRITE_BY_ID } from '../data/sprites';

/**
 * מד הפרס — המטרה שהילדה עובדת אליה.
 *
 * שלוש משבצות שמתמלאות בכל מילה שנפתרת בשכונה, ולידן **האובייקט הבא גלוי**.
 * פרס מוסתר מעורר סקרנות אבל לא מניע מאמץ; ילדה שרואה שהאריה במרחק שתי
 * מילים תתאמץ בשבילו.
 */
export function PrizeMeter({
  next, filled, total,
}: {
  next: CityObject | null;
  filled: number;
  total: number;
}) {
  if (!next) {
    return (
      <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
        השכונה הושלמה! 🎉
      </span>
    );
  }

  const label = SPRITE_BY_ID.get(next.sprite)?.label ?? '';
  const left = total - filled;

  return (
    <div
      className="flex items-center gap-2 rounded-full bg-white/85 py-1 pe-2 ps-3 shadow-sm"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={filled}
      aria-label={`עוד ${left} מילים ל${label}`}
    >
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <motion.span
            key={i}
            className={`block h-3 w-3 rounded-full ${
              i < filled ? 'bg-amber-400' : 'bg-slate-300'
            }`}
            animate={i === filled - 1 ? { scale: [1, 1.6, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-slate-500" aria-hidden>←</span>
      <motion.img
        src={spriteUrl(next.sprite)}
        alt=""
        aria-hidden
        draggable={false}
        className="h-8 w-8 object-contain"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
