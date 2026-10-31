import type { Cell } from '../types.ts';
import type { StepKind } from '../rules/index.ts';

/** אירועי המשחק. הסאונד, האפקטים והשמירה מאזינים - אף אחד מהם לא יודע על השני. */
export interface GameEvents {
  STEP_ON_TILE: { cell: Cell; value: number; kind: Exclude<StepKind, 'valve_release'> };
  INVALID_MOVE: { cell: Cell; value: number; known: boolean };
  STEALTH_CHANGE: { left: number; max: number };
  ROOM_RESET: { level: number };
  HINT_USED: { cell: Cell };
  VALVE_RELEASE: { cell: Cell };
  LEVEL_COMPLETED: { level: number; stars: number; mistakes: number; hinted: boolean };
}

type Handler<T> = (payload: T) => void;

class Bus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(fn as Handler<never>);
    return () => this.handlers.get(type)?.delete(fn as Handler<never>);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    for (const fn of this.handlers.get(type) ?? []) (fn as Handler<GameEvents[K]>)(payload);
  }
}

export const EventBus = new Bus();
