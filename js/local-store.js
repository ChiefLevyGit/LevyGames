// הדרייבר היחיד בפרויקט שנוגע ב-localStorage.
//
// זו נקודת ההחלפה: אם יום אחד נרצה סנכרון בין מכשירים (serverless function + DB),
// מחליפים את הקובץ הזה בלבד - אף משחק לא ידע. בגלל זה כל הפונקציות כאן async
// גם כשהמימוש סינכרוני לגמרי.
//
// מי שצריך לשמור משהו לא מייבא מכאן - הוא עובד מול js/storage.js, שמוסיף
// את תיוג הפרופיל.

export async function getRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // מצב פרטי / אחסון חסום
  }
}

export async function setRaw(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    // מצב פרטי / אחסון מלא - המשחק ממשיך לעבוד, פשוט בלי שמירה
    console.warn(`שמירה נכשלה (${key})`, err);
    return false;
  }
}

export async function removeRaw(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* אין מה לעשות - ממשיכים */
  }
}

export async function listKeys(prefix = '') {
  try {
    const found = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) found.push(key);
    }
    return found;
  } catch {
    return [];
  }
}

export async function getJSON(key, fallback = null) {
  const raw = await getRaw(key);
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback; // תוכן פגום - מתייחסים אליו כאילו אין
  }
}

export async function setJSON(key, data) {
  return setRaw(key, JSON.stringify(data));
}
