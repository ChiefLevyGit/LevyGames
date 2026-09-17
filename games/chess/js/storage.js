// שמירת משחק בדפדפן, כדי שרענון / נעילת מסך / שיחה נכנסת לא ימחקו את המשחק.
// האחסון עצמו עובר דרך שכבת האחסון המשותפת (js/storage.js בשורש), שמתייגת
// אותו לפרופיל הפעיל. הוולידציה נשארת כאן - היא ידע של השחמט, לא של השכבה.

import { read, write, clear, reportProgress } from '../../../js/storage.js?v=1';

const NS = 'chess.v1';
const GAME_ID = 'chess'; // חייב להיות זהה ל-id ב-js/games-data.js

function looksLikeBoard(board) {
  return Array.isArray(board) && board.length === 8 && board.every(
    (row) => Array.isArray(row) && row.length === 8,
  );
}

function isValidSave(data) {
  return !!data
    && data.v === 1
    && (data.mode === 'rules' || data.mode === 'free' || data.mode === 'ai')
    && !!data.state
    && looksLikeBoard(data.state.board)
    && (data.state.turn === 'w' || data.state.turn === 'b')
    && !!data.state.kings
    && Array.isArray(data.capturedByWhite)
    && Array.isArray(data.capturedByBlack);
}

export async function saveGame(data) {
  await write(NS, { v: 1, ...data });
  // דיווח ההתקדמות הוא נגזרת של השמירה - לכן הוא כאן, באותו מקום בדיוק
  await reportProgress(GAME_ID, { kind: 'session', hasSave: true });
}

export async function loadGame() {
  const data = await read(NS, null);
  if (!data) return null;
  if (!isValidSave(data)) {
    await clearGame();
    return null;
  }
  return data;
}

export async function clearGame() {
  await clear(NS);
  await reportProgress(GAME_ID, { kind: 'session', hasSave: false });
}
