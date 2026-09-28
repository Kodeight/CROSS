/**
 * Difficulty settings and continuous difficulty scaling formulas.
 */

export type DifficultyLevel = 'EASY' | 'NORMAL' | 'HARD' | 'VERY_HARD' | 'EXTREME';

export interface DifficultySpec {
  id: DifficultyLevel;
  name: string;
  multiplier: number;
  description: string;
  trafficDensityBonus: number;
  minGapFactor: number;
  eventFrequencyMul: number;
  obstacleDensityMul: number;
  maxConsecutiveRoads: number;
  powerSpawnChance: number;
  reactMsMul: number;
}

export const DIFFICULTY_SPECS: Record<DifficultyLevel, DifficultySpec> = {
  EASY: {
    id: 'EASY',
    name: 'EASY',
    multiplier: 0.72,
    description: 'Calm single-lane traffic, wide safe gaps, sparse forest obstacles, and abundant superpower drops.',
    trafficDensityBonus: -1,
    minGapFactor: 1.55,
    eventFrequencyMul: 0.6,
    obstacleDensityMul: 0.60,
    maxConsecutiveRoads: 2,
    powerSpawnChance: 0.42,
    reactMsMul: 1.4,
  },
  NORMAL: {
    id: 'NORMAL',
    name: 'NORMAL',
    multiplier: 1.0,
    description: 'Classic arcade pacing with balanced traffic flow, standard obstacles, and regular superpower drops.',
    trafficDensityBonus: 0,
    minGapFactor: 1.0,
    eventFrequencyMul: 1.0,
    obstacleDensityMul: 1.0,
    maxConsecutiveRoads: 3,
    powerSpawnChance: 0.28,
    reactMsMul: 1.0,
  },
  HARD: {
    id: 'HARD',
    name: 'HARD',
    multiplier: 1.35,
    description: 'Fast multi-lane highways, dense obstacle forests, tighter crossing gaps, and less frequent powers.',
    trafficDensityBonus: 1,
    minGapFactor: 0.80,
    eventFrequencyMul: 1.4,
    obstacleDensityMul: 1.35,
    maxConsecutiveRoads: 4,
    powerSpawnChance: 0.18,
    reactMsMul: 0.82,
  },
  VERY_HARD: {
    id: 'VERY_HARD',
    name: 'VERY HARD',
    multiplier: 1.70,
    description: 'Relentless high-speed highways, mazelike forest lanes, small crossing windows, and rare powers.',
    trafficDensityBonus: 2,
    minGapFactor: 0.65,
    eventFrequencyMul: 1.8,
    obstacleDensityMul: 1.65,
    maxConsecutiveRoads: 5,
    powerSpawnChance: 0.10,
    reactMsMul: 0.68,
  },
  EXTREME: {
    id: 'EXTREME',
    name: 'EXTREME',
    multiplier: 2.15,
    description: 'Maximum arcade intensity! 6 consecutive rapid traffic lanes, razor-thin gaps, and pure reflex survival.',
    trafficDensityBonus: 3,
    minGapFactor: 0.50,
    eventFrequencyMul: 2.2,
    obstacleDensityMul: 2.0,
    maxConsecutiveRoads: 6,
    powerSpawnChance: 0.05,
    reactMsMul: 0.50,
  },
};

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['EASY', 'NORMAL', 'HARD', 'VERY_HARD', 'EXTREME'];

export function getDifficultySpec(level: DifficultyLevel | string | undefined): DifficultySpec {
  if (level && level in DIFFICULTY_SPECS) {
    return DIFFICULTY_SPECS[level as DifficultyLevel];
  }
  return DIFFICULTY_SPECS.NORMAL;
}
