import { AnimatePresence, motion } from 'framer-motion';

/**
 * משבצות המילה. המערך מגיע בסדר לוגי (אינדקס 0 = האות הראשונה),
 * וה-`dir="rtl"` של המכל הוא מה שמסדר אותן מימין לשמאל — אין היפוך ידני.
 */
export function WordSlots({ slots }: { slots: { char: string; shown: boolean }[] }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div dir="rtl" className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {slots.map((s, i) => (
          <div
            key={i}
            className={[
              'flex items-center justify-center rounded-xl border-b-4 transition-colors',
              'h-[7dvh] min-h-11 w-[7dvh] min-w-11 text-[4.2dvh] font-black leading-none',
              s.shown
                ? 'border-emerald-400 bg-white text-slate-800'
                : 'border-slate-300 bg-white/60 text-transparent',
            ].join(' ')}
          >
            <AnimatePresence mode="popLayout">
              {s.shown && (
                <motion.span
                  key={s.char + i}
                  initial={{ scale: 0.2, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                >
                  {s.char}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * הודעת האות הסופית. מוצגת כטוסט מעל העיר ולא ליד משבצות המילה —
 * שם היא כיסתה את השורה הראשונה של המקלדת.
 */
export function FinalLetterToast({ letter }: { letter: string | null }) {
  return (
    <AnimatePresence>
      {letter && (
        <motion.div
          initial={{ opacity: 0, y: -14, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.9 }}
          className="pointer-events-none absolute inset-x-0 top-[7dvh] z-40 flex justify-center"
        >
          <span className="rounded-full bg-amber-400 px-5 py-2 text-base font-bold text-amber-950 shadow-xl">
            זו אות סופית — {letter} ! בסוף מילה היא משנה צורה
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
