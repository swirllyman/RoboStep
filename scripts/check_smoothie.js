// check_smoothie.js - Smoothie Remix behaviour check.
//
// Drives the real page: switches into Smoothie Remix, plays recipes with the
// game's own solver, and checks the rules hold - ingredients are collected by
// rolling over them, the blender does nothing until the recipe is complete,
// and finishing runs the blend-and-drink celebration.
//
// Usage:  node scripts/check_smoothie.js
// Needs Playwright:  npm i -D playwright  (then: npx playwright install chromium)
// Optional: CHROMIUM_PATH=/path/to/chrome node scripts/check_smoothie.js

const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (err) {
  console.error('Playwright is not installed.');
  console.error('Install it with:  npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const PAGE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

// Builds the optimal program for a recipe using the game's own BFS, visiting
// ingredients nearest-first, then the blender.
const SOLVE_IN_PAGE = `(levelIndex) => {
  const game = window.game;
  const level = SMOOTHIE_LEVELS[levelIndex];
  let at = { ...level.start };
  let remaining = level.ingredients.slice();
  const program = [];

  const step = (target) => {
    const path = game.solveBFS(level, at, target);
    program.push(...path);
    at = { x: target.x, y: target.y };
  };

  while (remaining.length) {
    let best = null;
    for (const ing of remaining) {
      const p = game.solveBFS(level, at, ing);
      if (!best || p.length < best.path.length) best = { ing, path: p };
    }
    step(best.ing);
    remaining = remaining.filter((i) => i !== best.ing);
  }
  step(level.blender);
  return program;
}`;

const runToEnd = `async () => {
  await new Promise((resolve) => {
    const done = () => (window.game.isRunning ? setTimeout(done, 15) : resolve());
    setTimeout(done, 15);
  });
}`;

// A smoothie win runs a timed celebration after the program stops, so tests
// that look at the finished board have to wait for the drink, not just the run.
const runAndCelebrate = `async () => {
  await new Promise((resolve) => {
    const done = () => (window.game.isRunning ? setTimeout(done, 15) : resolve());
    setTimeout(done, 15);
  });
  const deadline = Date.now() + 4000;
  await new Promise((resolve) => {
    const settled = () => {
      if (window.game.smoothieStage === 'served' || Date.now() > deadline) resolve();
      else setTimeout(settled, 30);
    };
    settled();
  });
}`;

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const page = await browser.newPage();
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('robostep_smoothie_max_level', '12');
    localStorage.setItem('robostep_mode', 'smoothie');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.grid-cell');
  await page.evaluate(() => {
    window.game.speed = 12;
    if (window.Sound && !Sound.isMuted()) Sound.toggleMute();
    if (window.Voice) {
      Voice.settings.speakButtons = false;
      Voice.settings.speakSteps = false;
      Voice.settings.speakEvents = false;
    }
  });

  const failures = [];
  const check = (name, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok || !detail ? '' : ' — ' + detail}`);
    if (!ok) failures.push(name);
  };

  check('the game boots into Smoothie Remix when that mode was last used',
    await page.evaluate(() => window.game.mode === 'smoothie'));

  // 1. Every recipe can be played through with the game's own rules.
  const played = await page.evaluate(async ({ solveSrc, waitSrc }) => {
    const solve = eval(solveSrc);
    const waitForRun = eval(waitSrc);
    const game = window.game;
    const results = [];

    for (let i = 0; i < SMOOTHIE_LEVELS.length; i++) {
      const level = SMOOTHIE_LEVELS[i];
      game.loadLevel(i);
      const program = solve(i);
      program.forEach((c) => game.addCommand(c));
      game.runAll();
      await waitForRun();

      results.push({
        id: level.id,
        title: level.title,
        par: level.par,
        steps: program.length,
        collected: game.collected.size,
        needed: level.ingredients.length,
        onBlender: game.robotPos.x === level.blender.x && game.robotPos.y === level.blender.y,
        won: game.hasWon(),
        stage: game.smoothieStage,
        robotState: game.robotState
      });
      game.closeModal('win-modal');
    }
    return results;
  }, { solveSrc: SOLVE_IN_PAGE, waitSrc: runAndCelebrate });

  const unfinished = played.filter((r) => !r.won || r.collected !== r.needed);
  check(
    'every recipe can be collected and blended',
    unfinished.length === 0,
    unfinished.map((r) => `${r.title}: ${r.collected}/${r.needed} collected, won=${r.won}`).join('; ')
  );

  // A greedy nearest-ingredient route is legal but not always the shortest
  // one, so it must never come in UNDER par - that would mean par is wrong.
  const beatsPar = played.filter((r) => r.steps < r.par);
  check(
    'no route beats the verified par',
    beatsPar.length === 0,
    beatsPar.map((r) => `${r.title}: solved in ${r.steps}, par ${r.par}`).join('; ')
  );

  const noShow = played.filter((r) => r.stage !== 'served' || r.robotState !== 'drinking');
  check(
    'finishing blends the smoothie and the robot drinks it',
    noShow.length === 0,
    noShow.map((r) => `${r.title}: stage=${r.stage}, robot=${r.robotState}`).join('; ')
  );

  // 2. The blender must ignore a robot that arrives empty-handed.
  const early = await page.evaluate(async ({ waitSrc }) => {
    const waitForRun = eval(waitSrc);
    const game = window.game;
    // Level 5 puts the blender in the middle of the board, so the robot can
    // roll straight onto it without collecting anything.
    const idx = SMOOTHIE_LEVELS.findIndex((l) => l.id === 5);
    const level = SMOOTHIE_LEVELS[idx];
    game.loadLevel(idx);
    game.solveBFS(level, level.start, level.blender).forEach((c) => game.addCommand(c));
    game.runAll();
    await waitForRun();

    return {
      onBlender: game.robotPos.x === level.blender.x && game.robotPos.y === level.blender.y,
      won: game.hasWon(),
      collected: game.collected.size,
      modalOpen: document.getElementById('win-modal').classList.contains('open'),
      message: document.getElementById('status-message').textContent,
      stage: game.smoothieStage
    };
  }, { waitSrc: runToEnd });

  check('the robot can roll over the blender without collecting', early.onBlender && !early.won);
  check(
    'an empty-handed blender does not blend',
    !early.modalOpen && early.stage === null,
    `modal=${early.modalOpen}, stage=${early.stage}`
  );
  check(
    'the game says what is still missing',
    /ingredient/i.test(early.message),
    `said "${early.message}"`
  );

  // 3. The recipe card tracks collection, and hints point at ingredients.
  const guidance = await page.evaluate(async ({ waitSrc }) => {
    const waitForRun = eval(waitSrc);
    const game = window.game;
    const msg = () => document.getElementById('status-message').textContent;
    game.loadLevel(0); // Berry Blast: strawberry then blueberry

    const out = { chipsAtStart: document.querySelectorAll('.recipe-chip.collected').length };
    game.showHint();
    out.firstHint = msg();

    const level = SMOOTHIE_LEVELS[0];
    game.solveBFS(level, level.start, level.ingredients[0]).forEach((c) => game.addCommand(c));
    game.runAll();
    await waitForRun();

    out.chipsAfterOne = document.querySelectorAll('.recipe-chip.collected').length;
    out.collected = game.collected.size;
    out.recipeText = document.getElementById('recipe-bar').textContent;
    game.showHint();
    out.secondHint = msg();
    return out;
  }, { waitSrc: runToEnd });

  check('the recipe card starts with nothing ticked off', guidance.chipsAtStart === 0);
  check(
    'collecting an ingredient ticks it off the recipe card',
    guidance.chipsAfterOne === 1 && guidance.collected === 1,
    `${guidance.chipsAfterOne} chips lit, ${guidance.collected} collected`
  );
  check(
    'the hint names the ingredient to fetch',
    /Strawberry/i.test(guidance.firstHint),
    `said "${guidance.firstHint}"`
  );
  check(
    'the hint switches to the next ingredient once one is picked up',
    /Blueberry/i.test(guidance.secondHint),
    `said "${guidance.secondHint}"`
  );

  // 4. Classic mode is untouched by any of this.
  const classic = await page.evaluate(async ({ waitSrc }) => {
    const waitForRun = eval(waitSrc);
    const game = window.game;
    game.setMode('classic');
    game.loadLevel(0);
    const out = { mode: game.mode, recipeHidden: document.getElementById('recipe-bar').hidden };
    LEVELS[0] && game.solveBFS(LEVELS[0], LEVELS[0].start).forEach((c) => game.addCommand(c));
    game.runAll();
    await waitForRun();
    out.won = game.hasWon();
    out.stage = game.smoothieStage;
    game.closeModal('win-modal');
    return out;
  }, { waitSrc: runToEnd });

  check('switching back to Classic Quest works', classic.mode === 'classic');
  check('the recipe card is hidden in Classic Quest', classic.recipeHidden === true);
  check('classic levels still win on the gem', classic.won === true && classic.stage === null);

  // 5. Progress is kept per mode, so neither overwrites the other.
  const progress = await page.evaluate(() => ({
    classicMax: localStorage.getItem('robostep_max_level'),
    smoothieMax: localStorage.getItem('robostep_smoothie_max_level'),
    classicStars: localStorage.getItem('robostep_stars'),
    smoothieStars: localStorage.getItem('robostep_smoothie_stars')
  }));
  check(
    'each mode stores its own progress',
    progress.smoothieMax !== null && progress.smoothieStars !== null &&
      progress.smoothieStars !== progress.classicStars,
    JSON.stringify(progress)
  );

  // 6. The ghost preview knows the recipe: rolling onto the blender early is
  //    not a win, and the ghost must not pretend it is.
  const ghost = await page.evaluate(({ solveSrc }) => {
    const solve = eval(solveSrc);
    const game = window.game;
    game.setMode('smoothie');
    if (!game.ghostOn) game.toggleGhost();

    const idx = SMOOTHIE_LEVELS.findIndex((l) => l.id === 5);
    const level = SMOOTHIE_LEVELS[idx];

    // Straight to the blender with an empty basket.
    game.loadLevel(idx);
    game.solveBFS(level, level.start, level.blender).forEach((c) => game.addCommand(c));
    const empty = game.ghostPreview();

    // The whole recipe, then the blender.
    game.loadLevel(idx);
    solve(idx).forEach((c) => game.addCommand(c));
    const full = game.ghostPreview();

    const out = {
      emptyOutcome: empty.outcome,
      emptyEnd: { ...empty.end },
      fullOutcome: full.outcome,
      fullEnd: { ...full.end },
      blender: { ...level.blender },
      wins: document.querySelectorAll('.ghost-win').length
    };
    game.toggleGhost();
    return out;
  }, { solveSrc: SOLVE_IN_PAGE });

  const onBlender = (p) => p.x === ghost.blender.x && p.y === ghost.blender.y;
  check(
    'the ghost does not call an empty-handed blender a win',
    ghost.emptyOutcome === 'stop' && onBlender(ghost.emptyEnd),
    JSON.stringify(ghost)
  );
  check(
    'the ghost calls the complete recipe a win, on the blender',
    ghost.fullOutcome === 'win' && onBlender(ghost.fullEnd) && ghost.wins === 1,
    JSON.stringify(ghost)
  );

  await browser.close();

  if (failures.length) {
    console.log(`\n${failures.length} smoothie check(s) failed.`);
    process.exit(1);
  }
  console.log('\nSmoothie Remix collects, blends and slurps correctly. 🥤');
})();
