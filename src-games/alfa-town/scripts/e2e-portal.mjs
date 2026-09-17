#!/usr/bin/env node
/**
 * בדיקת השילוב בפורטל — מה שבדיקת ה-preview לא יכולה לכסות:
 * שהשמירה עוברת דרך שכבת האחסון של הפורטל ומתויגת לפרופיל,
 * ושחוזה ההתקדמות מגיע לכרטיס בדף הבית.
 *
 *   python -m http.server 8010   (מהשורש של LevyGames/)
 *   node scripts/e2e-portal.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'Design.info', 'shots');
mkdirSync(SHOTS, { recursive: true });

const BASE = (process.argv[2] ?? 'http://localhost:8010').replace(/\/$/, '');
const EXE = process.env.CHROMIUM
  ?? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`;

const pass = [];
const fail = [];
const ok = (name, cond, extra = '') =>
  (cond ? pass : fail).push(`${name}${extra ? ` — ${extra}` : ''}`);

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'he-IL' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => errors.push(`רשת: ${r.url()}`));

// ── המשחק מתוך הפורטל ─────────────────────────────────────────────────────
await page.goto(`${BASE}/games/alfa-town/index.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

/** מסך הכניסה מוצג בכל טעינה. */
async function dismissSplash() {
  const enter = page.getByRole('button', { name: /נכנסות לעיר|ממשיכות לבנות/ });
  if (await enter.count()) { await enter.click(); await page.waitForTimeout(600); }
}
await dismissSplash();

const bridgeUp = await page.evaluate(async () => {
  const api = await window.LevyGames?.ready;
  return !!api?.storage;
});
ok('הגשר של הפורטל נטען והמשחק רואה את שכבת האחסון', bridgeUp);

// המפה היא מסך הפתיחה: בוחרים גיל, נכנסים לשכונה, פותרים מילה.
await page.getByRole('button', { name: 'גילאי 5-6', exact: true }).click();
await page.waitForTimeout(350);
await page.locator('button[aria-label^="מרכז העיר"]').click();
await page.waitForTimeout(500);

const solved = () => page.locator('text=/העיר שלך גדלה|סיימת את כל השכונה/').count();
for (let i = 0; i < 30; i++) {
  if (await solved()) break;
  const keys = page.locator('button[aria-label^="האות"]:not([disabled])');
  if (!(await keys.count())) break;
  await keys.first().click();
  await page.waitForTimeout(70);
}
await page.waitForTimeout(2300); // רצף הנחיתה רץ לפני הכרטיס
ok('מילה נפתרה מתוך הפורטל', (await solved()) > 0);

const keys = await page.evaluate(() => Object.keys(localStorage).sort());
const saveKey = keys.find((k) => k.includes('alfaTown.v2'));
const progKey = keys.find((k) => k.includes('progress.alfa-town'));
ok('השמירה מתויגת לפרופיל דרך שכבת האחסון', !!saveKey, saveKey ?? keys.join(', '));
ok('אין כתיבה ישירה למפתח הפרטי של המשחק',
  !keys.includes('alfatown:v2'), keys.filter((k) => k.startsWith('alfatown:')).join(', '));
ok('רקורד ההתקדמות נכתב', !!progKey, progKey ?? '');

const record = progKey ? await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), progKey) : null;
ok('הרקורד בפורמט חוזה ההתקדמות',
  record?.kind === 'levels' && record.done >= 1 && record.total === 45,
  JSON.stringify(record));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await dismissSplash();
const counter = (await page.locator('header span').first().textContent())?.trim();
ok('ההתקדמות שורדת רענון בתוך הפורטל', /^[1-9]/.test(counter ?? ''), counter);

// ── הכרטיס בדף הבית ───────────────────────────────────────────────────────
await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// הפורטל חוסם את דף הבית עד שנבחר פרופיל. יצירת הפרופיל הראשון גם גוררת
// את המיגרציה מדלי האורח — ולכן זו הזדמנות לבדוק שהשמירה שלי שרדה אותה.
const gate = page.locator('input[placeholder*="השם"]');
if (await gate.count()) {
  await gate.fill('דניאל');
  await page.getByRole('button', { name: /יאללה/ }).click();
  await page.waitForTimeout(1400);
}
await page.screenshot({ path: join(SHOTS, '10-hub.png'), fullPage: true });

const migrated = await page.evaluate(() => {
  const key = Object.keys(localStorage).find(
    (k) => k.includes('alfaTown.v2') && !k.includes('.guest.'));
  return key ? { key, data: JSON.parse(localStorage.getItem(key)) } : null;
});
ok('השמירה עברה מדלי האורח לפרופיל שנוצר',
  (migrated?.data?.solved?.length ?? 0) >= 1, migrated?.key ?? 'לא נמצאה');

const card = await page.evaluate(() => {
  const link = [...document.querySelectorAll('a')]
    .find((a) => (a.getAttribute('href') ?? '').includes('games/alfa-town/index.html'));
  const host = link?.closest('article, li, div[class*="card"], section') ?? link?.parentElement;
  return { found: !!link, text: host?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200) ?? '' };
});
ok('כרטיס המשחק מופיע בדף הבית', card.found);
ok('הכרטיס מציג התקדמות במילים', /מילים/.test(card.text), card.text);

ok('קונסולה ורשת נקיות בפורטל', errors.length === 0, errors.slice(0, 4).join(' | '));

await browser.close();

console.log(`\n✓ ${pass.length} עוברות`);
for (const p of pass) console.log(`   ✓ ${p}`);
if (fail.length) {
  console.log(`\n✗ ${fail.length} נכשלות`);
  for (const f of fail) console.log(`   ✗ ${f}`);
  process.exit(1);
}
