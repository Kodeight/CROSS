/**
 * World and stage definitions for all 20 worlds.
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

export const WORLD_LENGTH = 40;

function defaultStages(worldName: string, baseRoad: number, baseObst: number): WorldStageDef[] {
  return [
    { stageNum: 1, name: `${worldName} - Outskirts`, subtitle: 'STAGE 1: Calm Perimeter', roadDensity: baseRoad * 0.9, obstDensity: baseObst * 0.9, hazardIntensity: 0.9 },
    { stageNum: 2, name: `${worldName} - Avenue`, subtitle: 'STAGE 2: Moderate Traffic', roadDensity: baseRoad * 0.96, obstDensity: baseObst, hazardIntensity: 1.0 },
    { stageNum: 3, name: `${worldName} - Center`, subtitle: 'STAGE 3: Active Thoroughfare', roadDensity: baseRoad * 1.02, obstDensity: baseObst * 1.05, hazardIntensity: 1.1 },
    { stageNum: 4, name: `${worldName} - Crossing`, subtitle: 'STAGE 4: Heavy Transit', roadDensity: baseRoad * 1.08, obstDensity: baseObst * 1.1, hazardIntensity: 1.2 },
    { stageNum: 5, name: `${worldName} - Apex`, subtitle: 'STAGE 5: Climax Stretch', roadDensity: baseRoad * 1.14, obstDensity: baseObst * 1.15, hazardIntensity: 1.3 },
  ];
}

export const WORLDS: WorldConfig[] = [
  // 01 — City
  {
    id: 'city', name: 'CITY', num: '01', price: 0,
    safe: 0x8f959f, safeDark: 0x7a808a, road: 0x353a45, marking: 0xffe9a3, walk: 0xb9bec7,
    sky: 0x8ecae6, fog: 0x8ecae6, fogNear: 2600, fogFar: 6000,
    hemiSky: 0xffffff, hemiGround: 0x8a8f7a, hemiI: 0.75, dirColor: 0xfff2dd, dirI: 0.62,
    laneMix: { road: 0.46, obst: 0.28 }, carSplit: 0.62, speedMul: 1.0,
    carKinds: ['car', 'car', 'taxi', 'hatch', 'van', 'moto'], truckKinds: ['bus', 'truck', 'van'],
    variants: ['crosswalk'], weather: null,
    difficultyBase: 1.0,
    stages: [
      { stageNum: 1, name: 'City - Suburbs', subtitle: 'STAGE 1: Calm Sidewalks', roadDensity: 0.42, obstDensity: 0.26, hazardIntensity: 0.9 },
      { stageNum: 2, name: 'City - Commercial', subtitle: 'STAGE 2: Steady Traffic', roadDensity: 0.45, obstDensity: 0.28, hazardIntensity: 1.0 },
      { stageNum: 3, name: 'City - Downtown', subtitle: 'STAGE 3: Busy Crosswalks', roadDensity: 0.47, obstDensity: 0.29, hazardIntensity: 1.1 },
      { stageNum: 4, name: 'City - Expressway', subtitle: 'STAGE 4: Multi-Lane Dash', roadDensity: 0.49, obstDensity: 0.30, hazardIntensity: 1.2 },
      { stageNum: 5, name: 'City - Center Plaza', subtitle: 'STAGE 5: Grand Interchange', roadDensity: 0.50, obstDensity: 0.31, hazardIntensity: 1.25 },
    ],
  },
  // 02 — Jungle
  {
    id: 'jungle', name: 'JUNGLE', num: '02', price: 500,
    safe: 0x8a6b3f, safeDark: 0x74572f, road: 0x6e5636, marking: 0xd9c08a, walk: 0x6b4f2c,
    sky: 0xa8e0c0, fog: 0x9fd8b4, fogNear: 1400, fogFar: 3800,
    hemiSky: 0xe8ffe8, hemiGround: 0x3f6b4a, hemiI: 0.7, dirColor: 0xe8ffd8, dirI: 0.55,
    laneMix: { road: 0.42, obst: 0.34 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['jeep', 'jeep', 'van'], truckKinds: ['truck', 'jeep'],
    variants: ['bridge'], weather: 'fireflies',
    difficultyBase: 1.08,
    stages: defaultStages('Jungle', 0.42, 0.34),
  },
  // 03 — Desert
  {
    id: 'desert', name: 'DESERT', num: '03', price: 1500,
    safe: 0xe8c878, safeDark: 0xd9b25e, road: 0xb08b52, marking: 0xf5e6bd, walk: 0xd9b25e,
    sky: 0xffd9a0, fog: 0xffd0a0, fogNear: 1600, fogFar: 4500,
    hemiSky: 0xfff4dd, hemiGround: 0xc78d4e, hemiI: 0.8, dirColor: 0xffedbe, dirI: 0.75,
    laneMix: { road: 0.46, obst: 0.30 }, carSplit: 0.62, speedMul: 1.05,
    carKinds: ['jeep', 'buggy', 'buggy'], truckKinds: ['truck', 'jeep'],
    variants: [], weather: 'dust',
    difficultyBase: 1.15,
    stages: defaultStages('Desert', 0.46, 0.30),
  },
  // 04 — Snow Valley
  {
    id: 'snow', name: 'SNOW VALLEY', num: '04', price: 3000,
    safe: 0xeef4ff, safeDark: 0xd3ddf0, road: 0x5a6472, marking: 0xcfe4ff, walk: 0xd3ddf0,
    sky: 0xcfe4f7, fog: 0xcfe4f7, fogNear: 1500, fogFar: 4200,
    hemiSky: 0xffffff, hemiGround: 0xbcd0e8, hemiI: 0.85, dirColor: 0xf4faff, dirI: 0.7,
    laneMix: { road: 0.44, obst: 0.30 }, carSplit: 0.6, speedMul: 1.0,
    carKinds: ['snowmobile', 'car', 'van'], truckKinds: ['truck', 'van'],
    variants: ['ice'], weather: 'snow',
    difficultyBase: 1.22,
    stages: defaultStages('Snow', 0.44, 0.30),
  },
  // 05 — Neon City
  {
    id: 'neon', name: 'NEON CITY', num: '05', price: 5000,
    safe: 0x343a4d, safeDark: 0x272c3a, road: 0x1e2331, marking: 0x38e1ff, walk: 0x272c3a,
    sky: 0x1c2444, fog: 0x232c52, fogNear: 1400, fogFar: 4000,
    hemiSky: 0x8ba0d8, hemiGround: 0x2a3352, hemiI: 0.78, dirColor: 0xc4d6ff, dirI: 0.68,
    laneMix: { road: 0.38, obst: 0.28 }, carSplit: 0.65, speedMul: 0.80,
    carKinds: ['hover', 'neocar', 'moto'], truckKinds: ['hover', 'neocar'],
    variants: ['crosswalk'], weather: 'embers',
    difficultyBase: 1.30,
    stages: defaultStages('Neon City', 0.38, 0.28),
  },
  // 06 — Volcano (BRAND NEW PLAYABLE WORLD)
  {
    id: 'volcano', name: 'VOLCANO', num: '06', price: 7000,
    safe: 0x4a2820, safeDark: 0x351912, road: 0x241410, marking: 0xff5252, walk: 0x351912,
    sky: 0x5a1810, fog: 0x6e2014, fogNear: 1300, fogFar: 3600,
    hemiSky: 0xff7744, hemiGround: 0x331108, hemiI: 0.85, dirColor: 0xff8844, dirI: 0.8,
    laneMix: { road: 0.45, obst: 0.32 }, carSplit: 0.58, speedMul: 1.05,
    carKinds: ['miner', 'buggy', 'truck'], truckKinds: ['truck', 'miner'],
    variants: ['bridge'], weather: 'embers',
    difficultyBase: 1.40,
    stages: [
      { stageNum: 1, name: 'Volcano - Outer Rim', subtitle: 'STAGE 1: Basalt Slopes', roadDensity: 0.40, obstDensity: 0.30, hazardIntensity: 1.0 },
      { stageNum: 2, name: 'Volcano - Lava Fields', subtitle: 'STAGE 2: Magma Crevices', roadDensity: 0.43, obstDensity: 0.32, hazardIntensity: 1.1 },
      { stageNum: 3, name: 'Volcano - Ash Valley', subtitle: 'STAGE 3: Smoke Covered Lanes', roadDensity: 0.45, obstDensity: 0.33, hazardIntensity: 1.2 },
      { stageNum: 4, name: 'Volcano - Magma Bridges', subtitle: 'STAGE 4: Molten Crossings', roadDensity: 0.47, obstDensity: 0.34, hazardIntensity: 1.3 },
      { stageNum: 5, name: 'Volcano - Eruption Zone', subtitle: 'STAGE 5: Caldera Core', roadDensity: 0.49, obstDensity: 0.35, hazardIntensity: 1.4 },
    ],
  },
  // 07 — Tropical Beach
  {
    id: 'beach', name: 'TROPICAL BEACH', num: '07', price: 9000,
    safe: 0xf5e0a5, safeDark: 0xe3c886, road: 0x7d828c, marking: 0xffffff, walk: 0xe3c886,
    sky: 0x9fdcf5, fog: 0x9fdcf5, fogNear: 1500, fogFar: 4200,
    hemiSky: 0xffffff, hemiGround: 0xc7b083, hemiI: 0.82, dirColor: 0xfff3d0, dirI: 0.78,
    laneMix: { road: 0.42, obst: 0.30 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['buggy', 'van', 'boat'], truckKinds: ['van', 'truck'],
    variants: ['boardwalk'], weather: null,
    difficultyBase: 1.48,
    stages: defaultStages('Tropical Beach', 0.42, 0.30),
  },
  // 08 — Enchanted Forest
  {
    id: 'forest', name: 'ENCHANTED FOREST', num: '08', price: 11000,
    safe: 0x4a7c59, safeDark: 0x375e43, road: 0x2d4734, marking: 0x7bed9f, walk: 0x375e43,
    sky: 0x2f5e46, fog: 0x274d39, fogNear: 1300, fogFar: 3600,
    hemiSky: 0xa8e6cf, hemiGround: 0x223829, hemiI: 0.78, dirColor: 0x88d49e, dirI: 0.65,
    laneMix: { road: 0.40, obst: 0.36 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['cart', 'jeep', 'van'], truckKinds: ['truck', 'cart'],
    variants: ['bridge'], weather: 'spores',
    difficultyBase: 1.58,
    stages: defaultStages('Enchanted Forest', 0.40, 0.36),
  },
  // 09 — Industrial Zone
  {
    id: 'industrial', name: 'INDUSTRIAL ZONE', num: '09', price: 13000,
    safe: 0x636e72, safeDark: 0x4b5358, road: 0x2d3436, marking: 0xffa502, walk: 0x4b5358,
    sky: 0x7f8c8d, fog: 0x95a5a6, fogNear: 1400, fogFar: 3800,
    hemiSky: 0xdfe6e9, hemiGround: 0x3d4347, hemiI: 0.76, dirColor: 0xffd28e, dirI: 0.68,
    laneMix: { road: 0.48, obst: 0.28 }, carSplit: 0.5, speedMul: 1.05,
    carKinds: ['truck', 'truck', 'van', 'miner'], truckKinds: ['truck', 'train'],
    variants: ['crosswalk'], weather: 'dust',
    difficultyBase: 1.68,
    stages: defaultStages('Industrial Zone', 0.48, 0.28),
  },
  // 10 — Ancient Temple
  {
    id: 'temple', name: 'ANCIENT TEMPLE', num: '10', price: 15000,
    safe: 0x8c7b65, safeDark: 0x6e5f4d, road: 0x544738, marking: 0xe056fd, walk: 0x6e5f4d,
    sky: 0x736757, fog: 0x857663, fogNear: 1400, fogFar: 4000,
    hemiSky: 0xf5cd79, hemiGround: 0x4a3d31, hemiI: 0.75, dirColor: 0xffdda1, dirI: 0.72,
    laneMix: { road: 0.44, obst: 0.32 }, carSplit: 0.55, speedMul: 1.0,
    carKinds: ['cart', 'jeep', 'buggy'], truckKinds: ['truck', 'cart'],
    variants: ['bridge'], weather: 'fireflies',
    difficultyBase: 1.78,
    stages: defaultStages('Ancient Temple', 0.44, 0.32),
  },
  // 11 — Flooded City
  {
    id: 'flooded', name: 'FLOODED CITY', num: '11', price: 18000,
    safe: 0x487eb0, safeDark: 0x365d84, road: 0x273c75, marking: 0x4cd137, walk: 0x365d84,
    sky: 0x6a89cc, fog: 0x748dbf, fogNear: 1300, fogFar: 3600,
    hemiSky: 0xc7ecee, hemiGround: 0x22314e, hemiI: 0.8, dirColor: 0xa4b0be, dirI: 0.65,
    laneMix: { road: 0.42, obst: 0.34 }, carSplit: 0.58, speedMul: 0.95,
    carKinds: ['boat', 'boat', 'hover'], truckKinds: ['boat', 'van'],
    variants: ['bridge', 'boardwalk'], weather: 'bubbles',
    difficultyBase: 1.88,
    stages: defaultStages('Flooded City', 0.42, 0.34),
  },
  // 12 — Railway Valley
  {
    id: 'railway', name: 'RAILWAY VALLEY', num: '12', price: 21000,
    safe: 0x718093, safeDark: 0x576574, road: 0x2f3542, marking: 0xf6b93b, walk: 0x576574,
    sky: 0x778ca3, fog: 0x8a9db2, fogNear: 1500, fogFar: 4200,
    hemiSky: 0xf1f2f6, hemiGround: 0x3c4754, hemiI: 0.78, dirColor: 0xfff0d2, dirI: 0.7,
    laneMix: { road: 0.50, obst: 0.26 }, carSplit: 0.45, speedMul: 1.1,
    carKinds: ['train', 'train', 'truck', 'van'], truckKinds: ['train', 'truck'],
    variants: ['crosswalk'], weather: null,
    difficultyBase: 1.98,
    stages: defaultStages('Railway Valley', 0.50, 0.26),
  },
  // 13 — Countryside
  {
    id: 'countryside', name: 'COUNTRYSIDE', num: '13', price: 24000,
    safe: 0x78e08f, safeDark: 0x58b96e, road: 0x6e5636, marking: 0xffffff, walk: 0x58b96e,
    sky: 0x82ccdd, fog: 0x93d5e4, fogNear: 1600, fogFar: 4600,
    hemiSky: 0xffffff, hemiGround: 0x3d7e4c, hemiI: 0.85, dirColor: 0xfffae5, dirI: 0.8,
    laneMix: { road: 0.42, obst: 0.32 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['tractor', 'tractor', 'van', 'truck'], truckKinds: ['tractor', 'truck'],
    variants: [], weather: null,
    difficultyBase: 2.08,
    stages: defaultStages('Countryside', 0.42, 0.32),
  },
  // 14 — Mountain Pass
  {
    id: 'mountain', name: 'MOUNTAIN PASS', num: '14', price: 27000,
    safe: 0x60a3bc, safeDark: 0x4a7f93, road: 0x385f6e, marking: 0xdff9fb, walk: 0x4a7f93,
    sky: 0x4a69bd, fog: 0x5978cc, fogNear: 1400, fogFar: 3900,
    hemiSky: 0xdcdde1, hemiGround: 0x29424c, hemiI: 0.8, dirColor: 0xffe8d6, dirI: 0.72,
    laneMix: { road: 0.46, obst: 0.32 }, carSplit: 0.6, speedMul: 1.05,
    carKinds: ['jeep', 'truck', 'van'], truckKinds: ['truck', 'miner'],
    variants: ['bridge'], weather: 'snow',
    difficultyBase: 2.18,
    stages: defaultStages('Mountain Pass', 0.46, 0.32),
  },
  // 15 — Fantasy Kingdom
  {
    id: 'fantasy', name: 'FANTASY KINGDOM', num: '15', price: 30000,
    safe: 0x6ab04c, safeDark: 0x538d3b, road: 0x535c68, marking: 0xf8c291, walk: 0x538d3b,
    sky: 0x9c88ff, fog: 0x927dfa, fogNear: 1500, fogFar: 4200,
    hemiSky: 0xe0d6ff, hemiGround: 0x355a25, hemiI: 0.82, dirColor: 0xffecc6, dirI: 0.75,
    laneMix: { road: 0.44, obst: 0.32 }, carSplit: 0.6, speedMul: 1.0,
    carKinds: ['cart', 'cart', 'van'], truckKinds: ['cart', 'truck'],
    variants: ['bridge'], weather: 'spores',
    difficultyBase: 2.28,
    stages: defaultStages('Fantasy Kingdom', 0.44, 0.32),
  },
  // 16 — Pirate Islands
  {
    id: 'pirate', name: 'PIRATE ISLANDS', num: '16', price: 33000,
    safe: 0xeccc68, safeDark: 0xd1b452, road: 0x747d8c, marking: 0xffffff, walk: 0xd1b452,
    sky: 0x38ada9, fog: 0x48b9b5, fogNear: 1400, fogFar: 4000,
    hemiSky: 0xc7ecee, hemiGround: 0x8a722f, hemiI: 0.8, dirColor: 0xfffae0, dirI: 0.75,
    laneMix: { road: 0.44, obst: 0.32 }, carSplit: 0.55, speedMul: 1.0,
    carKinds: ['boat', 'cart', 'buggy'], truckKinds: ['boat', 'truck'],
    variants: ['boardwalk', 'pier'], weather: null,
    difficultyBase: 2.38,
    stages: defaultStages('Pirate Islands', 0.44, 0.32),
  },
  // 17 — Ocean World
  {
    id: 'ocean', name: 'OCEAN WORLD', num: '17', price: 36000,
    safe: 0x00a8ff, safeDark: 0x0083c7, road: 0x006296, marking: 0x00d2d3, walk: 0x0083c7,
    sky: 0x192a56, fog: 0x223875, fogNear: 1300, fogFar: 3600,
    hemiSky: 0x48dbfb, hemiGround: 0x004163, hemiI: 0.82, dirColor: 0x54a0ff, dirI: 0.7,
    laneMix: { road: 0.42, obst: 0.34 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['boat', 'boat', 'hover'], truckKinds: ['boat', 'hover'],
    variants: ['boardwalk', 'bridge'], weather: 'bubbles',
    difficultyBase: 2.50,
    stages: defaultStages('Ocean World', 0.42, 0.34),
  },
  // 18 — Moon Base
  {
    id: 'moon', name: 'MOON BASE', num: '18', price: 40000,
    safe: 0x718093, safeDark: 0x576574, road: 0x2f3640, marking: 0xf5f6fa, walk: 0x576574,
    sky: 0x0c1017, fog: 0x181e28, fogNear: 1400, fogFar: 3800,
    hemiSky: 0xced6e0, hemiGround: 0x252a33, hemiI: 0.85, dirColor: 0xdff9fb, dirI: 0.75,
    laneMix: { road: 0.44, obst: 0.30 }, carSplit: 0.62, speedMul: 0.9,
    carKinds: ['rover', 'rover', 'hover'], truckKinds: ['rover', 'ufo'],
    variants: [], weather: 'dust',
    difficultyBase: 2.65,
    stages: defaultStages('Moon Base', 0.44, 0.30),
  },
  // 19 — Sky Kingdom
  {
    id: 'sky', name: 'SKY KINGDOM', num: '19', price: 45000,
    safe: 0xced6e0, safeDark: 0xa4b0be, road: 0x57606f, marking: 0x70a1ff, walk: 0xa4b0be,
    sky: 0x70a1ff, fog: 0x7eaeff, fogNear: 1500, fogFar: 4400,
    hemiSky: 0xffffff, hemiGround: 0x6c7a8c, hemiI: 0.88, dirColor: 0xffffff, dirI: 0.82,
    laneMix: { road: 0.45, obst: 0.32 }, carSplit: 0.65, speedMul: 1.05,
    carKinds: ['hover', 'hover', 'ufo'], truckKinds: ['hover', 'ufo'],
    variants: ['bridge'], weather: 'snow',
    difficultyBase: 2.80,
    stages: defaultStages('Sky Kingdom', 0.45, 0.32),
  },
  // 20 — Alien Planet (MAJOR LATE-GAME WORLD)
  {
    id: 'alien', name: 'ALIEN PLANET', num: '20', price: 50000,
    safe: 0x3d1c5a, safeDark: 0x2b1240, road: 0x1d0b2e, marking: 0xa55eea, walk: 0x2b1240,
    sky: 0x130722, fog: 0x260e40, fogNear: 1300, fogFar: 3600,
    hemiSky: 0xd980fa, hemiGround: 0x1f0833, hemiI: 0.88, dirColor: 0xff9ff3, dirI: 0.78,
    laneMix: { road: 0.48, obst: 0.32 }, carSplit: 0.6, speedMul: 1.15,
    carKinds: ['ufo', 'ufo', 'neocar', 'hover'], truckKinds: ['ufo', 'hover'],
    variants: ['crosswalk'], weather: 'spores',
    difficultyBase: 3.0,
    stages: [
      { stageNum: 1, name: 'Alien Planet - Bio-Trench', subtitle: 'STAGE 1: Bioluminescent Entry', roadDensity: 0.44, obstDensity: 0.30, hazardIntensity: 1.2 },
      { stageNum: 2, name: 'Alien Planet - Xenolith Fields', subtitle: 'STAGE 2: Floating Monoliths', roadDensity: 0.46, obstDensity: 0.32, hazardIntensity: 1.3 },
      { stageNum: 3, name: 'Alien Planet - Plasma Highways', subtitle: 'STAGE 3: Accelerated UFO Lanes', roadDensity: 0.48, obstDensity: 0.33, hazardIntensity: 1.4 },
      { stageNum: 4, name: 'Alien Planet - Portal Nexus', subtitle: 'STAGE 4: Spacetime Distortions', roadDensity: 0.50, obstDensity: 0.34, hazardIntensity: 1.5 },
      { stageNum: 5, name: 'Alien Planet - Mothership Core', subtitle: 'STAGE 5: The Final Crossing', roadDensity: 0.52, obstDensity: 0.35, hazardIntensity: 1.6 },
    ],
  },
];

export function worldById(id: string): WorldConfig {
  const norm = id.toLowerCase();
  for (const w of WORLDS) if (w.id === norm) return w;
  return WORLDS[0];
}

export function worldIndex(id: string): number {
  const norm = id.toLowerCase();
  for (let i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === norm) return i;
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
  city: [132, 136, 134],
  jungle: [122, 98, 54],
  desert: [218, 182, 100],
  snow: [215, 226, 242],
  neon: [44, 50, 68],
  volcano: [60, 30, 24],
  beach: [232, 210, 145],
  forest: [60, 105, 75],
  industrial: [90, 98, 104],
  temple: [125, 110, 90],
  flooded: [60, 110, 160],
  railway: [100, 110, 125],
  countryside: [105, 180, 120],
  mountain: [85, 135, 155],
  fantasy: [95, 150, 75],
  pirate: [210, 185, 100],
  ocean: [20, 130, 200],
  moon: [100, 110, 125],
  sky: [180, 200, 225],
  alien: [50, 25, 75],
};

export function getFadeColorForWorld(id: string): [number, number, number] {
  return WORLD_FADE_COLORS[id.toLowerCase()] || WORLD_FADE_COLORS.city;
}
