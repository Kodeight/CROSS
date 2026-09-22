/**
 * §13 — LaneManager: owns lane lifecycle (generate ahead / prune behind).
 * World-space: lane meshes sit at fixed y, added/removed from the scene.
 */
import type * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import type { Lane } from './World';

const AHEAD = 30;
const BEHIND = 12;
const MAX_LANES = 400;

export class LaneManager {
  lanes: Lane[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  get length(): number {
    return this.lanes.length;
  }

  /**
   * Lane by world lane number. The array is a pruned sliding window, so a
   * raw array slot is NOT the lane number — resolve via the head offset.
   * (A naive `lanes[i]` here once made collision test the wrong lane and
   * killed players standing on safe grass.)
   */
  laneAt(index: number): Lane | undefined {
    if (!this.lanes.length) return undefined;
    const slot = index - this.lanes[0].index;
    if (slot < 0 || slot >= this.lanes.length) return undefined;
    const lane = this.lanes[slot];
    return lane.index === index ? lane : undefined;
  }

  add(lane: Lane): void {
    this.lanes.push(lane);
    this.scene.add(lane.mesh);
  }

  topIndex(): number {
    return this.lanes.length ? this.lanes[this.lanes.length - 1].index : -1;
  }

  /** Generate lanes ahead of the player; prune safely behind. */
  maintain(playerLane: number, makeLane: (index: number) => Lane): void {
    const want = playerLane + AHEAD;
    while (this.topIndex() < want && this.lanes.length < MAX_LANES) {
      this.add(makeLane(this.topIndex() + 1));
    }
    const pruneBefore = playerLane - BEHIND;
    while (this.lanes.length && this.lanes[0].index < pruneBefore) {
      const old = this.lanes.shift();
      if (old) {
        this.scene.remove(old.mesh);
        disposeLane(old);
      }
    }
  }

  clear(): void {
    for (const lane of this.lanes) {
      this.scene.remove(lane.mesh);
      disposeLane(lane);
    }
    this.lanes = [];
  }

  vehicleCount(): number {
    let n = 0;
    for (const l of this.lanes) n += l.vehicles.length;
    return n;
  }
}

function disposeLane(lane: Lane): void {
  // Geometries/materials are shared via AssetManager — only release the
  // group hierarchy, never the cached resources.
  lane.mesh.traverse((o) => {
    const obj = o as THREE.Object3D;
    obj.clear();
  });
  lane.vehicles = [];
  lane.coins = [];
}
