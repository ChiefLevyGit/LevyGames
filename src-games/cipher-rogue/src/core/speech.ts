/**
 * הקראה בעברית (Web Speech). כפתור ההקראה מוצג רק אם במכשיר יש קול עברי -
 * לא כל דפדפן מגיע עם כזה, ובלעדיו הוא היה מקריא באנגלית.
 */
let hebrew: SpeechSynthesisVoice | null = null;

function pick(): void {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  hebrew = voices.find((v) => v.lang.toLowerCase().startsWith('he')) ?? null;
}

if ('speechSynthesis' in window) {
  pick();
  window.speechSynthesis.addEventListener?.('voiceschanged', pick);
}

export const canSpeak = () => hebrew !== null;

export function speak(text: string): void {
  if (!hebrew) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = hebrew;
  u.lang = hebrew.lang;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
