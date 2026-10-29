// עזרי DOM משותפים לכל המכונות. בכוונה מינימלי: כל מכונה בונה את התג
// הוויזואלי שלה בעצמה (משקולת, טיפה, גלגל שן, צורה) - רק המכניקה המשותפת
// (יצירת אלמנט, גרירה) יושבת כאן.

export const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// גרירה במגע/עכבר. הקשה רגילה עוברת ל-click; גרירה שמשתחררת מעל target
// (עם רדיוס סלחני של 30px) = הנחה. גרירה שמשתחררת במקום אחר = חוזר למגש.
export function enableDrag(tile, target, onDrop) {
  const THRESHOLD = 8;
  let start = null;
  let ghost = null;

  tile.addEventListener('pointerdown', (e) => {
    if (tile.disabled || e.button > 0) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });

  tile.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!ghost) {
      if (Math.hypot(dx, dy) < THRESHOLD) return;
      tile.setPointerCapture(e.pointerId);
      const r = tile.getBoundingClientRect();
      ghost = tile.cloneNode(true);
      ghost.classList.add('tile-ghost');
      Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      document.body.append(ghost);
      tile.classList.add('dragging');
    }
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
    const t = target.getBoundingClientRect();
    target.classList.toggle('drop-hover', e.clientX > t.left && e.clientX < t.right && e.clientY > t.top - 30 && e.clientY < t.bottom + 30);
  });

  const end = (e) => {
    if (!start || e.pointerId !== start.id) return;
    start = null;
    if (!ghost) return;
    const hit = target.classList.contains('drop-hover');
    ghost.remove();
    ghost = null;
    tile.classList.remove('dragging');
    target.classList.remove('drop-hover');
    tile.dataset.dragged = '1'; // לבלוע את ה-click שמגיע אחרי pointerup
    setTimeout(() => delete tile.dataset.dragged, 50);
    if (hit) onDrop();
  };
  tile.addEventListener('pointerup', end);
  tile.addEventListener('pointercancel', end);
}

// מצולע רגולרי חסום במעגל רדיוס r סביב (cx,cy), עם קודקוד ראשון למעלה.
export function polygonPoints(sides, cx, cy, r) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + i * ((2 * Math.PI) / sides);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts;
}

export function svg(tag, attrs = {}) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}
