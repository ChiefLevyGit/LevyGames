// משימת היום הקסומה - תשתית בלבד.
// כדי להוסיף משימות בפועל: למלא את מערך MISSIONS למטה באובייקטים בצורה:
// { text: 'ספרי בדיחה לאמא או לאבא', reward: 'מזכה בברכה מיוחדת 😊' }
// כל יום נבחרת משימה אחרת מהמערך לפי תאריך, כך שהיא לא משתנה שוב באותו היום.

import { playCelebrate } from './ui-sounds.js?v=3';

const MISSIONS = [];

const STORAGE_PREFIX = 'levygames.dailyMission.done.';

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  return Math.floor(diff / 86400000);
}

function isDoneToday() {
  try {
    return localStorage.getItem(STORAGE_PREFIX + todayKey()) === '1';
  } catch {
    return false;
  }
}

function markDoneToday() {
  try {
    localStorage.setItem(STORAGE_PREFIX + todayKey(), '1');
  } catch {
    /* אין localStorage - הכפתור עדיין יעבוד ויזואלית, פשוט לא ייזכר אחרי רענון */
  }
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

function renderMission(container, mission) {
  const done = isDoneToday();
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
  btn?.addEventListener('click', () => {
    markDoneToday();
    playCelebrate();
    renderMission(container, mission);
  });
}

function init() {
  const container = document.getElementById('dailyMissionCard');
  if (!container) return;

  if (!MISSIONS.length) {
    renderEmptyState(container);
    return;
  }

  const mission = MISSIONS[dayOfYear() % MISSIONS.length];
  renderMission(container, mission);
}

init();
