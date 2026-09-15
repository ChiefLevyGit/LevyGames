// AI פשוט ליריבה קלה ונעימה, לא לתחרות אמיתית: חיפוש negamax קצר + alpha-beta,
// ואז בחירה אקראית מבין המהלכים שכמעט שווים לטוב ביותר - כדי שהיא גם תטעה כמו כולן.
import { getAllLegalMoves, makeMove, isInCheck } from './chessEngine.js?v=3';

const PIECE_VALUES = { p: 1, n: 3.1, b: 3.3, r: 5, q: 9, k: 0 };

// בונוס קל לשליטה במרכז הלוח, כדי שהמחשב לא ידחוף חיילי קצה סתם
const CENTER_BONUS = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 3, 3, 2, 1, 0],
  [0, 1, 2, 3, 3, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const SEARCH_DEPTH = 2;
const RANDOMNESS_MARGIN = 0.75; // בפאונים - טווח שנחשב "כמעט אותו דבר" לצורך גיוון

function evaluate(state, color) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] + CENTER_BONUS[r][c] * 0.03;
      score += piece.color === color ? value : -value;
    }
  }
  return score;
}

function negamax(state, depth, alpha, beta, color) {
  if (depth === 0) return evaluate(state, color);
  const moves = getAllLegalMoves(state, color);
  if (moves.length === 0) return isInCheck(state, color) ? -1000 : 0;

  let best = -Infinity;
  for (const { from, to } of moves) {
    const result = makeMove(state, from, to, 'q');
    if (!result) continue;
    const score = -negamax(result.state, depth - 1, -beta, -alpha, result.state.turn);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// מחזיר { from, to, promotionType } עבור המהלך שהמחשב בחר, או null אם אין לו מהלך (המשחק כבר נגמר)
export function chooseAIMove(state, color) {
  const moves = getAllLegalMoves(state, color);
  if (!moves.length) return null;

  let best = -Infinity;
  const scored = moves.map(({ from, to, move }) => {
    const result = makeMove(state, from, to, 'q');
    const score = -negamax(result.state, SEARCH_DEPTH - 1, -Infinity, Infinity, result.state.turn);
    if (score > best) best = score;
    return { from, to, move, score };
  });

  const candidates = scored.filter((m) => m.score >= best - RANDOMNESS_MARGIN);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    from: chosen.from,
    to: chosen.to,
    promotionType: chosen.move.isPromotion ? 'q' : null,
  };
}
