/**
 * §13 — LaneManager: owns lane lifecycle (generate ahead / prune behind).
 * World-space: lane meshes sit at fixed y, added/removed from the scene.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import type { Lane } from './World';

const AHEAD = 200;
const BEHIND = 50;
const MAX_LANES = 500;

export class LaneManager {
  lanes: Lane[] = [];
  private underlayMesh?: THREE.Mesh;
  private debugPlaneMesh?: THREE.Group;

  constructor(private readonly scene: THREE.Scene) {
    this.initGroundUnderlay();
    this.checkDebugPlane();
  }

  private initGroundUnderlay(): void {
    try {
      const geo = new THREE.PlaneGeometry(35000, 35000);
      const mat = new THREE.MeshPhongMaterial({ color: 0x5a606d, shininess: 10 });
      this.underlayMesh = new THREE.Mesh(geo, mat);
      this.underlayMesh.position.set(0, 0, -2);
      this.underlayMesh.receiveShadow = false;
      this.scene.add(this.underlayMesh);
    } catch { /* ignore */ }
  }

  private checkDebugPlane(): void {
    if (typeof location !== 'undefined' && /[?&](debugplane|testplane|viewportdebug=plane)/i.test(location.search)) {
      try {
        const group = new THREE.Group();
        const geo = new THREE.PlaneGeometry(25000, 25000, 50, 50);
        const mat = new THREE.MeshBasicMaterial({ color: 0x223344, wireframe: true });
        const floor = new THREE.Mesh(geo, mat);
        floor.position.set(0, 0, 1);
        group.add(floor);

        // Edge markers: solid colored boxes representing world extents
        const makeMarker = (x: number, y: number, color: number, name: string) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(400, 400, 50), new THREE.MeshBasicMaterial({ color }));
          m.position.set(x, y, 25);
          m.name = name;
          group.add(m);
        };
        makeMarker(0, 4000, 0x00ff00, 'TOP_MARKER');
        makeMarker(0, -2000, 0xff0000, 'BOTTOM_MARKER');
        makeMarker(-3000, 1000, 0x00ffff, 'LEFT_MARKER');
        makeMarker(3000, 1000, 0xffff00, 'RIGHT_MARKER');

        this.debugPlaneMesh = group;
        this.scene.add(group);
      } catch { /* ignore */ }
    }
  }

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
    if (this.underlayMesh) {
      this.underlayMesh.position.y = playerLane * GAME_CONFIG.positionWidth * GAME_CONFIG.zoom;
    }
    if (this.debugPlaneMesh) {
      this.debugPlaneMesh.position.y = playerLane * GAME_CONFIG.positionWidth * GAME_CONFIG.zoom;
    }
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
  lane.occupied = {};
  lane.jumpable = {};
}
