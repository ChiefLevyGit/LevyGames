// ?v= בסוף הייבוא הוא cache-busting - ראו Design.info/tasks.md
import { GAMES } from './games-data.js?v=4';

const grid = document.getElementById('gamesGrid');
const countEl = document.getElementById('gamesCount');

function tagsHTML(tags) {
  if (!tags?.length) return '';
  return `<div class="game-tags">${tags.map((t) => `<span class="tag-pill">${t}</span>`).join('')}</div>`;
}

function cardHTML(game) {
  const [from, to] = game.gradient || ['#e9d5ff', '#fbcfe8'];
  return `
    <article class="game-card" data-game-id="${game.id}">
      <div class="game-icon-panel" style="background: linear-gradient(135deg, ${from}, ${to});">
        ${game.badge ? `<span class="game-badge">${game.badge}</span>` : ''}
        <span class="game-emoji" aria-hidden="true">${game.emoji}</span>
      </div>
      <div class="game-card-body">
        <h3 class="game-name">${game.name}</h3>
        <p class="game-desc">${game.description}</p>
        ${tagsHTML(game.tags)}
        <div class="game-links">
          <a class="btn btn-ghost" href="${game.instructionsUrl}">📖 הוראות</a>
          <a class="btn btn-primary" href="${game.playUrl}">${game.playLabel || '▶ שחקי'}</a>
        </div>
      </div>
    </article>
  `;
}

if (countEl) countEl.textContent = `(${GAMES.length})`;

grid.innerHTML = GAMES.length
  ? GAMES.map(cardHTML).join('')
  : '<p class="empty-note">אין עדיין משחקים כאן... בקרוב! 🛠️</p>';
