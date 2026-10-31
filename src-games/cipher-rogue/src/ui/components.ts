import { h } from './dom.ts';
import { Sound } from '../core/SoundManager.ts';
import type { SfxName } from '../media.ts';

/** כל כפתור משמיע קליק נחושת רך ופותח את האודיו אם הוא עוד נעול */
export function button(
  label: string | Node,
  onClick: () => void,
  opts: { variant?: 'primary' | 'brass' | 'ghost'; icon?: string; aria?: string; sfx?: SfxName | null; cls?: string } = {},
): HTMLButtonElement {
  const { variant = 'brass', icon, aria, sfx = 'ui_click', cls = '' } = opts;
  return h(
    'button',
    {
      class: `btn btn-${variant} ${cls}`.trim(),
      type: 'button',
      'aria-label': aria,
      onclick: () => {
        Sound.unlock();
        if (sfx) Sound.play(sfx);
        onClick();
      },
    },
    icon ? h('span', { class: 'btn-icon', 'aria-hidden': 'true' }, icon) : null,
    typeof label === 'string' ? h('span', { class: 'btn-label' }, label) : label,
  );
}

/** מתג קול עם תווית כתובה ("קול" / "מושתק") - לא רק אייקון, כמו באלפא־טאון */
export function soundToggle(isMuted: () => boolean, toggle: () => void): HTMLButtonElement {
  const icon = h('span', { class: 'btn-icon', 'aria-hidden': 'true' });
  const label = h('span', { class: 'btn-label' });
  const btn = h('button', { class: 'btn btn-ghost sound-toggle', type: 'button' }, icon, label);
  const sync = () => {
    const m = isMuted();
    icon.textContent = m ? '🔇' : '🔊';
    label.textContent = m ? 'מושתק' : 'קול';
    btn.setAttribute('aria-pressed', String(!m));
    btn.setAttribute('aria-label', m ? 'הצליל מושתק — לחצי להפעלה' : 'הצליל פועל — לחצי להשתקה');
  };
  btn.addEventListener('click', () => {
    Sound.unlock();
    toggle();
    sync();
    if (!isMuted()) Sound.play('ui_click');
  });
  sync();
  return btn;
}

export function starsRow(n: number, max = 3, cls = ''): HTMLDivElement {
  const row = h('div', { class: `stars ${cls}`.trim(), role: 'img', 'aria-label': `${n} כוכבים מתוך ${max}` });
  for (let i = 0; i < max; i++) {
    row.append(h('span', { class: `star ${i < n ? 'on' : 'off'}`, 'aria-hidden': 'true' }, '★'));
  }
  return row;
}

export const gradeLabel = (g: string) => (g === 'בונוס' ? 'כספת בונוס' : `כיתה ${g.replace('-', '–')}'`);
