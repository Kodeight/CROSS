/**
 * World and stage definitions for the five active CROSS! worlds.
 * Gameplay systems consume lane/vehicle config; visuals come from factories.
 */

export type WeatherKind = 'fireflies' | 'dust' | 'snow' | 'embers' | 'spores' | 'bubbles' | null;

export interface WorldStageDef {
  stageNum: number;
  name: string;
  subtitle: string;
  roadDensity: number;
  obstDensity: number;
  hazardIntensity: number;
}

export interface WorldConfig {
  id: string;
  name: string;
  num: string;
  price: number;
  safe: number;
  safeDark: number;
  road: number;
  marking: number;
  walk: number;
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  dirColor: number;
  dirI: number;
  laneMix: { road: number; obst: number };
  carSplit: number;
  speedMul: number;
  carKinds: string[];
  truckKinds: string[];
  variants: string[];
  weather: WeatherKind;
  difficultyBase: number; // 1.0 to 3.0 scale
  stages: WorldStageDef[];
}

export const WORLD_LENGTH = 120;

function defaultStages(worldName: string, baseRoad: number, baseObst: number): WorldStageDef[] {
  return [
    { stageNum: 1, name: `${worldName} - Outskirts`, subtitle: 'STAGE 1: Calm Perimeter', roadDensity: baseRoad * 0.9, obstDensity: baseObst * 0.9, hazardIntensity: 0.9 },
    { stageNum: 2, name: `${worldName} - Avenue`, subtitle: 'STAGE 2: Moderate Traffic', roadDensity: baseRoad * 0.96, obstDensity: baseObst, hazardIntensity: 1.0 },
    { stageNum: 3, name: `${worldName} - Center`, subtitle: 'STAGE 3: Active Thoroughfare', roadDensity: baseRoad * 1.02, obstDensity: baseObst * 1.05, hazardIntensity: 1.1 },
    { stageNum: 4, name: `${worldName} - Crossing`, subtitle: 'STAGE 4: Heavy Transit', roadDensity: baseRoad * 1.08, obstDensity: baseObst * 1.1, hazardIntensity: 1.2 },
    { stageNum: 5, name: `${worldName} - Apex`, subtitle: 'STAGE 5: Climax Stretch', roadDensity: baseRoad * 1.14, obstDensity: baseObst * 1.15, hazardIntensity: 1.3 },
  ];
}

/**
 * Full 20-world history, preserved internally for safe save migration only.
 * NEVER exposed to gameplay, store, selection, or progression — see WORLDS below.
 */
const ALL_WORLD_CONFIGS: WorldConfig[] = [
  // 01 — City
  {
    id: 'city', name: 'CITY', num: '01', price: 0,
    safe: 0x68b838, safeDark: 0x56a02c, road: 0x242831, marking: 0xffffff, walk: 0xd8d4c2,
    sky: 0x8ecae6, fog: 0x98d2ec, fogNear: 2800, fogFar: 6500,
    hemiSky: 0xffffff, hemiGround: 0x76885b, hemiI: 0.85, dirColor: 0xfff6e5, dirI: 0.82,
    laneMix: { road: 0.46, obst: 0.28 }, carSplit: 0.62, speedMul: 1.0,
    carKinds: ['city_taxi', 'city_taxi', 'city_suv', 'city_suv'], truckKinds: ['city_bus'],
    variants: ['crosswalk'], weather: null,
    difficultyBase: 1.0,
    stages: defaultStages('City', 0.42, 0.26),
  },
  // 02 — River
  {
    id: 'river', name: 'RIVER', num: '02', price: 500,
    safe: 0x5a9442, safeDark: 0x477c32, road: 0x1f80b0, marking: 0x66ccff, walk: 0xd8d0b8,
    sky: 0x80d0e0, fog: 0x90d8e8, fogNear: 2800, fogFar: 6500,
    hemiSky: 0xe0f7fa, hemiGround: 0x4a7c59, hemiI: 0.88, dirColor: 0xfffaed, dirI: 0.85,
    laneMix: { road: 0.44, obst: 0.30 }, carSplit: 0.58, speedMul: 0.95,
    carKinds: ['river_fishing_boat', 'river_speed_boat'], truckKinds: ['river_cargo_boat'],
    variants: ['bridge'], weather: null,
    difficultyBase: 1.08,
    stages: defaultStages('River', 0.44, 0.30),
  },
  // 03 — Beach
  {
    id: 'beach', name: 'BEACH', num: '03', price: 1200,
    safe: 0xf2dea2, safeDark: 0xdcc482, road: 0x22a8cf, marking: 0xffffff, walk: 0xe3c886,
    sky: 0x6ac2eb, fog: 0x86d2f5, fogNear: 2600, fogFar: 6200,
    hemiSky: 0xfff8e7, hemiGround: 0xc7ab75, hemiI: 0.90, dirColor: 0xfff4d6, dirI: 0.92,
    laneMix: { road: 0.42, obst: 0.30 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['beach_dune_buggy', 'beach_atv'], truckKinds: ['beach_jet_ski', 'beach_dune_buggy'],
    variants: ['boardwalk'], weather: null,
    difficultyBase: 1.15,
    stages: defaultStages('Beach', 0.42, 0.30),
  },
  // 04 — Forest
  {
    id: 'forest', name: 'FOREST', num: '04', price: 2000,
    safe: 0x4a7c59, safeDark: 0x375e43, road: 0x4a3b2a, marking: 0x88d49e, walk: 0x5a4732,
    sky: 0x3d7052, fog: 0x315c42, fogNear: 1400, fogFar: 3800,
    hemiSky: 0xb4e8c8, hemiGround: 0x274330, hemiI: 0.8, dirColor: 0x98e4ad, dirI: 0.68,
    laneMix: { road: 0.40, obst: 0.36 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['cart', 'jeep', 'van'], truckKinds: ['truck', 'cart'],
    variants: ['bridge'], weather: 'spores',
    difficultyBase: 1.22,
    stages: defaultStages('Forest', 0.40, 0.36),
  },
  // 05 — Desert
  {
    id: 'desert', name: 'DESERT', num: '05', price: 3000,
    safe: 0xe8c878, safeDark: 0xd9b25e, road: 0xb08b52, marking: 0xf5e6bd, walk: 0xd9b25e,
    sky: 0xffd9a0, fog: 0xffd0a0, fogNear: 1600, fogFar: 4500,
    hemiSky: 0xfff4dd, hemiGround: 0xc78d4e, hemiI: 0.8, dirColor: 0xffedbe, dirI: 0.75,
    laneMix: { road: 0.46, obst: 0.30 }, carSplit: 0.62, speedMul: 1.05,
    carKinds: ['jeep', 'buggy', 'truck'], truckKinds: ['truck', 'jeep'],
    variants: [], weather: 'dust',
    difficultyBase: 1.30,
    stages: defaultStages('Desert', 0.46, 0.30),
  },
  // 06 — Snow
  {
    id: 'snow', name: 'SNOW', num: '06', price: 4200,
    safe: 0xeef4ff, safeDark: 0xd3ddf0, road: 0x5a6472, marking: 0xcfe4ff, walk: 0xd3ddf0,
    sky: 0xcfe4f7, fog: 0xcfe4f7, fogNear: 1500, fogFar: 4200,
    hemiSky: 0xffffff, hemiGround: 0xbcd0e8, hemiI: 0.85, dirColor: 0xf4faff, dirI: 0.7,
    laneMix: { road: 0.44, obst: 0.30 }, carSplit: 0.6, speedMul: 1.0,
    carKinds: ['snowmobile', 'car', 'van'], truckKinds: ['truck', 'van'],
    variants: ['ice'], weather: 'snow',
    difficultyBase: 1.38,
    stages: defaultStages('Snow', 0.44, 0.30),
  },
  // 07 — Farm
  {
    id: 'farm', name: 'FARM', num: '07', price: 5500,
    safe: 0x78e08f, safeDark: 0x58b96e, road: 0x6e5636, marking: 0xffffff, walk: 0x58b96e,
    sky: 0x82ccdd, fog: 0x93d5e4, fogNear: 1600, fogFar: 4600,
    hemiSky: 0xffffff, hemiGround: 0x3d7e4c, hemiI: 0.85, dirColor: 0xfffae5, dirI: 0.8,
    laneMix: { road: 0.42, obst: 0.32 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['tractor', 'van', 'truck'], truckKinds: ['tractor', 'truck'],
    variants: [], weather: null,
    difficultyBase: 1.45,
    stages: defaultStages('Farm', 0.42, 0.32),
  },
  // 08 — Jungle
  {
    id: 'jungle', name: 'JUNGLE', num: '08', price: 7000,
    safe: 0x3d7e4c, safeDark: 0x2e633a, road: 0x5c4a30, marking: 0x88d49e, walk: 0x5c4a30,
    sky: 0x2b5438, fog: 0x2b5438, fogNear: 1400, fogFar: 3800,
    hemiSky: 0xa8e6cf, hemiGround: 0x223829, hemiI: 0.78, dirColor: 0x88d49e, dirI: 0.65,
    laneMix: { road: 0.42, obst: 0.34 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['jeep', 'van', 'truck'], truckKinds: ['truck', 'jeep'],
    variants: ['bridge'], weather: 'fireflies',
    difficultyBase: 1.52,
    stages: defaultStages('Jungle', 0.42, 0.34),
  },
  // 09 — Night City
  {
    id: 'night_city', name: 'NIGHT CITY', num: '09', price: 8500,
    safe: 0x282c3c, safeDark: 0x1e212d, road: 0x181a24, marking: 0x38e1ff, walk: 0x1e212d,
    sky: 0x141624, fog: 0x1c1e30, fogNear: 1400, fogFar: 4000,
    hemiSky: 0x8ba0d8, hemiGround: 0x202434, hemiI: 0.78, dirColor: 0xff3fb4, dirI: 0.7,
    laneMix: { road: 0.42, obst: 0.28 }, carSplit: 0.65, speedMul: 0.95,
    carKinds: ['car', 'taxi', 'neocar', 'moto'], truckKinds: ['truck', 'van'],
    variants: ['crosswalk'], weather: null,
    difficultyBase: 1.60,
    stages: defaultStages('Night City', 0.42, 0.28),
  },
  // 10 — Volcano
  {
    id: 'volcano', name: 'VOLCANO', num: '10', price: 10000,
    safe: 0x262228, safeDark: 0x1c181e, road: 0x20120e, marking: 0xff5252, walk: 0x3a343a,
    sky: 0x181014, fog: 0x281418, fogNear: 2400, fogFar: 5800,
    hemiSky: 0xff6b35, hemiGround: 0x221014, hemiI: 0.85, dirColor: 0xff7728, dirI: 0.90,
    laneMix: { road: 0.45, obst: 0.32 }, carSplit: 0.58, speedMul: 1.05,
    carKinds: ['volcano_armored_truck', 'volcano_drill_vehicle'], truckKinds: ['volcano_dump_truck', 'volcano_armored_truck'],
    variants: ['bridge'], weather: 'embers',
    difficultyBase: 1.68,
    stages: defaultStages('Volcano', 0.45, 0.32),
  },
  // 11 — Airport
  {
    id: 'airport', name: 'AIRPORT', num: '11', price: 12000,
    safe: 0x88929e, safeDark: 0x6e7884, road: 0x2b2e36, marking: 0xffffff, walk: 0x6e7884,
    sky: 0x8ecae6, fog: 0x8ecae6, fogNear: 2200, fogFar: 5500,
    hemiSky: 0xffffff, hemiGround: 0x6e7884, hemiI: 0.82, dirColor: 0xfff5e0, dirI: 0.72,
    laneMix: { road: 0.48, obst: 0.26 }, carSplit: 0.55, speedMul: 1.1,
    carKinds: ['plane', 'fuel_truck', 'service_cart', 'van'], truckKinds: ['truck', 'fuel_truck'],
    variants: ['crosswalk'], weather: null,
    difficultyBase: 1.78,
    stages: defaultStages('Airport', 0.48, 0.26),
  },
  // 12 — Harbor
  {
    id: 'harbor', name: 'HARBOR', num: '12', price: 14500,
    safe: 0x758595, safeDark: 0x5e6c7a, road: 0x2980b9, marking: 0x74b9ff, walk: 0x5e6c7a,
    sky: 0x6aa8d6, fog: 0x7db4de, fogNear: 1500, fogFar: 4200,
    hemiSky: 0xdfe9f2, hemiGround: 0x3d4b58, hemiI: 0.8, dirColor: 0xfff6dd, dirI: 0.7,
    laneMix: { road: 0.44, obst: 0.32 }, carSplit: 0.55, speedMul: 1.0,
    carKinds: ['container_truck', 'boat', 'forklift'], truckKinds: ['truck', 'container_truck'],
    variants: ['boardwalk'], weather: null,
    difficultyBase: 1.88,
    stages: defaultStages('Harbor', 0.44, 0.32),
  },
  // 13 — Highway
  {
    id: 'highway', name: 'HIGHWAY', num: '13', price: 17500,
    safe: 0x6c757d, safeDark: 0x545b62, road: 0x212529, marking: 0xffc107, walk: 0x545b62,
    sky: 0x7090b0, fog: 0x829fb8, fogNear: 1800, fogFar: 4800,
    hemiSky: 0xffffff, hemiGround: 0x495057, hemiI: 0.8, dirColor: 0xffeed0, dirI: 0.75,
    laneMix: { road: 0.52, obst: 0.24 }, carSplit: 0.6, speedMul: 1.15,
    carKinds: ['car', 'car', 'sports', 'bus', 'truck'], truckKinds: ['truck', 'bus'],
    variants: ['crosswalk'], weather: null,
    difficultyBase: 1.98,
    stages: defaultStages('Highway', 0.52, 0.24),
  },
  // 14 — Candy Land
  {
    id: 'candy', name: 'CANDY LAND', num: '14', price: 21000,
    safe: 0xffb6c1, safeDark: 0xff99aa, road: 0xf8a5c2, marking: 0xffffff, walk: 0xff99aa,
    sky: 0xffd1dc, fog: 0xffd1dc, fogNear: 1500, fogFar: 4200,
    hemiSky: 0xfff0f5, hemiGround: 0xffb6c1, hemiI: 0.88, dirColor: 0xffe4e1, dirI: 0.8,
    laneMix: { road: 0.44, obst: 0.30 }, carSplit: 0.6, speedMul: 1.0,
    carKinds: ['candy_truck', 'car', 'van'], truckKinds: ['candy_truck', 'truck'],
    variants: ['boardwalk'], weather: 'spores',
    difficultyBase: 2.08,
    stages: defaultStages('Candy Land', 0.44, 0.30),
  },
  // 15 — Ancient Ruins
  {
    id: 'ruins', name: 'ANCIENT RUINS', num: '15', price: 25000,
    safe: 0xc8a870, safeDark: 0xb08f58, road: 0x8c7040, marking: 0xffd700, walk: 0xb08f58,
    sky: 0xd9b37c, fog: 0xe0be88, fogNear: 1500, fogFar: 4200,
    hemiSky: 0xfff2d4, hemiGround: 0x7a6036, hemiI: 0.8, dirColor: 0xffebc4, dirI: 0.75,
    laneMix: { road: 0.44, obst: 0.32 }, carSplit: 0.55, speedMul: 1.0,
    carKinds: ['cart', 'jeep', 'buggy'], truckKinds: ['truck', 'cart'],
    variants: ['bridge'], weather: 'dust',
    difficultyBase: 2.18,
    stages: defaultStages('Ancient Ruins', 0.44, 0.32),
  },
  // 16 — Space
  {
    id: 'space', name: 'SPACE', num: '16', price: 30000,
    safe: 0x242838, safeDark: 0x181c28, road: 0x0f121b, marking: 0x38e1ff, walk: 0x181c28,
    sky: 0x080a12, fog: 0x101422, fogNear: 1400, fogFar: 3800,
    hemiSky: 0x74b9ff, hemiGround: 0x151824, hemiI: 0.85, dirColor: 0xa29bfe, dirI: 0.75,
    laneMix: { road: 0.46, obst: 0.30 }, carSplit: 0.62, speedMul: 1.05,
    carKinds: ['ufo', 'robot_car', 'hover'], truckKinds: ['ufo', 'bullet_train'],
    variants: [], weather: null,
    difficultyBase: 2.30,
    stages: defaultStages('Space', 0.46, 0.30),
  },
  // 17 — Tokyo
  {
    id: 'tokyo', name: 'TOKYO', num: '17', price: 35000,
    safe: 0x2d283c, safeDark: 0x201c2c, road: 0x181524, marking: 0x00e5ff, walk: 0x2d283c,
    sky: 0x120e20, fog: 0x1c1630, fogNear: 2400, fogFar: 5800,
    hemiSky: 0xb388ff, hemiGround: 0x18ffff, hemiI: 0.82, dirColor: 0x00e5ff, dirI: 0.78,
    laneMix: { road: 0.48, obst: 0.28 }, carSplit: 0.62, speedMul: 1.05,
    carKinds: ['tokyo_white_tuner', 'tokyo_red_tuner'], truckKinds: ['tokyo_neon_tram'],
    variants: ['crosswalk'], weather: null,
    difficultyBase: 2.45,
    stages: defaultStages('Tokyo', 0.48, 0.28),
  },
  // 18 — Wildlife
  {
    id: 'wildlife', name: 'WILDLIFE', num: '18', price: 40000,
    safe: 0xd2a652, safeDark: 0xb88e3e, road: 0x8a622a, marking: 0xf5cd79, walk: 0xb88e3e,
    sky: 0xe5a855, fog: 0xebaf5d, fogNear: 1600, fogFar: 4400,
    hemiSky: 0xffeed0, hemiGround: 0x825b20, hemiI: 0.82, dirColor: 0xffe2a8, dirI: 0.78,
    laneMix: { road: 0.44, obst: 0.32 }, carSplit: 0.58, speedMul: 1.0,
    carKinds: ['safari_jeep', 'elephant_truck', 'van'], truckKinds: ['truck', 'elephant_truck'],
    variants: [], weather: 'dust',
    difficultyBase: 2.60,
    stages: defaultStages('Wildlife', 0.44, 0.32),
  },
  // 19 — Underwater
  {
    id: 'underwater', name: 'UNDERWATER', num: '19', price: 45000,
    safe: 0x0abde3, safeDark: 0x0897b6, road: 0x006296, marking: 0x48dbfb, walk: 0x0897b6,
    sky: 0x0c2461, fog: 0x1e3799, fogNear: 1300, fogFar: 3600,
    hemiSky: 0x48dbfb, hemiGround: 0x071e42, hemiI: 0.85, dirColor: 0x54a0ff, dirI: 0.72,
    laneMix: { road: 0.42, obst: 0.34 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['submarine', 'boat', 'hover'], truckKinds: ['submarine', 'boat'],
    variants: ['boardwalk'], weather: 'bubbles',
    difficultyBase: 2.75,
    stages: defaultStages('Underwater', 0.42, 0.34),
  },
  // 20 — Sky Island
  {
    id: 'sky_island', name: 'SKY ISLAND', num: '20', price: 50000,
    safe: 0x88d49e, safeDark: 0x68b87e, road: 0xced6e0, marking: 0x70a1ff, walk: 0x68b87e,
    sky: 0x70a1ff, fog: 0x82afff, fogNear: 1600, fogFar: 4600,
    hemiSky: 0xffffff, hemiGround: 0x5478a8, hemiI: 0.9, dirColor: 0xffffff, dirI: 0.85,
    laneMix: { road: 0.46, obst: 0.32 }, carSplit: 0.62, speedMul: 1.1,
    carKinds: ['sky_ship', 'hover', 'plane'], truckKinds: ['sky_ship', 'hover'],
    variants: ['bridge'], weather: null,
    difficultyBase: 3.0,
    stages: defaultStages('Sky Island', 0.46, 0.32),
  },
];

/**
 * CROSS! now ships EXACTLY FIVE active worlds:
 * CITY → RIVER → BEACH → VOLCANO → TOKYO.
 * Everything else lives in ALL_WORLD_CONFIGS (legacy, migration only).
 */
export const ACTIVE_WORLD_IDS = ['city', 'river', 'beach', 'volcano', 'tokyo'] as const;
export type ActiveWorldId = (typeof ACTIVE_WORLD_IDS)[number];

const ACTIVE_WORLD_META: Record<string, { num: string; price: number }> = {
  city: { num: '01', price: 0 },
  river: { num: '02', price: 500 },
  beach: { num: '03', price: 1200 },
  volcano: { num: '04', price: 4500 },
  tokyo: { num: '05', price: 9000 },
};

export const WORLDS: WorldConfig[] = ACTIVE_WORLD_IDS.map((id) => {
  const cfg = ALL_WORLD_CONFIGS.find((w) => w.id === id)!;
  const meta = ACTIVE_WORLD_META[id];
  return { ...cfg, num: meta.num, price: meta.price };
});

/** Legacy 20-world history — save-migration use only, never gameplay. */
export const LEGACY_WORLDS: WorldConfig[] = ALL_WORLD_CONFIGS;

export function isActiveWorldId(id: string): boolean {
  return (ACTIVE_WORLD_IDS as readonly string[]).includes(id.toLowerCase());
}

export function worldById(id: string): WorldConfig {
  const norm = id.toLowerCase();
  // Legacy names resolve to their nearest active world so old saves keep working.
  const aliasMap: Record<string, string> = {
    neon: 'tokyo',
    night_city: 'tokyo',
    countryside: 'city',
    farm: 'city',
    temple: 'volcano',
    ancient_ruins: 'volcano',
    ruins: 'volcano',
    flooded: 'river',
    railway: 'city',
    highway: 'city',
    industrial: 'volcano',
    harbor: 'river',
    mountain: 'volcano',
    snow: 'volcano',
    fantasy: 'beach',
    candy: 'beach',
    pirate: 'river',
    ocean: 'river',
    underwater: 'river',
    moon: 'tokyo',
    space: 'tokyo',
    sky: 'beach',
    sky_island: 'beach',
    alien: 'tokyo',
    forest: 'city',
    jungle: 'city',
    desert: 'volcano',
    wildlife: 'city',
    airport: 'city',
  };
  const targetId = aliasMap[norm] || norm;
  for (const w of WORLDS) if (w.id === targetId) return w;
  return WORLDS[0];
}

export function worldIndex(id: string): number {
  const target = worldById(id).id;
  for (let i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === target) return i;
  return 0;
}

export function beachDistrict(lane: number): number {
  return Math.min(4, Math.floor(Math.max(0, lane % WORLD_LENGTH) / 8));
}

export function stageForLane(lane: number): number {
  const rel = Math.max(0, lane % WORLD_LENGTH);
  return Math.min(5, Math.floor(rel / (WORLD_LENGTH / 5)) + 1);
}

/** World-color-aware bottom edge palette matching the rendered ground surface. */
export const WORLD_FADE_COLORS: Record<string, [number, number, number]> = {
  city: [130, 200, 80],
  river: [106, 176, 76],
  beach: [245, 224, 165],
  forest: [74, 124, 89],
  desert: [232, 200, 120],
  snow: [238, 244, 255],
  farm: [120, 224, 143],
  jungle: [61, 126, 76],
  night_city: [40, 44, 60],
  neon: [40, 44, 60],
  volcano: [58, 34, 28],
  airport: [136, 146, 158],
  harbor: [117, 133, 149],
  highway: [108, 117, 125],
  candy: [255, 182, 193],
  ruins: [200, 168, 112],
  space: [36, 40, 56],
  tokyo: [72, 84, 96],
  wildlife: [210, 166, 82],
  underwater: [10, 189, 227],
  sky_island: [136, 212, 158],
  sky: [136, 212, 158],
};

export function getFadeColorForWorld(id: string): [number, number, number] {
  const target = worldById(id).id;
  return WORLD_FADE_COLORS[target] || WORLD_FADE_COLORS.city;
}
