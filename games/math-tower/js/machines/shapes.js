// 🔷 מכונת מנעול הצורות.
//
// שאלה על צורה (כמה צלעות/קודקודים/זוויות ישרות, מה ההיקף, או כמה חסר
// להשלמת תבנית סימטרית) - עונים דרך מגש מספרים. בלי פיזיקה: תשובה נכונה
// מדליקה את הצורה, שגויה מרעידה אותה.
//
// ממשק אחיד: mount(stage, puzzle, ctx) → Promise<{ attempts }>

import { el, svg, polygonPoints } from './shared.js?v=1';

const HINT_AFTER = 2;
const SHOW_WRONG_MS = 1300;
const SOLVED_MS = 1200;
const VB = 200;
const CX = VB / 2, CY = VB / 2 - 4;

function svgText(x, y, text, cls) {
  const t = svg('text', { x, y, class: cls });
  t.textContent = text;
  return t;
}

function quad(rw, rh) {
  return [[CX - rw, CY - rh], [CX + rw, CY - rh], [CX + rw, CY + rh], [CX - rw, CY + rh]];
}

function outline(shape) {
  if (shape === 'triangle') return polygonPoints(3, CX, CY, 66).map((p) => p.split(',').map(Number));
  if (shape === 'pentagon') return polygonPoints(5, CX, CY, 62).map((p) => p.split(',').map(Number));
  if (shape === 'hexagon') return polygonPoints(6, CX, CY, 60).map((p) => p.split(',').map(Number));
  if (shape === 'square') return quad(52, 52);
  if (shape === 'rectangle') return quad(64, 38);
  return null; // עיגול
}

function renderShape(puzzle) {
  const wrap = el('div', 'shape-stage');
  const s = svg('svg', { viewBox: `0 0 ${VB} ${VB}`, class: 'shape-svg' });
  const { shape, prop, sides } = puzzle;

  if (shape === 'circle') {
    s.append(svg('circle', { cx: CX, cy: CY, r: 64, class: 'shape-outline' }));
  } else {
    const pts = outline(shape);
    s.append(svg('polygon', { points: pts.map((p) => p.join(',')).join(' '), class: 'shape-outline' }));

    if (prop === 'vertices') {
      pts.forEach(([x, y]) => s.append(svg('circle', { cx: x, cy: y, r: 7, class: 'shape-mark shape-vertex' })));
    } else if (prop === 'sides' && !sides) {
      pts.forEach(([x, y], i) => {
        const [x2, y2] = pts[(i + 1) % pts.length];
        s.append(svg('circle', { cx: (x + x2) / 2, cy: (y + y2) / 2, r: 6, class: 'shape-mark shape-edge-dot' }));
      });
    } else if (prop === 'right' && (shape === 'square' || shape === 'rectangle')) {
      pts.forEach(([x, y]) => {
        const dx = CX - x, dy = CY - y;
        const len = Math.hypot(dx, dy) || 1;
        const ox = x + (dx / len) * 15, oy = y + (dy / len) * 15;
        s.append(svg('rect', { x: ox - 6, y: oy - 6, width: 12, height: 12, class: 'shape-mark shape-right' }));
      });
    }

    if (sides) {
      pts.forEach(([x, y], i) => {
        const [x2, y2] = pts[(i + 1) % pts.length];
        s.append(svgText((x + x2) / 2, (y + y2) / 2, String(sides[i]), 'shape-side-label'));
      });
    }
  }
  wrap.append(s);
  return wrap;
}

function renderSymmetry({ half, shown }) {
  const wrap = el('div', 'shape-stage symmetry-stage');
  const s = svg('svg', { viewBox: `0 0 ${VB} ${VB}`, class: 'shape-svg' });
  s.append(svg('line', { x1: CX, y1: 16, x2: CX, y2: VB - 16, class: 'mirror-line' }));
  const gap = (VB - 60) / Math.max(1, half - 1 || 1);
  for (let i = 0; i < half; i++) {
    const y = 30 + i * gap;
    s.append(svg('circle', { cx: CX - 38, cy: y, r: 11, class: 'dot dot-filled' }));
    const filled = i < shown;
    s.append(svg('circle', { cx: CX + 38, cy: y, r: 11, class: `dot ${filled ? 'dot-filled' : 'dot-missing'}` }));
  }
  wrap.append(s);
  return wrap;
}

export function mount(stage, puzzle, ctx) {
  const little = puzzle.track === 'little';
  const { question, answer, choices } = puzzle;
  let attempts = 0;
  let busy = false;
  let hinted = false;

  const root = el('div', `machine shapes-machine ${little ? 'is-little' : 'is-g3'}`);
  const visual = puzzle.kind === 'symmetry' ? renderSymmetry(puzzle) : renderShape(puzzle);
  root.append(visual);

  const tray = el('div', 'tray');
  const tiles = choices.map((value) => {
    const b = el('button', 'tile tile-chip');
    b.type = 'button';
    b.dataset.value = String(value);
    b.setAttribute('aria-label', String(value));
    b.append(el('span', 'chip', String(value)));
    tray.append(b);
    return b;
  });
  root.append(tray);

  stage.replaceChildren(root);
  ctx.prompt(question, little ? question : null);

  function showHint() {
    hinted = true;
    root.classList.add('hinted');
  }

  return new Promise((resolve) => {
    function choose(value, tile) {
      if (busy || tile.disabled) return;
      busy = true;
      tile.classList.add('in-use');
      ctx.sound('mtDrop');

      if (value === answer) {
        setTimeout(() => { visual.classList.add('fixed'); ctx.sound('mtLock'); }, 300);
        setTimeout(() => resolve({ attempts: attempts + 1 }), SOLVED_MS);
        return;
      }

      attempts++;
      visual.classList.add('shake');
      setTimeout(() => ctx.sound('mtClunk'), 150);
      setTimeout(() => {
        visual.classList.remove('shake');
        tile.classList.remove('in-use');
        tile.classList.add('tried');
        tile.disabled = true;
        busy = false;
        if (!hinted && attempts >= HINT_AFTER) showHint();
      }, SHOW_WRONG_MS);
    }

    tiles.forEach((tile) => {
      tile.addEventListener('click', () => choose(Number(tile.dataset.value), tile));
    });
  });
}
