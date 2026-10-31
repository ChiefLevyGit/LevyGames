#!/usr/bin/env node
// שימוש: node scripts/generate-sound.mjs [--only step_valid,door_unlock] [--out ../src-games/cipher-rogue/art-src/audio]
//
// קורא את games/The Cipher Rogue/sounds.txt (טבלה מופרדת ב-|), ומייצר קובץ mp3
// לכל שורה דרך ElevenLabs Text-to-Sound-Effects. ELEVENLABS_API_KEY נטען מ-.env.local
// בשורש הריפו (שם הניח אותו `elevenlabs onboard connect`, מוחרג מגיט).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const ENV_FILE = resolve(REPO_ROOT, ".env.local");
const SOUNDS_TXT = resolve(REPO_ROOT, "games/The Cipher Rogue/sounds.txt");
const DEFAULT_OUT_DIR = resolve(REPO_ROOT, "src-games/cipher-rogue/art-src/audio");

process.loadEnvFile(ENV_FILE); // טוען .env.local (כולל ELEVENLABS_API_KEY) ל-process.env

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

// כוונון ידני פר-אפקט: משך, וכמה קרוב להיצמד לפרומפט (0-1). לא נגזר אוטומטית
// מהטקסט החופשי בעמודת "תיאור" - אלה החלטות אומנותיות שנשארות כאן, מרוכזות.
const TUNING = {
  step_valid: { duration_seconds: 0.8, prompt_influence: 0.6 },
  step_invalid: { duration_seconds: 0.8, prompt_influence: 0.6 },
  door_unlock: { duration_seconds: 2.5, prompt_influence: 0.5 },
  alarm_warning: { duration_seconds: 2.0, prompt_influence: 0.6 },
  level_win: { duration_seconds: 2.0, prompt_influence: 0.5 },
  bgm_ambience: { duration_seconds: 12, prompt_influence: 0.3, loop: true },
  correct_answer: { duration_seconds: 1.2, prompt_influence: 0.6 },
  ui_click: { duration_seconds: 0.5, prompt_influence: 0.7 },
  guard_wake: { duration_seconds: 1.8, prompt_influence: 0.5 },
  hint_reveal: { duration_seconds: 1.2, prompt_influence: 0.6 },
  star_pop: { duration_seconds: 0.6, prompt_influence: 0.6 },
  valve_hiss: { duration_seconds: 0.9, prompt_influence: 0.6 },
};
const DEFAULT_TUNING = { duration_seconds: 2.0, prompt_influence: 0.5 };

function parseSoundsTable(raw) {
  const rows = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || !line.includes("|")) continue;
    const cols = line.split("|").map((c) => c.trim());
    const [name, role, description, prompt] = cols;
    if (!name || name === "שם אפקט") continue; // כותרת
    rows.push({ name, role, description, prompt });
  }
  return rows;
}

const args = parseArgs(process.argv.slice(2));
const outDir = args.out ? resolve(process.cwd(), args.out) : DEFAULT_OUT_DIR;
const onlyNames = args.only ? new Set(args.only.split(",").map((s) => s.trim())) : null;

if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.includes("your")) {
  console.error(`לא נמצא ELEVENLABS_API_KEY תקין ב-${ENV_FILE}`);
  process.exit(1);
}

const rows = parseSoundsTable(readFileSync(SOUNDS_TXT, "utf8"));
const selected = onlyNames ? rows.filter((r) => onlyNames.has(r.name)) : rows;
if (selected.length === 0) {
  console.error("לא נמצאו שורות לייצור (בדוק --only או את sounds.txt).");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const client = new ElevenLabsClient(); // קורא ELEVENLABS_API_KEY מ-process.env

for (const row of selected) {
  const tuning = TUNING[row.name] ?? DEFAULT_TUNING;
  const outPath = resolve(outDir, `${row.name}.mp3`);
  console.log(`מייצר ${row.name} (${tuning.duration_seconds}s, influence=${tuning.prompt_influence}${tuning.loop ? ", loop" : ""})...`);
  console.log(`  פרומפט: ${row.prompt}`);

  try {
    const audio = await client.textToSoundEffects.convert({
      text: row.prompt,
      modelId: "eleven_text_to_sound_v2",
      durationSeconds: tuning.duration_seconds,
      promptInfluence: tuning.prompt_influence,
      ...(tuning.loop ? { loop: true } : {}),
    });

    const chunks = [];
    for await (const chunk of audio) chunks.push(chunk);
    writeFileSync(outPath, Buffer.concat(chunks));
    console.log(`  נשמר: ${outPath}`);
  } catch (err) {
    console.error(`  שגיאה ב-${row.name}: ${err.message ?? err}`);
  }
}
