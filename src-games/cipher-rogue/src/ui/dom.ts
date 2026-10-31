type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined | ((e: Event) => void);

/**
 * יוצר אלמנט. טקסט נכנס תמיד כ-TextNode - אף פעם innerHTML - כי שמות, רמזים
 * ונרטיב מגיעים מקובץ נתונים (CLAUDE.md: textContent ולא innerHTML).
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, '').toLowerCase(), v);
    else if (k === 'class') el.className = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(isolateMath(String(c))));
  }
}

/** משוואה או מספר בתוך טקסט עברי - מבודד בכיוון LTR כדי שהסימנים לא יתהפכו */
export const ltr = (text: string) => h('bdi', { dir: 'ltr', class: 'ltr' }, text);

const MATH = /\d+(?:\s*[×÷+\-=]\s*(?:\d+|\?))+/g;

/**
 * עוטף כל ביטוי חשבוני בטקסט עברי ב-LRI...PDI (בידוד LTR).
 * בלי זה, בפסקה מימין לשמאל "7×2=14" מוצג "14=2×7" - אלגוריתם הכיווניות
 * הופך את סדר המספרים כשהסימנים ביניהם ניטרליים.
 */
export const isolateMath = (text: string) => text.replace(MATH, (m) => `⁦${m}⁩`);

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** מחזיר Promise שנפתר כשאנימציית CSS/WAAPI מסתיימת (או מיד אם אין תנועה) */
export function animate(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Promise<void> {
  if (reducedMotion()) {
    const last = frames[frames.length - 1];
    if (opts.fill === 'forwards' || opts.fill === 'both') {
      for (const [k, v] of Object.entries(last)) {
        if (k !== 'offset' && k !== 'easing') (el as HTMLElement).style.setProperty(k, String(v));
      }
    }
    return Promise.resolve();
  }
  return el.animate(frames, opts).finished.then(() => undefined, () => undefined);
}

export function clear(el: Element): void {
  while (el.firstChild) el.firstChild.remove();
}
