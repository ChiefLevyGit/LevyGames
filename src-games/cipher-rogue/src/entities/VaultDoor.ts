import { h, animate, wait } from '../ui/dom.ts';
import { IMG } from '../media.ts';

/**
 * דלת הכספת מעל אבן היציאה. סגורה כל השלב, ונפתחת כשצל מגיעה ליציאה:
 * רעד קצר של המנגנון, הבזק זהב, ומעבר לאיור הדלת הפתוחה עם האוצר.
 */
export class VaultDoor {
  readonly el: HTMLDivElement;
  private readonly closed: HTMLImageElement;
  private readonly opened: HTMLImageElement;
  private readonly glow: HTMLDivElement;

  constructor() {
    this.closed = h('img', { class: 'vault-img vault-closed', src: IMG.doorClosed, alt: '' });
    this.opened = h('img', { class: 'vault-img vault-open', src: IMG.doorOpen, alt: '' });
    this.glow = h('div', { class: 'vault-glow' });
    this.el = h(
      'div',
      { class: 'vault', role: 'img', 'aria-label': 'דלת הכספת — נעולה' },
      this.glow,
      this.closed,
      this.opened,
    );
  }

  reset(): void {
    this.el.classList.remove('is-open');
    this.el.setAttribute('aria-label', 'דלת הכספת — נעולה');
  }

  async open(): Promise<void> {
    await animate(
      this.el,
      [
        { transform: 'translateX(0) rotate(0)' },
        { transform: 'translateX(-3px) rotate(-.6deg)' },
        { transform: 'translateX(3px) rotate(.6deg)' },
        { transform: 'translateX(-2px) rotate(-.3deg)' },
        { transform: 'translateX(0) rotate(0)' },
      ],
      { duration: 420, easing: 'ease-in-out' },
    );
    this.el.classList.add('is-open');
    this.el.setAttribute('aria-label', 'דלת הכספת — פתוחה!');
    await wait(700);
  }
}
