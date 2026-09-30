/**
 * CROSS! — ONE CHICKEN with 20 World-Themed Skins.
 * Directly matches the master character sheet reference board.
 */

export interface CharacterConfig {
  id: string;
  name: string;
  worldNum: string;
  worldName: string;
  cost: number;
  body: number;
  accent: number;
  beak: number;
  comb: number;
  feet: number;
  skinType: string;
}

export const CHARACTERS: CharacterConfig[] = [
  // 01 — City: Classic White Chicken
  { id: 'chicken', name: 'CLASSIC CHICKEN', worldNum: '01', worldName: 'CITY', cost: 0, body: 0xffffff, accent: 0xff4757, beak: 0xff9f1a, comb: 0xff2e44, feet: 0xff9f1a, skinType: 'classic' },
  // 02 — River: Sailor Duck Chicken with buoy & sailor cap
  { id: 'river', name: 'SAILOR CHICKEN', worldNum: '02', worldName: 'RIVER', cost: 350, body: 0xfff275, accent: 0x2e86de, beak: 0xff6b35, comb: 0xff4757, feet: 0xff793f, skinType: 'sailor_duck' },
  // 03 — Beach: Summer Vacation Chicken with sunglasses & lei
  { id: 'beach', name: 'BEACH CHICKEN', worldNum: '03', worldName: 'BEACH', cost: 750, body: 0xffffff, accent: 0xff6b81, beak: 0xff9f1a, comb: 0xff2e44, feet: 0xff9f1a, skinType: 'beach' },
  // 04 — Forest: Forest Archer Chicken with green hood & cape
  { id: 'forest', name: 'FOREST ARCHER', worldNum: '04', worldName: 'FOREST', cost: 1200, body: 0xffffff, accent: 0x2ed573, beak: 0xff9f1a, comb: 0xff2e44, feet: 0xe08a00, skinType: 'forest' },
  // 05 — Desert: Desert Explorer with flight goggles & cravat
  { id: 'desert', name: 'DESERT EXPLORER', worldNum: '05', worldName: 'DESERT', cost: 1800, body: 0xffffff, accent: 0xeccc68, beak: 0xff9f1a, comb: 0xff4757, feet: 0xe08a00, skinType: 'desert' },
  // 06 — Snow: Winter Snow Chicken with beanie & scarf
  { id: 'snow', name: 'WINTER CHICKEN', worldNum: '06', worldName: 'SNOW', cost: 2500, body: 0xffffff, accent: 0x70a1ff, beak: 0xff9f1a, comb: 0xff4757, feet: 0xff9f1a, skinType: 'snow' },
  // 07 — Farm: Farmer Chicken with straw hat & overalls
  { id: 'farm', name: 'FARMER CHICKEN', worldNum: '07', worldName: 'FARM', cost: 3200, body: 0xffffff, accent: 0x3742fa, beak: 0xff9f1a, comb: 0xff2e44, feet: 0xff9f1a, skinType: 'farm' },
  // 08 — Jungle: Safari Explorer Chicken with bush hat
  { id: 'jungle', name: 'JUNGLE SAFARI', worldNum: '08', worldName: 'JUNGLE', cost: 4000, body: 0xffffff, accent: 0x2ed573, beak: 0xff9f1a, comb: 0xff4757, feet: 0xe08a00, skinType: 'jungle' },
  // 09 — Night City: Cyberpunk DJ Chicken with visor & headphones
  { id: 'night_city', name: 'CYBERPUNK DJ', worldNum: '09', worldName: 'NIGHT CITY', cost: 5000, body: 0xffffff, accent: 0xff3fb4, beak: 0x38e1ff, comb: 0xff3fb4, feet: 0xff3fb4, skinType: 'night_city' },
  // 10 — Volcano: Magma Fire Chicken with obsidian lava armor
  { id: 'volcano', name: 'MAGMA CHICKEN', worldNum: '04', worldName: 'VOLCANO', cost: 6500, body: 0x241410, accent: 0xff5252, beak: 0xff793f, comb: 0xff3838, feet: 0xff793f, skinType: 'volcano' },
  // 11 — Airport: Airline Pilot Chicken with captain hat & tie
  { id: 'airport', name: 'AIRLINE PILOT', worldNum: '11', worldName: 'AIRPORT', cost: 8000, body: 0xffffff, accent: 0x1e272e, beak: 0xff9f1a, comb: 0xff2e44, feet: 0xff9f1a, skinType: 'airport' },
  // 12 — Harbor: Navy Captain Chicken with naval hat
  { id: 'harbor', name: 'NAVY CAPTAIN', worldNum: '12', worldName: 'HARBOR', cost: 10000, body: 0xffffff, accent: 0x1e3799, beak: 0xff9f1a, comb: 0xff4757, feet: 0xff9f1a, skinType: 'harbor' },
  // 13 — Highway: Biker Racer Chicken with racing helmet
  { id: 'highway', name: 'RACER CHICKEN', worldNum: '13', worldName: 'HIGHWAY', cost: 12500, body: 0xffffff, accent: 0xff4757, beak: 0xff9f1a, comb: 0xff2e44, feet: 0xff9f1a, skinType: 'highway' },
  // 14 — Candy Land: Candy Princess Chicken with bow & party dress
  { id: 'candy', name: 'CANDY PRINCESS', worldNum: '14', worldName: 'CANDY LAND', cost: 15000, body: 0xffffff, accent: 0xff9ff3, beak: 0xff9f1a, comb: 0xff6b81, feet: 0xff9f1a, skinType: 'candy' },
  // 15 — Ancient Ruins: Pharaoh Chicken with Nemes headdress
  { id: 'ruins', name: 'PHARAOH CHICKEN', worldNum: '15', worldName: 'ANCIENT RUINS', cost: 18000, body: 0xffffff, accent: 0xf1c40f, beak: 0xff9f1a, comb: 0x3867d6, feet: 0xf1c40f, skinType: 'ruins' },
  // 16 — Space: Astronaut Chicken in pressurized spacesuit
  { id: 'space', name: 'ASTRONAUT', worldNum: '16', worldName: 'SPACE', cost: 22000, body: 0xffffff, accent: 0x38e1ff, beak: 0xff9f1a, comb: 0xff4757, feet: 0xffffff, skinType: 'space' },
  // 17 — Tokyo: Samurai Chicken with red kabuto helmet
  { id: 'tokyo', name: 'SAMURAI CHICKEN', worldNum: '05', worldName: 'TOKYO', cost: 27000, body: 0xffffff, accent: 0xe74c3c, beak: 0xff9f1a, comb: 0xff2e44, feet: 0xe08a00, skinType: 'tokyo' },
  // 18 — Wildlife: Safari Guide Chicken with camera & pith helmet
  { id: 'wildlife', name: 'WILDLIFE GUIDE', worldNum: '18', worldName: 'WILDLIFE', cost: 33000, body: 0xffffff, accent: 0xb08b52, beak: 0xff9f1a, comb: 0xff4757, feet: 0xb08b52, skinType: 'wildlife' },
  // 19 — Underwater: Scuba Diver Chicken with diving mask & snorkel
  { id: 'underwater', name: 'SCUBA DIVER', worldNum: '19', worldName: 'UNDERWATER', cost: 40000, body: 0xffffff, accent: 0x0abde3, beak: 0xff9f1a, comb: 0xff4757, feet: 0x0abde3, skinType: 'underwater' },
  // 20 — Sky Island: Aviator Chicken with flight goggles & scarf
  { id: 'sky_island', name: 'AVIATOR CHICKEN', worldNum: '20', worldName: 'SKY ISLAND', cost: 50000, body: 0xffffff, accent: 0xe67e22, beak: 0xff9f1a, comb: 0xff4757, feet: 0xe67e22, skinType: 'sky_island' },
];

export function characterById(id: string): CharacterConfig {
  const norm = id.toLowerCase();
  // Backward compatibility alias mapping
  const aliasMap: Record<string, string> = {
    duck: 'river',
    fire_chicken: 'volcano',
    ice_chicken: 'snow',
    jungle_chicken: 'jungle',
    desert_chicken: 'desert',
    neon_chicken: 'night_city',
    neon: 'night_city',
    pirate_chicken: 'harbor',
    astro_chicken: 'space',
    wizard_chicken: 'ruins',
    robot_chicken: 'space',
    frog: 'river',
    cat: 'chicken',
    fox: 'wildlife',
    penguin: 'snow',
    rabbit: 'farm',
    robot: 'night_city',
    turtle: 'underwater',
    alien: 'space',
    dragon: 'volcano',
    sky: 'sky_island',
    temple: 'ruins',
    ancient_ruins: 'ruins',
  };
  const targetId = aliasMap[norm] || norm;
  for (const c of CHARACTERS) if (c.id === targetId) return c;
  return CHARACTERS[0];
}
