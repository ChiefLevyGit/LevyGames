#!/usr/bin/env node
/**
 * רקע זמני למפת העיר, עד שהתמונה מ-Gemini מגיעה ל-art-src/bg-citymap.jpg.
 * ברגע שהיא שם — `npm run cut` יחתוך אותה ויחליף את הקובץ הזה.
 *   node scripts/make-map-placeholder.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'bg');
mkdirSync(OUT, { recursive: true });

const W = 1600;
const H = 900;

// האזורים תואמים ל-`map` שב-data/levels.ts — פארק שמאל-עליון, חלל ימין-עליון,
// מרכז העיר במרכז, החוף ימין-תחתון.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="park" cx="24%" cy="28%" r="30%">
      <stop offset="0%" stop-color="#86efac"/><stop offset="100%" stop-color="#86efac" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="space" cx="80%" cy="24%" r="26%">
      <stop offset="0%" stop-color="#c7d2fe"/><stop offset="100%" stop-color="#c7d2fe" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shore" cx="76%" cy="81%" r="30%">
      <stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#7dd3fc" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="town" cx="50%" cy="56%" r="28%">
      <stop offset="0%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#fcd34d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#d9f99d"/>
  <rect width="${W}" height="${H}" fill="url(#park)"/>
  <rect width="${W}" height="${H}" fill="url(#space)"/>
  <rect width="${W}" height="${H}" fill="url(#shore)"/>
  <rect width="${W}" height="${H}" fill="url(#town)"/>
  <path d="M ${W * 0.24} ${H * 0.28} L ${W * 0.5} ${H * 0.56} L ${W * 0.8} ${H * 0.24}"
        stroke="#fef3c7" stroke-width="26" fill="none" stroke-linecap="round"/>
  <path d="M ${W * 0.5} ${H * 0.56} L ${W * 0.76} ${H * 0.81}"
        stroke="#fef3c7" stroke-width="26" fill="none" stroke-linecap="round"/>
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(join(OUT, 'bg-citymap.webp'));
console.log('נכתב public/bg/bg-citymap.webp (זמני)');
