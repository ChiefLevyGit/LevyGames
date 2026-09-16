// צלילי UI לכל הכפתורים בהב הראשי - מיפוי לפי Design.info/sound-mapping.md.
// לא נוגעים בסאונד של שחמט/Space Invaders עצמם - לשניהם יש כבר מערכת סאונד ייעודית משלהם.

const JD_PACK = 'assets/JDSherbert - Ultimate UI SFX Pack (FREE)/Mono/mp3/JDSherbert - Ultimate UI SFX Pack - ';

function makeAudio(url, volume) {
  const audio = new Audio(url);
  audio.volume = volume;
  return audio;
}
function jdSound(name, volume = 0.5) {
  return makeAudio(encodeURI(`${JD_PACK}${name}.mp3`), volume);
}
function localSound(filename, volume = 0.5) {
  return makeAudio(encodeURI(`assets/${filename}`), volume);
}

const sfx = {
  cursor: jdSound('Cursor - 1', 0.4),
  select: jdSound('Select - 2', 0.5),
  popupOpen: jdSound('Popup Open - 1', 0.55),
  chestOpen: localSound('chest-open.mp3', 0.6),
  enterGame: localSound('sound-with-a-choice-of-one-of-the-items-in-the-menu-ui.mp3', 0.6),
};

function play(audio) {
  // משכפלים כל פעם כדי שקליקים מהירים ברצף לא יחתכו צליל קודם שעוד מתנגן
  const clone = audio.cloneNode();
  clone.volume = audio.volume;
  clone.play().catch(() => {}); // מתעלמים אם הדפדפן חוסם ניגון אוטומטי מסיבה כלשהי
}

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

// כפתור הכניסה למשחק (#6/#8/#10) - אותו צליל בחירה לכל המשחקים
document.querySelectorAll('.game-card').forEach((card) => {
  wireNavigatingLink(card.querySelector('.btn-ghost'), sfx.select);
  wireNavigatingLink(card.querySelector('.btn-primary'), sfx.enterGame);
});

// --- משימת היום (#11) ורשימת משאלות (#12) - מיוצאים לשימוש מהמודולים האחרים ---
export function playCelebrate() { play(sfx.chestOpen); }
export function playSuccess() { play(sfx.popupOpen); }
