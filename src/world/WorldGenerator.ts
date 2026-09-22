/**
 * §12 — forward generation, static world-space objects. Lanes are built at
 * fixed y = index * laneSize and NEVER move afterward. Vehicles keep
 * laneId/laneCenter/direction/speed (§44); spawn positions are gap-validated.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import { beachDistrict, type WorldConfig } from '../config/worlds.config';
import type { AssetManager } from '../assets/AssetManager';
import type { VehicleFactory, BuiltVehicle } from './environment/VehicleFactory';
import type { PropFactory, PropBuilder } from './environment/PropFactory';
import type { BuildingFactory } from './environment/BuildingFactory';
import type { TreeFactory } from './environment/TreeFactory';
import type { Lane, LaneType, World } from './World';
import { TRAFFIC_CONFIG } from '../config/traffic.config';
import { pick } from '../utils/Random';

const PW = GAME_CONFIG.positionWidth;
const COLS = GAME_CONFIG.columns;
const ZOOM = GAME_CONFIG.zoom;
const BOARD = PW * ZOOM * COLS;

export interface WaterAnim {
  mesh: THREE.Object3D;
  base: number;
  off: number;
}

export class WorldGenerator {
  readonly waterAnims: WaterAnim[] = [];
  private consecutiveRoads = 0;

  constructor(
    private readonly assets: AssetManager,
    private readonly vehicles: VehicleFactory,
    private readonly props: PropFactory,
    private readonly buildings: BuildingFactory,
    private readonly trees: TreeFactory,
  ) {}

  difficultyFor(lane: number): { speedMul: number; density: boolean } {
    return { speedMul: 1 + Math.min(lane * 0.016, 1.9), density: lane > 60 };
  }

  private mat(color: number, shininess = 30): THREE.MeshPhongMaterial {
    return this.assets.phong(`gen:${color}:${shininess}`, color, { shininess });
  }

  private regWater(mesh: THREE.Object3D, base: number): void {
    this.waterAnims.push({ mesh, base, off: Math.random() * 6.28 });
    if (this.waterAnims.length > 300) this.waterAnims.splice(0, this.waterAnims.length - 300);
  }

  updateWater(tMs: number): void {
    for (const w of this.waterAnims) {
      if (!w.mesh.parent) continue;
      w.mesh.position.z = w.base + Math.sin(tMs / 900 + w.off) * 1.2;
    }
  }

  private slab(color: number, h = 3): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.box(`gen-slab:${h}`, BOARD, PW * ZOOM, h * ZOOM),
      this.mat(color),
    );
    m.receiveShadow = true;
    return m;
  }

  private sandTone(base: number): number {
    try {
      const j = new THREE.Color(base);
      j.offsetHSL(0, (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.035);
      return j.getHex();
    } catch {
      return base;
    }
  }

  private buildTerrain(g: THREE.Group, world: WorldConfig, variant: string | null): void {
    if (variant === 'bridge' || variant === 'boardwalk' || variant === 'pier') {
      const waterColor = variant === 'bridge' ? 0x3f9fd8 : 0x3fa8d8;
      for (const side of [0, -1, 1]) {
        const w = new THREE.Mesh(
          new THREE.PlaneGeometry(BOARD, PW * ZOOM),
          this.mat(waterColor, 110),
        );
        w.position.set(side * BOARD, 0, side === 0 ? 0.4 : 0.5);
        g.add(w);
        this.regWater(w, w.position.z);
      }
      if (variant === 'pier') {
        for (let q = -6; q <= 6; q++) {
          const deck = new THREE.Mesh(
            this.assets.box('gen-pier-deck', 30 * ZOOM, PW * ZOOM * 0.96, 2.4 * ZOOM),
            this.mat(0xb08b52, 12),
          );
          deck.position.set(q * 56 * ZOOM, 0, 2.6 * ZOOM);
          deck.receiveShadow = true;
          g.add(deck);
        }
        return;
      }
      for (let p = -8; p <= 8; p++) {
        const plank = new THREE.Mesh(
          this.assets.box('gen-plank', 20 * ZOOM, PW * ZOOM * 0.96, 2 * ZOOM),
          this.mat(variant === 'bridge' ? 0x8a5a2b : 0xc79a5e, 12),
        );
        plank.position.set(p * 44 * ZOOM, 0, 2.4 * ZOOM);
        plank.receiveShadow = true;
        g.add(plank);
      }
      return;
    }
    if (variant === 'ice') {
      const s = this.slab(0xd8ecff);
      s.position.z = 1.5 * ZOOM;
      g.add(s);
      return;
    }
    if (variant === 'crosswalk') {
      const base = new THREE.Mesh(
        new THREE.PlaneGeometry(BOARD * 3, PW * ZOOM),
        this.mat(world.road),
      );
      base.receiveShadow = true;
      g.add(base);
      for (let b = -6; b <= 6; b++) {
        const bar = new THREE.Mesh(
          new THREE.PlaneGeometry(12 * ZOOM, PW * ZOOM * 0.7),
          this.assets.basic('gen-cross', 0xffffff),
        );
        bar.position.set(b * 52 * ZOOM, 0, 0.4);
        g.add(bar);
      }
      return;
    }
    const sandy = world.id === 'beach' || world.id === 'desert';
    const m2 = this.slab(sandy ? this.sandTone(world.safe) : world.safe);
    m2.position.z = 1.5 * ZOOM;
    g.add(m2);
    const l = this.slab(sandy ? this.sandTone(world.safeDark) : world.safeDark);
    l.position.set(-BOARD, 0, 1.5 * ZOOM);
    g.add(l);
    const r = this.slab(sandy ? this.sandTone(world.safeDark) : world.safeDark);
    r.position.set(BOARD, 0, 1.5 * ZOOM);
    g.add(r);
  }

  private buildRoad(g: THREE.Group, world: WorldConfig, variant: string | null): void {
    const mid = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD * 3, PW * ZOOM),
      this.mat(world.road),
    );
    mid.receiveShadow = true;
    g.add(mid);
    for (let i = -8; i <= 8; i++) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(18 * ZOOM, 2.4 * ZOOM),
        this.assets.basic(`gen-dash:${world.marking}`, world.marking),
      );
      dash.position.set(i * 48 * ZOOM, 0, 0.4);
      g.add(dash);
    }
    if (world.id === 'neon') {
      for (const s of [-1, 1]) {
        const edge = new THREE.Mesh(
          new THREE.PlaneGeometry(BOARD * 3, 1.6 * ZOOM),
          this.assets.basic(`gen-neon:${s}`, s < 0 ? 0xff3fb4 : 0x38e1ff),
        );
        edge.position.set(0, s * (PW / 2 - 3) * ZOOM, 0.4);
        g.add(edge);
      }
    }
    if (world.id === 'city' || world.id === 'beach' || world.id === 'neon') {
      for (const s of [-1, 1]) {
        const curb = new THREE.Mesh(
          this.assets.box('gen-curb', BOARD * 3, 4 * ZOOM, 4 * ZOOM),
          this.mat(world.safeDark),
        );
        curb.position.set(0, s * (PW / 2 - 1) * ZOOM, 2 * ZOOM);
        g.add(curb);
        const walk = new THREE.Mesh(
          this.assets.box('gen-walk', BOARD * 3, 7 * ZOOM, 1.2 * ZOOM),
          this.mat(world.walk),
        );
        walk.position.set(0, s * (PW / 2 - 5.5) * ZOOM, 0.6 * ZOOM);
        walk.receiveShadow = true;
        g.add(walk);
      }
    }
    if (variant === 'intersection') {
      for (let q = -3; q <= 3; q++) {
        const bar = new THREE.Mesh(
          new THREE.PlaneGeometry(10 * ZOOM, PW * ZOOM * 0.8),
          this.assets.basic('gen-inter', 0xffffff),
        );
        bar.position.set(q * 60 * ZOOM, 0, 0.4);
        g.add(bar);
      }
    }
  }

  makeCoinMesh(): THREE.Group {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(
      this.assets.cylinder('coin', 9 * ZOOM, 9 * ZOOM, 3 * ZOOM, 14),
      this.assets.phong('coin', 0xffc93c, { emissive: 0x7a5200, shininess: 80 }),
    );
    outer.rotation.x = Math.PI / 2;
    outer.castShadow = true;
    g.add(outer);
    const inner = new THREE.Mesh(
      this.assets.cylinder('coin-in', 5 * ZOOM, 5 * ZOOM, 3.4 * ZOOM, 12),
      this.assets.phong('coin-in', 0xffe27a, { emissive: 0x7a5200 }),
    );
    g.add(inner);
    return g;
  }

  private pickLaneType(index: number, world: WorldConfig, district: number): LaneType {
    if (index <= 4) return 'field';
    if (this.consecutiveRoads >= 4) return Math.random() < 0.5 ? 'field' : 'forest';
    const r = Math.random();
    let roadW = world.laneMix.road;
    const forestW = world.laneMix.obst;
    if (world.id === 'beach' && district === 0) roadW += 0.08;
    if (world.id === 'beach' && district === 3) roadW = Math.max(0.2, roadW - 0.12);
    if (index > 40) roadW = Math.min(0.52, roadW + 0.04);
    if (r < roadW) return Math.random() < world.carSplit ? 'car' : 'truck';
    if (r < roadW + forestW) return 'forest';
    return 'field';
  }

  private laneDecor(lane: Lane, def: World, playerColumnX: number | null): void {
    const world = def.config;
    if (world.id === 'city' && lane.type !== 'car' && lane.type !== 'truck') {
      for (const side of [-1, 1]) {
        const r = Math.random();
        const hb = new THREE.Group();
        if (r < 0.30) this.buildings.apartment(hb);
        else if (r < 0.60) this.buildings.shop(hb);
        else if (r < 0.82) this.buildings.smallHouse(hb);
        else this.buildings.cafe(hb);
        hb.position.x = side * (1050 + Math.random() * 80);
        hb.position.y = (Math.random() - 0.5) * PW * ZOOM * 0.55;
        lane.mesh.add(hb);
      }
      for (const side of [-1, 1]) {
        const tree = new THREE.Group();
        this.trees.streetTree(tree);
        tree.position.x = side * (BOARD * 0.78 + Math.random() * BOARD * 0.2);
        tree.position.y = (Math.random() - 0.5) * PW * ZOOM * 0.45;
        lane.mesh.add(tree);
      }
    }
    if (world.id === 'city' && (lane.type === 'car' || lane.type === 'truck')) {
      for (const side of [-1, 1]) {
        const lamp = new THREE.Group();
        this.props.lamp(lamp);
        lamp.position.x = side * BOARD * 0.55;
        lane.mesh.add(lamp);
      }
      if (Math.random() < 0.3) {
        const stop = new THREE.Group();
        this.buildings.busStop(stop);
        stop.position.x = Math.random() < 0.5 ? BOARD * 0.8 : -BOARD * 0.8;
        lane.mesh.add(stop);
      }
    }
    if (world.id === 'beach' && (lane.type === 'car' || lane.type === 'truck')) {
      for (const side of [-1, 1]) {
        const bar = new THREE.Group();
        this.props.beachBarrier(bar);
        bar.position.x = side * BOARD * 0.62;
        lane.mesh.add(bar);
      }
    }
    void playerColumnX;
    const builders: PropBuilder[] =
      world.id === 'beach' ? [(g) => this.trees.palm(g), (g) => this.props.dune(g)] : def.decor;
    const buildChance = world.id === 'city' ? 0.55 : 0.65;
    if (Math.random() > buildChance) return;
    for (const side of [-1, 1]) {
      if (Math.random() < (world.id === 'city' ? 0.15 : 0.4)) continue;
      const holder = new THREE.Group();
      pick(builders)(holder);
      holder.position.x = side * (BOARD * 0.75 + Math.random() * BOARD * 0.45);
      holder.position.y = (Math.random() - 0.5) * PW * ZOOM * 0.5;
      lane.mesh.add(holder);
    }
  }

  makeLane(index: number, def: World, opts: { playerX: number; playerLane: number }): Lane {
    const world = def.config;
    const district = world.id === 'beach' ? beachDistrict(index) : -1;
    const type = this.pickLaneType(index, world, district);
    const lane: Lane = {
      index, type, worldId: world.id, variant: null, district,
      mesh: new THREE.Group(), vehicles: [], coins: [], occupied: {},
      direction: Math.random() >= 0.5, speed: 2.4,
    };
    lane.mesh.position.y = index * PW * ZOOM;

    if (type === 'field' || type === 'forest') {
      let variant: string | null = null;
      if (type === 'field' && index > 4 && world.variants.length && Math.random() < 0.14) {
        variant = pick(world.variants);
      }
      if (type === 'field' && world.id === 'beach' && index > 4) {
        if (district === 1 && Math.random() < 0.4) variant = 'boardwalk';
        else if (district === 3 && Math.random() < 0.38) variant = 'pier';
      }
      lane.variant = variant;
      const g = new THREE.Group();
      this.buildTerrain(g, world, variant);
      lane.mesh.add(g);
      this.consecutiveRoads = 0;
      if (type === 'forest') {
        const builders: PropBuilder[] =
          world.id === 'beach' && def.beachObstacles
            ? def.beachObstacles[Math.max(0, Math.min(4, district))]
            : def.obstacles;
        const occ: Record<number, boolean> = {};
        const count = 4 + (Math.random() < 0.4 ? 1 : 0);
        for (let k = 0; k < count; k++) {
          let pos = -1;
          let guard = 0;
          do {
            pos = Math.floor(Math.random() * COLS);
            guard++;
          } while (occ[pos] && guard < 40);
          if (occ[pos]) continue;
          if (index < 8 && pos === Math.floor(COLS / 2)) continue;
          occ[pos] = true;
          const holder = new THREE.Group();
          pick(builders)(holder);
          holder.position.x = (pos * PW + PW / 2) * ZOOM - BOARD / 2;
          lane.mesh.add(holder);
        }
        lane.occupied = occ;
      }
      this.laneDecor(lane, def, opts.playerX);
    } else {
      let roadVariant: string | null = null;
      if (world.id === 'city' && index > 6 && Math.random() < 0.12) roadVariant = 'intersection';
      lane.variant = roadVariant;
      const rg = new THREE.Group();
      this.buildRoad(rg, world, roadVariant);
      lane.mesh.add(rg);
      this.consecutiveRoads++;
      const dif = this.difficultyFor(index);
      const kinds = type === 'car' ? world.carKinds : world.truckKinds;
      const n = (type === 'car' ? 3 : 2) + (dif.density && Math.random() < 0.5 ? 1 : 0);
      const used = new Set<number>();
      const list: THREE.Group[] = [];
      const placed: Array<{ x: number; half: number }> = [];
      const slots = type === 'car' ? 8 : 6;
      let attempts = 0;
      while (list.length < n && attempts < 80) {
        attempts++;
        const kind = pick(kinds);
        const slot = Math.floor(Math.random() * slots);
        if (used.has(slot)) continue;
        const probe = this.vehicles.create(kind);
        const px0 = (slot / slots - 0.5) * BOARD * 1.1;
        const ph0 = (probe.userData.length * ZOOM) / 2;
        let ok = true;
        for (const q of placed) {
          if (Math.abs(px0 - q.x) < ph0 + q.half + 50) { ok = false; break; }
        }
        if (!ok) continue;
        used.add(slot);
        const veh = probe as BuiltVehicle;
        veh.position.x = px0;
        if (!lane.direction) veh.rotation.z = Math.PI;
        veh.userData.baseSpeed = (veh.userData.speed * dif.speedMul * world.speedMul * (0.85 + Math.random() * 0.4));
        veh.userData.cruise = veh.userData.baseSpeed / 16;
        veh.userData.cur = veh.userData.cruise;
        veh.userData.prevDx = null;
        lane.mesh.add(veh);
        list.push(veh);
        placed.push({ x: px0, half: ph0 });
      }
      lane.vehicles = list;
      lane.speed = 2.4 * dif.speedMul * world.speedMul;
      // Fairness: nudge vehicles off the player's column on lanes entering view.
      if (index >= opts.playerLane && index - opts.playerLane <= 4) {
        for (const v of lane.vehicles) {
          const vu = (v as BuiltVehicle).userData;
          const half = (vu.length * ZOOM) / 2;
          if (Math.abs(v.position.x - opts.playerX) < half + 11 * ZOOM + 20) {
            v.position.x = opts.playerX + (v.position.x >= opts.playerX ? 1 : -1) * (half + 11 * ZOOM + 60);
          }
        }
      }
      this.laneDecor(lane, def, opts.playerX);
      // Deterministic de-overlap at generation time only (never at runtime).
      this.enforceLaneSpacing(lane, TRAFFIC_CONFIG.minGap);
    }

    // Coins on safe lanes.
    if ((type === 'field' || type === 'forest') && index > 2 && Math.random() < 0.4) {
      const col = Math.floor(Math.random() * COLS);
      if (!lane.occupied[col]) {
        const mesh = this.makeCoinMesh();
        mesh.position.set((col * PW + PW / 2) * ZOOM - BOARD / 2, 0, 16 * ZOOM);
        lane.mesh.add(mesh);
        lane.coins.push({ mesh, col, taken: false });
      }
    }
    return lane;
  }

  /** Generation-time de-overlap: sort front-first, push followers back. */
  enforceLaneSpacing(lane: Lane, gap: number): void {
    const sgn = lane.direction ? -1 : 1;
    for (let pass = 0; pass < 2; pass++) {
      const arr = lane.vehicles.slice().sort((a, b) => (b.position.x - a.position.x) * sgn);
      for (let i = 1; i < arr.length; i++) {
        const front = arr[i - 1];
        const back = arr[i];
        const need = this.half(front) + this.half(back) + gap;
        const have = (front.position.x - back.position.x) * sgn;
        if (have < need) back.position.x -= sgn * (need - have);
      }
    }
  }

  half(v: THREE.Object3D): number {
    const len = (v.userData.length as number | undefined) ?? 60;
    return (len * ZOOM) / 2;
  }
}
