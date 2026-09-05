// שמירת התקדמות בין סשנים - סבב משימות באמצע לא נמחק ברענון.

const KEY = 'levygames.tasks.v1';

export function saveProgress(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, savedAt: Date.now(), ...data }));
  } catch (err) {
    console.warn('שמירת ההתקדמות נכשלה', err);
  }
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    if (data.mode !== 'draw' && data.mode !== 'deck') return null;
    return data;
  } catch {
    return null;
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ממשיכים בלי שמירה */
  }
}
