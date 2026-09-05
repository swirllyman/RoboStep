// levels.js - 50 Progressive Levels for RoboStep: Gem Quest
// Each level defines:
// - id: Level number (1-50)
// - title: Kid-friendly level name
// - world: Theme / World grouping
// - width, height: Grid dimensions (3x3 up to 8x8)
// - start: {x, y} robot starting coordinate (0-indexed)
// - gem: {x, y} goal gem coordinate
// - blockers: [{x, y}] solid obstacles (rocks/crates) that robot cannot walk through
// - pits: [{x, y}] hazard holes/gaps that robot will fall into if entered
// - par: Optimal number of instructions for 3-star rating
// - tip: Friendly helper tip for kids/parents

const LEVELS = [
  // ==========================================
  // WORLD 1: Sunny Meadow (Levels 1 - 10)
  // Grids: 3x3 to 4x4. Basics of Up, Down, Left, Right & counting.
  // ==========================================
  {
    id: 1,
    title: "First Steps",
    world: "Sunny Meadow",
    width: 3,
    height: 3,
    start: { x: 0, y: 1 },
    gem: { x: 2, y: 1 },
    blockers: [],
    pits: [],
    par: 2,
    tip: "Tap Right twice (→ →) to reach the gem!"
  },
  {
    id: 2,
    title: "Going Down",
    world: "Sunny Meadow",
    width: 3,
    height: 3,
    start: { x: 1, y: 0 },
    gem: { x: 1, y: 2 },
    blockers: [],
    pits: [],
    par: 2,
    tip: "Give your robot 2 Down instructions (↓ ↓)!"
  },
  {
    id: 3,
    title: "Turn the Corner",
    world: "Sunny Meadow",
    width: 3,
    height: 3,
    start: { x: 0, y: 0 },
    gem: { x: 2, y: 2 },
    blockers: [],
    pits: [],
    par: 4,
    tip: "Go Right 2 steps, then Down 2 steps!"
  },
  {
    id: 4,
    title: "Up and Over",
    world: "Sunny Meadow",
    width: 3,
    height: 3,
    start: { x: 0, y: 2 },
    gem: { x: 2, y: 0 },
    blockers: [],
    pits: [],
    par: 4,
    tip: "Walk Up 2 steps, then Right 2 steps!"
  },
  {
    id: 5,
    title: "The S-Curve",
    world: "Sunny Meadow",
    width: 3,
    height: 3,
    start: { x: 0, y: 0 },
    gem: { x: 2, y: 2 },
    blockers: [{ x: 1, y: 0 }, { x: 1, y: 2 }],
    pits: [],
    par: 4,
    tip: "Great job reaching Level 5! A new color is waiting!"
  },
  {
    id: 6,
    title: "Bigger World",
    world: "Sunny Meadow",
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    gem: { x: 3, y: 0 },
    blockers: [],
    pits: [],
    par: 3,
    tip: "Count 1, 2, 3 steps to the Right!"
  },
  {
    id: 7,
    title: "Across the Field",
    world: "Sunny Meadow",
    width: 4,
    height: 4,
    start: { x: 0, y: 3 },
    gem: { x: 3, y: 0 },
    blockers: [],
    pits: [],
    par: 6,
    tip: "Up 3 times, then Right 3 times!"
  },
  {
    id: 8,
    title: "Zig Zag Jog",
    world: "Sunny Meadow",
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    gem: { x: 3, y: 3 },
    blockers: [],
    pits: [],
    par: 6,
    tip: "Can you plan a 6-step path to the gem?"
  },
  {
    id: 9,
    title: "Around the Border",
    world: "Sunny Meadow",
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    gem: { x: 0, y: 3 },
    blockers: [{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 1 }],
    pits: [],
    par: 7,
    tip: "Watch out for the rocks! Go around to the right."
  },
  {
    id: 10,
    title: "Meadow Graduation",
    world: "Sunny Meadow",
    width: 4,
    height: 4,
    start: { x: 1, y: 3 },
    gem: { x: 2, y: 0 },
    blockers: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
    pits: [],
    par: 6,
    tip: "Level 10 reached! You unlock the Propeller Hat!"
  },

  // ==========================================
  // WORLD 2: Rocky Canyon (Levels 11 - 20)
  // Grids: 4x4 to 5x5. Solid rocks and walls to navigate around.
  // ==========================================
  {
    id: 11,
    title: "Boulder Block",
    world: "Rocky Canyon",
    width: 4,
    height: 4,
    start: { x: 0, y: 1 },
    gem: { x: 3, y: 1 },
    blockers: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
    pits: [],
    par: 5,
    tip: "Walk around the boulders to get to the gem."
  },
  {
    id: 12,
    title: "Rock Wall Detour",
    world: "Rocky Canyon",
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    gem: { x: 3, y: 3 },
    blockers: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    pits: [],
    par: 6,
    tip: "Find the open doorway at the bottom!"
  },
  {
    id: 13,
    title: "Stone Gateway",
    world: "Rocky Canyon",
    width: 4,
    height: 4,
    start: { x: 1, y: 0 },
    gem: { x: 1, y: 3 },
    blockers: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 3, y: 2 }],
    pits: [],
    par: 5,
    tip: "Only column 2 is open to pass through!"
  },
  {
    id: 14,
    title: "Corner Stones",
    world: "Rocky Canyon",
    width: 4,
    height: 4,
    start: { x: 0, y: 3 },
    gem: { x: 3, y: 0 },
    blockers: [{ x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    pits: [],
    par: 6,
    tip: "Take the outside path to stay clear of the rocks."
  },
  {
    id: 15,
    title: "Canyon Maze",
    world: "Rocky Canyon",
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    gem: { x: 3, y: 3 },
    blockers: [{ x: 0, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 3 }, { x: 3, y: 1 }],
    pits: [],
    par: 6,
    tip: "Level 15 unlocked! You got new Visor Eyes!"
  },
  {
    id: 16,
    title: "Wider Horizons",
    world: "Rocky Canyon",
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    gem: { x: 4, y: 4 },
    blockers: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
    pits: [],
    par: 8,
    tip: "A 5x5 grid! Count your steps carefully."
  },
  {
    id: 17,
    title: "Double Barrier",
    world: "Rocky Canyon",
    width: 5,
    height: 5,
    start: { x: 0, y: 2 },
    gem: { x: 4, y: 2 },
    blockers: [
      { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 },
      { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }
    ],
    pits: [],
    par: 8,
    tip: "Use the top or bottom lane to bypass the barriers."
  },
  {
    id: 18,
    title: "The Snake Pass",
    world: "Rocky Canyon",
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    gem: { x: 4, y: 4 },
    blockers: [
      { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 },
      { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }
    ],
    pits: [],
    par: 12,
    tip: "Weave like a friendly snake!"
  },
  {
    id: 19,
    title: "Stone Fortress",
    world: "Rocky Canyon",
    width: 5,
    height: 5,
    start: { x: 0, y: 4 },
    gem: { x: 4, y: 0 },
    blockers: [
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
      { x: 0, y: 2 }, { x: 4, y: 2 }
    ],
    pits: [],
    par: 8,
    tip: "Find the open corridors to enter the fortress."
  },
  {
    id: 20,
    title: "Canyon Master",
    world: "Rocky Canyon",
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    gem: { x: 2, y: 2 },
    blockers: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
      { x: 1, y: 2 }, { x: 1, y: 3 },
      { x: 3, y: 2 }, { x: 3, y: 3 }
    ],
    pits: [],
    par: 8,
    tip: "Level 20! You unlocked the Golden Knight Armor!"
  },

  // ==========================================
  // WORLD 3: Danger Chasm (Levels 21 - 30)
  // Grids: 5x5 to 6x6. Introducing hazardous Gaps/Pits!
  // ==========================================
  {
    id: 21,
    title: "Watch the Hole!",
    world: "Danger Chasm",
    width: 5,
    height: 5,
    start: { x: 0, y: 2 },
    gem: { x: 4, y: 2 },
    blockers: [],
    pits: [{ x: 2, y: 2 }],
    par: 6,
    tip: "Don't fall in the pit! Walk around it."
  },
  {
    id: 22,
    title: "Two Pits",
    world: "Danger Chasm",
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    gem: { x: 4, y: 0 },
    blockers: [],
    pits: [{ x: 1, y: 0 }, { x: 3, y: 0 }],
    par: 6,
    tip: "Step Down, walk Right, and step back Up!"
  },
  {
    id: 23,
    title: "The Narrow Bridge",
    world: "Danger Chasm",
    width: 5,
    height: 5,
    start: { x: 2, y: 0 },
    gem: { x: 2, y: 4 },
    blockers: [],
    pits: [
      { x: 1, y: 2 }, { x: 3, y: 2 },
      { x: 0, y: 2 }, { x: 4, y: 2 }
    ],
    par: 4,
    tip: "Only column 2 is safe to walk across."
  },
  {
    id: 24,
    title: "Rocks and Pits",
    world: "Danger Chasm",
    width: 5,
    height: 5,
    start: { x: 0, y: 4 },
    gem: { x: 4, y: 0 },
    blockers: [{ x: 2, y: 2 }, { x: 2, y: 3 }],
    pits: [{ x: 1, y: 1 }, { x: 3, y: 3 }],
    par: 8,
    tip: "Avoid the hard rocks AND the deep pits!"
  },
  {
    id: 25,
    title: "Stepping Stones",
    world: "Danger Chasm",
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    gem: { x: 4, y: 4 },
    blockers: [{ x: 1, y: 2 }, { x: 3, y: 2 }],
    pits: [{ x: 2, y: 1 }, { x: 2, y: 3 }, { x: 0, y: 3 }],
    par: 8,
    tip: "Level 25 complete! You unlocked the Astronaut Helmet!"
  },
  {
    id: 26,
    title: "Big Chasm",
    world: "Danger Chasm",
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    gem: { x: 5, y: 5 },
    blockers: [{ x: 2, y: 2 }, { x: 3, y: 3 }],
    pits: [{ x: 2, y: 3 }, { x: 3, y: 2 }],
    par: 10,
    tip: "A 6x6 grid! Take it one step at a time."
  },
  {
    id: 27,
    title: "The Pit River",
    world: "Danger Chasm",
    width: 6,
    height: 6,
    start: { x: 0, y: 2 },
    gem: { x: 5, y: 2 },
    blockers: [],
    pits: [
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 4 }, { x: 3, y: 5 }
    ],
    par: 7,
    tip: "Find the single safe crossing at row 3!"
  },
  {
    id: 28,
    title: "Checkerboard Pits",
    world: "Danger Chasm",
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    gem: { x: 5, y: 5 },
    blockers: [{ x: 1, y: 3 }, { x: 4, y: 2 }],
    pits: [{ x: 1, y: 1 }, { x: 3, y: 3 }, { x: 2, y: 4 }],
    par: 10,
    tip: "Look ahead before moving so you don't get trapped!"
  },
  {
    id: 29,
    title: "The Trench Run",
    world: "Danger Chasm",
    width: 6,
    height: 6,
    start: { x: 0, y: 5 },
    gem: { x: 5, y: 0 },
    blockers: [
      { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 },
      { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }
    ],
    pits: [{ x: 2, y: 1 }, { x: 2, y: 4 }],
    par: 10,
    tip: "Step across the open trench path!"
  },
  {
    id: 30,
    title: "Chasm Champion",
    world: "Danger Chasm",
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    gem: { x: 5, y: 3 },
    blockers: [
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
      { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }
    ],
    pits: [{ x: 1, y: 4 }, { x: 3, y: 1 }, { x: 4, y: 0 }],
    par: 12,
    tip: "Level 30 victory! Rocket Thrusters unlocked!"
  },

  // ==========================================
  // WORLD 4: Circuit City (Levels 31 - 40)
  // Grids: 6x6 to 7x7. Complex corridors, twists, and turns.
  // ==========================================
  {
    id: 31,
    title: "Spiral Road",
    world: "Circuit City",
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    gem: { x: 2, y: 3 },
    blockers: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
      { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 },
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
      { x: 1, y: 2 } // Left (1,3) open as the entrance door!
    ],
    pits: [],
    par: 5,
    tip: "Follow the spiral all the way inside!"
  },
  {
    id: 32,
    title: "The Twin Bridges",
    world: "Circuit City",
    width: 6,
    height: 6,
    start: { x: 0, y: 3 },
    gem: { x: 5, y: 3 },
    blockers: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 4 }],
    pits: [
      { x: 2, y: 3 }, { x: 3, y: 3 },
      { x: 2, y: 0 }, { x: 3, y: 0 },
      { x: 2, y: 5 }, { x: 3, y: 5 }
    ],
    par: 9,
    tip: "Use bridge 1 (row 1) or bridge 2 (row 4) to cross."
  },
  {
    id: 33,
    title: "Circuit Board",
    world: "Circuit City",
    width: 6,
    height: 6,
    start: { x: 0, y: 5 },
    gem: { x: 5, y: 0 },
    blockers: [
      { x: 1, y: 1 }, { x: 3, y: 1 },
      { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }
    ],
    pits: [{ x: 1, y: 4 }, { x: 3, y: 4 }],
    par: 10,
    tip: "Plan your circuit connections step-by-step!"
  },
  {
    id: 34,
    title: "Hazard Highway",
    world: "Circuit City",
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    gem: { x: 5, y: 5 },
    blockers: [
      { x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 4 },
      { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 3, y: 5 }
    ],
    pits: [{ x: 2, y: 2 }, { x: 4, y: 4 }],
    par: 12,
    tip: "Weave past the street blocks to reach the goal."
  },
  {
    id: 35,
    title: "City Plaza",
    world: "Circuit City",
    width: 6,
    height: 6,
    start: { x: 1, y: 5 },
    gem: { x: 4, y: 0 },
    blockers: [
      { x: 2, y: 2 }, { x: 3, y: 2 },
      { x: 2, y: 3 }, { x: 3, y: 3 },
      { x: 0, y: 2 }
    ],
    pits: [{ x: 1, y: 1 }, { x: 4, y: 4 }],
    par: 10,
    tip: "Level 35! Ahoy, you unlocked the Pirate Captain Hat!"
  },
  {
    id: 36,
    title: "Metro Sprawl",
    world: "Circuit City",
    width: 7,
    height: 7,
    start: { x: 0, y: 0 },
    gem: { x: 6, y: 6 },
    blockers: [
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
      { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }
    ],
    pits: [{ x: 1, y: 5 }, { x: 5, y: 1 }],
    par: 12,
    tip: "Welcome to the 7x7 grid! A huge new playground."
  },
  {
    id: 37,
    title: "Neon Alleyways",
    world: "Circuit City",
    width: 7,
    height: 7,
    start: { x: 0, y: 6 },
    gem: { x: 6, y: 0 },
    blockers: [
      { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 },
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 },
      { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }
    ],
    pits: [{ x: 2, y: 6 }, { x: 4, y: 0 }],
    par: 12,
    tip: "Count the open lanes through the alleys."
  },
  {
    id: 38,
    title: "Grid Power Core",
    world: "Circuit City",
    width: 7,
    height: 7,
    start: { x: 3, y: 6 },
    gem: { x: 3, y: 0 },
    blockers: [
      { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
      { x: 2, y: 2 }, { x: 4, y: 2 },
      { x: 2, y: 4 }, { x: 4, y: 4 }
    ],
    pits: [{ x: 0, y: 3 }, { x: 6, y: 3 }],
    par: 10,
    tip: "Go around the core power block on column 1 or 5!"
  },
  {
    id: 39,
    title: "Laser Grid",
    world: "Circuit City",
    width: 7,
    height: 7,
    start: { x: 0, y: 3 },
    gem: { x: 6, y: 3 },
    blockers: [
      { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }
    ],
    pits: [{ x: 1, y: 4 }, { x: 5, y: 2 }], // Move pits away from doors at (2,3) and (4,0/6)
    par: 12,
    tip: "Navigate through the safe door openings."
  },
  {
    id: 40,
    title: "Cyber Metropolis",
    world: "Circuit City",
    width: 7,
    height: 7,
    start: { x: 0, y: 0 },
    gem: { x: 6, y: 6 },
    blockers: [
      { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 },
      { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 },
      { x: 1, y: 5 }, { x: 3, y: 5 }, { x: 5, y: 5 }
    ],
    pits: [{ x: 2, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 2 }],
    par: 12,
    tip: "Level 40 reached! Rainbow Hologram Glow unlocked!"
  },

  // ==========================================
  // WORLD 5: Master Academy (Levels 41 - 50)
  // Grids: 7x7 to 8x8. The ultimate logic, counting, and path puzzles!
  // ==========================================
  {
    id: 41,
    title: "The Quad Chambers",
    world: "Master Academy",
    width: 7,
    height: 7,
    start: { x: 0, y: 0 },
    gem: { x: 6, y: 6 },
    blockers: [
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 3, y: 5 }, { x: 3, y: 6 },
      { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }
    ],
    pits: [{ x: 2, y: 1 }, { x: 4, y: 5 }], // Pits clear of gateways (3, 2) and (3, 4)
    par: 12,
    tip: "Connect through the central door at (3, 2) or (3, 4)."
  },
  {
    id: 42,
    title: "Snake S-Maze",
    world: "Master Academy",
    width: 7,
    height: 7,
    start: { x: 0, y: 0 },
    gem: { x: 6, y: 6 },
    blockers: [
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }
    ],
    pits: [{ x: 4, y: 1 }, { x: 2, y: 5 }], // Kept far away from corners (6, 2) and (0, 4)
    par: 24,
    tip: "Count the long hallways carefully!"
  },
  {
    id: 43,
    title: "Chasm Archipelago",
    world: "Master Academy",
    width: 7,
    height: 7,
    start: { x: 0, y: 3 },
    gem: { x: 6, y: 3 },
    blockers: [
      { x: 2, y: 1 }, { x: 4, y: 1 },
      { x: 2, y: 5 }, { x: 4, y: 5 }
    ],
    pits: [
      { x: 2, y: 3 }, { x: 4, y: 3 },
      { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 },
      { x: 1, y: 4 }, { x: 3, y: 4 }, { x: 5, y: 4 }
    ],
    par: 12,
    tip: "Take the top or bottom safe passage."
  },
  {
    id: 44,
    title: "The Fortress Gates",
    world: "Master Academy",
    width: 7,
    height: 7,
    start: { x: 0, y: 6 },
    gem: { x: 6, y: 0 },
    blockers: [
      { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 2, y: 6 },
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }
    ],
    pits: [{ x: 1, y: 0 }, { x: 5, y: 6 }],
    par: 20,
    tip: "A true master test of sequence planning!"
  },
  {
    id: 45,
    title: "Wizard's Gauntlet",
    world: "Master Academy",
    width: 7,
    height: 7,
    start: { x: 3, y: 6 },
    gem: { x: 3, y: 1 },
    blockers: [
      { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 },
      { x: 1, y: 2 }, { x: 5, y: 2 }
    ],
    pits: [
      { x: 1, y: 4 }, { x: 5, y: 4 },
      { x: 2, y: 1 }, { x: 4, y: 1 }
    ],
    par: 13,
    tip: "Level 45 unlocked! Magic Wizard Hat awarded!"
  },
  {
    id: 46,
    title: "Grand Arena",
    world: "Master Academy",
    width: 8,
    height: 8,
    start: { x: 0, y: 0 },
    gem: { x: 7, y: 7 },
    blockers: [
      { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
      { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }
    ],
    pits: [{ x: 3, y: 3 }, { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 3 }],
    par: 14,
    tip: "The 8x8 Master Arena! Plan your strategy."
  },
  {
    id: 47,
    title: "The Great Labyrinth",
    world: "Master Academy",
    width: 8,
    height: 8,
    start: { x: 0, y: 7 },
    gem: { x: 7, y: 0 },
    blockers: [
      { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 },
      { x: 3, y: 0 }, { x: 3, y: 2 }, { x: 3, y: 4 }, { x: 3, y: 6 },
      { x: 5, y: 1 }, { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 5, y: 7 }
    ],
    pits: [{ x: 2, y: 2 }, { x: 4, y: 4 }, { x: 6, y: 2 }],
    par: 14,
    tip: "Count each corridor carefully before stepping."
  },
  {
    id: 48,
    title: "The Pit Canyon Bridge",
    world: "Master Academy",
    width: 8,
    height: 8,
    start: { x: 0, y: 3 },
    gem: { x: 7, y: 4 },
    blockers: [
      { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 6 }, { x: 3, y: 7 },
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 6 }, { x: 4, y: 7 }
    ],
    pits: [
      { x: 3, y: 2 }, { x: 3, y: 4 }, { x: 3, y: 5 },
      { x: 4, y: 2 }, { x: 4, y: 4 }, { x: 4, y: 5 } // y=3 bridge is safe straight through (3,3) and (4,3)!
    ],
    par: 8,
    tip: "Find the single winding bridge through column 3 and 4!"
  },
  {
    id: 49,
    title: "Obstacle Olympics",
    world: "Master Academy",
    width: 8,
    height: 8,
    start: { x: 0, y: 0 },
    gem: { x: 7, y: 7 },
    blockers: [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
      { x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 },
      { x: 2, y: 6 }, { x: 3, y: 6 }
    ],
    pits: [
      { x: 1, y: 4 }, { x: 3, y: 3 }, { x: 6, y: 2 }, { x: 4, y: 6 }
    ],
    par: 14,
    tip: "Almost at the Grand Trophy! You can do it!"
  },
  {
    id: 50,
    title: "Grand Champion Final",
    world: "Master Academy",
    width: 8,
    height: 8,
    start: { x: 0, y: 4 },
    gem: { x: 7, y: 4 },
    blockers: [
      { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 5 }, { x: 2, y: 6 },
      { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 5, y: 6 },
      { x: 3, y: 1 }, { x: 4, y: 1 },
      { x: 3, y: 7 }, { x: 4, y: 7 }
    ],
    pits: [
      { x: 3, y: 4 }, { x: 4, y: 4 },
      { x: 2, y: 4 }, { x: 5, y: 4 }
    ],
    par: 15,
    tip: "The Ultimate Challenge! Beat this to unlock the Royal Crown & Trophy!"
  }
];

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVELS };
}
