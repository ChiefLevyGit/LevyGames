#!/usr/bin/env node
/**
 * בונה גיליון מגע ממוספר מהספרייטים החתוכים, כדי לזהות ולתייג כל פריט.
 *   node scripts/contact-sheet.mjs
 * פלט: Design.info/contact/<sheet>.png
 */
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(ROOT, 'public', 'sprites');
const OUT = join(ROOT, 'Design.info', 'contact');
mkdirSync(OUT, { recursive: true });

const CELL = 240;
const LABEL = 30;
const COLS = 5;

const files = readdirSync(SPRITES).filter((f) => f.endsWith('.webp'));
const sheets = [...new Set(files.map((f) => f.replace(/-\d+\.webp$/, '')))].sort();

for (const sheet of sheets) {
  const items = files
    .filter((f) => f.startsWith(sheet + '-'))
    .sort((a, b) => Number(a.match(/-(\d+)\.webp$/)[1]) - Number(b.match(/-(\d+)\.webp$/)[1]));

  const rows = Math.ceil(items.length / COLS);
  const W = COLS * CELL;
  const H = rows * (CELL + LABEL);

  const layers = [];
  for (let i = 0; i < items.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL;
    const y = row * (CELL + LABEL);
    const idx = Number(items[i].match(/-(\d+)\.webp$/)[1]);

    const buf = await sharp(join(SPRITES, items[i]))
      .resize({ width: CELL - 16, height: CELL - 16, fit: 'inside' })
      .toBuffer();
    const meta = await sharp(buf).metadata();

    layers.push({
      input: buf,
      left: x + Math.round((CELL - meta.width) / 2),
      top: y + Math.round((CELL - meta.height) / 2),
    });
    layers.push({
      input: Buffer.from(
        `<svg width="${CELL}" height="${LABEL}">
           <rect width="${CELL}" height="${LABEL}" fill="#1f2937"/>
           <text x="${CELL / 2}" y="21" font-family="monospace" font-size="20"
                 font-weight="bold" fill="#fff" text-anchor="middle">${idx}</text>
         </svg>`
      ),
      left: x,
      top: y + CELL,
    });
  }

  await sharp({
    create: { width: W, height: H, channels: 4, background: '#f8fafc' },
  })
    .composite(layers)
    .png()
    .toFile(join(OUT, `${sheet}.png`));

  console.log(`${sheet}: ${items.length} פריטים → Design.info/contact/${sheet}.png`);
}
