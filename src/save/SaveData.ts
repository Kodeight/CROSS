/** Versioned save-shape. Never let a broken save crash the game. */

import type { DifficultyLevel } from '../config/difficulty.config';

export interface GameSettings {
  music: boolean;
  sfx: boolean;
  reducedMotion: boolean;
  quality: 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH';
  difficulty: DifficultyLevel;
}

export interface GameStats {
  totalSteps: number;
  gamesPlayed: number;
  totalNearMiss: number;
}

export interface DailyProgressState {
  steps: number;
  coins: number;
  nearMiss: number;
  runs: number;
  maxLane: number;
  worldLanes: Record<string, number>;
  cleanRuns: number;
  runsOver30: number;
}

export interface DailyMissionsSave {
  date: string;
  completed: Record<string, boolean>;
  progress: DailyProgressState;
}

export interface SaveData {
  version: 1;
  bestScore: number;
  coins: number;
  totalCoins: number;
  selectedCharacter: string;
  unlocked: string[];
  selectedWorld: string;
  unlockedWorlds: string[];
  worldBest: Record<string, number>;
  /**
   * Journey checkpoint: the world + lane to resume near on the next run.
   * Updated on world transitions and death — never an exact dangerous
   * position (newRun backs off and re-validates safety).
   */
  lastWorldId: string;
  lastLane: number;
  missions: Record<string, boolean>;
  dailyMissions: DailyMissionsSave;
  achievements: Record<string, boolean>;
  settings: GameSettings;
  stats: GameStats;
  tutorialShown: boolean;
  completedStages: Record<string, number>;
  discoveredCollectibles: Record<string, number>;
}

export function defaultDailyProgress(): DailyProgressState {
  return {
    steps: 0,
    coins: 0,
    nearMiss: 0,
    runs: 0,
    maxLane: 0,
    worldLanes: {},
    cleanRuns: 0,
    runsOver30: 0,
  };
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    bestScore: 0,
    coins: 0,
    totalCoins: 0,
    selectedCharacter: 'chicken',
    unlocked: ['chicken'],
    selectedWorld: 'city',
    unlockedWorlds: ['city'],
    worldBest: {},
    lastWorldId: 'city',
    lastLane: 0,
    missions: {},
    dailyMissions: {
      date: '',
      completed: {},
      progress: defaultDailyProgress(),
    },
    achievements: {},
    settings: { music: true, sfx: true, reducedMotion: false, quality: 'AUTO', difficulty: 'NORMAL' },
    stats: { totalSteps: 0, gamesPlayed: 0, totalNearMiss: 0 },
    tutorialShown: false,
    completedStages: {},
    discoveredCollectibles: {},
  };
}
