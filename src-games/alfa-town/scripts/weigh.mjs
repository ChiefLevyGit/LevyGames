#!/usr/bin/env node
/** מודד את משקל הטעינה הראשונה. node scripts/weigh.mjs <url> */
import { chromium } from 'playwright-core';

const EXE = process.env.CHROMIUM
  ?? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`;

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await ctx.newPage();

let bytes = 0;
const byType = {};
page.on('response', async (r) => {
  try {
    const buf = await r.body();
    bytes += buf.length;
    const ext = new URL(r.url()).pathname.split('.').pop() || 'other';
    byType[ext] = (byType[ext] ?? 0) + buf.length;
  } catch { /* redirect / no body */ }
});

await page.goto(process.argv[2] ?? 'http://localhost:4175/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log(`טעינה ראשונה: ${(bytes / 1024).toFixed(0)} KB`);
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${(v / 1024).toFixed(0)} KB`);
}
await browser.close();
