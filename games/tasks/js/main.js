// ?v= בסוף כל ייבוא הוא cache-busting - ראו Design.info/tasks.md
import { TASKS, TOTAL, cardIdentity, categoryIcon, categoryName } from './tasksData.js?v=2';
import { saveProgress, loadProgress, clearProgress } from './storage.js?v=2';

const startScreenEl = document.getElementById('startScreen');
const drawScreenEl = document.getElementById('drawScreen');
const deckScreenEl = document.getElementById('deckScreen');
const resumeCardEl = document.getElementById('resumeCard');
const resumeModeEl = document.getElementById('resumeMode');
const liveRegionEl = document.getElementById('liveRegion');
const confettiLayerEl = document.getElementById('confettiLayer');

// מצב הגרלה
const drawCounterEl = document.getElementById('drawCounter');
const progressFillEl = document.getElementById('progressFill');
const taskBadgeEl = document.getElementById('taskBadge');
const mysteryCoverEl = document.getElementById('mysteryCover');
const taskDisplayEl = document.getElementById('taskDisplay');
const taskIconEl = document.getElementById('taskIcon');
const taskTitleEl = document.getElementById('taskTitle');
const taskTextEl = document.getElementById('taskText');
const revealBtn = document.getElementById('revealBtn');
const nextBtn = document.getElementById('nextBtn');
const drawContentEl = document.getElementById('drawContent');
const finishScreenEl = document.getElementById('finishScreen');
const restartBtn = document.getElementById('restartBtn');

// מצב חפיסה
const tableGridEl = document.getElementById('tableGrid');
const deckCounterEl = document.getElementById('deckCounter');
const deckResetBtn = document.getElementById('deckResetBtn');
const overlayEl = document.getElementById('overlay');
const ovIdEl = document.getElementById('ovId');
const ovIconEl = document.getElementById('ovIcon');
const ovTitleEl = document.getElementById('ovTitle');
const ovDescEl = document.getElementById('ovDesc');
const ovCategoryEl = document.getElementById('ovCategory');
const overlayCloseBtn = document.getElementById('overlayClose');

let mode = null;
let drawOrder = [];
let drawIndex = 0;
let drawRevealed = false;
let flipped = new Set();
let lastFocusedCard = null;

function announce(text) {
  if (liveRegionEl) liveRegionEl.textContent = text;
}

function shuffled(n) {
  const arr = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function launchConfetti(count = 24) {
  const colors = ['#FF6B6B', '#FFE066', '#A855F7', '#06B6D4', '#86efac', '#FF8E53', '#f472b6'];
  // מכבדים משתמשים שביקשו לצמצם תנועה במערכת ההפעלה
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 6;
    piece.style.width = `${size}px`;
    piece.style.height = `${size}px`;
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.animation = `confettiFall ${Math.random() * 2 + 1.5}s ease-out ${Math.random() * 0.4}s forwards`;
    confettiLayerEl.appendChild(piece);
    setTimeout(() => piece.remove(), 3200);
  }
}

/* ---------- שמירה ---------- */

function persist() {
  if (!mode) return;
  if (mode === 'draw') {
    if (drawIndex >= TOTAL) {
      clearProgress();
      return;
    }
    saveProgress({ mode, order: drawOrder, index: drawIndex });
  } else {
    if (flipped.size === 0) {
      clearProgress();
      return;
    }
    saveProgress({ mode, flipped: [...flipped] });
  }
}

function refreshResumeCard() {
  const saved = loadProgress();
  if (!saved) {
    resumeCardEl.classList.add('hidden');
    return;
  }
  resumeModeEl.textContent = saved.mode === 'draw'
    ? `הגרלה - משימה ${(saved.index || 0) + 1} מתוך ${TOTAL}`
    : `לפי חפיסה - ${(saved.flipped || []).length} קלפים נחשפו`;
  resumeCardEl.classList.remove('hidden');
}

/* ---------- מצב הגרלה ---------- */

function renderDraw() {
  const num = drawIndex + 1;
  drawRevealed = false;

  drawCounterEl.textContent = `משימה ${num} מתוך ${TOTAL}`;
  taskBadgeEl.textContent = num;
  progressFillEl.style.width = `${(drawIndex / TOTAL) * 100}%`;
  progressFillEl.parentElement.setAttribute('aria-valuenow', String(drawIndex));

  mysteryCoverEl.classList.remove('hidden');
  taskDisplayEl.classList.add('hidden');
  taskDisplayEl.classList.remove('revealed');
  revealBtn.disabled = false;
  revealBtn.textContent = '👁️ הצג את המשימה!';
  nextBtn.textContent = num === TOTAL ? '🏁 לסיום' : '➡️ משימה הבאה';
}

function revealDrawTask() {
  if (drawRevealed) return;
  drawRevealed = true;

  const n = drawOrder[drawIndex];
  const [title, desc] = TASKS[n - 1];
  taskIconEl.textContent = categoryIcon(n);
  taskTitleEl.textContent = title;
  taskTextEl.textContent = desc;

  mysteryCoverEl.classList.add('hidden');
  taskDisplayEl.classList.remove('hidden');
  taskDisplayEl.classList.add('revealed');
  revealBtn.disabled = true;
  revealBtn.textContent = '✅ מוצג!';

  announce(`${title}. ${desc}`);
  launchConfetti();
}

function nextDrawTask() {
  drawIndex++;
  if (drawIndex >= TOTAL) {
    showFinish();
    persist();
    return;
  }
  renderDraw();
  persist();
  announce(`משימה ${drawIndex + 1} מתוך ${TOTAL}. לחצו להצגה`);
  revealBtn.focus();
}

function showFinish() {
  drawContentEl.classList.add('hidden');
  finishScreenEl.classList.remove('hidden');
  announce('כל הכבוד! סיימתן את כל המשימות');
  launchConfetti(80);
  restartBtn.focus();
}

function startDraw(saved) {
  mode = 'draw';
  drawOrder = saved?.order?.length === TOTAL ? saved.order : shuffled(TOTAL);
  drawIndex = Math.min(saved?.index ?? 0, TOTAL - 1);

  drawContentEl.classList.remove('hidden');
  finishScreenEl.classList.add('hidden');
  renderDraw();
  showScreen(drawScreenEl);
  persist();
  announce(`מצב הגרלה. משימה ${drawIndex + 1} מתוך ${TOTAL}`);
}

/* ---------- מצב חפיסה ---------- */

function buildDeck() {
  tableGridEl.innerHTML = '';
  for (let n = 1; n <= TOTAL; n++) {
    const id = cardIdentity(n);
    const [title] = TASKS[n - 1];

    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.style.transform = `rotate(${(Math.random() * 6 - 3).toFixed(1)}deg)`;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.dataset.n = String(n);
    card.setAttribute('aria-label', `${id.hebName} - משימה ${n}`);
    card.innerHTML = `
      <span class="card-face card-id ${id.color}">
        <span class="corner tl"><span class="r">${id.rank}</span><span class="s">${id.symbol}</span></span>
        <span class="center-symbol">${id.symbol}</span>
        <span class="center-rank">${id.rank}</span>
        <span class="heb-name">${id.hebName}</span>
        <span class="corner br"><span class="r">${id.rank}</span><span class="s">${id.symbol}</span></span>
      </span>
      <span class="card-face card-task">
        <span class="task-num">${n}</span>
        <span class="task-icon">${categoryIcon(n)}</span>
        <span class="task-title">${title}</span>
      </span>
    `;
    card.addEventListener('click', () => openCard(card, n));

    slot.appendChild(card);
    tableGridEl.appendChild(slot);
  }
}

function openCard(card, n) {
  const id = cardIdentity(n);
  const [title, desc] = TASKS[n - 1];

  if (!flipped.has(n)) {
    flipped.add(n);
    card.classList.add('flipped');
    card.setAttribute('aria-label', `${id.hebName} - ${title}`);
    updateDeckCounter();
    persist();
    if (flipped.size === TOTAL) launchConfetti(80);
  }

  lastFocusedCard = card;
  ovIdEl.textContent = id.joker ? id.hebName : `${id.hebName} (${id.rank}${id.symbol})`;
  ovIconEl.textContent = categoryIcon(n);
  ovTitleEl.textContent = title;
  ovDescEl.textContent = desc;
  ovCategoryEl.textContent = categoryName(n);
  overlayEl.classList.remove('hidden');
  overlayCloseBtn.focus();
  announce(`${id.hebName}. ${title}. ${desc}`);
  launchConfetti();
}

function closeOverlay() {
  const wasOpen = !overlayEl.classList.contains('hidden');
  overlayEl.classList.add('hidden');
  // מחזירים מיקוד לקלף רק אם שולחן הקלפים עדיין מוצג -
  // ביציאה לתפריט זה היה גורם לקפיצת גלילה למסך מוסתר
  if (wasOpen && !deckScreenEl.classList.contains('hidden')) lastFocusedCard?.focus();
}

function updateDeckCounter() {
  deckCounterEl.textContent = `${flipped.size} / ${TOTAL} קלפים נחשפו`;
}

function resetDeck() {
  flipped.clear();
  tableGridEl.querySelectorAll('.card.flipped').forEach((c) => {
    const n = Number(c.dataset.n);
    c.classList.remove('flipped');
    c.setAttribute('aria-label', `${cardIdentity(n).hebName} - משימה ${n}`);
  });
  updateDeckCounter();
  closeOverlay();
  persist();
  announce('כל הקלפים הוחזרו');
}

function startDeck(saved) {
  mode = 'deck';
  flipped = new Set(Array.isArray(saved?.flipped) ? saved.flipped : []);
  if (!tableGridEl.children.length) buildDeck();
  tableGridEl.querySelectorAll('.card').forEach((c) => {
    const n = Number(c.dataset.n);
    const isFlipped = flipped.has(n);
    c.classList.toggle('flipped', isFlipped);
    c.setAttribute('aria-label', isFlipped
      ? `${cardIdentity(n).hebName} - ${TASKS[n - 1][0]}`
      : `${cardIdentity(n).hebName} - משימה ${n}`);
  });
  updateDeckCounter();
  showScreen(deckScreenEl);
  persist();
  announce('מצב חפיסה. בחרו קלף מהחפיסה שלכן ולחצו עליו כאן');
}

/* ---------- ניווט בין מסכים ---------- */

function showScreen(el) {
  [startScreenEl, drawScreenEl, deckScreenEl].forEach((s) => s.classList.add('hidden'));
  el.classList.remove('hidden');
  window.scrollTo({ top: 0 });
}

function backToMenu() {
  mode = null;
  closeOverlay();
  showScreen(startScreenEl);
  refreshResumeCard();
}

function resumeSaved() {
  const saved = loadProgress();
  if (!saved) {
    refreshResumeCard();
    return;
  }
  if (saved.mode === 'draw') startDraw(saved);
  else startDeck(saved);
}

/* ---------- חיווט ---------- */

document.querySelectorAll('.mode-card[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === 'draw') startDraw(null);
    else startDeck(null);
  });
});

document.querySelectorAll('[data-action="menu"]').forEach((btn) => {
  btn.addEventListener('click', backToMenu);
});

resumeCardEl.addEventListener('click', resumeSaved);
revealBtn.addEventListener('click', revealDrawTask);
mysteryCoverEl.addEventListener('click', revealDrawTask);
nextBtn.addEventListener('click', nextDrawTask);
restartBtn.addEventListener('click', () => {
  clearProgress();
  startDraw(null);
});
deckResetBtn.addEventListener('click', resetDeck);
overlayCloseBtn.addEventListener('click', closeOverlay);
overlayEl.addEventListener('click', (e) => {
  if (e.target === overlayEl) closeOverlay();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlayEl.classList.contains('hidden')) closeOverlay();
});

refreshResumeCard();
