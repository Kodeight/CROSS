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
  /**
   * Progressive unlock: mission ids that must be completed first.
   * Challenge requires standard, master requires challenge — completing
   * one pool opens the next, so objectives never run dry. Data-driven and
   * future-proof for additional (e.g. generated) pools.
   */
  requires?: string[];
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
  { id: 'city_ch_1', name: 'CITY: 2 near misses in one run', reward: 80, worldId: 'city', tier: 'challenge', requires: ['city_std_1', 'city_std_2'], check: (r) => r.nearMiss >= 2, progress: (r) => Math.min(r.nearMiss, 2) + '/2' },
  { id: 'city_ch_2', name: 'CITY: Reach lane 30', reward: 90, worldId: 'city', tier: 'challenge', requires: ['city_std_1', 'city_std_2'], check: (r) => r.maxLane >= 30, progress: (r) => Math.min(r.maxLane, 30) + '/30' },
  { id: 'city_mas_1', name: 'CITY: Reach lane 40 (world end)', reward: 200, worldId: 'city', tier: 'master', requires: ['city_ch_1', 'city_ch_2'], check: (r) => r.maxLane >= 40, progress: (r) => Math.min(r.maxLane, 40) + '/40' },
  // ---- WORLD 02 RIVER ----
  { id: 'river_std_1', name: 'RIVER: Cross the docks (lane 55)', reward: 60, worldId: 'river', tier: 'standard', check: (r) => r.maxLane >= 55, progress: (r) => Math.min(r.maxLane, 55) + '/55' },
  { id: 'river_std_2', name: 'RIVER: Collect 15 coins', reward: 60, worldId: 'river', tier: 'standard', check: (_r, t) => t >= 15, progress: (_r, t) => Math.min(t, 15) + '/15' },
  { id: 'river_ch_1', name: 'RIVER: 2 near misses in one run', reward: 110, worldId: 'river', tier: 'challenge', requires: ['river_std_1', 'river_std_2'], check: (r) => r.nearMiss >= 2, progress: (r) => Math.min(r.nearMiss, 2) + '/2' },
  { id: 'river_ch_2', name: 'RIVER: Reach lane 70', reward: 120, worldId: 'river', tier: 'challenge', requires: ['river_std_1', 'river_std_2'], check: (r) => r.maxLane >= 70, progress: (r) => Math.min(r.maxLane, 70) + '/70' },
  { id: 'river_mas_1', name: 'RIVER: Reach lane 80 (world end)', reward: 260, worldId: 'river', tier: 'master', requires: ['river_ch_1', 'river_ch_2'], check: (r) => r.maxLane >= 80, progress: (r) => Math.min(r.maxLane, 80) + '/80' },
  // ---- WORLD 03 BEACH ----
  { id: 'beach_std_1', name: 'BEACH: Cross onto the sand (lane 95)', reward: 80, worldId: 'beach', tier: 'standard', check: (r) => r.maxLane >= 95, progress: (r) => Math.min(r.maxLane, 95) + '/95' },
  { id: 'beach_std_2', name: 'BEACH: Collect 20 coins', reward: 80, worldId: 'beach', tier: 'standard', check: (_r, t) => t >= 20, progress: (_r, t) => Math.min(t, 20) + '/20' },
  { id: 'beach_ch_1', name: 'BEACH: 3 near misses in one run', reward: 140, worldId: 'beach', tier: 'challenge', requires: ['beach_std_1', 'beach_std_2'], check: (r) => r.nearMiss >= 3, progress: (r) => Math.min(r.nearMiss, 3) + '/3' },
  { id: 'beach_ch_2', name: 'BEACH: Reach lane 110', reward: 150, worldId: 'beach', tier: 'challenge', requires: ['beach_std_1', 'beach_std_2'], check: (r) => r.maxLane >= 110, progress: (r) => Math.min(r.maxLane, 110) + '/110' },
  { id: 'beach_mas_1', name: 'BEACH: Reach lane 120 (world end)', reward: 320, worldId: 'beach', tier: 'master', requires: ['beach_ch_1', 'beach_ch_2'], check: (r) => r.maxLane >= 120, progress: (r) => Math.min(r.maxLane, 120) + '/120' },
  // ---- WORLD 04 VOLCANO ----
  { id: 'volcano_std_1', name: 'VOLCANO: Cross into the crater (lane 135)', reward: 100, worldId: 'volcano', tier: 'standard', check: (r) => r.maxLane >= 135, progress: (r) => Math.min(r.maxLane, 135) + '/135' },
  { id: 'volcano_std_2', name: 'VOLCANO: Collect 30 coins', reward: 100, worldId: 'volcano', tier: 'standard', check: (_r, t) => t >= 30, progress: (_r, t) => Math.min(t, 30) + '/30' },
  { id: 'volcano_ch_1', name: 'VOLCANO: 3 near misses in one run', reward: 170, worldId: 'volcano', tier: 'challenge', requires: ['volcano_std_1', 'volcano_std_2'], check: (r) => r.nearMiss >= 3, progress: (r) => Math.min(r.nearMiss, 3) + '/3' },
  { id: 'volcano_ch_2', name: 'VOLCANO: Reach lane 150', reward: 180, worldId: 'volcano', tier: 'challenge', requires: ['volcano_std_1', 'volcano_std_2'], check: (r) => r.maxLane >= 150, progress: (r) => Math.min(r.maxLane, 150) + '/150' },
  { id: 'volcano_mas_1', name: 'VOLCANO: Reach lane 160 (world end)', reward: 380, worldId: 'volcano', tier: 'master', requires: ['volcano_ch_1', 'volcano_ch_2'], check: (r) => r.maxLane >= 160, progress: (r) => Math.min(r.maxLane, 160) + '/160' },
  // ---- WORLD 05 TOKYO (dense traffic: near-miss mastery) ----
  { id: 'tokyo_std_1', name: 'TOKYO: Cross into the lights (lane 175)', reward: 120, worldId: 'tokyo', tier: 'standard', check: (r) => r.maxLane >= 175, progress: (r) => Math.min(r.maxLane, 175) + '/175' },
  { id: 'tokyo_std_2', name: 'TOKYO: Collect 40 coins', reward: 120, worldId: 'tokyo', tier: 'standard', check: (_r, t) => t >= 40, progress: (_r, t) => Math.min(t, 40) + '/40' },
  { id: 'tokyo_ch_1', name: 'TOKYO: 4 near misses in one run', reward: 200, worldId: 'tokyo', tier: 'challenge', requires: ['tokyo_std_1', 'tokyo_std_2'], check: (r) => r.nearMiss >= 4, progress: (r) => Math.min(r.nearMiss, 4) + '/4' },
  { id: 'tokyo_ch_2', name: 'TOKYO: Reach lane 190', reward: 210, worldId: 'tokyo', tier: 'challenge', requires: ['tokyo_std_1', 'tokyo_std_2'], check: (r) => r.maxLane >= 190, progress: (r) => Math.min(r.maxLane, 190) + '/190' },
  { id: 'tokyo_mas_1', name: 'TOKYO: Reach lane 200 (world end)', reward: 440, worldId: 'tokyo', tier: 'master', requires: ['tokyo_ch_1', 'tokyo_ch_2'], check: (r) => r.maxLane >= 200, progress: (r) => Math.min(r.maxLane, 200) + '/200' },
];

/**
 * §53 — world-aware mission buckets. Active missions for the current world
 * = global missions (no worldId) + WORLD_MISSIONS[activeWorldId].
 */
export const WORLD_MISSIONS: Record<string, string[]> = {
  city: ['city_std_1', 'city_std_2', 'city_ch_1', 'city_ch_2', 'city_mas_1'],
  river: ['river_std_1', 'river_std_2', 'river_ch_1', 'river_ch_2', 'river_mas_1'],
  beach: ['beach_std_1', 'beach_std_2', 'beach_ch_1', 'beach_ch_2', 'beach_mas_1'],
  volcano: ['volcano_std_1', 'volcano_std_2', 'volcano_ch_1', 'volcano_ch_2', 'volcano_mas_1'],
  tokyo: ['tokyo_std_1', 'tokyo_std_2', 'tokyo_ch_1', 'tokyo_ch_2', 'tokyo_mas_1'],
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
  desc?: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first', name: 'First Cross', desc: 'Complete your very first run' },
  { id: 's100', name: 'Century Club', desc: 'Accumulate 100 total hops' },
  { id: 's500', name: 'Road Veteran', desc: 'Accumulate 500 total hops' },
  { id: 'rich', name: 'Coin Collector', desc: 'Collect 100 total gold coins' },
  { id: 'close', name: 'Close Call', desc: 'Execute your first near miss dodge' },
  { id: 'untouch', name: 'Untouchable', desc: 'Reach lane 50 in a single run' },
  { id: 'streak3', name: 'On A Roll', desc: 'Maintain a 3-day consecutive login streak' },
  { id: 'streak7', name: 'Weekly Legend', desc: 'Achieve a 7-day consecutive login streak' },
];

