// game.js - Core Game Controller, Loop, Interpreter, and UI Logic

class GameController {
  constructor() {
    this.currentLevelIdx = 0;
    this.maxUnlockedLevel = parseInt(localStorage.getItem('robostep_max_level') || '1', 10);
    this.starsData = JSON.parse(localStorage.getItem('robostep_stars') || '{}');
    
    // Play state
    this.commands = [];
    this.robotPos = { x: 0, y: 0 };
    this.robotDir = "DOWN";
    this.robotState = "idle";
    this.isRunning = false;
    this.executionStep = 0;
    this.runTimer = null;
    this.speed = 420; // ms per step (Turtle: 700, Rabbit: 420, Lightning: 220)

    // Path trail history
    this.trail = [];

    // Cached elements
    this.gridEl = document.getElementById('game-grid');
    this.commandTapeEl = document.getElementById('command-tape');
    this.stepCountEl = document.getElementById('step-count-badge');
    this.levelTitleEl = document.getElementById('level-title');
    this.levelWorldEl = document.getElementById('level-world');
    this.levelParEl = document.getElementById('level-par');
    this.tipTextEl = document.getElementById('tip-text');
    this.statusMsgEl = document.getElementById('status-message');

    this.initEvents();
  }

  start() {
    // Load first level or last played level
    const lastPlayed = parseInt(localStorage.getItem('robostep_last_played') || '1', 10);
    this.loadLevel(Math.min(lastPlayed, this.maxUnlockedLevel) - 1);
  }

  getCurrentLevel() {
    return LEVELS[this.currentLevelIdx];
  }

  loadLevel(levelIndex) {
    if (levelIndex < 0 || levelIndex >= LEVELS.length) return;
    this.currentLevelIdx = levelIndex;
    localStorage.setItem('robostep_last_played', (levelIndex + 1).toString());

    this.stopRunning();
    this.commands = [];
    this.trail = [];
    this.statusMsgEl.textContent = "";
    this.statusMsgEl.className = "status-message";

    const lvl = this.getCurrentLevel();
    this.robotPos = { ...lvl.start };
    this.robotDir = "DOWN";
    this.robotState = "idle";

    // Update Header Info
    this.levelTitleEl.textContent = `Level ${lvl.id}: ${lvl.title}`;
    this.levelWorldEl.textContent = lvl.world;
    this.levelParEl.textContent = `Target: ${lvl.par} steps`;
    this.tipTextEl.textContent = lvl.tip || "Plan your route to the gem!";

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
      "Master Academy": "world-master"
    };
    this.gridEl.className = `grid-container ${worldClasses[lvl.world] || 'world-meadow'}`;

    const blockerMap = new Set(lvl.blockers.map(b => `${b.x},${b.y}`));
    const pitMap = new Set(lvl.pits.map(p => `${p.x},${p.y}`));
    const trailMap = new Map(this.trail.map((t, idx) => [`${t.x},${t.y}`, idx + 1]));

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
        // Goal Gem
        else if (lvl.gem.x === x && lvl.gem.y === y) {
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
  }

  // ==========================================
  // COMMAND QUEUE MANAGEMENT
  // ==========================================
  addCommand(dir) {
    if (this.isRunning) return;
    if (this.commands.length >= 40) {
      this.showMessage("Maximum steps reached for this level!", "warn");
      return;
    }

    this.commands.push(dir);
    Sound.playClick();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton(dir.toLowerCase());
    }
    this.renderCommandTape();
    this.updateControlsState();
  }

  removeCommandAt(index) {
    if (this.isRunning) return;
    this.commands.splice(index, 1);
    Sound.playDelete();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton("Remove");
    }
    this.renderCommandTape();
    this.updateControlsState();
  }

  removeLastCommand() {
    if (this.isRunning || this.commands.length === 0) return;
    this.commands.pop();
    Sound.playDelete();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton("Undo");
    }
    this.renderCommandTape();
    this.updateControlsState();
  }

  clearCommands() {
    if (this.isRunning || this.commands.length === 0) return;
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
    this.stepCountEl.textContent = `${this.commands.length} Steps`;

    const arrows = {
      UP: { symbol: "⬆️", label: "Up" },
      DOWN: { symbol: "⬇️", label: "Down" },
      LEFT: { symbol: "⬅️", label: "Left" },
      RIGHT: { symbol: "➡️", label: "Right" }
    };

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

      const item = arrows[cmd];
      card.innerHTML = `
        <div class="card-step-num">${idx + 1}</div>
        <div class="card-arrow">${item.symbol}</div>
        <div class="card-name">${item.label}</div>
        <button class="card-del-btn" title="Remove step" onclick="window.game.removeCommandAt(${idx})">×</button>
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
    const clearTapeBtn = document.getElementById('btn-clear-tape');
    const undoBtn = document.getElementById('btn-undo');

    const hasCommands = this.commands.length > 0;

    runBtn.disabled = !hasCommands || this.isRunning;
    stepBtn.disabled = !hasCommands || this.isRunning;
    clearBtn.disabled = !hasCommands || this.isRunning;
    if (clearTapeBtn) clearTapeBtn.disabled = !hasCommands || this.isRunning;
    undoBtn.disabled = !hasCommands || this.isRunning;
    resetBtn.disabled = this.isRunning;
  }

  // ==========================================
  // EXECUTION & COLLISION LOGIC
  // ==========================================
  runAll() {
    if (this.isRunning || this.commands.length === 0) return;
    Sound.init();
    if (typeof Voice !== 'undefined') {
      Voice.speakButton("Run!");
    }
    
    // If starting from clean state, reset robot position to level start
    if (this.executionStep >= this.commands.length || this.robotState === "victory" || this.robotState === "fall") {
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
      // Check if robot is on gem
      const lvl = this.getCurrentLevel();
      if (this.robotPos.x === lvl.gem.x && this.robotPos.y === lvl.gem.y) {
        this.handleVictory();
      } else {
        this.showMessage("Instructions finished! But the robot didn't reach the gem yet. Try adding more steps!", "info");
      }
      return;
    }

    const stepSuccess = this.executeSingleStep();
    if (!stepSuccess) {
      this.stopRunning();
      return;
    }

    // Check if stepped onto gem right away!
    const lvl = this.getCurrentLevel();
    if (this.robotPos.x === lvl.gem.x && this.robotPos.y === lvl.gem.y) {
      this.stopRunning();
      this.handleVictory();
      return;
    }

    this.runTimer = setTimeout(() => {
      this.executeLoop();
    }, this.speed);
  }

  stepOnce() {
    if (this.isRunning || this.commands.length === 0) return;
    Sound.init();
    if (typeof Voice !== 'undefined' && this.executionStep === 0) {
      Voice.speakButton("Step");
    }

    if (this.executionStep >= this.commands.length || this.robotState === "victory" || this.robotState === "fall") {
      this.resetRobot();
    }

    this.executeSingleStep();

    const lvl = this.getCurrentLevel();
    if (this.robotPos.x === lvl.gem.x && this.robotPos.y === lvl.gem.y) {
      this.handleVictory();
    }
  }

  executeSingleStep() {
    if (this.executionStep >= this.commands.length) return false;

    const cmd = this.commands[this.executionStep];
    const lvl = this.getCurrentLevel();
    this.robotDir = cmd;

    const deltas = {
      UP: { dx: 0, dy: -1 },
      DOWN: { dx: 0, dy: 1 },
      LEFT: { dx: -1, dy: 0 },
      RIGHT: { dx: 1, dy: 0 }
    };

    const delta = deltas[cmd];
    const nextX = this.robotPos.x + delta.dx;
    const nextY = this.robotPos.y + delta.dy;

    // Check wall collision (out of bounds)
    if (nextX < 0 || nextX >= lvl.width || nextY < 0 || nextY >= lvl.height) {
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
    const isBlocker = lvl.blockers.some(b => b.x === nextX && b.y === nextY);
    if (isBlocker) {
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
    const isPit = lvl.pits.some(p => p.x === nextX && p.y === nextY);
    if (isPit) {
      // Step into the hole and fall
      this.trail.push({ ...this.robotPos });
      this.robotPos = { x: nextX, y: nextY };
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
    this.robotPos = { x: nextX, y: nextY };
    this.robotState = "walking";

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

  stopRunning() {
    this.isRunning = false;
    if (this.runTimer) {
      clearTimeout(this.runTimer);
      this.runTimer = null;
    }
    this.updateControlsState();
  }

  resetRobot() {
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
    this.statusMsgEl.textContent = "";
    this.statusMsgEl.className = "status-message";
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
    this.robotState = "victory";
    this.renderGrid();
    Sound.playGem();
    setTimeout(() => Sound.playWin(), 200);

    // Launch Confetti!
    triggerConfetti();

    const lvl = this.getCurrentLevel();
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
      localStorage.setItem('robostep_stars', JSON.stringify(this.starsData));
    }

    // Unlock next level
    const nextLevelNum = lvl.id + 1;
    let isNewUnlock = false;
    if (nextLevelNum <= LEVELS.length && nextLevelNum > this.maxUnlockedLevel) {
      this.maxUnlockedLevel = nextLevelNum;
      localStorage.setItem('robostep_max_level', this.maxUnlockedLevel.toString());
      isNewUnlock = true;
    }

    // Check Milestone Customization Reward (Every 5 levels: 5, 10, 15, 20... 50)
    const reward = (lvl.id % 5 === 0) ? Customizer.getMilestoneReward(lvl.id) : null;

    if (typeof Voice !== 'undefined') {
      if (stars === 3) {
        Voice.speakRandom(["Super star coder! Three stars!", "You did it! Perfect path!", "Hooray! Three stars!"]);
      } else {
        Voice.speakRandom(["Awesome job! You got the gem!", "Hooray! Level completed!", "Great job!"]);
      }
    }

    setTimeout(() => {
      if (reward) {
        this.showMilestoneModal(reward, lvl.id, stars, stepCount);
      } else {
        this.showWinModal(stars, stepCount, lvl.par, nextLevelNum);
      }
    }, 600);
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

    titleEl.textContent = stars === 3 ? "Super Star Coder! 🌟" : "Awesome Job! 💎";
    statsEl.innerHTML = `You solved it in <strong>${stepCount}</strong> steps! (Target par: ${par})`;

    if (nextLevelNum <= LEVELS.length) {
      nextBtn.style.display = "inline-flex";
      nextBtn.textContent = `Next Level (${nextLevelNum}) ➔`;
      nextBtn.onclick = () => {
        this.closeModal('win-modal');
        this.loadLevel(nextLevelNum - 1);
      };
    } else {
      nextBtn.style.display = "none";
      statsEl.innerHTML += "<br><strong>🎉 You have completed all 50 levels! You are a master robot programmer!</strong>";
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
  showHint() {
    const lvl = this.getCurrentLevel();
    // Run automated solver BFS to get the next step or optimal path
    const path = this.solveBFS(lvl);
    if (!path || path.length === 0) return;

    // Suggest next optimal direction
    const nextDir = path[0];
    const arrowSymbols = { UP: "⬆️ Up", DOWN: "⬇️ Down", LEFT: "⬅️ Left", RIGHT: "➡️ Right" };
    this.showMessage(`Hint: Try starting by going ${arrowSymbols[nextDir]}!`, "info");
    Sound.playClick();
    if (typeof Voice !== 'undefined') {
      Voice.speakEvent(`Hint: Try going ${nextDir.toLowerCase()}!`);
    }
  }

  solveBFS(level) {
    const key = (x, y) => `${x},${y}`;
    const blockerSet = new Set(level.blockers.map(b => key(b.x, b.y)));
    const pitSet = new Set(level.pits.map(p => key(p.x, p.y)));

    const queue = [{ x: level.start.x, y: level.start.y, path: [] }];
    const visited = new Set([key(level.start.x, level.start.y)]);

    const DIRS = [
      { name: "UP", dx: 0, dy: -1 },
      { name: "DOWN", dx: 0, dy: 1 },
      { name: "LEFT", dx: -1, dy: 0 },
      { name: "RIGHT", dx: 1, dy: 0 }
    ];

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.x === level.gem.x && cur.y === level.gem.y) {
        return cur.path;
      }

      for (const dir of DIRS) {
        const nx = cur.x + dir.dx;
        const ny = cur.y + dir.dy;
        const nKey = key(nx, ny);

        if (nx < 0 || nx >= level.width || ny < 0 || ny >= level.height) continue;
        if (blockerSet.has(nKey) || pitSet.has(nKey) || visited.has(nKey)) continue;

        visited.add(nKey);
        queue.push({ x: nx, y: ny, path: [...cur.path, dir.name] });
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
    gridEl.innerHTML = "";

    LEVELS.forEach(lvl => {
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

      card.innerHTML = `
        <div class="level-card-num">${lvl.id}</div>
        <div class="level-card-title">${lvl.title}</div>
        <div class="level-card-meta">${lvl.width}x${lvl.height}</div>
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
    const clearTapeBtn = document.getElementById('btn-clear-tape');
    if (clearTapeBtn) {
      clearTapeBtn.onclick = () => this.clearCommands();
    }
    document.getElementById('btn-undo').onclick = () => this.removeLastCommand();
    document.getElementById('btn-hint').onclick = () => this.showHint();

    // Speed toggle
    const speedBtn = document.getElementById('btn-speed');
    const speeds = [
      { ms: 420, label: "🐇 Normal" },
      { ms: 220, label: "⚡ Fast" },
      { ms: 700, label: "🐢 Slow" }
    ];
    let curSpeedIdx = 0;
    speedBtn.onclick = () => {
      curSpeedIdx = (curSpeedIdx + 1) % speeds.length;
      this.speed = speeds[curSpeedIdx].ms;
      speedBtn.textContent = speeds[curSpeedIdx].label;
      Sound.playClick();
    };

    // Sound toggle
    const soundBtn = document.getElementById('btn-sound');
    soundBtn.textContent = Sound.isMuted() ? "🔇 Muted" : "🔊 Sound";
    soundBtn.onclick = () => {
      const muted = Sound.toggleMute();
      soundBtn.textContent = muted ? "🔇 Muted" : "🔊 Sound";
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
