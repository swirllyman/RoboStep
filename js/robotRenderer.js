// robotRenderer.js - Modular SVG Robot Rendering with Dynamic Customizations

class RobotRenderer {
  constructor() {
    // Default appearance
    this.defaultConfig = {
      color: "classic_blue",
      headgear: "antenna_ball",
      eyes: "friendly_big",
      mobility: "treads"
    };

    this.colorPalettes = {
      classic_blue: {
        primary: "#3B82F6",
        secondary: "#1D4ED8",
        accent: "#60A5FA",
        glow: "rgba(59, 130, 246, 0.4)",
        screen: "#1E293B"
      },
      mint_green: {
        primary: "#10B981",
        secondary: "#047857",
        accent: "#34D399",
        glow: "rgba(16, 185, 129, 0.4)",
        screen: "#064E3B"
      },
      bubblegum_pink: {
        primary: "#EC4899",
        secondary: "#BE185D",
        accent: "#F472B6",
        glow: "rgba(236, 72, 153, 0.4)",
        screen: "#831843"
      },
      golden_knight: {
        primary: "#F59E0B",
        secondary: "#B45309",
        accent: "#FDE68A",
        glow: "rgba(245, 158, 11, 0.5)",
        screen: "#78350F"
      },
      cyber_neon: {
        primary: "#8B5CF6",
        secondary: "#4C1D95",
        accent: "#06B6D4",
        glow: "rgba(6, 182, 212, 0.6)",
        screen: "#0F172A"
      },
      rainbow_hologram: {
        primary: "url(#rainbowGrad)",
        secondary: "#7C3AED",
        accent: "#F43F5E",
        glow: "rgba(244, 63, 94, 0.5)",
        screen: "#1E1B4B"
      }
    };
  }

  // Generate SVG string for robot with the given custom configuration and direction
  renderSVG(config = {}, options = {}) {
    const active = { ...this.defaultConfig, ...config };
    const palette = this.colorPalettes[active.color] || this.colorPalettes.classic_blue;
    const direction = options.direction || "DOWN"; // UP, DOWN, LEFT, RIGHT
    const state = options.state || "idle"; // idle, walking, bump, fall, victory
    const size = options.size || 80;

    // Directional eye offsets & flip
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    let flipX = 1;
    let headTurnClass = "";

    if (direction === "LEFT") {
      eyeOffsetX = -5;
      flipX = -1;
    } else if (direction === "RIGHT") {
      eyeOffsetX = 5;
    } else if (direction === "UP") {
      eyeOffsetY = -5;
      headTurnClass = "facing-up";
    } else if (direction === "DOWN") {
      eyeOffsetY = 3;
    }

    return `
      <svg class="robot-svg ${state} ${headTurnClass}" viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#EC4899" />
            <stop offset="35%" stop-color="#8B5CF6" />
            <stop offset="70%" stop-color="#06B6D4" />
            <stop offset="100%" stop-color="#10B981" />
          </linearGradient>
          <linearGradient id="metalShine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
          </linearGradient>
          <filter id="robotGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform="translate(50, 50) scale(${flipX}, 1) translate(-50, -50)">
          <!-- Mobility Base (Treads / Wheels / Thruster) -->
          ${this.renderMobility(active.mobility, palette)}

          <!-- Body Chassis -->
          ${this.renderBody(palette, active.color)}

          <!-- Head & Screen -->
          ${this.renderHead(palette, direction)}

          <!-- Eyes / Visor -->
          ${this.renderEyes(active.eyes, eyeOffsetX, eyeOffsetY, direction)}

          <!-- Headgear / Hat / Antenna -->
          ${this.renderHeadgear(active.headgear)}

          <!-- Robot Hands / Cute Paws -->
          <circle cx="21" cy="58" r="4.5" fill="${palette.secondary}" stroke="#1E293B" stroke-width="1.5" />
          <circle cx="79" cy="58" r="4.5" fill="${palette.secondary}" stroke="#1E293B" stroke-width="1.5" />
        </g>
      </svg>
    `;
  }

  renderBody(palette, colorKey) {
    return `
      <!-- Body -->
      <rect x="26" y="46" width="48" height="28" rx="8" fill="${palette.primary}" stroke="${palette.secondary}" stroke-width="2.5" />
      <!-- Chest Light / Dial -->
      <circle cx="50" cy="60" r="6" fill="${palette.screen}" stroke="${palette.accent}" stroke-width="1.5" />
      <circle cx="50" cy="60" r="3" fill="${palette.accent}" />
      <!-- Body highlights -->
      <rect x="29" y="48" width="42" height="6" rx="3" fill="url(#metalShine)" />
      <!-- Side Bolts -->
      <circle cx="30" cy="67" r="1.8" fill="${palette.secondary}" />
      <circle cx="70" cy="67" r="1.8" fill="${palette.secondary}" />
    `;
  }

  renderHead(palette, direction) {
    return `
      <!-- Head Base -->
      <rect x="28" y="20" width="44" height="28" rx="8" fill="${palette.primary}" stroke="${palette.secondary}" stroke-width="2.5" />
      <!-- Head Shine -->
      <rect x="31" y="22" width="38" height="5" rx="2.5" fill="url(#metalShine)" />
      
      <!-- Face Screen (Hidden or rear if facing UP) -->
      ${direction === "UP" ? `
        <rect x="34" y="27" width="32" height="15" rx="4" fill="${palette.secondary}" opacity="0.6" />
        <line x1="42" y1="31" x2="58" y2="31" stroke="${palette.accent}" stroke-width="2" stroke-dasharray="3,2" />
      ` : `
        <rect x="33" y="25" width="34" height="19" rx="5" fill="${palette.screen}" stroke="#0F172A" stroke-width="1.5" />
      `}
      <!-- Ear Pods -->
      <rect x="23" y="28" width="5" height="12" rx="2" fill="${palette.secondary}" />
      <rect x="72" y="28" width="5" height="12" rx="2" fill="${palette.secondary}" />
    `;
  }

  renderEyes(eyeType, offsetX, offsetY, direction) {
    if (direction === "UP") return ""; // Facing away, eyes not visible

    const cx1 = 43 + offsetX;
    const cx2 = 57 + offsetX;
    const cy = 34 + offsetY;

    switch (eyeType) {
      case "star_eyes":
        return `
          <!-- Star Eyes -->
          <g fill="#FBBF24" stroke="#D97706" stroke-width="0.8">
            <polygon points="${cx1},${cy-5} ${cx1+1.5},${cy-1.5} ${cx1+5},${cy} ${cx1+1.5},${cy+1.5} ${cx1},${cy+5} ${cx1-1.5},${cy+1.5} ${cx1-5},${cy} ${cx1-1.5},${cy-1.5}" />
            <polygon points="${cx2},${cy-5} ${cx2+1.5},${cy-1.5} ${cx2+5},${cy} ${cx2+1.5},${cy+1.5} ${cx2},${cy+5} ${cx2-1.5},${cy+1.5} ${cx2-5},${cy} ${cx2-1.5},${cy-1.5}" />
          </g>
        `;

      case "heart_eyes":
        return `
          <!-- Heart Eyes -->
          <g fill="#F43F5E">
            <path d="M ${cx1} ${cy+3} C ${cx1-5} ${cy-3}, ${cx1-5} ${cy-7}, ${cx1} ${cy-5} C ${cx1+5} ${cy-7}, ${cx1+5} ${cy-3}, ${cx1} ${cy+3} Z" transform="scale(0.8) translate(${cx1*0.25}, ${cy*0.25})" />
            <path d="M ${cx2} ${cy+3} C ${cx2-5} ${cy-3}, ${cx2-5} ${cy-7}, ${cx2} ${cy-5} C ${cx2+5} ${cy-7}, ${cx2+5} ${cy-3}, ${cx2} ${cy+3} Z" transform="scale(0.8) translate(${cx2*0.25}, ${cy*0.25})" />
          </g>
        `;

      case "cool_shades":
        return `
          <!-- Cool Sunglasses -->
          <path d="M ${cx1-7} ${cy-3} L ${cx2+7} ${cy-3} L ${cx2+6} ${cy+4} L ${cx2-4} ${cy+4} L 50 ${cy} L ${cx1+4} ${cy+4} L ${cx1-6} ${cy+4} Z" fill="#18181B" stroke="#71717A" stroke-width="1" />
          <line x1="${cx1-5}" y1="${cy-1}" x2="${cx1-1}" y2="${cy+2}" stroke="#FFFFFF" stroke-width="1" />
          <line x1="${cx2+1}" y1="${cy-1}" x2="${cx2+5}" y2="${cy+2}" stroke="#FFFFFF" stroke-width="1" />
        `;

      case "cyber_visor":
        return `
          <!-- Cyber Visor -->
          <rect x="34" y="30" width="32" height="8" rx="3" fill="#06B6D4" filter="url(#robotGlow)" />
          <line x1="36" y1="34" x2="64" y2="34" stroke="#FFFFFF" stroke-width="1.5" />
        `;

      case "friendly_big":
      default:
        return `
          <!-- Friendly Big Eyes -->
          <circle cx="${cx1}" cy="${cy}" r="4.5" fill="#38BDF8" />
          <circle cx="${cx2}" cy="${cy}" r="4.5" fill="#38BDF8" />
          <!-- Pupils & Sparkle -->
          <circle cx="${cx1+0.8}" cy="${cy-0.8}" r="2" fill="#FFFFFF" />
          <circle cx="${cx2+0.8}" cy="${cy-0.8}" r="2" fill="#FFFFFF" />
          <!-- Cute blush dots -->
          <circle cx="${cx1-4}" cy="${cy+5}" r="2" fill="#FB7185" opacity="0.6" />
          <circle cx="${cx2+4}" cy="${cy+5}" r="2" fill="#FB7185" opacity="0.6" />
        `;
    }
  }

  renderHeadgear(gearType) {
    switch (gearType) {
      case "propeller_cap":
        return `
          <!-- Propeller Cap -->
          <path d="M 36 21 C 36 13, 64 13, 64 21 Z" fill="#EF4444" stroke="#B91C1C" stroke-width="1.5" />
          <rect x="48" y="11" width="4" height="6" fill="#FBBF24" />
          <ellipse class="propeller-blade" cx="50" cy="11" rx="14" ry="2.5" fill="#3B82F6" stroke="#1D4ED8" stroke-width="1" />
          <circle cx="50" cy="11" r="2.5" fill="#F59E0B" />
        `;

      case "astronaut_helmet":
        return `
          <!-- Astronaut Bubble Helmet -->
          <circle cx="50" cy="33" r="25" fill="rgba(147, 197, 253, 0.28)" stroke="#E2E8F0" stroke-width="2.5" />
          <path d="M 33 20 A 20 20 0 0 1 60 16" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8" />
        `;

      case "pirate_hat":
        return `
          <!-- Pirate Captain Hat -->
          <path d="M 22 21 C 26 8, 40 8, 50 14 C 60 8, 74 8, 78 21 C 72 20, 50 18, 22 21 Z" fill="#18181B" stroke="#D97706" stroke-width="1.5" />
          <!-- Jolly Roger Icon -->
          <circle cx="50" cy="16" r="2.5" fill="#FFFFFF" />
          <line x1="46" y1="18" x2="54" y2="18" stroke="#FFFFFF" stroke-width="1" />
        `;

      case "wizard_hat":
        return `
          <!-- Wizard Hat -->
          <path d="M 26 21 Q 48 5, 54 -2 Q 52 10, 74 21 Z" fill="#6366F1" stroke="#4338CA" stroke-width="1.5" />
          <!-- Gold Star on Hat -->
          <polygon points="50,9 51,12 54,12 51.5,13.5 52.5,16 50,14 47.5,16 48.5,13.5 46,12 49,12" fill="#FBBF24" />
          <!-- Brim -->
          <ellipse cx="50" cy="21" rx="25" ry="3" fill="#4F46E5" />
        `;

      case "royal_crown":
        return `
          <!-- Royal Golden Crown -->
          <path d="M 32 21 L 32 10 L 41 16 L 50 6 L 59 16 L 68 10 L 68 21 Z" fill="#F59E0B" stroke="#B45309" stroke-width="1.5" />
          <circle cx="32" cy="9" r="2.5" fill="#EF4444" />
          <circle cx="50" cy="5" r="3" fill="#3B82F6" />
          <circle cx="68" cy="9" r="2.5" fill="#10B981" />
          <line x1="34" y1="19" x2="66" y2="19" stroke="#FEF3C7" stroke-width="1.5" />
        `;

      case "antenna_ball":
      default:
        return `
          <!-- Cute Antenna -->
          <line x1="50" y1="20" x2="50" y2="10" stroke="#64748B" stroke-width="2.5" stroke-linecap="round" />
          <circle class="antenna-light" cx="50" cy="9" r="4.5" fill="#EF4444" stroke="#DC2626" stroke-width="1" />
          <circle cx="48.5" cy="7.5" r="1.5" fill="#FFFFFF" />
        `;
    }
  }

  renderMobility(mobilityType, palette) {
    switch (mobilityType) {
      case "dual_wheels":
        return `
          <!-- Dual Monster Wheels -->
          <rect x="18" y="68" width="12" height="18" rx="4" fill="#334155" stroke="#0F172A" stroke-width="2" />
          <rect x="70" y="68" width="12" height="18" rx="4" fill="#334155" stroke="#0F172A" stroke-width="2" />
          <circle cx="24" cy="77" r="3" fill="#94A3B8" />
          <circle cx="76" cy="77" r="3" fill="#94A3B8" />
          <line x1="30" y1="74" x2="70" y2="74" stroke="#475569" stroke-width="3" />
        `;

      case "pogo_spring":
        return `
          <!-- Pogo Bouncy Spring -->
          <path d="M 50 74 L 44 78 L 56 82 L 44 86 L 56 90 L 50 94" fill="none" stroke="#64748B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
          <ellipse cx="50" cy="94" rx="10" ry="3" fill="#334155" />
        `;

      case "rocket_thruster":
        return `
          <!-- Rocket Thrusters -->
          <polygon points="34,74 44,74 42,85 36,85" fill="#64748B" stroke="#334155" stroke-width="1" />
          <polygon points="56,74 66,74 64,85 58,85" fill="#64748B" stroke="#334155" stroke-width="1" />
          <!-- Animated Jet Flames -->
          <polygon class="rocket-flame" points="36,85 42,85 39,96" fill="#F97316" />
          <polygon class="rocket-flame-inner" points="37,85 41,85 39,92" fill="#FDE047" />
          <polygon class="rocket-flame" points="58,85 64,85 61,96" fill="#F97316" />
          <polygon class="rocket-flame-inner" points="59,85 63,85 61,92" fill="#FDE047" />
        `;

      case "royal_chariot":
        return `
          <!-- Royal Golden Chariot Hover Pads -->
          <rect x="22" y="74" width="56" height="8" rx="4" fill="#F59E0B" stroke="#B45309" stroke-width="1.5" />
          <ellipse cx="34" cy="85" rx="8" ry="2.5" fill="rgba(56, 189, 248, 0.7)" filter="url(#robotGlow)" />
          <ellipse cx="66" cy="85" rx="8" ry="2.5" fill="rgba(56, 189, 248, 0.7)" filter="url(#robotGlow)" />
        `;

      case "treads":
      default:
        return `
          <!-- Caterpillar Treads -->
          <rect x="22" y="72" width="56" height="12" rx="6" fill="#334155" stroke="#1E293B" stroke-width="2" />
          <circle cx="30" cy="78" r="3.5" fill="#64748B" />
          <circle cx="43" cy="78" r="3.5" fill="#64748B" />
          <circle cx="57" cy="78" r="3.5" fill="#64748B" />
          <circle cx="70" cy="78" r="3.5" fill="#64748B" />
        `;
    }
  }
}

// Global renderer instance
const RobotGraphics = new RobotRenderer();
