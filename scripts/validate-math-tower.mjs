// ולידציה למחולל של "מכונות המגדל": מריץ כל מכונה שנבנתה, בכל קומה של כל
// מסלול (לפי הלוח של המסלול עצמו), על 1000 seeds, ומוודא שכל חידה תקינה.
//   node scripts/validate-math-tower.mjs
//
// מסלול קטנה, קומות 13+: בדיקות תקרת-ידע של כיתה א' (ראו GDD):
// חיבור עד 20, חיסור עד 10, חילוק מספר עד 20 במחלק עד 10, ספירה עד 100.

import { FLOORS_BY_TRACK } from '../games/math-tower/js/floors.js';
import { generate, canGenerate, makeRng, rightValue, pipesFill } from '../games/math-tower/js/generate.js';

const SEEDS = 1000;
const LIMITS = {
  little: { choices: 3 },
  g3: { maxValue: 100, choices: 4 },
};
// תקרת ערך לפי מסלול/קומה/מכונה
function maxValueFor(p) {
  if (p.track === 'g3') return 100;
  if (p.floor <= 12) return 10;
  return p.machine === 'gears' ? 100 : 20;
}

const errors = [];
const seen = {}; // כמה חידות שונות יש לכל (קומה, מכונה) - מגוון
let checked = 0;

function check(p, seed) {
  const where = `${p.track} floor ${p.floor} ${p.machine}/${p.kind} seed ${seed}`;
  const fail = (msg) => errors.push(`${where}: ${msg} ${JSON.stringify(p)}`);
  const lim = LIMITS[p.track];
  const maxValue = maxValueFor(p);
  const ext = p.track === 'little' && p.floor > 12;

  const common = (values, choicesOk) => {
    if (values.some((v) => !Number.isInteger(v) || v < 0)) fail('non-integer or negative value');
    if (values.some((v) => v > maxValue)) fail(`value above ${maxValue}`);
    if (p.choices.length !== lim.choices) fail(`expected ${lim.choices} choices, got ${p.choices.length}`);
    if (new Set(p.choices).size !== p.choices.length) fail('duplicate choices');
    if (!p.choices.includes(p.answer)) fail('answer not among choices');
    if (!choicesOk) fail('wrong-answer choice also satisfies the puzzle');
  };

  if (p.machine === 'scale') {
    // פתרון יחיד: בדיוק משקולת אחת מאזנת
    const balancing = p.choices.filter((c) => rightValue(p.right, c) === p.left.value);
    common([p.left.value, p.answer, ...p.choices, ...(p.right.k != null ? [p.right.k] : [])], balancing.length === 1 && balancing[0] === p.answer);
    if (p.left.groups && p.left.groups.reduce((s, g) => s + g, 0) !== p.left.value) fail('groups do not sum');
    if ((p.track === 'g3' || ext || p.kind === 'add' || p.kind === 'sub') && !p.eq) fail('missing eq');

    if (ext) {
      // תקרת כיתה א'
      if (p.left.groups && p.left.value > 12) fail('apples above 12');
      if (p.kind === 'sub' || p.kind === 'sub-missing') {
        if (p.left.value > 10) fail('subtraction minuend above 10');
        if (p.answer < 1) fail('subtraction answer < 1');
      }
      if (p.kind === 'div') {
        const m = /^(\d+) ÷ (\d+)$/.exec(p.left.label);
        if (!m) fail('div label malformed');
        else {
          const [c, b] = [Number(m[1]), Number(m[2])];
          if (c > 20 || b > 10 || b < 2) fail(`division out of range ${c}/${b}`);
          if (c % b !== 0 || c / b !== p.answer || p.answer < 2) fail('division not exact / answer wrong');
        }
      }
      if (p.kind === 'add' || p.kind === 'add3') {
        const nums = p.left.label.split('+').map((x) => Number(x.trim()));
        if (nums.reduce((s, v) => s + v, 0) !== p.answer) fail('addition answer mismatch');
        if (p.answer > 20) fail('sum above 20');
      }
      if (p.kind === 'missing' && p.right.k + p.answer !== p.left.value) fail('missing-addend mismatch');
    }
  }

  if (p.machine === 'pipes') {
    const onlyAnswerFills = p.choices.filter((c) => pipesFill(c, p.k) === p.total);
    common([p.total, p.k, p.answer, ...p.choices], onlyAnswerFills.length === 1 && onlyAnswerFills[0] === p.answer);
    if (p.total !== p.k * p.answer) fail('total != k * answer');
    if (ext) {
      if (p.k > 5 || p.k < 2) fail('pipes k out of 2..5');
      if (p.total > 20) fail('pipes total above 20');
    }
  }

  if (p.machine === 'gears') {
    if (p.visible[p.hidden] !== null) fail('hidden slot not null in visible[]');
    if (p.visible.filter((v) => v === null).length !== 1) fail('more than one hidden slot');
    common(p.visible.filter((v) => v !== null).concat(p.answer, p.choices), true);
    if (ext) {
      // ה-? נגזר משני גלויים סמוכים: ההפרש הקבוע חייב להיות עקבי
      const vis = p.visible.filter((v) => v !== null);
      const full = p.visible.map((v, i) => (i === p.hidden ? p.answer : v));
      const step = full[1] - full[0];
      if (!full.every((v, i) => i === 0 || v - full[i - 1] === step)) fail('sequence step not constant');
      if (![1, 2, 5, 10].includes(Math.abs(step))) fail(`unexpected step ${step}`);
      if (Math.abs(step) >= 5 && full.some((v) => v % Math.abs(step) !== 0)) fail('skip count not on multiples');
      if (p.hidden > 0 && p.hidden < p.length - 1 && vis.length !== p.length - 1) fail('bad middle gap');
      if (full.some((v) => v < 1)) fail('sequence below 1');
    }
  }

  if (p.machine === 'shapes') {
    common([p.answer, ...p.choices], true);
    if (p.sides && p.sides.length < 3) fail('perimeter shape needs >= 3 sides');
    if (ext && (p.kind === 'perimeter')) fail('perimeter not in little');
  }

  const key = `${p.track}:${p.floor}:${p.machine}`;
  (seen[key] ||= new Set()).add(JSON.stringify({ ...p, choices: undefined }));
  checked++;
}

for (const track of Object.keys(LIMITS)) {
  FLOORS_BY_TRACK[track].forEach((machines, i) => {
    const floor = i + 1;
    for (const machine of new Set(machines)) {
      if (!canGenerate(machine)) continue;
      for (let seed = 1; seed <= SEEDS; seed++) {
        check(generate(machine, track, floor, makeRng(seed * 7919 + floor)), seed);
      }
    }
  });
}

// מגוון: קומה שבה יש פחות מ-8 חידות שונות למכונה = חזרתיות מורגשת
const thin = Object.entries(seen).filter(([k, v]) => k.startsWith('little:') && Number(k.split(':')[1]) > 12 && v.size < 8);
if (thin.length) console.warn('⚠ low variety (<8 distinct puzzles):', thin.map(([k, v]) => `${k}=${v.size}`).join(', '));

if (errors.length) {
  console.error(errors.slice(0, 20).join('\n'));
  console.error(`\n✗ ${errors.length} errors in ${checked} puzzles`);
  process.exit(1);
}
console.log(`✓ ${checked} puzzles valid`);
