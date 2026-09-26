/**
 * §13 — lane-aware vehicle spacing. Same lane + same direction only.
 * Follow distance scales with speed: safeGap = minGap + cur * reactMs.
 */
import { TRAFFIC_CONFIG } from '../config/traffic.config';
import type { Lane } from '../world/World';
import { GAME_CONFIG } from '../config/game.config';

const ZOOM = GAME_CONFIG.zoom;

export function vehicleHalf(v: { userData: { length?: unknown } }): number {
  const len = typeof v.userData.length === 'number' ? v.userData.length : 60;
  return (len * ZOOM) / 2;
}

/** Nearest vehicle ahead in the same lane along travel direction. */
export function findAhead(lane: Lane, self: { position: { x: number } }, sgn: number): { veh: (typeof lane.vehicles)[number]; rel: number } | null {
  let best: (typeof lane.vehicles)[number] | null = null;
  let bestRel = Infinity;
  for (const o of lane.vehicles) {
    if (o === (self as unknown)) continue;
    const rel = (o.position.x - (self as { position: { x: number } }).position.x) * sgn;
    if (rel > 0 && rel < bestRel) {
      bestRel = rel;
      best = o;
    }
  }
  return best ? { veh: best, rel: bestRel } : null;
}

/** Target speed for a vehicle given bumper distance to the vehicle ahead. */
export function targetSpeed(cruise: number, cur: number, bumper: number): number {
  if (!isFinite(bumper)) return cruise;
  if (bumper <= TRAFFIC_CONFIG.stopGap) return 0;
  const safeGap = TRAFFIC_CONFIG.minGap + cur * TRAFFIC_CONFIG.reactMs;
  if (bumper < safeGap) {
    return cruise * Math.max(0, (bumper - TRAFFIC_CONFIG.stopGap) / Math.max(1, safeGap - TRAFFIC_CONFIG.stopGap));
  }
  return cruise;
}
