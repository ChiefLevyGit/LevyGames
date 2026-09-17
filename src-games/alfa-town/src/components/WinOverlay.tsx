import { motion } from 'framer-motion';
import { Star, ArrowLeft, RotateCcw, Map } from 'lucide-react';
import type { WordLevel } from '../types';
import { spriteUrl } from '../data/sprites';

/**
 * כרטיס הסיכום — **פס תחתון, לא מודאל ממורכז.**
 * בסבב הקודם הוא היה חלון במרכז המסך שעלה ברגע שהמילה נפתרה, ובדיוק כיסה
 * את האובייקט שזה עתה נחת. הפרס צריך להישאר גלוי, ולכן הכרטיס נכנס מלמטה
 * ויושב באזור המקלדת בלבד.
 */
export function WinBar({
  level, stars, onNext, onReplay, onMap, isLastInHood,
}: {
  level: WordLevel;
  stars: number;
  onNext: () => void;
  onReplay: () => void;
  onMap: () => void;
  isLastInHood: boolean;
}) {
  return (
    <motion.div
      initial={{ y: '110%' }}
      animate={{ y: 0 }}
      exit={{ y: '110%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl border-t-4 border-violet-200 bg-white/97 px-3 pb-3 pt-2.5 shadow-[0_-8px_30px_rgba(76,29,149,0.18)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <img
          src={spriteUrl(level.sprite)}
          alt=""
          className="h-[9dvh] max-h-24 w-auto shrink-0 drop-shadow-md"
        />

        <div className="min-w-0 flex-1">
          <p className="text-[3.4dvh] font-black leading-tight text-slate-800">{level.word}</p>
          <div className="mt-0.5 flex gap-1" aria-label={`${stars} כוכבים`}>
            {[1, 2, 3].map((n) => (
              <motion.span
                key={n}
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.12 * n, type: 'spring', stiffness: 400, damping: 12 }}
              >
                <Star
                  className={`h-7 w-7 ${n <= stars ? 'fill-amber-400 text-amber-500' : 'fill-slate-200 text-slate-300'}`}
                />
              </motion.span>
            ))}
          </div>
          <p className="mt-0.5 text-sm font-bold text-emerald-600">
            {isLastInHood ? 'סיימת את כל השכונה!' : 'העיר שלך גדלה!'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onReplay}
            aria-label="לשחק את המילה הזו שוב"
            className="grid h-12 w-12 place-items-center rounded-2xl border-b-4 border-slate-300 bg-slate-100 text-slate-600 active:scale-95"
          >
            <RotateCcw className="h-6 w-6" />
          </button>

          {isLastInHood ? (
            <button
              type="button"
              onClick={onMap}
              autoFocus
              className="flex items-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-5 py-3 text-lg font-black text-white active:scale-95"
            >
              <Map className="h-5 w-5" />
              למפה
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              autoFocus
              className="flex items-center gap-2 rounded-2xl border-b-4 border-violet-700 bg-violet-500 px-5 py-3 text-lg font-black text-white active:scale-95"
            >
              המילה הבאה
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
