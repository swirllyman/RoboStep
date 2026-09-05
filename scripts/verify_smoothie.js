// verify_smoothie.js - Validator for Smoothie Remix levels.
//
// A smoothie level is only fair if the robot can reach every ingredient AND
// carry them to the blender. This walks each level, checks the board makes
// sense, then brute-forces the shortest collect-everything-then-blend route
// (ingredient counts are small, so every visiting order is tried) and checks
// the level's `par` matches that optimum.

const { SMOOTHIE_LEVELS } = require('../js/smoothieLevels.js');

const key = (x, y) => `${x},${y}`;
const DIRS = [
  { name: "UP", dx: 0, dy: -1 },
  { name: "DOWN", dx: 0, dy: 1 },
  { name: "LEFT", dx: -1, dy: 0 },
  { name: "RIGHT", dx: 1, dy: 0 }
];

// Shortest walk between two squares, treating rocks and pits as walls.
function shortestPath(level, from, to) {
  const blocked = new Set([
    ...level.blockers.map(b => key(b.x, b.y)),
    ...level.pits.map(p => key(p.x, p.y))
  ]);

  const queue = [{ x: from.x, y: from.y, dist: 0 }];
  const seen = new Set([key(from.x, from.y)]);

  while (queue.length) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) return cur.dist;

    for (const d of DIRS) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      const nKey = key(nx, ny);
      if (nx < 0 || nx >= level.width || ny < 0 || ny >= level.height) continue;
      if (blocked.has(nKey) || seen.has(nKey)) continue;
      seen.add(nKey);
      queue.push({ x: nx, y: ny, dist: cur.dist + 1 });
    }
  }
  return Infinity;
}

// Shortest route that picks up every ingredient and finishes at the blender.
// Ingredients can be collected in any order, so try them all.
function optimalRoute(level) {
  const stops = level.ingredients;
  let best = Infinity;
  let bestOrder = null;

  const walk = (at, remaining, dist, order) => {
    if (dist >= best) return; // already worse than the best route found
    if (!remaining.length) {
      const total = dist + shortestPath(level, at, level.blender);
      if (total < best) {
        best = total;
        bestOrder = order;
      }
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      const next = remaining[i];
      const leg = shortestPath(level, at, next);
      if (leg === Infinity) return;
      walk(next, remaining.filter((_, j) => j !== i), dist + leg, [...order, next.name]);
    }
  };

  walk(level.start, stops, 0, []);
  return { steps: best, order: bestOrder };
}

function validate(level) {
  const problems = [];
  const inBounds = (p) => p.x >= 0 && p.x < level.width && p.y >= 0 && p.y < level.height;
  const blocked = new Set([
    ...level.blockers.map(b => key(b.x, b.y)),
    ...level.pits.map(p => key(p.x, p.y))
  ]);

  const named = [
    ['start', level.start],
    ['blender', level.blender],
    ...level.ingredients.map(i => [`${i.name} ${i.emoji}`, i])
  ];

  for (const [what, sq] of named) {
    if (!inBounds(sq)) problems.push(`${what} at (${sq.x},${sq.y}) is off the board`);
    if (blocked.has(key(sq.x, sq.y))) problems.push(`${what} at (${sq.x},${sq.y}) sits on a rock or pit`);
  }

  // Two things on one square would hide each other.
  const occupied = new Map();
  for (const [what, sq] of named) {
    const k = key(sq.x, sq.y);
    if (occupied.has(k)) problems.push(`${what} shares square (${sq.x},${sq.y}) with ${occupied.get(k)}`);
    else occupied.set(k, what);
  }

  if (!level.ingredients.length) problems.push('recipe has no ingredients');
  if (!level.recipe || !level.recipe.name) problems.push('level has no recipe card');

  return problems;
}

let failed = 0;
console.log(`Checking ${SMOOTHIE_LEVELS.length} Smoothie Remix levels...\n`);

SMOOTHIE_LEVELS.forEach((level) => {
  const label = `Level ${String(level.id).padStart(2)}: ${level.title.padEnd(20)}`;
  const problems = validate(level);

  if (problems.length) {
    failed++;
    console.log(`❌ ${label} ${problems.join('; ')}`);
    return;
  }

  const route = optimalRoute(level);
  if (route.steps === Infinity) {
    failed++;
    console.log(`❌ ${label} no route collects every ingredient and reaches the blender`);
    return;
  }

  if (route.steps !== level.par) {
    failed++;
    console.log(`❌ ${label} par is ${level.par}, but the best route takes ${route.steps} steps`);
    console.log(`     best order: ${route.order.join(' → ')} → blender`);
    return;
  }

  console.log(
    `✅ ${label} [${level.width}x${level.height}] ` +
    `${level.ingredients.length} ingredients, blends in ${route.steps} steps (par ${level.par})`
  );
});

console.log();
if (failed) {
  console.log(`Summary: ${SMOOTHIE_LEVELS.length - failed} passed, ${failed} failed.`);
  process.exit(1);
}
console.log(`🥤 ALL ${SMOOTHIE_LEVELS.length} SMOOTHIE LEVELS ARE BLENDABLE!`);
