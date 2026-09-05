// check_execution.js - Instruction execution regression check.
//
// Guards the rule that the robot always obeys the program on screen: step 1 of
// the tape is the first move it makes, every time. Historically the execution
// cursor (executionStep) survived a level change and survived edits to the
// program, so Run could silently start part-way down the list.
//
// Usage:  node scripts/check_execution.js
// Needs Playwright:  npm i -D playwright  (then: npx playwright install chromium)
// Optional: CHROMIUM_PATH=/path/to/chrome node scripts/check_execution.js

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

const DELTAS = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 }
};

// Where the robot should end up, following the program from the start square
// and stopping at the first wall / rock / pit, exactly as the game does.
function simulate(level, commands) {
  let pos = { x: level.start.x, y: level.start.y };
  for (const cmd of commands) {
    const d = DELTAS[cmd];
    const next = { x: pos.x + d.dx, y: pos.y + d.dy };
    if (next.x < 0 || next.x >= level.width || next.y < 0 || next.y >= level.height) break;
    if (level.blockers.some((b) => b.x === next.x && b.y === next.y)) break;
    pos = next;
    if (level.pits.some((p) => p.x === next.x && p.y === next.y)) break;
    if (next.x === level.gem.x && next.y === level.gem.y) break;
  }
  return pos;
}

async function setup(page) {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('robostep_max_level', '50');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.grid-cell');
  // Run fast and silently so the checks stay quick and deterministic.
  await page.evaluate(() => {
    window.game.speed = 15;
    if (window.Sound && Sound.isMuted && !Sound.isMuted()) Sound.toggleMute();
    if (window.Voice) Voice.settings.speakButtons = false;
    if (window.Voice) Voice.settings.speakSteps = false;
    if (window.Voice) Voice.settings.speakEvents = false;
  });
}

// Loads a level, types a program, runs it and reports where the robot landed.
async function playProgram(page, levelNumber, commands) {
  return page.evaluate(async ({ levelNumber, commands }) => {
    const game = window.game;
    game.loadLevel(levelNumber - 1);
    commands.forEach((c) => game.addCommand(c));
    const startedAt = { ...game.robotPos };
    const firstCommand = game.commands[0];
    game.runAll();

    await new Promise((resolve) => {
      const done = () => (game.isRunning ? setTimeout(done, 20) : resolve());
      setTimeout(done, 20);
    });

    return {
      level: JSON.parse(JSON.stringify(LEVELS[game.currentLevelIdx])),
      startedAt,
      firstCommand,
      endedAt: { ...game.robotPos },
      trail: game.trail.map((t) => ({ x: t.x, y: t.y })),
      commands: game.commands.slice()
    };
  }, { levelNumber, commands });
}

const same = (a, b) => a.x === b.x && a.y === b.y;

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const page = await browser.newPage();
  await setup(page);

  const failures = [];
  const check = (name, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok || !detail ? '' : ' — ' + detail}`);
    if (!ok) failures.push(name);
  };

  // 1. A plain run obeys the program from step 1.
  {
    const commands = ['RIGHT', 'RIGHT', 'DOWN'];
    const r = await playProgram(page, 3, commands);
    const expected = simulate(r.level, commands);
    check(
      'run follows the program from step 1',
      same(r.endedAt, expected),
      `ended at ${JSON.stringify(r.endedAt)}, expected ${JSON.stringify(expected)}`
    );
  }

  // 2. The reported bug: finish a level, move to the next one, and the new
  //    program must not inherit the previous level's execution cursor.
  {
    // Solve a level outright so the cursor is left at its last step.
    const solved = await playProgram(page, 6, ['DOWN', 'DOWN', 'RIGHT']);

    const commands = ['RIGHT', 'RIGHT', 'RIGHT', 'UP', 'UP', 'UP'];
    const after = await page.evaluate(async (commands) => {
      const game = window.game;
      // Exactly what the win modal's "Next Level" button does.
      game.loadLevel(game.currentLevelIdx + 1);
      // Read the cursor before any command is entered: this is the root cause,
      // and entering a command would mask it by rewinding.
      const cursorOnLoad = game.executionStep;
      commands.forEach((c) => game.addCommand(c));
      const cursorBeforeRun = game.executionStep;
      game.runAll();
      await new Promise((resolve) => {
        const done = () => (game.isRunning ? setTimeout(done, 20) : resolve());
        setTimeout(done, 20);
      });
      return {
        level: JSON.parse(JSON.stringify(LEVELS[game.currentLevelIdx])),
        cursorOnLoad,
        cursorBeforeRun,
        endedAt: { ...game.robotPos },
        firstTrailStep: game.trail[0] ? { x: game.trail[0].x, y: game.trail[0].y } : null
      };
    }, commands);

    check(
      'a new level starts with a clean execution cursor',
      after.cursorOnLoad === 0,
      `cursor was ${after.cursorOnLoad} on load (leaked ${solved.commands.length} steps from the previous level)`
    );
    check(
      'the cursor is still clean once the program is entered',
      after.cursorBeforeRun === 0,
      `cursor was ${after.cursorBeforeRun}`
    );

    const expected = simulate(after.level, commands);
    check(
      'next level runs the whole program, not a suffix of it',
      same(after.endedAt, expected),
      `ended at ${JSON.stringify(after.endedAt)}, expected ${JSON.stringify(expected)}`
    );
  }

  // 3. Editing a program that already ran rewinds the robot, so the edited
  //    program replays from step 1 instead of resuming mid-path.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      game.loadLevel(6); // Level 7
      ['UP', 'UP'].forEach((c) => game.addCommand(c));
      game.runAll();
      await new Promise((resolve) => {
        const done = () => (game.isRunning ? setTimeout(done, 20) : resolve());
        setTimeout(done, 20);
      });
      const afterRun = { pos: { ...game.robotPos }, cursor: game.executionStep };

      game.addCommand('RIGHT'); // editing the program after a run
      const afterEdit = { pos: { ...game.robotPos }, cursor: game.executionStep };

      return { start: { ...LEVELS[game.currentLevelIdx].start }, afterRun, afterEdit };
    });

    check(
      'a run advances the execution cursor',
      r.afterRun.cursor === 2,
      `cursor was ${r.afterRun.cursor}`
    );
    check(
      'adding a step after a run rewinds the robot to the start',
      same(r.afterEdit.pos, r.start) && r.afterEdit.cursor === 0,
      `robot at ${JSON.stringify(r.afterEdit.pos)} with cursor ${r.afterEdit.cursor}`
    );
  }

  // 4. Deleting a card must not leave the cursor pointing at a shifted index.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      game.loadLevel(6);
      ['UP', 'UP', 'RIGHT'].forEach((c) => game.addCommand(c));
      game.stepOnce();
      game.stepOnce();
      const beforeEdit = game.executionStep;
      game.removeCommandAt(0);
      return {
        beforeEdit,
        cursor: game.executionStep,
        pos: { ...game.robotPos },
        start: { ...LEVELS[game.currentLevelIdx].start }
      };
    });

    check(
      'stepping advances the execution cursor',
      r.beforeEdit === 2,
      `cursor was ${r.beforeEdit}`
    );
    check(
      'removing a step rewinds the robot to the start',
      r.cursor === 0 && same(r.pos, r.start),
      `robot at ${JSON.stringify(r.pos)} with cursor ${r.cursor}`
    );
  }

  await browser.close();

  if (failures.length) {
    console.log(`\n${failures.length} execution check(s) failed.`);
    process.exit(1);
  }
  console.log('\nThe robot follows the program on screen in every case.');
})();
