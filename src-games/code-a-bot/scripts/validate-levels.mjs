// מאמת שכל שלב פתיר: BFS על מצב (x, y, כיוון, אילו כוכבים נאספו)
import { readFileSync } from 'fs'

const { levels } = JSON.parse(
  readFileSync(new URL('../src/levels.json', import.meta.url), 'utf8'),
)

const DELTAS = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] }
let failed = 0

for (const lvl of levels) {
  const { cols, rows } = lvl.grid
  const key = (x, y) => `${x},${y}`
  const blockers = new Set()
  const pits = new Set()
  for (const o of lvl.obstacles) (o.kind === 'pit' ? pits : blockers).add(key(o.x, o.y))
  const starIndex = new Map(lvl.stars.map((s, i) => [key(s.x, s.y), i]))
  const fullMask = (1 << lvl.stars.length) - 1

  // בדיקות שפיות: התחלה/סוללה/כוכבים לא על מכשולים ובתוך הלוח
  const problems = []
  const inBounds = (p) => p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows
  for (const [label, p] of [['start', lvl.robotStart], ['battery', lvl.battery], ...lvl.stars.map((s, i) => [`star${i}`, s])]) {
    if (!inBounds(p)) problems.push(`${label} out of bounds`)
    if (blockers.has(key(p.x, p.y)) || pits.has(key(p.x, p.y))) problems.push(`${label} on obstacle`)
  }
  for (const o of lvl.obstacles) if (!inBounds(o)) problems.push(`obstacle out of bounds`)

  // BFS
  const startMask = starIndex.has(key(lvl.robotStart.x, lvl.robotStart.y))
    ? 1 << starIndex.get(key(lvl.robotStart.x, lvl.robotStart.y))
    : 0
  const enc = (x, y, d, m) => ((x * rows + y) * 4 + d) * (fullMask + 1) + m
  const seen = new Set([enc(lvl.robotStart.x, lvl.robotStart.y, lvl.robotStart.dir, startMask)])
  let frontier = [[lvl.robotStart.x, lvl.robotStart.y, lvl.robotStart.dir, startMask]]
  let dist = 0
  let solution = -1

  while (frontier.length && solution < 0 && dist <= lvl.maxCommands) {
    const next = []
    for (const [x, y, d, m] of frontier) {
      if (x === lvl.battery.x && y === lvl.battery.y && m === fullMask) { solution = dist; break }
      const moves = []
      const [dx, dy] = DELTAS[d]
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !blockers.has(key(nx, ny)) && !pits.has(key(nx, ny))) {
        let nm = m
        if (starIndex.has(key(nx, ny))) nm |= 1 << starIndex.get(key(nx, ny))
        moves.push([nx, ny, d, nm])
      }
      moves.push([x, y, (d + 3) % 4, m], [x, y, (d + 1) % 4, m])
      for (const s of moves) {
        const e = enc(...s)
        if (!seen.has(e)) { seen.add(e); next.push(s) }
      }
    }
    frontier = next
    dist++
  }

  const ok = problems.length === 0 && solution >= 0 && solution <= lvl.maxCommands
  if (!ok) failed++
  console.log(
    `שלב ${String(lvl.id).padStart(2)} | ${lvl.grid.cols}x${lvl.grid.rows} | כוכבים ${lvl.stars.length} | מינימום ${solution < 0 ? 'אין פתרון!' : solution} / מותר ${lvl.maxCommands} | ${ok ? 'OK' : 'FAIL ' + problems.join('; ')}`,
  )
}
process.exit(failed ? 1 : 0)
