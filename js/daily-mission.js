// משימת היום הקסומה - תשתית בלבד.
// כדי להוסיף משימות בפועל: למלא את מערך MISSIONS למטה באובייקטים בצורה:
// { text: 'ספרי בדיחה לאמא או לאבא', reward: 'מזכה בברכה מיוחדת 😊' }
// כל יום נבחרת משימה אחרת מהמערך לפי תאריך, כך שהיא לא משתנה שוב באותו היום.

import { playCelebrate } from './hub-sounds.js?v=1';
import { read, write } from './storage.js?v=1';

const MISSIONS = [];

// מתוייג-פרופיל: המשימה של דניאל לא מסומנת כבוצעה כשאופיר מסמנת אותה
const DONE_NS = 'dailyMission.done.';

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / 86400000);
}

async function isDoneToday() {
  // truthy ולא === true: מפתחות שעברו מיגרציה מהפורמט הישן מגיעים כ-1
  return !!(await read(DONE_NS + todayKey(), false));
}

async function markDoneToday() {
  await write(DONE_NS + todayKey(), true);
}

function renderEmptyState(container) {
  container.innerHTML = `
    <span class="mission-emoji" aria-hidden="true">🎁</span>
    <div class="mission-body">
      <h2 class="mission-title">משימת היום הקסומה</h2>
      <p class="mission-text">המשימה של היום בדרך... בקרוב! ✨</p>
    </div>
  `;
}

function renderMission(container, mission, done) {
  container.innerHTML = `
    <span class="mission-emoji" aria-hidden="true">🎁</span>
    <div class="mission-body">
      <h2 class="mission-title">משימת היום הקסומה</h2>
      <p class="mission-text">${mission.text}</p>
      ${mission.reward ? `<p class="mission-reward">${mission.reward}</p>` : ''}
    </div>
    <button type="button" id="missionDoneBtn" class="btn ${done ? 'btn-done' : 'btn-secondary'}" ${done ? 'disabled' : ''}>
      ${done ? '✅ כל הכבוד!' : 'עשיתי את זה! ✨'}
    </button>
  `;
  const btn = container.querySelector('#missionDoneBtn');
  btn?.addEventListener('click', async () => {
    await markDoneToday();
    playCelebrate();
    renderMission(container, mission, true);
  });
}

async function init() {
  const container = document.getElementById('dailyMissionCard');
  if (!container) return;

  if (!MISSIONS.length) {
    renderEmptyState(container);
    return;
  }

  const mission = MISSIONS[dayOfYear() % MISSIONS.length];
  renderMission(container, mission, await isDoneToday());
}

init();
