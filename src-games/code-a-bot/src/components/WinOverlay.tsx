import { motion } from 'framer-motion'
import { ArrowLeft, RotateCcw, Star, Trophy } from 'lucide-react'

interface WinOverlayProps {
  starsCollected: number
  starsTotal: number
  isLastLevel: boolean
  onNextLevel: () => void
  onReplay: () => void
}

export function WinOverlay({
  starsCollected,
  starsTotal,
  isLastLevel,
  onNextLevel,
  onReplay,
}: WinOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 grid place-items-center bg-indigo-950/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          className="mx-auto mb-2 grid size-20 place-items-center rounded-full bg-amber-100"
        >
          <Trophy className="size-11 text-amber-500" />
        </motion.div>

        <h2 className="text-3xl font-extrabold text-indigo-900">
          {isLastLevel ? 'סיימתם את כל השלבים! 🏆' : 'כל הכבוד! 🎉'}
        </h2>
        <p className="mt-1 text-lg font-semibold text-indigo-600">
          רובי הגיע לסוללה ונטען!
        </p>

        <div className="mt-4 flex justify-center gap-2" aria-label={`נאספו ${starsCollected} מתוך ${starsTotal} כוכבים`}>
          {Array.from({ length: starsTotal }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 300 }}
            >
              <Star
                className={`size-10 ${
                  i < starsCollected
                    ? 'fill-amber-400 text-amber-500'
                    : 'fill-slate-200 text-slate-300'
                }`}
              />
            </motion.span>
          ))}
        </div>
        {starsCollected < starsTotal && (
          <p className="mt-2 text-sm font-semibold text-slate-500">
            אפשר לנסות שוב ולאסוף את כל הכוכבים בדרך!
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {!isLastLevel && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={onNextLevel}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-xl font-extrabold text-white shadow-lg shadow-emerald-600/40 hover:bg-emerald-400"
            >
              לשלב הבא
              {/* חץ "הלאה" — כיוון קריאה, בעברית מצביע שמאלה */}
              <ArrowLeft className="size-6" strokeWidth={3} />
            </motion.button>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={onReplay}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-100 px-6 py-2.5 text-lg font-bold text-indigo-700 hover:bg-indigo-200"
          >
            <RotateCcw className="size-5" />
            עוד פעם
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
