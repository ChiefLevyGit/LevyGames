// ?v= בסוף הייבוא הוא cache-busting - ראו Design.info/tasks.md
import { GAMES } from './games-data.js?v=2';

const grid = document.getElementById('gamesGrid');

function cardHTML(game) {
  return `
    <article class="game-card">
      <div class="game-emoji" aria-hidden="true">${game.emoji}</div>
      <h2 class="game-name">${game.name}</h2>
      <p class="game-desc">${game.description}</p>
      <div class="game-links">
        <a class="game-btn play" href="${game.playUrl}">▶ שחק</a>
        <a class="game-btn info" href="${game.instructionsUrl}">📖 הוראות</a>
      </div>
    </article>
  `;
}

grid.innerHTML = GAMES.length
  ? GAMES.map(cardHTML).join('')
  : '<p class="empty-note">אין עדיין משחקים כאן... בקרוב! 🛠️</p>';
