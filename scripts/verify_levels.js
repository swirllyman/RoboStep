// verify_levels.js - Automated BFS solver & validator for all 50 levels
const { LEVELS } = require('../js/levels.js');

function solveLevel(level) {
  const { width, height, start, gem, blockers = [], pits = [] } = level;

  // Key generator
  const key = (x, y) => `${x},${y}`;

  // Obstacle lookups
  const blockerSet = new Set(blockers.map(b => key(b.x, b.y)));
  const pitSet = new Set(pits.map(p => key(p.x, p.y)));

  // Sanity checks
  if (start.x < 0 || start.x >= width || start.y < 0 || start.y >= height) {
    return { ok: false, error: `Start (${start.x}, ${start.y}) is out of bounds [${width}x${height}]` };
  }
  if (gem.x < 0 || gem.x >= width || gem.y < 0 || gem.y >= height) {
    return { ok: false, error: `Gem (${gem.x}, ${gem.y}) is out of bounds [${width}x${height}]` };
  }
  if (blockerSet.has(key(start.x, start.y))) {
    return { ok: false, error: `Start (${start.x}, ${start.y}) is inside a blocker` };
  }
  if (pitSet.has(key(start.x, start.y))) {
    return { ok: false, error: `Start (${start.x}, ${start.y}) is inside a pit` };
  }
  if (blockerSet.has(key(gem.x, gem.y))) {
    return { ok: false, error: `Gem (${gem.x}, ${gem.y}) is inside a blocker` };
  }
  if (pitSet.has(key(gem.x, gem.y))) {
    return { ok: false, error: `Gem (${gem.x}, ${gem.y}) is inside a pit` };
  }

  // BFS Queue: [x, y, pathLength, pathSteps]
  const queue = [{ x: start.x, y: start.y, dist: 0, path: [] }];
  const visited = new Set([key(start.x, start.y)]);

  const DIRS = [
    { name: "UP", dx: 0, dy: -1 },
    { name: "DOWN", dx: 0, dy: 1 },
    { name: "LEFT", dx: -1, dy: 0 },
    { name: "RIGHT", dx: 1, dy: 0 }
  ];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.x === gem.x && current.y === gem.y) {
      return { ok: true, shortestDist: current.dist, path: current.path };
    }

    for (const dir of DIRS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const nKey = key(nx, ny);

      // Check bounds
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      // Check obstacles
      if (blockerSet.has(nKey) || pitSet.has(nKey)) continue;
      // Check visited
      if (visited.has(nKey)) continue;

      visited.add(nKey);
      queue.push({
        x: nx,
        y: ny,
        dist: current.dist + 1,
        path: [...current.path, dir.name]
      });
    }
  }

  return { ok: false, error: "No valid path found to reach the gem!" };
}

console.log(`Starting verification of ${LEVELS.length} levels...`);
let passCount = 0;
let failCount = 0;

for (const level of LEVELS) {
  const result = solveLevel(level);
  if (!result.ok) {
    console.error(`❌ Level ${level.id} (${level.title}): FAILED - ${result.error}`);
    failCount++;
  } else {
    const parDiff = level.par - result.shortestDist;
    const note = parDiff === 0 ? "optimal" : `par:${level.par}, shortest:${result.shortestDist}`;
    console.log(`✅ Level ${level.id.toString().padStart(2)}: ${level.title.padEnd(22)} [${level.width}x${level.height}] - Solvable in ${result.shortestDist} steps (${note})`);
    passCount++;
  }
}

console.log(`\nSummary: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL 50 LEVELS ARE FULLY SOLVABLE AND VALID!");
}
