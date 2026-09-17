// שכבת הנכסים של הצליל: המקום היחיד בפרויקט שמכיר איפה קבצי הצליל יושבים
// ואיך הם נקראים. מי שצריך צליל מייבא מכאן - לא בונה נתיבים בעצמו.
//
// למה new URL מול import.meta.url ולא נתיב כמו 'assets/...':
// נתיב יחסי רגיל נפתר מול ה-*דף* הקורא, ולכן היה עובד רק מ-index.html שבשורש
// ונשבר מכל משחק שיושב בעומק games/<id>/. import.meta.url נפתר מול המודול הזה,
// ולכן אותו ייבוא עובד מכל עומק.

const JD_PREFIX = 'JDSherbert - Ultimate UI SFX Pack (FREE)/Mono/mp3/JDSherbert - Ultimate UI SFX Pack - ';

// new URL כבר מקודד רווחים ל-%20 בעצמו - אסור encodeURI על התוצאה (יצא %2520)
const assetUrl = (relative) => new URL(`../assets/${relative}`, import.meta.url).href;

function makeAudio(url, volume) {
  const audio = new Audio(url);
  audio.volume = volume;
  return audio;
}

// צליל מחבילת JDSherbert לפי שם קצר, למשל 'Cursor - 1'
export function jdSound(name, volume = 0.5) {
  return makeAudio(assetUrl(`${JD_PREFIX}${name}.mp3`), volume);
}

// צליל בודד שיושב ישירות ב-assets/, למשל 'level-up.mp3'
export function localSound(filename, volume = 0.5) {
  return makeAudio(assetUrl(filename), volume);
}

export function play(audio) {
  if (!audio) return;
  // משכפלים כל פעם כדי שקליקים מהירים ברצף לא יחתכו צליל קודם שעוד מתנגן
  const clone = audio.cloneNode();
  clone.volume = audio.volume;
  clone.play().catch(() => {}); // מתעלמים אם הדפדפן חוסם ניגון אוטומטי מסיבה כלשהי
}
