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
import { WORLD_LENGTH, WORLDS, worldById, worldIndex, getFadeColorForWorld } from '../config/worlds.config';

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
 * measured from the run's spawn. Live position while active, best otherwise.
 * Always 0 at spawn, exactly 100 at the transition boundary, linear in
 * between — preserved for internal stats, missions and progression data.
 */
export function worldCompletionPct(
  save: SaveData,
  world: WorldConfig,
  runMaxLane: number,
  runStartLane: number,
  playerLane: number,
  activeWorldId: string | null,
): number {
  try {
    const active = activeWorldId === world.id;
    const best = save.worldBest[world.id] ?? 0;
    const inStretch = active && worldIdForLane(playerLane, save.selectedWorld) === world.id;
    const ref = inStretch
      ? Math.max(best, playerLane)
      : active ? Math.max(best, runMaxLane) : best;
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

let transitionTimer: number | null = null;
let lastNotchWorld: string | null = null;

export const PISTACHIO_LIGHT = '#FFFDF5';

/** Sets the pistachio theme across document, theme-color, and UI */
export function setPreGameTheme(): void {
  try {
    const root = document.documentElement;
    root.style.setProperty('--panel-ground-color', PISTACHIO_LIGHT);
    root.style.setProperty('--panel-text-color', '#1E2430');

    document.body.style.backgroundColor = PISTACHIO_LIGHT;
    document.documentElement.style.backgroundColor = PISTACHIO_LIGHT;
    const game = document.getElementById('game');
    if (game) game.style.backgroundColor = 'transparent';

    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.backgroundColor = PISTACHIO_LIGHT;
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', PISTACHIO_LIGHT);
  } catch { /* ignore */ }
}

/** Sets the world environment color coordinates while keeping the pistachio background & bottom surface */
export function updateWorldEnvironmentTheme(worldId: string): void {
  try {
    const [r, g, b] = getFadeColorForWorld(worldId);
    
    const root = document.documentElement;
    root.style.setProperty('--panel-ground-color', PISTACHIO_LIGHT);
    root.style.setProperty('--panel-text-color', '#1E2430');
    root.style.setProperty('--ground-r', String(r));
    root.style.setProperty('--ground-g', String(g));
    root.style.setProperty('--ground-b', String(b));

    document.body.style.backgroundColor = PISTACHIO_LIGHT;
    document.documentElement.style.backgroundColor = PISTACHIO_LIGHT;
    const game = document.getElementById('game');
    if (game) game.style.backgroundColor = 'transparent';

    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.backgroundColor = PISTACHIO_LIGHT;
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', PISTACHIO_LIGHT);
  } catch { /* ignore */ }
}

/**
 * Triggers the cinematic text-only world transition:
 * Phase 1: enter (blurred -> sharp)
 * Phase 2: hold (sharp white)
 * Phase 3: exit (sharp -> blurred -> fade out)
 * No containers, no backgrounds, no red, no progress bar.
 */
export function showWorldTransition(target: WorldConfig | string): void {
  const worldConfig = typeof target === 'string' ? worldById(target) : target;
  if (!worldConfig) return;

  updateWorldEnvironmentTheme(worldConfig.id);

  try {
    const titleEl = document.getElementById('world-title');
    const textEl = document.getElementById('world-title-text');
    if (!titleEl || !textEl) return;

    textEl.textContent = worldConfig.name;

    // Reset ongoing animation to restart cleanly
    titleEl.classList.remove('wt-animating');
    void titleEl.offsetWidth; // force browser style recalculation

    if (transitionTimer !== null) {
      window.clearTimeout(transitionTimer);
      transitionTimer = null;
    }

    titleEl.classList.add('wt-animating');

    // Hold and exit over ~1.8s
    transitionTimer = window.setTimeout(() => {
      titleEl.classList.remove('wt-animating');
      transitionTimer = null;
    }, 1850);
  } catch { /* ignore */ }
}

/** Update HUD world state without rendering any progress bar or red capsule. */
export function applyWorldNotch(
  world: WorldConfig,
  pct: number,
): void {
  void pct; // Progress percentage is preserved in data systems, visual bar removed
  updateWorldEnvironmentTheme(world.id);

  if (lastNotchWorld !== null && lastNotchWorld !== world.id) {
    showWorldTransition(world);
  }
  lastNotchWorld = world.id;
}
