/**
 * צלילים בסינתזה — אפס קבצי MP3, אפס בקשות רשת.
 * בנוסף הקראה ב-he-IL, קריטית לרמה 1 שבה הילדה עוד לא קוראת שוטף.
 */

import { store } from './state/progress';

let ctx: AudioContext | null = null;
// מראה סינכרוני של העדפת ההשתקה: שכבת האחסון אסינכרונית, אבל צליל צריך
// להתנגן ברגע הלחיצה. נטען פעם אחת בעלייה ונכתב חזרה בכל שינוי.
let muted = false;

void store.loadMuted().then((v) => { muted = v; });

export const isMuted = () => muted;

export function setMuted(v: boolean) {
  muted = v;
  void store.saveMuted(v);
  if (v) stopSpeaking();
}

/** AudioContext נוצר רק אחרי מגע ראשון — דפדפנים חוסמים יצירה מוקדמת. */
function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type Wave = OscillatorType;

function tone(freq: number, start: number, dur: number, gain = 0.14, wave: Wave = 'sine') {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t);
  // מעטפת רכה — קליקים חדים מעייפים ילדים אחרי עשר דקות משחק
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** לחיצה על מקש */
export const sfxTap = () => tone(520, 0, 0.07, 0.08, 'triangle');

/** אות נכונה — צליל עולה קצר */
export const sfxCorrect = () => {
  tone(660, 0, 0.12, 0.12, 'sine');
  tone(880, 0.07, 0.14, 0.1, 'sine');
};

/** אות שגויה — לא באזר צורם. נמוך, רך, ובלי תחושת כישלון. */
export const sfxWrong = () => tone(180, 0, 0.16, 0.07, 'sine');

/** פריט נוי צמח בעיר */
export const sfxGrow = () => {
  tone(440, 0, 0.1, 0.07, 'triangle');
  tone(620, 0.06, 0.12, 0.06, 'triangle');
};

/** מילה הושלמה — ג'ינגל קצר */
export const sfxWin = () => {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, 0.13, 'sine'));
};

/** אות סופית נלמדה — צליל "אהה" קטן ונעים */
export const sfxTeach = () => {
  tone(700, 0, 0.1, 0.1, 'sine');
  tone(1046, 0.09, 0.22, 0.09, 'sine');
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
