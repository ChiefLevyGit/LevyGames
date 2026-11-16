// צלילי הפורטל - מסונתזים ב-Web Audio, בלי קבצים.
// המנוע (sfx) מ-assets/mid sounds.txt; כאן נוספו master gain להשתקה,
// קומפרסור נגד עיוות כשכמה צלילים חופפים, ומילון presets בשמות.
//
// השתקה: המפתח הגלובלי 'sound.muted' - אותו מפתח שאלפא־טאון משתמשת בו,
// כך שמתג אחד משתיק את שניהם. משחקים אחרים עדיין עובדים עם js/sfx.js.

import { readGlobal, writeGlobal } from './storage.js?v=2';

const MUTE_KEY = 'sound.muted';
const MASTER_VOLUME = 0.9;

let muted = false;
const ready = readGlobal(MUTE_KEY, false).then((v) => { muted = v === true; });

// כל תו: [type, f0, f1, start, dur, vol]
//   type - סוג oscillator, או 'noise' (אז f0/f1 = תדר ה-lowpass)
//   f1 !== f0 - גלישה אקספוננציאלית לאורך הצליל
function sfx(notes) {
  const c = sfx.ctx || (sfx.ctx = new AudioContext());
  if (c.state === 'suspended') c.resume();
  if (!sfx.out) {
    const comp = c.createDynamicsCompressor();
    comp.connect(c.destination);
    sfx.out = c.createGain();
    sfx.out.connect(comp);
  }
  sfx.out.gain.value = muted ? 0 : MASTER_VOLUME;
  const t = c.currentTime;
  for (const [type, f0, f1, st, d, v] of notes) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t + st);
    g.gain.exponentialRampToValueAtTime(v, t + st + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + st + d);
    let src, freq;
    if (type === 'noise') {
      const b = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate);
      const data = b.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      src = c.createBufferSource(); src.buffer = b;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; freq = f.frequency;
      src.connect(f).connect(g);
    } else {
      src = c.createOscillator(); src.type = type; freq = src.frequency;
      src.connect(g);
    }
    freq.setValueAtTime(f0, t + st);
    if (f1 !== f0) freq.exponentialRampToValueAtTime(f1, t + st + d);
    g.connect(sfx.out);
    src.start(t + st); src.stop(t + st + d + 0.02);
  }
}

// תווים (Hz)
const C3 = 130.81, G4 = 392, C5 = 523.25, E5 = 659.25, G5 = 783.99,
  C6 = 1046.5, E6 = 1318.51, G6 = 1567.98, C7 = 2093;

// ארפג'יו: רצף תווים במרווח קבוע
const arp = (type, freqs, start, step, dur, vol) =>
  freqs.map((f, i) => [type, f, f, start + i * step, dur, vol]);

export const SOUNDS = {
  // ריחוף על כרטיס - עדין, כי הוא נשמע הרבה
  hover: [['triangle', 880, 1320, 0, 0.06, 0.06]],

  // ניווט עליון - "טיק-טק" בקפיצת קוורטה
  nav: [
    ['square', 660, 660, 0, 0.05, 0.06],
    ['square', 880, 880, 0.05, 0.08, 0.06],
  ],

  // הוראות
  select: [
    ['sine', 520, 780, 0, 0.09, 0.2],
    ['triangle', 1040, 1040, 0.07, 0.1, 0.08],
  ],

  // כניסה למשחק - וושש עולה, ארפג'יו מעליו, ניצוץ בסוף
  launch: [
    ['noise', 400, 7000, 0, 0.32, 0.14],
    ...arp('triangle', [C5, E5, G5, C6], 0.02, 0.055, 0.14, 0.18),
    ['sine', C3, C3 * 2, 0, 0.3, 0.16],
    ['triangle', E6, G6, 0.24, 0.18, 0.1],
    ['sine', C7, C7, 0.3, 0.22, 0.06],
  ],

  // כפתור "התחילי לשחק"
  fanfare: [
    ...arp('square', [G4, C5, E5], 0, 0.08, 0.12, 0.08),
    ['square', G5, G5, 0.24, 0.42, 0.09],
    ['triangle', C6, C6, 0.24, 0.42, 0.08],
    ['sine', C3, C3, 0.24, 0.45, 0.2],
  ],

  // משימת היום בוצעה - עולה ויורד, עם ניצוצות
  celebrate: [
    ...arp('triangle', [C5, E5, G5, C6, E6], 0, 0.07, 0.16, 0.16),
    ...arp('triangle', [G5, C6], 0.4, 0.08, 0.3, 0.14),
    ['sine', C3, C3, 0.35, 0.5, 0.2],
    ['noise', 9000, 3000, 0.38, 0.35, 0.06],
    ['sine', C7, C7, 0.5, 0.35, 0.05],
  ],

  // רשימת משאלות נשלחה
  success: [
    ['sine', 660, 660, 0, 0.1, 0.2],
    ['sine', 990, 990, 0.09, 0.22, 0.2],
    ['triangle', 1980, 1980, 0.12, 0.15, 0.05],
  ],

  // החלפת פרופיל / כניסה לחשבון - "היי!" חמים
  hello: [
    ['sine', 330, 660, 0, 0.22, 0.2],
    ['triangle', 660, 990, 0.12, 0.25, 0.12],
    ['sine', 1320, 1320, 0.3, 0.2, 0.06],
  ],

  // הישג נפתח - הכי גדול שיש
  unlock: [
    ['sine', 65, 130, 0, 0.5, 0.25],
    ...arp('square', [C5, E5, G5, C6, E6, G6], 0, 0.06, 0.12, 0.07),
    ['noise', 9000, 2500, 0.36, 0.4, 0.1],
    ['triangle', C6, C6, 0.36, 0.7, 0.12],
    ['triangle', E6, E6, 0.36, 0.7, 0.1],
    ['triangle', G6, G6, 0.36, 0.7, 0.1],
    ['sine', C7, C7, 0.5, 0.5, 0.06],
  ],

  // הדלקת צליל - אישור קטן שהקול חזר
  unmute: [['sine', 880, 1320, 0, 0.12, 0.15]],
};

export function playSynth(name) {
  const notes = SOUNDS[name];
  if (!notes || muted) return;
  // דפדפנים חוסמים AudioContext לפני אינטראקציה ראשונה (ריחוף לא נחשב)
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { sfx(notes); } catch { /* בלי Web Audio - פשוט שקט */ }
}

export async function isMuted() {
  await ready;
  return muted;
}

export async function setMuted(value) {
  await ready;
  muted = value === true;
  if (sfx.out) sfx.out.gain.value = muted ? 0 : MASTER_VOLUME;
  await writeGlobal(MUTE_KEY, muted);
}
