import { AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import levelsData from './levels.json'
import type { LevelConfig } from './types'
import { useGameEngine } from './hooks/useGameEngine'
import { CommandPalette } from './components/CommandPalette'
import { CommandQueue } from './components/CommandQueue'
import { GameBoard } from './components/GameBoard'
import { Controls } from './components/Controls'
import { WinOverlay } from './components/WinOverlay'

const LEVELS = levelsData.levels as LevelConfig[]

export default function App() {
  const game = useGameEngine(LEVELS)
  const isLastLevel = game.levelIndex === game.levelCount - 1

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-indigo-100 to-violet-200 text-slate-900">
      <div className="mx-auto max-w-6xl p-3 sm:p-4">
        <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-indigo-900 sm:text-2xl">
              🤖 מבוך הפקודות
            </h1>
            <a
              href="../../index.html"
              className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-indigo-700 shadow transition hover:bg-white"
            >
              🎮 לכל המשחקים
            </a>
          </div>

          <nav aria-label="בחירת שלב" className="flex flex-wrap items-center gap-1.5">
            {LEVELS.map((lvl, index) => {
              const done = game.completedLevels.includes(lvl.id)
              const active = index === game.levelIndex
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => game.selectLevel(index)}
                  aria-current={active ? 'true' : undefined}
                  className={`relative grid size-9 place-items-center rounded-xl text-base font-extrabold shadow transition ${
                    active
                      ? 'scale-110 bg-indigo-600 text-white'
                      : 'bg-white/80 text-indigo-700 hover:bg-white'
                  }`}
                >
                  {index + 1}
                  {done && (
                    <span className="absolute -top-1.5 -end-1.5 grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-3.5" strokeWidth={4} />
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </header>

        <div className="mb-2 rounded-2xl bg-white/60 px-4 py-1.5 backdrop-blur">
          <p className="text-sm font-bold text-indigo-800">
            שלב {game.levelIndex + 1}: {game.level.name}
            <span className="mx-2 font-medium text-indigo-600">💡 {game.level.hint}</span>
          </p>
        </div>

        {/* ב-RTL העמודה הראשונה יושבת בצד ימין (start): הפקודות והתוכנית.
            במובייל הלוח מוצג ראשון כדי שהילדים יראו קודם את המבוך. */}
        <main className="flex flex-col-reverse gap-3 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-3 lg:w-72 lg:shrink-0">
            <CommandPalette
              onAdd={game.addCommand}
              disabled={game.status === 'running'}
              queueFull={game.queue.length >= game.level.maxCommands}
            />
            <CommandQueue
              queue={game.queue}
              maxCommands={game.level.maxCommands}
              currentStep={game.currentStep}
              running={game.status === 'running'}
              onRemove={game.removeCommand}
              onClear={game.clearQueue}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <GameBoard
              level={game.level}
              robot={game.robot}
              collectedStars={game.collectedStars}
              status={game.status}
              crashCause={game.crashCause}
            />
            <Controls
              status={game.status}
              crashCause={game.crashCause}
              queueEmpty={game.queue.length === 0}
              onRun={game.run}
              onReset={game.reset}
            />
          </div>
        </main>
      </div>

      <AnimatePresence>
        {game.status === 'won' && (
          <WinOverlay
            starsCollected={game.collectedStars.size}
            starsTotal={game.level.stars.length}
            isLastLevel={isLastLevel}
            onNextLevel={game.nextLevel}
            onReplay={game.reset}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
