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
import { COIN_SPEC, coinColor } from '../config/coin.config';
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

  private buildTerrain(g: THREE.Group, world: WorldConfig, variant: string | null, laneIndex: number): void {
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
    // CITY spawn: the starting lanes are already city sidewalk/pavement,
    // never a giant featureless gray platform. Sidewalk tone + curbs read
    // as a street entrance with the city around it.
    const cityStart = world.id === 'city' && laneIndex <= 4;
    const baseColor = cityStart ? world.walk : sandy ? this.sandTone(world.safe) : world.safe;
    const edgeColor = cityStart ? world.safeDark : sandy ? this.sandTone(world.safeDark) : world.safeDark;
    const m2 = this.slab(baseColor);
    m2.position.z = 1.5 * ZOOM;
    g.add(m2);
    const l = this.slab(edgeColor);
    l.position.set(-BOARD, 0, 1.5 * ZOOM);
    g.add(l);
    const r = this.slab(edgeColor);
    r.position.set(BOARD, 0, 1.5 * ZOOM);
    g.add(r);
    // Outer ground skirts: extend the world far beyond the playable board
    // so the elevated camera never exposes background void at the sides.
    // Static per-lane geometry in world space — tiles with the lanes.
    const ol = this.slab(edgeColor);
    ol.position.set(-BOARD * 2, 0, 1.5 * ZOOM);
    g.add(ol);
    const orr = this.slab(edgeColor);
    orr.position.set(BOARD * 2, 0, 1.5 * ZOOM);
    g.add(orr);

    if (world.id === 'neon') {
      // Neon cyber plaza: distinctive glowing cyber-island lines and pedestrian medians
      const gridTile = new THREE.Mesh(
        new THREE.PlaneGeometry(BOARD * 1.5, 2 * ZOOM),
        this.assets.basic('gen-neon-accent', 0x38e1ff),
      );
      gridTile.position.set(0, 0, 1.6 * ZOOM);
      g.add(gridTile);
      for (const s of [-1, 1]) {
        const strip = new THREE.Mesh(
          new THREE.PlaneGeometry(BOARD * 2.2, 1.2 * ZOOM),
          this.assets.basic(`gen-neon-strip:${s}`, s < 0 ? 0xff3fb4 : 0x38e1ff),
        );
        strip.position.set(0, s * (PW / 2 - 2) * ZOOM, 1.6 * ZOOM);
        g.add(strip);
      }
    }
  }

  private buildRoad(g: THREE.Group, world: WorldConfig, variant: string | null): void {
    const mid = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD * 5, PW * ZOOM),
      this.mat(world.road),
    );
    mid.receiveShadow = true;
    g.add(mid);
    for (let i = -14; i <= 14; i++) {
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
          new THREE.PlaneGeometry(BOARD * 5, 1.6 * ZOOM),
          this.assets.basic(`gen-neon:${s}`, s < 0 ? 0xff3fb4 : 0x38e1ff),
        );
        edge.position.set(0, s * (PW / 2 - 3) * ZOOM, 0.4);
        g.add(edge);
      }
    }
    if (world.id === 'city' || world.id === 'beach' || world.id === 'neon') {
      for (const s of [-1, 1]) {
        const curb = new THREE.Mesh(
          this.assets.box('gen-curb', BOARD * 5, 4 * ZOOM, 4 * ZOOM),
          this.mat(world.safeDark),
        );
        curb.position.set(0, s * (PW / 2 - 1) * ZOOM, 2 * ZOOM);
        g.add(curb);
        const walk = new THREE.Mesh(
          this.assets.box('gen-walk', BOARD * 5, 7 * ZOOM, 1.2 * ZOOM),
          this.mat(world.walk),
        );
        walk.position.set(0, s * (PW / 2 - 5.5) * ZOOM, 0.6 * ZOOM);
        walk.receiveShadow = true;
        g.add(walk);
      }
    }
    if (variant === 'intersection') {
      for (let q = -5; q <= 5; q++) {
        const bar = new THREE.Mesh(
          new THREE.PlaneGeometry(10 * ZOOM, PW * ZOOM * 0.8),
          this.assets.basic('gen-inter', 0xffffff),
        );
        bar.position.set(q * 60 * ZOOM, 0, 0.4);
        g.add(bar);
      }
    }
  }

  /**
   * Proper 3D collectible coin: stands VERTICALLY in world space.
   * CylinderGeometry's axis is Y (the lane direction), so with no
   * rotation the circular caps face ±Y — directly readable from the
   * elevated camera behind the player. The group spins around world Z
   * (CoinSystem), i.e. around the true vertical axis.
   *
   * Visual identity comes from COIN_SPEC — the same spec as the HUD
   * coin icon. Same silhouette, same golds, same face/rim detailing.
   */
  makeCoinMesh(): THREE.Group {
    const g = new THREE.Group();
    const R = 8 * ZOOM;
    const T = 2.5 * ZOOM;
    const edge = new THREE.Mesh(
      this.assets.cylinder('coin-v', R, R, T, 20),
      this.assets.standard('coin-edge', coinColor(COIN_SPEC.edge), { metalness: 0.85, roughness: 0.35, emissive: 0x2a1a00 }),
    );
    edge.castShadow = true;
    g.add(edge);
    for (const s of [-1, 1]) {
      const face = new THREE.Mesh(
        this.assets.cylinder('coin-face', R * COIN_SPEC.faceRatio, R * COIN_SPEC.faceRatio, T + 1, 20),
        this.assets.standard('coin-face', coinColor(COIN_SPEC.face), { metalness: 0.9, roughness: 0.28, emissive: 0x3a2600 }),
      );
      face.position.y = s * 0.2;
      face.castShadow = true;
      g.add(face);
    }
    const emboss = new THREE.Mesh(
      this.assets.cylinder('coin-emboss', R * COIN_SPEC.embossRatio, R * COIN_SPEC.embossRatio, T + 2, 14),
      this.assets.standard('coin-emboss', coinColor(COIN_SPEC.emboss), { metalness: 0.9, roughness: 0.3, emissive: 0x3a2600 }),
    );
    emboss.castShadow = true;
    g.add(emboss);
    const rim = new THREE.Mesh(
      this.assets.torus('coin-rim', R, 1.1 * ZOOM, 10, 24),
      this.assets.standard('coin-rim', coinColor(COIN_SPEC.rim), { metalness: 0.85, roughness: 0.4, emissive: 0x241500 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    g.add(rim);
    return g;
  }

  /**
   * World-specific signature 3D collectible items with distinct geometry and materials:
   * Volcano -> Magma Crystal
   * Beach -> Ocean Pearl
   * Forest -> Glowing Magic Leaf
   * Industrial -> Titanium Gear
   * Temple -> Ancient Rune Coin
   * Neon -> Cyber Data Chip
   * Desert -> Golden Scarab
   * Snow -> Permafrost Ice Crystal
   * City & other -> Energy Cell
   */
  makeCollectibleMesh(worldId: string): THREE.Group {
    const g = new THREE.Group();
    switch (worldId) {
      case 'volcano': {
        const R = 7 * ZOOM;
        const H = 14 * ZOOM;
        const top = new THREE.Mesh(
          this.assets.cylinder('col-volc-top', 0.1, R, H / 2, 6),
          this.assets.standard('col-volc', 0xff4757, { metalness: 0.3, roughness: 0.2, emissive: 0x991100 }),
        );
        top.position.z = H / 4;
        top.castShadow = true;
        g.add(top);
        const bot = new THREE.Mesh(
          this.assets.cylinder('col-volc-bot', R, 0.1, H / 2, 6),
          this.assets.standard('col-volc', 0xff4757, { metalness: 0.3, roughness: 0.2, emissive: 0x991100 }),
        );
        bot.position.z = -H / 4;
        bot.castShadow = true;
        g.add(bot);
        const core = new THREE.Mesh(
          this.assets.sphere('col-volc-core', 3.5 * ZOOM, 8, 6),
          this.assets.standard('col-volc-core', 0xffa502, { metalness: 0.8, roughness: 0.1, emissive: 0xff4500 }),
        );
        g.add(core);
        break;
      }
      case 'beach': {
        const pearl = new THREE.Mesh(
          this.assets.sphere('col-pearl', 6 * ZOOM, 14, 10),
          this.assets.standard('col-pearl', 0xfffafa, { metalness: 0.85, roughness: 0.15, emissive: 0x443333 }),
        );
        pearl.castShadow = true;
        g.add(pearl);
        const shellRing = new THREE.Mesh(
          this.assets.torus('col-pearl-ring', 6.5 * ZOOM, 1.4 * ZOOM, 10, 20),
          this.assets.standard('col-pearl-gold', 0xffc93c, { metalness: 0.9, roughness: 0.25, emissive: 0x442a00 }),
        );
        shellRing.rotation.x = Math.PI / 2;
        shellRing.castShadow = true;
        g.add(shellRing);
        break;
      }
      case 'forest': {
        const leaf = new THREE.Mesh(
          this.assets.roundedBox(7 * ZOOM, 3 * ZOOM, 14 * ZOOM, 1.2 * ZOOM, 2),
          this.assets.standard('col-forest-leaf', 0x2ed573, { metalness: 0.2, roughness: 0.2, emissive: 0x005522 }),
        );
        leaf.rotation.y = Math.PI / 4;
        leaf.castShadow = true;
        g.add(leaf);
        const jewel = new THREE.Mesh(
          this.assets.sphere('col-forest-dew', 2.8 * ZOOM, 8, 6),
          this.assets.standard('col-forest-dew', 0x7bed9f, { metalness: 0.9, roughness: 0.1, emissive: 0x00bb44 }),
        );
        g.add(jewel);
        break;
      }
      case 'industrial': {
        const R = 7.5 * ZOOM;
        const T = 2.4 * ZOOM;
        const gearBody = new THREE.Mesh(
          this.assets.cylinder('col-gear-body', R, R, T, 16),
          this.assets.standard('col-gear', 0xffa502, { metalness: 0.85, roughness: 0.3, emissive: 0x442200 }),
        );
        gearBody.castShadow = true;
        g.add(gearBody);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const tooth = new THREE.Mesh(
            this.assets.box('col-gear-tooth', 3.2 * ZOOM, 2.5 * ZOOM, T),
            this.assets.standard('col-gear', 0xffa502, { metalness: 0.85, roughness: 0.3, emissive: 0x442200 }),
          );
          tooth.position.set(Math.cos(a) * (R + 1.2 * ZOOM), Math.sin(a) * (R + 1.2 * ZOOM), 0);
          tooth.rotation.z = a;
          tooth.castShadow = true;
          g.add(tooth);
        }
        const bore = new THREE.Mesh(
          this.assets.cylinder('col-gear-bore', 3 * ZOOM, 3 * ZOOM, T + 0.4 * ZOOM, 12),
          this.assets.standard('col-gear-bore', 0x2f3542, { metalness: 0.95, roughness: 0.4 }),
        );
        g.add(bore);
        break;
      }
      case 'temple': {
        const R = 7.5 * ZOOM;
        const T = 2.4 * ZOOM;
        const disc = new THREE.Mesh(
          this.assets.cylinder('col-temple-disc', R, R, T, 18),
          this.assets.standard('col-temple', 0xbe2edd, { metalness: 0.7, roughness: 0.35, emissive: 0x440066 }),
        );
        disc.castShadow = true;
        g.add(disc);
        const rune = new THREE.Mesh(
          this.assets.box('col-temple-rune', 4 * ZOOM, 4 * ZOOM, T + 0.6 * ZOOM),
          this.assets.standard('col-temple-gold', 0xffc93c, { metalness: 0.9, roughness: 0.25, emissive: 0x553300 }),
        );
        rune.rotation.z = Math.PI / 4;
        rune.castShadow = true;
        g.add(rune);
        break;
      }
      case 'neon': {
        const chip = new THREE.Mesh(
          this.assets.roundedBox(11 * ZOOM, 11 * ZOOM, 2.2 * ZOOM, 1.2 * ZOOM, 2),
          this.assets.standard('col-neon-chip', 0x1e2430, { metalness: 0.8, roughness: 0.3 }),
        );
        chip.castShadow = true;
        g.add(chip);
        const core = new THREE.Mesh(
          this.assets.box('col-neon-core', 7 * ZOOM, 7 * ZOOM, 2.8 * ZOOM),
          this.assets.standard('col-neon-glow', 0xff3fb4, { metalness: 0.6, roughness: 0.2, emissive: 0xaa1166 }),
        );
        g.add(core);
        break;
      }
      case 'snow': {
        const R = 6.5 * ZOOM;
        const H = 14 * ZOOM;
        const top = new THREE.Mesh(
          this.assets.cylinder('col-snow-top', 0.1, R, H / 2, 6),
          this.assets.standard('col-snow-ice', 0x70a1ff, { metalness: 0.3, roughness: 0.15, emissive: 0x113366 }),
        );
        top.position.z = H / 4;
        top.castShadow = true;
        g.add(top);
        const bot = new THREE.Mesh(
          this.assets.cylinder('col-snow-bot', R, 0.1, H / 2, 6),
          this.assets.standard('col-snow-ice', 0x70a1ff, { metalness: 0.3, roughness: 0.15, emissive: 0x113366 }),
        );
        bot.position.z = -H / 4;
        bot.castShadow = true;
        g.add(bot);
        break;
      }
      case 'desert': {
        const scarab = new THREE.Mesh(
          this.assets.sphere('col-scarab', 5.8 * ZOOM, 10, 8),
          this.assets.standard('col-scarab-gold', 0xffc93c, { metalness: 0.95, roughness: 0.25, emissive: 0x553800 }),
        );
        scarab.scale.set(1.3, 1, 0.65);
        scarab.castShadow = true;
        g.add(scarab);
        const gem = new THREE.Mesh(
          this.assets.sphere('col-scarab-gem', 2.4 * ZOOM, 8, 6),
          this.assets.standard('col-scarab-gem', 0x1dd1a1, { metalness: 0.7, roughness: 0.2, emissive: 0x005533 }),
        );
        gem.position.z = 2.8 * ZOOM;
        g.add(gem);
        break;
      }
      default: {
        const cell = new THREE.Mesh(
          this.assets.cylinder('col-cell-body', 4.5 * ZOOM, 4.5 * ZOOM, 11 * ZOOM, 12),
          this.assets.standard('col-cell', 0x00f0ff, { metalness: 0.4, roughness: 0.2, emissive: 0x006688 }),
        );
        cell.castShadow = true;
        g.add(cell);
        for (const s of [-1, 1]) {
          const cap = new THREE.Mesh(
            this.assets.cylinder('col-cell-cap', 5 * ZOOM, 5 * ZOOM, 2 * ZOOM, 12),
            this.assets.standard('col-cell-cap', 0xdfe4ea, { metalness: 0.9, roughness: 0.25 }),
          );
          cap.position.y = s * 5 * ZOOM;
          g.add(cap);
        }
        break;
      }
    }
    return g;
  }

  private pickLaneType(index: number, world: WorldConfig, district: number): LaneType {
    // Safe spawn: the lanes around the run start are always calm grass —
    // never a road, so PLAY/restart can never drop the player into traffic.
    if (Math.abs(index - GAME_CONFIG.startLane) <= 1) return 'field';
    if (index <= 4) return 'field';
    // Strict consecutive road cap: maximum 3 across all worlds.
    // For Neon, cap at 2 consecutive roads (prefer 1-2 road sections then safe area).
    const maxConsecutive = world.id === 'neon' ? 2 : 3;
    if (this.consecutiveRoads >= maxConsecutive) return Math.random() < 0.65 ? 'field' : 'forest';
    const r = Math.random();
    let roadW = world.laneMix.road;
    const forestW = world.laneMix.obst;
    if (world.id === 'neon' && this.consecutiveRoads >= 1) {
      // In Neon, after 1 road, heavily bias towards safe recovery areas (sidewalk / plaza / median)
      roadW *= 0.42;
    }
    if (world.id === 'beach' && district === 0) roadW += 0.08;
    if (world.id === 'beach' && district === 3) roadW = Math.max(0.2, roadW - 0.12);
    if (index > 40 && world.id !== 'neon') roadW = Math.min(0.50, roadW + 0.04);
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
      mesh: new THREE.Group(), vehicles: [], coins: [], occupied: {}, jumpable: {},
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
      this.buildTerrain(g, world, variant, index);
      lane.mesh.add(g);
      this.consecutiveRoads = 0;
      if (type === 'forest') {
        const builders: PropBuilder[] =
          world.id === 'beach' && def.beachObstacles
            ? def.beachObstacles[Math.max(0, Math.min(4, district))]
            : def.obstacles;
        const occ: Record<number, boolean> = {};
        const jmp: Record<number, boolean> = {};
        const center = Math.floor(COLS / 2);
        // Safe-spawn clearing: lanes right after the start keep the middle
        // columns free so a fresh/restarted run always has immediate options.
        const spawnClear = index >= GAME_CONFIG.startLane && index <= GAME_CONFIG.startLane + 3;
        const count = 4 + (Math.random() < 0.4 ? 1 : 0);
        for (let k = 0; k < count; k++) {
          let pos = -1;
          let guard = 0;
          do {
            pos = Math.floor(Math.random() * COLS);
            guard++;
          } while (occ[pos] && guard < 40);
          if (occ[pos]) continue;
          if (index < 8 && pos === center) continue;
          if (spawnClear && Math.abs(pos - center) <= 1) continue;
          occ[pos] = true;
          // Forest-lane obstacles are low/clearable by design: jumping over
          // them is a core mechanic, so they register as jumpable.
          jmp[pos] = true;
          const holder = new THREE.Group();
          pick(builders)(holder);
          holder.position.x = (pos * PW + PW / 2) * ZOOM - BOARD / 2;
          lane.mesh.add(holder);
        }
        // Density guard: never wall off a lane — always leave at least
        // three free columns so no chunk is impassable by construction.
        const keys = Object.keys(occ).map(Number);
        if (keys.length > COLS - 3) {
          for (let i = 0; i < keys.length - (COLS - 3); i++) {
            const drop = keys[Math.floor(Math.random() * keys.length)];
            delete occ[drop];
            delete jmp[drop];
          }
        }
        lane.occupied = occ;
        lane.jumpable = jmp;
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
      // Progressive discovery: exotic traffic (hover/neon/snow machines,
      // motos, buses) only joins beyond the early lanes; the opening
      // stretches stay readable with familiar vehicles.
      const exotic = /^(hover|neocar|snowmobile|moto|bus)$/;
      const pool = index < 40 ? kinds.filter((k) => !exotic.test(k)) : kinds;
      const spawnKinds = pool.length ? pool : kinds;
      const n = (type === 'car' ? 3 : 2) + (dif.density && Math.random() < 0.5 ? 1 : 0);
      const used = new Set<number>();
      const list: THREE.Group[] = [];
      const placed: Array<{ x: number; half: number }> = [];
      const slots = type === 'car' ? 8 : 6;
      let attempts = 0;
      while (list.length < n && attempts < 80) {
        attempts++;
        const kind = pick(spawnKinds);
        const slot = Math.floor(Math.random() * slots);
        if (used.has(slot)) continue;
        const probe = this.vehicles.create(kind);
        const px0 = (slot / slots - 0.5) * BOARD * 1.1;
        const ph0 = (probe.userData.length * ZOOM) / 2;
        const minGap = world.id === 'neon' ? 95 : 50;
        let ok = true;
        for (const q of placed) {
          if (Math.abs(px0 - q.x) < ph0 + q.half + minGap) { ok = false; break; }
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
      this.enforceLaneSpacing(lane, world.id === 'neon' ? 55 : TRAFFIC_CONFIG.minGap);
    }

    // Coins on safe lanes: intentional patterns (singles, pairs, short
    // runs), never random spam. Standing height keeps the coin just above
    // the ground: slab top (3*ZOOM) + coin radius (8*ZOOM) + small offset.
    if ((type === 'field' || type === 'forest') && index > 2 && Math.random() < 0.45) {
      const r = Math.random();
      const cols: number[] = [];
      const start = Math.floor(Math.random() * COLS);
      if (r < 0.5 || COLS < 3) cols.push(start);
      else if (r < 0.75) {
        cols.push(start, Math.min(COLS - 1, start + 1));
      } else {
        cols.push(
          Math.max(0, start - 1), start, Math.min(COLS - 1, start + 1),
        );
      }
      for (const col of cols) {
        if (lane.occupied[col]) continue;
        if (lane.coins.some((c) => c.col === col)) continue;
        const isCollectible = Math.random() < 0.28;
        const mesh = isCollectible ? this.makeCollectibleMesh(world.id) : this.makeCoinMesh();
        mesh.position.set((col * PW + PW / 2) * ZOOM - BOARD / 2, 0, 12 * ZOOM);
        lane.mesh.add(mesh);
        lane.coins.push({ mesh, col, taken: false });
      }
    }

    // Procedural fairness validation: if lane fails safety/fairness, sanitize to safe field
    if (!this.validateLane(lane, world, index)) {
      this.sanitizeToSafeField(lane, world, index);
    }

    return lane;
  }

  /**
   * Procedural fairness validator: guarantees every lane is humanly playable,
   * never creates an impassable wall, and enforces recovery pacing beats.
   */
  private validateLane(lane: Lane, world: WorldConfig, index: number): boolean {
    // 1. Safe spawn: lanes around start must always be calm fields
    if (index <= 4 && lane.type !== 'field') return false;

    // 2. Maximum consecutive road cap: never exceed 2 in Neon or 3 in any world
    const maxConsecutive = world.id === 'neon' ? 2 : 3;
    if ((lane.type === 'car' || lane.type === 'truck') && this.consecutiveRoads > maxConsecutive) {
      return false;
    }

    // 3. Obstacle lanes: must always have at least 3 unblocked/traversable columns
    if (lane.type === 'forest') {
      const blockedCount = Object.keys(lane.occupied).length;
      if (blockedCount > COLS - 3) return false;
      let openCount = 0;
      for (let c = 0; c < COLS; c++) {
        if (!lane.occupied[c]) openCount++;
      }
      if (openCount < 2) return false;
    }

    // 4. Vehicle lanes: ensure vehicle spacing is readable and safe
    if (lane.type === 'car' || lane.type === 'truck') {
      const minGap = world.id === 'neon' ? 55 : TRAFFIC_CONFIG.minGap;
      const sorted = lane.vehicles.slice().sort((a, b) => a.position.x - b.position.x);
      for (let i = 1; i < sorted.length; i++) {
        const dist = Math.abs(sorted[i].position.x - sorted[i - 1].position.x);
        const required = this.half(sorted[i]) + this.half(sorted[i - 1]) + minGap * 0.7;
        if (dist < required) return false;
      }
    }

    return true;
  }

  /** Converts an invalid/unfair lane into a calm, themed safe recovery area. */
  private sanitizeToSafeField(lane: Lane, world: WorldConfig, index: number): void {
    while (lane.mesh.children.length > 0) {
      lane.mesh.remove(lane.mesh.children[0]);
    }
    lane.type = 'field';
    lane.vehicles = [];
    lane.occupied = {};
    lane.jumpable = {};
    lane.coins = [];
    this.consecutiveRoads = 0;
    const g = new THREE.Group();
    this.buildTerrain(g, world, null, index);
    lane.mesh.add(g);
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
