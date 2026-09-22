/** Character roster data. Visuals are built by CharacterFactory. */

export interface CharacterConfig {
  id: string;
  name: string;
  cost: number;
  body: number;
  accent: number;
  beak: number;
}

export const CHARACTERS: CharacterConfig[] = [
  { id: 'chicken', name: 'CHICKEN', cost: 0, body: 0xffffff, accent: 0xf0619a, beak: 0xff9f1c },
  { id: 'duck', name: 'DUCK', cost: 200, body: 0xffd93d, accent: 0xff9f1c, beak: 0xff6b35 },
  { id: 'frog', name: 'FROG', cost: 500, body: 0x4caf50, accent: 0x2e7d32, beak: 0xdcedc8 },
  { id: 'cat', name: 'CAT', cost: 800, body: 0x9aa5b1, accent: 0x5b6570, beak: 0xffb3c1 },
  { id: 'fox', name: 'FOX', cost: 1200, body: 0xff8c42, accent: 0x8a3b12, beak: 0xfff3e0 },
  { id: 'robot', name: 'ROBOT', cost: 2000, body: 0x7c8da6, accent: 0x38e1ff, beak: 0x1e2430 },
];

export function characterById(id: string): CharacterConfig {
  for (const c of CHARACTERS) if (c.id === id) return c;
  return CHARACTERS[0];
}
