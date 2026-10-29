// מכונות המגדל - ניווט בין מסכים, מצב, שמירה.
// main לא מכיר אף מכונה ספציפית: הוא מקבל אותן מ-MACHINES ומפעיל דרך
// הממשק האחיד mount(stage, puzzle, ctx).

import { read, write, reportProgress } from '../../../js/storage.js?v=2';
import { FLOORS, TOTAL_FLOORS, TRACKS, MACHINE_META } from './floors.js?v=1';
import { generate, makeRng } from './generate.js?v=5';
import { sound, isMuted, setMuted } from './sound.js?v=2';
import { speak, stopSpeaking, canSpeak } from './voice.js?v=1';
import * as scale from './machines/scale.js?v=2';
import * as pipes from './machines/pipes.js?v=1';
import * as gears from './machines/gears.js?v=1';
import * as shapes from './machines/shapes.js?v=1';

const GAME_ID = 'math-tower';
const SAVE_NS = 'mathTower.v1';

const MACHINES = { scale, pipes, gears, shapes };

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/* ================= מצב ושמירה ================= */

const fresh = () => ({ v: 1, track: null, floors: { little: 0, g3: 0 } });

function validate(saved) {
  const s = fresh();
  if (!saved || saved.v !== 1) return s;
  if (saved.track in TRACKS) s.track = saved.track;
  for (const t of Object.keys(s.floors)) {
    const n = saved.floors?.[t];
    if (Number.isInteger(n) && n >= 0 && n <= TOTAL_FLOORS) s.floors[t] = n;
  }
  return s;
}

let state = fresh();

// השמירה והדיווח לפורטל באותה פונקציה ומאותם נתונים (חוק שני ב-CLAUDE.md)
async function save() {
  await write(SAVE_NS, state);
  if (state.track) {
    await reportProgress(GAME_ID, { kind: 'levels', done: state.floors[state.track], total: TOTAL_FLOORS });
  }
}

const doneFloors = () => state.floors[state.track] || 0;
const isBuilt = (floor) => FLOORS[floor - 1].every((m) => m in MACHINES);

/* ================= מסכים ================= */

function show(name) {
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.dataset.screen !== name; });
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
}

/* ---------- פתיחה ---------- */

function renderStart() {
  document.querySelectorAll('[data-track]').forEach((b) => {
    b.classList.toggle('is-current', b.dataset.track === state.track);
    const n = state.floors[b.dataset.track];
    b.querySelector('.track-progress').textContent = n ? `${n}/${TOTAL_FLOORS} קומות` : '';
  });
  show('start');
}

async function chooseTrack(track) {
  sound('select');
  state.track = track;
  await save();
  renderTower();
}

/* ---------- מגדל ---------- */

function flywheel(done) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-50 -50 100 100');
  svg.setAttribute('class', 'flywheel');
  svg.setAttribute('aria-hidden', 'true');
  const R = 44, r = 18;
  for (let i = 0; i < TOTAL_FLOORS; i++) {
    const a0 = (i / TOTAL_FLOORS) * Math.PI * 2 - Math.PI / 2 + 0.03;
    const a1 = ((i + 1) / TOTAL_FLOORS) * Math.PI * 2 - Math.PI / 2 - 0.03;
    const p = (rad, a) => `${(rad * Math.cos(a)).toFixed(2)} ${(rad * Math.sin(a)).toFixed(2)}`;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M ${p(r, a0)} L ${p(R, a0)} A ${R} ${R} 0 0 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 0 0 ${p(r, a0)} Z`);
    path.setAttribute('class', i < done ? 'seg seg-on' : 'seg');
    svg.append(path);
  }
  const hub = document.createElementNS(NS, 'circle');
  hub.setAttribute('r', '11');
  hub.setAttribute('class', 'hub');
  svg.append(hub);
  return svg;
}

function renderTower(justDone = 0) {
  const done = doneFloors();
  const track = TRACKS[state.track];
  $('#track-chip').textContent = `${track.icon} ${track.name}`;

  const roof = $('#roof');
  roof.classList.toggle('freed', done >= TOTAL_FLOORS);
  $('#inventor-msg').textContent = done >= TOTAL_FLOORS ? 'חופשי! תודה! 🎉' : 'הצילו! תקנו את המכונות!';

  const list = $('#floors');
  list.replaceChildren();
  for (let n = TOTAL_FLOORS; n >= 1; n--) {
    const built = isBuilt(n);
    const status = n <= done ? 'done' : n === done + 1 ? (built ? 'current' : 'building') : 'locked';
    const b = el('button', `floor floor-${status}`);
    b.type = 'button';
    b.dataset.floor = String(n);
    if (n === justDone) b.classList.add('just-lit');

    const num = el('span', 'floor-num', String(n));
    const win = el('span', 'floor-windows');
    for (let i = 0; i < 3; i++) win.append(el('span', 'window'));
    const icons = el('span', 'floor-machines', FLOORS[n - 1].map((m) => MACHINE_META[m].icon).join(' '));
    const badge = el('span', 'floor-badge', { done: '✓', current: 'פה!', building: '🚧', locked: '🔒' }[status]);
    b.append(num, win, icons, badge);

    const label = { done: 'תוקנה', current: 'הקומה הבאה', building: 'בבנייה', locked: 'נעולה' }[status];
    b.setAttribute('aria-label', `קומה ${n}, ${label}`);
    if (status === 'locked') b.disabled = true;
    b.addEventListener('click', () => {
      if (status === 'building') { sound('nav'); toast('הקומה הזו עוד בבנייה 🚧 בקרוב!'); return; }
      playFloor(n);
    });
    list.append(b);
  }

  const base = $('#base');
  base.replaceChildren(flywheel(done), el('span', 'base-count', `${done}/${TOTAL_FLOORS}`));

  show('tower');
  if (justDone) sound('unlock');
  // לגלול לקומה הנוכחית
  const focus = list.querySelector('.floor-current, .floor-building') || list.lastElementChild;
  requestAnimationFrame(() => focus?.scrollIntoView({ block: 'center', behavior: justDone ? 'smooth' : 'auto' }));
}

let toastTimer = 0;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ---------- קומה ---------- */

let playToken = 0;
let lastVoice = null;
let lastSpokenText = null; // כדי שלא תוקרא אותה הנחיה שוב ושוב בכל חידה

// זוכר את החידה האחרונה שהוצגה לכל צירוף (מסלול, מכונה) - כדי שאותה חידה
// בדיוק לא תחזור מיד שוב, גם אם בריכת הערכים האפשריים צרה (למשל קומה 1,
// שבה יש רק כמה ערכים אפשריים ושתי מכונות מאזניים באותה קומה)
const lastPuzzle = {};
const puzzleSignature = ({ choices, ...rest }) => JSON.stringify(rest);

const ctx = {
  sound,
  prompt(text, voice) {
    $('#prompt-text').textContent = text;
    lastVoice = voice;
    $('#speak-btn').hidden = !(voice && canSpeak());
    // "אותה משימה" = אותו טקסט בדיוק. מקריאים רק כשהוא שונה ממה שכבר הושמע;
    // הכפתור 🗣️ תמיד מאפשר לבקש הקראה חוזרת ביד.
    if (voice && voice !== lastSpokenText) {
      speak(voice);
      lastSpokenText = voice;
    }
  },
};

async function playFloor(n) {
  const token = ++playToken;
  const machines = FLOORS[n - 1];
  sound('launch');

  $('#floor-title').textContent = `קומה ${n}`;
  const pips = $('#pips');
  pips.replaceChildren(...machines.map((m) => {
    const p = el('span', 'pip', MACHINE_META[m].icon);
    p.title = MACHINE_META[m].name;
    return p;
  }));
  show('floor');

  const rng = makeRng((Date.now() ^ (n * 2654435761)) >>> 0);
  const stage = $('#stage');

  for (let i = 0; i < machines.length; i++) {
    pips.children[i].classList.add('active');
    const key = `${state.track}:${machines[i]}`;
    let puzzle = generate(machines[i], state.track, n, rng);
    for (let tries = 0; puzzleSignature(puzzle) === lastPuzzle[key] && tries < 5; tries++) {
      puzzle = generate(machines[i], state.track, n, rng);
    }
    lastPuzzle[key] = puzzleSignature(puzzle);
    await MACHINES[machines[i]].mount(stage, puzzle, ctx);
    if (token !== playToken) return; // יצאו מהקומה באמצע
    pips.children[i].classList.replace('active', 'fixed');
    sound('success');
  }

  stopSpeaking();
  const first = n > doneFloors();
  if (first) {
    state.floors[state.track] = n;
    await save();
  }
  if (token !== playToken) return;
  floorComplete(n, first);
}

function floorComplete(n, first) {
  const finale = n === TOTAL_FLOORS;
  sound(finale ? 'celebrate' : 'fanfare');
  $('#done-title').textContent = finale ? 'הממציא חופשי!' : `קומה ${n} תוקנה!`;
  $('#done-text').textContent = finale
    ? 'תיקנת את כל 12 הקומות. גלגל התנופה מסתובב והמגדל חי!'
    : first ? 'עוד חלק נכנס לגלגל התנופה. הדלת לקומה הבאה נפתחה.' : 'כל המכונות עובדות.';
  if (state.track === 'little') speak(finale ? 'הממציא חופשי! כל הכבוד!' : 'כל הכבוד! הקומה תוקנה!');
  const dlg = $('#done');
  dlg.dataset.floor = String(first ? n : 0);
  dlg.hidden = false;
  $('#done-btn').focus();
}

function leaveFloor() {
  playToken++;
  stopSpeaking();
  sound('nav');
  renderTower();
}

/* ================= אתחול ================= */

async function syncMuteButton() {
  const muted = await isMuted();
  document.querySelectorAll('.mute-btn').forEach((b) => {
    b.textContent = muted ? '🔇' : '🔊';
    b.setAttribute('aria-pressed', String(muted));
    b.setAttribute('aria-label', muted ? 'הפעלת צלילים' : 'השתקת צלילים');
  });
}

function wire() {
  document.querySelectorAll('[data-track]').forEach((b) => {
    b.addEventListener('click', () => chooseTrack(b.dataset.track));
  });
  $('#track-chip').addEventListener('click', () => { sound('nav'); renderStart(); });
  $('#back-to-tower').addEventListener('click', leaveFloor);
  $('#speak-btn').addEventListener('click', () => lastVoice && speak(lastVoice));
  $('#done-btn').addEventListener('click', () => {
    const dlg = $('#done');
    dlg.hidden = true;
    renderTower(Number(dlg.dataset.floor));
  });
  document.querySelectorAll('.mute-btn').forEach((b) => b.addEventListener('click', async () => {
    await setMuted(!(await isMuted()));
    await syncMuteButton();
    sound('unmute');
  }));
}

(async function boot() {
  wire();
  syncMuteButton();
  state = validate(await read(SAVE_NS, null));
  if (state.track) renderTower();
  else renderStart();
}());
