// חיבור ל-Supabase. ריק = האתר עובד מקומית בלבד, כמו תמיד (אין כפתור התחברות).
//
// ה-anon key ציבורי בהגדרה - הוא נשלח לכל דפדפן. מה שמגן על המידע הוא
// Row Level Security בטבלה (supabase/schema.sql): כל חשבון רואה רק את השורות שלו.
// לעולם לא לשים כאן את ה-service_role key.
//
// איפה מוצאים: Supabase Dashboard > Project Settings > API

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
