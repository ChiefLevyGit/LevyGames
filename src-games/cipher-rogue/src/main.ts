import './style.css';
import { Engine } from './core/Engine.ts';
import { preload } from './core/AssetLoader.ts';
import { wireAudio } from './core/audioWiring.ts';
import { Sound } from './core/SoundManager.ts';
import { FX } from './fx/Particles.ts';
import { h } from './ui/dom.ts';

const app = document.getElementById('app')!;
const host = h('div', { class: 'screen-host' });
const bar = h('span', { class: 'loading-fill' });
const loading = h(
  'div',
  { class: 'loading', role: 'status' },
  h('p', { class: 'loading-title' }, 'פורצת הצללים הקטנה'),
  h('div', { class: 'loading-bar', 'aria-hidden': 'true' }, bar),
  h('p', { class: 'loading-sub' }, 'מכינה את המגדל...'),
);
app.append(host, loading);
FX.mount(app);
wireAudio();

// דפדפנים פותחים אודיו רק אחרי מגע. המגע הראשון בכל מקום מספיק.
const unlock = () => Sound.unlock();
window.addEventListener('pointerdown', unlock, { once: true, capture: true });
window.addEventListener('keydown', unlock, { once: true, capture: true });

void (async function boot() {
  await preload((done, total) => {
    bar.style.width = `${Math.round((done / total) * 100)}%`;
  });
  const engine = new Engine(app);
  await engine.start();
  loading.classList.add('gone');
  setTimeout(() => loading.remove(), 400);
  // נקודת אחיזה לבדיקות האוטומטיות (scripts/e2e.mjs)
  (window as unknown as { cipherRogue: Engine }).cipherRogue = engine;
})();
