// רשימת משאלות: רעיונות למשחקים שהילדות מציעות. נשמר מקומית בדפדפן (אין שרת/בקאנד לאתר הזה).
import { playSuccess } from './hub-sounds.js?v=1';
import { readGlobal, writeGlobal } from './storage.js?v=1';

// גלובלי ולא מתוייג-פרופיל: הרשימה משפחתית, כל אחת רואה את הרעיונות של כולן
const WISHLIST_KEY = 'wishlist.v1';
const MAX_ITEMS = 50;
const MAX_LENGTH = 120;

async function loadWishes() {
  const wishes = await readGlobal(WISHLIST_KEY, []);
  return Array.isArray(wishes) ? wishes : [];
}

async function saveWishes(wishes) {
  return writeGlobal(WISHLIST_KEY, wishes.slice(0, MAX_ITEMS));
}

function renderWishes(listEl, wishes) {
  listEl.innerHTML = '';
  if (!wishes.length) {
    const li = document.createElement('li');
    li.className = 'wishlist-empty';
    li.textContent = 'עדיין אין רעיונות ברשימה - היי הראשונה שכותבת אחד!';
    listEl.appendChild(li);
    return;
  }
  wishes.forEach((wish) => {
    const li = document.createElement('li');
    li.className = 'wishlist-item';
    li.textContent = `💡 ${wish.text}`; // textContent - לא innerHTML, כדי לא להריץ קוד ממה שהוקלד
    listEl.appendChild(li);
  });
}

async function init() {
  const form = document.getElementById('wishlistForm');
  const input = document.getElementById('wishlistInput');
  const listEl = document.getElementById('wishlistList');
  if (!form || !input || !listEl) return;

  let wishes = await loadWishes();
  renderWishes(listEl, wishes);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, MAX_LENGTH);
    if (!text) return;

    wishes = [{ text, addedAt: Date.now() }, ...wishes];
    renderWishes(listEl, wishes);
    playSuccess();

    input.value = '';
    input.focus();
    await saveWishes(wishes);
  });
}

init();
