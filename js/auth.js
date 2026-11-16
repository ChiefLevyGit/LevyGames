// חשבון הורה ב-Supabase: Google, או אימייל + סיסמה.
//
// החשבון הוא של המשפחה (ההורה); הבנות הן פרופילים בתוכו - בדיוק כמו היום.
// חשבון לא מחליף את הפרופילים, הוא רק מאפשר לסנכרן אותם בין מכשירים.
//
// ה-SDK (~50KB) נטען רק כשצריך: יש session שמור, חוזרים מ-Google, או לוחצים
// "התחברות". אורחת שרק משחקת לא מורידה אותו אף פעם.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js?v=1';
import { getRaw, setRaw, removeRaw } from './local-store.js?v=2';

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// מחוץ ל-namespace 'levygames.' בכוונה: ה-session לא מסונכרן לענן (ראו cloud-sync)
const SESSION_KEY = 'lgauth.session';

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// ה-SDK שומר את ה-session דרך local-store ולא ישירות ב-localStorage (חוק 1)
const storageAdapter = {
  getItem: (key) => getRaw(key),
  setItem: (key, value) => setRaw(key, value),
  removeItem: (key) => removeRaw(key),
};

let clientPromise = null;

export function getClient() {
  if (!isConfigured()) return Promise.resolve(null);
  clientPromise ||= import(SDK_URL)
    .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: storageAdapter,
        storageKey: SESSION_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }))
    .catch((err) => {
      console.warn('טעינת Supabase נכשלה - ממשיכים מקומית', err);
      clientPromise = null;
      return null;
    });
  return clientPromise;
}

// בדיקה זולה, בלי SDK: האם שווה בכלל לטעון אותו בדף הזה?
export async function mightBeSignedIn() {
  if (!isConfigured()) return false;
  if (new URLSearchParams(location.search).has('code')) return true; // חזרה מ-Google
  return (await getRaw(SESSION_KEY)) !== null;
}

// אחרי חזרה מ-Google ה-URL מכיל ?code=... - מנקים אותו אחרי שה-SDK החליף אותו ב-session
function cleanAuthParams() {
  const url = new URL(location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) return;
  ['code', 'error', 'error_code', 'error_description', 'state'].forEach((p) => url.searchParams.delete(p));
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

export async function getUser() {
  if (!(await mightBeSignedIn())) return null;
  const client = await getClient();
  if (!client) return null;
  const { data } = await client.auth.getSession(); // מחכה גם להחלפת ה-code מ-Google
  cleanAuthParams();
  return data?.session?.user || null;
}

export async function onAuth(fn) {
  const client = await getClient();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_event, session) => fn(session?.user || null));
  return () => data.subscription.unsubscribe();
}

// אחרי ההתחברות Google מחזיר לדף הבית של הפורטל, מכל עומק שנקרא ממנו
const portalUrl = () => new URL('../index.html', import.meta.url).href;

export async function signInWithGoogle() {
  const client = await getClient();
  if (!client) throw new Error('החיבור לשרת לא זמין כרגע');
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: portalUrl() },
  });
  if (error) throw error;
}

export async function signInWithPassword(email, password) {
  const client = await getClient();
  if (!client) throw new Error('החיבור לשרת לא זמין כרגע');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

// מחזיר { user, needsConfirm }: אם אימות אימייל מופעל בפרויקט, אין session עד האישור
export async function signUp(email, password) {
  const client = await getClient();
  if (!client) throw new Error('החיבור לשרת לא זמין כרגע');
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: portalUrl() },
  });
  if (error) throw error;
  return { user: data.user, needsConfirm: !data.session };
}

export async function signOut() {
  const client = await getClient();
  if (client) await client.auth.signOut();
  await removeRaw(SESSION_KEY); // גם אם השרת לא זמין - מקומית מתנתקים
}

// הודעות השגיאה של Supabase באנגלית - מתרגמים את הנפוצות
export function authErrorText(err) {
  const msg = String(err?.message || err || '');
  if (/invalid login credentials/i.test(msg)) return 'אימייל או סיסמה לא נכונים';
  if (/already registered/i.test(msg)) return 'האימייל הזה כבר רשום - נסו "כניסה"';
  if (/password should be at least/i.test(msg)) return 'הסיסמה קצרה מדי (לפחות 6 תווים)';
  if (/email not confirmed/i.test(msg)) return 'צריך לאשר את האימייל קודם - בדקו את תיבת הדואר';
  if (/rate limit/i.test(msg)) return 'יותר מדי ניסיונות. חכו דקה ונסו שוב';
  if (/fetch|network/i.test(msg)) return 'אין חיבור לאינטרנט';
  return 'משהו השתבש. נסו שוב';
}
