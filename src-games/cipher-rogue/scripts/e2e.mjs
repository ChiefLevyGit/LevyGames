#!/usr/bin/env node
/**
 * בדיקת קצה-לקצה בדפדפן אמיתי, מתוך הפורטל: משחקת את כל 11 הכספות.
 *
 *   python -m http.server 8765        (מהשורש של LevyGames/, אחרי npm run deploy)
 *   node scripts/e2e.mjs [baseUrl]
 *
 * המסלולים מחושבים באותו פותר שהמשחק משתמש בו לרמזים (node מריץ TS ישירות).
 * מה זה חייב להוכיח:
 *   - צעד שגוי: פעמון, הסבר, סימון מלכודת; מלכודת ידועה לא מצלצלת שוב
 *   - שלושה פעמונים: השומר מתעורר והחדר מתאפס
 *   - רמז מצביע על הצעד הבא הנכון ומגביל ל-2 כוכבים
 *   - שלב 9: פתיחת שסתום, שחרור בחזרה לאבן ירוקה, סגירה שגויה וסגירה נכונה
 *   - כוכבים לפי טעויות, סיום המסע, פתיחת הכספת הסודית ב-24 כוכבים
 *   - שמירה דרך שכבת האחסון של הפורטל, והתקדמות על הכרטיס בדף הבית
 *   - מובייל 390px: אבנים בגודל אצבע, בלי גלילה אופקית, בועה בתוך המסך
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVELS } from '../src/config/levels.ts';
import { solve, initialState } from '../src/systems/MathSystem.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'Design.info', 'shots');
mkdirSync(SHOTS, { recursive: true });

const BASE = (process.argv[2] ?? 'http://127.0.0.1:8765').replace(/\/$/, '');
const GAME = `${BASE}/games/cipher-rogue/index.html`;
const EXE = process.env.CHROMIUM ?? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe');

const pass = [];
const fail = [];
const ok = (name, cond, extra = '') => (cond ? pass : fail).push(`${name}${extra ? ` — ${extra}` : ''}`);

const browser = await chromium.launch({ executablePath: EXE });
const errors = [];
const watch = (page) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push(`רשת: ${r.url()}`));
};

const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'he-IL' });
const page = await ctx.newPage();
watch(page);
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const pause = (ms) => page.waitForTimeout(ms);

// ── פרופיל בפורטל ─────────────────────────────────────────────────────────
await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
await pause(900);
const gate = page.locator('input[placeholder*="השם"]');
if (await gate.count()) {
  await gate.fill('נועה');
  await page.getByRole('button', { name: /יאללה/ }).click();
  await pause(1200);
}

// ── המשחק ─────────────────────────────────────────────────────────────────
await page.goto(GAME, { waitUntil: 'networkidle' });
await pause(1200);
ok('הגשר של הפורטל נטען', await page.evaluate(async () => !!(await window.LevyGames?.ready)?.storage));
await shot('01-title');
await page.getByRole('button', { name: /צאי למסע/ }).click();
await pause(800);
await shot('02-map');
ok('במפה רק הכספת הראשונה פתוחה', (await page.locator('.vault-node.unlocked').count()) === 1);

const tile = (c) => page.locator(`.tile[data-r="${c.row}"][data-c="${c.col}"]`);
const stateOf = async (c) => tile(c).getAttribute('data-state');
const rung = () => page.locator('.bell.rung').count();
const step = async (c, wait = 470) => {
  await tile(c).click();
  await pause(wait);
};
const wrong = async (c) => {
  await tile(c).click();
  await pause(1700);
};
const cell = (row, col) => ({ row, col });

async function enter(id, { tutorial = false } = {}) {
  await page.locator(`[data-level="${id}"] .vault-medal`).click();
  await pause(700);
  await page.getByRole('button', { name: /קדימה, לכספת/ }).click();
  await pause(500);
  if (tutorial) {
    const t = page.getByRole('button', { name: /הבנתי/ });
    ok('הדרכה מוצגת בכספת הראשונה', (await t.count()) === 1);
    if (await t.count()) await t.click();
  }
  await pause(500);
}

async function walk(path) {
  for (const c of path) await step(c);
}

/** מחכה למודאל הסיום, בודק כוכבים, ובוחר כפתור */
async function finish(id, expectStars, button) {
  const dlg = page.getByRole('dialog', { name: 'הכספת נפתחה' });
  await dlg.waitFor({ timeout: 9000 });
  await pause(1700); // הכוכבים נוחתים אחד-אחד
  const label = await page.locator('.complete-card .stars').getAttribute('aria-label');
  ok(`כספת ${id}: ${expectStars} כוכבים`, label?.startsWith(String(expectStars)), label ?? '');
  if (id === 1 || id === 9) await shot(`complete-${id}`);
  await dlg.getByRole('button', { name: button }).click();
  await pause(700);
}

const pathOf = (id) => solve(LEVELS.find((l) => l.id === id), initialState(LEVELS.find((l) => l.id === id)));

// ── כספת 1: הדרכה, צעד שגוי, מלכודת ידועה ────────────────────────────────
await enter(1, { tutorial: true });
await shot('03-level1');
await wrong(cell(4, 1)); // 5 - לא זוגי
ok('צעד שגוי מצלצל בפעמון אחד', (await rung()) === 1);
ok('האבן השגויה מסומנת כמלכודת', (await stateOf(cell(4, 1))) === 'trap');
const whisper = await page.locator('.whisper').textContent();
ok('ההסבר אומר למה 5 לא זוגי', /5 לא זוגי/.test(whisper ?? ''), whisper ?? '');
await shot('04-wrong');
await wrong(cell(4, 1));
ok('מלכודת ידועה לא מצלצלת שוב', (await rung()) === 1);
const p1 = pathOf(1);
await step(p1[0], 300);
ok('צעד נכון מדליק את האבן בירוק', (await stateOf(p1[0])) === 'good');
await pause(150);
await shot('05-right');
await walk(p1.slice(1));
await finish(1, 2, /אל החדר הבא/);

// ── כספת 2: שלושה פעמונים, השומר מתעורר, ואז רמז ──────────────────────────
await page.getByRole('button', { name: /קדימה, לכספת/ }).click();
await pause(900);
await wrong(cell(4, 1)); // 13
await step(cell(3, 0)); // 5
await wrong(cell(3, 1)); // 11
await step(cell(2, 0)); // 10
await tile(cell(1, 0)).click(); // 16 - הפעמון השלישי
await pause(1400);
const wake = page.getByRole('dialog', { name: 'השומר התעורר' });
ok('בפעמון השלישי השומר מתעורר', (await wake.count()) === 1);
await shot('06-guard-wakes');
await pause(3600);
ok('אחרי ההתעוררות הפעמונים נרגעו', (await rung()) === 0);
ok('החדר אופס - האבנים חזרו לרגילות', (await stateOf(cell(3, 0))) === 'normal' && (await stateOf(cell(1, 0))) === 'normal');
const p2 = pathOf(2);
await page.getByRole('button', { name: /רמז/ }).click();
await pause(500);
const hinted = await page.locator('.tile.hinted').first();
const hr = Number(await hinted.getAttribute('data-r'));
const hc = Number(await hinted.getAttribute('data-c'));
ok('הרמז מצביע על הצעד הבא הנכון', hr === p2[0].row && hc === p2[0].col, `(${hr},${hc})`);
await shot('07-hint');
await pause(2800);
await walk(p2);
await finish(2, 1, /אל החדר הבא/);

// ── כספות 3-8: פריצה מושלמת ──────────────────────────────────────────────
for (const id of [3, 4, 5, 6, 7, 8]) {
  await page.getByRole('button', { name: /קדימה, לכספת/ }).click();
  await pause(900);
  await walk(pathOf(id));
  await finish(id, 3, /אל החדר הבא/);
}

// ── כספת 9: השסתום ───────────────────────────────────────────────────────
await page.getByRole('button', { name: /קדימה, לכספת/ }).click();
await pause(900);
await step(cell(4, 0)); // 50 - פתיחה בלי השלמה צמודה
ok('שלב 9: צעד ראשון פותח שסתום', (await stateOf(cell(4, 0))) === 'pending');
ok('שלב 9: מד השסתום מראה זוג פתוח', (await page.locator('.gauge.open').count()) === 1);
await shot('08-valve-open');
await step(cell(4, 1)); // חזרה להתחלה הירוקה
ok('שלב 9: חזרה לאבן ירוקה משחררת את השסתום', (await stateOf(cell(4, 0))) === 'normal' && (await page.locator('.gauge.open').count()) === 0);
ok('שלב 9: שחרור לא עולה פעמון', (await rung()) === 0);
await step(cell(3, 1)); // 30
await wrong(cell(3, 2)); // 25 - 30+25=55
ok('שלב 9: סגירה שגויה מצלצלת', (await rung()) === 1);
ok('שלב 9: הזוג הפתוח נשאר פתוח אחרי טעות', (await stateOf(cell(3, 1))) === 'pending');
await step(cell(2, 1)); // 70
ok('שלב 9: סגירה נכונה מאשרת את שתי האבנים', (await stateOf(cell(3, 1))) === 'good' && (await stateOf(cell(2, 1))) === 'good');
await walk([cell(2, 2), cell(1, 2), cell(1, 3), cell(0, 3)]);
await finish(9, 2, /אל החדר הבא/);

// ── כספת 10 + סיום המסע + פתיחת הסודית ───────────────────────────────────
await page.getByRole('button', { name: /קדימה, לכספת/ }).click();
await pause(900);
await walk(pathOf(10));
const dlg10 = page.getByRole('dialog', { name: 'הכספת נפתחה' });
await dlg10.waitFor({ timeout: 9000 });
await pause(1700);
ok('ב-24 כוכבים מוכרז על הכספת הסודית', (await page.locator('.complete-card .secret-unlocked').count()) === 1);
await page.getByRole('button', { name: /לכספת הסודית/ }).click();
await pause(900);
const finale = page.getByRole('dialog', { name: 'סיום המסע' });
ok('אחרי הכספת העשירית יש חגיגת סיום', (await finale.count()) === 1);
await pause(600);
await shot('09-finale');
await finale.getByRole('button', { name: /למגדל/ }).click();
await pause(900);
ok('הקיר הסודי נפתח במגדל', (await page.locator('.vault-node.secret.unlocked').count()) === 1);
await shot('10-map-secret');

await enter(11);
await walk(pathOf(11));
await finish(11, 3, /למגדל/);
const secretFinale = page.getByRole('dialog', { name: 'סיום המסע' });
ok('הכספת הסודית מסתיימת בחגיגה משלה', (await secretFinale.count()) === 1);
await secretFinale.getByRole('button', { name: /למגדל/ }).click();
await pause(800);
ok('המדף מלא - 10 אוצרות', (await page.locator('.shelf-item.got').count()) === 10);

// ── שמירה וחוזה ההתקדמות ─────────────────────────────────────────────────
const keys = await page.evaluate(() => Object.keys(localStorage));
const saveKey = keys.find((k) => k.includes('cipherRogue.v1'));
const progKey = keys.find((k) => k.includes('progress.cipher-rogue'));
ok('השמירה מתויגת לפרופיל דרך שכבת האחסון', !!saveKey && !saveKey.includes('.guest.'), saveKey ?? '');
ok('אין כתיבה למפתח ה-fallback', !keys.includes('cipherrogue:v1'));
const record = progKey ? await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), progKey) : null;
ok('רקורד ההתקדמות: 10/10 כספות', record?.kind === 'levels' && record.done === 10 && record.total === 10, JSON.stringify(record));

await page.reload({ waitUntil: 'networkidle' });
await pause(1100);
ok('ההתקדמות שורדת רענון', (await page.getByRole('button', { name: /להמשיך במסע/ }).count()) === 1);

await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
await pause(1500);
const card = await page.evaluate(() => {
  const host = document.querySelector('[data-game-id="cipher-rogue"]');
  const link = host?.querySelector('a[href*="games/cipher-rogue/index.html"]');
  return {
    found: !!link,
    progress: host?.querySelector('.game-progress')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    video: !!host?.querySelector('video'),
  };
});
ok('הכרטיס מופיע בדף הבית', card.found);
ok('הכרטיס מציג התקדמות בכספות', /10.*10.*כספות|כספות/.test(card.progress) && /10/.test(card.progress), card.progress);
ok('הכרטיס מציג וידאו', card.video);
await page.screenshot({ path: join(SHOTS, '11-hub.png'), fullPage: true });

// ── מובייל ────────────────────────────────────────────────────────────────
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', hasTouch: true, isMobile: true });
const m = await mctx.newPage();
watch(m);
await m.goto(`${GAME}?all`, { waitUntil: 'networkidle' });
await m.waitForTimeout(1000);
await m.getByRole('button', { name: /צאי למסע|להמשיך/ }).click();
await m.waitForTimeout(700);
await m.screenshot({ path: join(SHOTS, '12-mobile-map.png') });
await m.locator('[data-level="9"] .vault-medal').click();
await m.waitForTimeout(700);
await m.screenshot({ path: join(SHOTS, '13-mobile-intro9.png') });
await m.getByRole('button', { name: /קדימה, לכספת/ }).click();
await m.waitForTimeout(900);
await m.locator('.tile[data-r="3"][data-c="1"]').tap();
await m.waitForTimeout(600);
await m.screenshot({ path: join(SHOTS, '14-mobile-level9.png') });
const lay = await m.evaluate(() => {
  const t = document.querySelector('.tile').getBoundingClientRect();
  const w = document.querySelector('.whisper').getBoundingClientRect();
  const b = document.querySelector('.board').getBoundingClientRect();
  return { tile: t.width, overflow: document.documentElement.scrollWidth - innerWidth, w: [w.left, w.right], board: [b.left, b.right, b.bottom], wTop: w.top, innerWidth };
});
ok('מובייל: אבן בגודל אצבע (44px+)', lay.tile >= 44, `${Math.round(lay.tile)}px`);
ok('מובייל: אין גלילה אופקית', lay.overflow <= 0, String(lay.overflow));
ok('מובייל: הלוח בתוך המסך', lay.board[0] >= 0 && lay.board[1] <= lay.innerWidth, JSON.stringify(lay.board));
ok('מובייל: הבועה בתוך המסך', lay.w[0] >= 0 && lay.w[1] <= lay.innerWidth, JSON.stringify(lay.w));
ok('מובייל: הבועה לא מכסה את הלוח', lay.wTop >= lay.board[2] - 1, `${Math.round(lay.wTop)} / ${Math.round(lay.board[2])}`);

// ── מקלדת + צמצום תנועה ──────────────────────────────────────────────────
// בצמצום תנועה כל האנימציות מדולגות - הזרימה (קפיצה, דלת, מודאל) חייבת לא להיתקע
const kctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'he-IL', reducedMotion: 'reduce' });
const k = await kctx.newPage();
watch(k);
await k.goto(`${GAME}?all`, { waitUntil: 'networkidle' });
await k.waitForTimeout(900);
await k.getByRole('button', { name: /צאי למסע|להמשיך/ }).click();
await k.waitForTimeout(500);
await k.locator('[data-level="1"] .vault-medal').click();
await k.waitForTimeout(500);
await k.getByRole('button', { name: /קדימה, לכספת/ }).click();
await k.waitForTimeout(400);
const tut = k.getByRole('button', { name: /הבנתי/ });
if (await tut.count()) await tut.click();
await k.waitForTimeout(400);
// 2 → 4 → 10 → 6 → 14 → 8 → 12 : למעלה, שמאלה, למעלה, למעלה, ימינה, למעלה
for (const key of ['ArrowUp', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowUp']) {
  await k.keyboard.press(key);
  await k.waitForTimeout(380);
}
const kDone = k.getByRole('dialog', { name: 'הכספת נפתחה' });
await kDone.waitFor({ timeout: 8000 }).catch(() => undefined);
ok('מקלדת: אפשר לפרוץ כספת שלמה עם החצים', (await kDone.count()) === 1);
ok('צמצום תנועה: הזרימה לא נתקעת עד מודאל הסיום', (await kDone.count()) === 1);

const real = errors.filter((e) => !/favicon/.test(e));
ok('קונסולה ורשת נקיות', real.length === 0, real.slice(0, 5).join(' | '));

await browser.close();

console.log(`\n✓ ${pass.length} עוברות`);
for (const p of pass) console.log(`   ✓ ${p}`);
if (fail.length) {
  console.log(`\n✗ ${fail.length} נכשלות`);
  for (const f of fail) console.log(`   ✗ ${f}`);
  process.exit(1);
}
