// צלילי UI של דף הבית - מיפוי לפי Design.info/sound-mapping.md.
// הנכסים עצמם מגיעים מ-js/sfx.js; כאן רק חיווט ה-DOM של הפורטל.
// לא נוגעים בסאונד של שחמט/Space Invaders עצמם - לשניהם מערכת סאונד ייעודית משלהם.

import { jdSound, localSound, play } from './sfx.js?v=1';

const sfx = {
  cursor: jdSound('Cursor - 1', 0.4),
  select: jdSound('Select - 2', 0.5),
  popupOpen: jdSound('Popup Open - 1', 0.55),
  chestOpen: localSound('chest-open.mp3', 0.6),
  enterGame: localSound('sound-with-a-choice-of-one-of-the-items-in-the-menu-ui.mp3', 0.6),
};

// --- ניווט עליון (#1-3) ---
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => play(sfx.cursor));
});

// --- Hero CTA (#4) ---
document.querySelector('.hero .btn-primary')?.addEventListener('click', () => play(sfx.chestOpen));

// --- כרטיסי המשחקים (#5-10): הוראות = Select, שחקי = צליל כניסה אחיד לכל המשחקים ---
// עיכוב קצר לפני ניווט בפועל, כדי שהצליל יספיק להישמע במלואו לפני שהדף מתחלף
const NAV_DELAY_MS = 180;

function wireNavigatingLink(link, sound) {
  if (!link || !sound) return;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    play(sound);
    setTimeout(() => { window.location.href = link.href; }, NAV_DELAY_MS);
  });
}

// הכרטיסים נבנים ב-js/hub.js אחרי קריאת התקדמות (async), ולכן אי אפשר לחווט
// אותם בטעינה - מחווטים כשהפורטל מכריז שהגריד מוכן.
function wireGameCards() {
  document.querySelectorAll('.game-card').forEach((card) => {
    if (card.dataset.soundWired === '1') return; // לא לחווט פעמיים אחרי רינדור מחדש
    card.dataset.soundWired = '1';
    wireNavigatingLink(card.querySelector('.btn-ghost'), sfx.select);
    wireNavigatingLink(card.querySelector('.btn-primary'), sfx.enterGame);
  });
}

document.addEventListener('levygames:cards-rendered', wireGameCards);
wireGameCards(); // אם הגריד כבר נבנה לפני שהמודול הזה נטען

// --- משימת היום (#11) ורשימת משאלות (#12) - מיוצאים לשימוש מהמודולים האחרים ---
export function playCelebrate() { play(sfx.chestOpen); }
export function playSuccess() { play(sfx.popupOpen); }
