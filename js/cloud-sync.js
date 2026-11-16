// סנכרון לענן - מראה של האחסון המקומי, לא תחליף לו.
//
// הכלל: local-first. המשחקים קוראים וכותבים מקומית בלבד (דרך storage.js), וזה
// עובד בלי רשת ובלי חשבון. כשיש חשבון מחובר, הקובץ הזה:
//   1. מאזין ל-onChange של local-store ומסמן מפתחות "מלוכלכים"
//   2. דוחף אותם ל-Supabase (debounce), ומה שלא נדחף נשאר בתור לפעם הבאה
//   3. בכל טעינת דף מושך מה שהשתנה במכשירים אחרים מאז המשיכה הקודמת
//
// מה לא מסתנכרן: העדפות מכשיר (השתקה), דלי האורח, ה-session עצמו, והשדה
// activeId ברג'יסטרי - "מי משחקת עכשיו" הוא של המכשיר, לא של החשבון.

import { getRaw, setRaw, removeRaw, listKeys, onChange } from './local-store.js?v=2';
import { getClient, getUser, mightBeSignedIn } from './auth.js?v=1';

const META_KEY = 'lgsync.meta'; // מחוץ ל-'levygames.' - לא מסתנכרן בעצמו
const REGISTRY_KEY = 'levygames.profiles.v1';
const PUSH_DEBOUNCE_MS = 2000;
const PAGE = 1000;
const LOCAL_ONLY = new Set(['levygames.sound.muted', 'levygames.ldMuted', 'levygames.migrated.v1']);

const syncable = (key) => key.startsWith('levygames.')
  && !LOCAL_ONLY.has(key)
  && !key.startsWith('levygames.guest.');

let meta = null;
let user = null;
let client = null;
let started = null;
let pushTimer = null;
let pushing = null;
let pushAgain = false;
const applying = new Set(); // כתיבות של הסנכרון עצמו - לא לסמן אותן כמלוכלכות

const parse = (raw) => {
  if (raw === null || raw === undefined) return null;
  try { return JSON.parse(raw); } catch { return undefined; } // undefined = לא JSON, לא מסנכרנים
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ================= מטא: תור + נקודת משיכה ================= */

const emptyMeta = (accountId = null) => ({ v: 1, accountId, lastPull: null, dirty: {} });

async function loadMeta() {
  const m = parse(await getRaw(META_KEY));
  return m?.v === 1 && m.dirty ? m : emptyMeta();
}

const saveMeta = () => setRaw(META_KEY, JSON.stringify(meta));

function markDirty(key, ts = Date.now()) {
  meta.dirty[key] = ts;
  saveMeta();
  schedulePush();
}

async function applyLocal(key, value) {
  applying.add(key);
  try {
    if (value === null) await removeRaw(key);
    else await setRaw(key, JSON.stringify(value));
  } finally {
    applying.delete(key);
  }
}

/* ================= הכרעה בקונפליקט ================= */
// קונפליקט = המפתח השתנה גם כאן (עוד לא נדחף) וגם במכשיר אחר.
// סטטיסטיקות והתקדמות ממוזגות, כדי לא לאבד זמן/שלבים של מכשיר אחד.
// כל השאר: הכתיבה המאוחרת מנצחת.

function mergeStats(a, b) {
  const out = { v: 1, games: {}, days: {}, records: [], savedAt: Math.max(a.savedAt || 0, b.savedAt || 0) };
  for (const id of new Set([...Object.keys(a.games || {}), ...Object.keys(b.games || {})])) {
    const x = a.games?.[id] || {};
    const y = b.games?.[id] || {};
    out.games[id] = {
      sessions: Math.max(x.sessions || 0, y.sessions || 0),
      ms: Math.max(x.ms || 0, y.ms || 0),
      firstPlayed: Math.min(x.firstPlayed || Infinity, y.firstPlayed || Infinity),
      lastPlayed: Math.max(x.lastPlayed || 0, y.lastPlayed || 0),
    };
    if (!Number.isFinite(out.games[id].firstPlayed)) out.games[id].firstPlayed = out.games[id].lastPlayed;
  }
  for (const day of new Set([...Object.keys(a.days || {}), ...Object.keys(b.days || {})])) {
    const x = a.days?.[day] || {};
    const y = b.days?.[day] || {};
    out.days[day] = { ms: Math.max(x.ms || 0, y.ms || 0), games: [...new Set([...(x.games || []), ...(y.games || [])])] };
  }
  const seen = new Set();
  out.records = [...(a.records || []), ...(b.records || [])]
    .filter((r) => { const k = `${r.at}|${r.gameId}|${r.type}|${r.value}`; return !seen.has(k) && seen.add(k); })
    .sort((r1, r2) => r1.at - r2.at);
  return out;
}

function mergeProgress(a, b) {
  const [older, newer] = (a.lastPlayed || 0) > (b.lastPlayed || 0) ? [b, a] : [a, b];
  const out = { ...newer };
  if (newer.done !== undefined || older.done !== undefined) out.done = Math.max(Number(newer.done) || 0, Number(older.done) || 0);
  if (newer.best !== undefined || older.best !== undefined) out.best = Math.max(Number(newer.best) || 0, Number(older.best) || 0);
  return out;
}

function resolve(key, local, localTs, remote, remoteTs) {
  if (local === null) return remote;
  if (remote === null) return remoteTs > localTs ? null : local;
  if (key.endsWith('.stats.v1')) return mergeStats(local, remote);
  if (key.includes('.progress.')) return mergeProgress(local, remote);
  return remoteTs > localTs ? remote : local;
}

/* ================= פרופילים ================= */
// אותו שם בשני מכשירים = אותה ילדה. הפרופיל המקומי עובר למזהה של הענן,
// וכל המפתחות שלו מועברים איתו (rekey).

async function rekey(fromId, toId) {
  const fromPrefix = `levygames.${fromId}.`;
  for (const key of await listKeys(fromPrefix)) {
    const target = `levygames.${toId}.${key.slice(fromPrefix.length)}`;
    const value = parse(await getRaw(key));
    const existing = parse(await getRaw(target));
    if (value === undefined) continue;
    const merged = existing === null || existing === undefined
      ? value
      : resolve(target, value, value?.savedAt || 0, existing, existing?.savedAt || 0);
    await applyLocal(target, merged);
    markDirty(target);
    await applyLocal(key, null);
    markDirty(key); // אם המפתח הישן כבר היה בענן - מוחקים אותו שם
  }
}

const newProfileId = () => `p_${Math.random().toString(36).slice(2, 8)}`;
const normName = (s) => String(s || '').trim().toLowerCase();

async function applyRegistry(remote) {
  const local = parse(await getRaw(REGISTRY_KEY)) || { v: 1, activeId: null, profiles: [] };
  const merged = (Array.isArray(remote?.profiles) ? remote.profiles : []).map((p) => ({ ...p }));
  let { activeId } = local;
  const hadLocal = local.profiles?.length > 0;

  for (const lp of local.profiles || []) {
    const sameId = merged.find((p) => p.id === lp.id);
    if (sameId && normName(sameId.name) === normName(lp.name)) continue; // אותו פרופיל בדיוק
    const twin = merged.find((p) => normName(p.name) === normName(lp.name));
    if (twin) {
      await rekey(lp.id, twin.id);
      if (activeId === lp.id) activeId = twin.id;
    } else if (sameId) {
      // אותו מזהה, ילדה אחרת (שני מכשירים יצרו p1 כל אחד לבד) - המקומית מקבלת מזהה חדש
      const id = newProfileId();
      await rekey(lp.id, id);
      if (activeId === lp.id) activeId = id;
      merged.push({ ...lp, id });
    } else {
      merged.push(lp);
    }
  }

  // מכשיר חדש בלי פרופילים: לא לשאול "איך קוראים לך" כשהענן כבר מכיר את הבנות
  if (!activeId && !hadLocal && merged.length) activeId = merged[0].id;
  if (activeId && !merged.some((p) => p.id === activeId)) activeId = merged[0]?.id || null;

  await applyLocal(REGISTRY_KEY, { v: 1, activeId, profiles: merged });
  const remoteProfiles = remote?.profiles || [];
  if (!same(merged, remoteProfiles)) markDirty(REGISTRY_KEY);
  else delete meta.dirty[REGISTRY_KEY];
}

/* ================= משיכה ================= */

async function applyRemote(row) {
  const { key, value: remote, client_ts: remoteTs } = row;
  if (!syncable(key)) return false;
  if (key === REGISTRY_KEY) {
    const before = await getRaw(REGISTRY_KEY);
    await applyRegistry(remote);
    return before !== await getRaw(REGISTRY_KEY);
  }

  const local = parse(await getRaw(key));
  if (local === undefined) return false;
  const dirtyTs = meta.dirty[key];

  if (dirtyTs === undefined) { // אין שינוי מקומי שממתין - הענן קובע
    if (same(local, remote)) return false;
    await applyLocal(key, remote);
    return true;
  }

  const result = resolve(key, local, dirtyTs, remote, Number(remoteTs) || 0);
  if (same(result, remote)) delete meta.dirty[key]; // הענן כבר מעודכן
  if (same(result, local)) return false;
  await applyLocal(key, result);
  return true;
}

async function pull() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    let q = client.from('kv')
      .select('key,value,client_ts,updated_at')
      .order('updated_at', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (meta.lastPull) q = q.gt('updated_at', meta.lastPull);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  if (!rows.length) return 0;

  const lastPull = rows[rows.length - 1].updated_at;
  // הרג'יסטרי קודם: מיזוג פרופילים עשוי להעביר מפתחות, ושאר השורות צריכות לנחות על המזהים הנכונים
  rows.sort((a, b) => (b.key === REGISTRY_KEY) - (a.key === REGISTRY_KEY));
  let changed = 0;
  for (const row of rows) if (await applyRemote(row)) changed += 1;

  meta.lastPull = lastPull;
  await saveMeta();
  return changed;
}

/* ================= דחיפה ================= */

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, PUSH_DEBOUNCE_MS);
}

export function push() {
  if (!client || !user) return Promise.resolve();
  if (pushing) { pushAgain = true; return pushing; }
  clearTimeout(pushTimer);

  pushing = (async () => {
    // הרג'יסטרי הוא רשימה: דחיפה עיוורת הייתה מוחקת ילדה שנוספה במכשיר אחר
    // מאז המשיכה האחרונה. לכן קודם ממזגים עם מה שבענן, ורק אז דוחפים.
    if (meta.dirty[REGISTRY_KEY] !== undefined) {
      const { data, error } = await client.from('kv').select('value').eq('key', REGISTRY_KEY).maybeSingle();
      if (error) throw error;
      if (data?.value) {
        const ts = meta.dirty[REGISTRY_KEY];
        await applyRegistry(data.value);
        if (meta.dirty[REGISTRY_KEY] === undefined) meta.dirty[REGISTRY_KEY] = ts; // בכל זאת לדחוף, כדי שהענן יכיל את המיזוג
      }
    }
    const rows = [];
    for (const [key, ts] of Object.entries(meta.dirty)) {
      let value = parse(await getRaw(key));
      if (value === undefined) { delete meta.dirty[key]; continue; }
      if (key === REGISTRY_KEY && value) value = { v: value.v, profiles: value.profiles };
      rows.push({ account_id: user.id, key, value, client_ts: ts });
    }
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await client.from('kv').upsert(chunk, { onConflict: 'account_id,key' });
      if (error) throw error;
      // רק אם לא השתנה שוב בזמן הדחיפה
      chunk.forEach((r) => { if (meta.dirty[r.key] === r.client_ts) delete meta.dirty[r.key]; });
    }
    await saveMeta();
    notify();
  })()
    .catch((err) => console.warn('סנכרון נכשל - השינויים שמורים ויישלחו בפעם הבאה', err))
    .finally(() => {
      pushing = null;
      if (pushAgain) { pushAgain = false; schedulePush(); }
    });
  return pushing;
}

/* ================= הפעלה ================= */

function notify(changed = 0) {
  document.dispatchEvent(new CustomEvent('levygames:sync', { detail: { changed, ...status() } }));
}

export function status() {
  return {
    signedIn: Boolean(user),
    email: user?.email || null,
    pending: meta ? Object.keys(meta.dirty).length : 0,
    lastPull: meta?.lastPull || null,
  };
}

// נקרא מ-storage.js בכל דף. אורחת / אין קונפיג = חוזר מיד, בלי לטעון כלום.
export function start() {
  started ||= (async () => {
    // מאזינים מיד, עוד לפני שה-SDK נטען: משחק שכותב בזמן הטעינה לא ילך לאיבוד
    const early = new Map();
    const stopEarly = onChange((key) => {
      if (syncable(key) && !applying.has(key)) early.set(key, Date.now());
    });
    if (!(await mightBeSignedIn())) { stopEarly(); return false; }
    user = await getUser();
    if (!user) { stopEarly(); return false; }
    client = await getClient();
    meta = await loadMeta();

    if (meta.accountId !== user.id) {
      // סנכרון ראשון של החשבון הזה במכשיר הזה: כל מה שכבר יש מקומית הולך לענן
      meta = emptyMeta(user.id);
      for (const key of await listKeys('levygames.')) {
        if (!syncable(key)) continue;
        const value = parse(await getRaw(key));
        if (value !== undefined && value !== null) meta.dirty[key] = value?.savedAt || 1;
      }
      await saveMeta();
    }

    stopEarly();
    early.forEach((ts, key) => { meta.dirty[key] = ts; });
    onChange((key) => {
      if (syncable(key) && !applying.has(key)) markDirty(key);
    });
    window.addEventListener('online', () => push());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') push();
    });

    const changed = await pull();
    await push();
    notify(changed);
    return true;
  })().catch((err) => {
    console.warn('הסנכרון לא עלה - ממשיכים מקומית', err);
    return false;
  });
  return started;
}

// בהתנתקות: הנתונים נשארים במכשיר, רק מפסיקים לסנכרן.
// החיבור הבא (גם לחשבון אחר) יתחיל מיזוג מלא מחדש.
export async function forget() {
  await setRaw(META_KEY, JSON.stringify(emptyMeta()));
  user = null;
  client = null;
}
