// game.js - Core Game Controller, Loop, Interpreter, and UI Logic

// Hand-drawn control icons. One arrow shape is rotated per direction, so the
// four arrows can never drift apart. `fill: currentColor` lets each button
// colour its own icon.
const ICONS = {
  arrow: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 4.9a1.9 1.9 0 0 1 2.8 0l7 7.7c1.1 1.2.2 3.1-1.4 3.1h-3.6v2.6c0 1-.8 1.8-1.8 1.8h-3.2c-1 0-1.8-.8-1.8-1.8v-2.6H5c-1.6 0-2.5-1.9-1.4-3.1z"/></svg>',
  play: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.4 4.6 19 11.1a1.1 1.1 0 0 1 0 1.8L8.4 19.4A1.1 1.1 0 0 1 6.7 18.5V5.5a1.1 1.1 0 0 1 1.7-.9z"/></svg>',
  skip: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 4.9 15 11.1a1.1 1.1 0 0 1 0 1.8L6.4 19.1A1.1 1.1 0 0 1 4.7 18.2V5.8a1.1 1.1 0 0 1 1.7-.9z"/><rect x="16.6" y="4.9" width="3.2" height="14.2" rx="1.6"/></svg>',
  reset: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.6a6.6 6.6 0 1 1-6.3 8.6" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round"/><path d="M12.6 2.4v6.4L7.2 5.6z"/></svg>',
  undo: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 8.2h4.9a4.9 4.9 0 0 1 0 9.8H8.6" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/><path d="M10.6 4.2v8L5.1 8.2z"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 3.4h5.2c.7 0 1.3.6 1.3 1.3v.9h3.2a1.2 1.2 0 0 1 0 2.4H4.9a1.2 1.2 0 0 1 0-2.4h3.2v-.9c0-.7.6-1.3 1.3-1.3z"/><path d="M6.6 9.6h10.8l-.8 9.4c-.1 1-.9 1.7-1.9 1.7H9.3c-1 0-1.8-.7-1.9-1.7z"/></svg>',
  bulb: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6a6.8 6.8 0 0 1 4.1 12.2c-.6.5-1 1.2-1.1 1.9H9c-.1-.7-.5-1.4-1.1-1.9A6.8 6.8 0 0 1 12 2.6z"/><rect x="9" y="18.1" width="6" height="1.9" rx="1"/><rect x="9.9" y="20.6" width="4.2" height="1.8" rx="0.9"/></svg>'
};

// Buttons declare which icon they want with data-icon; this fills them in so
// the markup stays free of duplicated SVG paths.
function renderIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const icon = ICONS[el.dataset.icon];
    if (icon) el.innerHTML = icon;
  });
}

const STEP_DELTAS = {
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 }
};

// What one instruction does from a given square, with no side effects. Both
// the robot and the hint system read the rules from here, so a hint can never
// describe a move the robot would not actually make.
//   blocked: null   -> free move, pos is the destination
//   blocked: 'edge' -> walks off the board, robot stays put
//   blocked: 'rock' -> boulder in the way, robot stays put (pos is the rock)
//   blocked: 'pit'  -> robot steps in and falls (pos is the pit)
function previewMove(level, pos, cmd) {
  const delta = STEP_DELTAS[cmd];
  if (!delta) return { blocked: 'edge', pos: { ...pos } };

  const next = { x: pos.x + delta.dx, y: pos.y + delta.dy };

  if (next.x < 0 || next.x >= level.width || next.y < 0 || next.y >= level.height) {
    return { blocked: 'edge', pos: { ...pos } };
  }
  if (level.blockers.some(b => b.x === next.x && b.y === next.y)) {
    return { blocked: 'rock', pos: next };
  }
  if (level.pits.some(pit => pit.x === next.x && pit.y === next.y)) {
    return { blocked: 'pit', pos: next };
  }
  return { blocked: null, pos: next };
}

class GameController {
  constructor() {
    this.currentLevelIdx = 0;
    // 'classic' plays the 50-level gem quest, 'smoothie' plays Smoothie Remix.
    // Each mode keeps its own progress, so neither overwrites the other.
    this.mode = localStorage.getItem('robostep_mode') === 'smoothie' ? 'smoothie' : 'classic';
    this.loadProgress();

    // Ingredients picked up so far this attempt (keys of "x,y"), and how far
    // through the blend-and-drink celebration we are.
    this.collected = new Set();
    this.smoothieStage = null;
    
    // Play state
    this.commands = [];
    this.robotPos = { x: 0, y: 0 };
    this.robotDir = "DOWN";
    this.robotState = "idle";
    this.isRunning = false;
    this.executionStep = 0;
    this.runTimer = null;
    this.speed = 420; // ms per step (Turtle: 700, Rabbit: 420, Lightning: 220)

    // Ghost preview: when on, the board shows where the program would leave
    // the robot before a single step is actually run. Remembered between
    // sessions like the other play preferences.
    this.ghostOn = localStorage.getItem('robostep_ghost') === '1';

    // Path trail history
    this.trail = [];

    // Cached elements
    this.gridEl = document.getElementById('game-grid');
    this.gridViewportEl = document.querySelector('.grid-viewport');
    this.commandTapeEl = document.getElementById('command-tape');
    this.stepCountEl = document.getElementById('step-count-badge');
    this.levelTitleEl = document.getElementById('level-title');
    this.levelWorldEl = document.getElementById('level-world');
    this.levelParEl = document.getElementById('level-par');
    this.tipTextEl = document.getElementById('tip-text');
    this.statusMsgEl = document.getElementById('status-message');

    renderIcons();
    this.initEvents();
    this.initBoardFitting();
  }

  start() {
    // Load first level or last played level of whichever mode was last open
    const lastPlayed = parseInt(localStorage.getItem(this.progressKey('last_played')) || '1', 10);
    this.loadLevel(Math.min(lastPlayed, this.maxUnlockedLevel, this.getLevelSet().length) - 1);
  }

  // ==========================================
  // MODES: CLASSIC GEM QUEST & SMOOTHIE REMIX
  // The rules follow the level data, not the mode name: any level carrying
  // `ingredients` and a `blender` is played as a smoothie recipe.
  // ==========================================
  getLevelSet() {
    return this.mode === 'smoothie' ? SMOOTHIE_LEVELS : LEVELS;
  }

  getCurrentLevel() {
    return this.getLevelSet()[this.currentLevelIdx];
  }

  // The square the robot has to finish on: a blender if there is one, else the gem.
  goalSquare(level) {
    return level.blender || level.gem;
  }

  ingredientsOf(level) {
    return level.ingredients || [];
  }

  isRecipeLevel(level) {
    return this.ingredientsOf(level).length > 0;
  }

  progressKey(name) {
    return this.mode === 'smoothie' ? `robostep_smoothie_${name}` : `robostep_${name}`;
  }

  loadProgress() {
    this.maxUnlockedLevel = parseInt(localStorage.getItem(this.progressKey('max_level')) || '1', 10);
    this.starsData = JSON.parse(localStorage.getItem(this.progressKey('stars')) || '{}');
  }

  setMode(mode) {
    const next = mode === 'smoothie' ? 'smoothie' : 'classic';
    if (next === this.mode) return;

    this.mode = next;
    localStorage.setItem('robostep_mode', next);
    this.loadProgress();

    const lastPlayed = parseInt(localStorage.getItem(this.progressKey('last_played')) || '1', 10);
    this.loadLevel(Math.min(lastPlayed, this.maxUnlockedLevel, this.getLevelSet().length) - 1);
  }

  // Ingredients are tracked by square, since no two share one.
  ingredientKey(pos) {
    return `${pos.x},${pos.y}`;
  }

  remainingIngredients(level = this.getCurrentLevel(), collected = this.collected) {
    return this.ingredientsOf(level).filter(i => !collected.has(this.ingredientKey(i)));
  }

  recipeComplete(level = this.getCurrentLevel(), collected = this.collected) {
    return this.remainingIngredients(level, collected).length === 0;
  }

  isOnGoal(level = this.getCurrentLevel(), pos = this.robotPos) {
    const goal = this.goalSquare(level);
    return pos.x === goal.x && pos.y === goal.y;
  }

  // The robot has won once it is standing on the goal with the whole recipe.
  hasWon() {
    const lvl = this.getCurrentLevel();
    return this.isOnGoal(lvl) && this.recipeComplete(lvl);
  }

  // ==========================================
  // RESPONSIVE BOARD SIZING
  // The board is the only flexible piece of the layout: it takes the
  // largest square that fits the space left over once the header, the
  // instruction tape and the (deliberately large) arrow pad are placed.
  // That keeps the entire game on one screen at any size or orientation.
  // ==========================================
  initBoardFitting() {
    if (!this.gridViewportEl) return;

    const fit = () => this.fitBoard();

    if (typeof ResizeObserver !== 'undefined') {
      this.boardObserver = new ResizeObserver(fit);
      this.boardObserver.observe(this.gridViewportEl);
    }

    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 150));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit).catch(() => {});
    }

    fit();
  }

  fitBoard() {
    if (!this.gridViewportEl) return;
    const rect = this.gridViewportEl.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));
    if (size <= 0) return;
    this.gridEl.style.width = `${size}px`;
    this.gridEl.style.height = `${size}px`;
  }

  loadLevel(levelIndex) {
    if (levelIndex < 0 || levelIndex >= this.getLevelSet().length) return;
    this.currentLevelIdx = levelIndex;
    localStorage.setItem(this.progressKey('last_played'), (levelIndex + 1).toString());

    this.stopRunning();
    this.clearHint(true);
    this.commands = [];
    this.trail = [];
    this.collected = new Set();
    this.smoothieStage = null;
    this.statusMsgEl.textContent = "";
    this.statusMsgEl.className = "status-message";

    const lvl = this.getCurrentLevel();
    this.robotPos = { ...lvl.start };
    this.robotDir = "DOWN";
    this.robotState = "idle";
    // Must be cleared with the rest of the play state: a level loaded while
    // this still pointed at the previous level's last step made Run skip that
    // many instructions.
    this.executionStep = 0;

    // Update Header Info
    this.levelTitleEl.textContent = `Level ${lvl.id}: ${lvl.title}`;
    this.levelWorldEl.textContent = lvl.world;
    this.levelParEl.textContent = `Target: ${lvl.par} steps`;
    this.tipTextEl.textContent = lvl.tip || "Plan your route to the gem!";

    this.renderRecipeBar();
    this.renderGrid();
    this.renderCommandTape();
    this.updateControlsState();

    // Announce level title if voice events enabled
    if (typeof Voice !== 'undefined' && Voice.settings.speakEvents) {
      Voice.speak(`Level ${lvl.id}: ${lvl.title}`);
    }
  }

  // ==========================================
  // GRID RENDERING
  // ==========================================
  renderGrid() {
    const lvl = this.getCurrentLevel();
    this.gridEl.innerHTML = "";
    this.gridEl.style.gridTemplateColumns = `repeat(${lvl.width}, 1fr)`;
    this.gridEl.style.gridTemplateRows = `repeat(${lvl.height}, 1fr)`;
    
    // Set theme class based on world
    const worldClasses = {
      "Sunny Meadow": "world-meadow",
      "Rocky Canyon": "world-canyon",
      "Danger Chasm": "world-chasm",
      "Circuit City": "world-city",
      "Master Academy": "world-master",
      "Smoothie Kitchen": "world-kitchen"
    };
    // The very first paint should land on the level's real world colours.
    // Without this the board fades in from the meadow palette baked into the
    // markup, which flashes green on a canyon or chasm level.
    const firstPaint = !this.hasPaintedBoard;
    this.gridEl.className =
      `grid-container ${worldClasses[lvl.world] || 'world-meadow'}${firstPaint ? ' no-fade' : ''}`;
    if (firstPaint) {
      this.hasPaintedBoard = true;
      requestAnimationFrame(() => this.gridEl.classList.remove('no-fade'));
    }

    const blockerMap = new Set(lvl.blockers.map(b => `${b.x},${b.y}`));
    const pitMap = new Set(lvl.pits.map(p => `${p.x},${p.y}`));
    const trailMap = new Map(this.trail.map((t, idx) => [`${t.x},${t.y}`, idx + 1]));
    // Worked out once for the whole board rather than once per square.
    const ghost = this.ghostPreview();

    for (let y = 0; y < lvl.height; y++) {
      for (let x = 0; x < lvl.width; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;

        const key = `${x},${y}`;

        // Starting tile marker
        if (lvl.start.x === x && lvl.start.y === y) {
          cell.classList.add('cell-start');
        }

        // Blocker
        if (blockerMap.has(key)) {
          cell.classList.add('cell-blocker');
          cell.innerHTML = `
            <div class="obstacle-blocker" title="Rock">
              <svg viewBox="0 0 60 60" width="85%" height="85%">
                <polygon points="12,50 6,28 22,10 44,8 54,26 48,50" fill="#78716C" stroke="#44403C" stroke-width="3" />
                <polygon points="12,50 22,10 34,22 28,48" fill="#A8A29E" opacity="0.6" />
                <polygon points="34,22 44,8 54,26 42,34" fill="#E7E5E4" opacity="0.4" />
              </svg>
            </div>
          `;
        }
        // Pit / Hazard Gap
        else if (pitMap.has(key)) {
          cell.classList.add('cell-pit');
          cell.innerHTML = `
            <div class="hazard-pit" title="Pit Hole">
              <div class="pit-depth"></div>
              <div class="pit-warning-stripes"></div>
            </div>
          `;
        }
        // Blender (smoothie levels): the goal, and a live progress meter -
        // it fills with the recipe colour as ingredients are collected.
        else if (lvl.blender && lvl.blender.x === x && lvl.blender.y === y) {
          cell.classList.add('cell-blender');
          cell.innerHTML = this.renderBlenderHTML(lvl);
        }
        // Goal Gem
        else if (lvl.gem && lvl.gem.x === x && lvl.gem.y === y) {
          cell.classList.add('cell-gem');
          cell.innerHTML = `
            <div class="gem-wrapper" title="Goal Gem">
              <svg class="gem-svg" viewBox="0 0 60 60" width="85%" height="85%">
                <polygon points="30,6 52,22 30,54 8,22" fill="#06B6D4" stroke="#0891B2" stroke-width="2.5" />
                <polygon points="30,6 40,22 30,54" fill="#67E8F9" />
                <polygon points="30,6 20,22 30,54" fill="#22D3EE" />
                <polygon points="8,22 20,22 30,6" fill="#A5F3FC" />
                <polygon points="52,22 40,22 30,6" fill="#0891B2" />
              </svg>
              <div class="gem-glow"></div>
            </div>
          `;
        }

        // Ingredient waiting to be picked up
        const ingredient = this.ingredientsOf(lvl)
          .find(i => i.x === x && i.y === y && !this.collected.has(this.ingredientKey(i)));
        if (ingredient) {
          cell.classList.add('cell-ingredient');
          const token = document.createElement('div');
          token.className = 'ingredient-token';
          token.title = ingredient.name;
          token.textContent = ingredient.emoji;
          cell.appendChild(token);
        }

        // Ghost preview: where the program would take the robot, step by step
        this.decorateGhostCell(cell, x, y, ghost);

        // Hint markers: the way to go, the plan so far, and any danger
        this.decorateHintCell(cell, x, y);

        // Breadcrumb Trail dot
        if (trailMap.has(key) && !(this.robotPos.x === x && this.robotPos.y === y)) {
          const trailNum = trailMap.get(key);
          const dot = document.createElement('div');
          dot.className = 'trail-dot';
          dot.textContent = trailNum;
          cell.appendChild(dot);
        }

        // Robot
        if (this.robotPos.x === x && this.robotPos.y === y) {
          const robotWrapper = document.createElement('div');
          robotWrapper.className = `robot-wrapper state-${this.robotState}`;
          robotWrapper.innerHTML = RobotGraphics.renderSVG(Customizer.equipped, {
            direction: this.robotDir,
            state: this.robotState,
            size: '100%'
          });
          cell.appendChild(robotWrapper);
        }

        this.gridEl.appendChild(cell);
      }
    }

    this.fitBoard();
  }

  // Paints whatever the current hint wants to say about this square: a
  // bouncing arrow for the very next move, fading footsteps along the rest of
  // the way, a target ring on what to head for, and a warning on trouble.
  decorateHintCell(cell, x, y) {
    const hint = this.hint;
    if (!hint) return;

    const at = (sq) => sq && sq.x === x && sq.y === y;

    if (hint.danger && at(hint.danger)) {
      cell.classList.add('hint-danger');
      cell.insertAdjacentHTML('beforeend', '<div class="hint-mark hint-stop">✕</div>');
    }

    if (hint.warnAt && at(hint.warnAt)) {
      cell.classList.add('hint-warn');
    }

    if (hint.goal && at(hint.goal)) {
      cell.classList.add('hint-goal');
    }

    // The robot's current plan, drawn faintly so it reads as "already asked for"
    const planIdx = (hint.plan || []).findIndex(at);
    if (planIdx >= 0) {
      cell.insertAdjacentHTML(
        'beforeend',
        `<div class="hint-mark hint-plan${hint.kind === 'ready' ? ' good' : ''}" style="--i:${planIdx}"></div>`
      );
    }

    // The suggested way onwards. The first square gets a big bouncing arrow,
    // the rest are footsteps flowing towards the goal.
    const routeIdx = (hint.route || []).findIndex(at);
    if (routeIdx >= 0) {
      const step = hint.route[routeIdx];
      if (routeIdx === 0) {
        cell.insertAdjacentHTML(
          'beforeend',
          `<div class="hint-mark hint-next dir-${step.dir.toLowerCase()}">${ICONS.arrow}</div>`
        );
      } else {
        cell.insertAdjacentHTML(
          'beforeend',
          `<div class="hint-mark hint-dot" style="--i:${routeIdx}"></div>`
        );
      }
    }
  }

  // Blender jug, drawn with the recipe colour filling it as ingredients go in.
  // During the celebration it whirs, then becomes the finished smoothie.
  renderBlenderHTML(level) {
    const recipe = level.recipe || { color: "#38BDF8", name: "Smoothie" };
    const total = this.ingredientsOf(level).length;
    const inJug = total - this.remainingIngredients(level).length;
    const ratio = total ? inJug / total : 0;

    if (this.smoothieStage === 'served') {
      // A finished glass, straw and all.
      return `
        <div class="blender-wrapper served" title="${recipe.name}">
          <svg viewBox="0 0 60 60" width="92%" height="92%">
            <line x1="38" y1="6" x2="30" y2="26" stroke="#F472B6" stroke-width="4" stroke-linecap="round" />
            <path d="M16,18 L44,18 L39,52 L21,52 Z" fill="${recipe.color}" stroke="#0F172A" stroke-width="2.5" stroke-linejoin="round" />
            <path d="M16,18 L44,18 L43,24 L17,24 Z" fill="#FFFFFF" opacity="0.45" />
            <circle cx="24" cy="30" r="2.5" fill="#FFFFFF" opacity="0.5" />
            <circle cx="33" cy="38" r="2" fill="#FFFFFF" opacity="0.4" />
          </svg>
        </div>
      `;
    }

    const fillHeight = Math.round(30 * ratio);
    const fillY = 40 - fillHeight;
    const whirring = this.smoothieStage === 'blending' ? ' whirring' : '';

    return `
      <div class="blender-wrapper${whirring}" title="Blender (${inJug}/${total} in)">
        <svg viewBox="0 0 60 60" width="92%" height="92%">
          <rect x="19" y="42" width="22" height="10" rx="3" fill="#475569" />
          <rect x="16" y="50" width="28" height="4" rx="2" fill="#334155" />
          <rect x="18" y="10" width="24" height="32" rx="4" fill="#F8FAFC" opacity="0.85" stroke="#94A3B8" stroke-width="2" />
          ${fillHeight > 0 ? `<rect x="20" y="${fillY}" width="20" height="${fillHeight}" rx="2" fill="${recipe.color}" />` : ''}
          <rect x="15" y="5" width="30" height="7" rx="3" fill="#64748B" />
          <rect x="27" y="2" width="6" height="4" rx="2" fill="#334155" />
        </svg>
      </div>
    `;
  }

  // The recipe card above the board: every ingredient, ticked off as it is
  // picked up, so kids can count what is still missing.
  renderRecipeBar() {
    const bar = document.getElementById('recipe-bar');
    if (!bar) return;

    const lvl = this.getCurrentLevel();
    if (!this.isRecipeLevel(lvl)) {
      bar.hidden = true;
      return;
    }

    const recipe = lvl.recipe || { name: "Smoothie", emoji: "🥤" };
    const chips = this.ingredientsOf(lvl).map(ing => {
      const got = this.collected.has(this.ingredientKey(ing));
      return `<span class="recipe-chip ${got ? 'collected' : ''}" title="${ing.name}">${ing.emoji}</span>`;
    }).join('');

    const left = this.remainingIngredients(lvl).length;
    bar.innerHTML = `
      <span class="recipe-name">${recipe.emoji} ${recipe.name}</span>
      <span class="recipe-items">${chips}</span>
      <span class="recipe-count">${left === 0 ? 'Blend it!' : `${left} to go`}</span>
    `;
    bar.hidden = false;
  }

  // ==========================================
  // GHOST PREVIEW
  // "Where would my robot be?" - answered without running anything. With the
  // ghost on, the board shows a see-through robot standing where the program
  // would leave the real one, and numbers every square along the way, so the
  // player can read off where the robot is at any point in the sequence.
  // ==========================================
  // Everything the board needs to draw the ghost, or null when there is
  // nothing worth drawing. The projection obeys the same rules Run does: it
  // starts from wherever Run would start and stops where the robot would stop.
  ghostPreview() {
    if (!this.ghostOn || this.commands.length === 0) return null;
    // A hint takes the board over while it is on screen. Two sets of markers
    // on the same squares would only muddle each other.
    if (this.hint) return null;

    const lvl = this.getCurrentLevel();
    // Run replays the program from the level start once it has finished (or
    // the robot has won or fallen), so the ghost has to project from there.
    const restarts = this.executionStep >= this.commands.length || this.isFinishedState();
    const done = restarts ? 0 : this.executionStep;
    const from = restarts ? lvl.start : this.robotPos;
    const pending = this.commands.slice(done);
    if (pending.length === 0) return null;

    const plan = this.projectProgram(lvl, from, pending, restarts ? new Set() : this.collected);

    // One entry per square the robot stands on, carrying the step numbers that
    // put it there - a square the program crosses twice keeps both.
    const squares = new Map();
    const visit = (pos, step) => {
      const key = `${pos.x},${pos.y}`;
      const seen = squares.get(key) || { x: pos.x, y: pos.y, steps: [] };
      seen.steps.push(step);
      squares.set(key, seen);
    };
    plan.path.forEach((pos, i) => visit(pos, done + i + 1));

    let end = { ...plan.pos };
    let outcome = 'stop';
    // The step of the program the ghost is standing on the end of: the last
    // one that runs, or the one that goes wrong.
    let dirIndex = pending.length - 1;

    if (plan.reachedGem) {
      outcome = 'win';
      dirIndex = plan.stepIndex;
    } else if (plan.blocked === 'pit') {
      // The robot really does step into the hole before it falls, so that is
      // where the ghost has to stand.
      outcome = 'fall';
      dirIndex = plan.stepIndex;
      end = { ...plan.troubleAt };
      visit(end, done + plan.stepIndex + 1);
    } else if (plan.blocked) {
      outcome = 'bump';
      dirIndex = plan.stepIndex;
    }

    return {
      squares: [...squares.values()],
      end,
      outcome,
      dir: pending[dirIndex] || this.robotDir,
      atStep: done + dirIndex + 1,
      // A rock the plan walks into, so the board can flag it too.
      blockedBy: plan.blocked === 'rock' ? { ...plan.troubleAt } : null
    };
  }

  // Paints the ghost's plan on one square: a numbered footprint for every step
  // that lands here, and the see-through robot where the program runs out.
  decorateGhostCell(cell, x, y, ghost) {
    if (!ghost) return;

    const here = ghost.squares.find(sq => sq.x === x && sq.y === y);
    const isEnd = ghost.end.x === x && ghost.end.y === y;

    if (ghost.blockedBy && ghost.blockedBy.x === x && ghost.blockedBy.y === y) {
      cell.classList.add('ghost-blocked');
    }

    if (here) {
      const badge = document.createElement('div');
      badge.className = `ghost-step${isEnd ? ' at-end' : ''}${here.steps.length > 1 ? ' again' : ''}`;
      badge.style.setProperty('--i', here.steps[0]);
      badge.textContent = here.steps[0];
      badge.title = here.steps.length > 1
        ? `Steps ${here.steps.join(', ')}`
        : `Step ${here.steps[0]}`;
      cell.appendChild(badge);
    }

    if (!isEnd) return;

    cell.classList.add('ghost-here', `ghost-${ghost.outcome}`);

    // How the plan turns out, said with a picture. The wording underneath is
    // for grown-ups reading the tooltip.
    const outcomes = {
      win: { mark: '🎉', text: `Step ${ghost.atStep} finishes the level` },
      bump: { mark: '🚫', text: `Step ${ghost.atStep} cannot move - the robot stays here` },
      fall: { mark: '⚠️', text: `Step ${ghost.atStep} falls in` }
    };
    const outcome = outcomes[ghost.outcome];
    if (outcome) {
      const mark = document.createElement('div');
      mark.className = 'ghost-outcome';
      mark.textContent = outcome.mark;
      mark.title = outcome.text;
      cell.appendChild(mark);
    }

    // The robot itself only goes down when the real one is somewhere else -
    // drawn underneath it, the ghost would just look like a smudge.
    if (this.robotPos.x === x && this.robotPos.y === y) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'robot-wrapper ghost-robot';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = RobotGraphics.renderSVG(Customizer.equipped, {
      direction: ghost.dir,
      state: 'idle',
      size: '100%'
    });
    cell.appendChild(wrapper);
  }

  // The ghost is a picture of the program, so every edit to the program
  // changes it. Repainting the board is cheap enough to just do it.
  refreshGhost() {
    if (this.ghostOn) this.renderGrid();
  }

  toggleGhost() {
    this.ghostOn = !this.ghostOn;
    localStorage.setItem('robostep_ghost', this.ghostOn ? '1' : '0');
    this.paintGhostButton();
    Sound.playClick();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton(this.ghostOn ? "Ghost on" : "Ghost off");
    }
    this.renderGrid();

    if (!this.ghostOn) {
      this.showMessage("👻 Ghost hidden.", "info");
    } else if (this.commands.length === 0) {
      this.showMessage("👻 Ghost on! Add steps and it shows where they take the robot.", "info");
    } else {
      this.showMessage("👻 Ghost on! It stands where your steps end up.", "info");
    }
  }

  paintGhostButton() {
    const btn = document.getElementById('btn-ghost');
    if (!btn) return;
    btn.setAttribute('aria-pressed', this.ghostOn ? 'true' : 'false');
    btn.title = this.ghostOn ? "Hide the ghost preview" : "Show where the steps end up";
    btn.setAttribute('aria-label', `Ghost preview: ${this.ghostOn ? 'on' : 'off'}`);
  }

  // ==========================================
  // COMMAND QUEUE MANAGEMENT
  // ==========================================
  // The robot has finished with this attempt: it won, fell, or is busy with
  // the smoothie celebration. Any of those means a Run starts over.
  isFinishedState() {
    return ["victory", "fall", "blending", "drinking"].includes(this.robotState);
  }

  // A program that has already been run (or part-stepped) no longer lines up
  // with the robot on screen once the list is edited. Rewinding to the start
  // line keeps "step 1" meaning step 1, and keeps the breadcrumb trail honest.
  rewindIfExecuted() {
    if (this.executionStep === 0 && !this.isFinishedState()) return false;
    this.resetRobot();
    return true;
  }

  addCommand(dir) {
    if (this.isRunning) return;
    if (this.commands.length >= 40) {
      this.showMessage("Maximum steps reached for this level!", "warn");
      return;
    }

    this.clearHint();
    this.rewindIfExecuted();
    this.commands.push(dir);
    Sound.playClick();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton(dir.toLowerCase());
    }
    this.renderCommandTape();
    this.refreshGhost();
    this.updateControlsState();
  }

  removeCommandAt(index) {
    if (this.isRunning) return;
    this.clearHint();
    this.commands.splice(index, 1);
    this.rewindIfExecuted();
    Sound.playDelete();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton("Remove");
    }
    this.renderCommandTape();
    this.refreshGhost();
    this.updateControlsState();
  }

  removeLastCommand() {
    if (this.isRunning || this.commands.length === 0) return;
    this.clearHint();
    this.commands.pop();
    this.rewindIfExecuted();
    Sound.playDelete();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton("Undo");
    }
    this.renderCommandTape();
    this.refreshGhost();
    this.updateControlsState();
  }

  clearCommands() {
    if (this.isRunning || this.commands.length === 0) return;
    this.clearHint();
    this.commands = [];
    Sound.playDelete();
    if (typeof Voice !== 'undefined') {
      Voice.cancel();
      Voice.speakButton("Clear");
    }
    this.resetRobot();
    this.showMessage("Sequence cleared!", "info");
    this.renderCommandTape();
    this.updateControlsState();
  }

  renderCommandTape() {
    this.commandTapeEl.innerHTML = "";
    this.stepCountEl.textContent = this.commands.length;

    const dirClass = { UP: 'dir-up', DOWN: 'dir-down', LEFT: 'dir-left', RIGHT: 'dir-right' };

    if (this.commands.length === 0) {
      this.commandTapeEl.innerHTML = `
        <div class="empty-tape-placeholder">
          <span>Tap arrows below to give your robot instructions!</span>
        </div>
      `;
      return;
    }

    this.commands.forEach((cmd, idx) => {
      const card = document.createElement('div');
      card.className = 'command-card';
      card.dataset.index = idx;
      if (this.isRunning && this.executionStep === idx) {
        card.classList.add('active-executing');
      }

      card.classList.add(dirClass[cmd]);
      if (this.hint && this.hint.badCard === idx) card.classList.add('hint-bad');
      card.setAttribute('aria-label', `Step ${idx + 1}: ${cmd.toLowerCase()}`);
      card.innerHTML = `
        <span class="card-step-num">${idx + 1}</span>
        <span class="card-arrow">${ICONS.arrow}</span>
        <button class="card-del-btn" title="Remove this step" aria-label="Remove step ${idx + 1}" onclick="window.game.removeCommandAt(${idx})">×</button>
      `;

      this.commandTapeEl.appendChild(card);
    });

    // Auto-scroll tape to keep active or latest step visible
    if (this.isRunning) {
      const activeCard = this.commandTapeEl.children[this.executionStep];
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    } else {
      this.commandTapeEl.scrollLeft = this.commandTapeEl.scrollWidth;
    }
  }

  updateControlsState() {
    const runBtn = document.getElementById('btn-run');
    const stepBtn = document.getElementById('btn-step');
    const resetBtn = document.getElementById('btn-reset');
    const clearBtn = document.getElementById('btn-clear');
    const undoBtn = document.getElementById('btn-undo');

    const hasCommands = this.commands.length > 0;

    runBtn.disabled = !hasCommands || this.isRunning;
    stepBtn.disabled = !hasCommands || this.isRunning;
    clearBtn.disabled = !hasCommands || this.isRunning;
    undoBtn.disabled = !hasCommands || this.isRunning;
    resetBtn.disabled = this.isRunning;
  }

  // ==========================================
  // EXECUTION & COLLISION LOGIC
  // ==========================================
  runAll() {
    if (this.isRunning || this.commands.length === 0) return;
    this.clearHint();
    Sound.init();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton("Run!");
    }
    
    // If starting from clean state, reset robot position to level start
    if (this.executionStep >= this.commands.length || this.isFinishedState()) {
      this.resetRobot();
    }

    this.isRunning = true;
    this.updateControlsState();
    this.statusMsgEl.textContent = "Robot is running instructions...";
    this.statusMsgEl.className = "status-message running";

    this.executeLoop();
  }

  executeLoop() {
    if (!this.isRunning) return;

    if (this.executionStep >= this.commands.length) {
      this.stopRunning();
      const lvl = this.getCurrentLevel();
      if (this.hasWon()) {
        this.handleVictory();
      } else {
        this.showMessage(this.unfinishedMessage(lvl), "info");
      }
      return;
    }

    const stepSuccess = this.executeSingleStep();
    if (!stepSuccess) {
      this.stopRunning();
      return;
    }

    // Check if the robot has just finished the job
    const lvl = this.getCurrentLevel();
    if (this.hasWon()) {
      this.stopRunning();
      this.handleVictory();
      return;
    }
    // Rolling over the blender early is allowed - it just doesn't blend.
    if (this.isOnGoal(lvl) && this.isRecipeLevel(lvl)) {
      const left = this.remainingIngredients(lvl).length;
      this.showMessage(`The blender needs ${left} more ingredient${left === 1 ? '' : 's'} first!`, "warn");
    }

    this.runTimer = setTimeout(() => {
      this.executeLoop();
    }, this.speed);
  }

  stepOnce() {
    if (this.isRunning || this.commands.length === 0) return;
    this.clearHint();
    Sound.init();
    if (typeof Voice !== 'undefined' && this.executionStep === 0) {
      Voice.speakButton("Step");
    }

    if (this.executionStep >= this.commands.length || this.isFinishedState()) {
      this.resetRobot();
    }

    this.executeSingleStep();

    if (this.hasWon()) {
      this.handleVictory();
    }
  }

  // What to say when the program runs out without finishing the job.
  unfinishedMessage(level) {
    if (this.isRecipeLevel(level)) {
      const left = this.remainingIngredients(level).length;
      if (left > 0) {
        return `Instructions finished! Still ${left} ingredient${left === 1 ? '' : 's'} to collect. Try adding more steps!`;
      }
      return "Everything is collected! Now add steps to reach the blender.";
    }
    return "Instructions finished! But the robot didn't reach the gem yet. Try adding more steps!";
  }

  executeSingleStep() {
    if (this.executionStep >= this.commands.length) return false;

    const cmd = this.commands[this.executionStep];
    const lvl = this.getCurrentLevel();
    this.robotDir = cmd;

    const move = previewMove(lvl, this.robotPos, cmd);

    // Check wall collision (out of bounds)
    if (move.blocked === 'edge') {
      this.robotState = "bump";
      Sound.playBump();
      if (typeof Voice !== 'undefined') {
        Voice.speakRandom(["Bonk! That's the edge!", "Bump! Cannot go through the wall!"]);
      }
      this.renderGrid();
      this.showMessage("Bonk! The robot bumped into the edge of the world!", "warn");
      return false;
    }

    // Check blocker collision (rocks)
    if (move.blocked === 'rock') {
      this.robotState = "bump";
      Sound.playBump();
      if (typeof Voice !== 'undefined') {
        Voice.speakRandom(["Bonk! That's a solid boulder!", "Oops! Rock blocker!"]);
      }
      this.renderGrid();
      this.showMessage("Oops! That's a solid boulder. You have to steer around it!", "warn");
      return false;
    }

    // Check pit hazard (fall into hole)
    if (move.blocked === 'pit') {
      // Step into the hole and fall
      this.trail.push({ ...this.robotPos });
      this.robotPos = { ...move.pos };
      this.robotState = "fall";
      Sound.playFall();
      if (typeof Voice !== 'undefined') {
        Voice.speakRandom(["Whoa! Watch out for the pit!", "Uh oh! Fell into the hole!"]);
      }
      this.renderGrid();
      this.showMessage("Whoa! The robot fell into the pit! Hit Reset ↺ and try again.", "danger");
      return false;
    }

    // Valid move!
    this.trail.push({ ...this.robotPos });
    this.robotPos = { ...move.pos };
    this.robotState = "walking";
    this.collectIngredientHere();

    // Play musical step tone pitched according to step index (1, 2, 3...)
    Sound.playStep(this.executionStep + 1);

    // Speak step aloud for counting and directional logic
    if (typeof Voice !== 'undefined') {
      Voice.speakStep(this.executionStep + 1, cmd);
    }

    this.executionStep++;
    this.renderGrid();
    this.renderCommandTape();

    return true;
  }

  // Rolling onto an ingredient picks it up and pours it into the blender.
  collectIngredientHere() {
    const lvl = this.getCurrentLevel();
    const here = this.ingredientsOf(lvl).find(i =>
      i.x === this.robotPos.x && i.y === this.robotPos.y && !this.collected.has(this.ingredientKey(i))
    );
    if (!here) return;

    this.collected.add(this.ingredientKey(here));
    Sound.playPickup(this.ingredientsOf(lvl).length - this.remainingIngredients(lvl).length);
    this.renderRecipeBar();

    const left = this.remainingIngredients(lvl).length;
    if (typeof Voice !== 'undefined') {
      Voice.speakEvent(left === 0 ? `${here.name}! Recipe complete!` : `${here.name}!`);
    }
    this.showMessage(
      left === 0
        ? `${here.emoji} ${here.name}! Recipe complete - take it to the blender!`
        : `${here.emoji} ${here.name}! ${left} more to collect.`,
      "info"
    );
  }

  stopRunning() {
    this.isRunning = false;
    if (this.runTimer) {
      clearTimeout(this.runTimer);
      this.runTimer = null;
    }
    this.updateControlsState();
  }

  resetRobot() {
    this.clearHint(true);
    this.stopRunning();
    if (typeof Voice !== 'undefined') {
      Voice.cancel();
    }
    const lvl = this.getCurrentLevel();
    this.robotPos = { ...lvl.start };
    this.robotDir = "DOWN";
    this.robotState = "idle";
    this.executionStep = 0;
    this.trail = [];
    this.collected = new Set();
    this.smoothieStage = null;
    this.statusMsgEl.textContent = "";
    this.statusMsgEl.className = "status-message";
    this.renderRecipeBar();
    this.renderGrid();
    this.renderCommandTape();
    this.updateControlsState();
  }

  showMessage(msg, type = "info") {
    this.statusMsgEl.textContent = msg;
    this.statusMsgEl.className = `status-message ${type}`;
  }

  // ==========================================
  // VICTORY & LEVEL PROGRESSION
  // ==========================================
  handleVictory() {
    const lvl = this.getCurrentLevel();

    if (this.isRecipeLevel(lvl)) {
      // Smoothie levels get their own little show before the modal.
      this.playSmoothieCelebration(lvl);
    } else {
      this.robotState = "victory";
      this.renderGrid();
      Sound.playGem();
      setTimeout(() => Sound.playWin(), 200);
      triggerConfetti();
    }

    const stepCount = this.commands.length;
    let stars = 1;
    if (stepCount <= lvl.par) {
      stars = 3;
    } else if (stepCount <= lvl.par + 2) {
      stars = 2;
    }

    // Save stars
    const prevStars = this.starsData[lvl.id] || 0;
    if (stars > prevStars) {
      this.starsData[lvl.id] = stars;
      localStorage.setItem(this.progressKey('stars'), JSON.stringify(this.starsData));
    }

    // Unlock next level
    const nextLevelNum = lvl.id + 1;
    if (nextLevelNum <= this.getLevelSet().length && nextLevelNum > this.maxUnlockedLevel) {
      this.maxUnlockedLevel = nextLevelNum;
      localStorage.setItem(this.progressKey('max_level'), this.maxUnlockedLevel.toString());
    }

    // Robot parts are earned in the classic quest, every 5 levels.
    const reward = (this.mode === 'classic' && lvl.id % 5 === 0)
      ? Customizer.getMilestoneReward(lvl.id)
      : null;

    if (typeof Voice !== 'undefined' && !this.isRecipeLevel(lvl)) {
      if (stars === 3) {
        Voice.speakRandom(["Super star coder! Three stars!", "You did it! Perfect path!", "Hooray! Three stars!"]);
      } else {
        Voice.speakRandom(["Awesome job! You got the gem!", "Hooray! Level completed!", "Great job!"]);
      }
    }

    // The smoothie show needs a moment before the modal covers the board.
    const modalDelay = this.isRecipeLevel(lvl) ? 2600 : 600;

    setTimeout(() => {
      if (reward) {
        this.showMilestoneModal(reward, lvl.id, stars, stepCount);
      } else {
        this.showWinModal(stars, stepCount, lvl.par, nextLevelNum);
      }
    }, modalDelay);
  }

  // Blend it, pour it, drink it. The whole point of Smoothie Remix.
  playSmoothieCelebration(level) {
    const recipe = level.recipe || { name: "Smoothie", emoji: "🥤" };

    // 1. The blender whirs with the robot standing right there.
    this.smoothieStage = 'blending';
    this.robotState = "blending";
    this.renderGrid();
    Sound.playBlend();
    this.showMessage(`Blending your ${recipe.name}...`, "running");
    if (typeof Voice !== 'undefined') {
      Voice.speakEvent(`Blending your ${recipe.name}!`);
    }

    // 2. The smoothie is served and the robot takes a big slurp.
    setTimeout(() => {
      this.smoothieStage = 'served';
      this.robotState = "drinking";
      this.renderGrid();
      Sound.playSlurp();
      this.showMessage(`Slurp! ${recipe.emoji} So yummy!`, "info");
      if (typeof Voice !== 'undefined') {
        Voice.speakRandom([
          "Slurp! So yummy!",
          "Mmm! So yummy!",
          "Glug glug! Yummy smoothie!"
        ]);
      }
    }, 1100);

    // 3. Party.
    setTimeout(() => {
      triggerConfetti();
      Sound.playWin();
    }, 1900);
  }

  showWinModal(stars, stepCount, par, nextLevelNum) {
    const modal = document.getElementById('win-modal');
    const starsContainer = document.getElementById('win-stars');
    const titleEl = document.getElementById('win-title');
    const statsEl = document.getElementById('win-stats');
    const nextBtn = document.getElementById('win-btn-next');

    starsContainer.innerHTML = `
      <span class="star ${stars >= 1 ? 'earned' : ''}">⭐</span>
      <span class="star ${stars >= 2 ? 'earned' : ''}">⭐</span>
      <span class="star ${stars >= 3 ? 'earned' : ''}">⭐</span>
    `;

    const lvl = this.getCurrentLevel();
    const recipeLevel = this.isRecipeLevel(lvl);
    const recipe = lvl.recipe || { name: "Smoothie", emoji: "🥤" };

    if (recipeLevel) {
      titleEl.textContent = `So yummy! ${recipe.emoji}`;
      statsEl.innerHTML =
        `The robot drank the whole <strong>${recipe.name}</strong>!<br>` +
        `Made in <strong>${stepCount}</strong> steps (target par: ${par})`;
    } else {
      titleEl.textContent = stars === 3 ? "Super Star Coder! 🌟" : "Awesome Job! 💎";
      statsEl.innerHTML = `You solved it in <strong>${stepCount}</strong> steps! (Target par: ${par})`;
    }

    if (nextLevelNum <= this.getLevelSet().length) {
      nextBtn.style.display = "inline-flex";
      nextBtn.textContent = recipeLevel ? `Next Recipe (${nextLevelNum}) ➔` : `Next Level (${nextLevelNum}) ➔`;
      nextBtn.onclick = () => {
        this.closeModal('win-modal');
        this.loadLevel(nextLevelNum - 1);
      };
    } else {
      nextBtn.style.display = "none";
      statsEl.innerHTML += recipeLevel
        ? "<br><strong>🥤 You blended every smoothie on the menu! Master Blender!</strong>"
        : "<br><strong>🎉 You have completed all 50 levels! You are a master robot programmer!</strong>";
    }

    modal.classList.add('open');
  }

  showMilestoneModal(reward, completedLevel, stars, stepCount) {
    Sound.playUnlock();
    if (typeof Voice !== 'undefined') {
      Voice.speakEvent(`${reward.title}! ${reward.description}`);
    }
    const modal = document.getElementById('milestone-modal');
    const titleEl = document.getElementById('milestone-title');
    const descEl = document.getElementById('milestone-desc');
    const previewEl = document.getElementById('milestone-preview');
    const equipBtn = document.getElementById('milestone-equip-btn');
    const continueBtn = document.getElementById('milestone-continue-btn');

    titleEl.textContent = reward.title;
    descEl.textContent = reward.description;

    // Apply all unlocked items in this reward to the preview
    const previewConfig = { ...Customizer.equipped };
    reward.items.forEach(item => {
      if (item.category === "colors") previewConfig.color = item.id;
      else if (item.category === "headgear") previewConfig.headgear = item.id;
      else if (item.category === "eyes") previewConfig.eyes = item.id;
      else if (item.category === "mobility") previewConfig.mobility = item.id;
    });

    previewEl.innerHTML = RobotGraphics.renderSVG(previewConfig, {
      direction: "DOWN",
      state: "victory",
      size: 130
    });

    equipBtn.onclick = () => {
      reward.items.forEach(item => {
        Customizer.equip(item.category, item.id);
      });
      this.closeModal('milestone-modal');
      this.showWinModal(stars, stepCount, this.getCurrentLevel().par, completedLevel + 1);
    };

    continueBtn.onclick = () => {
      this.closeModal('milestone-modal');
      this.showWinModal(stars, stepCount, this.getCurrentLevel().par, completedLevel + 1);
    };

    modal.classList.add('open');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
  }

  // ==========================================
  // HINT SYSTEM
  // ==========================================
  // Walks the instructions that have not run yet, without touching game state,
  // to find the square the robot will actually be standing on when the current
  // program finishes (or where it goes wrong).
  projectProgram(level, from, commands, collected = this.collected) {
    let pos = { ...from };
    // Ingredients the robot would be carrying by then, so the projection knows
    // whether arriving at the blender actually finishes the level.
    const basket = new Set(collected);
    const goal = this.goalSquare(level);
    // Every square the robot would stand on, so a hint can draw the plan.
    const path = [];

    for (let i = 0; i < commands.length; i++) {
      const move = previewMove(level, pos, commands[i]);
      // Report the square in front of the mistake: that is where advice helps.
      if (move.blocked) {
        return {
          pos,
          blocked: move.blocked,
          stepIndex: i,
          collected: basket,
          path,
          // Where the trouble sits, when it is a square on the board at all.
          troubleAt: move.blocked === 'edge' ? null : move.pos
        };
      }

      pos = move.pos;
      path.push({ ...pos });

      const picked = this.ingredientsOf(level)
        .find(ing => ing.x === pos.x && ing.y === pos.y);
      if (picked) basket.add(this.ingredientKey(picked));

      // The run stops the moment the job is done, so later steps never run.
      if (pos.x === goal.x && pos.y === goal.y && this.recipeComplete(level, basket)) {
        return { pos, reachedGem: true, stepIndex: i, collected: basket, path };
      }
    }

    return { pos, blocked: null, collected: basket, path };
  }

  // What the robot should head for next: the closest ingredient still on the
  // board, or the blender once the recipe is complete.
  nextTarget(level, from, collected) {
    const remaining = this.remainingIngredients(level, collected);
    if (!remaining.length) {
      return { square: this.goalSquare(level), ingredient: null };
    }

    let best = null;
    for (const ing of remaining) {
      const path = this.solveBFS(level, from, ing);
      if (!path.length && !(from.x === ing.x && from.y === ing.y)) continue;
      if (!best || path.length < best.path.length) best = { ingredient: ing, path };
    }

    if (!best) return { square: this.goalSquare(level), ingredient: null };
    return { square: best.ingredient, ingredient: best.ingredient };
  }

  // ==========================================
  // VISUAL HINTS
  // The player may not be able to read a word of this, so every hint is drawn
  // on the board: where to go, which button to press, and what to watch out
  // for. The written message and the spoken line are extras for grown-ups.
  // ==========================================
  // `silent` is for callers that are about to redraw everything themselves.
  clearHint(silent = false) {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    if (!this.hint) return;
    this.hint = null;
    document.querySelectorAll('.press-me').forEach(el => el.classList.remove('press-me'));
    if (silent) return;
    this.renderGrid();
    this.renderCommandTape();
  }

  // Draws the hint and pulses the button to press. It clears itself after a
  // while so the board does not stay covered in markers.
  showHintVisual(hint, buttonId) {
    this.hint = hint;
    this.renderGrid();
    this.renderCommandTape();

    document.querySelectorAll('.press-me').forEach(el => el.classList.remove('press-me'));
    const btn = buttonId ? document.getElementById(buttonId) : null;
    if (btn) btn.classList.add('press-me');

    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.clearHint(), 9000);
  }

  showHint() {
    const lvl = this.getCurrentLevel();
    Sound.playHint();

    const say = (text) => {
      if (typeof Voice !== 'undefined') Voice.speakEvent(text);
    };
    const arrows = { UP: "⬆️ Up", DOWN: "⬇️ Down", LEFT: "⬅️ Left", RIGHT: "➡️ Right" };
    const dirButton = { UP: 'btn-up', DOWN: 'btn-down', LEFT: 'btn-left', RIGHT: 'btn-right' };
    const plural = (n) => (n === 1 ? "step" : "steps");

    // Robot in a hole: point at Reset, and mark where it fell.
    if (this.robotState === "fall") {
      this.showHintVisual(
        { kind: 'stuck', route: [], danger: { ...this.robotPos } },
        'btn-reset'
      );
      this.showMessage("The robot is down the pit! Press Reset ↺ to lift it out.", "warn");
      say("Press reset to lift the robot out of the pit!");
      return;
    }

    if (this.hasWon()) {
      this.clearHint();
      this.showMessage("All done here! 🎉", "info");
      say("All done here!");
      return;
    }

    // A hint is only useful if it talks about where the robot ends up: look
    // past the instructions still queued on the tape before giving advice.
    const pending = this.commands.slice(this.executionStep);
    const plan = this.projectProgram(lvl, this.robotPos, pending);

    // The plan already works: trace it in green and pulse Run.
    if (plan.reachedGem) {
      const stepNumber = this.executionStep + plan.stepIndex + 1;
      const prize = this.isRecipeLevel(lvl) ? "blends the smoothie" : "reaches the gem";
      this.showHintVisual(
        { kind: 'ready', plan: plan.path, route: [], goal: { ...plan.pos } },
        'btn-run'
      );
      this.showMessage(`Your plan ${prize} on step ${stepNumber}! Press ▶ Run.`, "info");
      say(`Your plan ${prize}! Press run!`);
      return;
    }

    // Best route onwards from the square the current plan leaves the robot on,
    // heading for the next ingredient before the blender.
    const target = this.nextTarget(lvl, plan.pos, plan.collected);
    const route = this.solveBFS(lvl, plan.pos, target.square);
    const routeSquares = this.squaresAlong(plan.pos, route);

    // The plan goes wrong: show how far it gets, flag the bad step and the
    // hazard, and point at a direction that works instead.
    if (plan.blocked) {
      const stepNumber = this.executionStep + plan.stepIndex + 1;
      const trouble = {
        edge: "walks off the edge",
        rock: "bumps into a rock",
        pit: "falls into the pit"
      }[plan.blocked];

      this.showHintVisual({
        kind: 'danger',
        plan: plan.path,
        route: routeSquares,
        danger: plan.troubleAt,
        warnAt: { ...plan.pos },
        badCard: this.executionStep + plan.stepIndex,
        goal: route.length ? { ...target.square } : null
      }, route.length ? dirButton[route[0]] : null);

      const fix = route.length ? ` Try ${arrows[route[0]]} instead.` : "";
      this.showMessage(`Careful! Step ${stepNumber} ${trouble}.${fix}`, "warn");
      say(`Careful! Step ${stepNumber} ${trouble}.` +
        (route.length ? ` Try ${route[0].toLowerCase()} instead.` : ""));
      return;
    }

    if (!route.length) {
      this.showHintVisual({ kind: 'stuck', route: [], danger: null }, 'btn-reset');
      this.showMessage("Hmm, there's no way through from there. Press Reset ↺ to start over!", "warn");
      say("There is no way through from there. Press reset to start over!");
      return;
    }

    // The ordinary hint: draw the way to the next thing worth reaching.
    const nextDir = route[0];
    this.showHintVisual({
      kind: 'route',
      plan: plan.path,
      route: routeSquares,
      goal: { ...target.square }
    }, dirButton[nextDir]);

    const goalName = target.ingredient
      ? `${target.ingredient.emoji} ${target.ingredient.name}`
      : (this.isRecipeLevel(lvl) ? "the blender" : "the gem");
    const togo = `${route.length} ${plural(route.length)} to ${goalName}.`;

    if (pending.length === 0) {
      const atStart = this.robotPos.x === lvl.start.x && this.robotPos.y === lvl.start.y;
      const lead = atStart ? "Start by going" : "From here, go";
      this.showMessage(`Hint: ${lead} ${arrows[nextDir]}! ${togo}`, "info");
      say(`Hint: ${lead} ${nextDir.toLowerCase()}!`);
      return;
    }

    this.showMessage(
      `Good so far! After your ${pending.length} ${plural(pending.length)}, add ${arrows[nextDir]} next. ${togo}`,
      "info"
    );
    say(`Good so far! Add ${nextDir.toLowerCase()} next.`);
  }

  // Turns a list of directions into the squares they pass through, each
  // remembering which way the robot was heading when it got there.
  squaresAlong(from, directions) {
    let pos = { ...from };
    return directions.map(dir => {
      const delta = STEP_DELTAS[dir];
      pos = { x: pos.x + delta.dx, y: pos.y + delta.dy };
      return { ...pos, dir };
    });
  }

  // Shortest route to the gem from any square (defaults to the level start),
  // so hints can be given from wherever the robot has walked to.
  solveBFS(level, from = level.start, target = this.goalSquare(level)) {
    const key = (x, y) => `${x},${y}`;
    const blockerSet = new Set(level.blockers.map(b => key(b.x, b.y)));
    const pitSet = new Set(level.pits.map(p => key(p.x, p.y)));

    const queue = [{ x: from.x, y: from.y, path: [] }];
    const visited = new Set([key(from.x, from.y)]);

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.x === target.x && cur.y === target.y) {
        return cur.path;
      }

      for (const name of Object.keys(STEP_DELTAS)) {
        const dir = STEP_DELTAS[name];
        const nx = cur.x + dir.dx;
        const ny = cur.y + dir.dy;
        const nKey = key(nx, ny);

        if (nx < 0 || nx >= level.width || ny < 0 || ny >= level.height) continue;
        if (blockerSet.has(nKey) || pitSet.has(nKey) || visited.has(nKey)) continue;

        visited.add(nKey);
        queue.push({ x: nx, y: ny, path: [...cur.path, name] });
      }
    }
    return [];
  }

  // ==========================================
  // WARDROBE & CUSTOMIZATION UI
  // ==========================================
  openWardrobe() {
    Sound.playClick();
    const modal = document.getElementById('wardrobe-modal');
    this.renderWardrobeUI();
    modal.classList.add('open');
  }

  renderWardrobeUI() {
    const previewEl = document.getElementById('wardrobe-robot-preview');
    previewEl.innerHTML = RobotGraphics.renderSVG(Customizer.equipped, {
      direction: "DOWN",
      state: "idle",
      size: 150
    });

    const categories = ["colors", "headgear", "eyes", "mobility"];
    const tabHeadersEl = document.getElementById('wardrobe-tabs');
    const itemsGridEl = document.getElementById('wardrobe-items-grid');

    tabHeadersEl.innerHTML = "";
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${Customizer.currentTab === cat ? 'active' : ''}`;
      const labels = {
        colors: "🎨 Colors",
        headgear: "🎩 Hats",
        eyes: "👀 Eyes",
        mobility: "🛞 Wheels"
      };
      btn.textContent = labels[cat];
      btn.onclick = () => {
        Customizer.currentTab = cat;
        this.renderWardrobeUI();
      };
      tabHeadersEl.appendChild(btn);
    });

    // Render items for current tab
    itemsGridEl.innerHTML = "";
    const items = CUSTOM_ITEMS[Customizer.currentTab] || [];
    
    // Key mapping for equipped check
    const catMap = {
      colors: "color",
      headgear: "headgear",
      eyes: "eyes",
      mobility: "mobility"
    };
    const equippedKey = catMap[Customizer.currentTab];

    items.forEach(item => {
      const card = document.createElement('div');
      const isUnlocked = Customizer.isUnlocked(Customizer.currentTab, item.id, this.maxUnlockedLevel);
      const isEquipped = Customizer.equipped[equippedKey] === item.id;

      card.className = `wardrobe-item-card ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}`;

      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-status">
          ${isEquipped ? '✓ In Use' : (isUnlocked ? 'Equip' : `🔒 Level ${item.unlockLevel}`)}
        </div>
      `;

      if (isUnlocked) {
        card.onclick = () => {
          Customizer.equip(Customizer.currentTab, item.id);
          Sound.playClick();
          this.renderWardrobeUI();
          this.renderGrid(); // update in-game board robot live!
        };
      }

      itemsGridEl.appendChild(card);
    });
  }

  // ==========================================
  // LEVEL SELECTOR UI
  // ==========================================
  openLevelSelector() {
    Sound.playClick();
    const modal = document.getElementById('level-select-modal');
    const gridEl = document.getElementById('level-select-grid');
    this.renderModeTabs();
    gridEl.innerHTML = "";

    const titleEl = document.getElementById('level-select-title');
    const subtitleEl = document.getElementById('level-select-subtitle');
    const levels = this.getLevelSet();
    if (titleEl) {
      titleEl.textContent = this.mode === 'smoothie'
        ? `Pick a Recipe (1 to ${levels.length})`
        : `Select a Level (1 to ${levels.length})`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = this.mode === 'smoothie'
        ? "Collect every ingredient, then take it to the blender!"
        : "New customizations unlock every 5 levels!";
    }

    levels.forEach(lvl => {
      const card = document.createElement('div');
      const isUnlocked = lvl.id <= this.maxUnlockedLevel;
      const isCurrent = lvl.id === (this.currentLevelIdx + 1);
      const stars = this.starsData[lvl.id] || 0;

      card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`;

      let starHTML = "";
      if (isUnlocked) {
        starHTML = `
          <div class="level-card-stars">
            <span>${stars >= 1 ? '⭐' : '☆'}</span>
            <span>${stars >= 2 ? '⭐' : '☆'}</span>
            <span>${stars >= 3 ? '⭐' : '☆'}</span>
          </div>
        `;
      } else {
        starHTML = `<div class="level-card-lock">🔒</div>`;
      }

      const meta = this.isRecipeLevel(lvl)
        ? `${this.ingredientsOf(lvl).map(i => i.emoji).join('')}`
        : `${lvl.width}x${lvl.height}`;

      card.innerHTML = `
        <div class="level-card-num">${lvl.id}</div>
        <div class="level-card-title">${lvl.title}</div>
        <div class="level-card-meta">${meta}</div>
        ${starHTML}
      `;

      if (isUnlocked) {
        card.onclick = () => {
          this.closeModal('level-select-modal');
          this.loadLevel(lvl.id - 1);
        };
      }

      gridEl.appendChild(card);
    });

    modal.classList.add('open');
  }

  // Two ways to play, chosen from the level screen. Each keeps its own stars.
  renderModeTabs() {
    const tabsEl = document.getElementById('mode-tabs');
    if (!tabsEl) return;

    const modes = [
      { id: 'classic', label: '🤖 Classic Quest', levels: LEVELS.length },
      { id: 'smoothie', label: '🥤 Smoothie Remix', levels: SMOOTHIE_LEVELS.length }
    ];

    tabsEl.innerHTML = "";
    modes.forEach(m => {
      const btn = document.createElement('button');
      btn.className = `mode-tab ${this.mode === m.id ? 'active' : ''}`;
      btn.innerHTML = `<span>${m.label}</span><span class="mode-tab-count">${m.levels} levels</span>`;
      btn.onclick = () => {
        if (this.mode === m.id) return;
        Sound.playClick();
        this.setMode(m.id);
        this.openLevelSelector();
      };
      tabsEl.appendChild(btn);
    });
  }

  // ==========================================
  // VOICE STUDIO UI & SETTINGS
  // ==========================================
  openVoiceSettings() {
    Sound.playClick();
    const modal = document.getElementById('voice-modal');
    this.syncVoiceSettingsUI();
    modal.classList.add('open');
  }

  syncVoiceSettingsUI() {
    if (typeof Voice === 'undefined') return;

    const voiceSelect = document.getElementById('voice-select');
    const pitchSlider = document.getElementById('voice-pitch');
    const pitchVal = document.getElementById('voice-pitch-val');
    const rateSlider = document.getElementById('voice-rate');
    const rateVal = document.getElementById('voice-rate-val');
    const volumeSlider = document.getElementById('voice-volume');
    const volumeVal = document.getElementById('voice-volume-val');
    const modeSelect = document.getElementById('voice-mode');

    const chkButtons = document.getElementById('voice-chk-buttons');
    const chkSteps = document.getElementById('voice-chk-steps');
    const chkEvents = document.getElementById('voice-chk-events');
    const chkTitles = document.getElementById('voice-chk-titles');

    // Populate voice dropdown
    voiceSelect.innerHTML = "";
    if (!Voice.voices || Voice.voices.length === 0) {
      Voice.loadVoices();
    }
    
    Voice.voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.voiceURI === Voice.settings.voiceURI) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });

    // Update slider values & display badges
    pitchSlider.value = Voice.settings.pitch;
    pitchVal.textContent = `${Number(Voice.settings.pitch).toFixed(2)} ${Voice.settings.pitch >= 1.3 ? '(Cute)' : '(Normal)'}`;

    rateSlider.value = Voice.settings.rate;
    rateVal.textContent = `${Number(Voice.settings.rate).toFixed(2)}x`;

    volumeSlider.value = Voice.settings.volume;
    volumeVal.textContent = `${Math.round(Voice.settings.volume * 100)}%`;

    modeSelect.value = Voice.settings.mode;

    chkButtons.checked = Voice.settings.speakButtons;
    chkSteps.checked = Voice.settings.speakSteps;
    chkEvents.checked = Voice.settings.speakEvents;
    chkTitles.checked = Voice.settings.speakTips || false;
  }

  // ==========================================
  // EVENT LISTENERS & SHORTCUTS
  // ==========================================
  initEvents() {
    // Arrow buttons
    document.getElementById('btn-up').onclick = () => this.addCommand('UP');
    document.getElementById('btn-down').onclick = () => this.addCommand('DOWN');
    document.getElementById('btn-left').onclick = () => this.addCommand('LEFT');
    document.getElementById('btn-right').onclick = () => this.addCommand('RIGHT');

    // Execution buttons
    document.getElementById('btn-run').onclick = () => this.runAll();
    document.getElementById('btn-step').onclick = () => this.stepOnce();
    document.getElementById('btn-reset').onclick = () => this.resetRobot();
    document.getElementById('btn-clear').onclick = () => this.clearCommands();
    document.getElementById('btn-undo').onclick = () => this.removeLastCommand();
    document.getElementById('btn-hint').onclick = () => this.showHint();

    // Ghost preview toggle
    const ghostBtn = document.getElementById('btn-ghost');
    if (ghostBtn) ghostBtn.onclick = () => this.toggleGhost();
    this.paintGhostButton();

    // Speed toggle
    const speedBtn = document.getElementById('btn-speed');
    const speeds = [
      { ms: 420, emoji: "🐇", label: "Normal" },
      { ms: 220, emoji: "⚡", label: "Fast" },
      { ms: 700, emoji: "🐢", label: "Slow" }
    ];
    let curSpeedIdx = 0;
    speedBtn.onclick = () => {
      curSpeedIdx = (curSpeedIdx + 1) % speeds.length;
      const next = speeds[curSpeedIdx];
      this.speed = next.ms;
      speedBtn.textContent = next.emoji;
      speedBtn.title = `Robot speed: ${next.label}`;
      speedBtn.setAttribute('aria-label', `Robot speed: ${next.label}`);
      Sound.playClick();
    };

    // Sound toggle
    const soundBtn = document.getElementById('btn-sound');
    const paintSoundBtn = (muted) => setButtonLabel(
      soundBtn,
      muted ? "🔇" : "🔊",
      muted ? "Muted" : "Sound",
      muted ? "Sound off" : "Sound on"
    );
    paintSoundBtn(Sound.isMuted());
    soundBtn.onclick = () => {
      const muted = Sound.toggleMute();
      paintSoundBtn(muted);
      if (!muted) Sound.playClick();
    };

    // Modal Triggers
    document.getElementById('btn-wardrobe').onclick = () => this.openWardrobe();
    document.getElementById('btn-levels').onclick = () => this.openLevelSelector();

    const voiceBtn = document.getElementById('btn-voice');
    if (voiceBtn) {
      voiceBtn.onclick = () => this.openVoiceSettings();
    }

    // Voice Studio Controls
    const pitchSlider = document.getElementById('voice-pitch');
    const pitchVal = document.getElementById('voice-pitch-val');
    if (pitchSlider) {
      pitchSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        Voice.settings.pitch = val;
        pitchVal.textContent = `${val.toFixed(2)} ${val >= 1.3 ? '(Cute)' : '(Normal)'}`;
        Voice.saveSettings();
      };
    }

    const rateSlider = document.getElementById('voice-rate');
    const rateVal = document.getElementById('voice-rate-val');
    if (rateSlider) {
      rateSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        Voice.settings.rate = val;
        rateVal.textContent = `${val.toFixed(2)}x`;
        Voice.saveSettings();
      };
    }

    const volumeSlider = document.getElementById('voice-volume');
    const volumeVal = document.getElementById('voice-volume-val');
    if (volumeSlider) {
      volumeSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        Voice.settings.volume = val;
        volumeVal.textContent = `${Math.round(val * 100)}%`;
        Voice.saveSettings();
      };
    }

    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect) {
      voiceSelect.onchange = (e) => {
        Voice.settings.voiceURI = e.target.value;
        Voice.saveSettings();
        Voice.speak("Voice selected!", { interrupt: true });
      };
    }

    const modeSelect = document.getElementById('voice-mode');
    if (modeSelect) {
      modeSelect.onchange = (e) => {
        Voice.settings.mode = e.target.value;
        Voice.saveSettings();
      };
    }

    const chkButtons = document.getElementById('voice-chk-buttons');
    if (chkButtons) {
      chkButtons.onchange = (e) => {
        Voice.settings.speakButtons = e.target.checked;
        Voice.saveSettings();
      };
    }

    const chkSteps = document.getElementById('voice-chk-steps');
    if (chkSteps) {
      chkSteps.onchange = (e) => {
        Voice.settings.speakSteps = e.target.checked;
        Voice.saveSettings();
      };
    }

    const chkEvents = document.getElementById('voice-chk-events');
    if (chkEvents) {
      chkEvents.onchange = (e) => {
        Voice.settings.speakEvents = e.target.checked;
        Voice.saveSettings();
      };
    }

    const chkTitles = document.getElementById('voice-chk-titles');
    if (chkTitles) {
      chkTitles.onchange = (e) => {
        Voice.settings.speakTips = e.target.checked;
        Voice.saveSettings();
      };
    }

    // Voice Presets
    const setPreset = (pitch, rate, mode) => {
      Voice.settings.pitch = pitch;
      Voice.settings.rate = rate;
      Voice.settings.mode = mode;
      Voice.saveSettings();
      this.syncVoiceSettingsUI();
      Voice.testSample();
    };

    const presetCute = document.getElementById('preset-cute');
    if (presetCute) presetCute.onclick = () => setPreset(1.50, 1.15, "both");

    const presetKid = document.getElementById('preset-kid');
    if (presetKid) presetKid.onclick = () => setPreset(1.35, 1.05, "both");

    const presetScifi = document.getElementById('preset-scifi');
    if (presetScifi) presetScifi.onclick = () => setPreset(1.75, 1.25, "directions");

    const presetSlow = document.getElementById('preset-slow');
    if (presetSlow) presetSlow.onclick = () => setPreset(1.15, 0.85, "numbers");

    const testBtn = document.getElementById('voice-btn-test');
    if (testBtn) testBtn.onclick = () => Voice.testSample();

    const resetBtnVoice = document.getElementById('voice-btn-reset');
    if (resetBtnVoice) {
      resetBtnVoice.onclick = () => {
        Voice.resetToDefaults();
        this.syncVoiceSettingsUI();
        Voice.testSample();
      };
    }

    // Modal Closers
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.onclick = (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      };

      // Tapping the dimmed backdrop closes the same modals. On a phone the
      // card scrolls, so the × can end up out of view.
      const overlay = btn.closest('.modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.classList.remove('open');
        });
      }
    });

    // Keyboard support (Arrow keys or WASD)
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this.addCommand('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        this.addCommand('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        this.addCommand('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        this.addCommand('RIGHT');
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        this.toggleGhost();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (this.isRunning) this.resetRobot();
        else this.runAll();
      } else if (e.code === 'Delete' || e.code === 'Escape' || (e.code === 'Backspace' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        this.clearCommands();
      } else if (e.code === 'Backspace') {
        this.removeLastCommand();
      }
    });
  }
}

// ==========================================
// SMALL UI HELPERS
// ==========================================
// Buttons keep an emoji + a separate label span, so narrow screens can
// hide the label with CSS and leave a clean, big icon-only tap target.
function setButtonLabel(btn, emoji, label, ariaLabel) {
  if (!btn) return;
  btn.innerHTML = '';

  const emojiEl = document.createElement('span');
  emojiEl.className = 'btn-emoji';
  emojiEl.textContent = emoji;

  const labelEl = document.createElement('span');
  labelEl.className = 'btn-label';
  labelEl.textContent = label;

  btn.appendChild(emojiEl);
  btn.appendChild(labelEl);
  btn.setAttribute('aria-label', ariaLabel || label);
}

// ==========================================
// CONFETTI CELEBRATION EFFECT
// ==========================================
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444'];

  for (let i = 0; i < 80; i++) {
    pieces.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      size: Math.random() * 9 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12
    });
  }

  let animationFrame;
  let alpha = 1;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let allFell = true;

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.rotSpeed;

      if (p.y < canvas.height) allFell = false;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    if (!allFell) {
      animationFrame = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  draw();
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameController();
  window.game.start();
});
