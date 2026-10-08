/**
 * CROSS! — Canonical Roster: Classic Chicken + 6 Reference-Matched 3D Heroes.
 * Directly matches the master character sheet reference board:
 * CLASSIC, ROCKET, SHADOW, GOLDIE, NINJA, COWBOY, SAMURAI.
 */

export interface CharacterConfig {
  id: string;
  name: string;
  rarity: 'default' | 'rare' | 'epic' | 'legendary';
  cost: number;
  body: number;
  accent: number;
  beak: number;
  comb: number;
  feet: number;
  skinType: string;
}

export const CHARACTERS: CharacterConfig[] = [
  // 01 — CLASSIC (Existing default, canonical CROSS! chicken — untouched)
  {
    id: 'chicken',
    name: 'CLASSIC',
    rarity: 'default',
    cost: 0,
    body: 0xffffff,
    accent: 0xff4757,
    beak: 0xff9f1a,
    comb: 0xff2e44,
    feet: 0xff9f1a,
    skinType: 'classic',
  },
  // 02 — ROCKET (Aviator goggles, red flight suit, rocket booster backpack)
  {
    id: 'rocket',
    name: 'ROCKET',
    rarity: 'rare',
    cost: 500,
    body: 0xde2b35,
    accent: 0x38bdf8,
    beak: 0xff9f1a,
    comb: 0xde2b35,
    feet: 0xff9f1a,
    skinType: 'rocket',
  },
  // 03 — SHADOW (Black plumage, gold sunglasses, black leather biker jacket)
  {
    id: 'shadow',
    name: 'SHADOW',
    rarity: 'epic',
    cost: 1200,
    body: 0x181920,
    accent: 0xf59e0b,
    beak: 0xea580c,
    comb: 0x111317,
    feet: 0x181920,
    skinType: 'shadow',
  },
  // 04 — GOLDIE (All-gold chicken, royal crown, dark sunglasses, gold chain)
  {
    id: 'goldie',
    name: 'GOLDIE',
    rarity: 'legendary',
    cost: 5000,
    body: 0xfbbf24,
    accent: 0xf59e0b,
    beak: 0xf59e0b,
    comb: 0xfbbf24,
    feet: 0xd97706,
    skinType: 'goldie',
  },
  // 05 — NINJA (Shinobi stealth cowl, red headband with flowing ribbons, red belt)
  {
    id: 'ninja',
    name: 'NINJA',
    rarity: 'epic',
    cost: 1800,
    body: 0x181920,
    accent: 0xef4444,
    beak: 0xea580c,
    comb: 0x181920,
    feet: 0x111827,
    skinType: 'ninja',
  },
  // 06 — COWBOY (Brown 10-gallon hat, red neck bandana, brown leather vest)
  {
    id: 'cowboy',
    name: 'COWBOY',
    rarity: 'rare',
    cost: 800,
    body: 0xffffff,
    accent: 0x78350f,
    beak: 0xff9f1a,
    comb: 0xff2e44,
    feet: 0xd97706,
    skinType: 'cowboy',
  },
  // 07 — SAMURAI (Lacquered red kabuto helmet, golden crest horns, tiered shoulder sode armor)
  {
    id: 'samurai',
    name: 'SAMURAI',
    rarity: 'epic',
    cost: 2500,
    body: 0xffffff,
    accent: 0xb91c1c,
    beak: 0xff9f1a,
    comb: 0xff2e44,
    feet: 0xd97706,
    skinType: 'samurai',
  },
];

export function characterById(id: string): CharacterConfig {
  const norm = id.toLowerCase();
  // Backward compatibility alias mapping for existing save games
  const aliasMap: Record<string, string> = {
    classic: 'chicken',
    default: 'chicken',
    river: 'chicken',
    beach: 'cowboy',
    forest: 'ninja',
    desert: 'cowboy',
    snow: 'shadow',
    farm: 'cowboy',
    jungle: 'ninja',
    night_city: 'shadow',
    neon: 'shadow',
    volcano: 'rocket',
    airport: 'rocket',
    harbor: 'cowboy',
    highway: 'rocket',
    candy: 'goldie',
    ruins: 'goldie',
    pharaoh: 'goldie',
    space: 'rocket',
    tokyo: 'samurai',
    wildlife: 'cowboy',
    underwater: 'rocket',
    sky_island: 'rocket',
  };
  const targetId = aliasMap[norm] || norm;
  for (const c of CHARACTERS) if (c.id === targetId) return c;
  return CHARACTERS[0];
}
