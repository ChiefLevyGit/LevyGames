import type { Cell, Level } from '../types.ts';
import { keyOf, sameCell } from '../types.ts';
import { h, wait, reducedMotion } from '../ui/dom.ts';
import { ANIM_FRAMES } from '../media.ts';

/**
 * לוח האבנים. כל אבן היא <button> - אפשר להקיש, ללחוץ או לנווט במקלדת.
 * מצבי האבן לפי מדריך העיצוב (סעיף 4):
 *   normal  - אבן כהה רגילה (tile)
 *   good    - צעד נכון: רונת אזמרגד (tile-good)
 *   pending - שסתום פתוח בשלב 9: אבן בהילה ענברית
 *   trap    - כבר ידוע שהיא שגויה: סימון עדין, כדי לא לחזור עליה
 * מעליהם: reachable (הילת ציאן לשכנים) ו-hinted (המצפן של tile-glow + פעימת זהב).
 */
export type TileState = 'normal' | 'good' | 'pending' | 'trap';
export type AnimKind = 'good' | 'wrong' | 'glow';

const ANIM_MS: Record<AnimKind, number> = { good: 1000, wrong: 2000, glow: 1000 };

export class Grid {
  readonly el: HTMLDivElement;
  private readonly tiles: HTMLButtonElement[][] = [];
  private readonly states: TileState[][] = [];
  readonly floatLayer: HTMLDivElement;

  private readonly level: Level;

  constructor(level: Level, onTile: (cell: Cell) => void) {
    this.level = level;
    const rows = level.tiles.length;
    const cols = level.tiles[0].length;
    this.el = h('div', {
      class: 'board',
      role: 'grid',
      'aria-label': `לוח האבנים, ${rows} שורות על ${cols} עמודות`,
      style: `--rows:${rows};--cols:${cols}`,
    });

    for (let r = 0; r < rows; r++) {
      const row: HTMLButtonElement[] = [];
      const st: TileState[] = [];
      for (let c = 0; c < cols; c++) {
        const cell = { row: r, col: c };
        const v = level.tiles[r][c];
        const btn = h(
          'button',
          {
            class: 'tile',
            type: 'button',
            'data-r': r,
            'data-c': c,
            'data-state': 'normal',
            'aria-label': String(v),
            onclick: () => onTile(cell),
          },
          h('span', { class: 'tile-face', 'aria-hidden': 'true' }),
          h('span', { class: 'tile-anim', 'aria-hidden': 'true' }),
          h('span', { class: 'tile-num', dir: 'ltr' }, String(v)),
          h('span', { class: 'tile-mark', 'aria-hidden': 'true' }),
        );
        if (sameCell(cell, level.exit)) btn.classList.add('is-exit');
        if (sameCell(cell, level.start)) btn.classList.add('is-start');
        this.el.append(btn);
        row.push(btn);
        st.push('normal');
      }
      this.tiles.push(row);
      this.states.push(st);
    }

    this.floatLayer = h('div', { class: 'float-layer', 'aria-hidden': 'true' });
    this.el.append(this.floatLayer);
    this.reset();
  }

  tile(c: Cell): HTMLButtonElement {
    return this.tiles[c.row][c.col];
  }

  state(c: Cell): TileState {
    return this.states[c.row][c.col];
  }

  value(c: Cell): number {
    return this.level.tiles[c.row][c.col];
  }

  setState(c: Cell, s: TileState): void {
    this.states[c.row][c.col] = s;
    const t = this.tile(c);
    t.dataset.state = s;
    const v = this.value(c);
    const label = { normal: '', good: ' — אבן בטוחה', pending: ' — שסתום פתוח', trap: ' — מלכודת' }[s];
    t.setAttribute('aria-label', `${v}${label}${sameCell(c, this.level.exit) ? ', היציאה לכספת' : ''}`);
  }

  /** חזרה לתחילת החדר: הכול רגיל, ורק ההתחלה בטוחה */
  reset(): void {
    for (let r = 0; r < this.states.length; r++) {
      for (let c = 0; c < this.states[r].length; c++) this.setState({ row: r, col: c }, 'normal');
    }
    this.setState(this.level.start, 'good');
    this.setReachable([]);
  }

  greenSet(): Set<string> {
    const s = new Set<string>();
    this.states.forEach((row, r) =>
      row.forEach((st, c) => {
        if (st === 'good') s.add(keyOf({ row: r, col: c }));
      }),
    );
    return s;
  }

  setReachable(cells: Cell[]): void {
    const keys = new Set(cells.map(keyOf));
    this.tiles.forEach((row, r) =>
      row.forEach((t, c) => t.classList.toggle('reachable', keys.has(keyOf({ row: r, col: c })))),
    );
  }

  /** מריץ את רצועת האנימציה מהסרטון של אלעד מעל האבן */
  async playAnim(c: Cell, kind: AnimKind): Promise<void> {
    const t = this.tile(c);
    const layer = t.querySelector<HTMLElement>('.tile-anim')!;
    if (reducedMotion()) return;
    const token = String(Math.random());
    layer.dataset.anim = '';
    void layer.offsetWidth; // מאפס אנימציה שכבר רצה על אותה אבן
    layer.dataset.kind = kind;
    layer.dataset.frames = String(ANIM_FRAMES[kind]);
    layer.dataset.token = token;
    layer.dataset.anim = 'play';
    await wait(ANIM_MS[kind]);
    if (layer.dataset.token !== token) return;
    layer.dataset.anim = 'fade';
    await wait(240);
    if (layer.dataset.token === token) layer.dataset.anim = '';
  }

  async hint(c: Cell): Promise<void> {
    const t = this.tile(c);
    t.classList.add('hinted');
    await this.playAnim(c, 'glow');
    await wait(2200);
    t.classList.remove('hinted');
  }

  clearHints(): void {
    this.el.querySelectorAll('.tile.hinted').forEach((t) => t.classList.remove('hinted'));
  }

  shakeTile(c: Cell): void {
    const t = this.tile(c);
    t.classList.remove('shake');
    void t.offsetWidth;
    t.classList.add('shake');
  }

  /** משוואה שצפה מעל האבן ונמוגה */
  float(c: Cell, text: string, tone: 'good' | 'bad' | 'gold' = 'good'): void {
    if (!text) return;
    const t = this.tile(c);
    const f = h('span', { class: `float float-${tone}`, dir: 'ltr' }, text);
    f.style.left = `${t.offsetLeft + t.offsetWidth / 2}px`;
    // מתחיל בראש האבן ועולה מהר - כדי לא להסתיר לאורך זמן את האבן שמעל,
    // שהיא בדרך כלל ההחלטה הבאה
    f.style.top = `${t.offsetTop - t.offsetHeight * 0.12}px`;
    this.floatLayer.append(f);
    setTimeout(() => f.remove(), reducedMotion() ? 1400 : 1600);
  }
}
