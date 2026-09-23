/** Versioned save-shape. Never let a broken save crash the game. */

export interface GameSettings {
  music: boolean;
  sfx: boolean;
  reducedMotion: boolean;
  quality: 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GameStats {
  totalSteps: number;
  gamesPlayed: number;
  totalNearMiss: number;
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
    settings: { music: true, sfx: true, reducedMotion: false, quality: 'AUTO' },
    stats: { totalSteps: 0, gamesPlayed: 0, totalNearMiss: 0 },
    tutorialShown: false,
  };
}
