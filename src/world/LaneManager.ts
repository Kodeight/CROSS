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
  private underlayMaterial?: THREE.MeshPhongMaterial;
  private debugPlaneMesh?: THREE.Group;

  constructor(private readonly scene: THREE.Scene) {
    this.initGroundUnderlay();
    this.checkDebugPlane();
  }

  private initGroundUnderlay(): void {
    try {
      const geo = new THREE.PlaneGeometry(60000, 60000);
      this.underlayMaterial = new THREE.MeshPhongMaterial({ color: 0x7a808a, shininess: 10 });
      this.underlayMesh = new THREE.Mesh(geo, this.underlayMaterial);
      this.underlayMesh.position.set(0, 0, -0.5);
      this.underlayMesh.receiveShadow = false;
      this.underlayMesh.frustumCulled = false;
      this.underlayMesh.renderOrder = -1;
      this.scene.add(this.underlayMesh);
    } catch { /* ignore */ }
  }

  setWorldTheme(groundColor: number): void {
    if (this.underlayMaterial) {
      this.underlayMaterial.color.set(groundColor);
    }
  }

  private checkDebugPlane(): void {
    if (typeof location !== 'undefined' && /[?&](debugplane|testplane|viewportdebug=plane)/i.test(location.search)) {
      try {
        const group = new THREE.Group();
        // High-contrast vibrant colored ground plane that fills the complete camera view
        const geo = new THREE.PlaneGeometry(40000, 40000);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00d8f5 }); // High-visibility electric cyan
        const floor = new THREE.Mesh(geo, mat);
        floor.position.set(0, 0, 0.5);
        floor.frustumCulled = false;
        group.add(floor);

        // Grid helper directly on floor to show perspective
        const grid = new THREE.GridHelper(4000, 40, 0xffffff, 0x0088cc);
        grid.rotation.x = Math.PI / 2;
        grid.position.set(0, 500, 0.6);
        group.add(grid);

        const makeBar = (w: number, l: number, h: number, x: number, y: number, color: number, name: string) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, l, h), new THREE.MeshBasicMaterial({ color }));
          m.position.set(x, y, h / 2 + 0.5);
          m.name = name;
          group.add(m);
        };

        // Solid edge boundary markers:
        // BOTTOM boundary (Red): at frustum bottom edge (y=-220) and extra lower bound (y=-400)
        makeBar(6000, 40, 35, 0, -220, 0xff0044, 'BOTTOM_MARKER_NEAR');
        makeBar(6000, 50, 45, 0, -420, 0xff0000, 'BOTTOM_MARKER_FAR');

        // TOP boundary (Green): at frustum top edge (y=+1400)
        makeBar(6000, 60, 45, 0, 1400, 0x00ff44, 'TOP_MARKER');

        // LEFT boundary (Magenta) & RIGHT boundary (Yellow)
        makeBar(40, 3000, 35, -650, 500, 0xff00cc, 'LEFT_MARKER');
        makeBar(40, 3000, 35, 650, 500, 0xffea00, 'RIGHT_MARKER');

        // Forward Centerline (White)
        makeBar(14, 3000, 8, 0, 500, 0xffffff, 'CENTERLINE');

        // Cross-stripes every 200 units from -200 to +1200
        for (let y = -200; y <= 1200; y += 200) {
          makeBar(1200, 6, 2, 0, y, 0xffffff, `DEPTH_${y}`);
        }

        group.frustumCulled = false;
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

  prepend(lane: Lane): void {
    this.lanes.unshift(lane);
    this.scene.add(lane.mesh);
  }

  topIndex(): number {
    return this.lanes.length ? this.lanes[this.lanes.length - 1].index : -1;
  }

  updatePosition(y: number): void {
    if (this.underlayMesh) this.underlayMesh.position.y = y;
    if (this.debugPlaneMesh) this.debugPlaneMesh.position.y = y;
  }

  /** Generate lanes ahead of the player; maintain buffer behind; prune safely. */
  maintain(playerLane: number, makeLane: (index: number) => Lane): void {
    this.updatePosition(playerLane * GAME_CONFIG.positionWidth * GAME_CONFIG.zoom);
    const minBehind = playerLane - 30;
    while (this.lanes.length && this.lanes[0].index > minBehind && this.lanes.length < MAX_LANES) {
      this.prepend(makeLane(this.lanes[0].index - 1));
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
