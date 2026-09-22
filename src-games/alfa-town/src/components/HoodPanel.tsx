import { motion } from 'framer-motion';
import { X, Play } from 'lucide-react';
import type { CityObject, Hood } from '../types';
import { HOOD_BY_ID } from '../data/levels';
import { spriteUrl, SPRITE_BY_ID } from '../data/sprites';

export interface HoodStatus {
  objects: CityObject[];
  earned: number;
  found: CityObject[];
  nextObject: CityObject | null;
  meter: number;
  wordsDone: number;
  wordsTotal: number;
}

/**
 * פאנל האוסף של שכונה — כאן רואים **מה התגלה** בשכונה, בגדול ועם שמות.
 *
 * למה פאנל ולא פיזור על המפה: תמונת המפה עמוסה (בתים, יער, עמודי אבן),
 * ועשרה ספרייטים קטנים מעליה הופכים לרעש. כאן לכל פריט יש מקום ושם.
 * מה שטרם נפתח מוצג כצללית אפורה — זה מה שהופך את הפאנל למניע ולא לרשימה.
 */
export function HoodPanel({
  hood, status, onPlay, onClose,
}: {
  hood: Hood;
  status: HoodStatus;
  onPlay: () => void;
  onClose: () => void;
}) {
  const meta = HOOD_BY_ID.get(hood)!;
  const done = status.wordsDone >= status.wordsTotal;

  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/55 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="rounded-t-3xl border-t-4 border-violet-200 bg-white px-4 pb-4 pt-3 shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[2.6dvh] font-black text-violet-800">
            <span aria-hidden>{meta.emoji}</span>
            {meta.label}
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-sm font-bold text-violet-700">
              {status.earned}/{status.objects.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* האוסף: מה שנפתח בצבע, מה שלא — צללית */}
        <div className="flex max-h-[30dvh] flex-wrap items-start justify-center gap-2 overflow-y-auto">
          {status.objects.map((o, i) => {
            const open = i < status.earned;
            const label = SPRITE_BY_ID.get(o.sprite)?.label ?? '';
            return (
              <div key={o.id} className="flex w-[18%] max-w-[88px] flex-col items-center gap-0.5">
                <div
                  className={`grid aspect-square w-full place-items-center rounded-2xl p-1 ${
                    open ? 'bg-amber-50' : 'bg-slate-100'
                  }`}
                >
                  <img
                    src={spriteUrl(o.sprite)}
                    alt={open ? label : 'עדיין לא נפתח'}
                    draggable={false}
                    loading="lazy"
                    className={`h-full w-full object-contain ${
                      open ? '' : 'opacity-25 grayscale'
                    }`}
                  />
                </div>
                <span
                  className={`text-[1.5dvh] font-bold leading-tight ${
                    open ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {open ? label : '?'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-600">
              {done
                ? 'פתרת את כל המילים של השכונה ברמה הזו'
                : `${status.wordsDone}/${status.wordsTotal} מילים ברמה הזו`}
            </p>
            {status.nextObject && (
              <p className="text-sm font-bold text-violet-700">
                עוד {3 - status.meter} מילים ל
                {SPRITE_BY_ID.get(status.nextObject.sprite)?.label}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onPlay}
            autoFocus
            className="flex items-center gap-2 rounded-2xl border-b-4 border-violet-700 bg-violet-500 px-6 py-3 text-lg font-black text-white active:scale-95"
          >
            <Play className="h-5 w-5" />
            שחקי כאן
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
