import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, X } from 'lucide-react'
import { COMMAND_META } from '../commands'
import type { QueuedCommand } from '../types'

interface CommandQueueProps {
  queue: QueuedCommand[]
  maxCommands: number
  currentStep: number | null
  running: boolean
  onRemove: (uid: number) => void
  onClear: () => void
}

export function CommandQueue({
  queue,
  maxCommands,
  currentStep,
  running,
  onRemove,
  onClear,
}: CommandQueueProps) {
  return (
    <section className="rounded-3xl bg-white/80 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-indigo-900">📋 התוכנית של רובי</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
            <bdi>
              {queue.length}/{maxCommands}
            </bdi>
          </span>
          <button
            type="button"
            onClick={onClear}
            disabled={running || queue.length === 0}
            aria-label="נקה את כל התוכנית"
            className="grid size-9 place-items-center rounded-full bg-rose-100 text-rose-600 transition hover:bg-rose-200 disabled:opacity-30"
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-indigo-200 p-4 text-center text-sm font-semibold text-indigo-400">
          לחצו על הפקודות למעלה
          <br />
          כדי לבנות לרובי תוכנית! 🤖
        </p>
      ) : (
        <ol className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {queue.map((command, index) => {
              const meta = COMMAND_META[command.type]
              const isCurrent = currentStep === index
              return (
                <motion.li
                  key={command.uid}
                  layout
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                    opacity: 1,
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-white shadow-md ${meta.chipClass} ${
                    isCurrent ? 'ring-4 ring-yellow-300' : ''
                  }`}
                >
                  <span className="grid size-6 place-items-center rounded-md bg-white/25 text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="[&_svg]:size-5">{meta.icon}</span>
                  {!running && (
                    <button
                      type="button"
                      onClick={() => onRemove(command.uid)}
                      aria-label={`מחק פקודה ${index + 1} — ${meta.label}`}
                      className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-400"
                    >
                      <X className="size-3" strokeWidth={4} />
                    </button>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}
    </section>
  )
}
