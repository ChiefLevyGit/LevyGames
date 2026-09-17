import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CommandType,
  CrashCause,
  GameStatus,
  LevelConfig,
  ObstacleKind,
  QueuedCommand,
  RobotState,
} from '../types'
import { DIRECTION_DELTAS, headingToDirection, posKey } from '../types'

/** משך צעד אחד במילישניות — קצב נוח לילדים לעקוב אחרי הביצוע */
const STEP_MS = 650
/** השהיה קצרה אחרי לחיצה על "הפעל" לפני הצעד הראשון */
const RUN_LEAD_IN_MS = 450

/** מפתח הנפילה-חזרה: בפיתוח עצמאי (npm run dev) אין גשר לפורטל */
const PROGRESS_KEY = 'code-a-bot-progress'
/** בתוך הפורטל השמירה עוברת דרך js/storage.js ומתוייגת לפרופיל הפעיל */
const STORE_NS = 'codeABot.v1'
const GAME_ID = 'code-a-bot' // חייב להיות זהה ל-id ב-js/games-data.js

type LevyStorage = {
  read: (ns: string, fallback?: unknown) => Promise<unknown>
  write: (ns: string, data: unknown) => Promise<unknown>
  reportProgress: (gameId: string, record: Record<string, unknown>) => Promise<unknown>
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const startStateOf = (level: LevelConfig): RobotState => ({
  x: level.robotStart.x,
  y: level.robotStart.y,
  heading: level.robotStart.dir * 90,
})

/** מחזיר את שכבת האחסון של הפורטל, או null אם המשחק רץ לבד */
const getPortalStorage = async (): Promise<LevyStorage | null> => {
  const bridge = (window as unknown as { LevyGames?: { ready?: Promise<{ storage?: LevyStorage } | null> } }).LevyGames
  if (!bridge?.ready) return null
  const api = await bridge.ready
  return api?.storage ?? null
}

const onlyNumbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((n): n is number => typeof n === 'number') : []

const loadProgress = async (): Promise<number[]> => {
  const storage = await getPortalStorage()
  if (storage) return onlyNumbers(await storage.read(STORE_NS, []))
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return onlyNumbers(raw ? JSON.parse(raw) : [])
  } catch {
    return []
  }
}

const saveProgress = async (completed: number[], total: number): Promise<void> => {
  const storage = await getPortalStorage()
  if (storage) {
    await storage.write(STORE_NS, completed)
    // דיווח ההתקדמות הוא נגזרת של השמירה - לכן הוא כאן, באותו מקום בדיוק
    await storage.reportProgress(GAME_ID, { kind: 'levels', done: completed.length, total })
    return
  }
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed))
  } catch {
    /* מצב פרטי / אחסון מלא - המשחק ממשיך, פשוט בלי שמירה */
  }
}

export function useGameEngine(levels: LevelConfig[]) {
  const [levelIndex, setLevelIndex] = useState(0)
  const level = levels[levelIndex]

  const [queue, setQueue] = useState<QueuedCommand[]>([])
  const [robot, setRobot] = useState<RobotState>(() => startStateOf(level))
  const [collectedStars, setCollectedStars] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<GameStatus>('idle')
  const [crashCause, setCrashCause] = useState<CrashCause | null>(null)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [completedLevels, setCompletedLevels] = useState<number[]>([])

  // מזהה ריצה — עלייה שלו מבטלת ריצה אסינכרונית שעדיין באוויר (Reset / החלפת שלב)
  const runIdRef = useRef(0)
  const uidRef = useRef(0)
  // קריאת ההתקדמות אסינכרונית, ולכן אסור לשמור לפני שהיא חזרה — אחרת
  // המצב ההתחלתי הריק ידרוס שמירה קיימת
  const progressLoadedRef = useRef(false)

  useEffect(() => {
    let alive = true
    void loadProgress().then((saved) => {
      if (!alive) return
      progressLoadedRef.current = true
      if (saved.length) setCompletedLevels(saved)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!progressLoadedRef.current) return
    void saveProgress(completedLevels, levels.length)
  }, [completedLevels, levels.length])

  const resetBoard = useCallback(
    (target: LevelConfig) => {
      runIdRef.current++
      setRobot(startStateOf(target))
      setCollectedStars(new Set())
      setStatus('idle')
      setCrashCause(null)
      setCurrentStep(null)
    },
    [],
  )

  /** איפוס הלוח בלבד — התוכנית שהילדים בנו נשארת, כדי שיוכלו לתקן ולנסות שוב */
  const reset = useCallback(() => resetBoard(level), [resetBoard, level])

  const selectLevel = useCallback(
    (index: number) => {
      if (index < 0 || index >= levels.length) return
      setLevelIndex(index)
      setQueue([])
      resetBoard(levels[index])
    },
    [levels, resetBoard],
  )

  const nextLevel = useCallback(() => {
    selectLevel(levelIndex + 1)
  }, [selectLevel, levelIndex])

  const addCommand = useCallback(
    (type: CommandType) => {
      if (status === 'running') return
      // אחרי ניצחון/התרסקות — הוספת פקודה מאפסת את הלוח וחוזרים לעריכה
      if (status !== 'idle') resetBoard(level)
      setQueue((q) =>
        q.length >= level.maxCommands ? q : [...q, { uid: ++uidRef.current, type }],
      )
    },
    [status, level, resetBoard],
  )

  const removeCommand = useCallback(
    (uid: number) => {
      if (status === 'running') return
      setQueue((q) => q.filter((c) => c.uid !== uid))
    },
    [status],
  )

  const clearQueue = useCallback(() => {
    if (status === 'running') return
    setQueue([])
    resetBoard(level)
  }, [status, resetBoard, level])

  const run = useCallback(async () => {
    if (status === 'running' || queue.length === 0) return

    const myRun = ++runIdRef.current
    const alive = () => runIdRef.current === myRun

    // מתחילים כל ריצה מהמצב ההתחלתי של השלב
    let bot = startStateOf(level)
    const collected = new Set<string>()
    const blockers = new Map<string, ObstacleKind>()
    const pits = new Set<string>()
    for (const o of level.obstacles) {
      const kind = o.kind ?? 'rock'
      if (kind === 'pit') pits.add(posKey(o))
      else blockers.set(posKey(o), kind)
    }
    const stars = new Set(level.stars.map(posKey))

    setRobot(bot)
    setCollectedStars(new Set())
    setStatus('running')
    setCrashCause(null)
    setCurrentStep(null)

    await sleep(RUN_LEAD_IN_MS)
    if (!alive()) return

    for (let i = 0; i < queue.length; i++) {
      setCurrentStep(i)
      const command = queue[i]

      if (command.type === 'forward') {
        const dir = headingToDirection(bot.heading)
        const { dx, dy } = DIRECTION_DELTAS[dir]
        const nx = bot.x + dx
        const ny = bot.y + dy
        const nextKey = posKey({ x: nx, y: ny })
        const outOfBounds =
          nx < 0 || ny < 0 || nx >= level.grid.cols || ny >= level.grid.rows

        if (outOfBounds || blockers.has(nextKey)) {
          setCrashCause(outOfBounds ? 'wall' : (blockers.get(nextKey) as CrashCause))
          setStatus('crashed')
          await sleep(STEP_MS)
          if (alive()) setCurrentStep(null)
          return
        }

        bot = { ...bot, x: nx, y: ny }
        setRobot(bot)

        // בור: הרובוט נכנס לתא — ואז נופל פנימה
        if (pits.has(nextKey)) {
          await sleep(STEP_MS * 0.7)
          if (!alive()) return
          setCrashCause('pit')
          setStatus('crashed')
          await sleep(STEP_MS)
          if (alive()) setCurrentStep(null)
          return
        }

        if (stars.has(nextKey) && !collected.has(nextKey)) {
          collected.add(nextKey)
          setCollectedStars(new Set(collected))
        }
      } else {
        const delta = command.type === 'turnRight' ? 90 : -90
        bot = { ...bot, heading: bot.heading + delta }
        setRobot(bot)
      }

      await sleep(STEP_MS)
      if (!alive()) return
    }

    setCurrentStep(null)
    if (bot.x === level.battery.x && bot.y === level.battery.y) {
      setStatus('won')
      setCompletedLevels((done) =>
        done.includes(level.id) ? done : [...done, level.id],
      )
    } else {
      setStatus('missed')
    }
  }, [status, queue, level])

  return {
    level,
    levelIndex,
    levelCount: levels.length,
    queue,
    robot,
    collectedStars,
    status,
    crashCause,
    currentStep,
    completedLevels,
    addCommand,
    removeCommand,
    clearQueue,
    run,
    reset,
    nextLevel,
    selectLevel,
  }
}

export type GameEngine = ReturnType<typeof useGameEngine>
