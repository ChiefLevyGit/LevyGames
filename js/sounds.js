// אפקטי קול מסונתזים בזמן אמת (Web Audio API) - בלי קבצי אודיו חיצוניים.

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, duration, { type = 'sine', peak = 0.18, glideTo = null } = {}) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function unlockAudio() {
  getCtx();
}

export function playSelect() {
  const t = getCtx().currentTime;
  tone(880, t, 0.08, { type: 'triangle', peak: 0.12 });
}

export function playMove() {
  const t = getCtx().currentTime;
  tone(520, t, 0.1, { type: 'sine', peak: 0.16 });
  tone(660, t + 0.06, 0.12, { type: 'sine', peak: 0.14 });
}

export function playCapture() {
  const t = getCtx().currentTime;
  tone(300, t, 0.18, { type: 'sawtooth', peak: 0.14, glideTo: 120 });
  tone(700, t, 0.08, { type: 'square', peak: 0.08 });
}

export function playIllegal() {
  const t = getCtx().currentTime;
  tone(150, t, 0.15, { type: 'square', peak: 0.08 });
}

export function playCheck() {
  const t = getCtx().currentTime;
  tone(660, t, 0.1, { type: 'triangle', peak: 0.16 });
  tone(880, t + 0.12, 0.14, { type: 'triangle', peak: 0.18 });
}

export function playWin() {
  const t = getCtx().currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(f, t + i * 0.14, 0.28, { type: 'triangle', peak: 0.2 }));
}
