/** §13/§17 — explicit vehicle runtime state. */
import type * as THREE from 'three';

export interface TrafficVehicleState {
  object: THREE.Group;
  /** Desired speed in world-units/ms — set at spawn, never changes. */
  cruise: number;
  /** Current smoothed speed — brakes/accelerates toward target. */
  cur: number;
  /** Previous player-relative dx for near-miss detection. */
  prevDx: number | null;
}

export function getVehicleState(obj: THREE.Group): TrafficVehicleState {
  const u = obj.userData as Record<string, number | null | undefined>;
  if (typeof u.cruise !== 'number') {
    const base = (typeof u.baseSpeed === 'number' ? u.baseSpeed : 2) as number;
    u.cruise = base / 16;
    u.cur = u.cruise;
  }
  if (typeof u.cur !== 'number') u.cur = u.cruise as number;
  return {
    object: obj,
    cruise: u.cruise as number,
    cur: u.cur as number,
    prevDx: (u.prevDx as number | null | undefined) ?? null,
  };
}

export function setVehicleSpeed(obj: THREE.Group, cur: number): void {
  obj.userData.cur = cur;
}
