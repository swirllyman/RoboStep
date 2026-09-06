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
    // These checks are about the classic quest; be explicit so a stored
    // Smoothie Remix mode can never change what they load.
    localStorage.setItem('robostep_mode', 'classic');
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

  // 5. The refactored movement rules still stop the robot correctly.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      const findLevel = (pred) => LEVELS.findIndex(pred);
      const out = {};

      // Walking off the board: the robot takes the legal moves, then stops at
      // the boundary in a bump rather than stepping outside it.
      game.loadLevel(0);
      const lvl1 = LEVELS[0];
      ['UP', 'UP', 'UP', 'UP'].forEach((c) => game.addCommand(c));
      game.runAll();
      await new Promise((res) => { const d = () => (game.isRunning ? setTimeout(d, 20) : res()); setTimeout(d, 20); });
      const topRow = { x: lvl1.start.x, y: 0 };
      const edgePreview = previewMove(lvl1, topRow, 'UP');
      out.edge = {
        after: { ...game.robotPos },
        stoppedAt: topRow,
        state: game.robotState,
        previewBlocked: edgePreview.blocked,
        previewPos: edgePreview.pos
      };

      // Stepping into a pit moves the robot in and ends the run.
      const pitIdx = findLevel((l) => l.pits.length > 0);
      game.loadLevel(pitIdx);
      const lvl = LEVELS[pitIdx];
      const pit = lvl.pits[0];
      // Walk the robot next to a pit, then straight into it.
      const route = game.solveBFS(lvl, lvl.start);
      out.pitLevel = lvl.id;
      out.pitReachable = route.length > 0;

      // Drive directly: place a program that walks into the pit from beside it.
      const beside = { x: pit.x, y: pit.y + 1 };
      const inside = beside.y < lvl.height && !lvl.blockers.some((b) => b.x === beside.x && b.y === beside.y);
      out.pitTestable = inside;
      if (inside) {
        const preview = previewMove(lvl, beside, 'UP');
        out.pitPreview = preview.blocked;
        out.pitPreviewPos = preview.pos;
      }
      return out;
    });

    check(
      'walking off the board stops the robot at the boundary',
      same(r.edge.after, r.edge.stoppedAt) && r.edge.state === 'bump',
      `robot ended at ${JSON.stringify(r.edge.after)} in state ${r.edge.state}`
    );
    check(
      'the edge is previewed as a blocked move that keeps the square',
      r.edge.previewBlocked === 'edge' && same(r.edge.previewPos, r.edge.stoppedAt),
      `preview said ${r.edge.previewBlocked} at ${JSON.stringify(r.edge.previewPos)}`
    );
    check(
      'a pit is previewed as a fall onto the pit square',
      !r.pitTestable || (r.pitPreview === 'pit' && r.pitPreviewPos),
      `preview said ${r.pitPreview}`
    );
  }

  // 6. Hints are contextual: they describe the robot's situation, not the
  //    level's opening move.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      const msg = () => document.getElementById('status-message').textContent;
      const out = {};

      game.loadLevel(6); // Level 7: start bottom-left, gem top-right
      game.showHint();
      out.fresh = msg();

      // Walk part-way, then ask again from the new square.
      ['UP', 'UP'].forEach((c) => game.addCommand(c));
      game.runAll();
      await new Promise((res) => { const d = () => (game.isRunning ? setTimeout(d, 20) : res()); setTimeout(d, 20); });
      out.movedTo = { ...game.robotPos };
      game.showHint();
      out.afterWalking = msg();

      // Queue instructions without running them: the hint should look past them.
      game.loadLevel(6);
      ['UP', 'UP', 'UP'].forEach((c) => game.addCommand(c));
      game.showHint();
      out.withPlan = msg();

      // A plan that walks off the board should be called out by step number.
      game.loadLevel(6);
      ['UP', 'UP', 'UP', 'UP', 'UP'].forEach((c) => game.addCommand(c));
      game.showHint();
      out.badPlan = msg();

      // A winning plan should say so rather than suggest another step.
      game.loadLevel(6);
      const solution = game.solveBFS(LEVELS[6], LEVELS[6].start);
      solution.forEach((c) => game.addCommand(c));
      game.showHint();
      out.winningPlan = msg();
      out.solutionLength = solution.length;

      return out;
    });

    check(
      'a fresh level hints the opening move',
      /Start by going/.test(r.fresh),
      `said "${r.fresh}"`
    );
    check(
      'after walking, the hint speaks from the new square',
      /From here, go/.test(r.afterWalking),
      `said "${r.afterWalking}"`
    );
    check(
      'a queued plan is taken into account',
      /add /i.test(r.withPlan) && /after your 3 steps/i.test(r.withPlan),
      `said "${r.withPlan}"`
    );
    check(
      'a plan that leaves the board is flagged with its step number',
      /Careful! Step 4 walks off the edge/.test(r.badPlan),
      `said "${r.badPlan}"`
    );
    check(
      'a winning plan is recognised instead of extended',
      /reaches the gem/.test(r.winningPlan),
      `said "${r.winningPlan}"`
    );
  }

  // 7. Hints have to work for a player who cannot read them: everything the
  //    hint says must also be drawn on the board and on the buttons.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      const count = (sel) => document.querySelectorAll(sel).length;
      const pressed = () => {
        const el = document.querySelector('.press-me');
        return el ? el.id : null;
      };
      const out = {};

      // A plain hint: an arrow for the next move, footsteps onwards, a ring
      // around the prize, and the matching button pulsing.
      game.loadLevel(11);
      game.showHint();
      out.route = {
        arrow: count('.hint-next'),
        steps: count('.hint-dot'),
        goal: count('.hint-goal'),
        pressed: pressed()
      };
      // Which way does the drawn arrow point, and does the pulsing button agree?
      const arrowEl = document.querySelector('.hint-next');
      out.route.arrowDir = arrowEl
        ? [...arrowEl.classList].find((c) => c.startsWith('dir-'))
        : null;

      // Acting on the hint clears it again.
      game.addCommand('DOWN');
      out.clearedAfterAction = {
        marks: count('.hint-mark'),
        pressed: pressed()
      };

      // A plan that hits a rock: the bad card, the hazard and a way out.
      game.loadLevel(11);
      ['DOWN', 'RIGHT', 'RIGHT', 'RIGHT'].forEach((c) => game.addCommand(c));
      game.showHint();
      out.danger = {
        badCards: count('.command-card.hint-bad'),
        stop: count('.hint-stop'),
        hazardRing: count('.hint-danger'),
        pressed: pressed()
      };

      // A winning plan: Run is the button to press.
      game.loadLevel(2);
      game.solveBFS(LEVELS[2], LEVELS[2].start).forEach((c) => game.addCommand(c));
      game.showHint();
      out.ready = {
        goodSteps: count('.hint-plan.good'),
        pressed: pressed()
      };

      return out;
    });

    check(
      'a hint draws the next move, the way onwards and the prize',
      r.route.arrow === 1 && r.route.steps > 0 && r.route.goal === 1,
      JSON.stringify(r.route)
    );
    check(
      'the pulsing button matches the arrow drawn on the board',
      r.route.pressed === `btn-${r.route.arrowDir.replace('dir-', '')}`,
      `${r.route.pressed} vs ${r.route.arrowDir}`
    );
    check(
      'the hint clears once the player acts on it',
      r.clearedAfterAction.marks === 0 && r.clearedAfterAction.pressed === null,
      JSON.stringify(r.clearedAfterAction)
    );
    check(
      'a bad plan flags the step, marks the hazard and offers a way out',
      r.danger.badCards === 1 && r.danger.stop === 1 && r.danger.hazardRing === 1 &&
        /^btn-(up|down|left|right)$/.test(r.danger.pressed || ''),
      JSON.stringify(r.danger)
    );
    check(
      'a winning plan traces itself and pulses Run',
      r.ready.goodSteps > 0 && r.ready.pressed === 'btn-run',
      JSON.stringify(r.ready)
    );
  }

  // 8. The ghost preview is a promise about the run: wherever the ghost is
  //    standing, the real robot has to finish on exactly that square.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      const count = (sel) => document.querySelectorAll(sel).length;
      const pressed = () => document.getElementById('btn-ghost').getAttribute('aria-pressed');
      const runToEnd = () => {
        game.runAll();
        return new Promise((resolve) => {
          const done = () => (game.isRunning ? setTimeout(done, 20) : resolve());
          setTimeout(done, 20);
        });
      };
      const plan = (levelNumber, commands) => {
        game.loadLevel(levelNumber - 1);
        commands.forEach((c) => game.addCommand(c));
        return game.ghostPreview();
      };
      const out = {};

      // Off: the board stays clean.
      if (game.ghostOn) game.toggleGhost();
      plan(3, ['RIGHT', 'RIGHT', 'DOWN']);
      out.off = { marks: count('.ghost-step, .ghost-robot'), pressed: pressed() };

      // On: a numbered footprint per step, and one ghost robot at the end.
      game.toggleGhost();
      const commands = ['RIGHT', 'RIGHT', 'DOWN'];
      const ghost = plan(3, commands);
      out.on = {
        pressed: pressed(),
        steps: count('.ghost-step'),
        robots: count('.ghost-robot'),
        ends: count('.ghost-here'),
        firstBadge: document.querySelector('.ghost-step').textContent,
        squares: ghost.squares.length
      };

      // The picture moves with the program it describes.
      const before = { ...ghost.end };
      game.addCommand('DOWN');
      out.followsEdits = { before, after: { ...game.ghostPreview().end } };
      game.removeLastCommand();
      out.followsUndo = { ...game.ghostPreview().end };

      // A hint owns the board while it is up, so the ghost stands aside.
      game.showHint();
      out.duringHint = count('.ghost-step, .ghost-robot');
      game.clearHint();
      out.afterHint = count('.ghost-step');

      // Cases covering every way a program can end: running out of steps,
      // reaching the gem, bumping, and falling in.
      const cases = [
        { name: 'runs out of steps', levelNumber: 3, commands: ['RIGHT'] },
        { name: 'walks off the edge', levelNumber: 7, commands: ['UP', 'UP', 'UP', 'UP', 'UP'] },
        { name: 'bumps into a rock', levelNumber: 12, commands: ['DOWN', 'RIGHT', 'RIGHT', 'RIGHT'] },
        {
          name: 'reaches the gem',
          levelNumber: 3,
          commands: game.solveBFS(LEVELS[2], LEVELS[2].start)
        }
      ];

      // Walk to a square beside a pit, then straight into it.
      for (const lvl of LEVELS) {
        let found = null;
        for (const pit of lvl.pits) {
          for (const dir of Object.keys(STEP_DELTAS)) {
            const d = STEP_DELTAS[dir];
            const from = { x: pit.x - d.dx, y: pit.y - d.dy };
            if (from.x < 0 || from.y < 0 || from.x >= lvl.width || from.y >= lvl.height) continue;
            const route = game.solveBFS(lvl, lvl.start, from);
            if (!route.length) continue;
            const candidate = { name: 'falls into a pit', levelNumber: lvl.id, commands: [...route, dir] };
            if (plan(candidate.levelNumber, candidate.commands).outcome === 'fall') {
              found = candidate;
              break;
            }
          }
          if (found) break;
        }
        if (found) {
          cases.push(found);
          break;
        }
      }

      out.cases = [];
      for (const c of cases) {
        const ghosted = plan(c.levelNumber, c.commands);
        const promised = { ...ghosted.end };
        const outcome = ghosted.outcome;
        await runToEnd();
        out.cases.push({
          name: c.name,
          outcome,
          promised,
          landedOn: { ...game.robotPos },
          state: game.robotState
        });
      }

      return out;
    });

    check(
      'the ghost draws nothing until it is switched on',
      r.off.marks === 0 && r.off.pressed === 'false',
      JSON.stringify(r.off)
    );
    check(
      'switching it on numbers every square of the program and stands at the end',
      r.on.pressed === 'true' && r.on.steps === 3 && r.on.squares === 3 &&
        r.on.robots === 1 && r.on.ends === 1 && r.on.firstBadge === '1',
      JSON.stringify(r.on)
    );
    check(
      'the ghost follows edits to the program',
      !same(r.followsEdits.before, r.followsEdits.after) &&
        same(r.followsUndo, r.followsEdits.before),
      JSON.stringify(r.followsEdits)
    );
    check(
      'a hint takes the board over, and the ghost comes back after it',
      r.duringHint === 0 && r.afterHint > 0,
      `${r.duringHint} marks during the hint, ${r.afterHint} after`
    );

    r.cases.forEach((c) => {
      check(
        `the ghost stands where the robot ends up when it ${c.name}`,
        same(c.promised, c.landedOn),
        `ghost said ${JSON.stringify(c.promised)}, robot reached ${JSON.stringify(c.landedOn)}`
      );
    });

    const outcomes = Object.fromEntries(r.cases.map((c) => [c.name, c.outcome]));
    check(
      'the ghost names the outcome it is showing',
      outcomes['reaches the gem'] === 'win' &&
        outcomes['walks off the edge'] === 'bump' &&
        outcomes['bumps into a rock'] === 'bump' &&
        outcomes['runs out of steps'] === 'stop' &&
        (!('falls into a pit' in outcomes) || outcomes['falls into a pit'] === 'fall'),
      JSON.stringify(outcomes)
    );
    check(
      'every way a program can end is covered',
      r.cases.length === 5,
      `only ${r.cases.length} cases ran`
    );
  }

  await browser.close();

  if (failures.length) {
    console.log(`\n${failures.length} execution check(s) failed.`);
    process.exit(1);
  }
  console.log('\nThe robot follows the program on screen in every case.');
})();
