/**
 * Signature world events catalogue for the five active worlds
 * (CITY → RIVER → BEACH → VOLCANO → TOKYO).
 * Each event provides readable telegraphing (warning banner + sound cue + visual effect)
 * and fair, reversible gameplay influence.
 */

export interface WorldEventDef {
  id: string;
  worldId: string;
  title: string;
  subtitle: string;
  warningDurationMs: number;
  activeDurationMs: number;
  cooldownLanes: number;
  effectType: 'rush' | 'particles' | 'lighting' | 'hazard' | 'surge';
  color: number;
  intensity: number;
}

export const WORLD_EVENTS: Record<string, WorldEventDef> = {
  city: {
    id: 'rush_hour',
    worldId: 'city',
    title: 'RUSH HOUR!',
    subtitle: 'HEAVY TRAFFIC INCOMING · WATCH BOTH WAYS',
    warningDurationMs: 1800,
    activeDurationMs: 6500,
    cooldownLanes: 35,
    effectType: 'rush',
    color: 0xffc93c,
    intensity: 1.25,
  },
  river: {
    id: 'river_surge',
    worldId: 'river',
    title: 'RIVER SURGE!',
    subtitle: 'RIVER CURRENTS RISING · WATCH WOODEN PLANKS',
    warningDurationMs: 1800,
    activeDurationMs: 6000,
    cooldownLanes: 35,
    effectType: 'surge',
    color: 0x3fa8d8,
    intensity: 1.2,
  },
  tokyo: {
    id: 'power_outage',
    worldId: 'tokyo',
    title: 'POWER OUTAGE!',
    subtitle: 'GRID EMERGENCY · TRACK NEON HEADLIGHTS',
    warningDurationMs: 1800,
    activeDurationMs: 5500,
    cooldownLanes: 35,
    effectType: 'lighting',
    color: 0xff3fb4,
    intensity: 1.4,
  },
  volcano: {
    id: 'eruption',
    worldId: 'volcano',
    title: 'ERUPTION WARNING!',
    subtitle: 'MAGMA TREMORS DETECTED · EVACUATE SAFELY',
    warningDurationMs: 2000,
    activeDurationMs: 6500,
    cooldownLanes: 35,
    effectType: 'hazard',
    color: 0xff4757,
    intensity: 1.5,
  },
  beach: {
    id: 'mega_wave',
    worldId: 'beach',
    title: 'MEGA WAVE!',
    subtitle: 'HIGH TIDE SURGE · BOARDWALK CLEARANCE',
    warningDurationMs: 1800,
    activeDurationMs: 6000,
    cooldownLanes: 35,
    effectType: 'surge',
    color: 0x48dbfb,
    intensity: 1.25,
  },
};

export function eventForWorld(worldId: string): WorldEventDef {
  return WORLD_EVENTS[worldId.toLowerCase()] ?? WORLD_EVENTS.city;
}
