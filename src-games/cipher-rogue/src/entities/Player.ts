import type { Cell } from '../types.ts';
import { h, animate, wait } from '../ui/dom.ts';
import { IMG } from '../media.ts';
import type { Grid } from './Grid.ts';

/**
 * צל, חתולת הצללים. שש תנוחות מהאיורים של אלעד, והחלפה ביניהן לפי מה שקורה:
 * עומדת, קופצת בין אבנים, נבהלת מטעות, מתלבטת ברמז, חוגגת בכספת.
 * התנועה בין אבנים היא קפיצה בקשת (tween) ולא טלפורטציה - דרישה מ-creation flow.
 */
export type Pose = 'idle' | 'creep' | 'leap' | 'startled' | 'puzzled' | 'celebrate';

const POSE_SRC: Record<Pose, string> = {
  idle: IMG.catIdle,
  creep: IMG.catCreep,
  leap: IMG.catLeap,
  startled: IMG.catStartled,
  puzzled: IMG.catPuzzled,
  celebrate: IMG.catCelebrate,
};
/** האיורים הרחבים (קפיצה/התגנבות) צריכים יותר רוחב באותו גובה */
const WIDE: Pose[] = ['leap', 'creep'];

export class Player {
  readonly el: HTMLDivElement;
  private readonly img: HTMLImageElement;
  at: Cell;
  private facing: 1 | -1 = 1;
  private poseTimer = 0;

  private readonly grid: Grid;

  constructor(grid: Grid, start: Cell) {
    this.grid = grid;
    this.img = h('img', { class: 'cat-img', src: IMG.catIdle, alt: '', draggable: 'false' });
    this.el = h('div', { class: 'cat', 'aria-hidden': 'true' }, h('span', { class: 'cat-shadow' }), this.img);
    grid.el.append(this.el);
    this.at = start;
    // תמונות התנוחות נטענות מראש, כדי שההחלפה הראשונה לא תהבהב
    for (const src of Object.values(POSE_SRC)) {
      const i = new Image();
      i.src = src;
    }
  }

  /** נקודת העוגן (כפות הרגליים) של אבן, בקואורדינטות הלוח */
  private anchor(c: Cell): { x: number; y: number } {
    const t = this.grid.tile(c);
    return { x: t.offsetLeft + t.offsetWidth / 2, y: t.offsetTop + t.offsetHeight * 0.93 };
  }

  private transformAt(c: Cell, lift = 0): string {
    const { x, y } = this.anchor(c);
    return `translate3d(${x}px, ${y - lift}px, 0)`;
  }

  setPose(p: Pose, holdMs = 0): void {
    window.clearTimeout(this.poseTimer);
    this.img.src = POSE_SRC[p];
    this.el.dataset.pose = p;
    this.el.classList.toggle('wide', WIDE.includes(p));
    if (holdMs) this.poseTimer = window.setTimeout(() => this.setPose('idle'), holdMs);
  }

  private face(dir: 1 | -1): void {
    this.facing = dir;
    this.el.style.setProperty('--face', String(dir));
  }

  /** מיקום מחדש בלי אנימציה - בכניסה לחדר, אחרי איפוס ובשינוי גודל מסך */
  place(c: Cell = this.at): void {
    this.at = c;
    this.el.style.transform = this.transformAt(c);
  }

  async hopTo(c: Cell): Promise<void> {
    const from = this.at;
    if (c.col !== from.col) this.face(c.col > from.col ? 1 : -1);
    this.setPose('leap');
    const t = this.grid.tile(c);
    const lift = t.offsetHeight * 0.45;
    const a = this.anchor(from);
    const b = this.anchor(c);
    const mid = `translate3d(${(a.x + b.x) / 2}px, ${Math.min(a.y, b.y) - lift}px, 0)`;
    await animate(
      this.el,
      [{ transform: this.transformAt(from) }, { transform: mid, offset: 0.5 }, { transform: this.transformAt(c) }],
      { duration: 300, easing: 'cubic-bezier(.3,.7,.4,1)' },
    );
    this.place(c);
    this.setPose('idle');
  }

  /** צעד שגוי: קפיצה קטנה לכיוון האבן, נבהלת, וחוזרת - לא עוברת אליה */
  async bump(toward: Cell): Promise<void> {
    const from = this.at;
    if (toward.col !== from.col) this.face(toward.col > from.col ? 1 : -1);
    this.setPose('startled', 1100);
    const a = this.anchor(from);
    const b = this.anchor(toward);
    const part = `translate3d(${a.x + (b.x - a.x) * 0.32}px, ${a.y + (b.y - a.y) * 0.32 - 10}px, 0)`;
    await animate(
      this.el,
      [{ transform: this.transformAt(from) }, { transform: part, offset: 0.4 }, { transform: this.transformAt(from) }],
      { duration: 340, easing: 'ease-out' },
    );
    this.place(from);
  }

  /** השומר התעורר: נעלמת בענן ומופיעה בהתחלה */
  async vanishTo(c: Cell): Promise<void> {
    await animate(this.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    this.place(c);
    this.face(1);
    this.setPose('idle');
    await wait(120);
    await animate(this.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, fill: 'forwards' });
    this.el.style.opacity = '1';
  }

  get facingDir(): 1 | -1 {
    return this.facing;
  }
}
