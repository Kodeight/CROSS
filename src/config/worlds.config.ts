/** World data. Gameplay systems consume lane/vehicle config; visuals come from factories. */

export type WeatherKind = 'fireflies' | 'dust' | 'snow' | 'embers' | null;

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
}

export const WORLD_LENGTH = 40;

export const WORLDS: WorldConfig[] = [
  {
    id: 'city', name: 'CITY', num: '01', price: 0,
    safe: 0x8f959f, safeDark: 0x7a808a, road: 0x353a45, marking: 0xffe9a3, walk: 0xb9bec7,
    sky: 0x9fd3ef, fog: 0x9fd3ef, fogNear: 1400, fogFar: 3400,
    hemiSky: 0xffffff, hemiGround: 0x8a8f7a, hemiI: 0.75, dirColor: 0xfff2dd, dirI: 0.62,
    laneMix: { road: 0.46, obst: 0.28 }, carSplit: 0.62, speedMul: 1.0,
    carKinds: ['car', 'car', 'taxi', 'hatch', 'van', 'moto'], truckKinds: ['bus', 'truck', 'van'],
    variants: ['crosswalk'], weather: null,
  },
  {
    id: 'jungle', name: 'JUNGLE', num: '02', price: 500,
    safe: 0x8a6b3f, safeDark: 0x74572f, road: 0x6e5636, marking: 0xd9c08a, walk: 0x6b4f2c,
    sky: 0xa8e0c0, fog: 0x9fd8b4, fogNear: 1100, fogFar: 2900,
    hemiSky: 0xe8ffe8, hemiGround: 0x3f6b4a, hemiI: 0.7, dirColor: 0xe8ffd8, dirI: 0.55,
    laneMix: { road: 0.42, obst: 0.34 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['jeep', 'jeep', 'van'], truckKinds: ['truck', 'jeep'],
    variants: ['bridge'], weather: 'fireflies',
  },
  {
    id: 'desert', name: 'DESERT', num: '03', price: 1500,
    safe: 0xe8c878, safeDark: 0xd9b25e, road: 0xb08b52, marking: 0xf5e6bd, walk: 0xd9b25e,
    sky: 0xffd9a0, fog: 0xffd0a0, fogNear: 1200, fogFar: 3100,
    hemiSky: 0xfff4dd, hemiGround: 0xc78d4e, hemiI: 0.8, dirColor: 0xffedbe, dirI: 0.75,
    laneMix: { road: 0.46, obst: 0.30 }, carSplit: 0.62, speedMul: 1.05,
    carKinds: ['jeep', 'buggy', 'buggy'], truckKinds: ['truck', 'jeep'],
    variants: [], weather: 'dust',
  },
  {
    id: 'snow', name: 'SNOW', num: '04', price: 3000,
    safe: 0xeef4ff, safeDark: 0xd3ddf0, road: 0x5a6472, marking: 0xcfe4ff, walk: 0xd3ddf0,
    sky: 0xcfe4f7, fog: 0xcfe4f7, fogNear: 1200, fogFar: 3000,
    hemiSky: 0xffffff, hemiGround: 0xbcd0e8, hemiI: 0.85, dirColor: 0xf4faff, dirI: 0.7,
    laneMix: { road: 0.44, obst: 0.30 }, carSplit: 0.6, speedMul: 1.0,
    carKinds: ['snowmobile', 'car', 'van'], truckKinds: ['truck', 'van'],
    variants: ['ice'], weather: 'snow',
  },
  {
    id: 'neon', name: 'NEON CITY', num: '05', price: 5000,
    safe: 0x2b2f3d, safeDark: 0x232733, road: 0x14161f, marking: 0x38e1ff, walk: 0x232733,
    sky: 0x0d1022, fog: 0x141a35, fogNear: 1100, fogFar: 2800,
    hemiSky: 0x445588, hemiGround: 0x11131f, hemiI: 0.5, dirColor: 0x8fb8ff, dirI: 0.35,
    laneMix: { road: 0.48, obst: 0.28 }, carSplit: 0.62, speedMul: 1.15,
    carKinds: ['hover', 'neocar', 'moto'], truckKinds: ['hover', 'neocar'],
    variants: ['crosswalk'], weather: 'embers',
  },
  {
    id: 'beach', name: 'BEACH', num: '06', price: 8000,
    safe: 0xf5e0a5, safeDark: 0xe3c886, road: 0x7d828c, marking: 0xffffff, walk: 0xe3c886,
    sky: 0x9fdcf5, fog: 0x9fdcf5, fogNear: 1300, fogFar: 3300,
    hemiSky: 0xffffff, hemiGround: 0xc7b083, hemiI: 0.82, dirColor: 0xfff3d0, dirI: 0.78,
    laneMix: { road: 0.42, obst: 0.30 }, carSplit: 0.6, speedMul: 0.95,
    carKinds: ['buggy', 'van', 'car'], truckKinds: ['van', 'truck'],
    variants: ['boardwalk'], weather: null,
  },
];

/** Beach districts: 5 zones of 8 lanes per stretch — coastal road, boardwalk, beach, pier, marina. */
export function beachDistrict(lane: number): number {
  return Math.min(4, Math.floor(Math.max(0, lane % WORLD_LENGTH) / 8));
}

export function worldById(id: string): WorldConfig {
  for (const w of WORLDS) if (w.id === id) return w;
  return WORLDS[0];
}

export function worldIndex(id: string): number {
  for (let i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return i;
  return 0;
}
