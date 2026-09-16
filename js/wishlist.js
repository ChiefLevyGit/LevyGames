// רשימת משאלות: רעיונות למשחקים שהילדות מציעות. נשמר מקומית בדפדפן (אין שרת/בקאנד לאתר הזה).
import { playSuccess } from './ui-sounds.js?v=3';

const STORAGE_KEY = 'levygames.wishlist.v1';
const MAX_ITEMS = 50;
const MAX_LENGTH = 120;

function loadWishes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWishes(wishes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes.slice(0, MAX_ITEMS)));
  } catch {
    /* מצב פרטי / אחסון מלא - הרעיון עדיין יוצג ברשימה עד לרענון */
  }
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

function init() {
  const form = document.getElementById('wishlistForm');
  const input = document.getElementById('wishlistInput');
  const listEl = document.getElementById('wishlistList');
  if (!form || !input || !listEl) return;

  let wishes = loadWishes();
  renderWishes(listEl, wishes);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, MAX_LENGTH);
    if (!text) return;

    wishes = [{ text, addedAt: Date.now() }, ...wishes];
    saveWishes(wishes);
    renderWishes(listEl, wishes);
    playSuccess();

    input.value = '';
    input.focus();
  });
}

init();
