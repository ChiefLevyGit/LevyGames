import type { Engine, Screen } from '../core/Engine.ts';
import type { Cell, Level } from '../types.ts';
import { isAdjacent, sameCell } from '../types.ts';
import { h, wait, reducedMotion, clear, isolateMath } from '../ui/dom.ts';
import { button, soundToggle, gradeLabel } from '../ui/components.ts';
import { showComplete, showGuardWake, showIntro, showTutorial } from '../ui/modals.ts';
import { IMG, VIDEO } from '../media.ts';
import { Grid } from '../entities/Grid.ts';
import { Player } from '../entities/Player.ts';
import { VaultDoor } from '../entities/VaultDoor.ts';
import { StealthMeter } from '../systems/StealthMeter.ts';
import {
  equationFor,
  explainInvalid,
  explainValve,
  isValid,
  isValve,
  nextStep,
  VALVE_SUM,
} from '../systems/MathSystem.ts';
import { EventBus } from '../core/EventBus.ts';
import { FX, centerOf } from '../fx/Particles.ts';
import { levelById } from '../config/levels.ts';
import { PALETTE } from '../config/theme.ts';

const DOOR_RATIO = 900 / 684;

/**
 * לולאת המשחק בתוך כספת אחת. תצפית (כרטיס הפתיחה) -> צעדים מחושבים -> פתיחה.
 * מחזיקה את מצב החדר: איפה צל, אילו אבנים אושרו, שסתום פתוח (שלב 9), פעמונים.
 */
export class LevelScreen implements Screen {
  private el!: HTMLElement;
  private grid!: Grid;
  private player!: Player;
  private door = new VaultDoor();
  private meter = new StealthMeter();
  private wrap!: HTMLDivElement;
  private bells!: HTMLDivElement;
  private gauge: HTMLElement | null = null;
  private whisperEl!: HTMLDivElement;
  private floorFx!: HTMLVideoElement;
  private whisperTimer = 0;

  private busy = false;
  private started = false;
  private hinted = false;
  private pending: Cell | null = null;
  private destroyed = false;
  private readonly valve: boolean;

  private onResize = () => this.layout();
  private onKey = (e: KeyboardEvent) => this.key(e);

  private readonly engine: Engine;
  private readonly level: Level;

  constructor(engine: Engine, level: Level) {
    this.engine = engine;
    this.level = level;
    this.valve = isValve(level);
  }

  // ---------------------------------------------------------------- build

  mount(root: HTMLElement): void {
    const L = this.level;
    this.grid = new Grid(L, (c) => void this.attemptMove(c));

    this.wrap = h('div', { class: 'board-wrap' }, this.door.el, this.grid.el);
    this.player = new Player(this.grid, L.start);

    this.bells = h('div', { class: 'bells', role: 'img' });
    this.whisperEl = h('div', { class: 'whisper', role: 'status', 'aria-live': 'polite' });
    this.floorFx = h('video', {
      class: 'floor-fx',
      src: reducedMotion() ? undefined : VIDEO.floor,
      muted: true,
      playsinline: true,
      preload: 'auto',
      'aria-hidden': 'true',
      tabindex: '-1',
    });
    this.floorFx.muted = true;

    if (this.valve) {
      this.gauge = h('div', { class: 'gauge', role: 'status' });
    }

    this.el = h(
      'section',
      { class: `screen level-screen ${L.secret ? 'is-secret' : ''}`, 'data-level': L.id },
      this.floorFx,
      h(
        'header',
        { class: 'hud-top' },
        h(
          'div',
          { class: 'hud-row' },
          button('', () => void this.leave(), { variant: 'ghost', icon: '🏰', aria: 'חזרה למגדל', cls: 'icon-only' }),
          h(
            'div',
            { class: 'hud-banner' },
            h('span', { class: 'hud-level' }, L.secret ? 'כספת סודית' : `כספת ${L.id} · ${gradeLabel(L.grade)}`),
            h('h1', { class: 'hud-title' }, L.title),
          ),
          this.bells,
        ),
        h(
          'div',
          { class: 'hud-rule' },
          h('img', { class: 'rule-eye', src: IMG.eye, alt: '' }),
          h('span', { class: 'rule-k' }, 'המנעול:'),
          h('strong', { class: 'rule-v' }, L.target),
          this.gauge,
        ),
      ),
      h('main', { class: 'play' }, this.wrap),
      h('div', { class: 'whisper-slot' }, this.whisperEl),
      h(
        'footer',
        { class: 'hud-bottom' },
        button(
          h('span', { class: 'hint-inner' }, h('img', { src: IMG.magnifier, alt: '' }), h('span', { class: 'btn-label' }, 'רמז')),
          () => void this.useHint(),
          { variant: 'ghost', aria: 'רמז: מראה את הצעד הבא', cls: 'hint-btn', sfx: null },
        ),
        soundToggle(this.engine.isMuted, this.engine.toggleMute),
      ),
    );

    root.append(this.el);
    this.updateBells();
    this.updateGauge();
    this.layout();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKey);
    void this.begin();
  }

  private async begin(): Promise<void> {
    const choice = await showIntro(this.level);
    if (this.destroyed) return;
    if (choice === 'map') {
      this.engine.showMap(this.level.id);
      return;
    }
    if (this.level.id === 1 && !this.engine.save.tutorialSeen) {
      await showTutorial();
      void this.engine.markTutorialSeen();
    }
    this.started = true;
    this.refreshReachable();
    this.whisper(
      this.valve
        ? 'פתחי שסתום באבן אחת — והשלימי אותו ל-100 באבן שלידה.'
        : `דרכי רק על ${this.level.target}. מאיזו אבן ממשיכים?`,
      'info',
    );
    this.grid.tile(this.player.at).focus({ preventScroll: true });
  }

  /** גודל האבן נגזר מהמסך: מספיק גדול לאצבע של ילדה, בלי גלילה */
  private layout(): void {
    const rows = this.level.tiles.length;
    const cols = this.level.tiles[0].length;
    const top = this.el.querySelector<HTMLElement>('.hud-top')!.offsetHeight;
    const bottom = this.el.querySelector<HTMLElement>('.hud-bottom')!.offsetHeight;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const gapK = 0.07;
    const padK = 0.14;
    const doorK = 1.55;
    const SLOT = 58; // מקום שמור ללחישה של צל - כדי שלא תכסה את השורה התחתונה
    const boardUnitsW = cols + (cols - 1) * gapK + 2 * padK;
    const boardUnitsH = rows + (rows - 1) * gapK + 2 * padK;
    const availH = H - top - bottom - SLOT - 24;
    const t = Math.floor(Math.max(44, Math.min(112, (W - 20) / boardUnitsW, availH / (boardUnitsH + doorK))));
    const spare = availH - t * (boardUnitsH + doorK);
    this.el.querySelector<HTMLElement>('.whisper-slot')!.style.height = `${SLOT + Math.max(0, Math.min(64, spare * 0.6))}px`;

    const gap = Math.round(t * gapK);
    const pad = Math.round(t * padK);
    const boardW = cols * t + (cols - 1) * gap + 2 * pad;
    const boardH = rows * t + (rows - 1) * gap + 2 * pad;
    const doorH = Math.round(t * doorK);
    const doorW = Math.round(doorH * DOOR_RATIO);

    this.el.style.setProperty('--tile', `${t}px`);
    this.el.style.setProperty('--gap', `${gap}px`);
    this.el.style.setProperty('--pad', `${pad}px`);
    this.wrap.style.width = `${boardW}px`;
    this.wrap.style.height = `${boardH + doorH}px`;
    this.grid.el.style.top = `${doorH}px`;

    const exitX = pad + this.level.exit.col * (t + gap) + t / 2;
    const left = Math.max(-pad, Math.min(boardW - doorW + pad, exitX - doorW / 2));
    Object.assign(this.door.el.style, { width: `${doorW}px`, height: `${doorH}px`, left: `${left}px` });

    this.player.place();
  }

  // ---------------------------------------------------------------- input

  private key(e: KeyboardEvent): void {
    if (!this.started || document.querySelector('.modal-overlay')) return;
    const at = this.player.at;
    const dirs: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], KeyW: [-1, 0],
      ArrowDown: [1, 0], KeyS: [1, 0],
      ArrowLeft: [0, -1], KeyA: [0, -1],
      ArrowRight: [0, 1], KeyD: [0, 1],
    };
    const d = dirs[e.key] ?? dirs[e.code];
    if (d) {
      e.preventDefault();
      const to = { row: at.row + d[0], col: at.col + d[1] };
      if (to.row < 0 || to.col < 0 || to.row >= this.level.tiles.length || to.col >= this.level.tiles[0].length) return;
      void this.attemptMove(to).then(() => this.grid.tile(this.player.at).focus({ preventScroll: true }));
    } else if (e.code === 'KeyH') {
      void this.useHint();
    }
  }

  private neighbors(c: Cell): Cell[] {
    const out: Cell[] = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const r = c.row + dr;
      const k = c.col + dc;
      if (r >= 0 && k >= 0 && r < this.level.tiles.length && k < this.level.tiles[0].length) out.push({ row: r, col: k });
    }
    return out;
  }

  private refreshReachable(): void {
    if (!this.started) return this.grid.setReachable([]);
    this.grid.setReachable(this.neighbors(this.player.at).filter((c) => this.grid.state(c) !== 'trap'));
  }

  private async attemptMove(to: Cell): Promise<void> {
    if (!this.started || this.busy) return;
    const from = this.player.at;
    if (sameCell(from, to)) return;
    if (!isAdjacent(from, to)) {
      this.whisper('צל יכולה לקפוץ רק לאבן שצמודה אליה — אחת מהאבנים שזוהרות בתכלת.', 'info');
      this.grid.el.classList.remove('flash-reach');
      void this.grid.el.offsetWidth;
      this.grid.el.classList.add('flash-reach');
      return;
    }
    this.grid.clearHints();
    if (this.valve) return this.stepValve(to);

    const st = this.grid.state(to);
    const v = this.grid.value(to);

    if (st === 'good') {
      this.busy = true;
      EventBus.emit('STEP_ON_TILE', { cell: to, value: v, kind: 'revisit' });
      await this.player.hopTo(to);
      return this.afterMove();
    }

    if (st === 'trap') {
      EventBus.emit('INVALID_MOVE', { cell: to, value: v, known: true });
      this.grid.shakeTile(to);
      this.whisper(`כבר גילית שזו מלכודת: ${explainInvalid(this.level, v)}`, 'bad');
      return;
    }

    if (isValid(this.level, v)) {
      this.busy = true;
      const hop = this.player.hopTo(to);
      await wait(reducedMotion() ? 0 : 170);
      this.grid.setState(to, 'good');
      void this.grid.playAnim(to, 'good');
      this.sparkle(to);
      this.grid.float(to, equationFor(this.level, v), 'good');
      EventBus.emit('STEP_ON_TILE', { cell: to, value: v, kind: 'valid' });
      await hop;
      return this.afterMove();
    }

    await this.wrongStep(to, v, explainInvalid(this.level, v), true);
  }

  /** שלב 9: צעד ראשון פותח שסתום, השני חייב להשלים ל-100 */
  private async stepValve(to: Cell): Promise<void> {
    const st = this.grid.state(to);
    const v = this.grid.value(to);

    if (st === 'good') {
      this.busy = true;
      if (this.pending) {
        this.grid.setState(this.pending, 'normal');
        EventBus.emit('VALVE_RELEASE', { cell: this.pending });
        this.pending = null;
        this.updateGauge();
        this.whisper('השסתום שוחרר בשקט. אפשר לבחור אבן פתיחה אחרת.', 'info');
      } else {
        EventBus.emit('STEP_ON_TILE', { cell: to, value: v, kind: 'revisit' });
      }
      await this.player.hopTo(to);
      return this.afterMove();
    }

    if (!this.pending) {
      this.busy = true;
      await this.player.hopTo(to);
      this.grid.setState(to, 'pending');
      this.pending = to;
      this.updateGauge(); // המד בראש המסך מציג את הזוג הפתוח - בלי משוואה צפה שתכסה אבנים
      EventBus.emit('STEP_ON_TILE', { cell: to, value: v, kind: 'valve_open' });
      this.whisper(`השסתום פתוח על ${v}. עכשיו צריך אבן צמודה עם ${VALVE_SUM - v}.`, 'info');
      return this.afterMove();
    }

    const a = this.grid.value(this.pending);
    if (a + v === VALVE_SUM) {
      this.busy = true;
      const opened = this.pending;
      const hop = this.player.hopTo(to);
      await wait(reducedMotion() ? 0 : 170);
      this.grid.setState(opened, 'good');
      this.grid.setState(to, 'good');
      void this.grid.playAnim(opened, 'good');
      void this.grid.playAnim(to, 'good');
      this.sparkle(to);
      this.grid.float(to, `${a} + ${v} = ${VALVE_SUM}`, 'good');
      this.pending = null;
      this.updateGauge();
      EventBus.emit('STEP_ON_TILE', { cell: to, value: v, kind: 'valve_close' });
      await hop;
      return this.afterMove();
    }

    await this.wrongStep(to, v, explainValve(a, v), false);
  }

  private async afterMove(): Promise<void> {
    this.busy = false;
    this.refreshReachable();
    if (sameCell(this.player.at, this.level.exit) && !this.pending && this.grid.state(this.level.exit) === 'good') {
      await this.complete();
    }
  }

  private async wrongStep(to: Cell, v: number, why: string, markTrap: boolean): Promise<void> {
    this.busy = true;
    EventBus.emit('INVALID_MOVE', { cell: to, value: v, known: false });
    void this.grid.playAnim(to, 'wrong');
    this.grid.shakeTile(to);
    const c = centerOf(this.grid.tile(to));
    FX.burst('smoke', c.x, c.y - 6, 8);
    FX.burst('ember', c.x, c.y, 14);
    this.shakeBoard();
    this.whisper(why, 'bad');
    await this.player.bump(to);
    if (markTrap) this.grid.setState(to, 'trap');

    const ring = this.meter.ring();
    this.updateBells(true);
    EventBus.emit('STEALTH_CHANGE', { left: this.meter.left, max: this.meter.max });
    if (ring === 'warning') {
      await wait(900);
      this.whisper(`${why}  זהירות — עוד פעמון אחד והשומר מתעורר!`, 'bad');
    }
    if (ring === 'wake') await this.guardWakes();
    this.busy = false;
    this.refreshReachable();
  }

  private async guardWakes(): Promise<void> {
    await wait(500);
    EventBus.emit('ROOM_RESET', { level: this.level.id });
    this.el.classList.add('alarm-flash');
    await showGuardWake();
    this.el.classList.remove('alarm-flash');
    if (this.destroyed) return;
    this.grid.reset();
    this.pending = null;
    this.updateGauge();
    this.meter.refill();
    this.updateBells();
    const c = centerOf(this.grid.tile(this.level.start));
    FX.burst('smoke', c.x, c.y, 14);
    await this.player.vanishTo(this.level.start);
    this.whisper('הפעמונים נרגעו. מתחילות שוב — בשקט ובחשיבה.', 'info');
  }

  // ---------------------------------------------------------------- hint

  private async useHint(): Promise<void> {
    if (!this.started || this.busy) return;
    const first = !this.hinted;
    this.hinted = true;
    const step = nextStep(this.level, { at: this.player.at, pending: this.pending, green: this.grid.greenSet() });
    this.player.setPose('puzzled', 2600);
    this.whisper(first ? `${this.level.hint}  (עם רמז אפשר לקבל עד 2 כוכבים)` : this.level.hint, 'hint');
    if (!step) return;
    EventBus.emit('HINT_USED', { cell: step });
    const c = centerOf(this.grid.tile(step));
    FX.burst('spark', c.x, c.y, 16, [PALETTE.gold, PALETTE.goldLight, PALETTE.cyanLight]);
    await this.grid.hint(step);
  }

  // ---------------------------------------------------------------- complete

  private async complete(): Promise<void> {
    this.busy = true;
    this.started = false;
    this.grid.setReachable([]);
    const stars = this.meter.stars(this.hinted);
    EventBus.emit('LEVEL_COMPLETED', { level: this.level.id, stars, mistakes: this.meter.mistakes, hinted: this.hinted });

    this.player.setPose('celebrate');
    if (!reducedMotion()) {
      this.floorFx.currentTime = 0;
      this.el.classList.add('awaken');
      void this.floorFx.play().catch(() => undefined);
    }
    await this.door.open();
    const d = centerOf(this.door.el);
    FX.burst('coin', d.x, d.y, 34);
    FX.burst('star', d.x, d.y, 18);
    FX.burst('spark', d.x, d.y, 30, [PALETTE.gold, PALETTE.goldLight, '#FFFFFF']);
    await wait(1500);
    if (this.destroyed) return;

    const res = await this.engine.recordResult(this.level.id, stars);
    const nextId = this.engine.nextLevelId(this.level.id);
    const nextLabel = nextId ? (levelById(nextId).secret ? 'לכספת הסודית' : 'אל החדר הבא') : null;
    const choice = await showComplete({
      level: this.level,
      stars,
      mistakes: this.meter.mistakes,
      hinted: this.hinted,
      improved: res.improved,
      firstTime: res.firstTime,
      nextLabel,
      secretJustUnlocked: res.secretJustUnlocked,
    });
    if (this.destroyed) return;
    const hadFinale = await this.engine.maybeFinale(this.level.id);

    if (choice === 'replay') return this.engine.playLevel(this.level.id);
    if (choice === 'next' && nextId && !hadFinale) return this.engine.playLevel(nextId);
    this.engine.showMap(nextId ?? this.level.id);
  }

  private async leave(): Promise<void> {
    this.engine.showMap(this.level.id);
  }

  // ---------------------------------------------------------------- hud

  private updateBells(rang = false): void {
    clear(this.bells);
    const { left, max } = this.meter;
    this.bells.setAttribute('aria-label', `מד חשאיות: ${left} מתוך ${max} פעמונים שקטים`);
    for (let i = 0; i < max; i++) {
      const calm = i < left;
      const b = h('span', { class: `bell ${calm ? 'calm' : 'rung'}` }, h('img', { src: IMG.bell, alt: '' }));
      if (rang && i === left) b.classList.add('ringing');
      this.bells.append(b);
    }
  }

  private updateGauge(): void {
    if (!this.gauge) return;
    clear(this.gauge);
    if (this.pending) {
      const a = this.grid.value(this.pending);
      this.gauge.classList.add('open');
      this.gauge.append(h('span', {}, 'שסתום:'), h('bdi', { dir: 'ltr', class: 'ltr' }, `${a} + ? = ${VALVE_SUM}`));
    } else {
      this.gauge.classList.remove('open');
      this.gauge.append(h('span', {}, 'שסתום: מאוזן ✓'));
    }
  }

  private whisper(text: string, tone: 'info' | 'bad' | 'good' | 'hint'): void {
    window.clearTimeout(this.whisperTimer);
    this.whisperEl.textContent = isolateMath(text);
    this.whisperEl.dataset.tone = tone;
    this.whisperEl.classList.add('show');
    const ms = Math.min(9000, 2600 + text.length * 55);
    this.whisperTimer = window.setTimeout(() => this.whisperEl.classList.remove('show'), ms);
  }

  private sparkle(c: Cell): void {
    const p = centerOf(this.grid.tile(c));
    FX.burst('spark', p.x, p.y, 22);
  }

  private shakeBoard(): void {
    if (reducedMotion()) return;
    this.wrap.classList.remove('shake');
    void this.wrap.offsetWidth;
    this.wrap.classList.add('shake');
  }

  destroy(): void {
    this.destroyed = true;
    window.clearTimeout(this.whisperTimer);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKey);
    this.floorFx.pause();
    document.querySelectorAll('.modal-overlay').forEach((m) => m.remove());
    this.el?.remove();
  }
}
