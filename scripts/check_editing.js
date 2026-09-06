// check_editing.js - Program editing regression check.
//
// Guards the rule that any step of the program can be picked and changed in
// place: tapping a card picks it, the arrows then point at that step instead
// of the end of the list, ✚ slots a new step in after it, and every edit
// rewinds the robot so what runs next is the plan on screen.
//
// Usage:  node scripts/check_editing.js
// Needs Playwright:  npm i -D playwright  (then: npx playwright install chromium)
// Optional: CHROMIUM_PATH=/path/to/chrome node scripts/check_editing.js

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

async function setup(page) {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('robostep_max_level', '50');
    localStorage.setItem('robostep_mode', 'classic');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.grid-cell');
  await page.evaluate(() => {
    window.game.speed = 15;
    if (window.Sound && Sound.isMuted && !Sound.isMuted()) Sound.toggleMute();
    if (window.Voice) {
      Voice.settings.speakButtons = false;
      Voice.settings.speakSteps = false;
      Voice.settings.speakEvents = false;
      Voice.settings.speakTips = false;
    }
  });
}

// Types a fresh program on a known level and leaves nothing picked.
async function program(page, levelNumber, commands) {
  await page.evaluate(({ levelNumber, commands }) => {
    const game = window.game;
    game.loadLevel(levelNumber - 1);
    commands.forEach((c) => game.addCommand(c));
  }, { levelNumber, commands });
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const samePos = (a, b) => a.x === b.x && a.y === b.y;

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await setup(page);

  const failures = [];
  const check = (name, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok || !detail ? '' : ' — ' + detail}`);
    if (!ok) failures.push(name);
  };

  // 1. Tapping a card picks that step, and the arrows then change it.
  {
    await program(page, 5, ['UP', 'UP', 'UP']);
    await page.locator('.command-card').nth(1).click();

    const picked = await page.evaluate(() => ({
      selected: window.game.selectedIndex,
      pickedCards: document.querySelectorAll('.command-card.picked').length,
      editingArrows: document.querySelectorAll('.arrow-btn.editing').length,
      pressed: document.querySelectorAll('.command-card[aria-pressed="true"]').length
    }));

    check('tapping a card picks that step', picked.selected === 1, `selectedIndex was ${picked.selected}`);
    check(
      'the picked card and the arrows both show the editing state',
      picked.pickedCards === 1 && picked.editingArrows === 4 && picked.pressed === 1,
      `${picked.pickedCards} picked cards, ${picked.editingArrows} editing arrows, ${picked.pressed} pressed`
    );

    await page.locator('#btn-right').click();
    const changed = await page.evaluate(() => ({
      commands: window.game.commands.slice(),
      selected: window.game.selectedIndex
    }));

    check(
      'an arrow changes the picked step instead of adding one',
      eq(changed.commands, ['UP', 'RIGHT', 'UP']),
      `program is ${changed.commands.join(', ')}`
    );
    check(
      'the step stays picked so it can be changed again',
      changed.selected === 1,
      `selectedIndex was ${changed.selected}`
    );
  }

  // 2. Letting go of the step hands the arrows back to adding at the end.
  {
    await page.locator('.command-card').nth(1).click(); // tap the picked one again
    const released = await page.evaluate(() => window.game.selectedIndex);
    check('tapping the picked step again lets go of it', released === null, `selectedIndex was ${released}`);

    await page.locator('#btn-down').click();
    const commands = await page.evaluate(() => window.game.commands.slice());
    check(
      'with nothing picked the arrows add to the end again',
      eq(commands, ['UP', 'RIGHT', 'UP', 'DOWN']),
      `program is ${commands.join(', ')}`
    );
  }

  // 3. ✚ slots a new step in after the picked one and hands it the arrows.
  {
    await program(page, 5, ['UP', 'UP', 'UP']);
    await page.locator('.command-card').nth(0).click();
    await page.locator('.command-card.picked .card-add-btn').click();

    const inserted = await page.evaluate(() => ({
      commands: window.game.commands.slice(),
      selected: window.game.selectedIndex
    }));
    check(
      'the insert button adds a step after the picked one',
      eq(inserted.commands, ['UP', 'UP', 'UP', 'UP']) && inserted.selected === 1,
      `program is ${inserted.commands.join(', ')} with selectedIndex ${inserted.selected}`
    );

    await page.locator('#btn-left').click();
    const retargeted = await page.evaluate(() => window.game.commands.slice());
    check(
      'the inserted step takes the next arrow',
      eq(retargeted, ['UP', 'LEFT', 'UP', 'UP']),
      `program is ${retargeted.join(', ')}`
    );
  }

  // 4. Removing a card keeps the selection on the step it was on.
  {
    const r = await page.evaluate(() => {
      const game = window.game;
      game.loadLevel(4);
      ['UP', 'RIGHT', 'DOWN', 'LEFT'].forEach((c) => game.addCommand(c));

      game.selectCommand(2);
      game.removeCommandAt(0);            // a step before it goes: index shifts down
      const afterEarlier = { commands: game.commands.slice(), selected: game.selectedIndex };

      game.removeCommandAt(game.selectedIndex); // the picked step itself goes
      const afterItself = { commands: game.commands.slice(), selected: game.selectedIndex };

      game.selectCommand(1);
      game.removeLastCommand();           // undo takes out the picked (last) step
      const afterUndo = { commands: game.commands.slice(), selected: game.selectedIndex };

      return { afterEarlier, afterItself, afterUndo };
    });

    check(
      'removing an earlier step keeps the selection on the same step',
      eq(r.afterEarlier.commands, ['RIGHT', 'DOWN', 'LEFT']) && r.afterEarlier.selected === 1,
      `program ${r.afterEarlier.commands.join(', ')} with selectedIndex ${r.afterEarlier.selected}`
    );
    check(
      'removing the picked step lets go of the selection',
      eq(r.afterItself.commands, ['RIGHT', 'LEFT']) && r.afterItself.selected === null,
      `program ${r.afterItself.commands.join(', ')} with selectedIndex ${r.afterItself.selected}`
    );
    check(
      'undoing the picked last step lets go of the selection',
      eq(r.afterUndo.commands, ['RIGHT']) && r.afterUndo.selected === null,
      `program ${r.afterUndo.commands.join(', ')} with selectedIndex ${r.afterUndo.selected}`
    );
  }

  // 5. Editing a program that already ran rewinds the robot, exactly as
  //    adding a step does, so the edited plan replays from step 1.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      game.loadLevel(6); // Level 7
      ['UP', 'UP', 'RIGHT'].forEach((c) => game.addCommand(c));
      game.runAll();
      await new Promise((resolve) => {
        const done = () => (game.isRunning ? setTimeout(done, 20) : resolve());
        setTimeout(done, 20);
      });
      const afterRun = { pos: { ...game.robotPos }, cursor: game.executionStep };

      game.selectCommand(1);
      game.changeCommandAt(1, 'RIGHT');
      const afterChange = { pos: { ...game.robotPos }, cursor: game.executionStep, trail: game.trail.length };

      game.insertCommandAfter(1);
      const afterInsert = { cursor: game.executionStep, commands: game.commands.slice() };

      return { start: { ...LEVELS[game.currentLevelIdx].start }, afterRun, afterChange, afterInsert };
    });

    check('a run advances the execution cursor', r.afterRun.cursor > 0, `cursor was ${r.afterRun.cursor}`);
    check(
      'changing a step rewinds the robot to the start',
      samePos(r.afterChange.pos, r.start) && r.afterChange.cursor === 0 && r.afterChange.trail === 0,
      `robot at ${JSON.stringify(r.afterChange.pos)} with cursor ${r.afterChange.cursor}`
    );
    check(
      'inserting a step rewinds the robot too',
      r.afterInsert.cursor === 0 && r.afterInsert.commands.length === 4,
      `cursor ${r.afterInsert.cursor}, program ${r.afterInsert.commands.join(', ')}`
    );
  }

  // 6. The edited program is what the robot actually runs.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      game.loadLevel(0); // Level 1
      const level = JSON.parse(JSON.stringify(LEVELS[0]));

      // A deliberately wrong first step, fixed in place rather than undone.
      game.addCommand('UP');
      game.addCommand('RIGHT');
      game.selectCommand(0);
      game.addCommand('RIGHT'); // routed to the picked step
      const fixed = game.commands.slice();

      game.runAll();
      await new Promise((resolve) => {
        const done = () => (game.isRunning ? setTimeout(done, 20) : resolve());
        setTimeout(done, 20);
      });

      return { level, fixed, endedAt: { ...game.robotPos }, firstTrail: game.trail[0] || null };
    });

    const expected = { x: r.level.start.x + 2, y: r.level.start.y };
    check(
      'the fixed program is the one that runs',
      eq(r.fixed, ['RIGHT', 'RIGHT']) && samePos(r.endedAt, expected),
      `program ${r.fixed.join(', ')} ended at ${JSON.stringify(r.endedAt)}, expected ${JSON.stringify(expected)}`
    );
  }

  // 7. A run is never left editing a step.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      game.loadLevel(4);
      ['RIGHT', 'RIGHT'].forEach((c) => game.addCommand(c));
      game.selectCommand(0);
      game.runAll();
      const duringRun = game.selectedIndex;
      await new Promise((resolve) => {
        const done = () => (game.isRunning ? setTimeout(done, 20) : resolve());
        setTimeout(done, 20);
      });

      game.resetRobot();
      game.selectCommand(1);
      game.stepOnce();
      const afterStep = game.selectedIndex;

      game.selectCommand(0);
      game.clearCommands();
      const afterClear = game.selectedIndex;

      game.addCommand('UP');
      game.selectCommand(0);
      game.loadLevel(5);
      const afterLevelChange = game.selectedIndex;

      return { duringRun, afterStep, afterClear, afterLevelChange };
    });

    check('running lets go of the picked step', r.duringRun === null, `selectedIndex was ${r.duringRun}`);
    check('stepping lets go of the picked step', r.afterStep === null, `selectedIndex was ${r.afterStep}`);
    check('clearing lets go of the picked step', r.afterClear === null, `selectedIndex was ${r.afterClear}`);
    check(
      'a new level starts with nothing picked',
      r.afterLevelChange === null,
      `selectedIndex was ${r.afterLevelChange}`
    );
  }

  // 8. Keyboard: arrows change the picked step, Escape lets go of it, and
  //    Delete takes out that one step rather than the whole program.
  {
    await program(page, 5, ['UP', 'UP', 'UP']);
    await page.evaluate(() => window.game.selectCommand(1));
    await page.keyboard.press('ArrowRight');
    const typed = await page.evaluate(() => window.game.commands.slice());
    check(
      'arrow keys change the picked step',
      eq(typed, ['UP', 'RIGHT', 'UP']),
      `program is ${typed.join(', ')}`
    );

    await page.keyboard.press('Delete');
    const deleted = await page.evaluate(() => ({
      commands: window.game.commands.slice(),
      selected: window.game.selectedIndex
    }));
    check(
      'Delete takes out the picked step, not the whole program',
      eq(deleted.commands, ['UP', 'UP']) && deleted.selected === null,
      `program is ${deleted.commands.join(', ')}`
    );

    await page.evaluate(() => window.game.selectCommand(0));
    await page.keyboard.press('Escape');
    const escaped = await page.evaluate(() => ({
      selected: window.game.selectedIndex,
      commands: window.game.commands.slice()
    }));
    check(
      'Escape lets go of the picked step and keeps the program',
      escaped.selected === null && eq(escaped.commands, ['UP', 'UP']),
      `selectedIndex ${escaped.selected}, program ${escaped.commands.join(', ')}`
    );

    await page.keyboard.press('Escape');
    const cleared = await page.evaluate(() => window.game.commands.slice());
    check(
      'a second Escape still clears the program',
      cleared.length === 0,
      `program is ${cleared.join(', ')}`
    );
  }

  // 9. Nothing is editable while the robot is running.
  {
    const r = await page.evaluate(async () => {
      const game = window.game;
      game.loadLevel(9);
      game.speed = 120; // slow enough to catch it mid-run
      ['RIGHT', 'RIGHT', 'RIGHT'].forEach((c) => game.addCommand(c));
      game.runAll();

      await new Promise((resolve) => setTimeout(resolve, 60));
      game.selectCommand(0);
      const selectedMidRun = game.selectedIndex;
      game.changeCommandAt(2, 'UP');
      game.insertCommandAfter(0);
      const commandsMidRun = game.commands.slice();

      await new Promise((resolve) => {
        const done = () => (game.isRunning ? setTimeout(done, 20) : resolve());
        setTimeout(done, 20);
      });
      game.speed = 15;
      return { selectedMidRun, commandsMidRun };
    });

    check(
      'a running robot cannot have its program picked at or edited',
      r.selectedMidRun === null && eq(r.commandsMidRun, ['RIGHT', 'RIGHT', 'RIGHT']),
      `selectedIndex ${r.selectedMidRun}, program ${r.commandsMidRun.join(', ')}`
    );
  }

  await browser.close();

  console.log('');
  if (failures.length) {
    console.error(`${failures.length} check(s) failed:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log('All program editing checks passed.');
})();
