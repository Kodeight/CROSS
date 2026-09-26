/**
 * Power-up system definitions.
 * Real, working active gameplay abilities with HUD indicator, sound, duration, and cooldowns.
 */

export type PowerUpType =
  | 'shield'
  | 'magnet'
  | 'dash'
  | 'freeze'
  | 'time_warp'
  | 'ghost'
  | 'fire_shield'
  | 'double_jump'
  | 'low_gravity';

export interface PowerUpDef {
  id: PowerUpType;
  name: string;
  symbol: string;
  color: number;
  durationMs: number;
  description: string;
  cooldownMs: number;
}

export const POWER_UPS: Record<PowerUpType, PowerUpDef> = {
  shield: {
    id: 'shield',
    name: 'FORCE SHIELD',
    symbol: '🛡️',
    color: 0x38e1ff,
    durationMs: 8000,
    cooldownMs: 2000,
    description: 'Survive one vehicle collision or fatal impact.',
  },
  magnet: {
    id: 'magnet',
    name: 'COIN MAGNET',
    symbol: '🧲',
    color: 0xffc93c,
    durationMs: 7000,
    cooldownMs: 2000,
    description: 'Attracts all nearby coins and collectibles directly to your hero.',
  },
  dash: {
    id: 'dash',
    name: 'SONIC DASH',
    symbol: '⚡',
    color: 0x7ac74f,
    durationMs: 1500,
    cooldownMs: 3000,
    description: 'Instant forward dash leaping across 3 lanes with temporary invulnerability.',
  },
  freeze: {
    id: 'freeze',
    name: 'FROST FREEZE',
    symbol: '❄️',
    color: 0xa8d8ea,
    durationMs: 4500,
    cooldownMs: 3000,
    description: 'Freezes all vehicle traffic and hazards in their tracks.',
  },
  time_warp: {
    id: 'time_warp',
    name: 'TIME WARP',
    symbol: '⏳',
    color: 0xff3fb4,
    durationMs: 6000,
    cooldownMs: 2500,
    description: 'Slows world time by 60% while player hops remain ultra responsive.',
  },
  ghost: {
    id: 'ghost',
    name: 'PHASE GHOST',
    symbol: '👻',
    color: 0xe0e6ed,
    durationMs: 4000,
    cooldownMs: 2500,
    description: 'Phase shift through vehicles and obstacle trees without taking damage.',
  },
  fire_shield: {
    id: 'fire_shield',
    name: 'HEAT SHIELD',
    symbol: '🔥',
    color: 0xff5252,
    durationMs: 7000,
    cooldownMs: 2000,
    description: 'Total protection from magma, lava hazards, and vehicle impacts.',
  },
  double_jump: {
    id: 'double_jump',
    name: 'DOUBLE HOP',
    symbol: '🦘',
    color: 0xff9f1c,
    durationMs: 8000,
    cooldownMs: 2000,
    description: 'Perform a secondary mid-air leap to cross multi-lane gaps.',
  },
  low_gravity: {
    id: 'low_gravity',
    name: 'LUNAR GRAVITY',
    symbol: '🌙',
    color: 0xdcdde1,
    durationMs: 7000,
    cooldownMs: 2000,
    description: 'Soar through the air with extended float time over broad lanes.',
  },
};

export const POWER_UP_LIST: PowerUpType[] = [
  'shield',
  'magnet',
  'dash',
  'freeze',
  'time_warp',
  'ghost',
  'fire_shield',
  'double_jump',
  'low_gravity',
];
