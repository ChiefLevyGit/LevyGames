import { motion } from 'framer-motion';
import type { KeyState } from '../hooks/useWordGame';

/**
 * המקלדת. שלוש רמות, אותו רכיב — ההבדל היחיד הוא המערך שנכנס.
 * אין עונש על טעות: המקש רוטט, מתעמעם, ונשאר גלוי כדי שאפשר יהיה
 * לראות מה כבר נוסה. אין ספירת חיים ואין סיום משחק.
 */
export function HebrewKeyboard({
  rows,
  states,
  onPress,
  disabled,
}: {
  rows: string[][];
  states: Record<string, KeyState>;
  onPress: (letter: string) => void;
  disabled: boolean;
}) {
  // מעט שורות = מקשים גדולים. גם ממלא את המסך וגם נותן מטרה גדולה יותר
  // לאצבע של בת חמש; רמה 3 עם ארבע שורות מתכווצת כדי להיכנס.
  const size =
    rows.length <= 2
      ? 'h-[8.6dvh] min-h-12 w-[8.6dvh] min-w-12 text-[4.6dvh]'
      : rows.length === 3
        ? 'h-[7.2dvh] min-h-11 w-[7.2dvh] min-w-11 text-[3.9dvh]'
        : 'h-[6.2dvh] min-h-10 w-[6.2dvh] min-w-10 text-[3.3dvh]';

  return (
    <div dir="rtl" className="flex flex-col justify-end gap-1.5 sm:gap-2">
      {rows.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1.5 sm:gap-2">
          {row.map((letter) => {
            const state = states[letter] ?? 'idle';
            const wrong = state === 'wrong';
            const correct = state === 'correct';
            return (
              <motion.button
                key={letter}
                type="button"
                disabled={disabled || state !== 'idle'}
                onClick={() => onPress(letter)}
                aria-label={`האות ${letter}`}
                animate={wrong ? { x: [0, -7, 7, -5, 0] } : { x: 0 }}
                transition={{ duration: 0.32 }}
                whileTap={state === 'idle' ? { scale: 0.9 } : undefined}
                className={[
                  'flex items-center justify-center rounded-xl border-b-4 font-black leading-none transition-colors',
                  size,
                  correct
                    ? 'border-emerald-600 bg-emerald-400 text-white'
                    : wrong
                      ? 'border-slate-300 bg-slate-200 text-slate-400 opacity-45'
                      : 'border-violet-400 bg-white text-violet-900 active:bg-violet-50',
                ].join(' ')}
              >
                {letter}
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
