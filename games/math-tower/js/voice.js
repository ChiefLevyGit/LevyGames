// הקראה בעברית למסלול "קטנה" (לפני כיתה א'), דרך SpeechSynthesis של הדפדפן.
// אם אין במכשיר קול עברי - שקט. לא נותנים לקול אנגלי להקריא עברית, וכל
// חידה פתירה גם בלי הקראה.

import { isMuted } from './sound.js?v=1';

let hebrewVoice = null;

function findVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  hebrewVoice = voices.find((v) => /^he|^iw/i.test(v.lang)) || null;
  return hebrewVoice;
}

if ('speechSynthesis' in window) {
  findVoice();
  // ב-Chrome רשימת הקולות נטענת אסינכרונית
  speechSynthesis.addEventListener?.('voiceschanged', findVoice);
}

export function canSpeak() {
  return !!(hebrewVoice || findVoice());
}

export async function speak(text) {
  if (!canSpeak() || (await isMuted())) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = hebrewVoice;
  u.lang = hebrewVoice.lang;
  u.rate = 0.92;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
