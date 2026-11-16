// צלילי UI של דף הבית - מיפוי לפי Design.info/sound-mapping.md.
// הצלילים עצמם מסונתזים ב-js/synth.js; כאן רק חיווט ה-DOM של הפורטל.
// לא נוגעים בסאונד של המשחקים עצמם - לכל אחד מערכת משלו.

import { playSynth, isMuted, setMuted } from './synth.js?v=1';

// עיכוב לפני ניווט בפועל, כדי שהצליל יספיק להישמע לפני שהדף מתחלף
const NAV_DELAY_MS = 260;

// קישור שמחליף דף (ולא רק גולל לעוגן) צריך עיכוב קצר, אחרת הצליל נחתך
const leavesPage = (link) => new URL(link.href, location.href).pathname !== location.pathname;

// --- ניווט עליון ---
document.querySelectorAll('.nav-link').forEach((link) => {
  if (leavesPage(link)) wireNavigatingLink(link, 'nav');
  else link.addEventListener('click', () => playSynth('nav'));
});

// --- Hero CTA + קישור ההישגים ---
document.querySelector('.hero .btn-primary')?.addEventListener('click', () => playSynth('fanfare'));
wireNavigatingLink(document.getElementById('heroAchievements'), 'select');

// --- מתג השתקה ---
const muteBtn = document.getElementById('muteToggle');

function paintMute(m) {
  if (!muteBtn) return;
  muteBtn.setAttribute('aria-pressed', String(m));
  muteBtn.textContent = m ? '🔇' : '🔊';
  muteBtn.title = m ? 'הפעלת צלילים' : 'השתקת צלילים';
}

if (muteBtn) {
  isMuted().then(paintMute);
  muteBtn.addEventListener('click', async () => {
    const next = !(await isMuted());
    await setMuted(next);
    paintMute(next);
    if (!next) playSynth('unmute');
  });
}

// --- כרטיסי המשחקים: ריחוף, הוראות, כניסה ---
const HOVER_GAP_MS = 120;
let lastHover = 0;

function wireNavigatingLink(link, sound) {
  if (!link) return;
  link.addEventListener('click', (e) => {
    // Ctrl/Cmd/אמצעי = טאב חדש - לא מעכבים ולא חוטפים
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    playSynth(sound);
    setTimeout(() => { window.location.href = link.href; }, NAV_DELAY_MS);
  });
}

// הכרטיסים נבנים ב-js/hub.js אחרי קריאת התקדמות (async), ולכן אי אפשר לחווט
// אותם בטעינה - מחווטים כשהפורטל מכריז שהגריד מוכן.
function wireGameCards() {
  document.querySelectorAll('.game-card').forEach((card) => {
    if (card.dataset.soundWired === '1') return; // לא לחווט פעמיים אחרי רינדור מחדש
    card.dataset.soundWired = '1';
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return; // במגע הריחוף מגיע רגע לפני הלחיצה
      const now = performance.now();
      if (now - lastHover < HOVER_GAP_MS) return;
      lastHover = now;
      playSynth('hover');
    });
    wireNavigatingLink(card.querySelector('.btn-ghost'), 'select');
    wireNavigatingLink(card.querySelector('.btn-primary'), 'launch');
  });
}

document.addEventListener('levygames:cards-rendered', wireGameCards);
wireGameCards(); // אם הגריד כבר נבנה לפני שהמודול הזה נטען

// --- מיוצאים לשימוש מהמודולים האחרים ---
export function playCelebrate() { playSynth('celebrate'); } // משימת היום
export function playSuccess() { playSynth('success'); }     // רשימת משאלות
export function playUnlock() { playSynth('unlock'); }       // הישג נפתח
export function playHello() { playSynth('hello'); }         // פרופיל / כניסה
