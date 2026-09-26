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
}

export const DIFFICULTY_SPECS: Record<DifficultyLevel, DifficultySpec> = {
  EASY: {
    id: 'EASY',
    name: 'EASY',
    multiplier: 0.75,
    description: 'Calm traffic and generous safe gaps. Perfect for relaxed hopping.',
    trafficDensityBonus: -1,
    minGapFactor: 1.35,
    eventFrequencyMul: 0.6,
  },
  NORMAL: {
    id: 'NORMAL',
    name: 'NORMAL',
    multiplier: 1.0,
    description: 'Standard traffic flow and balanced arcade challenge.',
    trafficDensityBonus: 0,
    minGapFactor: 1.0,
    eventFrequencyMul: 1.0,
  },
  HARD: {
    id: 'HARD',
    name: 'HARD',
    multiplier: 1.3,
    description: 'Denser traffic patterns, tighter safe gaps, and frequent world events.',
    trafficDensityBonus: 1,
    minGapFactor: 0.85,
    eventFrequencyMul: 1.4,
  },
  VERY_HARD: {
    id: 'VERY_HARD',
    name: 'VERY HARD',
    multiplier: 1.6,
    description: 'Relentless traffic, rapid hazard combinations, and small crossing windows.',
    trafficDensityBonus: 1,
    minGapFactor: 0.75,
    eventFrequencyMul: 1.8,
  },
  EXTREME: {
    id: 'EXTREME',
    name: 'EXTREME',
    multiplier: 2.0,
    description: 'Peak arcade intensity. Maximum traffic density and razor-thin crossing timing.',
    trafficDensityBonus: 2,
    minGapFactor: 0.65,
    eventFrequencyMul: 2.2,
  },
};

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['EASY', 'NORMAL', 'HARD', 'VERY_HARD', 'EXTREME'];

export function getDifficultySpec(level: DifficultyLevel | string | undefined): DifficultySpec {
  if (level && level in DIFFICULTY_SPECS) {
    return DIFFICULTY_SPECS[level as DifficultyLevel];
  }
  return DIFFICULTY_SPECS.NORMAL;
}
