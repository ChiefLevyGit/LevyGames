#!/usr/bin/env node
// שימוש: node scripts/generate-image.mjs --prompt "תיאור התמונה" --out assets/chess/king.png [--size 1024x1024]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const ENV_FILE = resolve(REPO_ROOT, "..", ".env.local"); // מחוץ ל-repo

function loadEnvLocal(path) {
  const env = {};
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function parseArgs(argv) {
  const out = { size: "1024x1024" };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    out[key] = argv[i + 1];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.prompt || !args.out) {
  console.error('שימוש: node scripts/generate-image.mjs --prompt "..." --out assets/<תיקייה>/<שם קובץ>.png');
  process.exit(1);
}

const env = loadEnvLocal(ENV_FILE);
const apiKey = env.OPENAI_API_KEY;
if (!apiKey || apiKey.includes("your")) {
  console.error(`לא נמצא OPENAI_API_KEY תקין ב-${ENV_FILE}`);
  process.exit(1);
}

const outPath = resolve(REPO_ROOT, args.out);
mkdirSync(dirname(outPath), { recursive: true });

console.log(`מייצר תמונה (${args.size})...`);
const res = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-image-1",
    prompt: args.prompt,
    size: args.size,
    n: 1,
    ...(args.background ? { background: args.background, output_format: "png" } : {}),
  }),
});

if (!res.ok) {
  const errText = await res.text();
  console.error(`שגיאה מ-OpenAI (${res.status}): ${errText}`);
  process.exit(1);
}

const data = await res.json();
const b64 = data.data[0].b64_json;
writeFileSync(outPath, Buffer.from(b64, "base64"));
console.log(`נשמר: ${outPath}`);
