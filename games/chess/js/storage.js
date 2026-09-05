// שמירת משחק בדפדפן, כדי שרענון / נעילת מסך / שיחה נכנסת לא ימחקו את המשחק.

const KEY = 'levygames.chess.v1';

function looksLikeBoard(board) {
  return Array.isArray(board) && board.length === 8 && board.every(
    (row) => Array.isArray(row) && row.length === 8,
  );
}

function isValidSave(data) {
  return !!data
    && data.v === 1
    && (data.mode === 'rules' || data.mode === 'free')
    && !!data.state
    && looksLikeBoard(data.state.board)
    && (data.state.turn === 'w' || data.state.turn === 'b')
    && !!data.state.kings
    && Array.isArray(data.capturedByWhite)
    && Array.isArray(data.capturedByBlack);
}

export function saveGame(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, savedAt: Date.now(), ...data }));
  } catch (err) {
    // מצב פרטי / אחסון מלא - המשחק ימשיך לעבוד, פשוט בלי שמירה
    console.warn('שמירת המשחק נכשלה', err);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!isValidSave(data)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearGame() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* אין מה לעשות - ממשיכים */
  }
}
