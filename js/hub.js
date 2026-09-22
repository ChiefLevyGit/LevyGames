// דף הבית: מוודא שיש פרופיל, ואז בונה את כרטיסי המשחקים עם ההתקדמות שלו.
// ?v= בסוף הייבוא הוא cache-busting - ראו Design.info/tasks.md
import { GAMES } from './games-data.js?v=10';
import { ensureProfile } from './profile-gate.js?v=1';
import { readAllProgress } from './storage.js?v=1';

const grid = document.getElementById('gamesGrid');
const countEl = document.getElementById('gamesCount');
const heroTitleEl = document.getElementById('heroTitle');

function tagsHTML(tags) {
  if (!tags?.length) return '';
  return `<div class="game-tags">${tags.map((t) => `<span class="tag-pill">${t}</span>`).join('')}</div>`;
}

// שלושת סוגי ההתקדמות מחוזה js/storage.js. הפורטל לא מכיר אף משחק ספציפית -
// הוא יודע להציג kind, וזה מה שמאפשר להוסיף משחק בלי לגעת כאן.
function progressHTML(game, record) {
  if (!record) return '';

  if (record.kind === 'levels') {
    const done = Number(record.done) || 0;
    const total = Number(record.total) || 0;
    if (!total) return '';
    const pct = Math.min(100, Math.round((done / total) * 100));
    const unit = game.progressUnit || 'שלבים';
    return `
      <div class="game-progress">
        <div class="progress-bar" role="progressbar" aria-valuenow="${done}" aria-valuemin="0"
             aria-valuemax="${total}" aria-label="התקדמות ב${game.name}">
          <div class="progress-fill" style="width: ${pct}%;"></div>
        </div>
        <span class="progress-label">${done}/${total} ${unit}</span>
      </div>
    `;
  }

  if (record.kind === 'score') {
    const best = Number(record.best) || 0;
    if (!best) return '';
    return `<div class="game-progress"><span class="progress-badge">🏆 שיא: ${best}</span></div>`;
  }

  if (record.kind === 'session' && record.hasSave) {
    return '<div class="game-progress"><span class="progress-badge">▶ יש משחק שמור</span></div>';
  }

  return '';
}

// כרטיס עם וידאו מקבל פאנל באנר 2:1 במקום רצועת האמוג'י.
// preload="none" + data-src: הקובץ יורד רק כשהכרטיס נכנס למסך (ראו wireCardVideos).
function panelContentHTML(game) {
  if (!game.video) return `<span class="game-emoji" aria-hidden="true">${game.emoji}</span>`;
  return `
    <video class="game-video" data-src="${game.video}" poster="${game.poster}"
           muted loop playsinline preload="none" aria-hidden="true" tabindex="-1"></video>
  `;
}

function cardHTML(game, record) {
  const [from, to] = game.gradient || ['#e9d5ff', '#fbcfe8'];
  const hasSave = record?.kind === 'session' && record.hasSave;
  const playLabel = hasSave ? 'המשיכי! ▶' : (game.playLabel || '▶ שחקי');
  return `
    <article class="game-card" data-game-id="${game.id}">
      <div class="game-icon-panel${game.video ? ' has-video' : ''}" style="background: linear-gradient(135deg, ${from}, ${to});">
        ${game.badge ? `<span class="game-badge">${game.badge}</span>` : ''}
        ${panelContentHTML(game)}
      </div>
      <div class="game-card-body">
        <h3 class="game-name">${game.name}</h3>
        <p class="game-desc">${game.description}</p>
        ${tagsHTML(game.tags)}
        ${progressHTML(game, record)}
        <div class="game-links">
          <a class="btn btn-ghost" href="${game.instructionsUrl}">📖 הוראות</a>
          <a class="btn btn-primary" href="${game.playUrl}">${playLabel}</a>
        </div>
      </div>
    </article>
  `;
}

function greet(profile) {
  if (!heroTitleEl || !profile) return;
  // textContent ולא innerHTML - השם הוא קלט של המשתמשת
  heroTitleEl.textContent = `${profile.emoji} ${profile.name}, איזה כיף שבאת! ✨`;
}

// הוידאו לא יורד עם הדף אלא כשהכרטיס נכנס למסך, ונעצר כשהוא יוצא -
// חצי מגה שלא נטען סתם, ובלי לשרוף סוללה על כרטיס שאף אחד לא רואה.
function wireCardVideos() {
  const videos = [...grid.querySelectorAll('.game-video')];
  if (!videos.length) return;

  // מי שביקש לצמצם תנועה במערכת ההפעלה מקבל את הפוסטר בלבד - הוידאו כלל לא יורד
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!('IntersectionObserver' in window)) { // דפדפן ישן - פוסטר בלבד, לא שוברים כלום
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        if (!target.src && target.dataset.src) target.src = target.dataset.src;
        target.play().catch(() => {}); // חסימת autoplay - הפוסטר נשאר, וזה בסדר
      } else if (!target.paused) {
        target.pause();
      }
    });
  }, { threshold: 0.25 });

  videos.forEach((video) => observer.observe(video));
}

function renderCards(progressByGame) {
  if (countEl) countEl.textContent = `(${GAMES.length})`;

  grid.innerHTML = GAMES.length
    ? GAMES.map((game) => cardHTML(game, progressByGame[game.id])).join('')
    : '<p class="empty-note">אין עדיין משחקים כאן... בקרוב! 🛠️</p>';

  wireCardVideos();

  // js/hub-sounds.js מחווט את הכפתורים רק אחרי שהם קיימים ב-DOM
  document.dispatchEvent(new CustomEvent('levygames:cards-rendered'));
}

async function init() {
  try {
    const profile = await ensureProfile();
    greet(profile);
    renderCards(await readAllProgress());
  } catch (err) {
    // כרטיסים בלי התקדמות עדיפים על פורטל ריק
    console.warn('טעינת הפרופיל/ההתקדמות נכשלה', err);
    renderCards({});
  }
}

init();
