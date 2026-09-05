// מנוע השחמט - לוגיקה טהורה, בלי נגיעה ב-DOM.
// ייצוג הלוח: מערך 8x8, שורה 0 = דרגה 8 (למעלה, שחור), שורה 7 = דרגה 1 (למטה, לבן).
// עמודה 0 = טור a ... עמודה 7 = טור h.

const DIRS_DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const DIRS_STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function opponent(color) {
  return color === 'w' ? 'b' : 'w';
}

export function createInitialState() {
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: 'b' };
    board[1][c] = { type: 'p', color: 'b' };
    board[6][c] = { type: 'p', color: 'w' };
    board[7][c] = { type: back[c], color: 'w' };
  }
  return {
    board,
    turn: 'w',
    castling: { w: { k: true, q: true }, b: { k: true, q: true } },
    enPassant: null,
    history: [],
    kings: { w: { r: 7, c: 4 }, b: { r: 0, c: 4 } },
  };
}

function cloneState(state) {
  return {
    board: state.board.map((row) => row.map((p) => (p ? { ...p } : null))),
    turn: state.turn,
    castling: { w: { ...state.castling.w }, b: { ...state.castling.b } },
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    history: state.history.slice(),
    kings: { w: { ...state.kings.w }, b: { ...state.kings.b } },
  };
}

function slide(board, r, c, color, dirs) {
  const moves = [];
  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push({ r: nr, c: nc });
      } else {
        if (target.color !== color) moves.push({ r: nr, c: nc, capture: true });
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

// מהלכים פסאודו-חוקיים (בלי בדיקת שח על עצמו), כולל דגלי הצרחה/אכילת דרך/הכתרה.
function pseudoMoves(state, r, c) {
  const { board } = state;
  const piece = board[r][c];
  if (!piece) return [];
  const { type, color } = piece;
  const moves = [];

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;
    const oneStep = r + dir;
    if (inBounds(oneStep, c) && !board[oneStep][c]) {
      moves.push({ r: oneStep, c, isPromotion: oneStep === promoRow });
      const twoStep = r + dir * 2;
      if (r === startRow && !board[twoStep][c]) {
        moves.push({ r: twoStep, c, doubleStep: true });
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (target && target.color !== color) {
        moves.push({ r: nr, c: nc, capture: true, isPromotion: nr === promoRow });
      } else if (!target && state.enPassant && state.enPassant.r === nr && state.enPassant.c === nc) {
        moves.push({ r: nr, c: nc, capture: true, isEnPassant: true });
      }
    }
  } else if (type === 'n') {
    for (const [dr, dc] of KNIGHT_OFFSETS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (!target) moves.push({ r: nr, c: nc });
      else if (target.color !== color) moves.push({ r: nr, c: nc, capture: true });
    }
  } else if (type === 'b') {
    moves.push(...slide(board, r, c, color, DIRS_DIAGONAL));
  } else if (type === 'r') {
    moves.push(...slide(board, r, c, color, DIRS_STRAIGHT));
  } else if (type === 'q') {
    moves.push(...slide(board, r, c, color, [...DIRS_DIAGONAL, ...DIRS_STRAIGHT]));
  } else if (type === 'k') {
    for (const [dr, dc] of [...DIRS_DIAGONAL, ...DIRS_STRAIGHT]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (!target) moves.push({ r: nr, c: nc });
      else if (target.color !== color) moves.push({ r: nr, c: nc, capture: true });
    }
    const rights = state.castling[color];
    const rank = color === 'w' ? 7 : 0;
    if (r === rank && c === 4 && !isSquareAttacked(board, r, c, opponent(color))) {
      if (rights.k && !board[rank][5] && !board[rank][6] && board[rank][7]?.type === 'r' &&
          !isSquareAttacked(board, rank, 5, opponent(color)) && !isSquareAttacked(board, rank, 6, opponent(color))) {
        moves.push({ r: rank, c: 6, isCastle: 'K' });
      }
      if (rights.q && !board[rank][3] && !board[rank][2] && !board[rank][1] && board[rank][0]?.type === 'r' &&
          !isSquareAttacked(board, rank, 3, opponent(color)) && !isSquareAttacked(board, rank, 2, opponent(color))) {
        moves.push({ r: rank, c: 2, isCastle: 'Q' });
      }
    }
  }
  return moves;
}

export function isSquareAttacked(board, r, c, byColor) {
  const pawnDir = byColor === 'w' ? 1 : -1; // מהיכן פאון של byColor היה תוקף את (r,c)
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir;
    const pc = c + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }
  for (const [dr, dc] of [...DIRS_DIAGONAL, ...DIRS_STRAIGHT]) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'k') return true;
    }
  }
  for (const [dr, dc] of DIRS_DIAGONAL) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  for (const [dr, dc] of DIRS_STRAIGHT) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

function applyMoveToBoard(state, from, to, move, promotionType) {
  const next = cloneState(state);
  const piece = next.board[from.r][from.c];
  const movingColor = piece.color;

  if (move.isEnPassant) {
    next.board[from.r][to.c] = null; // הפאון שנאכל עומד באותה שורה כמו המקור
  }
  if (move.isCastle) {
    const rank = from.r;
    if (move.isCastle === 'K') {
      next.board[rank][5] = next.board[rank][7];
      next.board[rank][7] = null;
    } else {
      next.board[rank][3] = next.board[rank][0];
      next.board[rank][0] = null;
    }
  }

  next.board[to.r][to.c] = piece;
  next.board[from.r][from.c] = null;

  if (move.isPromotion) {
    next.board[to.r][to.c] = { type: promotionType || 'q', color: movingColor };
  }

  if (piece.type === 'k') {
    next.kings[movingColor] = { r: to.r, c: to.c };
    next.castling[movingColor].k = false;
    next.castling[movingColor].q = false;
  }
  if (piece.type === 'r') {
    const rank = movingColor === 'w' ? 7 : 0;
    if (from.r === rank && from.c === 0) next.castling[movingColor].q = false;
    if (from.r === rank && from.c === 7) next.castling[movingColor].k = false;
  }
  // אם צריח נאכל בפינתו המקורית - מבטלים את זכות ההצרחה של היריב מאותו צד
  const oppColor = opponent(movingColor);
  const oppRank = oppColor === 'w' ? 7 : 0;
  if (to.r === oppRank && to.c === 0) next.castling[oppColor].q = false;
  if (to.r === oppRank && to.c === 7) next.castling[oppColor].k = false;

  next.enPassant = move.doubleStep ? { r: (from.r + to.r) / 2, c: from.c } : null;
  next.turn = oppColor;

  return next;
}

export function getLegalMoves(state, r, c) {
  const piece = state.board[r][c];
  if (!piece) return [];
  const moves = pseudoMoves(state, r, c);
  return moves.filter((m) => {
    const next = applyMoveToBoard(state, { r, c }, { r: m.r, c: m.c }, m, 'q');
    const kingPos = next.kings[piece.color];
    return !isSquareAttacked(next.board, kingPos.r, kingPos.c, opponent(piece.color));
  });
}

export function getAllLegalMoves(state, color) {
  const result = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color) {
        for (const m of getLegalMoves(state, r, c)) {
          result.push({ from: { r, c }, to: { r: m.r, c: m.c }, move: m });
        }
      }
    }
  }
  return result;
}

export function isInCheck(state, color) {
  const kingPos = state.kings[color];
  return isSquareAttacked(state.board, kingPos.r, kingPos.c, opponent(color));
}

export function makeMove(state, from, to, promotionType) {
  const legal = getLegalMoves(state, from.r, from.c);
  const move = legal.find((m) => m.r === to.r && m.c === to.c);
  if (!move) return null;

  const capturedPiece = move.isEnPassant
    ? state.board[from.r][to.c]
    : state.board[to.r][to.c];
  const movingPiece = state.board[from.r][from.c];

  const next = applyMoveToBoard(state, from, to, move, promotionType);
  next.history = [...state.history, {
    from, to, piece: movingPiece, captured: capturedPiece || null,
    isCastle: move.isCastle || null, isEnPassant: !!move.isEnPassant, isPromotion: !!move.isPromotion,
  }];

  const opponentColor = next.turn;
  const opponentMoves = getAllLegalMoves(next, opponentColor);
  const inCheck = isInCheck(next, opponentColor);
  let status = 'playing';
  if (opponentMoves.length === 0) status = inCheck ? 'checkmate' : 'stalemate';
  else if (inCheck) status = 'check';

  return { state: next, capturedPiece: capturedPiece || null, status, move };
}

// --- מצב חופשי: בלי כללי תנועה, כל כלי לכל משבצת (חוץ מכלי משלך) ---

export function getFreeMoves(state, r, c) {
  const piece = state.board[r][c];
  if (!piece) return [];
  const moves = [];
  for (let nr = 0; nr < 8; nr++) {
    for (let nc = 0; nc < 8; nc++) {
      if (nr === r && nc === c) continue;
      const target = state.board[nr][nc];
      if (target && target.color === piece.color) continue;
      moves.push({ r: nr, c: nc, capture: !!target });
    }
  }
  return moves;
}

export function makeFreeMove(state, from, to) {
  const piece = state.board[from.r][from.c];
  if (!piece) return null;
  const target = state.board[to.r][to.c];
  if (target && target.color === piece.color) return null;

  const next = cloneState(state);
  next.board[to.r][to.c] = piece;
  next.board[from.r][from.c] = null;
  if (piece.type === 'k') next.kings[piece.color] = { r: to.r, c: to.c };
  next.enPassant = null;
  next.turn = opponent(piece.color);
  next.history = [...state.history, { from, to, piece, captured: target || null }];

  const kingCaptured = target && target.type === 'k';
  const status = kingCaptured ? 'kingCaptured' : 'playing';

  return { state: next, capturedPiece: target || null, status, move: { r: to.r, c: to.c, capture: !!target } };
}
