// ⚙️ מכונת גלגלי השיניים.
//
// שורת גלגלים עם מספרים, גלגל אחד חסר ('?'). בוחרים מספר מהמגש כדי למלא
// אותו. תשובה נכונה = כל הגלגלים מסתובבים ונועלים. תשובה שגויה = תקיעה
// (רעד קצר), והגלגל חוזר ריק.
//
// ממשק אחיד: mount(stage, puzzle, ctx) → Promise<{ attempts }>

import { el } from './shared.js?v=1';

const HINT_AFTER = 2;
const SHOW_WRONG_MS = 1300;
const SOLVED_MS = 1200;

export function mount(stage, puzzle, ctx) {
  const little = puzzle.track === 'little';
  const { visible, length, hidden, answer, choices } = puzzle;
  let attempts = 0;
  let busy = false;
  let hinted = false;

  const root = el('div', `machine gears-machine ${little ? 'is-little' : 'is-g3'}`);
  root.dir = 'ltr';

  const row = el('div', 'gear-row');
  const gearEls = visible.map((v, i) => {
    const g = el('div', `gear${i === hidden ? ' gear-unknown' : ''}`);
    g.append(el('span', 'gear-num', v == null ? '?' : String(v)));
    row.append(g);
    if (i < length - 1) row.append(el('span', 'gear-link'));
    return g;
  });
  root.append(row);

  const hints = el('div', 'gear-hints');
  root.append(hints);

  const tray = el('div', 'tray');
  const tiles = choices.map((value) => {
    const b = el('button', 'tile tile-chip');
    b.type = 'button';
    b.dataset.value = String(value);
    b.setAttribute('aria-label', `מספר ${value}`);
    b.append(el('span', 'chip', String(value)));
    tray.append(b);
    return b;
  });
  root.append(tray);

  stage.replaceChildren(root);
  const prompt = 'איזה מספר חסר בשורת הגלגלים?';
  ctx.prompt(prompt, little ? prompt : null);

  function showHint() {
    hinted = true;
    root.classList.add('hinted');
    // חושפים את ההפרש בין כל זוג גלגלים גלויים שלא צמוד ל-'?', כדי לרמוז
    // על החוק בלי למסור את התשובה עצמה
    for (let i = 0; i < length - 1; i++) {
      if (i === hidden || i + 1 === hidden) continue;
      const a = visible[i], b = visible[i + 1];
      if (a == null || b == null) continue;
      const badge = el('span', 'gear-diff', `+${b - a}`);
      hints.append(badge);
    }
  }

  return new Promise((resolve) => {
    function place(value, tile) {
      if (busy || tile.disabled) return;
      busy = true;
      tile.classList.add('in-use');
      gearEls[hidden].querySelector('.gear-num').textContent = String(value);
      gearEls[hidden].classList.add('filled');
      ctx.sound('mtDrop');

      if (value === answer) {
        setTimeout(() => {
          root.classList.add('fixed');
          ctx.sound('mtLock');
        }, 450);
        setTimeout(() => resolve({ attempts: attempts + 1 }), SOLVED_MS + 450);
        return;
      }

      attempts++;
      setTimeout(() => ctx.sound('mtClunk'), 250);
      setTimeout(() => {
        gearEls[hidden].querySelector('.gear-num').textContent = '?';
        gearEls[hidden].classList.remove('filled');
        tile.classList.remove('in-use');
        tile.classList.add('tried');
        tile.disabled = true;
        busy = false;
        if (!hinted && attempts >= HINT_AFTER) showHint();
      }, SHOW_WRONG_MS);
    }

    tiles.forEach((tile) => {
      tile.addEventListener('click', () => place(Number(tile.dataset.value), tile));
    });
  });
}
