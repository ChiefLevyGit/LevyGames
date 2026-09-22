#!/usr/bin/env node
/**
 * בדיקת קצה-לקצה בדפדפן אמיתי.
 *   npm run preview   (טרמינל נפרד)
 *   node scripts/e2e.mjs [url]
 *
 * מה שהסבב הזה חייב להוכיח:
 *   1. אובייקט נכנס לעיר רק כל 3 מילים — לא בכל מילה.
 *   2. מד ההתקדמות מראה כמה נשאר ואיזה פריט מחכה.
 *   3. לחיצה על שכונה במפה פותחת את האוסף שלה, ורק הכפתור נכנס למשחק.
 *   4. מתג הקול נמצא בשלושת המסכים והבחירה שורדת רענון.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'Design.info', 'shots');
mkdirSync(SHOTS, { recursive: true });

const URL = process.argv[2] ?? 'http://localhost:4173/';
const EXE = process.env.CHROMIUM
  ?? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`;

const pass = [];
const fail = [];
const ok = (name, cond, extra = '') =>
  (cond ? pass : fail).push(`${name}${extra ? ` — ${extra}` : ''}`);

const browser = await chromium.launch({ executablePath: EXE });

/** הגשר חי בפורטל ולא בפרויקט; כשמריצים לבד הוא 404 בכוונה. */
const expected = (t) => t.includes('levygames-bridge') || t.includes('404');

async function session(viewport = { width: 1366, height: 768 }) {
  const ctx = await browser.newContext({ viewport, locale: 'he-IL' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !expected(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => { if (!expected(r.url())) errors.push(`רשת: ${r.url()}`); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return { ctx, page, errors };
}

const enterGame = async (page) => {
  const b = page.getByRole('button', { name: /נכנסות לעיר|ממשיכות לבנות/ });
  if (await b.count()) { await b.click(); await page.waitForTimeout(700); }
};
const onMap = async (page) => (await page.locator('button[aria-label*="מתוך"]').count()) === 4;
const pickTier = async (page, label) => {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(350);
};

/** פותחת את פאנל השכונה ואז נכנסת למשחק. */
const playHood = async (page, hood) => {
  await page.locator(`button[aria-label^="${hood}"]`).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'שחקי כאן' }).click();
  await page.waitForTimeout(600);
};

const cityItems = (page) => page.locator('section[dir="ltr"] img').count();
const winBar = (page) => page.locator('text=/הצטרף לעיר שלך|מילים ו|יפה מאוד/').count();
const joinedCity = (page) => page.locator('text=/הצטרף לעיר שלך/').count();

const meterNow = async (page) => {
  const el = page.locator('[role="progressbar"]');
  return (await el.count()) ? Number(await el.getAttribute('aria-valuenow')) : -1;
};

/** פותרת את המילה הנוכחית בלחיצה על כל המקשים, וממתינה לסיום הרצף. */
async function solveWord(page) {
  // הכרטיס הקודם עדיין יוצא מהמסך באנימציה — בלי ההמתנה הזו הלולאה
  // רואה אותו, חושבת שהמילה כבר נפתרה, ויוצאת בלי ללחוץ על כלום.
  for (let i = 0; i < 20 && (await winBar(page)); i++) await page.waitForTimeout(150);
  for (let i = 0; i < 32; i++) {
    if (await winBar(page)) break;
    const keys = page.locator('button[aria-label^="האות"]:not([disabled])');
    if (!(await keys.count())) break;
    await keys.first().click();
    await page.waitForTimeout(65);
  }
  await page.waitForTimeout(2300); // רצף הנחיתה + כניסת הכרטיס
  return (await winBar(page)) > 0;
}

async function advance(page) {
  const b = page.getByRole('button', { name: 'המילה הבאה' });
  if (await b.count()) { await b.click(); await page.waitForTimeout(800); }
}

// ── 0. מסך הכניסה ─────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await session();
  ok('מסך הכניסה עולה בטעינה',
    (await page.getByRole('button', { name: /נכנסות לעיר|ממשיכות לבנות/ }).count()) === 1);
  ok('מתג הקול קיים כבר במסך הכניסה',
    (await page.getByRole('button', { name: /השתקת צלילים|הפעלת צלילים/ }).count()) === 1,
    'אמור להיות בדיוק אחד — הכותרת לא מרונדרת מתחת למסך הכניסה');
  await page.screenshot({ path: join(SHOTS, '00-splash.png') });

  await enterGame(page);
  ok('אחרי הכניסה מגיעים למפה', await onMap(page));
  await page.screenshot({ path: join(SHOTS, '01-map.png') });
  ok('קונסולה נקייה', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── 1. פאנל השכונה ────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await session();
  await enterGame(page);
  await pickTier(page, 'גילאי 5-6');

  await page.locator('button[aria-label^="מגרש החלל"]').click();
  await page.waitForTimeout(700);
  ok('לחיצה על שכונה פותחת את פאנל האוסף',
    (await page.getByRole('button', { name: 'שחקי כאן' }).count()) === 1);
  const shadows = await page.locator('img[alt="עדיין לא נפתח"]').count();
  ok('הפאנל מציג גם את מה שטרם נפתח, כצלליות', shadows === 7, `${shadows} צלליות`);
  ok('הפאנל מראה כמה מילים נשארו לפרס הבא',
    (await page.locator('text=/עוד/').count()) > 0);
  await page.screenshot({ path: join(SHOTS, '02-hoodpanel.png') });

  await page.getByRole('button', { name: 'שחקי כאן' }).click();
  await page.waitForTimeout(700);
  ok('הכפתור נכנס למשחק בשכונה שנבחרה',
    (await page.locator('text=מגרש החלל').count()) > 0);
  ok('קונסולה נקייה (פאנל)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── 2. הלב: אובייקט רק כל 3 מילים ─────────────────────────────────────────
{
  const { ctx, page, errors } = await session();
  await enterGame(page);
  await pickTier(page, 'גילאי 5-6');
  await playHood(page, 'מגרש החלל');

  const start = await cityItems(page);
  ok('השכונה מתחילה ריקה', start === 0, `${start}`);
  ok('המד מתחיל על 0', (await meterNow(page)) === 0);
  await page.screenshot({ path: join(SHOTS, '03-meter-empty.png') });

  await solveWord(page);
  const after1 = await cityItems(page);
  ok('מילה 1: לא נכנס אובייקט', after1 === 0, `${after1}`);
  await advance(page);
  const m1 = await meterNow(page);
  ok('מילה 1: המד עלה ל-1', m1 === 1, `${m1}`);

  await solveWord(page);
  const after2 = await cityItems(page);
  ok('מילה 2: עדיין בלי אובייקט', after2 === 0, `${after2}`);
  await advance(page);
  const m2 = await meterNow(page);
  ok('מילה 2: המד עלה ל-2', m2 === 2, `${m2}`);
  await page.screenshot({ path: join(SHOTS, '04-meter-two.png') });

  await solveWord(page);
  const after3 = await cityItems(page);
  ok('מילה 3: האובייקט נכנס לעיר', after3 === 1, `${after3}`);
  ok('מילה 3: הכרטיס מכריז על הפריט שהצטרף', (await joinedCity(page)) > 0);
  await page.screenshot({ path: join(SHOTS, '05-prize.png') });
  await advance(page);
  const m3 = await meterNow(page);
  ok('אחרי הפרס המד מתאפס', m3 === 0, `${m3}`);

  ok('קונסולה נקייה (מד)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── 3. רמה 3, אות סופית ופריסה ────────────────────────────────────────────
{
  const { ctx, page, errors } = await session();
  await enterGame(page);
  await pickTier(page, 'גילאי 9-10');
  await playHood(page, 'מרכז העיר');

  const keys = await page.locator('button[aria-label^="האות"]').count();
  ok('רמה 3: מקלדת עברית מלאה, 27 מקשים', keys === 27, `${keys}`);

  const fit = await page.evaluate(() => {
    let worst = { bottom: 0, name: '' };
    for (const el of document.querySelectorAll('button[aria-label^="האות"], header button, header a')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > worst.bottom) worst = { bottom: r.bottom, name: el.getAttribute('aria-label') ?? '?' };
    }
    return { over: Math.max(0, worst.bottom - window.innerHeight), name: worst.name };
  });
  ok('שום מקש לא נחתך בקצה המסך', fit.over <= 1, `חריגה ${fit.over}px אצל ${fit.name}`);

  // המילה הראשונה ברמה 3 במרכז העיר מסתיימת באות סופית
  await page.locator('button[aria-label="האות נ"]').click();
  await page.waitForTimeout(600);
  ok('אות סופית התקבלה דרך הצורה הרגילה והוצג הסבר',
    (await page.locator('text=זו אות סופית').count()) > 0);
  await page.screenshot({ path: join(SHOTS, '06-final-letter.png') });
  ok('רמה 3: המילה נפתרת עד הסוף', await solveWord(page));
  ok('קונסולה נקייה (רמה 3)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── 4. מתג הקול ───────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await session();
  await enterGame(page);
  ok('מתג הקול קיים במפה',
    (await page.getByRole('button', { name: 'השתקת צלילים' }).count()) === 1);

  await page.getByRole('button', { name: 'השתקת צלילים' }).click();
  await page.waitForTimeout(300);
  ok('אחרי לחיצה המתג עובר למצב מושתק',
    (await page.getByRole('button', { name: 'הפעלת צלילים' }).count()) === 1);
  ok('המצב המושתק נראה גם בלי לקרוא', (await page.locator('text=מושתק').count()) > 0);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  ok('ההשתקה שורדת רענון',
    (await page.getByRole('button', { name: 'הפעלת צלילים' }).count()) >= 1);

  await enterGame(page);
  await pickTier(page, 'גילאי 7-8');
  await playHood(page, 'החוף');
  ok('מתג הקול קיים גם במסך המשחק',
    (await page.getByRole('button', { name: /הפעלת צלילים|השתקת צלילים/ }).count()) === 1);
  ok('קונסולה נקייה (קול)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── 5. טאבלט ──────────────────────────────────────────────────────────────
{
  const { ctx, page, errors } = await session({ width: 820, height: 1180 });
  await enterGame(page);
  await pickTier(page, 'גילאי 7-8');
  await playHood(page, 'פארק החיות');
  const fit = await page.evaluate(() => {
    let worst = 0;
    for (const el of document.querySelectorAll('button[aria-label^="האות"]')) {
      worst = Math.max(worst, el.getBoundingClientRect().bottom);
    }
    return {
      y: Math.max(0, worst - window.innerHeight),
      x: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });
  ok('טאבלט 820x1180: אין חריגה אנכית', fit.y <= 1, `${fit.y}px`);
  ok('טאבלט: אין חריגה אופקית', fit.x <= 1, `${fit.x}px`);
  await page.screenshot({ path: join(SHOTS, '07-tablet.png') });
  ok('קונסולה נקייה (טאבלט)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

await browser.close();

console.log(`\n✓ ${pass.length} עוברות`);
for (const p of pass) console.log(`   ✓ ${p}`);
if (fail.length) {
  console.log(`\n✗ ${fail.length} נכשלות`);
  for (const f of fail) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\nצילומים: Design.info/shots/`);
