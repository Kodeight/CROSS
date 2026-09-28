/** Versioned save-shape. Never let a broken save crash the game. */

import type { DifficultyLevel } from '../config/difficulty.config';

export interface GameSettings {
  music: boolean;
  sfx: boolean;
  musicVolume?: number;
  sfxVolume?: number;
  reducedMotion: boolean;
  quality: 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH';
  difficulty: DifficultyLevel;
}

export interface GameStats {
  totalSteps: number;
  gamesPlayed: number;
  totalNearMiss: number;
}

/** Daily-mission progress accumulated for a single calendar day. */
export interface DailyProgressState {
  steps: number;
  coins: number;
  nearMiss: number;
  runs: number;
  maxLane: number;
  runsOver30: number;
  cleanRuns: number;
  worldLanes: Record<string, number>;
}

/** Persisted daily-mission bucket, keyed by calendar date (YYYY-MM-DD). */
export interface DailyMissionsSave {
  date: string;
  completed: Record<string, boolean>;
  progress: DailyProgressState;
}

export function defaultDailyProgress(): DailyProgressState {
  return {
    steps: 0,
    coins: 0,
    nearMiss: 0,
    runs: 0,
    maxLane: 0,
    runsOver30: 0,
    cleanRuns: 0,
    worldLanes: {},
  };
}

/** Daily streak login tracking and rewards state */
export interface DailyStreakSave {
  currentStreak: number;
  bestStreak: number;
  lastLoginDate: string; // YYYY-MM-DD
  lastClaimDate: string; // YYYY-MM-DD
  claimedToday: boolean;
  totalDaysLogged: number;
}

export function defaultDailyStreak(): DailyStreakSave {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastLoginDate: '',
    lastClaimDate: '',
    claimedToday: false,
    totalDaysLogged: 0,
  };
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
  achievements: Record<string, boolean>;
  dailyMissions: DailyMissionsSave;
  streak: DailyStreakSave;
  settings: GameSettings;
  stats: GameStats;
  tutorialShown: boolean;
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
    achievements: {},
    dailyMissions: { date: '', completed: {}, progress: defaultDailyProgress() },
    streak: defaultDailyStreak(),
    settings: { music: true, sfx: true, musicVolume: 0.8, sfxVolume: 0.8, reducedMotion: false, quality: 'AUTO', difficulty: 'NORMAL' },
    stats: { totalSteps: 0, gamesPlayed: 0, totalNearMiss: 0 },
    tutorialShown: false,
  };
}
