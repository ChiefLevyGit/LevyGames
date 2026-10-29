// ולידציה למחולל של "מכונות המגדל": מריץ כל מכונה שנבנתה, בכל קומה ובשני
// המסלולים, על 1000 seeds, ומוודא שכל חידה תקינה.
//   node scripts/validate-math-tower.mjs

import { FLOORS } from '../games/math-tower/js/floors.js';
import { generate, canGenerate, makeRng, rightValue, pipesFill } from '../games/math-tower/js/generate.js';

const SEEDS = 1000;
const LIMITS = {
  little: { maxValue: 10, choices: 3 },
  g3: { maxValue: 100, choices: 4 },
};

const errors = [];
let checked = 0;

function check(p, seed) {
  const where = `${p.track} floor ${p.floor} ${p.machine}/${p.kind} seed ${seed}`;
  const fail = (msg) => errors.push(`${where}: ${msg} ${JSON.stringify(p)}`);
  const lim = LIMITS[p.track];

  if (p.machine === 'scale') {
    const values = [p.left.value, p.answer, ...p.choices, ...(p.right.k != null ? [p.right.k] : [])];
    if (values.some((v) => !Number.isInteger(v) || v < 0)) fail('non-integer or negative value');
    if (values.some((v) => v > lim.maxValue)) fail(`value above ${lim.maxValue}`);
    if (p.choices.length !== lim.choices) fail(`expected ${lim.choices} choices, got ${p.choices.length}`);
    if (new Set(p.choices).size !== p.choices.length) fail('duplicate choices');
    // פתרון יחיד: בדיוק משקולת אחת מאזנת
    const balancing = p.choices.filter((c) => rightValue(p.right, c) === p.left.value);
    if (balancing.length !== 1 || balancing[0] !== p.answer) fail(`balancing choices: ${balancing}`);
    if (p.left.groups && p.left.groups.reduce((s, g) => s + g, 0) !== p.left.value) fail('groups do not sum');
    if ((p.track === 'g3' || p.kind === 'add' || p.kind === 'sub') && !p.eq) fail('missing eq');
  }

  // בדיקות משותפות לכל מכונה: תחום, שלמות, ייחודיות, ושיש בדיוק תשובה אחת נכונה
  const common = (values, choicesOk) => {
    if (values.some((v) => !Number.isInteger(v) || v < 0)) fail('non-integer or negative value');
    if (values.some((v) => v > lim.maxValue)) fail(`value above ${lim.maxValue}`);
    if (p.choices.length !== lim.choices) fail(`expected ${lim.choices} choices, got ${p.choices.length}`);
    if (new Set(p.choices).size !== p.choices.length) fail('duplicate choices');
    if (!p.choices.includes(p.answer)) fail('answer not among choices');
    if (!choicesOk) fail('wrong-answer choice also satisfies the puzzle');
  };

  if (p.machine === 'pipes') {
    const onlyAnswerFills = p.choices.filter((c) => pipesFill(c, p.k) === p.total);
    common([p.total, p.k, p.answer, ...p.choices], onlyAnswerFills.length === 1 && onlyAnswerFills[0] === p.answer);
    if (p.total !== p.k * p.answer) fail('total != k * answer');
  }

  if (p.machine === 'gears') {
    if (p.visible[p.hidden] !== null) fail('hidden slot not null in visible[]');
    if (p.visible.filter((v) => v === null).length !== 1) fail('more than one hidden slot');
    common(p.visible.filter((v) => v !== null).concat(p.answer, p.choices), true);
  }

  if (p.machine === 'shapes') {
    common([p.answer, ...p.choices], true);
    if (p.sides && p.sides.length < 3) fail('perimeter shape needs >= 3 sides');
  }

  checked++;
}

for (const track of Object.keys(LIMITS)) {
  FLOORS.forEach((machines, i) => {
    const floor = i + 1;
    for (const machine of new Set(machines)) {
      if (!canGenerate(machine)) continue;
      for (let seed = 1; seed <= SEEDS; seed++) {
        check(generate(machine, track, floor, makeRng(seed * 7919 + floor)), seed);
      }
    }
  });
}

if (errors.length) {
  console.error(errors.slice(0, 20).join('\n'));
  console.error(`\n✗ ${errors.length} errors in ${checked} puzzles`);
  process.exit(1);
}
console.log(`✓ ${checked} puzzles valid`);
