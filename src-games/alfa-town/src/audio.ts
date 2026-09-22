/**
 * צלילים בסינתזה — אפס קבצים, אפס בקשות רשת.
 *
 * המנוע הוא זה שאלעד הביא ב-`LevyGames/assets/mid sounds.txt`: פונקציה אחת
 * שמקבלת רשימת "תווים", וכל תו הוא
 *   [סוג, תדר התחלה, תדר סיום, השהיה, משך, עוצמה]
 * סוג יכול להיות צורת גל של אוסילטור, או 'noise' — רעש לבן דרך פילטר
 * lowpass, שבו זוג התדרים מזיז את נקודת החיתוך. זה מה שנותן סוויפים
 * וחבטות שגלים נקיים לא יכולים לתת.
 *
 * שינוי אחד מהמקור: הכל עובר דרך master gain ולא ישר ל-destination, כדי
 * שההשתקה תהיה מתג אמיתי אחד ולא `return` בכל פונקציה.
 *
 * `js/sfx.js` של הפורטל לא רלוונטי כאן — הוא מנהל *קבצי* צליל.
 */

import { store } from './state/progress';

type Wave = OscillatorType | 'noise';
type Note = [type: Wave, f0: number, f1: number, start: number, dur: number, vol: number];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

void store.loadMuted().then((v) => { muted = v; applyMute(); });

function applyMute() {
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.01);
}

export const isMuted = () => muted;

export function setMuted(v: boolean) {
  muted = v;
  applyMute();
  void store.saveMuted(v);
  if (v) stopSpeaking();
}

/** AudioContext נוצר רק אחרי מגע ראשון — דפדפנים חוסמים יצירה מוקדמת. */
function audio(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function sfx(notes: Note[]) {
  if (muted) return; // חוסך יצירת נודים — ה-master כבר ב-0 ממילא
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime;

  for (const [type, f0, f1, st, d, v] of notes) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t + st);
    g.gain.exponentialRampToValueAtTime(v, t + st + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + st + d);

    let src: AudioScheduledSourceNode;
    let freq: AudioParam;
    if (type === 'noise') {
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource();
      s.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      freq = f.frequency;
      s.connect(f).connect(g);
      src = s;
    } else {
      const o = c.createOscillator();
      o.type = type;
      freq = o.frequency;
      o.connect(g);
      src = o;
    }
    freq.setValueAtTime(f0, t + st);
    if (f1 !== f0) freq.exponentialRampToValueAtTime(f1, t + st + d);
    g.connect(master);
    src.start(t + st);
    src.stop(t + st + d + 0.02);
  }
}

// ── ממשק ─────────────────────────────────────────────────────────────────
// כפתורים
/** קליק רך — מפה, חזרה, השתקה */
export const uiTap = () => sfx([['triangle', 620, 520, 0, 0.06, 0.08]]);
/** בחירה — גיל, שכונה: שתי נקודות עולות */
export const uiSelect = () => sfx([
  ['sine', 520, 520, 0, 0.07, 0.1],
  ['sine', 780, 780, 0.07, 0.11, 0.1],
]);
/** חזרה: שתי נקודות יורדות */
export const uiBack = () => sfx([
  ['sine', 700, 700, 0, 0.06, 0.08],
  ['sine', 480, 480, 0.06, 0.1, 0.08],
]);
/** שער נפתח — כניסה מהמסך הראשי */
export const gateOpen = () => sfx([
  ['noise', 300, 3200, 0, 0.55, 0.16],
  ['sine', 110, 70, 0.05, 0.5, 0.18],
  ['sine', 660, 990, 0.35, 0.35, 0.07],
]);

// מקלדת
/** לחיצה על מקש אות — טאק ניטרלי */
export const keyTap = () => sfx([['triangle', 500, 460, 0, 0.045, 0.06]]);
/** אות נכונה — צ'ירפ עולה */
export const letterRight = () => sfx([['sine', 640, 960, 0, 0.13, 0.12]]);
/** אות שגויה — תוף נמוך ורך. לא באזר, לא כישלון. */
export const letterWrong = () => sfx([
  ['sine', 180, 120, 0, 0.16, 0.09],
  ['noise', 400, 150, 0, 0.1, 0.05],
]);
/** אות סופית נלמדה — פעמון בשני הרמונים */
export const finalLetter = () => sfx([
  ['sine', 880, 880, 0, 0.35, 0.09],
  ['sine', 1320, 1320, 0.02, 0.3, 0.05],
  ['triangle', 660, 660, 0.12, 0.25, 0.06],
]);
/** רמז — נצנוץ קל */
export const hintSparkle = () => sfx([
  ['sine', 1200, 1800, 0, 0.09, 0.06],
  ['sine', 1600, 2400, 0.06, 0.1, 0.05],
]);

// מילה ומד
/** מילה הושלמה — ארפג'ו עולה */
export const wordDone = () => sfx([
  ['sine', 523, 523, 0, 0.12, 0.11],
  ['sine', 659, 659, 0.08, 0.12, 0.11],
  ['sine', 784, 784, 0.16, 0.2, 0.12],
]);
/** משבצת במד — התדר עולה עם המשבצת (1, 2, 3) */
export const meterTick = (step: 1 | 2 | 3) => {
  const f = [660, 830, 1050][step - 1];
  sfx([
    ['triangle', f, f * 1.02, 0, 0.1, 0.1],
    ['sine', f * 2, f * 2, 0.02, 0.08, 0.04],
  ]);
};

// הפרס
/** האובייקט נופל — סוויפ רעש יורד */
export const prizeFall = () => sfx([['noise', 2600, 200, 0, 0.62, 0.13]]);
/** נחיתה — פרץ רעש נמוך + חבטה */
export const prizeLand = () => sfx([
  ['noise', 900, 80, 0, 0.22, 0.2],
  ['sine', 140, 40, 0, 0.28, 0.22],
]);
/** האובייקט נפתח — פאנפרה */
export const prizeFanfare = () => sfx([
  ['square', 523, 523, 0, 0.12, 0.05],
  ['square', 659, 659, 0.1, 0.12, 0.05],
  ['square', 784, 784, 0.2, 0.12, 0.05],
  ['square', 1047, 1047, 0.3, 0.42, 0.06],
  ['sine', 1047, 1047, 0.3, 0.45, 0.1],
  ['sine', 1319, 1319, 0.33, 0.42, 0.05],
]);
/** כוכב בכרטיס — צלצול שעולה עם הכוכב */
export const starPop = (n: 1 | 2 | 3) => {
  const f = [1047, 1319, 1568][n - 1];
  sfx([['sine', f, f, 0, 0.22, 0.09], ['sine', f * 1.5, f * 1.5, 0.01, 0.15, 0.03]]);
};

// ── הקראה ─────────────────────────────────────────────────────────────────
// אותה תבנית שעובדת בבלשית הקטנה, כולל הנפילה החיננית כשאין תמיכה.

export const canSpeak = () => 'speechSynthesis' in window;

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function speak(text: string, onEnd?: () => void): boolean {
  if (muted || !canSpeak()) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  u.rate = 0.9;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}
