// מחולל החידות. טהור: בלי DOM, בלי Math.random - מקבל rng מבחוץ, כדי
// שסקריפט הוולידציה (scripts/validate-math-tower.mjs) יריץ אותו ב-Node על
// אלפי seeds ויוודא שכל חידה תקינה.
//
// טבלאות הקושי: Design.info/math-tower-gdd.md

// PRNG קטן ודטרמיניסטי (mulberry32)
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ================= מאזניים ================= */
//
// צלחת שמאל: מטען קבוע { value, label?, groups? }
// צלחת ימין: ביטוי עם מקום ריק אחד, right = { op, k?, a?, b? }
//   op 'id'  → x          op '+' → k + x
//   op '×'   → k × x      op '×+' → a × b + x
// המשקל בצלחת הימנית מחושב מהמשקולת שנבחרה - כך גם תשובה שגויה מקבלת
// תוצאה פיזית (הקורה נוטה לצד הנכון), ולא רק "לא נכון".

export function rightValue(right, x) {
  switch (right.op) {
    case 'id': return x;
    case '+': return right.k + x;
    case '×': return right.k * x;
    case '×+': return right.a * right.b + x;
    default: throw new Error(`unknown op ${right.op}`);
  }
}

// מסיחים: קרובים לתשובה + טעות טיפוסית אם יש. כולם שונים, בטווח, לא שליליים.
function choicesFor(rng, answer, count, { min, max, typical = [] }) {
  // קרובים קטנים (לרוב הדרגות) + קרובים רחבים יותר (לטווחים צרים כמו "כמה
  // זוויות ישרות" שבהם רק 1-2 ליד התשובה לא מספיק כדי למלא 4 מסיחים)
  const near = [
    answer + 1, answer - 1, answer + 2, answer - 2, answer + 3, answer - 3,
    answer + 4, answer - 4, answer + 5, answer - 5, answer + 10, answer - 10,
  ];
  const pool = [...new Set([...shuffle(rng, typical), ...shuffle(rng, near)])]
    .filter((v) => v !== answer && v >= min && v <= max && Number.isInteger(v));
  // הטעות הטיפוסית קודם (אם קיימת), ואז קרובים
  const typicalIn = pool.filter((v) => typical.includes(v)).slice(0, 1);
  const rest = pool.filter((v) => !typicalIn.includes(v));
  const distractors = [...typicalIn, ...rest].slice(0, count - 1);
  return shuffle(rng, [answer, ...distractors]);
}

// מסלול קטנה: תפוחים (חזותי) + ספרות אמיתיות על המשקולות - לא רק נקודות.
// הדרגה הקלה ביותר היא בדיוק מכונת המאזניים: תפוחים בצד אחד, ובוחרים
// משקולת עם המספר הנכון עליה. 1–2: ספירה. 3–6: חיבור עד 10. 7+: חיסור עד
// 10 (מוצג כחיבור הפוך על המאזניים, כמו ב-ג').
function scaleLittle(rng, floor) {
  if (floor <= 2) {
    const n = floor === 1 ? int(rng, 2, 4) : int(rng, 3, 6);
    return {
      kind: 'count',
      left: { value: n, groups: [n] },
      right: { op: 'id' },
      answer: n,
      choices: choicesFor(rng, n, 3, { min: 1, max: 10 }),
    };
  }
  if (floor <= 6) {
    const maxSum = floor === 3 ? 5 : floor === 4 ? 7 : floor === 5 ? 9 : 10;
    const sum = int(rng, 3, maxSum);
    const a = int(rng, 1, sum - 1);
    const b = sum - a;
    return {
      kind: 'add',
      left: { value: sum, groups: [a, b] },
      right: { op: 'id' },
      eq: `${a} + ${b} = ?`,
      answer: sum,
      choices: choicesFor(rng, sum, 3, { min: 1, max: 10 }),
    };
  }
  const maxC = floor === 7 ? 6 : floor === 10 ? 8 : floor === 11 ? 9 : 10;
  const c = int(rng, 4, maxC);
  const k = int(rng, 1, c - 1);
  const ans = c - k;
  return {
    kind: 'sub',
    left: { value: c, label: `${c}` },
    right: { op: '+', k },
    eq: `${c} − ${k} = ?`,
    answer: ans,
    choices: choicesFor(rng, ans, 3, { min: 1, max: 10 }),
  };
}

function scaleG3(rng, floor) {
  const range = { min: 0, max: 100 };
  if (floor <= 2) {
    const c = int(rng, 30, 100);
    const a = int(rng, 11, c - 5);
    const ans = c - a;
    return {
      kind: 'add-missing',
      left: { value: c, label: `${c}` },
      right: { op: '+', k: a },
      eq: `${a} + ? = ${c}`,
      answer: ans,
      // טעות טיפוסית: שכחה של "לפרוט עשרת" - טעות של עשר בדיוק
      choices: choicesFor(rng, ans, 4, { ...range, typical: [ans + 10, ans - 10] }),
    };
  }
  if (floor === 3) {
    // חיסור. על המאזניים הוא מוצג כחיבור הפוך (d + ? = k) - משקולת שמוסיפים
    // לא יכולה להקל על הצלחת. השורה שמתחת מציגה את התרגיל כחיסור.
    const k = int(rng, 40, 100);
    const d = int(rng, 10, k - 8);
    const ans = k - d;
    return {
      kind: 'sub-missing',
      left: { value: k, label: `${k}` },
      right: { op: '+', k: d },
      eq: `${k} − ? = ${d}`,
      answer: ans,
      choices: choicesFor(rng, ans, 4, { ...range, typical: [ans + 10, ans - 10] }),
    };
  }
  if (floor <= 6) {
    const [lo, hi] = floor === 4 ? [2, 5] : floor === 5 ? [2, 9] : [3, 9];
    const a = int(rng, lo, hi);
    const b = int(rng, 2, hi);
    if (floor === 4 || rng() < 0.5) {
      const ans = a * b;
      return {
        kind: 'mul',
        left: { value: ans, label: `${a} × ${b}`, hint: `${ans}` },
        right: { op: 'id' },
        eq: `${a} × ${b} = ?`,
        answer: ans,
        choices: choicesFor(rng, ans, 4, { ...range, typical: [a + b, ans + a, ans - b] }),
      };
    }
    return {
      kind: 'mul-missing',
      left: { value: a * b, label: `${a * b}` },
      right: { op: '×', k: b },
      eq: `? × ${b} = ${a * b}`,
      answer: a,
      choices: choicesFor(rng, a, 4, { min: 1, max: 12, typical: [a * b - b] }),
    };
  }
  if (floor <= 9) {
    const b = int(rng, 2, 9);
    const q = int(rng, 2, Math.min(10, Math.floor(100 / b)));
    const c = b * q;
    if (floor === 9 && rng() < 0.5) {
      return {
        kind: 'div',
        left: { value: q, label: `${c} ÷ ${b}`, hint: `${q}` },
        right: { op: 'id' },
        eq: `${c} ÷ ${b} = ?`,
        answer: q,
        choices: choicesFor(rng, q, 4, { min: 1, max: 12, typical: [c - b] }),
      };
    }
    return {
      kind: 'div-missing',
      left: { value: c, label: `${c}` },
      right: { op: '×', k: b },
      eq: `${b} × ? = ${c}`,
      answer: q,
      choices: choicesFor(rng, q, 4, { min: 1, max: 12, typical: [c - b] }),
    };
  }
  // 10–12: שני שלבים
  const a = int(rng, 2, 9);
  const b = int(rng, 2, 9);
  const x = int(rng, 2, Math.min(30, 100 - a * b));
  const c = a * b + x;
  return {
    kind: 'two-step',
    left: { value: c, label: `${c}` },
    right: { op: '×+', a, b },
    eq: `${a} × ${b} + ? = ${c}`,
    hint: `${a} × ${b} = ${a * b}`,
    answer: x,
    choices: choicesFor(rng, x, 4, { min: 1, max: 100, typical: [c - a - b, c - a * b + 10] }),
  };
}

/* ================= צינורות ================= */
//
// קטנה: מפצלים כמות זוגית (עד 10) לשני כוסות שוות - חילוק ב-2 כמבוא רך
// לפני "חילוק" האמיתי בגדולה. גדולה: N ÷ k בלי שארית, k כוסות.
// ctx משותף ל-pipes.js: total = k × answer בדיוק.

export function pipesFill(v, k) {
  return v * k;
}

function pipesLittle(rng, floor) {
  const half = int(rng, floor <= 3 ? 1 : 2, 5);
  const total = half * 2;
  return {
    kind: 'split',
    total,
    k: 2,
    eq: `${total} ÷ 2 = ?`,
    answer: half,
    choices: choicesFor(rng, half, 3, { min: 1, max: 10 }),
  };
}

function pipesG3(rng, floor) {
  // k מוגבל ל-6 (לא 9) כדי שכל הכדים ייכנסו למסך בלי גלילה אופקית
  const k = floor <= 5 ? int(rng, 2, 4) : int(rng, 2, 6);
  const q = int(rng, 2, Math.min(12, Math.floor(100 / k)));
  const total = k * q;
  return {
    kind: 'divide',
    total,
    k,
    eq: `${total} ÷ ${k} = ?`,
    answer: q,
    choices: choicesFor(rng, q, 4, { min: 1, max: 20 }),
  };
}

/* ================= גלגלי שיניים ================= */
//
// סדרה עם הפרש קבוע (קטנה: +1/+2), או משני קומה 9 בגדולה - שני הפרשים
// לסירוגין a,b,a,b. ה-'?' תמיד נגזר מתוך שני איברים גלויים סמוכים לו -
// פתרון יחיד מובנה, לא תלוי בניחוש התבנית.

function seqPuzzle(seq, hidden) {
  const answer = seq[hidden];
  return {
    kind: hidden === seq.length - 1 ? 'next' : 'middle',
    visible: seq.map((v, i) => (i === hidden ? null : v)),
    length: seq.length,
    hidden,
    answer,
  };
}

function gearsLittle(rng, floor) {
  const d = floor <= 5 ? 1 : 2;
  const start = int(rng, 1, 10 - d * 3);
  const seq = [start, start + d, start + 2 * d, start + 3 * d];
  const p = seqPuzzle(seq, seq.length - 1);
  return { ...p, choices: choicesFor(rng, p.answer, 3, { min: 1, max: 10 }) };
}

function gearsG3(rng, floor) {
  const length = floor <= 5 ? 4 : 5;
  let seq, hidden;
  if (floor <= 8) {
    const d = floor === 4 ? int(rng, 2, 5) : floor === 5 ? int(rng, 3, 9) : int(rng, 2, 9);
    const start = int(rng, 1, 20);
    seq = Array.from({ length }, (_, i) => start + i * d);
    hidden = floor <= 5 ? length - 1 : Math.floor(length / 2);
  } else {
    const a = int(rng, 2, 9);
    const b = int(rng, 2, 9);
    const start = int(rng, 1, floor === 12 ? 20 : 15);
    seq = [start];
    [a, b, a, b].forEach((d) => seq.push(seq[seq.length - 1] + d));
    hidden = floor === 9 ? seq.length - 1 : 2;
  }
  const p = seqPuzzle(seq, hidden);
  return { ...p, choices: choicesFor(rng, p.answer, 4, { min: 0, max: 100 }) };
}

/* ================= מנעול צורות ================= */
//
// קטנה: כמה צלעות/פינות יש לצורה המוצגת (עיגול, משולש, ריבוע). גדולה:
// תכונת מצולע (צלעות/קודקודים/זוויות ישרות), היקף, או השלמת תבנית סימטרית.

const POLY = {
  triangle: { sides: 3, vertices: 3, right: 0 },
  square: { sides: 4, vertices: 4, right: 4 },
  rectangle: { sides: 4, vertices: 4, right: 4 },
  pentagon: { sides: 5, vertices: 5, right: 0 },
  hexagon: { sides: 6, vertices: 6, right: 0 },
};

function shapesLittle(rng, floor) {
  const name = floor <= 8 ? pick(rng, ['triangle', 'square']) : floor <= 10 ? pick(rng, ['pentagon', 'hexagon']) : 'circle';
  const sides = name === 'circle' ? 0 : POLY[name].sides;
  return {
    kind: 'sides',
    shape: name,
    prop: 'sides',
    question: name === 'circle' ? 'כמה פינות יש לעיגול?' : 'כמה צלעות יש לצורה?',
    answer: sides,
    choices: choicesFor(rng, sides, 3, { min: 0, max: 8 }),
  };
}

function shapeCountProp(rng) {
  const names = ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'];
  const name = pick(rng, names);
  const prop = pick(rng, ['sides', 'vertices', 'right']);
  const question = {
    sides: 'כמה צלעות יש לצורה?',
    vertices: 'כמה קודקודים יש לצורה?',
    right: 'כמה זוויות ישרות יש בצורה?',
  }[prop];
  const answer = POLY[name][prop];
  return { kind: 'count-prop', shape: name, prop, question, answer, choices: choicesFor(rng, answer, 4, { min: 0, max: 8 }) };
}

function shapePerimeter(rng, big) {
  if (!big && rng() < 0.5) {
    const sides = [int(rng, 3, 20), int(rng, 3, 20), int(rng, 3, 20)];
    const answer = sides.reduce((s, v) => s + v, 0);
    return { kind: 'perimeter', shape: 'triangle', sides, question: 'מה ההיקף של הצורה?', answer, choices: choicesFor(rng, answer, 4, { min: 9, max: 100 }) };
  }
  const w = int(rng, 3, big ? 25 : 15);
  const h = int(rng, 3, big ? 25 : 15);
  const answer = 2 * (w + h);
  return { kind: 'perimeter', shape: 'rectangle', sides: [w, h, w, h], question: 'מה ההיקף של הצורה?', answer, choices: choicesFor(rng, answer, 4, { min: 12, max: 100 }) };
}

function shapeSymmetry(rng) {
  const half = int(rng, 3, 6);
  const shown = int(rng, 0, half - 1);
  const answer = half - shown;
  return { kind: 'symmetry', half, shown, question: 'כמה חסר כדי שהתבנית תהיה סימטרית?', answer, choices: choicesFor(rng, answer, 4, { min: 1, max: 6 }) };
}

function shapesG3(rng, floor) {
  if (floor <= 8) return shapeCountProp(rng);
  if (floor === 9) return shapePerimeter(rng, false);
  if (floor === 10) return shapePerimeter(rng, true);
  if (floor === 11) return shapeSymmetry(rng);
  return pick(rng, [() => shapeCountProp(rng), () => shapePerimeter(rng, true), () => shapeSymmetry(rng)])();
}

/* ================= רישום ================= */

const GENERATORS = {
  scale: (rng, track, floor) => (track === 'little' ? scaleLittle : scaleG3)(rng, floor),
  pipes: (rng, track, floor) => (track === 'little' ? pipesLittle : pipesG3)(rng, floor),
  gears: (rng, track, floor) => (track === 'little' ? gearsLittle : gearsG3)(rng, floor),
  shapes: (rng, track, floor) => (track === 'little' ? shapesLittle : shapesG3)(rng, floor),
};

export function canGenerate(machine) {
  return machine in GENERATORS;
}

export function generate(machine, track, floor, rng) {
  const gen = GENERATORS[machine];
  if (!gen) throw new Error(`machine not built: ${machine}`);
  return { machine, track, floor, ...gen(rng, track, floor) };
}
