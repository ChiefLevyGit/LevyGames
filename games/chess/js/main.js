import {
  createInitialState, getLegalMoves, makeMove, getFreeMoves, makeFreeMove, isInCheck,
} from './chessEngine.js';
import { pieceSVG } from './pieceArt.js';
import { unlockAudio, playSelect, playMove, playCapture, playIllegal, playCheck, playWin } from './sounds.js';

const startScreenEl = document.getElementById('startScreen');
const gameScreenEl = document.getElementById('gameScreen');
const boardEl = document.getElementById('board');
const piecesLayerEl = document.getElementById('piecesLayer');
const turnIndicatorEl = document.getElementById('turnIndicator');
const capturedTopEl = document.getElementById('capturedTop');
const capturedBottomEl = document.getElementById('capturedBottom');
const backBtn = document.getElementById('backBtn');
const resetBtn = document.getElementById('resetBtn');
const promotionModalEl = document.getElementById('promotionModal');
const promotionOptionsEl = document.getElementById('promotionOptions');
const endModalEl = document.getElementById('endModal');
const endEmojiEl = document.getElementById('endEmoji');
const endTitleEl = document.getElementById('endTitle');
const endSubtitleEl = document.getElementById('endSubtitle');
const playAgainBtn = document.getElementById('playAgainBtn');
const menuFromEndBtn = document.getElementById('menuFromEndBtn');

let mode = null;
let gameState = null;
let selected = null;
let legalTargets = [];
let gameOver = false;
let capturedByWhite = [];
let capturedByBlack = [];

const squareEls = Array.from({ length: 8 }, () => Array(8).fill(null));
let pieceEls = [];
let pieceIdCounter = 0;

function kingdomName(color) {
  return color === 'w' ? 'ממלכת הזהב 👑' : 'ממלכת הליל 🌙';
}

function initBoardDOM() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const div = document.createElement('div');
      div.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      div.dataset.r = r;
      div.dataset.c = c;
      div.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(div);
      squareEls[r][c] = div;
    }
  }
}

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
  const entry = { id: pieceIdCounter++, r, c, type, color, el: div };
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

function clearAllSquareClasses() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      squareEls[r][c].className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
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

function updateTurnIndicator() {
  const isWhite = gameState.turn === 'w';
  turnIndicatorEl.innerHTML =
    `<span class="turn-dot ${isWhite ? 'gold' : 'twilight'}"></span> תור ${kingdomName(gameState.turn)}`;
}

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

function performRulesMove(from, to, promotionType) {
  const moverColor = gameState.turn;
  const result = makeMove(gameState, from, to, promotionType);
  if (!result) return;
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

  if (capturedPiece) playCapture();
  else playMove();

  if (status === 'checkmate') {
    setTimeout(() => { playWin(); showEndModal('checkmate'); }, 260);
  } else if (status === 'stalemate') {
    setTimeout(() => showEndModal('stalemate'), 260);
  } else if (status === 'check') {
    setTimeout(() => playCheck(), 200);
  }
}

function performFreeMove(from, to) {
  const moverColor = gameState.turn;
  const result = makeFreeMove(gameState, from, to);
  if (!result) return;
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

  if (capturedPiece) playCapture();
  else playMove();

  if (status === 'kingCaptured') {
    const winnerColor = moverColor;
    setTimeout(() => { playWin(); showEndModal('kingCaptured', winnerColor); }, 260);
  }
}

function openPromotionModal(color, callback) {
  promotionOptionsEl.innerHTML = '';
  ['q', 'r', 'b', 'n'].forEach((type) => {
    const btn = document.createElement('button');
    btn.className = 'promo-btn';
    btn.innerHTML = pieceSVG(type, color);
    btn.addEventListener('click', () => {
      promotionModalEl.classList.add('hidden');
      callback(type);
    });
    promotionOptionsEl.appendChild(btn);
  });
  promotionModalEl.classList.remove('hidden');
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
  } else if (reason === 'stalemate') {
    title = 'פט - תיקו!';
    subtitle = 'אף אחת לא יכולה לזוז בלי להיכנס לשח - זה תיקו הוגן לשתיכן.';
    emoji = '🤝';
  } else if (reason === 'kingCaptured') {
    title = `המלך נתפס! ניצחה ${kingdomName(winnerColorOverride)}`;
    subtitle = 'במשחק החופשי הכל מותר... והפעם זה עבד מצוין!';
    emoji = '🏆';
    celebrate = true;
  }

  endEmojiEl.textContent = emoji;
  endTitleEl.textContent = title;
  endSubtitleEl.textContent = subtitle;
  endModalEl.querySelectorAll('.confetti-piece').forEach((e) => e.remove());
  endModalEl.classList.remove('hidden');
  if (celebrate) spawnConfetti(endModalEl.querySelector('.modal-card'));
}

function startGame(chosenMode) {
  mode = chosenMode;
  gameState = createInitialState();
  selected = null;
  legalTargets = [];
  gameOver = false;
  capturedByWhite = [];
  capturedByBlack = [];

  clearAllSquareClasses();
  rebuildPiecesFromState(gameState);
  renderHighlights();
  updateCheckHighlight();
  updateCapturedTray();
  updateTurnIndicator();

  startScreenEl.classList.add('hidden');
  gameScreenEl.classList.remove('hidden');
  endModalEl.classList.add('hidden');
  unlockAudio();
}

function backToMenu() {
  mode = null;
  gameScreenEl.classList.add('hidden');
  startScreenEl.classList.remove('hidden');
  endModalEl.classList.add('hidden');
}

document.querySelectorAll('.mode-card').forEach((btn) => {
  btn.addEventListener('click', () => startGame(btn.dataset.mode));
});
backBtn.addEventListener('click', backToMenu);
resetBtn.addEventListener('click', () => startGame(mode));
playAgainBtn.addEventListener('click', () => startGame(mode));
menuFromEndBtn.addEventListener('click', backToMenu);

initBoardDOM();
