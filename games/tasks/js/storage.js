// שמירת התקדמות בין סשנים - סבב משימות באמצע לא נמחק ברענון.
// האחסון עובר דרך שכבת האחסון המשותפת (js/storage.js בשורש), שמתייגת אותו
// לפרופיל הפעיל. הוולידציה נשארת כאן - היא ידע של המשחק הזה.

import { read, write, clear, reportProgress } from '../../../js/storage.js?v=1';

const NS = 'tasks.v1';
const GAME_ID = 'tasks'; // חייב להיות זהה ל-id ב-js/games-data.js

export async function saveProgress(data) {
  await write(NS, { v: 1, ...data });
  // דיווח ההתקדמות הוא נגזרת של השמירה - לכן הוא כאן, באותו מקום בדיוק
  await reportProgress(GAME_ID, { kind: 'session', hasSave: true });
}

export async function loadProgress() {
  const data = await read(NS, null);
  if (!data || data.v !== 1) return null;
  if (data.mode !== 'draw' && data.mode !== 'deck') return null;
  return data;
}

export async function clearProgress() {
  await clear(NS);
  await reportProgress(GAME_ID, { kind: 'session', hasSave: false });
}
