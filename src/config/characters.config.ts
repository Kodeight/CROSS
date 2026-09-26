/** Character roster data. Visuals are built by CharacterFactory. */

export interface CharacterConfig {
  id: string;
  name: string;
  cost: number;
  body: number;
  accent: number;
  beak: number;
  hat?: string;
}

export const CHARACTERS: CharacterConfig[] = [
  // Classic & Chicken Variants
  { id: 'chicken', name: 'CLASSIC CHICKEN', cost: 0, body: 0xffffff, accent: 0xf0619a, beak: 0xff9f1c },
  { id: 'fire_chicken', name: 'FIRE CHICKEN', cost: 250, body: 0xff5252, accent: 0xffd700, beak: 0xff793f },
  { id: 'ice_chicken', name: 'ICE CHICKEN', cost: 400, body: 0xdff9fb, accent: 0x38e1ff, beak: 0xa8d8ea },
  { id: 'jungle_chicken', name: 'JUNGLE CHICKEN', cost: 600, body: 0x2ecc71, accent: 0xf1c40f, beak: 0xe67e22 },
  { id: 'desert_chicken', name: 'DESERT CHICKEN', cost: 800, body: 0xf5cd79, accent: 0xe67e22, beak: 0xd35400 },
  { id: 'neon_chicken', name: 'NEON CHICKEN', cost: 1000, body: 0x2c3e50, accent: 0xff3fb4, beak: 0x38e1ff },
  { id: 'pirate_chicken', name: 'PIRATE CHICKEN', cost: 1250, body: 0x34495e, accent: 0xe74c3c, beak: 0xf39c12, hat: 'pirate' },
  { id: 'astro_chicken', name: 'ASTRONAUT CHICKEN', cost: 1500, body: 0xecf0f1, accent: 0x3498db, beak: 0x34495e, hat: 'helmet' },
  { id: 'wizard_chicken', name: 'WIZARD CHICKEN', cost: 1800, body: 0x8e44ad, accent: 0xf1c40f, beak: 0xe67e22, hat: 'wizard' },
  { id: 'robot_chicken', name: 'ROBOT CHICKEN', cost: 2200, body: 0x95a5a6, accent: 0x00f0ff, beak: 0x2c3e50 },

  // Diverse Animal Roster
  { id: 'duck', name: 'DUCK', cost: 300, body: 0xffd93d, accent: 0xff9f1c, beak: 0xff6b35 },
  { id: 'frog', name: 'FROG', cost: 500, body: 0x4caf50, accent: 0x2e7d32, beak: 0xdcedc8 },
  { id: 'cat', name: 'CAT', cost: 800, body: 0x9aa5b1, accent: 0x5b6570, beak: 0xffb3c1 },
  { id: 'fox', name: 'FOX', cost: 1200, body: 0xff8c42, accent: 0x8a3b12, beak: 0xfff3e0 },
  { id: 'penguin', name: 'PENGUIN', cost: 1400, body: 0x2c3e50, accent: 0xffffff, beak: 0xff9f1c },
  { id: 'rabbit', name: 'RABBIT', cost: 1600, body: 0xf5f6fa, accent: 0xffb8b8, beak: 0xff9ff3 },
  { id: 'robot', name: 'ROBOT', cost: 2000, body: 0x7c8da6, accent: 0x38e1ff, beak: 0x1e2430 },
  { id: 'turtle', name: 'TURTLE', cost: 2400, body: 0x27ae60, accent: 0x8e44ad, beak: 0x2ecc71 },
  { id: 'alien', name: 'ALIEN', cost: 3000, body: 0xa55eea, accent: 0x00f0ff, beak: 0x2d3436 },
];

export function characterById(id: string): CharacterConfig {
  const norm = id.toLowerCase();
  for (const c of CHARACTERS) if (c.id === norm) return c;
  return CHARACTERS[0];
}
