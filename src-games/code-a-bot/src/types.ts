/** כיוון הרובוט: 0 = למעלה (צפון), 1 = ימינה (מזרח), 2 = למטה (דרום), 3 = שמאלה (מערב) */
export type Direction = 0 | 1 | 2 | 3

export interface GridPosition {
  x: number
  y: number
}

export interface RobotStart extends GridPosition {
  dir: Direction
}

/** rock/animal חוסמים מעבר; pit — הרובוט נכנס אליו ונופל */
export type ObstacleKind = 'rock' | 'animal' | 'pit'

export interface Obstacle extends GridPosition {
  kind?: ObstacleKind // ברירת מחדל: rock (תאימות לשלבים הישנים)
  emoji?: string // לחיות — איזו חיה מציגים
}

export interface LevelConfig {
  id: number
  name: string
  hint: string
  grid: { cols: number; rows: number }
  robotStart: RobotStart
  battery: GridPosition
  obstacles: Obstacle[]
  stars: GridPosition[]
  maxCommands: number
}

/** ממה רובי נכשל — קובע את ההודעה והאנימציה */
export type CrashCause = 'wall' | 'rock' | 'animal' | 'pit'

export type CommandType = 'forward' | 'turnLeft' | 'turnRight'

/** פקודה בתור הביצוע — uid יציב בשביל אנימציות ומחיקה */
export interface QueuedCommand {
  uid: number
  type: CommandType
}

export type GameStatus =
  | 'idle' // עורכים את התוכנית
  | 'running' // הרובוט מבצע
  | 'won' // הגיע לסוללה
  | 'crashed' // נתקל במכשול או בקצה הלוח
  | 'missed' // התוכנית נגמרה בלי להגיע לסוללה

export interface RobotState {
  x: number
  y: number
  /** מעלות מצטברות (לא מנורמלות) — כדי שהאנימציה תסתובב תמיד בדרך הקצרה הנכונה */
  heading: number
}

export const posKey = (p: GridPosition): string => `${p.x},${p.y}`

export const headingToDirection = (heading: number): Direction =>
  ((((heading / 90) % 4) + 4) % 4) as Direction

export const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },
  1: { dx: 1, dy: 0 },
  2: { dx: 0, dy: 1 },
  3: { dx: -1, dy: 0 },
}
