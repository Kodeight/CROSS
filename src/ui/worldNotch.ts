/**
 * §13–§17 — single source of truth for the top-center world notch.
 * Content always derives from the active WorldConfig + real progress
 * (stretch distance + world mission completion). Never a stale copy.
 */
import type { SaveData } from '../save/SaveData';
import type { WorldConfig } from '../config/worlds.config';
import { WORLD_LENGTH, worldIndex } from '../config/worlds.config';
import { WORLD_MISSIONS } from '../config/missions.config';

/** Distance progress through the WORLD_LENGTH stretch this world occupies. */
function distancePct(
  save: SaveData,
  world: WorldConfig,
  runMaxLane: number,
  active: boolean,
): number {
  const best = save.worldBest[world.id] ?? 0;
  const lane = active ? Math.max(best, runMaxLane) : best;
  if (lane <= 0) return 0;
  const within = lane % WORLD_LENGTH;
  return Math.min(100, Math.round((within / WORLD_LENGTH) * 100));
}

/** Mission completion for this specific world (world-aware mission ids). */
function missionPct(save: SaveData, worldId: string): number {
  const ids = WORLD_MISSIONS[worldId] ?? [];
  if (!ids.length) return 0;
  let done = 0;
  for (const id of ids) if (save.missions[id]) done++;
  return Math.round((done / ids.length) * 100);
}

/**
 * Real world completion: 60% stretch distance + 40% world missions.
 * Clamp 0–100. Never derives from a different world's state.
 */
export function worldCompletionPct(
  save: SaveData,
  world: WorldConfig,
  runMaxLane: number,
  activeWorldId: string | null,
): number {
  try {
    const active = activeWorldId === world.id;
    const dist = distancePct(save, world, runMaxLane, active);
    const mis = missionPct(save, world.id);
    return Math.max(0, Math.min(100, Math.round(dist * 0.6 + mis * 0.4)));
  } catch {
    return 0;
  }
}

/** Write notch DOM from the authoritative active world. */
export function applyWorldNotch(
  world: WorldConfig,
  pct: number,
): void {
  const set = (id: string, v: string) => {
    const e = document.getElementById(id);
    if (e) e.textContent = v;
  };
  // Liquid content swap: the panel stays physically present (never moves
  // from 50vw) while its content settles with a transform-only spring.
  // Opacity/filter are never touched on the glass host itself.
  try {
    const header = document.getElementById('world-header');
    if (header && lastNotchWorld !== null && lastNotchWorld !== world.id) {
      const reduce = prefersReducedMotion();
      if (!reduce) {
        header.classList.remove('wh-swap');
        void header.offsetWidth;
        header.classList.add('wh-swap');
        window.setTimeout(() => header.classList.remove('wh-swap'), 420);
      }
    }
  } catch { /* animation must never break the notch */ }
  lastNotchWorld = world.id;
  set('wh-num', `WORLD ${world.num}`);
  set('wh-name', world.name);
  const fill = document.getElementById('wh-fill');
  if (fill) fill.style.width = `${pct}%`;
  set('wh-pct', `${pct}%`);
}

function prefersReducedMotion(): boolean {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

let lastNotchWorld: string | null = null;

void worldIndex;
