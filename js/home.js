// עמוד הבית: שואל "איך קוראים לך" בכניסה הראשונה, מברך את הפרופיל,
// ומחווט צלילים לשתי הדלתות. אין כאן מצב משלו.
import { ensureProfile } from './profile-gate.js?v=2';
import { getActiveProfile } from './profiles.js?v=2';
import { playSynth } from './synth.js?v=1';

const title = document.getElementById('heroTitle');

function greet(profile) {
  if (!title || !profile) return;
  // textContent - השם הוא קלט של המשתמשת
  title.textContent = `${profile.emoji} ${profile.name}, מה בא לך עכשיו?`;
}

document.querySelectorAll('.door').forEach((door) => {
  door.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') playSynth('hover'); });
  door.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    door.classList.add('opening');
    playSynth('launch');
    setTimeout(() => { window.location.href = door.href; }, 380);
  });
});

ensureProfile().then(greet).catch((err) => console.warn('פרופיל לא נטען', err));

document.addEventListener('levygames:sync', async (e) => {
  if (e.detail?.changed) greet(await getActiveProfile());
});
