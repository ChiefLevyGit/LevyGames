export type Mechanic =
  | 'even_numbers'
  | 'multiples_of_5'
  | 'multiples_of_10'
  | 'multiples_of_3'
  | 'multiples_of_4'
  | 'multiples_of_7'
  | 'multiples_of_9'
  | 'common_multiples'
  | 'factors_of_target'
  | 'complement_to_100'
  /** שביל המשוואה: אוספים סכום מדויק (targetNumber) בדרך לשער */
  | 'equation_trail';

export interface Cell {
  row: number;
  col: number;
}

export interface Treasure {
  emoji: string;
  /** מיודע, מתאים אחרי "את": "מפתח הגן" */
  name: string;
  /** כבר עם ל' היחס: "לסבתא ינשופה" */
  to: string;
}

export interface Level {
  id: number;
  grade: string;
  title: string;
  narrative: string;
  /** ניסוח קצר של החוק, מוצג על לוחית המנעול */
  target: string;
  mechanic: Mechanic;
  targetNumber?: number;
  start: Cell;
  exit: Cell;
  tiles: number[][];
  hint: string;
  treasure: Treasure;
  secret?: boolean;
}

export interface SaveData {
  v: 1;
  /** הכוכבים הטובים ביותר לכל כספת, לפי id */
  stars: Record<string, number>;
  tutorialSeen: boolean;
  finaleSeen: boolean;
  secretFinaleSeen: boolean;
}

export const keyOf = (c: Cell) => `${c.row},${c.col}`;
export const sameCell = (a: Cell, b: Cell) => a.row === b.row && a.col === b.col;
export const isAdjacent = (a: Cell, b: Cell) =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
