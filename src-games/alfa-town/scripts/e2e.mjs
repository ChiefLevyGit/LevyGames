#!/usr/bin/env node
/**
 * בדיקת קצה-לקצה בדפדפן אמיתי.
 *   npm run preview   (טרמינל נפרד)
 *   node scripts/e2e.mjs [url]
 *
 * מכסה את שלוש ההבטחות של הסבב הזה:
 *   1. אובייקט נכנס לעיר רק על מילה שלמה — אף פעם לא על אות בודדת.
 *   2. אפשר להיכנס ישר לשכונת החלל מהמפה, בלי לסיים שום דבר קודם.
 *   3. רצף הנחיתה רץ לפני כרטיס הסיכום, והכרטיס לא מכסה את הפריט שנחת.
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

async function session(viewport = { width: 1366, height: 768 }) {
  const ctx = await browser.newContext({ viewport, locale: 'he-IL' });
  const page = await ctx.newPage();
  const errors = [];
  // js/levygames-bridge.js חי בפורטל ולא בפרויקט. כשמריצים לבד הוא 404
  // *בכוונה*, והמשחק נופל ל-localStorage. השילוב נבדק ב-e2e-portal.
  const expected = (t) => t.includes('levygames-bridge') || t.includes('404');
  page.on('console', (m) => { if (m.type() === 'error' && !expected(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => { if (!expected(r.url())) errors.push(`רשת: ${r.url()}`); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await dismissSplash(page);
  return { ctx, page, errors };
}

/** מסך הכניסה מוצג בכל טעינה — סוגרים אותו לפני כל בדיקה. */
async function dismissSplash(page) {
  const enter = page.getByRole('button', { name: /נכנסות לעיר|ממשיכות לבנות/ });
  if (await enter.count()) {
    await enter.click();
    await page.waitForTimeout(600);
  }
}

const pickTier = async (page, label) => {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(350);
};
const enterHood = async (page, hood) => {
  await page.locator(`button[aria-label^="${hood}"]`).click();
  await page.waitForTimeout(500);
};
const cityImages = (page) => page.locator('section[dir="ltr"] img').count();
/** נמצאים במפה = ארבעת כפתורי השכונות על המסך. */
const onMap = async (page) => (await page.locator('button[aria-label*="מתוך"]').count()) === 4;
const winBar = (page) => page.locator('text=/העיר שלך גדלה|סיימת את כל השכונה/').count();

/** לוחצת על כל מקש פנוי עד שהמילה נפתרת ומסך הסיכום עולה. */
async function solveByBrute(page, maxClicks = 32) {
  for (let i = 0; i < maxClicks; i++) {
    if (await winBar(page)) break;
    const keys = page.locator('button[aria-label^="האות"]:not([disabled])');
    if (!(await keys.count())) break;
    await keys.first().click();
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(2200); // רצף הנחיתה + כניסת הכרטיס
  return (await winBar(page)) > 0;
}

// ── 0. מסך הכניסה ─────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const enter = page.getByRole('button', { name: /נכנסות לעיר|ממשיכות לבנות/ });
  ok('מסך הכניסה עולה בטעינה', (await enter.count()) === 1);
  ok('מסך הכניסה מציג את שם המשחק', (await page.locator('h1', { hasText: 'אלפא־טאון' }).count()) >= 1);
  await page.screenshot({ path: join(SHOTS, '00-splash.png') });

  await enter.click();
  await page.waitForTimeout(700);
  ok('לחיצה על הכפתור מגיעה למפה',
    (await page.locator('button[aria-label*="מתוך"]').count()) === 4);
  await ctx.close();
}

// ── 1. המפה היא מסך הפתיחה ────────────────────────────────────────────────
{
  const { ctx, page, errors } = await session();

  ok('נפתח על מפת העיר, בלי חלון בחירה חוסם', await onMap(page));
  const hoods = await page.locator('button[aria-label*="מתוך"]').count();
  ok('כל ארבע השכונות מוצגות על המפה', hoods === 4, `${hoods}`);
  await page.screenshot({ path: join(SHOTS, '01-map.png') });

  // ── 2. כניסה ישירה לחלל — התלונה שהסבב הזה מתקן ──────────────────────
  await pickTier(page, 'גילאי 5-6');
  await enterHood(page, 'מגרש החלל');
  ok('אפשר להיכנס ישר לשכונת החלל מהמפה', (await page.locator('text=מגרש החלל').count()) > 0);
  await page.screenshot({ path: join(SHOTS, '02-space-first.png') });

  const before = await cityImages(page);
  ok('שכונת החלל מתחילה ריקה', before === 0, `${before} פריטים`);

  // ── 3. רצף הנחיתה ───────────────────────────────────────────────────
  const keys = page.locator('button[aria-label^="האות"]:not([disabled])');
  for (let i = 0; i < 12; i++) {
    if (await winBar(page)) break;
    const n = await keys.count();
    if (!n) break;
    await keys.first().click();
    await page.waitForTimeout(60);
    const imgs = await cityImages(page);
    if (imgs > before) break; // הפריט התחיל לנחות
  }

  await page.waitForTimeout(500);
  const duringLanding = await winBar(page);
  ok('כרטיס הסיכום לא עולה מיד — הנחיתה מקבלת מסך', duringLanding === 0);
  await page.screenshot({ path: join(SHOTS, '03-landing.png') });

  // הפריט שנוחת הוא באמת מה שנמצא מתחת לעכבר בנקודה שלו
  const onTop = await page.evaluate(() => {
    const img = document.querySelector('section[dir="ltr"] img');
    if (!img) return 'אין פריט';
    const r = img.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return img.contains(hit) || hit === img ? 'ok' : (hit?.tagName ?? '?');
  });
  ok('שום שכבה לא מכסה את הפריט שנוחת', onTop === 'ok', onTop);

  await page.waitForTimeout(2000);
  ok('אחרי הנחיתה כרטיס הסיכום נכנס', (await winBar(page)) > 0);

  // הכרטיס בפס תחתון, והפריט עדיין נראה מעליו
  const layout = await page.evaluate(() => {
    const bar = [...document.querySelectorAll('div')]
      .find((d) => /העיר שלך גדלה|סיימת את כל השכונה/.test(d.textContent ?? '')
        && d.className.includes('bottom-0'));
    const img = document.querySelector('section[dir="ltr"] img');
    if (!bar || !img) return null;
    return { barTop: bar.getBoundingClientRect().top, imgBottom: img.getBoundingClientRect().bottom };
  });
  ok('הכרטיס יושב מתחת לפריט ולא מעליו',
    !!layout && layout.imgBottom <= layout.barTop + 4,
    layout ? `פריט ${Math.round(layout.imgBottom)} / כרטיס ${Math.round(layout.barTop)}` : 'לא נמצא');
  await page.screenshot({ path: join(SHOTS, '04-winbar.png') });

  const after = await cityImages(page);
  ok('מילה שנפתרה הוסיפה פריט אחד לעיר', after === before + 1, `${before} → ${after}`);

  ok('קונסולה ורשת נקיות', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── 4. אות בודדת לא מוסיפה אובייקט ────────────────────────────────────────
{
  const { ctx, page, errors } = await session();
  await pickTier(page, 'גילאי 7-8');
  await enterHood(page, 'מרכז העיר');

  // המילה הראשונה ברמה 2 במרכז העיר היא "רכבת" — ר' נכונה ולא מסיימת אותה
  const before = await cityImages(page);
  await page.locator('button[aria-label="האות ר"]').click();
  await page.waitForTimeout(900);

  const cls = await page.locator('button[aria-label="האות ר"]').getAttribute('class');
  ok('ר׳ התקבלה כאות נכונה ב"רכבת"', /emerald/.test(cls ?? ''));
  ok('אות נכונה בודדת לא הוסיפה אובייקט לעיר',
    (await cityImages(page)) === before, `${before} → ${await cityImages(page)}`);
  ok('אות בודדת לא מפעילה את כרטיס הסיכום', (await winBar(page)) === 0);
  await page.screenshot({ path: join(SHOTS, '05-letter-no-object.png') });

  ok('רמה 2: המילה נפתרת עד הסוף', await solveByBrute(page));
  ok('קונסולה נקייה (רמה 2)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── 5. רמה 3, אות סופית, ופריסה ───────────────────────────────────────────
{
  const { ctx, page, errors } = await session();
  await pickTier(page, 'גילאי 9-10');
  await enterHood(page, 'מרכז העיר');

  const keyCount = await page.locator('button[aria-label^="האות"]').count();
  ok('רמה 3: מקלדת עברית מלאה, 27 מקשים', keyCount === 27, `${keyCount}`);

  const fit = await page.evaluate(() => {
    const vh = window.innerHeight;
    let worst = { bottom: 0, name: '' };
    for (const el of document.querySelectorAll('button[aria-label^="האות"], header button, header a')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > worst.bottom) worst = { bottom: r.bottom, name: el.getAttribute('aria-label') ?? '?' };
    }
    return { over: Math.max(0, worst.bottom - vh), name: worst.name };
  });
  ok('שום מקש לא נחתך בקצה המסך', fit.over <= 1, `חריגה ${fit.over}px אצל "${fit.name}"`);

  // "בניין" היא המילה הראשונה ברמה 3 במרכז העיר
  await page.locator('button[aria-label="האות נ"]').click();
  await page.waitForTimeout(600);
  ok('אות סופית: נ׳ התקבלה כ-ן׳ והוצג ההסבר',
    (await page.locator('text=זו אות סופית').count()) > 0);
  await page.screenshot({ path: join(SHOTS, '06-final-letter.png') });

  ok('רמה 3: המילה נפתרת עד הסוף', await solveByBrute(page));
  ok('קונסולה נקייה (רמה 3)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── 6. שמירה, חזרה למפה, וטאבלט ───────────────────────────────────────────
{
  const { ctx, page, errors } = await session();
  await pickTier(page, 'גילאי 5-6');
  await enterHood(page, 'פארק החיות');
  await solveByBrute(page);

  await page.locator('header button', { hasText: 'גילאי' }).click();
  await page.waitForTimeout(600);
  ok('כפתור החזרה מביא חזרה למפה', await onMap(page));
  ok('הפריט שנפתח מופיע על מפת העיר',
    (await page.locator('div[dir="ltr"] img').count()) >= 1);
  await page.screenshot({ path: join(SHOTS, '07-map-with-item.png') });

  const counter = (await page.locator('header span').first().textContent())?.trim();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissSplash(page);
  const after = (await page.locator('header span').first().textContent())?.trim();
  ok('ההתקדמות נשמרת אחרי רענון', counter === after, `${counter} → ${after}`);

  ok('קונסולה נקייה', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

{
  const { ctx, page, errors } = await session({ width: 820, height: 1180 });
  await pickTier(page, 'גילאי 7-8');
  await enterHood(page, 'החוף');
  const fit = await page.evaluate(() => {
    let worst = 0;
    for (const el of document.querySelectorAll('button[aria-label^="האות"]')) {
      worst = Math.max(worst, el.getBoundingClientRect().bottom);
    }
    return { y: Math.max(0, worst - window.innerHeight), x: Math.max(0, document.documentElement.scrollWidth - window.innerWidth) };
  });
  ok('טאבלט 820x1180: אין חריגה אנכית', fit.y <= 1, `${fit.y}px`);
  ok('טאבלט: אין חריגה אופקית', fit.x <= 1, `${fit.x}px`);
  await page.screenshot({ path: join(SHOTS, '08-tablet.png') });
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
