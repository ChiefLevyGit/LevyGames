import { motion } from 'framer-motion'
import { Play, RotateCcw } from 'lucide-react'
import type { CrashCause, GameStatus } from '../types'

interface ControlsProps {
  status: GameStatus
  crashCause: CrashCause | null
  queueEmpty: boolean
  onRun: () => void
  onReset: () => void
}

const CRASH_MESSAGES: Record<CrashCause, string> = {
  wall: '💥 אופס! רובי כמעט נפל מהלוח. תקנו את התוכנית!',
  rock: '🪨 בום! רובי התנגש בסלע. צריך לעקוף אותו!',
  animal: '🙀 חיה מפחידה! רובי נבהל — חפשו דרך אחרת!',
  pit: '🕳️ אויש! רובי נפל לבור. אסור לדרוך עליו!',
}

const STATUS_MESSAGES: Partial<Record<GameStatus, { text: string; className: string }>> = {
  running: { text: '🤖 רובי בדרך…', className: 'bg-sky-100 text-sky-800' },
  missed: {
    text: '🔋 התוכנית נגמרה, אבל רובי לא הגיע לסוללה. אולי חסרה פקודה?',
    className: 'bg-amber-100 text-amber-800',
  },
}

export function Controls({ status, crashCause, queueEmpty, onRun, onReset }: ControlsProps) {
  const message =
    status === 'crashed'
      ? {
          text: CRASH_MESSAGES[crashCause ?? 'wall'],
          className: 'bg-rose-100 text-rose-700',
        }
      : STATUS_MESSAGES[status]
  const running = status === 'running'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center gap-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={onRun}
          disabled={running || queueEmpty}
          className="flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-2 text-xl font-extrabold text-white shadow-lg shadow-emerald-600/40 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="size-6 fill-white" />
          הפעל!
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={onReset}
          className="flex min-h-12 items-center gap-2 rounded-2xl bg-orange-400 px-5 py-2 text-lg font-bold text-white shadow-lg shadow-orange-500/40 transition-colors hover:bg-orange-300"
        >
          <RotateCcw className="size-5" />
          מהתחלה
        </motion.button>
      </div>

      {message && (
        <motion.p
          key={status}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`rounded-2xl p-2 text-center text-base font-bold ${message.className}`}
          role="status"
        >
          {message.text}
        </motion.p>
      )}
    </div>
  )
}
