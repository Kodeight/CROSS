/** Missions + achievements data. */

export interface RunSummary {
  maxLane: number;
  nearMiss: number;
}

export interface MissionDef {
  id: string;
  name: string;
  reward: number;
  check: (run: RunSummary, totalCoins: number) => boolean;
  progress: (run: RunSummary, totalCoins: number) => string;
}

export const MISSIONS: MissionDef[] = [
  { id: 'm20', name: 'Cross 20 lanes in one run', reward: 50, check: (r) => r.maxLane >= 20, progress: (r) => Math.min(r.maxLane, 20) + '/20' },
  { id: 'm50', name: 'Reach lane 50 in one run', reward: 150, check: (r) => r.maxLane >= 50, progress: (r) => Math.min(r.maxLane, 50) + '/50' },
  { id: 'm100', name: 'Reach lane 100', reward: 300, check: (r) => r.maxLane >= 100, progress: (r) => Math.min(r.maxLane, 100) + '/100' },
  { id: 'c25', name: 'Collect 25 coins (total)', reward: 100, check: (_r, t) => t >= 25, progress: (_r, t) => Math.min(t, 25) + '/25' },
  { id: 'n3', name: '3 near misses in one run', reward: 120, check: (r) => r.nearMiss >= 3, progress: (r) => Math.min(r.nearMiss, 3) + '/3' },
];

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
