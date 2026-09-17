import { Volume2, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import type { WordLevel } from '../types';
import { spriteUrl } from '../data/sprites';
import { canSpeak, speak } from '../audio';

/**
 * הרמז. ברמה 1 מוצגת גם תמונת הפריט — ילדה בת חמש מזהה תמונה הרבה
 * לפני שהיא קוראת משפט, וההקראה משלימה את מה שהיא עוד לא קוראת.
 */
export function ClueBar({
  level,
  onHint,
  hintDisabled,
}: {
  level: WordLevel;
  onHint: () => void;
  hintDisabled: boolean;
}) {
  const narrate = () =>
    speak(level.tier === 1 ? `${level.word}. ${level.clue}` : level.clue);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {level.tier === 1 && (
        <motion.img
          key={level.id}
          src={spriteUrl(level.sprite)}
          alt={level.clue}
          draggable={false}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="h-[9dvh] max-h-24 w-auto shrink-0 drop-shadow-md"
        />
      )}

      <p className="max-w-[46ch] text-center text-[2.5dvh] font-bold leading-tight text-slate-700">
        {level.clue}
      </p>

      <div className="flex shrink-0 gap-1.5">
        {canSpeak() && (
          <button
            type="button"
            onClick={narrate}
            aria-label="הקריאו לי את הרמז"
            className="grid h-11 w-11 place-items-center rounded-full bg-sky-500 text-white shadow-md active:scale-95"
          >
            <Volume2 className="h-6 w-6" />
          </button>
        )}
        <button
          type="button"
          onClick={onHint}
          disabled={hintDisabled}
          aria-label="רמז — חושף אות אחת ועולה כוכב"
          className="grid h-11 w-11 place-items-center rounded-full bg-amber-400 text-amber-950 shadow-md active:scale-95 disabled:opacity-40"
        >
          <Lightbulb className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
