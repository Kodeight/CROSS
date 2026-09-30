/**
 * Generates high-fidelity vector character portraits matching the exact 3D in-game designs.
 * Outputs to public/assets/character-previews/{id}.svg
 */
import * as fs from 'fs';
import * as path from 'path';
import { CHARACTERS } from '../src/config/characters.config';

const OUT_DIR = path.resolve('public/assets/character-previews');
fs.mkdirSync(OUT_DIR, { recursive: true });

function hex(c: number): string {
  return '#' + (c >>> 0).toString(16).padStart(6, '0');
}

for (const c of CHARACTERS) {
  const bodyHex = hex(c.body);
  const accentHex = hex(c.accent);
  const beakHex = hex(c.beak);
  const combHex = hex(c.comb);
  const feetHex = hex(c.feet);

  let accessoriesSvg = '';

  switch (c.id) {
    case 'chicken': // Classic Chicken
      accessoriesSvg = `
        <!-- Classic Chicken Red Wattle & Comb -->
        <path d="M96,68 Q100,60 100,50 Q100,38 96,30 Q92,38 92,50 Q92,60 96,68" fill="${combHex}" />
        <circle cx="90" cy="44" r="7" fill="${combHex}" />
        <circle cx="102" cy="44" r="7" fill="${combHex}" />
        <!-- Wattle -->
        <path d="M96,120 Q92,132 96,138 Q100,132 96,120" fill="${combHex}" />
      `;
      break;

    case 'river': // Sailor Duck
      accessoriesSvg = `
        <!-- Sailor Cap -->
        <ellipse cx="96" cy="42" rx="26" ry="10" fill="#FFFFFF" stroke="#0F2657" stroke-width="2.5" />
        <path d="M74,42 Q96,28 118,42 L116,36 Q96,24 76,36 Z" fill="#2E86DE" />
        <circle cx="96" cy="30" r="4" fill="#E63946" />
        <path d="M96,30 L112,24 M96,30 L114,32" stroke="#2E86DE" stroke-width="2.5" stroke-linecap="round" />
        <!-- Sailor Collar / Buoy -->
        <ellipse cx="96" cy="142" rx="34" ry="12" fill="#FFFFFF" stroke="#E63946" stroke-width="4" stroke-dasharray="14 10" />
      `;
      break;

    case 'beach': // Beach Chicken
      accessoriesSvg = `
        <!-- Cool Sunglasses -->
        <path d="M72,82 Q82,80 92,84 Q96,85 100,84 Q110,80 120,82 L118,96 Q108,102 98,96 L96,94 L94,96 Q84,102 74,96 Z" fill="#181A1F" stroke="#FCA71D" stroke-width="2" />
        <line x1="74" y1="84" x2="88" y2="92" stroke="#FFFFFF" stroke-width="1.5" opacity="0.6" stroke-linecap="round" />
        <line x1="104" y1="84" x2="118" y2="92" stroke="#FFFFFF" stroke-width="1.5" opacity="0.6" stroke-linecap="round" />
        <!-- Tropical Floral Lei Garland -->
        <circle cx="76" cy="136" r="6" fill="#FF4757" />
        <circle cx="86" cy="144" r="6" fill="#FFA502" />
        <circle cx="96" cy="146" r="6" fill="#2ED573" />
        <circle cx="106" cy="144" r="6" fill="#1E90FF" />
        <circle cx="116" cy="136" r="6" fill="#FF6B81" />
      `;
      break;

    case 'forest': // Forest Archer
      accessoriesSvg = `
        <!-- Forest Archer Hood -->
        <path d="M68,70 Q96,28 124,70 Q130,100 120,115 Q96,122 72,115 Q62,100 68,70 Z" fill="#2ED573" stroke="#188F3A" stroke-width="2.5" opacity="0.95" />
        <!-- Archer Feather -->
        <path d="M112,44 Q128,26 136,18 Q130,30 118,48 Z" fill="#E63946" />
      `;
      break;

    case 'desert': // Desert Explorer
      accessoriesSvg = `
        <!-- Flight Goggles -->
        <rect x="70" y="58" width="22" height="16" rx="4" fill="#B08B52" stroke="#2B2D42" stroke-width="2" />
        <circle cx="81" cy="66" r="6" fill="#6BD2FF" opacity="0.8" />
        <rect x="100" y="58" width="22" height="16" rx="4" fill="#B08B52" stroke="#2B2D42" stroke-width="2" />
        <circle cx="111" cy="66" r="6" fill="#6BD2FF" opacity="0.8" />
        <line x1="92" y1="66" x2="100" y2="66" stroke="#2B2D42" stroke-width="3" />
        <!-- Sand Cravat -->
        <path d="M86,134 L96,150 L106,134 Z" fill="#ECCC68" stroke="#B08B52" stroke-width="1.5" />
      `;
      break;

    case 'snow': // Winter Snow
      accessoriesSvg = `
        <!-- Winter Knit Beanie -->
        <path d="M72,64 Q96,36 120,64 Q122,72 118,76 Q96,72 74,76 Z" fill="#70A1FF" stroke="#1E90FF" stroke-width="2" />
        <circle cx="96" cy="38" r="8" fill="#FFFFFF" stroke="#70A1FF" stroke-width="1.5" />
        <!-- Warm Scarf -->
        <path d="M70,126 Q96,136 122,126 Q124,136 120,142 Q96,148 72,142 Z" fill="#FF4757" stroke="#991B1B" stroke-width="2" />
        <rect x="106" y="136" width="12" height="24" rx="3" fill="#FF4757" stroke="#991B1B" stroke-width="1.5" />
      `;
      break;

    case 'farm': // Farmer Chicken
      accessoriesSvg = `
        <!-- Straw Hat -->
        <ellipse cx="96" cy="50" rx="38" ry="12" fill="#ECCC68" stroke="#B08B52" stroke-width="2.5" />
        <path d="M78,50 Q96,32 114,50 Z" fill="#F1C40F" stroke="#B08B52" stroke-width="2" />
        <path d="M82,50 Q96,44 110,50" stroke="#E63946" stroke-width="3" fill="none" />
        <!-- Denim Overalls -->
        <rect x="80" y="132" width="32" height="22" rx="4" fill="#3742FA" stroke="#0F2657" stroke-width="2" />
        <line x1="84" y1="126" x2="84" y2="134" stroke="#3742FA" stroke-width="3.5" />
        <line x1="108" y1="126" x2="108" y2="134" stroke="#3742FA" stroke-width="3.5" />
      `;
      break;

    case 'jungle': // Safari Explorer
      accessoriesSvg = `
        <!-- Safari Pith Helmet -->
        <ellipse cx="96" cy="52" rx="34" ry="10" fill="#B08B52" stroke="#5F4B32" stroke-width="2" />
        <path d="M76,52 Q96,34 116,52 Z" fill="#C8A165" stroke="#5F4B32" stroke-width="2" />
        <path d="M82,52 Q96,46 110,52" stroke="#2ED573" stroke-width="3" fill="none" />
      `;
      break;

    case 'night_city': // Cyberpunk DJ
      accessoriesSvg = `
        <!-- Neon Cyber Visor -->
        <path d="M70,78 Q96,72 122,78 L120,90 Q96,96 72,90 Z" fill="#38E1FF" opacity="0.85" stroke="#0954A3" stroke-width="2" />
        <line x1="76" y1="84" x2="116" y2="84" stroke="#FFFFFF" stroke-width="2" opacity="0.7" />
        <!-- DJ Headphones -->
        <path d="M64,84 Q96,36 128,84" stroke="#FF3FB4" stroke-width="5" fill="none" />
        <rect x="60" y="78" width="10" height="18" rx="4" fill="#FF3FB4" stroke="#0F2657" stroke-width="1.5" />
        <rect x="122" y="78" width="10" height="18" rx="4" fill="#FF3FB4" stroke="#0F2657" stroke-width="1.5" />
      `;
      break;

    case 'volcano': // Magma Chicken
      accessoriesSvg = `
        <!-- Obsidian Lava Armor & Fiery Comb -->
        <path d="M96,68 Q102,52 98,34 Q90,44 94,56 Z" fill="#FF5252" />
        <path d="M96,48 Q106,32 108,24 Q98,34 96,44 Z" fill="#FFA502" />
        <!-- Fiery Lava Cracks -->
        <path d="M82,106 Q90,114 86,124 Q96,122 104,130 Q100,118 108,112" stroke="#FF5252" stroke-width="2.5" fill="none" stroke-linecap="round" />
        <circle cx="86" cy="116" r="3" fill="#FFA502" />
        <circle cx="102" cy="122" r="3.5" fill="#FFE853" />
      `;
      break;

    case 'airport': // Airline Pilot
      accessoriesSvg = `
        <!-- Pilot Captain Cap -->
        <ellipse cx="96" cy="46" rx="28" ry="8" fill="#1E272E" stroke="#0F2657" stroke-width="2" />
        <path d="M76,46 Q96,30 116,46 Z" fill="#2F3542" stroke="#0F2657" stroke-width="2" />
        <polygon points="96,40 92,44 100,44" fill="#F1C40F" />
        <!-- Golden Wings Badge -->
        <path d="M88,44 Q96,40 104,44" stroke="#F1C40F" stroke-width="2" fill="none" />
        <!-- Pilot Tie -->
        <polygon points="94,124 98,124 100,146 96,150 92,146" fill="#1E272E" stroke="#0F2657" stroke-width="1.5" />
      `;
      break;

    case 'harbor': // Navy Captain
      accessoriesSvg = `
        <!-- Navy Captain Cap -->
        <ellipse cx="96" cy="46" rx="30" ry="9" fill="#1E3799" stroke="#0F2657" stroke-width="2" />
        <path d="M74,46 Q96,28 118,46 Z" fill="#0C2461" stroke="#0F2657" stroke-width="2" />
        <circle cx="96" cy="38" r="4" fill="#F1C40F" />
        <!-- Gold Trim -->
        <path d="M78,46 Q96,40 114,46" stroke="#F1C40F" stroke-width="2.5" fill="none" />
      `;
      break;

    case 'highway': // Biker Racer
      accessoriesSvg = `
        <!-- Racing Helmet -->
        <path d="M68,76 Q96,30 124,76 Q128,102 118,114 Q96,120 74,114 Q64,102 68,76 Z" fill="#FF4757" stroke="#991B1B" stroke-width="2.5" />
        <!-- Racing Stripe -->
        <path d="M92,38 L100,38 L100,118 L92,118 Z" fill="#FFFFFF" />
        <!-- Dark Visor -->
        <path d="M76,80 Q96,74 116,80 L114,94 Q96,98 78,94 Z" fill="#181A1F" stroke="#2F3542" stroke-width="2" />
      `;
      break;

    case 'candy': // Candy Princess
      accessoriesSvg = `
        <!-- Giant Pink Candy Bow -->
        <path d="M76,34 L96,44 L76,54 Z M116,34 L96,44 L116,54 Z" fill="#FF9FF3" stroke="#D980FA" stroke-width="2" />
        <circle cx="96" cy="44" r="5" fill="#FFC312" />
        <!-- Sweet Polka Dots -->
        <circle cx="82" cy="116" r="3.5" fill="#FF9FF3" />
        <circle cx="106" cy="120" r="4" fill="#12CBC4" />
        <circle cx="94" cy="132" r="3.5" fill="#FDA7DF" />
      `;
      break;

    case 'ruins': // Pharaoh
      accessoriesSvg = `
        <!-- Royal Nemes Headdress -->
        <path d="M66,74 Q96,30 126,74 L132,112 L120,116 L118,80 Q96,72 74,80 L72,116 L60,112 Z" fill="#F1C40F" stroke="#B08B52" stroke-width="2" />
        <path d="M72,50 Q96,42 120,50 M70,64 Q96,56 122,64 M68,78 Q96,70 124,78" stroke="#3867D6" stroke-width="3" fill="none" />
        <!-- Uraeus Golden Cobra -->
        <path d="M96,42 Q98,34 94,30 Q98,24 96,20" stroke="#F1C40F" stroke-width="3" fill="none" stroke-linecap="round" />
      `;
      break;

    case 'space': // Astronaut
      accessoriesSvg = `
        <!-- Astronaut Bubble Helmet -->
        <circle cx="96" cy="74" r="34" fill="none" stroke="#CED6E0" stroke-width="5" />
        <!-- Golden Reflective Visor -->
        <ellipse cx="96" cy="74" rx="24" ry="18" fill="#F1C40F" opacity="0.85" stroke="#B08B52" stroke-width="2" />
        <line x1="82" y1="66" x2="104" y2="78" stroke="#FFFFFF" stroke-width="2" opacity="0.7" stroke-linecap="round" />
        <!-- Oxygen Collar -->
        <ellipse cx="96" cy="114" rx="30" ry="8" fill="#CED6E0" stroke="#747D8C" stroke-width="2" />
      `;
      break;

    case 'tokyo': // Samurai
      accessoriesSvg = `
        <!-- Samurai Red Kabuto Helmet -->
        <path d="M68,70 Q96,30 124,70 Q130,86 124,96 L120,92 Q96,84 72,92 L68,96 Q62,86 68,70 Z" fill="#E74C3C" stroke="#991B1B" stroke-width="2.5" />
        <!-- Golden Maedate Crest -->
        <polygon points="96,26 90,44 102,44" fill="#F1C40F" stroke="#B08B52" stroke-width="1.5" />
        <path d="M84,38 Q96,30 108,38" stroke="#F1C40F" stroke-width="2.5" fill="none" />
      `;
      break;

    case 'wildlife': // Wildlife Guide
      accessoriesSvg = `
        <!-- Safari Ranger Hat -->
        <ellipse cx="96" cy="50" rx="34" ry="10" fill="#B08B52" stroke="#5F4B32" stroke-width="2" />
        <path d="M78,50 Q96,34 114,50 Z" fill="#C8A165" stroke="#5F4B32" stroke-width="2" />
        <!-- Camera Strap & Lens -->
        <line x1="72" y1="110" x2="114" y2="146" stroke="#2F3542" stroke-width="2.5" />
        <rect x="98" y="132" width="18" height="14" rx="2" fill="#2F3542" stroke="#181A1F" stroke-width="1.5" />
        <circle cx="107" cy="139" r="4" fill="#6BD2FF" stroke="#0F2657" stroke-width="1" />
      `;
      break;

    case 'underwater': // Scuba Diver
      accessoriesSvg = `
        <!-- Scuba Mask -->
        <rect x="72" y="74" width="48" height="20" rx="8" fill="#0ABDE3" stroke="#0954A3" stroke-width="2.5" opacity="0.9" />
        <circle cx="84" cy="84" r="6" fill="#FFFFFF" opacity="0.4" />
        <circle cx="108" cy="84" r="6" fill="#FFFFFF" opacity="0.4" />
        <!-- Curved Snorkel Tube -->
        <path d="M120,86 Q128,86 130,76 L130,50 Q130,42 136,42" stroke="#FFA502" stroke-width="4" fill="none" stroke-linecap="round" />
      `;
      break;

    case 'sky_island': // Aviator
      accessoriesSvg = `
        <!-- Leather Flight Helmet -->
        <path d="M70,68 Q96,32 122,68 Q126,92 122,106 L118,102 Q96,96 74,102 L70,106 Q66,92 70,68 Z" fill="#A0522D" stroke="#5C2C16" stroke-width="2" />
        <!-- Aviator Brass Goggles -->
        <circle cx="82" cy="72" r="7" fill="#6BD2FF" stroke="#F1C40F" stroke-width="2.5" opacity="0.8" />
        <circle cx="110" cy="72" r="7" fill="#6BD2FF" stroke="#F1C40F" stroke-width="2.5" opacity="0.8" />
        <line x1="89" y1="72" x2="103" y2="72" stroke="#F1C40F" stroke-width="2.5" />
        <!-- Billowing Orange Scarf -->
        <path d="M76,126 Q96,134 116,126 Q128,136 138,130" stroke="#E67E22" stroke-width="5" fill="none" stroke-linecap="round" />
      `;
      break;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Studio Ambient Gradient -->
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#EAE5D8" stop-opacity="0.9" />
    </radialGradient>
    <!-- Soft Contact Shadow -->
    <radialGradient id="dropShadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0F2657" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#0F2657" stop-opacity="0" />
    </radialGradient>
    <!-- 3D Body Shading -->
    <radialGradient id="bodyShade" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.75" />
      <stop offset="70%" stop-color="${bodyHex}" />
      <stop offset="100%" stop-color="#0F2657" stop-opacity="0.18" />
    </radialGradient>
  </defs>

  <!-- Card Background Shimmer -->
  <rect width="200" height="200" rx="20" fill="url(#bgGlow)" />

  <!-- Ground Contact Shadow -->
  <ellipse cx="96" cy="180" rx="42" ry="12" fill="url(#dropShadow)" />

  <!-- Feet -->
  <rect x="76" y="166" width="12" height="14" rx="4" fill="${feetHex}" stroke="#B08B52" stroke-width="1.5" />
  <rect x="104" y="166" width="12" height="14" rx="4" fill="${feetHex}" stroke="#B08B52" stroke-width="1.5" />

  <!-- Chicken Plump Body -->
  <ellipse cx="96" cy="132" rx="34" ry="28" fill="url(#bodyShade)" stroke="#0F2657" stroke-width="2.5" />

  <!-- Side Wings -->
  <ellipse cx="64" cy="132" rx="8" ry="16" fill="${bodyHex}" stroke="#0F2657" stroke-width="2" transform="rotate(-8 64 132)" />
  <ellipse cx="128" cy="132" rx="8" ry="16" fill="${bodyHex}" stroke="#0F2657" stroke-width="2" transform="rotate(8 128 132)" />

  <!-- Chicken Round Head -->
  <circle cx="96" cy="82" r="28" fill="url(#bodyShade)" stroke="#0F2657" stroke-width="2.5" />

  <!-- Default Red Comb (when not covered by hat) -->
  ${accessoriesSvg.includes('comb') ? '' : `
  <path d="M96,56 Q100,48 96,40 Q90,48 96,56" fill="${combHex}" />
  <circle cx="90" cy="50" r="5" fill="${combHex}" />
  <circle cx="102" cy="50" r="5" fill="${combHex}" />
  `}

  <!-- Expressive Eyes -->
  <ellipse cx="84" cy="80" rx="4.5" ry="6" fill="#181A1F" />
  <circle cx="85.5" cy="78" r="1.8" fill="#FFFFFF" />
  <ellipse cx="108" cy="80" rx="4.5" ry="6" fill="#181A1F" />
  <circle cx="109.5" cy="78" r="1.8" fill="#FFFFFF" />

  <!-- Cute Beak -->
  <polygon points="96,82 88,96 104,96" fill="${beakHex}" stroke="#D97706" stroke-width="1.5" />

  <!-- Character Specific Accessories & Outfit -->
  ${accessoriesSvg}
</svg>
`;

  fs.writeFileSync(path.join(OUT_DIR, `${c.id}.svg`), svg.trim());
}

console.log(`Generated ${CHARACTERS.length} character preview SVG portraits in ${OUT_DIR}`);
