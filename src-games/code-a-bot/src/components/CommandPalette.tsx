import { motion } from 'framer-motion'
import { COMMAND_META, PALETTE_ORDER } from '../commands'
import type { CommandType } from '../types'

interface CommandPaletteProps {
  onAdd: (type: CommandType) => void
  disabled: boolean
  queueFull: boolean
}

export function CommandPalette({ onAdd, disabled, queueFull }: CommandPaletteProps) {
  return (
    <section className="rounded-3xl bg-white/80 p-3 shadow-lg backdrop-blur">
      <h2 className="mb-2 text-base font-bold text-indigo-900">🧩 הפקודות</h2>
      <div className="flex flex-col gap-2">
        {PALETTE_ORDER.map((type) => {
          const meta = COMMAND_META[type]
          return (
            <motion.button
              key={type}
              type="button"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={() => onAdd(type)}
              disabled={disabled || queueFull}
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 py-2 text-lg font-bold text-white shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${meta.buttonClass}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/25 [&_svg]:size-5">
                {meta.icon}
              </span>
              {meta.label}
            </motion.button>
          )
        })}
      </div>
      {queueFull && !disabled && (
        <p className="mt-3 rounded-xl bg-amber-100 p-2 text-center text-sm font-semibold text-amber-800">
          התוכנית מלאה! אפשר למחוק פקודות כדי לפנות מקום 🧹
        </p>
      )}
    </section>
  )
}
