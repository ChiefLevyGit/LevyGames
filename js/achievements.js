// הישגים - פונקציה טהורה מעל מה שכבר נשמר (התקדמות + stats.v1).
// אין כאן מצב: הישג "נפתח" כשהנתונים מראים שהוא הושג, ולכן אי אפשר שיתנתק
// מהמציאות. הדבר היחיד שנשמר בנפרד הוא אילו הישגים כבר *חגגנו* (stats-page.js).

const DAY_MS = 86_400_000;

// רצפים מחושבים על מפתחות תאריך מקומיים 'YYYY-MM-DD'
function dayIndex(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function streaks(days, todayKey) {
  const idx = Object.keys(days || {})
    .filter((k) => days[k]?.ms > 0 || days[k]?.games?.length)
    .map(dayIndex)
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  idx.forEach((d, i) => {
    run = i && d === idx[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  // רצף נוכחי: נגמר היום או אתמול (עוד לא שיחקה היום - הרצף עדיין חי)
  const today = dayIndex(todayKey);
  const last = idx[idx.length - 1];
  const current = last === today || last === today - 1 ? run : 0;
  return { current, best, activeDays: idx.length };
}

export function summarize(progress, stats, games, todayKey) {
  const s = stats || { games: {}, days: {}, records: [] };
  const played = new Set([...Object.keys(s.games || {}), ...Object.keys(progress || {})]);
  const known = games.filter((g) => played.has(g.id));
  const levels = Object.values(progress || {})
    .filter((r) => r.kind === 'levels')
    .reduce((sum, r) => sum + (Number(r.done) || 0), 0);
  const finished = Object.values(progress || {})
    .filter((r) => r.kind === 'levels' && r.total > 0 && r.done >= r.total).length;
  const bestScores = Object.values(progress || {}).filter((r) => r.kind === 'score' && r.best > 0).length;
  const totalMs = Object.values(s.games || {}).reduce((sum, g) => sum + (g.ms || 0), 0);
  return {
    playedCount: known.length,
    gamesCount: games.length,
    levels,
    finished,
    bestScores,
    records: (s.records || []).length,
    totalMs,
    ...streaks(s.days, todayKey),
  };
}

// הסדר כאן = הסדר בגריד. max = היעד; cur נחתך ל-max.
const DEFS = [
  { id: 'first',    emoji: '🎮', title: 'צעד ראשון',      desc: 'שיחקת במשחק הראשון',          max: 1,   cur: (x) => x.playedCount },
  { id: 'explorer', emoji: '🧭', title: 'חוקרת',          desc: 'ניסית את כל המשחקים',          max: (x) => x.gamesCount, cur: (x) => x.playedCount },
  { id: 'levels10', emoji: '🪜', title: '10 שלבים',        desc: 'עברת 10 שלבים בסך הכל',       max: 10,  cur: (x) => x.levels },
  { id: 'record',   emoji: '🏆', title: 'שוברת שיאים',     desc: 'קבעת שיא או עלית שלב',        max: 1,   cur: (x) => Math.max(x.records, x.bestScores) },
  { id: 'streak3',  emoji: '🔥', title: '3 ימים ברצף',     desc: 'שיחקת שלושה ימים רצופים',      max: 3,   cur: (x) => x.best },
  { id: 'finisher', emoji: '👑', title: 'סיימתי משחק!',    desc: 'השלמת את כל השלבים במשחק',     max: 1,   cur: (x) => x.finished },
  { id: 'hour',     emoji: '⏰', title: 'שעה של כיף',      desc: 'שעה של משחק בסך הכל',         max: 60,  cur: (x) => Math.floor(x.totalMs / 60_000) },
  { id: 'streak7',  emoji: '🌟', title: 'שבוע של כיף',     desc: 'שבעה ימים רצופים',             max: 7,   cur: (x) => x.best },
  { id: 'days10',   emoji: '📅', title: '10 ימי משחק',     desc: 'שיחקת ב-10 ימים שונים',        max: 10,  cur: (x) => x.activeDays },
  { id: 'levels50', emoji: '🏔️', title: '50 שלבים',        desc: 'עברת 50 שלבים בסך הכל',       max: 50,  cur: (x) => x.levels },
];

export function computeAchievements(summary) {
  return DEFS.map((def) => {
    const max = typeof def.max === 'function' ? def.max(summary) : def.max;
    const cur = Math.min(max, def.cur(summary) || 0);
    return { id: def.id, emoji: def.emoji, title: def.title, desc: def.desc, cur, max, unlocked: max > 0 && cur >= max };
  });
}
