// customizer.js - Robot Customization, Wardrobe & Unlock Milestone System

const CUSTOM_ITEMS = {
  colors: [
    { id: "classic_blue", name: "Sky Blue", unlockLevel: 1, icon: "🟦" },
    { id: "mint_green", name: "Lime Mint", unlockLevel: 5, icon: "🟩" },
    { id: "bubblegum_pink", name: "Bubblegum", unlockLevel: 5, icon: "🌸" },
    { id: "golden_knight", name: "Knight Gold", unlockLevel: 20, icon: "🏆" },
    { id: "cyber_neon", name: "Cyber Neon", unlockLevel: 40, icon: "⚡" },
    { id: "rainbow_hologram", name: "Rainbow Holo", unlockLevel: 40, icon: "🌈" }
  ],
  headgear: [
    { id: "antenna_ball", name: "Antenna", unlockLevel: 1, icon: "📡" },
    { id: "propeller_cap", name: "Propeller Cap", unlockLevel: 10, icon: "🚁" },
    { id: "astronaut_helmet", name: "Space Bubble", unlockLevel: 25, icon: "🧑‍🚀" },
    { id: "pirate_hat", name: "Pirate Hat", unlockLevel: 35, icon: "🏴‍☠️" },
    { id: "wizard_hat", name: "Wizard Hat", unlockLevel: 45, icon: "🧙‍♂️" },
    { id: "royal_crown", name: "Royal Crown", unlockLevel: 50, icon: "👑" }
  ],
  eyes: [
    { id: "friendly_big", name: "Happy Eyes", unlockLevel: 1, icon: "👀" },
    { id: "star_eyes", name: "Star Eyes", unlockLevel: 15, icon: "⭐" },
    { id: "heart_eyes", name: "Heart Eyes", unlockLevel: 15, icon: "💖" },
    { id: "cool_shades", name: "Cool Shades", unlockLevel: 25, icon: "😎" },
    { id: "cyber_visor", name: "Cyber Visor", unlockLevel: 40, icon: "🥽" }
  ],
  mobility: [
    { id: "treads", name: "Tank Treads", unlockLevel: 1, icon: "🚜" },
    { id: "dual_wheels", name: "Monster Wheels", unlockLevel: 20, icon: "🛞" },
    { id: "pogo_spring", name: "Pogo Spring", unlockLevel: 20, icon: "🦘" },
    { id: "rocket_thruster", name: "Rocket Jet", unlockLevel: 30, icon: "🚀" },
    { id: "royal_chariot", name: "Royal Hover", unlockLevel: 50, icon: "✨" }
  ]
};

// Rewards unlocked specifically at milestone levels
const MILESTONE_REWARDS = {
  5: {
    title: "Level 5 Reached! New Colors!",
    description: "You unlocked Lime Mint & Bubblegum Pink colors for your robot!",
    items: [{ category: "colors", id: "mint_green" }, { category: "colors", id: "bubblegum_pink" }]
  },
  10: {
    title: "Level 10 Reached! Propeller Hat!",
    description: "You unlocked the spinning Propeller Cap!",
    items: [{ category: "headgear", id: "propeller_cap" }]
  },
  15: {
    title: "Level 15 Reached! Expressive Visors!",
    description: "You unlocked Star Eyes & Heart Eyes for your robot!",
    items: [{ category: "eyes", id: "star_eyes" }, { category: "eyes", id: "heart_eyes" }]
  },
  20: {
    title: "Level 20 Reached! Golden Armor & Wheels!",
    description: "You unlocked Knight Gold paint, Monster Wheels & Pogo Spring!",
    items: [
      { category: "colors", id: "golden_knight" },
      { category: "mobility", id: "dual_wheels" },
      { category: "mobility", id: "pogo_spring" }
    ]
  },
  25: {
    title: "Level 25 Reached! Space Explorer!",
    description: "You unlocked Astronaut Bubble Helmet & Cool Shades!",
    items: [{ category: "headgear", id: "astronaut_helmet" }, { category: "eyes", id: "cool_shades" }]
  },
  30: {
    title: "Level 30 Reached! Rocket Thrusters!",
    description: "You unlocked high-powered Rocket Thrusters with real jet flames!",
    items: [{ category: "mobility", id: "rocket_thruster" }]
  },
  35: {
    title: "Level 35 Reached! Pirate Captain!",
    description: "Ahoy! You unlocked the Pirate Captain Hat!",
    items: [{ category: "headgear", id: "pirate_hat" }]
  },
  40: {
    title: "Level 40 Reached! Cyber Neon & Rainbow!",
    description: "You unlocked Cyber Neon & Rainbow Hologram paint, plus Cyber Visor!",
    items: [
      { category: "colors", id: "cyber_neon" },
      { category: "colors", id: "rainbow_hologram" },
      { category: "eyes", id: "cyber_visor" }
    ]
  },
  45: {
    title: "Level 45 Reached! Magic Wizard!",
    description: "You unlocked the mystical Wizard Hat!",
    items: [{ category: "headgear", id: "wizard_hat" }]
  },
  50: {
    title: "🏆 GRAND CHAMPION! Royal Regalia!",
    description: "You completed all 50 levels! You unlocked the Royal Golden Crown and Royal Hover Chariot!",
    items: [
      { category: "headgear", id: "royal_crown" },
      { category: "mobility", id: "royal_chariot" }
    ]
  }
};

class CustomizerManager {
  constructor() {
    this.equipped = this.loadEquipped();
    this.currentTab = "colors";
  }

  loadEquipped() {
    const saved = localStorage.getItem("robostep_equipped");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      color: "classic_blue",
      headgear: "antenna_ball",
      eyes: "friendly_big",
      mobility: "treads"
    };
  }

  saveEquipped() {
    localStorage.setItem("robostep_equipped", JSON.stringify(this.equipped));
  }

  equip(category, itemId) {
    if (category === "colors") this.equipped.color = itemId;
    else if (category === "headgear") this.equipped.headgear = itemId;
    else if (category === "eyes") this.equipped.eyes = itemId;
    else if (category === "mobility") this.equipped.mobility = itemId;

    this.saveEquipped();
  }

  isUnlocked(category, itemId, maxLevelUnlocked) {
    const items = CUSTOM_ITEMS[category] || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return false;
    return maxLevelUnlocked >= item.unlockLevel;
  }

  getMilestoneReward(level) {
    return MILESTONE_REWARDS[level] || null;
  }
}

const Customizer = new CustomizerManager();
