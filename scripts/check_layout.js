// check_layout.js - One-screen layout regression check.
//
// RoboStep is meant to fit entirely inside the viewport on every device, with
// arrow buttons big enough for small fingers. This script loads index.html at a
// range of phone, tablet and desktop sizes and fails if:
//   - the page scrolls in either direction,
//   - any panel clips its own contents,
//   - an arrow button drops below a comfortable tap target.
//
// Usage:  node scripts/check_layout.js
// Needs Playwright:  npm i -D playwright  (then: npx playwright install chromium)
// Optional: CHROMIUM_PATH=/path/to/chrome node scripts/check_layout.js

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

// Minimum comfortable arrow-button size (px). Kid-sized fingers need room.
const MIN_ARROW_WIDTH = 60;
const MIN_ARROW_HEIGHT = 38;

const VIEWPORTS = [
  { name: 'Galaxy Fold (portrait)', width: 320, height: 653 },
  { name: 'Small Android (portrait)', width: 360, height: 640 },
  { name: 'iPhone SE (portrait)', width: 375, height: 667 },
  { name: 'iPhone 12 + browser UI', width: 390, height: 664 },
  { name: 'iPhone 12 (portrait)', width: 390, height: 844 },
  { name: 'Pixel 7 (portrait)', width: 412, height: 915 },
  { name: 'iPad (portrait)', width: 768, height: 1024 },
  { name: 'Small phone (landscape)', width: 568, height: 320 },
  { name: 'iPhone SE (landscape)', width: 667, height: 375 },
  { name: 'iPhone 12 (landscape)', width: 844, height: 390 },
  { name: 'iPad (landscape)', width: 1024, height: 768 },
  { name: 'Laptop', width: 1280, height: 800 },
  { name: 'Desktop', width: 1920, height: 1080 }
];

// Worth checking the largest board (8x8) with a full instruction tape, since
// that is the most crowded the screen ever gets.
const TEST_LEVEL = 50;
const TEST_COMMANDS = 8;

// Smoothie Remix adds a recipe card above the board, so the tightest screens
// are re-checked in that mode with its busiest recipe.
const SMOOTHIE_VIEWPORTS = [
  { name: 'Galaxy Fold (portrait)', width: 320, height: 653 },
  { name: 'iPhone SE (portrait)', width: 375, height: 667 },
  { name: 'iPhone 12 + browser UI', width: 390, height: 664 },
  { name: 'Small phone (landscape)', width: 568, height: 320 }
];

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) };
    };

    const clipped = [];
    ['#app-container', '.top-nav', '.arena-panel', '.controls-panel'].forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
        clipped.push(sel);
      }
    });

    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      overflowY: doc.scrollHeight - doc.clientHeight,
      viewportHeight: doc.clientHeight,
      clipped,
      lastRowBottom: box('.secondary-bar') ? box('.secondary-bar').bottom : 0,
      board: box('#game-grid'),
      arrowUp: box('#btn-up'),
      arrowLeft: box('#btn-left')
    };
  });
}

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );

  let failures = 0;
  const runs = [
    ...VIEWPORTS.map(vp => ({ vp, mode: 'classic' })),
    ...SMOOTHIE_VIEWPORTS.map(vp => ({ vp, mode: 'smoothie' }))
  ];

  for (const { vp, mode } of runs) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width < 820,
      hasTouch: vp.width < 820
    });
    const page = await context.newPage();

    // The web-font stylesheet can stall the load event; layout only needs the DOM.
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ lvl, mode }) => {
      localStorage.setItem('robostep_max_level', '50');
      localStorage.setItem('robostep_last_played', String(lvl));
      localStorage.setItem('robostep_mode', mode);
      // The last recipe is the busiest board in Smoothie Remix.
      localStorage.setItem('robostep_smoothie_max_level', '12');
      localStorage.setItem('robostep_smoothie_last_played', '12');
    }, { lvl: TEST_LEVEL, mode });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.grid-cell');

    await page.evaluate((count) => {
      const dirs = ['RIGHT', 'DOWN', 'LEFT', 'UP'];
      for (let i = 0; i < count; i++) window.game.addCommand(dirs[i % dirs.length]);
    }, TEST_COMMANDS);
    await page.waitForTimeout(120);

    const m = await measure(page);
    const problems = [];

    if (m.overflowY > 0) problems.push(`page scrolls vertically by ${m.overflowY}px`);
    if (m.overflowX > 0) problems.push(`page scrolls horizontally by ${m.overflowX}px`);
    if (m.lastRowBottom > m.viewportHeight) problems.push('tool bar falls below the fold');
    if (m.clipped.length) problems.push(`clipped contents: ${m.clipped.join(', ')}`);
    [['up', m.arrowUp], ['left', m.arrowLeft]].forEach(([name, b]) => {
      if (!b) {
        problems.push(`missing ${name} arrow`);
      } else if (b.w < MIN_ARROW_WIDTH || b.h < MIN_ARROW_HEIGHT) {
        problems.push(`${name} arrow too small (${b.w}x${b.h})`);
      }
    });

    const modeTag = mode === 'smoothie' ? '🥤 ' : '';
    const label = `${modeTag}${vp.name} (${vp.width}x${vp.height})`.padEnd(36);
    if (problems.length) {
      failures++;
      console.log(`FAIL  ${label} ${problems.join('; ')}`);
    } else {
      console.log(`ok    ${label} board ${m.board.w}px, arrows ${m.arrowUp.w}x${m.arrowUp.h}px`);
    }

    await context.close();
  }

  await browser.close();

  if (failures) {
    console.log(`\n${failures} viewport(s) failed the one-screen layout check.`);
    process.exit(1);
  }
  console.log('\nAll viewports fit on one screen with usable arrow buttons.');
})();
