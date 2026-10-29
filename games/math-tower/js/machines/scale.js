// ⚖️ מכונת המאזניים.
//
// צלחת שמאל: מטען קבוע. צלחת ימין: ביטוי עם מקום ריק. בוחרים משקולת מהמגש
// (הקשה או גרירה), והקורה נוטה לפי ההפרש האמיתי. תשובה שגויה = הקורה
// עקומה והמשקולת חוזרת למגש, בלי איקס ובלי "טעות".
//
// ממשק אחיד לכל המכונות: mount(stage, puzzle, ctx) → Promise<{ attempts }>
//   ctx.sound(name)          צליל
//   ctx.prompt(text, voice)  שורת ההנחיה (voice: טקסט להקראה במסלול קטנה)

import { rightValue } from '../generate.js?v=4';
import { el, enableDrag } from './shared.js?v=1';

const HINT_AFTER = 2;
const SHOW_WRONG_MS = 1300;
const SOLVED_MS = 1200;

// כמות כנקודות או תפוחים, בשורות של 5 - כדי שילדה בת 5 תזהה "5 ועוד 2"
// בלי לספור אחד-אחד
function quantity(n, { glyph = null, cls = '' } = {}) {
  const box = el('span', `qty ${cls}`);
  box.setAttribute('aria-label', String(n));
  for (let i = 0; i < n; i++) {
    const item = el('span', glyph ? 'qty-item qty-glyph' : 'qty-item qty-dot', glyph || '');
    item.dataset.n = String(i + 1);
    box.append(item);
  }
  return box;
}

function weight(content, cls = '') {
  const w = el('span', `weight ${cls}`);
  w.append(content instanceof Node ? content : document.createTextNode(String(content)));
  return w;
}

export function mount(stage, puzzle, ctx) {
  const little = puzzle.track === 'little';
  const { left, right, answer } = puzzle;
  let attempts = 0;
  let busy = false;
  let hinted = false;

  // ---------- בנייה ----------
  const root = el('div', `machine scale-machine ${little ? 'is-little' : 'is-g3'}`);

  const rig = el('div', 'scale-rig');
  rig.dir = 'ltr';
  const beam = el('div', 'scale-beam');
  const post = el('div', 'scale-post');
  const panL = el('div', 'pan pan-left');
  const panR = el('div', 'pan pan-right');
  const loadL = el('div', 'pan-load');
  const loadR = el('div', 'pan-load');
  panL.append(loadL, el('div', 'pan-plate'));
  panR.append(loadR, el('div', 'pan-plate'));
  rig.append(post, beam, panL, panR);

  // צלחת שמאל: קבוצות תפוחים (חזותי, עם + בין קבוצות) או משקל בספרות.
  // לפי left.groups ולא לפי מסלול - כך גם "חיסור" בקטנה מציג ספרה, בדיוק
  // כמו ב-ג', ורק הספירה/החיבור נשארים תפוחים.
  let leftLabel = null;
  if (left.groups) {
    left.groups.forEach((g, i) => {
      if (i > 0) loadL.append(el('span', 'op', '+'));
      loadL.append(quantity(g, { glyph: '🍎', cls: 'apples' }));
    });
  } else {
    leftLabel = weight(left.label, 'weight-load');
    loadL.append(leftLabel);
  }

  // צלחת ימין: חלק ידוע + סימן + מקום ריק. המשקולות תמיד בספרות אמיתיות -
  // גם בקטנה - כדי שהבחירה תהיה "משקולת עם המספר הנכון עליה".
  let knownBlock = null;
  if (right.op === '+' || right.op === '×') {
    knownBlock = weight(right.k, 'weight-known');
    loadR.append(knownBlock, el('span', 'op', right.op));
  } else if (right.op === '×+') {
    knownBlock = weight(`${right.a} × ${right.b}`, 'weight-known');
    loadR.append(knownBlock, el('span', 'op', '+'));
  }
  const slot = el('span', 'slot');
  slot.setAttribute('aria-label', 'מקום למשקולת');
  loadR.append(slot);

  // שורת התרגיל (גדולה בלבד) - תמיד משמאל לימין
  let eqSlot = null;
  if (puzzle.eq) {
    const eq = el('div', 'eq');
    eq.dir = 'ltr';
    const [before, after] = puzzle.eq.split('?');
    eqSlot = el('span', 'eq-slot', '?');
    eq.append(before, eqSlot, after);
    root.append(rig, eq);
  } else {
    root.append(rig);
  }

  // המגש
  const tray = el('div', 'tray');
  const tiles = puzzle.choices.map((value) => {
    const b = el('button', 'tile');
    b.type = 'button';
    b.dataset.value = String(value);
    b.setAttribute('aria-label', `משקולת ${value}`);
    b.append(weight(value, 'weight-choice'));
    tray.append(b);
    return b;
  });
  root.append(tray);

  stage.replaceChildren(root);
  ctx.prompt(
    little ? 'כמה צריך לשים כדי שהמאזניים יהיו ישרים?' : 'איזו משקולת תאזן את המאזניים?',
    little ? 'כמה צריך לשים כדי שהמאזניים יהיו ישרים?' : null,
  );

  // ---------- פיזיקה ----------
  const emptyValue = rightValue(right, 0);

  function tilt(rv) {
    const diff = rv - left.value;
    const scaleOf = Math.max(left.value, 10);
    const deg = diff === 0 ? 0 : Math.sign(diff) * Math.min(16, 5 + (12 * Math.abs(diff)) / scaleOf);
    const half = beam.offsetWidth / 2;
    const dy = half * Math.sin((deg * Math.PI) / 180);
    rig.style.setProperty('--tilt', `${deg}deg`);
    rig.style.setProperty('--dy-left', `${-dy}px`);
    rig.style.setProperty('--dy-right', `${dy}px`);
  }

  let placedValue = null;
  const relayout = () => tilt(placedValue == null ? emptyValue : rightValue(right, placedValue));
  // מחכים פריים אחד כדי שלקורה יהיה רוחב
  requestAnimationFrame(relayout);
  const ro = new ResizeObserver(relayout);
  ro.observe(rig);

  function showHint() {
    hinted = true;
    root.classList.add('hinted'); // ב-CSS: גם מספרים על כל תפוח, וגם פעימה על המשקלים בספרות
    if (left.hint && leftLabel) leftLabel.firstChild.textContent = left.hint;
    if (puzzle.hint && knownBlock) knownBlock.firstChild.textContent = String(right.a * right.b);
  }

  // ---------- מהלך ----------
  return new Promise((resolve) => {
    function place(value, tile) {
      if (busy || tile.disabled) return;
      busy = true;
      placedValue = value;
      tile.classList.add('in-use');
      const placed = weight(value, 'weight-choice weight-placed');
      slot.replaceChildren(placed);
      slot.classList.add('filled');
      if (eqSlot) eqSlot.textContent = String(value);
      ctx.sound('mtDrop');
      relayout();

      if (value === answer) {
        setTimeout(() => {
          root.classList.add('fixed');
          ctx.sound('mtLock');
        }, 450);
        setTimeout(() => {
          ro.disconnect();
          resolve({ attempts: attempts + 1 });
        }, SOLVED_MS + 450);
        return;
      }

      attempts++;
      setTimeout(() => ctx.sound('mtClunk'), 250);
      setTimeout(() => {
        placedValue = null;
        slot.replaceChildren();
        slot.classList.remove('filled');
        if (eqSlot) eqSlot.textContent = '?';
        tile.classList.remove('in-use');
        tile.classList.add('tried');
        tile.disabled = true;
        relayout();
        busy = false;
        if (!hinted && attempts >= HINT_AFTER) showHint();
      }, SHOW_WRONG_MS);
    }

    tiles.forEach((tile) => {
      const value = Number(tile.dataset.value);
      enableDrag(tile, panR, () => place(value, tile));
      tile.addEventListener('click', () => {
        if (tile.dataset.dragged) { delete tile.dataset.dragged; return; }
        place(value, tile);
      });
    });
  });
}
