/**
 * Daily Missions Catalog & Rotation Engine.
 *
 * Provides a massive roster of 40 varied daily missions categorized across
 * distance, single-run lane peaks, coin gathering, near-miss reflexes,
 * play volume, world exploration, and mastery challenges.
 *
 * Deterministically rotates 8 balanced daily missions every day based on
 * the current calendar date, providing fresh objectives and generous rewards.
 */
import type { DailyProgressState } from '../save/SaveData';

export interface RunState {
  maxLane: number;
  nearMiss: number;
  runCoins: number;
}

export interface DailyMissionDef {
  id: string;
  category: 'steps' | 'runLane' | 'coins' | 'runCoins' | 'nearMiss' | 'runs' | 'world' | 'finesse';
  title: string;
  reward: number;
  target: number;
  getProgress: (daily: DailyProgressState, run: RunState, completedCount: number) => { current: number; target: number; formatted: string };
  isComplete: (daily: DailyProgressState, run: RunState, completedCount: number) => boolean;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyResetCountdown(): string {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `Resets in ${hours}h ${mins}m`;
}

export function getDaySeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// ----------------------------------------------------------------------
// 40 Unique Daily Missions Pool Across 8 Categories
// ----------------------------------------------------------------------

const STEPS_POOL: DailyMissionDef[] = [
  {
    id: 'dm_step_25', category: 'steps', title: 'Morning Jog: Hop 25 lanes today', reward: 50, target: 25,
    getProgress: (d) => ({ current: d.steps, target: 25, formatted: `${Math.min(d.steps, 25)}/25` }),
    isComplete: (d) => d.steps >= 25,
  },
  {
    id: 'dm_step_50', category: 'steps', title: 'Daily Commute: Hop 50 lanes today', reward: 80, target: 50,
    getProgress: (d) => ({ current: d.steps, target: 50, formatted: `${Math.min(d.steps, 50)}/50` }),
    isComplete: (d) => d.steps >= 50,
  },
  {
    id: 'dm_step_100', category: 'steps', title: 'Cross-Town Journey: Hop 100 lanes today', reward: 130, target: 100,
    getProgress: (d) => ({ current: d.steps, target: 100, formatted: `${Math.min(d.steps, 100)}/100` }),
    isComplete: (d) => d.steps >= 100,
  },
  {
    id: 'dm_step_175', category: 'steps', title: 'Pavement Marathon: Hop 175 lanes today', reward: 200, target: 175,
    getProgress: (d) => ({ current: d.steps, target: 175, formatted: `${Math.min(d.steps, 175)}/175` }),
    isComplete: (d) => d.steps >= 175,
  },
  {
    id: 'dm_step_250', category: 'steps', title: 'Ultra Endurance: Hop 250 lanes today', reward: 300, target: 250,
    getProgress: (d) => ({ current: d.steps, target: 250, formatted: `${Math.min(d.steps, 250)}/250` }),
    isComplete: (d) => d.steps >= 250,
  },
];

const RUN_LANE_POOL: DailyMissionDef[] = [
  {
    id: 'dm_lane_20', category: 'runLane', title: 'Short Sprint: Reach lane 20 in one run', reward: 50, target: 20,
    getProgress: (d, r) => { const c = Math.max(d.maxLane, r.maxLane); return { current: c, target: 20, formatted: `${Math.min(c, 20)}/20` }; },
    isComplete: (d, r) => Math.max(d.maxLane, r.maxLane) >= 20,
  },
  {
    id: 'dm_lane_35', category: 'runLane', title: 'Swift Strider: Reach lane 35 in one run', reward: 85, target: 35,
    getProgress: (d, r) => { const c = Math.max(d.maxLane, r.maxLane); return { current: c, target: 35, formatted: `${Math.min(c, 35)}/35` }; },
    isComplete: (d, r) => Math.max(d.maxLane, r.maxLane) >= 35,
  },
  {
    id: 'dm_lane_50', category: 'runLane', title: 'Road Pioneer: Reach lane 50 in one run', reward: 130, target: 50,
    getProgress: (d, r) => { const c = Math.max(d.maxLane, r.maxLane); return { current: c, target: 50, formatted: `${Math.min(c, 50)}/50` }; },
    isComplete: (d, r) => Math.max(d.maxLane, r.maxLane) >= 50,
  },
  {
    id: 'dm_lane_75', category: 'runLane', title: 'Frontier Crossing: Reach lane 75 in one run', reward: 200, target: 75,
    getProgress: (d, r) => { const c = Math.max(d.maxLane, r.maxLane); return { current: c, target: 75, formatted: `${Math.min(c, 75)}/75` }; },
    isComplete: (d, r) => Math.max(d.maxLane, r.maxLane) >= 75,
  },
  {
    id: 'dm_lane_100', category: 'runLane', title: 'Centurion Runner: Reach lane 100 in one run', reward: 320, target: 100,
    getProgress: (d, r) => { const c = Math.max(d.maxLane, r.maxLane); return { current: c, target: 100, formatted: `${Math.min(c, 100)}/100` }; },
    isComplete: (d, r) => Math.max(d.maxLane, r.maxLane) >= 100,
  },
];

const COINS_POOL: DailyMissionDef[] = [
  {
    id: 'dm_coin_8', category: 'coins', title: 'Coin Collector: Collect 8 coins today', reward: 50, target: 8,
    getProgress: (d) => ({ current: d.coins, target: 8, formatted: `${Math.min(d.coins, 8)}/8` }),
    isComplete: (d) => d.coins >= 8,
  },
  {
    id: 'dm_coin_20', category: 'coins', title: 'Treasure Hunter: Collect 20 coins today', reward: 90, target: 20,
    getProgress: (d) => ({ current: d.coins, target: 20, formatted: `${Math.min(d.coins, 20)}/20` }),
    isComplete: (d) => d.coins >= 20,
  },
  {
    id: 'dm_coin_40', category: 'coins', title: 'Gold Miner: Collect 40 coins today', reward: 160, target: 40,
    getProgress: (d) => ({ current: d.coins, target: 40, formatted: `${Math.min(d.coins, 40)}/40` }),
    isComplete: (d) => d.coins >= 40,
  },
  {
    id: 'dm_coin_65', category: 'coins', title: 'Vault Raider: Collect 65 coins today', reward: 240, target: 65,
    getProgress: (d) => ({ current: d.coins, target: 65, formatted: `${Math.min(d.coins, 65)}/65` }),
    isComplete: (d) => d.coins >= 65,
  },
  {
    id: 'dm_coin_100', category: 'coins', title: 'Daily Tycoon: Collect 100 coins today', reward: 400, target: 100,
    getProgress: (d) => ({ current: d.coins, target: 100, formatted: `${Math.min(d.coins, 100)}/100` }),
    isComplete: (d) => d.coins >= 100,
  },
];

const RUN_COINS_POOL: DailyMissionDef[] = [
  {
    id: 'dm_run_coin_4', category: 'runCoins', title: 'Pocket Change: Collect 4 coins in one run', reward: 60, target: 4,
    getProgress: (_d, r) => ({ current: r.runCoins, target: 4, formatted: `${Math.min(r.runCoins, 4)}/4` }),
    isComplete: (_d, r) => r.runCoins >= 4,
  },
  {
    id: 'dm_run_coin_8', category: 'runCoins', title: 'Lucky Run: Collect 8 coins in one run', reward: 110, target: 8,
    getProgress: (_d, r) => ({ current: r.runCoins, target: 8, formatted: `${Math.min(r.runCoins, 8)}/8` }),
    isComplete: (_d, r) => r.runCoins >= 8,
  },
  {
    id: 'dm_run_coin_12', category: 'runCoins', title: 'Gold Rush Run: Collect 12 coins in one run', reward: 170, target: 12,
    getProgress: (_d, r) => ({ current: r.runCoins, target: 12, formatted: `${Math.min(r.runCoins, 12)}/12` }),
    isComplete: (_d, r) => r.runCoins >= 12,
  },
  {
    id: 'dm_run_coin_18', category: 'runCoins', title: 'Jackpot Run: Collect 18 coins in one run', reward: 260, target: 18,
    getProgress: (_d, r) => ({ current: r.runCoins, target: 18, formatted: `${Math.min(r.runCoins, 18)}/18` }),
    isComplete: (_d, r) => r.runCoins >= 18,
  },
];

const NEAR_MISS_POOL: DailyMissionDef[] = [
  {
    id: 'dm_near_2', category: 'nearMiss', title: 'Close Call: Get 2 near misses today', reward: 60, target: 2,
    getProgress: (d) => ({ current: d.nearMiss, target: 2, formatted: `${Math.min(d.nearMiss, 2)}/2` }),
    isComplete: (d) => d.nearMiss >= 2,
  },
  {
    id: 'dm_near_5', category: 'nearMiss', title: 'Daredevil: Get 5 near misses today', reward: 130, target: 5,
    getProgress: (d) => ({ current: d.nearMiss, target: 5, formatted: `${Math.min(d.nearMiss, 5)}/5` }),
    isComplete: (d) => d.nearMiss >= 5,
  },
  {
    id: 'dm_near_8', category: 'nearMiss', title: 'Traffic Dancer: Get 8 near misses today', reward: 210, target: 8,
    getProgress: (d) => ({ current: d.nearMiss, target: 8, formatted: `${Math.min(d.nearMiss, 8)}/8` }),
    isComplete: (d) => d.nearMiss >= 8,
  },
  {
    id: 'dm_run_near_2', category: 'nearMiss', title: 'Split Second: 2 near misses in one run', reward: 80, target: 2,
    getProgress: (_d, r) => ({ current: r.nearMiss, target: 2, formatted: `${Math.min(r.nearMiss, 2)}/2` }),
    isComplete: (_d, r) => r.nearMiss >= 2,
  },
  {
    id: 'dm_run_near_4', category: 'nearMiss', title: 'Adrenaline Rush: 4 near misses in one run', reward: 180, target: 4,
    getProgress: (_d, r) => ({ current: r.nearMiss, target: 4, formatted: `${Math.min(r.nearMiss, 4)}/4` }),
    isComplete: (_d, r) => r.nearMiss >= 4,
  },
  {
    id: 'dm_run_near_6', category: 'nearMiss', title: 'Matrix Reflexes: 6 near misses in one run', reward: 300, target: 6,
    getProgress: (_d, r) => ({ current: r.nearMiss, target: 6, formatted: `${Math.min(r.nearMiss, 6)}/6` }),
    isComplete: (_d, r) => r.nearMiss >= 6,
  },
];

const RUNS_POOL: DailyMissionDef[] = [
  {
    id: 'dm_runs_2', category: 'runs', title: 'Morning Warmup: Play 2 runs today', reward: 40, target: 2,
    getProgress: (d) => ({ current: d.runs, target: 2, formatted: `${Math.min(d.runs, 2)}/2` }),
    isComplete: (d) => d.runs >= 2,
  },
  {
    id: 'dm_runs_4', category: 'runs', title: 'Daily Regular: Play 4 runs today', reward: 80, target: 4,
    getProgress: (d) => ({ current: d.runs, target: 4, formatted: `${Math.min(d.runs, 4)}/4` }),
    isComplete: (d) => d.runs >= 4,
  },
  {
    id: 'dm_runs_6', category: 'runs', title: 'Determined Hopper: Play 6 runs today', reward: 130, target: 6,
    getProgress: (d) => ({ current: d.runs, target: 6, formatted: `${Math.min(d.runs, 6)}/6` }),
    isComplete: (d) => d.runs >= 6,
  },
  {
    id: 'dm_runs_9', category: 'runs', title: 'Marathon Session: Play 9 runs today', reward: 200, target: 9,
    getProgress: (d) => ({ current: d.runs, target: 9, formatted: `${Math.min(d.runs, 9)}/9` }),
    isComplete: (d) => d.runs >= 9,
  },
];

const WORLD_POOL: DailyMissionDef[] = [
  {
    id: 'dm_world_city', category: 'world', title: 'City Patrol: Cross 25 lanes in City today', reward: 80, target: 25,
    getProgress: (d) => { const c = d.worldLanes['city'] ?? 0; return { current: c, target: 25, formatted: `${Math.min(c, 25)}/25` }; },
    isComplete: (d) => (d.worldLanes['city'] ?? 0) >= 25,
  },
  {
    id: 'dm_world_jungle', category: 'world', title: 'Jungle Trek: Cross 25 lanes in Jungle today', reward: 100, target: 25,
    getProgress: (d) => { const c = d.worldLanes['jungle'] ?? 0; return { current: c, target: 25, formatted: `${Math.min(c, 25)}/25` }; },
    isComplete: (d) => (d.worldLanes['jungle'] ?? 0) >= 25,
  },
  {
    id: 'dm_world_desert', category: 'world', title: 'Dune Cruiser: Cross 25 lanes in Desert today', reward: 120, target: 25,
    getProgress: (d) => { const c = d.worldLanes['desert'] ?? 0; return { current: c, target: 25, formatted: `${Math.min(c, 25)}/25` }; },
    isComplete: (d) => (d.worldLanes['desert'] ?? 0) >= 25,
  },
  {
    id: 'dm_world_snow', category: 'world', title: 'Blizzard Rider: Cross 25 lanes in Snow today', reward: 140, target: 25,
    getProgress: (d) => { const c = d.worldLanes['snow'] ?? 0; return { current: c, target: 25, formatted: `${Math.min(c, 25)}/25` }; },
    isComplete: (d) => (d.worldLanes['snow'] ?? 0) >= 25,
  },
  {
    id: 'dm_world_neon', category: 'world', title: 'Night City: Cross 25 lanes in Neon today', reward: 160, target: 25,
    getProgress: (d) => { const c = d.worldLanes['neon'] ?? 0; return { current: c, target: 25, formatted: `${Math.min(c, 25)}/25` }; },
    isComplete: (d) => (d.worldLanes['neon'] ?? 0) >= 25,
  },
  {
    id: 'dm_world_beach', category: 'world', title: 'Coastal Drift: Cross 25 lanes in Beach today', reward: 180, target: 25,
    getProgress: (d) => { const c = d.worldLanes['beach'] ?? 0; return { current: c, target: 25, formatted: `${Math.min(c, 25)}/25` }; },
    isComplete: (d) => (d.worldLanes['beach'] ?? 0) >= 25,
  },
];

const FINESSE_POOL: DailyMissionDef[] = [
  {
    id: 'dm_clean_25', category: 'finesse', title: 'Clean Boots: Reach lane 25 without any near miss', reward: 100, target: 1,
    getProgress: (d, r) => {
      const live = r.maxLane >= 25 && r.nearMiss === 0;
      const done = d.cleanRuns > 0 || live;
      return { current: done ? 1 : 0, target: 1, formatted: done ? '1/1' : '0/1' };
    },
    isComplete: (d, r) => d.cleanRuns > 0 || (r.maxLane >= 25 && r.nearMiss === 0),
  },
  {
    id: 'dm_clean_40', category: 'finesse', title: 'Silent Hopper: Reach lane 40 without any near miss', reward: 180, target: 1,
    getProgress: (d, r) => {
      const live = r.maxLane >= 40 && r.nearMiss === 0;
      const done = d.cleanRuns > 0 || live;
      return { current: done ? 1 : 0, target: 1, formatted: done ? '1/1' : '0/1' };
    },
    isComplete: (d, r) => d.cleanRuns > 0 || (r.maxLane >= 40 && r.nearMiss === 0),
  },
  {
    id: 'dm_double_35', category: 'finesse', title: 'Consistent Strides: Score 35+ in 2 different runs today', reward: 140, target: 2,
    getProgress: (d) => ({ current: d.runsOver30, target: 2, formatted: `${Math.min(d.runsOver30, 2)}/2` }),
    isComplete: (d) => d.runsOver30 >= 2,
  },
  {
    id: 'dm_sweep_4', category: 'finesse', title: 'Daily Achiever: Complete 4 other daily missions today', reward: 200, target: 4,
    getProgress: (_d, _r, count) => ({ current: count, target: 4, formatted: `${Math.min(count, 4)}/4` }),
    isComplete: (_d, _r, count) => count >= 4,
  },
  {
    id: 'dm_sweep_6', category: 'finesse', title: 'Daily Grand Sweep: Complete 6 other daily missions today', reward: 350, target: 6,
    getProgress: (_d, _r, count) => ({ current: count, target: 6, formatted: `${Math.min(count, 6)}/6` }),
    isComplete: (_d, _r, count) => count >= 6,
  },
];

/**
 * Returns 8 active daily missions deterministically chosen for the given date.
 */
export function getActiveDailyMissions(dateStr: string): DailyMissionDef[] {
  const seed = getDaySeed(dateStr);
  return [
    STEPS_POOL[seed % STEPS_POOL.length],
    RUN_LANE_POOL[(seed + 1) % RUN_LANE_POOL.length],
    COINS_POOL[(seed + 2) % COINS_POOL.length],
    RUN_COINS_POOL[(seed + 3) % RUN_COINS_POOL.length],
    NEAR_MISS_POOL[(seed + 4) % NEAR_MISS_POOL.length],
    RUNS_POOL[(seed + 5) % RUNS_POOL.length],
    WORLD_POOL[(seed + 6) % WORLD_POOL.length],
    FINESSE_POOL[(seed + 7) % FINESSE_POOL.length],
  ];
}
