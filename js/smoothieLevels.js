// smoothieLevels.js - Smoothie Remix mode
//
// Same robot, same four arrows, one extra rule: the robot has to pick up
// EVERY ingredient on the recipe card before it takes them to the blender.
// Rolling over the blender early does nothing - the blender only whirs once
// the whole recipe is on board. Then the smoothie gets made, and the robot
// drinks it. Yum.
//
// Each level adds to the classic level fields:
// - recipe:      { name, emoji, color } shown on the recipe card and poured
//                into the blender glass as ingredients are collected
// - ingredients: [{ x, y, emoji, name }] every one must be collected
// - blender:     { x, y } the goal square (used instead of `gem`)
//
// scripts/verify_smoothie.js checks every level is collectable and that `par`
// is the true shortest collect-everything-then-blend route.

const SMOOTHIE_LEVELS = [
  {
    id: 1,
    title: "Berry Blast",
    world: "Smoothie Kitchen",
    recipe: { name: "Berry Blast", emoji: "🥤", color: "#EC4899" },
    width: 4,
    height: 4,
    start: { x: 0, y: 3 },
    blender: { x: 0, y: 0 },
    ingredients: [
      { x: 2, y: 3, emoji: "🍓", name: "Strawberry" },
      { x: 2, y: 1, emoji: "🫐", name: "Blueberry" }
    ],
    blockers: [],
    pits: [],
    par: 7,
    tip: "Grab the strawberry, then the blueberry, then head to the blender!"
  },
  {
    id: 2,
    title: "Banana Buzz",
    world: "Smoothie Kitchen",
    recipe: { name: "Banana Buzz", emoji: "🥤", color: "#FACC15" },
    width: 4,
    height: 4,
    start: { x: 3, y: 3 },
    blender: { x: 0, y: 0 },
    ingredients: [
      { x: 1, y: 3, emoji: "🍌", name: "Banana" },
      { x: 0, y: 1, emoji: "🥛", name: "Milk" }
    ],
    blockers: [],
    pits: [],
    par: 6,
    tip: "Pick up both, then take them up to the blender in the corner."
  },
  {
    id: 3,
    title: "Tropical Sunrise",
    world: "Smoothie Kitchen",
    recipe: { name: "Tropical Sunrise", emoji: "🥤", color: "#FB923C" },
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    blender: { x: 0, y: 1 },
    ingredients: [
      { x: 3, y: 0, emoji: "🍍", name: "Pineapple" },
      { x: 3, y: 3, emoji: "🥭", name: "Mango" },
      { x: 0, y: 3, emoji: "🍊", name: "Orange" }
    ],
    blockers: [],
    pits: [],
    par: 11,
    tip: "Three fruits this time! Loop around the kitchen to collect them all."
  },
  {
    id: 4,
    title: "Green Machine",
    world: "Smoothie Kitchen",
    recipe: { name: "Green Machine", emoji: "🥤", color: "#4ADE80" },
    width: 5,
    height: 5,
    start: { x: 0, y: 4 },
    blender: { x: 0, y: 0 },
    ingredients: [
      { x: 2, y: 4, emoji: "🥬", name: "Spinach" },
      { x: 4, y: 2, emoji: "🥝", name: "Kiwi" },
      { x: 2, y: 0, emoji: "🍏", name: "Green Apple" }
    ],
    blockers: [
      { x: 1, y: 2 },
      { x: 2, y: 2 }
    ],
    pits: [],
    par: 12,
    tip: "Boulders on the counter! Steer around them to reach every ingredient."
  },
  {
    id: 5,
    title: "Peachy Keen",
    world: "Smoothie Kitchen",
    recipe: { name: "Peachy Keen", emoji: "🥤", color: "#FDBA74" },
    width: 5,
    height: 5,
    start: { x: 2, y: 4 },
    blender: { x: 2, y: 2 },
    ingredients: [
      { x: 0, y: 4, emoji: "🍑", name: "Peach" },
      { x: 4, y: 4, emoji: "🍯", name: "Honey" },
      { x: 2, y: 1, emoji: "🥛", name: "Milk" }
    ],
    blockers: [
      { x: 1, y: 3 },
      { x: 3, y: 3 }
    ],
    pits: [],
    par: 12,
    tip: "The blender sits in the middle - the robot can roll over it, but it only works once everything is collected!"
  },
  {
    id: 6,
    title: "Melon Splash",
    world: "Smoothie Kitchen",
    recipe: { name: "Melon Splash", emoji: "🥤", color: "#FB7185" },
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    blender: { x: 0, y: 2 },
    ingredients: [
      { x: 2, y: 0, emoji: "🍉", name: "Watermelon" },
      { x: 4, y: 0, emoji: "🍓", name: "Strawberry" },
      { x: 4, y: 2, emoji: "🧊", name: "Ice" }
    ],
    blockers: [
      { x: 1, y: 1 },
      { x: 3, y: 1 }
    ],
    pits: [],
    par: 10,
    tip: "Sweep along the top shelf first, then come back down to the blender."
  },
  {
    id: 7,
    title: "Choco Monkey",
    world: "Smoothie Kitchen",
    recipe: { name: "Choco Monkey", emoji: "🥤", color: "#A16207" },
    width: 6,
    height: 6,
    start: { x: 0, y: 5 },
    blender: { x: 0, y: 0 },
    ingredients: [
      { x: 2, y: 5, emoji: "🍌", name: "Banana" },
      { x: 4, y: 4, emoji: "🍫", name: "Chocolate" },
      { x: 3, y: 1, emoji: "🥛", name: "Milk" },
      { x: 0, y: 1, emoji: "🥜", name: "Peanut" }
    ],
    blockers: [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 4, y: 2 }
    ],
    pits: [],
    par: 13,
    tip: "Four ingredients! Plan the whole route before you press Run."
  },
  {
    id: 8,
    title: "Dragon Dream",
    world: "Smoothie Kitchen",
    recipe: { name: "Dragon Dream", emoji: "🥤", color: "#C084FC" },
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    blender: { x: 0, y: 2 },
    ingredients: [
      { x: 2, y: 0, emoji: "🍈", name: "Melon" },
      { x: 4, y: 1, emoji: "🍇", name: "Grapes" },
      { x: 4, y: 3, emoji: "🍋", name: "Lemon" },
      { x: 1, y: 4, emoji: "🧊", name: "Ice" }
    ],
    blockers: [
      { x: 3, y: 2 },
      { x: 2, y: 4 }
    ],
    pits: [
      { x: 2, y: 2 }
    ],
    par: 14,
    tip: "Careful - there's a hole in the kitchen floor now!"
  },
  {
    id: 9,
    title: "Very Berry Deluxe",
    world: "Smoothie Kitchen",
    recipe: { name: "Very Berry Deluxe", emoji: "🥤", color: "#DB2777" },
    width: 6,
    height: 6,
    start: { x: 0, y: 5 },
    blender: { x: 5, y: 5 },
    ingredients: [
      { x: 0, y: 3, emoji: "🍓", name: "Strawberry" },
      { x: 2, y: 2, emoji: "🫐", name: "Blueberry" },
      { x: 4, y: 1, emoji: "🍒", name: "Cherry" },
      { x: 5, y: 3, emoji: "🍇", name: "Grapes" },
      { x: 3, y: 5, emoji: "🥛", name: "Milk" }
    ],
    blockers: [
      { x: 1, y: 1 },
      { x: 3, y: 3 }
    ],
    pits: [
      { x: 1, y: 4 },
      { x: 4, y: 4 }
    ],
    par: 17,
    tip: "Five berries for the deluxe! Count each step out loud as you go."
  },
  {
    id: 10,
    title: "Citrus Zing",
    world: "Smoothie Kitchen",
    recipe: { name: "Citrus Zing", emoji: "🥤", color: "#FACC15" },
    width: 7,
    height: 7,
    start: { x: 0, y: 6 },
    blender: { x: 0, y: 0 },
    ingredients: [
      { x: 3, y: 6, emoji: "🍋", name: "Lemon" },
      { x: 6, y: 4, emoji: "🍊", name: "Orange" },
      { x: 4, y: 2, emoji: "🥝", name: "Kiwi" },
      { x: 2, y: 0, emoji: "🍯", name: "Honey" }
    ],
    blockers: [
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 5, y: 1 }
    ],
    pits: [
      { x: 1, y: 2 },
      { x: 5, y: 5 }
    ],
    par: 18,
    tip: "A big kitchen! Take it one ingredient at a time."
  },
  {
    id: 11,
    title: "Rainbow Remix",
    world: "Smoothie Kitchen",
    recipe: { name: "Rainbow Remix", emoji: "🌈", color: "#8B5CF6" },
    width: 7,
    height: 7,
    start: { x: 3, y: 6 },
    blender: { x: 3, y: 3 },
    ingredients: [
      { x: 0, y: 6, emoji: "🍓", name: "Strawberry" },
      { x: 6, y: 6, emoji: "🍊", name: "Orange" },
      { x: 6, y: 0, emoji: "🍋", name: "Lemon" },
      { x: 0, y: 0, emoji: "🥝", name: "Kiwi" },
      { x: 3, y: 0, emoji: "🫐", name: "Blueberry" }
    ],
    blockers: [
      { x: 2, y: 3 },
      { x: 4, y: 3 },
      { x: 3, y: 2 }
    ],
    pits: [],
    par: 27,
    tip: "Every colour of the rainbow, and the blender is walled in on three sides!"
  },
  {
    id: 12,
    title: "Master Blender",
    world: "Smoothie Kitchen",
    recipe: { name: "Master Blender", emoji: "🏆", color: "#06B6D4" },
    width: 7,
    height: 7,
    start: { x: 0, y: 3 },
    blender: { x: 6, y: 3 },
    ingredients: [
      { x: 1, y: 0, emoji: "🍓", name: "Strawberry" },
      { x: 1, y: 6, emoji: "🍌", name: "Banana" },
      { x: 3, y: 3, emoji: "🥭", name: "Mango" },
      { x: 5, y: 0, emoji: "🥛", name: "Milk" },
      { x: 5, y: 6, emoji: "🧊", name: "Ice" }
    ],
    blockers: [
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 4, y: 2 },
      { x: 4, y: 4 }
    ],
    pits: [
      { x: 3, y: 1 },
      { x: 3, y: 5 }
    ],
    par: 26,
    tip: "The grand finale! Five ingredients, boulders and holes. You've got this!"
  }
];

// Export for Node.js test environment or browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SMOOTHIE_LEVELS };
}
