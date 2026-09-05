// ה-?v= בסוף כל ייבוא הוא cache-busting: GitHub Pages מגיש עם max-age=600,
// ובלי זה משתמשת שכבר שיחקה מקבלת קבצים ישנים אחרי עדכון.
// כשמשנים קובץ JS/CSS - מעלים את המספר בכל המקומות (ראו Design.info/tasks.md).
import {
  createInitialState, getLegalMoves, makeMove, getFreeMoves, makeFreeMove, isInCheck,
} from './chessEngine.js?v=2';
import { pieceSVG, PIECE_NAMES_HE } from './pieceArt.js?v=2';
import { unlockAudio, playSelect, playMove, playCapture, playIllegal, playCheck, playWin } from './sounds.js?v=2';
import { saveGame, loadGame, clearGame } from './storage.js?v=2';

const startScreenEl = document.getElementById('startScreen');
const gameScreenEl = document.getElementById('gameScreen');
const boardEl = document.getElementById('board');
const piecesLayerEl = document.getElementById('piecesLayer');
const turnIndicatorEl = document.getElementById('turnIndicator');
const capturedTopEl = document.getElementById('capturedTop');
const capturedBottomEl = document.getElementById('capturedBottom');
const backBtn = document.getElementById('backBtn');
const resetBtn = document.getElementById('resetBtn');
const undoBtn = document.getElementById('undoBtn');
const resumeCardEl = document.getElementById('resumeCard');
const resumeModeEl = document.getElementById('resumeMode');
const liveRegionEl = document.getElementById('liveRegion');
const promotionModalEl = document.getElementById('promotionModal');
const promotionOptionsEl = document.getElementById('promotionOptions');
const endModalEl = document.getElementById('endModal');
const endEmojiEl = document.getElementById('endEmoji');
const endTitleEl = document.getElementById('endTitle');
const endSubtitleEl = document.getElementById('endSubtitle');
const playAgainBtn = document.getElementById('playAgainBtn');
const menuFromEndBtn = document.getElementById('menuFromEndBtn');

const FILES = 'abcdefgh';
const MAX_UNDO = 50;

let mode = null;
let gameState = null;
let selected = null;
let legalTargets = [];
let gameOver = false;
let capturedByWhite = [];
let capturedByBlack = [];
let undoStack = [];
let focusedSquare = { r: 7, c: 4 };

const squareEls = Array.from({ length: 8 }, () => Array(8).fill(null));
let pieceEls = [];

function kingdomName(color) {
  return color === 'w' ? 'ממלכת הזהב 👑' : 'ממלכת הליל 🌙';
}

// אותו שם בלי אמוג'י - לקוראי מסך ולהכרזות קוליות
function kingdomNamePlain(color) {
  return color === 'w' ? 'ממלכת הזהב' : 'ממלכת הליל';
}

function squareName(r, c) {
  return `${FILES[c]}${8 - r}`;
}

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function announce(text) {
  if (liveRegionEl) liveRegionEl.textContent = text;
}

/* ---------- בניית הלוח ---------- */

function initBoardDOM() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const div = document.createElement('div');
      div.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      div.dataset.r = r;
      div.dataset.c = c;
      div.setAttribute('role', 'button');
      div.setAttribute('tabindex', '-1');
      div.addEventListener('click', () => {
        focusedSquare = { r, c };
        updateRovingTabindex();
        onSquareClick(r, c);
      });
      div.addEventListener('keydown', (e) => onSquareKeydown(e, r, c));
      div.addEventListener('focus', () => {
        focusedSquare = { r, c };
        updateRovingTabindex();
      });
      boardEl.appendChild(div);
      squareEls[r][c] = div;
    }
  }
  updateRovingTabindex();
}

// רק משבצת אחת נמצאת בסדר ה-Tab; החצים מזיזים את המיקוד בתוך הלוח.
function updateRovingTabindex() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isFocused = r === focusedSquare.r && c === focusedSquare.c;
      squareEls[r][c].setAttribute('tabindex', isFocused ? '0' : '-1');
    }
  }
}

function moveFocus(dr, dc) {
  const r = Math.min(7, Math.max(0, focusedSquare.r + dr));
  const c = Math.min(7, Math.max(0, focusedSquare.c + dc));
  focusedSquare = { r, c };
  updateRovingTabindex();
  squareEls[r][c].focus();
}

function onSquareKeydown(e, r, c) {
  // הלוח מוצג תמיד משמאל לימין (direction: ltr ב-CSS), גם בדף RTL
  const moves = {
    ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
  };
  if (moves[e.key]) {
    e.preventDefault();
    moveFocus(...moves[e.key]);
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onSquareClick(r, c);
    return;
  }
  if (e.key === 'Escape' && selected) {
    e.preventDefault();
    deselect();
  }
}

/* ---------- ציור כלים ---------- */

function transformFor(r, c) {
  return `translate(${c * 100}%, ${r * 100}%)`;
}

function rebuildPiecesFromState(state) {
  piecesLayerEl.innerHTML = '';
  pieceEls = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p) createPieceEl(r, c, p.type, p.color);
    }
  }
}

function createPieceEl(r, c, type, color) {
  const div = document.createElement('div');
  div.className = 'piece';
  div.innerHTML = pieceSVG(type, color);
  div.style.transform = transformFor(r, c);
  piecesLayerEl.appendChild(div);
  const entry = { r, c, type, color, el: div };
  pieceEls.push(entry);
  return entry;
}

function movePieceEl(fromR, fromC, toR, toC) {
  const pe = pieceEls.find((p) => p.r === fromR && p.c === fromC);
  if (!pe) return;
  pe.r = toR;
  pe.c = toC;
  pe.el.style.transform = transformFor(toR, toC);
}

function removePieceEl(r, c) {
  const idx = pieceEls.findIndex((p) => p.r === r && p.c === c);
  if (idx === -1) return;
  const pe = pieceEls[idx];
  pe.el.classList.add('captured-fx');
  setTimeout(() => pe.el.remove(), 380);
  pieceEls.splice(idx, 1);
}

function swapPieceType(r, c, type, color) {
  const pe = pieceEls.find((p) => p.r === r && p.c === c);
  if (!pe) return;
  pe.type = type;
  pe.color = color;
  pe.el.innerHTML = pieceSVG(type, color);
  pe.el.classList.add('promote-fx');
  setTimeout(() => pe.el.classList.remove('promote-fx'), 500);
}

/* ---------- הדגשות ותוויות ---------- */

function clearAllSquareClasses() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      squareEls[r][c].className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
    }
  }
}

function describeSquare(r, c) {
  const piece = gameState ? gameState.board[r][c] : null;
  const base = piece
    ? `${squareName(r, c)}, ${PIECE_NAMES_HE[piece.type]} של ${kingdomNamePlain(piece.color)}`
    : `${squareName(r, c)}, משבצת ריקה`;

  const target = legalTargets.find((t) => t.r === r && t.c === c);
  if (target) return `${base} — ${target.capture ? 'אפשר לתפוס כאן' : 'אפשר לזוז לכאן'}`;
  if (selected && selected.r === r && selected.c === c) return `${base} — נבחר`;
  return base;
}

function refreshSquareLabels() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      squareEls[r][c].setAttribute('aria-label', describeSquare(r, c));
    }
  }
}

function renderHighlights() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      squareEls[r][c].classList.remove('selected', 'move-hint', 'capture-hint');
    }
  }
  if (selected) squareEls[selected.r][selected.c].classList.add('selected');
  legalTargets.forEach((t) => {
    squareEls[t.r][t.c].classList.add(t.capture ? 'capture-hint' : 'move-hint');
  });
  refreshSquareLabels();
}

function updateCheckHighlight() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) squareEls[r][c].classList.remove('in-check');
  }
  if (mode === 'rules' && !gameOver && isInCheck(gameState, gameState.turn)) {
    const kp = gameState.kings[gameState.turn];
    squareEls[kp.r][kp.c].classList.add('in-check');
  }
}

function miniIcon(piece) {
  return `<span class="mini-piece">${pieceSVG(piece.type, piece.color)}</span>`;
}

function updateCapturedTray() {
  capturedTopEl.innerHTML = capturedByBlack.map(miniIcon).join('');
  capturedBottomEl.innerHTML = capturedByWhite.map(miniIcon).join('');
}

function updateTurnIndicator(endText) {
  if (endText) {
    turnIndicatorEl.innerHTML = `<span class="turn-dot done"></span> ${endText}`;
    return;
  }
  const isWhite = gameState.turn === 'w';
  turnIndicatorEl.innerHTML =
    `<span class="turn-dot ${isWhite ? 'gold' : 'twilight'}"></span> תור ${kingdomName(gameState.turn)}`;
}

function updateUndoBtn() {
  undoBtn.disabled = undoStack.length === 0;
}

/* ---------- שמירה, שחזור וביטול מהלך ---------- */

function persist() {
  if (!mode || !gameState) return;
  if (gameOver) {
    clearGame();
    return;
  }
  saveGame({
    mode,
    state: gameState,
    capturedByWhite,
    capturedByBlack,
    undoStack: undoStack.slice(-MAX_UNDO),
  });
}

function pushUndoSnapshot() {
  undoStack.push({
    state: deepCopy(gameState),
    capturedByWhite: deepCopy(capturedByWhite),
    capturedByBlack: deepCopy(capturedByBlack),
  });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function undoMove() {
  if (!undoStack.length || !mode) return;
  const snapshot = undoStack.pop();
  gameState = snapshot.state;
  capturedByWhite = snapshot.capturedByWhite;
  capturedByBlack = snapshot.capturedByBlack;
  gameOver = false;
  selected = null;
  legalTargets = [];

  endModalEl.classList.add('hidden');
  promotionModalEl.classList.add('hidden');
  clearAllSquareClasses();
  rebuildPiecesFromState(gameState);
  renderHighlights();
  updateCheckHighlight();
  updateCapturedTray();
  updateTurnIndicator();
  updateUndoBtn();
  persist();
  playSelect();
  announce(`המהלך בוטל. תור ${kingdomNamePlain(gameState.turn)}`);
}

function refreshResumeCard() {
  if (!resumeCardEl) return;
  const saved = loadGame();
  if (!saved) {
    resumeCardEl.classList.add('hidden');
    return;
  }
  resumeModeEl.textContent = saved.mode === 'rules' ? 'עם חוקי הקסם' : 'משחק חופשי';
  resumeCardEl.classList.remove('hidden');
}

function resumeGame() {
  const saved = loadGame();
  if (!saved) {
    refreshResumeCard();
    return;
  }
  mode = saved.mode;
  gameState = saved.state;
  capturedByWhite = saved.capturedByWhite || [];
  capturedByBlack = saved.capturedByBlack || [];
  undoStack = Array.isArray(saved.undoStack) ? saved.undoStack : [];
  gameOver = false;
  selected = null;
  legalTargets = [];
  focusedSquare = { r: 7, c: 4 };

  clearAllSquareClasses();
  rebuildPiecesFromState(gameState);
  renderHighlights();
  updateCheckHighlight();
  updateCapturedTray();
  updateTurnIndicator();
  updateUndoBtn();
  updateRovingTabindex();

  startScreenEl.classList.add('hidden');
  gameScreenEl.classList.remove('hidden');
  endModalEl.classList.add('hidden');
  unlockAudio();
  announce(`המשחק הקודם נטען. תור ${kingdomNamePlain(gameState.turn)}`);
}

/* ---------- מהלכים ---------- */

function deselect() {
  selected = null;
  legalTargets = [];
  renderHighlights();
}

function selectSquare(r, c) {
  selected = { r, c };
  legalTargets = mode === 'rules' ? getLegalMoves(gameState, r, c) : getFreeMoves(gameState, r, c);
  renderHighlights();
  playSelect();
  const piece = gameState.board[r][c];
  announce(`נבחר ${PIECE_NAMES_HE[piece.type]} ב-${squareName(r, c)}. ${legalTargets.length} מהלכים אפשריים`);
}

function onSquareClick(r, c) {
  if (gameOver || !mode) return;
  unlockAudio();
  const piece = gameState.board[r][c];

  if (selected) {
    const target = legalTargets.find((m) => m.r === r && m.c === c);
    if (target) {
      const from = selected;
      if (mode === 'rules' && target.isPromotion) {
        openPromotionModal(gameState.turn, (chosenType) => {
          performRulesMove(from, { r, c }, chosenType);
        });
      } else if (mode === 'rules') {
        performRulesMove(from, { r, c }, null);
      } else {
        performFreeMove(from, { r, c });
      }
      return;
    }
    if (piece && piece.color === gameState.turn) {
      selectSquare(r, c);
    } else {
      deselect();
      playIllegal();
    }
    return;
  }

  if (piece && piece.color === gameState.turn) {
    selectSquare(r, c);
  }
}

const DRAW_REASONS = {
  stalemate: {
    title: 'פט - תיקו!',
    subtitle: 'אף אחת לא יכולה לזוז בלי להיכנס לשח - זה תיקו הוגן לשתיכן.',
  },
  drawMaterial: {
    title: 'תיקו - לא נשארו מספיק כלים',
    subtitle: 'עם הכלים שנשארו על הלוח אי אפשר לעשות מט לאף אחת. תיקו!',
  },
  drawRepetition: {
    title: 'תיקו - חזרנו לאותה עמדה 3 פעמים',
    subtitle: 'הלוח נראה בדיוק אותו דבר בפעם השלישית, אז המשחק נגמר בתיקו.',
  },
  drawFiftyMove: {
    title: 'תיקו - 50 מהלכים בלי כלום',
    subtitle: 'עברו 50 מהלכים בלי לתפוס כלי ובלי להזיז חיילת. תיקו!',
  },
};

function performRulesMove(from, to, promotionType) {
  const moverColor = gameState.turn;
  pushUndoSnapshot();
  const result = makeMove(gameState, from, to, promotionType);
  if (!result) {
    undoStack.pop();
    return;
  }
  const { state, capturedPiece, status, move } = result;

  if (move.isEnPassant) removePieceEl(from.r, to.c);
  else if (capturedPiece) removePieceEl(to.r, to.c);

  if (move.isCastle) {
    const rank = from.r;
    if (move.isCastle === 'K') movePieceEl(rank, 7, rank, 5);
    else movePieceEl(rank, 0, rank, 3);
  }

  movePieceEl(from.r, from.c, to.r, to.c);
  if (move.isPromotion) swapPieceType(to.r, to.c, promotionType || 'q', moverColor);

  if (capturedPiece) (moverColor === 'w' ? capturedByWhite : capturedByBlack).push(capturedPiece);

  gameState = state;
  selected = null;
  legalTargets = [];
  renderHighlights();
  updateCheckHighlight();
  updateCapturedTray();
  updateTurnIndicator();
  updateUndoBtn();

  if (capturedPiece) playCapture();
  else playMove();

  if (status === 'checkmate') {
    setTimeout(() => { playWin(); showEndModal('checkmate'); }, 260);
  } else if (DRAW_REASONS[status]) {
    setTimeout(() => showEndModal(status), 260);
  } else if (status === 'check') {
    setTimeout(() => playCheck(), 200);
    announce(`שח! תור ${kingdomNamePlain(gameState.turn)}`);
  } else {
    announce(`תור ${kingdomNamePlain(gameState.turn)}`);
  }

  persist();
}

function performFreeMove(from, to) {
  const moverColor = gameState.turn;
  pushUndoSnapshot();
  const result = makeFreeMove(gameState, from, to);
  if (!result) {
    undoStack.pop();
    return;
  }
  const { state, capturedPiece, status } = result;

  if (capturedPiece) {
    removePieceEl(to.r, to.c);
    (moverColor === 'w' ? capturedByWhite : capturedByBlack).push(capturedPiece);
  }
  movePieceEl(from.r, from.c, to.r, to.c);

  gameState = state;
  selected = null;
  legalTargets = [];
  renderHighlights();
  updateCapturedTray();
  updateTurnIndicator();
  updateUndoBtn();

  if (capturedPiece) playCapture();
  else playMove();

  if (status === 'kingCaptured') {
    setTimeout(() => { playWin(); showEndModal('kingCaptured', moverColor); }, 260);
  } else {
    announce(`תור ${kingdomNamePlain(gameState.turn)}`);
  }

  persist();
}

/* ---------- מודלים ---------- */

function openPromotionModal(color, callback) {
  promotionOptionsEl.innerHTML = '';
  ['q', 'r', 'b', 'n'].forEach((type) => {
    const btn = document.createElement('button');
    btn.className = 'promo-btn';
    btn.setAttribute('aria-label', PIECE_NAMES_HE[type]);
    btn.innerHTML = pieceSVG(type, color);
    btn.addEventListener('click', () => {
      promotionModalEl.classList.add('hidden');
      callback(type);
    });
    promotionOptionsEl.appendChild(btn);
  });
  promotionModalEl.classList.remove('hidden');
  promotionOptionsEl.firstElementChild?.focus();
}

function spawnConfetti(container) {
  const emojis = ['✨', '⭐', '🎉', '💫', '🌟'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.className = 'confetti-piece';
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 0.6}s`;
    s.style.fontSize = `${14 + Math.random() * 14}px`;
    container.appendChild(s);
    setTimeout(() => s.remove(), 2300);
  }
}

function showEndModal(reason, winnerColorOverride) {
  gameOver = true;
  let title = '';
  let subtitle = '';
  let emoji = '🎉';
  let celebrate = false;

  if (reason === 'checkmate') {
    const winner = gameState.turn === 'w' ? 'b' : 'w';
    title = `שח ומט! ניצחה ${kingdomName(winner)}`;
    subtitle = 'איזה מהלך מדהים! המלך השני לא הצליח לברוח.';
    emoji = '👑';
    celebrate = true;
  } else if (DRAW_REASONS[reason]) {
    title = DRAW_REASONS[reason].title;
    subtitle = DRAW_REASONS[reason].subtitle;
    emoji = '🤝';
  } else if (reason === 'kingCaptured') {
    title = `המלך נתפס! ניצחה ${kingdomName(winnerColorOverride)}`;
    subtitle = 'במשחק החופשי הכל מותר... והפעם זה עבד מצוין!';
    emoji = '🏆';
    celebrate = true;
  }

  // המחוון מאחורי המודל הציג עד עכשיו את התור של המפסידה
  updateTurnIndicator(title);
  updateCheckHighlight();
  clearGame();

  endEmojiEl.textContent = emoji;
  endTitleEl.textContent = title;
  endSubtitleEl.textContent = subtitle;
  endModalEl.querySelectorAll('.confetti-piece').forEach((e) => e.remove());
  endModalEl.classList.remove('hidden');
  announce(title);
  if (celebrate) spawnConfetti(endModalEl.querySelector('.modal-card'));
  playAgainBtn.focus();
}

/* ---------- מחזור חיי המשחק ---------- */

function startGame(chosenMode) {
  mode = chosenMode;
  gameState = createInitialState();
  selected = null;
  legalTargets = [];
  gameOver = false;
  capturedByWhite = [];
  capturedByBlack = [];
  undoStack = [];
  focusedSquare = { r: 7, c: 4 };

  clearAllSquareClasses();
  rebuildPiecesFromState(gameState);
  renderHighlights();
  updateCheckHighlight();
  updateCapturedTray();
  updateTurnIndicator();
  updateUndoBtn();
  updateRovingTabindex();

  startScreenEl.classList.add('hidden');
  gameScreenEl.classList.remove('hidden');
  endModalEl.classList.add('hidden');
  promotionModalEl.classList.add('hidden');
  unlockAudio();
  persist();
  announce(`משחק חדש התחיל. תור ${kingdomNamePlain(gameState.turn)}`);
}

function backToMenu() {
  mode = null;
  gameScreenEl.classList.add('hidden');
  startScreenEl.classList.remove('hidden');
  endModalEl.classList.add('hidden');
  promotionModalEl.classList.add('hidden');
  refreshResumeCard();
}

document.querySelectorAll('.mode-card[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => startGame(btn.dataset.mode));
});
backBtn.addEventListener('click', backToMenu);
resetBtn.addEventListener('click', () => startGame(mode));
undoBtn.addEventListener('click', undoMove);
playAgainBtn.addEventListener('click', () => startGame(mode));
menuFromEndBtn.addEventListener('click', backToMenu);
resumeCardEl?.addEventListener('click', resumeGame);

initBoardDOM();
refreshResumeCard();
