import { h } from './dom.ts';

const NS = 'http://www.w3.org/2000/svg';
const PIVOT = { x: 60, y: 14 };
const ARM = 44;
const MAX_TILT = 16;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, ...kids: Element[]) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...kids);
  return el;
}

/**
 * מאזני הזהב של שביל המשוואה. כף ימין (ראשונה בקריאה) היא האנרגיה שנאספה,
 * כף שמאל היא המשקולת של המנעול. הכבדה יורדת; כשהן שוות - הקורה ישרה וזוהרת.
 *
 * שלושה חלקים נפרדים - עמוד, קורה, כף - בדיוק כמו התמונות שאלעד יביא.
 * כשיגיעו: להחליף את הציורים ב-<image> באותן קבוצות, והתנועה נשארת.
 */
export class Balance {
  readonly el: HTMLDivElement;
  private readonly beam: SVGGElement;
  private readonly pans: [SVGGElement, SVGGElement];
  private readonly mineText: SVGTextElement;
  private readonly read: HTMLElement;

  constructor(target: number) {
    const pan = (label: string, cls: string) => {
      const text = svg('text', { x: 0, y: 29, class: 'bal-num' });
      text.textContent = label;
      const g = svg(
        'g',
        { class: `bal-pan ${cls}` },
        svg('path', { d: 'M0 0 L-12 21 M0 0 L12 21', class: 'bal-chain' }),
        svg('path', { d: 'M-15 21 L15 21 Q12 32 0 32 Q-12 32 -15 21 Z', class: 'bal-dish' }),
        text,
      );
      return { g, text };
    };
    const mine = pan('0', 'bal-mine');
    const lock = pan(String(target), 'bal-lock');
    this.mineText = mine.text;

    // הכפות תלויות מקצות הקורה אבל לא מסתובבות איתה - רק עולות ויורדות
    const mineWrap = svg('g', { transform: `translate(${PIVOT.x + ARM} ${PIVOT.y})` }, mine.g);
    const lockWrap = svg('g', { transform: `translate(${PIVOT.x - ARM} ${PIVOT.y})` }, lock.g);
    this.pans = [mine.g, lock.g];

    this.beam = svg(
      'g',
      { class: 'bal-beam' },
      svg('rect', { x: PIVOT.x - ARM - 3, y: PIVOT.y - 2.5, width: ARM * 2 + 6, height: 5, rx: 2.5 }),
    );

    const stand = svg(
      'g',
      { class: 'bal-stand' },
      svg('rect', { x: PIVOT.x - 2.5, y: PIVOT.y, width: 5, height: 44, rx: 2 }),
      svg('path', { d: `M${PIVOT.x - 16} 62 L${PIVOT.x + 16} 62 L${PIVOT.x + 9} 55 L${PIVOT.x - 9} 55 Z` }),
      svg('circle', { cx: PIVOT.x, cy: PIVOT.y, r: 4.5, class: 'bal-knob' }),
    );

    const art = svg('svg', { viewBox: '0 0 120 64', class: 'bal-art', 'aria-hidden': 'true' }, stand, lockWrap, mineWrap, this.beam);
    this.read = h('bdi', { dir: 'ltr', class: 'ltr bal-read' });
    this.el = h('div', { class: 'balance', role: 'status' });
    this.el.append(art, this.read);
    this.set(0, target);
  }

  set(value: number, target: number): void {
    const a = Math.max(-MAX_TILT, Math.min(MAX_TILT, ((value - target) / target) * 40));
    const dy = ARM * Math.sin((a * Math.PI) / 180);
    this.beam.style.setProperty('--a', `${a}deg`);
    this.pans[0].style.setProperty('--dy', `${dy}px`);
    this.pans[1].style.setProperty('--dy', `${-dy}px`);
    this.mineText.textContent = String(value);
    this.read.textContent = `${value} / ${target}`;
    this.el.classList.toggle('level', value === target);
    this.el.classList.toggle('over', value > target);
    this.el.setAttribute('aria-label', `מאזניים: אספת ${value} מתוך ${target}`);
  }
}
