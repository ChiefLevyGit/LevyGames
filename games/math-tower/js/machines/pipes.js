// 💧 מכונת הצינורות.
//
// מיכל עליון עם כמות כוללת. k צינורות יורדים לכדים זהים, וכולם צריכים
// להתמלא לאותו קו בדיוק. בוחרים "כמה בכל כד", וכל הכדים מתמלאים יחד לאותה
// כמות - תשובה שגויה = גלישה מעל הקו או מתחתיו, בכל הכדים בבת אחת.
//
// ממשק אחיד: mount(stage, puzzle, ctx) → Promise<{ attempts }>

import { el } from './shared.js?v=1';

const HINT_AFTER = 2;
const SHOW_WRONG_MS = 1300;
const SOLVED_MS = 1200;

function chip(value) {
  const c = el('span', 'chip', String(value));
  return c;
}

export function mount(stage, puzzle, ctx) {
  const little = puzzle.track === 'little';
  const { total, k, answer, choices } = puzzle;
  let attempts = 0;
  let busy = false;
  let hinted = false;

  const dynMax = Math.max(answer, ...choices) + 1;
  const pct = (v) => Math.min(100, (v / dynMax) * 100);

  const root = el('div', `machine pipes-machine ${little ? 'is-little' : 'is-g3'}`);
  root.dir = 'ltr';

  const tank = el('div', 'tank');
  tank.append(el('span', 'tank-icon', '💧'), el('span', 'tank-total', String(total)));
  root.append(tank);

  const eq = el('div', 'eq');
  eq.dir = 'ltr';
  const [before, after] = puzzle.eq.split('?');
  const eqSlot = el('span', 'eq-slot', '?');
  eq.append(before, eqSlot, after);
  root.append(eq);

  const jarsWrap = el('div', 'jars');
  const jars = Array.from({ length: k }, () => {
    const jar = el('div', 'jar');
    // --line על המכל המשותף (לא על jar-line) כדי ש-jar-line-label יירש אותו
    jar.style.setProperty('--line', `${pct(answer)}%`);
    const line = el('span', 'jar-line');
    const fill = el('span', 'jar-fill');
    const lineLabel = el('span', 'jar-line-label');
    jar.append(line, fill, lineLabel);
    jarsWrap.append(jar);
    return { jar, fill, lineLabel };
  });
  root.append(jarsWrap);

  const tray = el('div', 'tray');
  const tiles = choices.map((value) => {
    const b = el('button', 'tile tile-chip');
    b.type = 'button';
    b.dataset.value = String(value);
    b.setAttribute('aria-label', `${value} בכל כד`);
    b.append(chip(value));
    tray.append(b);
    return b;
  });
  root.append(tray);

  stage.replaceChildren(root);
  const prompt = little ? 'כמה ייכנס בכל כד, כדי שיתמלאו בדיוק עד הקו?' : 'כמה בכל צינור, כדי לחלק הכול בלי להשאיר ובלי לגלוש?';
  ctx.prompt(prompt, little ? prompt : null);

  function showHint() {
    hinted = true;
    root.classList.add('hinted');
    jars.forEach(({ lineLabel }) => { lineLabel.textContent = String(answer); });
  }

  return new Promise((resolve) => {
    function pour(value, tile) {
      if (busy || tile.disabled) return;
      busy = true;
      tile.classList.add('in-use');
      eqSlot.textContent = String(value);
      jars.forEach(({ jar, fill }) => {
        fill.style.height = `${pct(value)}%`;
        jar.classList.toggle('over', value > answer);
        jar.classList.toggle('under', value < answer);
      });
      ctx.sound('mtDrop');

      if (value === answer) {
        setTimeout(() => {
          root.classList.add('fixed');
          jars.forEach(({ jar }) => jar.classList.remove('over', 'under'));
          ctx.sound('mtLock');
        }, 450);
        setTimeout(() => {
          resolve({ attempts: attempts + 1 });
        }, SOLVED_MS + 450);
        return;
      }

      attempts++;
      setTimeout(() => ctx.sound('mtClunk'), 250);
      setTimeout(() => {
        jars.forEach(({ jar, fill }) => { fill.style.height = '0%'; jar.classList.remove('over', 'under'); });
        eqSlot.textContent = '?';
        tile.classList.remove('in-use');
        tile.classList.add('tried');
        tile.disabled = true;
        busy = false;
        if (!hinted && attempts >= HINT_AFTER) showHint();
      }, SHOW_WRONG_MS);
    }

    tiles.forEach((tile) => {
      tile.addEventListener('click', () => pour(Number(tile.dataset.value), tile));
    });
  });
}
