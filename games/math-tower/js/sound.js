// צלילי המשחק: מנוע Web Audio עצמאי, לא תלוי בקובץ שיתופי של הפורטל.
//
// **למה עצמאי ולא js/synth.js של הפורטל:** synth.js עדיין לא קיים בהיסטוריית
// git (עבודה לא-מקומיטת של סשן אחר - "סבב 9" בסטטוס). ייבוא ישיר ממנו עבד
// בבדיקות מקומיות כי synth.js יושב על הדיסק, אבל בפריסה אמיתית (שרת שרואה
// רק את מה שמקומיט) הוא 404 - וכישלון ייבוא מפיל את *כל* מודול main.js,
// כולל מאזיני הלחיצה. ראו Design.info/tasks.md סבב 12.
//
// ההשתקה עדיין משתמשת באותו מפתח גלובלי 'sound.muted' דרך js/storage.js
// (שכן מקומיט) - כך שברגע ש-synth.js יונחת, שני המנועים יכבדו מתג אחד.

import { readGlobal, writeGlobal } from '../../../js/storage.js?v=2';

const MUTE_KEY = 'sound.muted';
const MASTER_VOLUME = 0.9;

let muted = false;
const ready = readGlobal(MUTE_KEY, false).then((v) => { muted = v === true; });

// כל תו: [type, f0, f1, start, dur, vol]. מועתק מ-js/sfx engine של הפורטל.
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

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;
const arp = (type, freqs, start, step, dur, vol) =>
  freqs.map((f, i) => [type, f, f, start + i * step, dur, vol]);

const SOUNDS = {
  nav: [['square', 660, 660, 0, 0.05, 0.06], ['square', 880, 880, 0.05, 0.08, 0.06]],
  select: [['sine', 520, 780, 0, 0.09, 0.2], ['triangle', 1040, 1040, 0.07, 0.1, 0.08]],
  launch: [
    ['noise', 400, 7000, 0, 0.32, 0.14],
    ...arp('triangle', [C5, E5, G5, C6], 0.02, 0.055, 0.14, 0.18),
  ],
  fanfare: [...arp('square', [392, C5, E5], 0, 0.08, 0.12, 0.08), ['square', G5, G5, 0.24, 0.42, 0.09]],
  celebrate: [
    ...arp('triangle', [C5, E5, G5, C6, 1318.51], 0, 0.07, 0.16, 0.16),
    ['noise', 9000, 3000, 0.38, 0.35, 0.06],
  ],
  success: [['sine', 660, 660, 0, 0.1, 0.2], ['sine', 990, 990, 0.09, 0.22, 0.2]],
  unlock: [
    ['sine', 65, 130, 0, 0.5, 0.25],
    ...arp('square', [C5, E5, G5, C6, 1318.51, 1567.98], 0, 0.06, 0.12, 0.07),
  ],
  unmute: [['sine', 880, 1320, 0, 0.12, 0.15]],
  // משקולת נוחתת על הצלחת
  mtDrop: [['triangle', 320, 180, 0, 0.12, 0.22], ['noise', 900, 300, 0, 0.06, 0.08]],
  // הקורה נוטה - מתכת חורקת, נמוך ורך (לא "טעות" צורמת)
  mtClunk: [['square', 140, 90, 0, 0.18, 0.08], ['triangle', 110, 70, 0.08, 0.22, 0.14]],
  // מכונה ננעלת: קליק + צלצול
  mtLock: [
    ['noise', 3000, 1200, 0, 0.04, 0.12],
    ['sine', 1046.5, 1046.5, 0.05, 0.25, 0.14],
    ['sine', 1567.98, 1567.98, 0.12, 0.35, 0.12],
  ],
};

export function sound(name) {
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
