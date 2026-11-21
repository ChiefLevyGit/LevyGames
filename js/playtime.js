// שעון זמן משחק. נטען אוטומטית מ-js/storage.js בכל דף משחק (games/<x>/),
// כך שאף משחק לא צריך לדעת שהוא קיים.
//
// סופרים רק זמן *אמיתי*: הטאב גלוי, והייתה נגיעה/מקש/עכבר בשתי הדקות האחרונות.
// טאב שנשכח פתוח על הטאבלט לא ייצור "5 שעות משחק".

import { GAMES } from './games-data.js?v=13';

const TICK_MS = 15_000;
const FLUSH_EVERY_TICKS = 2;       // כתיבה לאחסון כל 30 שניות
const IDLE_AFTER_MS = 120_000;

// תיקיית המשחק -> id, לפי playUrl (Little-detective-new -> little-detective)
function detectGameId() {
  const folder = location.pathname.match(/\/games\/([^/]+)\//)?.[1];
  if (!folder) return null;
  const game = GAMES.find((g) => g.playUrl.split('/')[1] === decodeURIComponent(folder));
  return game?.id || null;
}

export function start({ updateStats, dayKey }) {
  const gameId = detectGameId();
  if (!gameId) return;

  const now = () => Date.now();
  let lastInput = now();
  let lastTick = now();
  let pending = 0;
  let ticks = 0;

  const touchGame = (stats) => {
    const g = stats.games[gameId] || (stats.games[gameId] = { sessions: 0, ms: 0, firstPlayed: now() });
    g.lastPlayed = now();
    const day = stats.days[dayKey()] || (stats.days[dayKey()] = { ms: 0, games: [] });
    if (!day.games.includes(gameId)) day.games.push(gameId);
    return { g, day };
  };

  // פתיחת משחק = סשן, גם אם יצאו אחרי שנייה
  updateStats((stats) => { touchGame(stats).g.sessions += 1; });

  const accrue = () => {
    const t = now();
    const active = document.visibilityState === 'visible' && t - lastInput < IDLE_AFTER_MS;
    if (active) pending += t - lastTick;
    lastTick = t;
  };

  const flush = () => {
    accrue();
    if (pending < 1000) return;
    const ms = pending;
    pending = 0;
    updateStats((stats) => {
      const { g, day } = touchGame(stats);
      g.ms += ms;
      day.ms += ms;
    });
  };

  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((type) => {
    window.addEventListener(type, () => { lastInput = now(); }, { passive: true, capture: true });
  });

  setInterval(() => {
    accrue();
    ticks += 1;
    if (ticks % FLUSH_EVERY_TICKS === 0) flush();
  }, TICK_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else { lastTick = now(); lastInput = now(); } // חזרה לטאב - לא סופרים את זמן ההיעדרות
  });
  window.addEventListener('pagehide', flush);
}
