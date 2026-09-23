/** Global game tuning. Single source of truth — no magic numbers in systems. */

/** Production coin economy: characters/worlds cost coins (see characters/worlds configs). */
export const TESTING_MODE = false;

export const GAME_CONFIG = {
  positionWidth: 42,
  columns: 17,
  zoom: 2,
  stepTimeMs: 170,
  worldLength: 40, // lanes per world stretch before transitioning onward
  startLane: 10, // player spawns INSIDE the city, never at the world edge
  maxPixelRatio: 2,
  mobileMaxPixelRatio: 1.5,
  shadowMapSize: 2048,
  shadowCameraExtent: 550,
} as const;

export type QualityLevel = 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityProfile {
  pixelRatioCap: number;
  shadows: boolean;
  shadowSize: number;
  particles: boolean;
  antialias?: boolean;
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  // LOW = sacred baseline: same context AA as always, no runtime shadows,
  // DPR 1, particles off. Gameplay identical at every quality.
  LOW: { pixelRatioCap: 1, shadows: false, shadowSize: 512, particles: false, antialias: true },
  MEDIUM: { pixelRatioCap: 1.5, shadows: true, shadowSize: 1536, particles: true, antialias: true },
  HIGH: { pixelRatioCap: 2, shadows: true, shadowSize: 2048, particles: true, antialias: true },
  AUTO: { pixelRatioCap: 1.5, shadows: true, shadowSize: 1024, particles: true, antialias: true },
};
