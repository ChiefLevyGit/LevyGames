import type { SaveData } from '../types.ts';
import { store, mainStars, EMPTY } from './storage.ts';
import { Sound } from './SoundManager.ts';
import { LEVELS, MAIN_LEVELS, SECRET_LEVEL, SECRET_UNLOCK_STARS, levelById } from '../config/levels.ts';
import { clear } from '../ui/dom.ts';
import { TitleScreen } from '../screens/TitleScreen.ts';
import { MapScreen } from '../screens/MapScreen.ts';
import { LevelScreen } from '../screens/LevelScreen.ts';
import { showFinale } from '../ui/modals.ts';

export interface Screen {
  mount(root: HTMLElement): void;
  destroy(): void;
}

/**
 * מנהל המשחק: מסכים, שמירה ופתיחת כספות. מסך הכספת עצמו (LevelScreen) הוא
 * לולאת המשחק; כאן רק מעבירים ביניהם ושומרים את מה שקרה.
 */
export class Engine {
  save: SaveData = structuredClone(EMPTY);
  private screen: Screen | null = null;
  /** `?all` בכתובת - כל הכספות פתוחות לבדיקה, בלי לגעת בשמירה */
  readonly unlockAll = new URLSearchParams(location.search).has('all');

  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async start(): Promise<void> {
    const [save, muted] = await Promise.all([store.load(), store.loadMuted()]);
    this.save = save;
    Sound.setMuted(muted);
    this.showTitle();
  }

  private show(s: Screen): void {
    this.screen?.destroy();
    clear(this.root.querySelector('.screen-host')!);
    this.screen = s;
    s.mount(this.root.querySelector('.screen-host')!);
  }

  showTitle(): void {
    this.show(new TitleScreen(this));
  }

  showMap(focus?: number): void {
    this.show(new MapScreen(this, focus));
  }

  playLevel(id: number): void {
    this.show(new LevelScreen(this, levelById(id)));
  }

  // ------------------------------------------------------------ progress

  stars(id: number): number {
    return this.save.stars[id] ?? 0;
  }

  totalStars(): number {
    return mainStars(this.save);
  }

  secretUnlocked(): boolean {
    return this.unlockAll || this.totalStars() >= SECRET_UNLOCK_STARS;
  }

  isUnlocked(id: number): boolean {
    if (this.unlockAll) return true;
    const level = levelById(id);
    if (level.secret) return this.secretUnlocked();
    const idx = MAIN_LEVELS.findIndex((l) => l.id === id);
    return idx === 0 || this.stars(MAIN_LEVELS[idx - 1].id) > 0;
  }

  /** הכספת הבאה לשחק - הראשונה שעוד לא נפתחה */
  currentLevelId(): number {
    const open = MAIN_LEVELS.find((l) => this.stars(l.id) === 0);
    if (open) return open.id;
    if (this.secretUnlocked() && this.stars(SECRET_LEVEL.id) === 0) return SECRET_LEVEL.id;
    return MAIN_LEVELS[MAIN_LEVELS.length - 1].id;
  }

  nextLevelId(id: number): number | null {
    const level = levelById(id);
    if (level.secret) return null;
    const idx = MAIN_LEVELS.findIndex((l) => l.id === id);
    const next = MAIN_LEVELS[idx + 1];
    if (next) return next.id;
    return this.secretUnlocked() && this.stars(SECRET_LEVEL.id) === 0 ? SECRET_LEVEL.id : null;
  }

  /** נקרא כשכספת נפתחת. מחזיר מה השתנה, כדי שמסך הסיום ידע מה לחגוג. */
  async recordResult(id: number, stars: number): Promise<{ improved: boolean; firstTime: boolean; secretJustUnlocked: boolean }> {
    const prev = this.stars(id);
    const wasSecretOpen = this.totalStars() >= SECRET_UNLOCK_STARS;
    const improved = stars > prev;
    if (improved) this.save.stars[id] = stars;
    const secretJustUnlocked = !wasSecretOpen && this.totalStars() >= SECRET_UNLOCK_STARS;
    await store.save(this.save);
    return { improved, firstTime: prev === 0, secretJustUnlocked };
  }

  async markTutorialSeen(): Promise<void> {
    this.save.tutorialSeen = true;
    await store.save(this.save);
  }

  /** חגיגת סיום אחרי הכספת העשירית (או הסודית), פעם אחת בלבד */
  async maybeFinale(id: number): Promise<boolean> {
    const level = levelById(id);
    const lastMain = MAIN_LEVELS[MAIN_LEVELS.length - 1];
    if (level.secret && !this.save.secretFinaleSeen) {
      this.save.secretFinaleSeen = true;
      await store.save(this.save);
      await showFinale(this.save, true);
      return true;
    }
    if (id === lastMain.id && !this.save.finaleSeen) {
      this.save.finaleSeen = true;
      await store.save(this.save);
      await showFinale(this.save, false);
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ sound

  isMuted = () => Sound.muted;

  toggleMute = (): void => {
    const m = !Sound.muted;
    Sound.setMuted(m);
    void store.saveMuted(m);
    if (!m) Sound.playBgm();
  };

  /** כמה כספות קיימות בכלל - למפה */
  readonly levels = LEVELS;
}
