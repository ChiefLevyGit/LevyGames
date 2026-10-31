import type { Engine, Screen } from '../core/Engine.ts';
import { h, reducedMotion } from '../ui/dom.ts';
import { button, soundToggle } from '../ui/components.ts';
import { IMG, VIDEO } from '../media.ts';
import { Sound } from '../core/SoundManager.ts';
import { completedMain } from '../core/storage.ts';
import { MAIN_TOTAL } from '../config/levels.ts';

/**
 * מסך הפתיחה: "מראה מכושפת" ובתוכה צל קופצת עם מפתח הזהב. לסרטון יש רקע
 * לבן, ולכן הוא יושב בתוך זכוכית בהירה עם שוליים מטושטשים - לא על הרקע הכהה.
 */
export class TitleScreen implements Screen {
  private el: HTMLElement | null = null;

  private readonly engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;
  }

  mount(root: HTMLElement): void {
    const done = completedMain(this.engine.save);
    const video = h('video', {
      class: 'mirror-video',
      src: reducedMotion() ? undefined : VIDEO.pounce,
      poster: IMG.pouncePoster,
      muted: true,
      loop: true,
      playsinline: true,
      autoplay: !reducedMotion(),
      'aria-hidden': 'true',
      tabindex: '-1',
    });
    video.muted = true; // דפדפנים מתעלמים מהתכונה בלי המאפיין

    const start = () => {
      Sound.unlock();
      Sound.playBgm();
      this.engine.showMap();
    };

    this.el = h(
      'section',
      { class: 'screen title-screen' },
      h('div', { class: 'title-top' }, soundToggle(this.engine.isMuted, this.engine.toggleMute)),
      h(
        'div',
        { class: 'title-body' },
        h('p', { class: 'title-kicker', dir: 'ltr' }, 'THE CIPHER ROGUE'),
        h('h1', { class: 'game-title' }, 'פורצת הצללים', h('br'), h('span', {}, 'הקטנה')),
        h('div', { class: 'mirror' }, h('div', { class: 'mirror-glass' }, video), h('div', { class: 'mirror-frame' })),
        h(
          'p',
          { class: 'title-blurb' },
          'צל, חתולת הצללים, מטפסת במגדל הכספות ומחזירה אוצרות גנובים לבעליהם. כל כספת נפתחת רק למספרים הנכונים — וצעד שגוי מעיר את השומר.',
        ),
        h(
          'div',
          { class: 'actions title-actions' },
          button(done ? 'להמשיך במסע' : 'צאי למסע!', start, { variant: 'primary', icon: '➔' }),
          h('a', { class: 'btn btn-brass', href: 'instructions.html' }, h('span', { class: 'btn-icon', 'aria-hidden': 'true' }, '📜'), h('span', { class: 'btn-label' }, 'איך משחקים?')),
        ),
        done ? h('p', { class: 'title-progress' }, `${done} מתוך ${MAIN_TOTAL} כספות נפתחו · ⭐ ${this.engine.totalStars()}`) : h('p', { class: 'title-progress' }, '10 כספות · לכיתות ב׳–ד׳'),
      ),
      h('a', { class: 'back-portal', href: '../../index.html' }, '→ לכל המשחקים'),
    );
    root.append(this.el);
    void video.play?.().catch(() => undefined);
  }

  destroy(): void {
    this.el?.querySelector('video')?.pause();
    this.el?.remove();
  }
}
