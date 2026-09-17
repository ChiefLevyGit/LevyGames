import { AnimatePresence, motion } from 'framer-motion'
import { BatteryCharging, Bot, Star } from 'lucide-react'
import type { CrashCause, GameStatus, LevelConfig, Obstacle, RobotState } from '../types'
import { posKey } from '../types'

interface GameBoardProps {
  level: LevelConfig
  robot: RobotState
  collectedStars: Set<string>
  status: GameStatus
  crashCause: CrashCause | null
}

const OBSTACLE_LABELS = { rock: 'סלע', animal: 'חיה מפחידה', pit: 'בור' } as const

function obstacleView(o: Obstacle) {
  const kind = o.kind ?? 'rock'
  return {
    kind,
    emoji: kind === 'rock' ? '🪨' : kind === 'pit' ? '🕳️' : (o.emoji ?? '🦁'),
    label: OBSTACLE_LABELS[kind],
  }
}

export function GameBoard({
  level,
  robot,
  collectedStars,
  status,
  crashCause,
}: GameBoardProps) {
  const { cols, rows } = level.grid
  const obstacleByKey = new Map(level.obstacles.map((o) => [posKey(o), obstacleView(o)]))
  const batteryKey = posKey(level.battery)
  const starByKey = new Map(level.stars.map((s) => [posKey(s), s]))

  const cellW = 100 / cols
  const cellH = 100 / rows

  const cells = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = posKey({ x, y })
      const obstacle = obstacleByKey.get(key)
      const isBattery = key === batteryKey
      const star = starByKey.get(key)
      const starVisible = star !== undefined && !collectedStars.has(key)

      cells.push(
        <div key={key} className="p-[3px]">
          <div
            className={`grid h-full w-full place-items-center rounded-xl ${
              obstacle?.kind === 'rock'
                ? 'bg-slate-300'
                : obstacle?.kind === 'pit'
                  ? 'bg-slate-700'
                  : isBattery
                    ? 'bg-emerald-100'
                    : (x + y) % 2 === 0
                      ? 'bg-indigo-50'
                      : 'bg-violet-100'
            }`}
          >
            {obstacle && (
              <span className="text-xl sm:text-2xl" role="img" aria-label={obstacle.label}>
                {obstacle.emoji}
              </span>
            )}
            {isBattery && (
              <BatteryCharging
                className="size-2/3 animate-pulse text-emerald-500"
                strokeWidth={2}
                aria-label="הסוללה — המטרה"
              />
            )}
            <AnimatePresence>
              {starVisible && (
                <motion.span
                  key="star"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  exit={{ scale: 2.2, opacity: 0, rotate: 180 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="grid place-items-center"
                >
                  <Star
                    className="size-6 fill-amber-400 text-amber-500 sm:size-8"
                    aria-label="כוכב לאיסוף"
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>,
      )
    }
  }

  return (
    /*
     * dir="ltr" בכוונה: הלוח הוא מרחב פיזי — קואורדינטת x גדלה תמיד ימינה.
     * בלי זה, CSS Grid בהקשר RTL היה הופך את סדר העמודות ומראה את השלב במראה.
     */
    <div
      dir="ltr"
      className="mx-auto w-full rounded-3xl bg-white/80 p-2 shadow-lg backdrop-blur"
      style={{
        /* מגביל את רוחב הלוח כך שגובהו (לפי יחס התאים) ייכנס במסך אחד עם הכותרות והכפתורים */
        maxWidth: `min(100%, calc((100dvh - 290px) * ${cols / rows}))`,
      }}
    >
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          aspectRatio: `${cols} / ${rows}`,
        }}
      >
        {cells}

        {/* הרובוט — שכבה מעל הרשת, מיקום באחוזים כך שנשאר מדויק בכל גודל מסך */}
        <motion.div
          className="pointer-events-none absolute p-[7px]"
          style={{ width: `${cellW}%`, height: `${cellH}%` }}
          initial={false}
          animate={{
            left: `${robot.x * cellW}%`,
            top: `${robot.y * cellH}%`,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <motion.div
            className="h-full w-full"
            animate={
              status === 'crashed'
                ? crashCause === 'pit'
                  ? { scale: 0.15, opacity: 0.25, rotate: 200 } // נפילה לבור
                  : { x: [0, -7, 7, -5, 5, 0] } // התנגשות
                : { x: 0, scale: 1, opacity: 1, rotate: 0 }
            }
            transition={{ duration: crashCause === 'pit' ? 0.6 : 0.45 }}
          >
            <motion.div
              className="relative grid h-full w-full place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-500/50"
              animate={{
                rotate: robot.heading,
                scale: status === 'won' ? [1, 1.25, 1] : 1,
              }}
              transition={{
                rotate: { type: 'spring', stiffness: 260, damping: 22 },
                scale: { repeat: status === 'won' ? Infinity : 0, duration: 0.7 },
              }}
            >
              {/* משולש קטן שמסמן לאן הרובוט פונה */}
              <span
                aria-hidden
                className="absolute top-[2px] left-1/2 -translate-x-1/2 border-x-[5px] border-b-[7px] border-x-transparent border-b-yellow-300"
              />
              <Bot className="size-2/3 text-white" strokeWidth={2.2} aria-label="רובי הרובוט" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
