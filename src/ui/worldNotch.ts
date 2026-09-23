/**
 * §13–§17 — single source of truth for the top-center world notch.
 * Progress is AUTHORITATIVE stretch distance, one formula, no blends:
 *
 *   (referenceLane - lo) / (stretchEnd - lo)
 *
 * referenceLane = live maxLane while the world is active, else its best.
 * lo = max(stretchStart, runStartLane): runs spawn partway into a stretch,
 * so progress starts ≈0% at spawn and hits exactly 100% at the stretch
 * end (= the world transition boundary). Missions still complete, reward
 * and display separately — they never dilute the distance bar, which is
 * why a finished stretch can no longer read 70%.
 */
import type { SaveData } from '../save/SaveData';
import type { WorldConfig } from '../config/worlds.config';
import { WORLD_LENGTH, WORLDS, worldIndex } from '../config/worlds.config';

/** Same rotation rule as WorldManager.worldForLane (the authority). */
function worldIdForLane(lane: number, selectedId: string): string {
  const base = worldIndex(selectedId);
  const k = Math.floor(Math.max(0, lane) / WORLD_LENGTH);
  return WORLDS[(base + k) % WORLDS.length].id;
}

/** Stretch start of `worldId` containing `lane`, else its next upcoming one. */
function stretchStartFor(worldId: string, lane: number, selectedId: string): number {
  const s0 = Math.floor(Math.max(0, lane) / WORLD_LENGTH) * WORLD_LENGTH;
  if (worldIdForLane(s0, selectedId) === worldId) return s0;
  for (let k = 1; k <= WORLDS.length; k++) {
    const s = s0 + k * WORLD_LENGTH;
    if (worldIdForLane(s, selectedId) === worldId) return s;
  }
  return s0;
}

/**
 * Authoritative world progress: distance through the world's own stretch,
 * measured from the run's spawn. Live maxLane while active, best otherwise.
 * Always 0 at spawn, exactly 100 at the transition boundary, linear in
 * between — never diluted, never stuck, never from another world's state.
 */
export function worldCompletionPct(
  save: SaveData,
  world: WorldConfig,
  runMaxLane: number,
  runStartLane: number,
  activeWorldId: string | null,
): number {
  try {
    const active = activeWorldId === world.id;
    const best = save.worldBest[world.id] ?? 0;
    const ref = active ? Math.max(best, runMaxLane) : best;
    const S = stretchStartFor(world.id, ref, save.selectedWorld);
    const lo = Math.max(S, active ? runStartLane : S);
    const end = S + WORLD_LENGTH;
    if (ref <= lo) return 0;
    if (ref >= end) return 100;
    return Math.round(((ref - lo) / (end - lo)) * 100);
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
