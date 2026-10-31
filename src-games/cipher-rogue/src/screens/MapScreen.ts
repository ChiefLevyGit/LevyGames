import type { Engine, Screen } from '../core/Engine.ts';
import type { Level } from '../types.ts';
import { h, wait } from '../ui/dom.ts';
import { button, soundToggle, starsRow } from '../ui/components.ts';
import { IMG } from '../media.ts';
import { MAIN_LEVELS, MAIN_TOTAL, SECRET_LEVEL, SECRET_UNLOCK_STARS, vaultNo } from '../config/levels.ts';
import { Sound } from '../core/SoundManager.ts';

/**
 * מגדל הכספות: הכספות מלמטה למעלה, וקיר סודי בראש. כל כספת שנפתחה מציגה
 * את הכוכבים שלה, והאוצר שהוחזר עולה למדף בתחתית - שכבת ה"מטא" של המשחק.
 */
export class MapScreen implements Screen {
  private el: HTMLElement | null = null;
  private onResize = () => this.drawPipe();
  private tower: HTMLElement | null = null;

  private readonly engine: Engine;
  private readonly focus?: number;

  constructor(engine: Engine, focus?: number) {
    this.engine = engine;
    this.focus = focus;
  }

  mount(root: HTMLElement): void {
    const e = this.engine;
    const current = e.currentLevelId();

    const tower = h('div', { class: 'tower' });
    this.tower = tower;
    const pipe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pipe.setAttribute('class', 'tower-pipe');
    pipe.setAttribute('aria-hidden', 'true');
    tower.append(pipe);

    // הסודית למעלה, ואז מהאחרונה לראשונה - כך שבגלילה רגילה מתחילים מלמטה
    const order: Level[] = [SECRET_LEVEL, ...[...MAIN_LEVELS].reverse()];
    order.forEach((level, i) => tower.append(this.node(level, current, i)));

    const shelf = h('div', { class: 'shelf', role: 'list', 'aria-label': 'אוצרות שהוחזרו' });
    let returned = 0;
    for (const l of MAIN_LEVELS) {
      const got = e.stars(l.id) > 0;
      if (got) returned++;
      shelf.append(
        h('span', { class: `shelf-item ${got ? 'got' : ''}`, role: 'listitem', title: got ? l.treasure.name : 'עוד לא הוחזר' }, l.treasure.emoji),
      );
    }

    this.el = h(
      'section',
      { class: 'screen map-screen' },
      h(
        'header',
        { class: 'map-head' },
        button('', () => e.showTitle(), { variant: 'ghost', icon: '🏠', aria: 'למסך הפתיחה', cls: 'icon-only' }),
        h('div', { class: 'map-title' }, h('h1', {}, 'מגדל הכספות'), h('p', {}, `⭐ ${e.totalStars()} / ${MAIN_TOTAL * 3}`)),
        soundToggle(e.isMuted, e.toggleMute),
      ),
      h('div', { class: 'tower-scroll' }, tower),
      h('footer', { class: 'map-foot' }, h('p', {}, `אוצרות שהוחזרו: ${returned}/${MAIN_LEVELS.length}`), shelf),
    );
    root.append(this.el);

    window.addEventListener('resize', this.onResize);
    requestAnimationFrame(() => {
      this.drawPipe();
      const target = tower.querySelector<HTMLElement>(`[data-level="${this.focus ?? current}"]`);
      target?.scrollIntoView({ block: 'center' });
    });
  }

  private node(level: Level, current: number, i: number): HTMLElement {
    const e = this.engine;
    const unlocked = e.isUnlocked(level.id);
    const stars = e.stars(level.id);
    const isCurrent = level.id === current && unlocked;
    // זיגזג: שמאל-ימין לסירוגין, הסודית באמצע
    const x = level.secret ? 50 : i % 2 === 0 ? 30 : 70;

    const cls = [
      'vault-node',
      unlocked ? 'unlocked' : 'locked',
      stars ? 'done' : '',
      isCurrent ? 'current' : '',
      level.secret ? 'secret' : '',
    ].join(' ');

    const label = level.secret
      ? unlocked
        ? `הכספת הסודית${stars ? `, ${stars} כוכבים` : ''}`
        : `קיר סודי — נפתח ב-${SECRET_UNLOCK_STARS} כוכבים`
      : `כספת ${vaultNo(level)}: ${level.title}${unlocked ? (stars ? `, ${stars} כוכבים` : ', פתוחה') : ', נעולה'}`;

    const medal = h(
      'button',
      {
        class: 'vault-medal',
        type: 'button',
        'aria-label': label,
        onclick: () => this.pick(level, medal),
      },
      h('img', { class: 'medal-img', src: stars ? IMG.doorOpen : IMG.doorClosed, alt: '' }),
      h('span', { class: 'medal-num' }, level.secret ? (unlocked ? '?' : '🔒') : String(vaultNo(level))),
    );

    return h(
      'div',
      // הסודית באמצע: הכיתוב מימין למדליון והחתולה משמאל, כמו בצד שמאל של הזיגזג
      { class: cls, 'data-level': level.id, 'data-side': x <= 50 ? 'r' : 'l', style: `--x:${x}%` },
      medal,
      h(
        'div',
        { class: 'node-info' },
        h('span', { class: 'node-title' }, level.secret && !unlocked ? 'קיר סדוק...' : level.title),
        unlocked && !level.secret ? starsRow(stars) : null,
        level.secret && !unlocked ? h('span', { class: 'node-lock' }, `נפתח ב-⭐ ${SECRET_UNLOCK_STARS}`) : null,
        level.secret && unlocked ? starsRow(stars) : null,
      ),
      isCurrent ? h('img', { class: 'node-cat', src: IMG.catIdle, alt: '' }) : null,
    );
  }

  private async pick(level: Level, medal: HTMLElement): Promise<void> {
    if (!this.engine.isUnlocked(level.id)) {
      Sound.play('step_invalid', { gain: 0.6 });
      medal.classList.remove('nope');
      void medal.offsetWidth;
      medal.classList.add('nope');
      const msg = this.el!.querySelector<HTMLElement>('.map-msg') ?? h('p', { class: 'map-msg', role: 'status' });
      msg.textContent = level.secret
        ? `הקיר לא זז... אולי עם ${SECRET_UNLOCK_STARS} כוכבים? (יש לך ${this.engine.totalStars()})`
        : 'הכספת הזאת עוד נעולה — קודם פורצים את זו שלפניה.';
      this.el!.append(msg);
      await wait(2600);
      msg.remove();
      return;
    }
    this.engine.playLevel(level.id);
  }

  /** צינור נחושת שמחבר את הכספות לפי סדר הטיפוס */
  private drawPipe(): void {
    const tower = this.tower;
    if (!tower) return;
    const svg = tower.querySelector('svg')!;
    const box = tower.getBoundingClientRect();
    const pts = [...tower.querySelectorAll<HTMLElement>('.vault-node .vault-medal')].map((m) => {
      const r = m.getBoundingClientRect();
      return `${r.left - box.left + r.width / 2},${r.top - box.top + r.height / 2}`;
    });
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.setAttribute('width', String(box.width));
    svg.setAttribute('height', String(box.height));
    const ns = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.firstChild.remove();
    for (const [cls, w] of [['pipe-outer', 14], ['pipe-inner', 6]] as const) {
      const pl = document.createElementNS(ns, 'polyline');
      pl.setAttribute('points', pts.join(' '));
      pl.setAttribute('class', cls);
      pl.setAttribute('stroke-width', String(w));
      svg.append(pl);
    }
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.el?.remove();
  }
}
