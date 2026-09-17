// רג'יסטרי הפרופילים: מי משחקת עכשיו במכשיר הזה.
//
// חשוב להבין מה זה *לא*: אלה לא חשבונות. אין סיסמה, וכל אחת יכולה לבחור כל
// פרופיל. זה מתג "מי משחקת", לא גבול הרשאות.
//
// הרג'יסטרי עצמו גלובלי - הוא לא יכול להיות מתוייג-פרופיל, כי הוא זה שקובע
// מי הפרופיל הפעיל.

import { getJSON, setJSON } from './local-store.js?v=1';

const REGISTRY_KEY = 'levygames.profiles.v1';

// האמוג'ים שמוצעים במסך יצירת הפרופיל, עם צבע רקע לכל אחד
export const PROFILE_AVATARS = [
  { emoji: '🦄', color: '#F0ABFC' },
  { emoji: '🐱', color: '#FDE68A' },
  { emoji: '🦊', color: '#FCA5A5' },
  { emoji: '🐼', color: '#C4B5FD' },
  { emoji: '🦋', color: '#93C5FD' },
  { emoji: '🌸', color: '#FBCFE8' },
  { emoji: '⭐', color: '#FCD34D' },
  { emoji: '🌈', color: '#6EE7B7' },
  { emoji: '🐬', color: '#7DD3FC' },
  { emoji: '🦉', color: '#E8A0A0' },
];

const MAX_NAME_LENGTH = 20;

const emptyRegistry = () => ({ v: 1, activeId: null, profiles: [] });

async function readRegistry() {
  const data = await getJSON(REGISTRY_KEY, null);
  if (!data || data.v !== 1 || !Array.isArray(data.profiles)) return emptyRegistry();
  return data;
}

async function writeRegistry(registry) {
  return setJSON(REGISTRY_KEY, registry);
}

function nextId(profiles) {
  // p1, p2, p3... לפי המספר הגבוה שכבר בשימוש, כדי שמחיקה לא תייצר התנגשות
  const used = profiles
    .map((p) => Number(String(p.id).replace(/^p/, '')))
    .filter((n) => Number.isInteger(n) && n > 0);
  return `p${used.length ? Math.max(...used) + 1 : 1}`;
}

function cleanName(name) {
  return String(name ?? '').trim().slice(0, MAX_NAME_LENGTH);
}

export async function listProfiles() {
  const { profiles } = await readRegistry();
  return profiles;
}

// מחזיר null כשאין פרופיל - זה מה שמדליק את מסך שאלת השם בפורטל
export async function getActiveProfile() {
  const { activeId, profiles } = await readRegistry();
  if (!activeId) return null;
  return profiles.find((p) => p.id === activeId) || null;
}

export async function createProfile({ name, emoji } = {}) {
  const registry = await readRegistry();
  const cleaned = cleanName(name);
  if (!cleaned) throw new Error('שם פרופיל ריק');

  const avatar = PROFILE_AVATARS.find((a) => a.emoji === emoji) || PROFILE_AVATARS[0];
  const profile = {
    id: nextId(registry.profiles),
    name: cleaned,
    emoji: avatar.emoji,
    color: avatar.color,
    createdAt: Date.now(),
  };

  registry.profiles.push(profile);
  if (!registry.activeId) registry.activeId = profile.id; // הראשון נהיה הפעיל מיד
  await writeRegistry(registry);
  return profile;
}

export async function setActiveProfile(id) {
  const registry = await readRegistry();
  if (!registry.profiles.some((p) => p.id === id)) return null;
  registry.activeId = id;
  await writeRegistry(registry);
  return registry.profiles.find((p) => p.id === id);
}

export async function renameProfile(id, name) {
  const registry = await readRegistry();
  const profile = registry.profiles.find((p) => p.id === id);
  const cleaned = cleanName(name);
  if (!profile || !cleaned) return null;
  profile.name = cleaned;
  await writeRegistry(registry);
  return profile;
}
