# 🤖 RoboStep: Gem Quest

**An educational robot instruction logic & counting puzzle game for kids!**

Help your friendly robot navigate through expanding worlds to collect the shiny gem! Plan sequences of directional commands (Up, Down, Left, Right), watch your robot execute them step-by-step, and unlock awesome new robot customizations every 5 levels!

---

## 🎮 How to Play

1. **Count & Plan**: Look at your robot and count how many tiles it needs to move to reach the Gem.
2. **Give Instructions**: Tap the chunky directional arrow buttons (**⬆️ Up**, **⬇️ Down**, **⬅️ Left**, **➡️ Right**) or use your keyboard arrow keys / WASD.
   - Each instruction adds a numbered step card (1, 2, 3...) so kids can practice 1-to-1 counting.
3. **Execute**:
   - **▶ Run**: Watch the robot execute the entire program automatically!
   - **⏭ Step**: Execute just one instruction at a time so parents and kids can count together ("One! Two! Three!").
   - **↺ Reset**: Returns the robot to the start position without losing your program, so you can debug and tweak your steps.
   - **⌫ Undo / 🗑️ Clear**: Remove the last step or start fresh.
   - **💡 Hint**: Draws the answer on the board rather than writing it out, so it works before a child can read:
     - a big bouncing **arrow** on the very next square to move to,
     - **footsteps** flowing along the rest of the way,
     - a **green ring** around whatever to head for (the gem, or the next ingredient),
     - the **button to press** pulses with a halo around it,
     - and if the plan goes wrong: the **step card** that causes it shakes red, the rock or pit gets a red ✕, and a blue arrow shows a way that works instead.

     The hint clears itself as soon as the player acts on it. The written line and the spoken hint are extras for grown-ups.
   - **👻 Ghost**: A toggle that answers "where will my robot end up?" *before* anything runs:
     - a **see-through robot** stands on the square the program would leave the real one on,
     - every square on the way is **numbered**, so you can read off where the robot is at step 1, step 2, step 3...,
     - the ring around the finishing square says how it turns out: **green 🎉** if the plan finishes the level, **amber 🚫** if it bonks a rock or the edge (the rock gets a dashed ring too), **red ⚠️** if it drops into a pit,
     - it redraws itself as steps are added, undone or deleted, and steps aside while a 💡 Hint is on screen.

     Great for "count first, then check" — plan the route, look at the ghost, fix the plan, *then* press Run. The setting is remembered next time.
   - **🐢 / 🐇 / ⚡ Speed**: Adjust playback speed from slow turtle to lightning fast.

4. **🎙️ Voice Studio (Fully Customizable)**:
   - Tap the **🎙️ Voice** button in the top bar to open the **Robot Voice Studio**.
   - **Voice Pitch**: Adjust slider (0.5 to 2.0). Higher pitch (~1.45) sounds like a cute cartoon robot!
   - **Speaking Speed**: Adjust pace (0.5x to 1.8x) to match your kid's listening speed.
   - **Speaking Style**: Choose between *"Number & Direction"* (e.g. "One, Up! Two, Right!"), *"Counting Only"* ("One! Two! Three!"), or *"Directions Only"* ("Up! Right!").
   - **Voice Presets**: Instant one-click presets like 🤖 *Cute Robot*, 🧸 *Playful Kid*, 🚀 *Sci-Fi Droid*, or 🐢 *Slow & Clear*.
   - **Settings Lock-in**: All voice adjustments auto-save in `localStorage`, so your favorite voice settings stay locked in!

---

## 🗺️ 50 Progressive Levels & Worlds

The grid expands slowly as the player learns and advances:

| Worlds | Levels | Grid Size | Hazards & Challenges |
| :--- | :--- | :--- | :--- |
| **World 1: Sunny Meadow** | Levels 1–10 | **3x3 to 4x4** | Fundamentals of Up, Down, Left, Right & counting 1–6 steps |
| **World 2: Rocky Canyon** | Levels 11–20 | **4x4 to 5x5** | Solid rock boulders 🪨 to steer around |
| **World 3: Danger Chasm** | Levels 21–30 | **5x5 to 6x6** | Deep hazard pits 🕳️ (don't fall in!) and narrow bridges |
| **World 4: Circuit City** | Levels 31–40 | **6x6 to 7x7** | Winding corridors, high-tech mazes & switchbacks |
| **World 5: Master Academy** | Levels 41–50 | **7x7 to 8x8** | Grand master puzzle arenas for champion coders |

---

## 🥤 Smoothie Remix Mode (12 Recipes)

A second way to play, picked from the **🗺️ Levels** screen — tap **🥤 Smoothie Remix**.

Same robot, same four arrows, one extra rule: **collect every ingredient on the recipe card, then take them to the blender.**

- **Recipe card**: sits above the board and ticks each ingredient off the moment the robot rolls over it, so kids can count what's still missing.
- **The blender fills up**: the jug on the goal square pours in a little more colour with every ingredient collected — a progress bar you can see from across the room.
- **Arriving empty-handed does nothing**: the robot can roll straight over the blender, and it simply says how many ingredients are still needed. The smoothie only gets made when the recipe is complete.
- **Then the good bit**: the blender whirs, the smoothie is served, and the robot drinks the whole thing. *Slurp! So yummy!* 🥤
- **Hints know the recipe**: 💡 Hint routes to the nearest ingredient still on the board by name ("2 steps to 🫐 Blueberry"), and only points at the blender once everything is collected.
- **Separate progress**: Smoothie Remix keeps its own stars and unlocks, so it never touches your Classic Quest progress.

| Recipes | Ingredients | Grid | What's new |
| :--- | :--- | :--- | :--- |
| 1–3: Berry Blast, Banana Buzz, Tropical Sunrise | 2–3 | 4x4 | Collect, then blend |
| 4–6: Green Machine, Peachy Keen, Melon Splash | 3 | 5x5 | Boulders, and a blender you can roll over |
| 7–9: Choco Monkey, Dragon Dream, Very Berry Deluxe | 4–5 | 6x6 | Holes in the kitchen floor |
| 10–12: Citrus Zing, Rainbow Remix, Master Blender | 4–5 | 7x7 | Big kitchens and long routes |

---

## 🎨 Unlockable Robot Customizations (Every 5 Levels)

Visit the **Workshop (Robot Dressing Room)** anytime to mix and match unlocked parts:

- **Level 5**: 🎨 **Lime Mint & Bubblegum Pink** paint coats
- **Level 10**: 🚁 **Propeller Cap** (with real spinning propeller animation!)
- **Level 15**: 👀 **Star Eyes & Heart Visor**
- **Level 20**: 🏆 **Golden Knight Armor, Monster Wheels & Pogo Spring**
- **Level 25**: 🧑‍🚀 **Astronaut Bubble Helmet & Cool Sunglasses**
- **Level 30**: 🚀 **Rocket Jet Thrusters** (with animated flame exhaust!)
- **Level 35**: 🏴‍☠️ **Pirate Captain Hat** (with skull & crossbones)
- **Level 40**: 🌈 **Rainbow Hologram & Cyber Neon** paint + **Cyber Visor**
- **Level 45**: 🧙‍♂️ **Mystical Wizard Hat**
- **Level 50**: 👑 **Royal Golden Crown & Royal Hover Chariot** (Grand Champion!)

---

## 🚀 How to Run

Because the game is built with zero external dependencies and self-contained procedural Web Audio, you can run it immediately in any browser:

### Option 1: Direct File Open
Simply double-click `index.html` in your file explorer, or drag `index.html` into Chrome, Edge, Safari, or Firefox!

### Option 2: Local HTTP Server (Python)
```powershell
python -m http.server 8080
```
Then open [http://localhost:8080](http://localhost:8080) in your browser.

### Option 3: Local HTTP Server (Node)
```powershell
node scripts/test_web.js
```

---

## 📱 One-Screen Layout (Phones, Tablets & Desktop)

The whole game is designed to fit in a single screen with **no scrolling at all** — kids never have to hunt for the arrow buttons.

- **One frame**: the board, the program strip and the gamepad all live inside a single rounded game frame rather than separate floating panels.
- **The board is the star**: on a phone the controls take only about a quarter of the screen, and the board grows into everything that's left (roughly 290–375px on common phones).
- **Icons, not labels**: every control is a chunky rounded button whose shape and colour say what it does — four coloured arrows, a big green ▶, blue step, amber reset, and small round tools for undo / clear / hint / speed. Names live in tooltips and screen-reader labels instead of cluttering the buttons.
- **Gamepad layout**: arrows on the left, play controls on the right, exactly where a thumb expects them. Every arrow stays at or above the 44px tap-target guideline on every screen tested.
- **Landscape phones & desktop**: the board and the controls sit side by side inside the same frame; on short landscape screens the pad stacks above the play buttons so the arrows keep their size.
- **Notches & rounded corners**: safe-area insets are respected, and `100dvh` is used so the iOS Safari toolbar can't cut off the bottom row of buttons.
- **Tight on space?** The layout sheds optional chrome first (tips, captions, button labels) before it ever shrinks a tap target.

Run the regression checks (Playwright required for the first two) with:

```powershell
node scripts/check_layout.js      # one-screen layout across every viewport
node scripts/check_execution.js   # the robot always obeys the program on screen
node scripts/check_smoothie.js    # Smoothie Remix collects, blends and slurps
node scripts/verify_levels.js     # all 50 classic levels are solvable
node scripts/verify_smoothie.js   # all 12 recipes are collectable, pars are optimal
node scripts/test_web.js          # assets and page wiring
```

---

## 🎹 Keyboard Controls
- **Arrow Keys** or **W, A, S, D**: Add directional command
- **Spacebar**: Run / Reset toggle
- **Backspace**: Undo last instruction
- **G**: Show / hide the ghost preview
