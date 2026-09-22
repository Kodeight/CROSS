/** Missions + achievements data. World-aware mission ids live in WORLD_MISSIONS. */

export interface RunSummary {
  maxLane: number;
  nearMiss: number;
}

export interface MissionDef {
  id: string;
  name: string;
  reward: number;
  /** Optional world scope — missions without worldId are global. */
  worldId?: string;
  /** standard | challenge | master — tier for world completion weighting. */
  tier?: 'standard' | 'challenge' | 'master';
  check: (run: RunSummary, totalCoins: number) => boolean;
  progress: (run: RunSummary, totalCoins: number) => string;
}

export const MISSIONS: MissionDef[] = [
  { id: 'm20', name: 'Cross 20 lanes in one run', reward: 50, check: (r) => r.maxLane >= 20, progress: (r) => Math.min(r.maxLane, 20) + '/20' },
  { id: 'm50', name: 'Reach lane 50 in one run', reward: 150, check: (r) => r.maxLane >= 50, progress: (r) => Math.min(r.maxLane, 50) + '/50' },
  { id: 'm100', name: 'Reach lane 100', reward: 300, check: (r) => r.maxLane >= 100, progress: (r) => Math.min(r.maxLane, 100) + '/100' },
  { id: 'c25', name: 'Collect 25 coins (total)', reward: 100, check: (_r, t) => t >= 25, progress: (_r, t) => Math.min(t, 25) + '/25' },
  { id: 'n3', name: '3 near misses in one run', reward: 120, check: (r) => r.nearMiss >= 3, progress: (r) => Math.min(r.nearMiss, 3) + '/3' },
  // ---- WORLD 01 CITY (standard / challenge / master) ----
  { id: 'city_std_1', name: 'CITY: Cross 15 lanes', reward: 40, worldId: 'city', tier: 'standard', check: (r) => r.maxLane >= 15, progress: (r) => Math.min(r.maxLane, 15) + '/15' },
  { id: 'city_std_2', name: 'CITY: Collect 10 coins', reward: 40, worldId: 'city', tier: 'standard', check: (_r, t) => t >= 10, progress: (_r, t) => Math.min(t, 10) + '/10' },
  { id: 'city_ch_1', name: 'CITY: 2 near misses in one run', reward: 80, worldId: 'city', tier: 'challenge', check: (r) => r.nearMiss >= 2, progress: (r) => Math.min(r.nearMiss, 2) + '/2' },
  { id: 'city_ch_2', name: 'CITY: Reach lane 30', reward: 90, worldId: 'city', tier: 'challenge', check: (r) => r.maxLane >= 30, progress: (r) => Math.min(r.maxLane, 30) + '/30' },
  { id: 'city_mas_1', name: 'CITY: Reach lane 40 (world end)', reward: 200, worldId: 'city', tier: 'master', check: (r) => r.maxLane >= 40, progress: (r) => Math.min(r.maxLane, 40) + '/40' },
  // ---- WORLD 02 JUNGLE ----
  { id: 'jungle_std_1', name: 'JUNGLE: Cross 15 lanes', reward: 60, worldId: 'jungle', tier: 'standard', check: (r) => r.maxLane >= 55, progress: (r) => Math.min(r.maxLane, 55) + '/55' },
  { id: 'jungle_std_2', name: 'JUNGLE: Collect 15 coins', reward: 60, worldId: 'jungle', tier: 'standard', check: (_r, t) => t >= 15, progress: (_r, t) => Math.min(t, 15) + '/15' },
  { id: 'jungle_ch_1', name: 'JUNGLE: 2 near misses in one run', reward: 110, worldId: 'jungle', tier: 'challenge', check: (r) => r.nearMiss >= 2, progress: (r) => Math.min(r.nearMiss, 2) + '/2' },
  { id: 'jungle_ch_2', name: 'JUNGLE: Reach lane 70', reward: 120, worldId: 'jungle', tier: 'challenge', check: (r) => r.maxLane >= 70, progress: (r) => Math.min(r.maxLane, 70) + '/70' },
  { id: 'jungle_mas_1', name: 'JUNGLE: Reach lane 80 (world end)', reward: 260, worldId: 'jungle', tier: 'master', check: (r) => r.maxLane >= 80, progress: (r) => Math.min(r.maxLane, 80) + '/80' },
  // ---- WORLD 03 DESERT ----
  { id: 'desert_std_1', name: 'DESERT: Cross into the dunes (lane 95)', reward: 80, worldId: 'desert', tier: 'standard', check: (r) => r.maxLane >= 95, progress: (r) => Math.min(r.maxLane, 95) + '/95' },
  { id: 'desert_std_2', name: 'DESERT: Collect 20 coins', reward: 80, worldId: 'desert', tier: 'standard', check: (_r, t) => t >= 20, progress: (_r, t) => Math.min(t, 20) + '/20' },
  { id: 'desert_ch_1', name: 'DESERT: 3 near misses in one run', reward: 140, worldId: 'desert', tier: 'challenge', check: (r) => r.nearMiss >= 3, progress: (r) => Math.min(r.nearMiss, 3) + '/3' },
  { id: 'desert_ch_2', name: 'DESERT: Reach lane 110', reward: 150, worldId: 'desert', tier: 'challenge', check: (r) => r.maxLane >= 110, progress: (r) => Math.min(r.maxLane, 110) + '/110' },
  { id: 'desert_mas_1', name: 'DESERT: Reach lane 120 (world end)', reward: 320, worldId: 'desert', tier: 'master', check: (r) => r.maxLane >= 120, progress: (r) => Math.min(r.maxLane, 120) + '/120' },
  // ---- WORLD 04 SNOW ----
  { id: 'snow_std_1', name: 'SNOW: Cross into the storm (lane 135)', reward: 100, worldId: 'snow', tier: 'standard', check: (r) => r.maxLane >= 135, progress: (r) => Math.min(r.maxLane, 135) + '/135' },
  { id: 'snow_std_2', name: 'SNOW: Collect 30 coins', reward: 100, worldId: 'snow', tier: 'standard', check: (_r, t) => t >= 30, progress: (_r, t) => Math.min(t, 30) + '/30' },
  { id: 'snow_ch_1', name: 'SNOW: 3 near misses in one run', reward: 170, worldId: 'snow', tier: 'challenge', check: (r) => r.nearMiss >= 3, progress: (r) => Math.min(r.nearMiss, 3) + '/3' },
  { id: 'snow_ch_2', name: 'SNOW: Reach lane 150', reward: 180, worldId: 'snow', tier: 'challenge', check: (r) => r.maxLane >= 150, progress: (r) => Math.min(r.maxLane, 150) + '/150' },
  { id: 'snow_mas_1', name: 'SNOW: Reach lane 160 (world end)', reward: 380, worldId: 'snow', tier: 'master', check: (r) => r.maxLane >= 160, progress: (r) => Math.min(r.maxLane, 160) + '/160' },
  // ---- WORLD 05 NEON CITY (dense traffic: near-miss mastery) ----
  { id: 'neon_std_1', name: 'NEON: Cross into the lights (lane 175)', reward: 120, worldId: 'neon', tier: 'standard', check: (r) => r.maxLane >= 175, progress: (r) => Math.min(r.maxLane, 175) + '/175' },
  { id: 'neon_std_2', name: 'NEON: Collect 40 coins', reward: 120, worldId: 'neon', tier: 'standard', check: (_r, t) => t >= 40, progress: (_r, t) => Math.min(t, 40) + '/40' },
  { id: 'neon_ch_1', name: 'NEON: 4 near misses in one run', reward: 200, worldId: 'neon', tier: 'challenge', check: (r) => r.nearMiss >= 4, progress: (r) => Math.min(r.nearMiss, 4) + '/4' },
  { id: 'neon_ch_2', name: 'NEON: Reach lane 190', reward: 210, worldId: 'neon', tier: 'challenge', check: (r) => r.maxLane >= 190, progress: (r) => Math.min(r.maxLane, 190) + '/190' },
  { id: 'neon_mas_1', name: 'NEON: Reach lane 200 (world end)', reward: 440, worldId: 'neon', tier: 'master', check: (r) => r.maxLane >= 200, progress: (r) => Math.min(r.maxLane, 200) + '/200' },
  // ---- WORLD 06 BEACH ----
  { id: 'beach_std_1', name: 'BEACH: Cross onto the sand (lane 215)', reward: 140, worldId: 'beach', tier: 'standard', check: (r) => r.maxLane >= 215, progress: (r) => Math.min(r.maxLane, 215) + '/215' },
  { id: 'beach_std_2', name: 'BEACH: Collect 50 coins', reward: 140, worldId: 'beach', tier: 'standard', check: (_r, t) => t >= 50, progress: (_r, t) => Math.min(t, 50) + '/50' },
  { id: 'beach_ch_1', name: 'BEACH: 4 near misses in one run', reward: 230, worldId: 'beach', tier: 'challenge', check: (r) => r.nearMiss >= 4, progress: (r) => Math.min(r.nearMiss, 4) + '/4' },
  { id: 'beach_ch_2', name: 'BEACH: Reach lane 230', reward: 240, worldId: 'beach', tier: 'challenge', check: (r) => r.maxLane >= 230, progress: (r) => Math.min(r.maxLane, 230) + '/230' },
  { id: 'beach_mas_1', name: 'BEACH: Reach lane 240 (world end)', reward: 500, worldId: 'beach', tier: 'master', check: (r) => r.maxLane >= 240, progress: (r) => Math.min(r.maxLane, 240) + '/240' },
];

/**
 * §53 — world-aware mission buckets. Active missions for the current world
 * = global missions (no worldId) + WORLD_MISSIONS[activeWorldId].
 */
export const WORLD_MISSIONS: Record<string, string[]> = {
  city: ['city_std_1', 'city_std_2', 'city_ch_1', 'city_ch_2', 'city_mas_1'],
  jungle: ['jungle_std_1', 'jungle_std_2', 'jungle_ch_1', 'jungle_ch_2', 'jungle_mas_1'],
  desert: ['desert_std_1', 'desert_std_2', 'desert_ch_1', 'desert_ch_2', 'desert_mas_1'],
  snow: ['snow_std_1', 'snow_std_2', 'snow_ch_1', 'snow_ch_2', 'snow_mas_1'],
  neon: ['neon_std_1', 'neon_std_2', 'neon_ch_1', 'neon_ch_2', 'neon_mas_1'],
  beach: ['beach_std_1', 'beach_std_2', 'beach_ch_1', 'beach_ch_2', 'beach_mas_1'],
  suburbs: [],
  highway: [],
  industrial: [],
  construction: [],
  port: [],
  airport: [],
  metro: [],
  oldtown: [],
  mega: [],
};

/** Mission ids that should be evaluated while `worldId` is active. */
export function activeMissionIds(worldId: string): string[] {
  const global = MISSIONS.filter((m) => !m.worldId).map((m) => m.id);
  const scoped = WORLD_MISSIONS[worldId] ?? [];
  return [...global, ...scoped];
}

export function missionById(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export interface AchievementDef {
  id: string;
  name: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first', name: 'First Cross — play a run' },
  { id: 's100', name: '100 Steps (total)' },
  { id: 's500', name: '500 Steps (total)' },
  { id: 'rich', name: 'Coin Collector — 100 coins' },
  { id: 'close', name: 'Close Call — first near miss' },
  { id: 'untouch', name: 'Untouchable — reach 50 in one run' },
];

