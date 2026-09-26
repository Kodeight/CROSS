/**
 * Forward generation, static world-space objects. Lanes are built at
 * fixed y = index * laneSize and NEVER move afterward. Vehicles keep
 * laneId/laneCenter/direction/speed; spawn positions are gap-validated.
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
import { collectibleForWorld } from '../config/collectibles.config';
import { getDifficultySpec, type DifficultyLevel } from '../config/difficulty.config';
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

  difficultyFor(lane: number, world: WorldConfig, difficultyLevel?: DifficultyLevel | string): {
    speedMul: number;
    densityBonus: number;
    minGapFactor: number;
  } {
    const spec = getDifficultySpec(difficultyLevel);
    const progressionScale = 1.0 + Math.min(lane * 0.006, 0.7);
    const speedMul = world.speedMul * spec.multiplier * progressionScale;
    return {
      speedMul,
      densityBonus: spec.trafficDensityBonus,
      minGapFactor: spec.minGapFactor,
    };
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
    if (world.id === 'beach') {
      const d = beachDistrict(laneIndex);
      if (d === 0) {
        g.add(this.slab(0x5a8a3a, 3));
      } else if (d === 1) {
        g.add(this.slab(this.sandTone(0xe8d090), 2.8));
      } else if (d === 2) {
        g.add(this.slab(0x40a0b8, 1.8));
        this.regWater(g, 0);
      } else if (d === 3) {
        g.add(this.slab(0x287898, 1.4));
        this.regWater(g, 0);
      } else {
        g.add(this.slab(this.sandTone(0xdfc480), 2.8));
      }
      return;
    }

    if (variant === 'bridge') {
      const plank = new THREE.Mesh(
        this.assets.box('gen-bridge', BOARD * 0.85, PW * ZOOM * 0.9, 4 * ZOOM),
        this.assets.standard('bridge-wood', 0x5a3d28, { roughness: 0.8 }),
      );
      plank.receiveShadow = true;
      plank.castShadow = true;
      g.add(plank);
      const water = new THREE.Mesh(
        this.assets.box('bridge-water', BOARD, PW * ZOOM, 1.5 * ZOOM),
        this.mat(world.id === 'volcano' ? 0xff3811 : 0x2d68c4, 60),
      );
      water.position.z = -2.5 * ZOOM;
      g.add(water);
      this.regWater(water, -2.5 * ZOOM);
      return;
    }

    if (variant === 'boardwalk') {
      const b = new THREE.Mesh(
        this.assets.box('gen-boardwalk', BOARD, PW * ZOOM, 3.5 * ZOOM),
        this.assets.standard('boardwalk-wood', 0xc2a679, { roughness: 0.7 }),
      );
      b.receiveShadow = true;
      g.add(b);
      return;
    }

    if (variant === 'ice') {
      const ice = new THREE.Mesh(
        this.assets.box('gen-ice', BOARD, PW * ZOOM, 2.5 * ZOOM),
        this.mat(0xd6eaf8, 90),
      );
      ice.receiveShadow = true;
      g.add(ice);
      return;
    }

    const groundColor = Math.random() < 0.5 ? world.safe : world.safeDark;
    g.add(this.slab(groundColor, 3));
  }

  private buildRoad(g: THREE.Group, world: WorldConfig, variant: string | null): void {
    const roadColor = world.road;
    g.add(this.slab(roadColor, 2.8));

    // Sidewalk curb edges
    for (const s of [-1, 1]) {
      const curb = new THREE.Mesh(
        this.assets.box(`road-curb:${world.id}`, BOARD, 1.8 * ZOOM, 3.4 * ZOOM),
        this.mat(world.walk, 20),
      );
      curb.position.y = s * ((PW * ZOOM) / 2 - 0.9 * ZOOM);
      curb.position.z = 0.3 * ZOOM;
      curb.receiveShadow = true;
      g.add(curb);
    }

    // Road markings
    if (variant === 'intersection' || variant === 'crosswalk') {
      for (let x = -BOARD / 2 + 15 * ZOOM; x < BOARD / 2; x += 30 * ZOOM) {
        const stripe = new THREE.Mesh(
          this.assets.box('crosswalk-stripe', 12 * ZOOM, PW * ZOOM * 0.65, 0.4 * ZOOM),
          this.mat(world.marking, 10),
        );
        stripe.position.set(x, 0, 1.6 * ZOOM);
        stripe.receiveShadow = true;
        g.add(stripe);
      }
    } else {
      for (let x = -BOARD / 2 + 25 * ZOOM; x < BOARD / 2; x += 50 * ZOOM) {
        const dash = new THREE.Mesh(
          this.assets.box('road-dash', 22 * ZOOM, 2.2 * ZOOM, 0.35 * ZOOM),
          this.mat(world.marking, 10),
        );
        dash.position.set(x, 0, 1.55 * ZOOM);
        dash.receiveShadow = true;
        g.add(dash);
      }
    }
  }

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
   * World-specific signature 3D collectible items with distinct geometry,
   * materials, and animated energy base halos across ALL 20 worlds!
   */
  makeCollectibleMesh(worldId: string): THREE.Group {
    const g = new THREE.Group();
    const colDef = collectibleForWorld(worldId);

    // Glowing ground aura halo ring
    const halo = new THREE.Mesh(
      this.assets.torus(`col-halo:${colDef.id}`, 9.5 * ZOOM, 1.2 * ZOOM, 8, 24),
      this.assets.standard(`col-halo-mat:${colDef.id}`, colDef.glowColor, {
        metalness: 0.9,
        roughness: 0.1,
        emissive: colDef.glowColor,
      }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.z = -7 * ZOOM;
    g.add(halo);

    switch (colDef.shape) {
      case 'crystal': {
        const R = 7 * ZOOM;
        const H = 15 * ZOOM;
        const top = new THREE.Mesh(
          this.assets.cylinder(`col-cryst-top:${worldId}`, 0.1, R, H / 2, 6),
          this.assets.standard(`col-mat:${worldId}`, colDef.color, { metalness: 0.4, roughness: 0.15, emissive: colDef.emissive }),
        );
        top.position.z = H / 4;
        top.castShadow = true;
        g.add(top);
        const bot = new THREE.Mesh(
          this.assets.cylinder(`col-cryst-bot:${worldId}`, R, 0.1, H / 2, 6),
          this.assets.standard(`col-mat:${worldId}`, colDef.color, { metalness: 0.4, roughness: 0.15, emissive: colDef.emissive }),
        );
        bot.position.z = -H / 4;
        bot.castShadow = true;
        g.add(bot);
        const core = new THREE.Mesh(
          this.assets.sphere(`col-cryst-core:${worldId}`, 3.5 * ZOOM, 8, 6),
          this.assets.standard(`col-cryst-core-mat:${worldId}`, colDef.glowColor, { metalness: 0.9, roughness: 0.1, emissive: colDef.glowColor }),
        );
        g.add(core);
        break;
      }
      case 'pearl': {
        const pearl = new THREE.Mesh(
          this.assets.sphere('col-pearl', 6.5 * ZOOM, 16, 12),
          this.assets.standard('col-pearl-mat', colDef.color, { metalness: 0.9, roughness: 0.1, emissive: colDef.emissive }),
        );
        pearl.castShadow = true;
        g.add(pearl);
        const ring = new THREE.Mesh(
          this.assets.torus('col-pearl-goldring', 7 * ZOOM, 1.4 * ZOOM, 10, 24),
          this.assets.standard('col-gold-mat', 0xffc93c, { metalness: 0.95, roughness: 0.2, emissive: 0x442a00 }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.castShadow = true;
        g.add(ring);
        break;
      }
      case 'leaf': {
        const leaf = new THREE.Mesh(
          this.assets.roundedBox(8 * ZOOM, 3.2 * ZOOM, 15 * ZOOM, 1.4 * ZOOM, 2),
          this.assets.standard('col-leaf-mat', colDef.color, { metalness: 0.3, roughness: 0.2, emissive: colDef.emissive }),
        );
        leaf.rotation.y = Math.PI / 4;
        leaf.castShadow = true;
        g.add(leaf);
        const dew = new THREE.Mesh(
          this.assets.sphere('col-leaf-dew', 3.2 * ZOOM, 8, 6),
          this.assets.standard('col-leaf-dew-mat', colDef.glowColor, { metalness: 0.9, roughness: 0.1, emissive: colDef.glowColor }),
        );
        g.add(dew);
        break;
      }
      case 'gear': {
        const R = 8 * ZOOM;
        const T = 2.6 * ZOOM;
        const gearBody = new THREE.Mesh(
          this.assets.cylinder('col-gear-body', R, R, T, 16),
          this.assets.standard('col-gear-mat', colDef.color, { metalness: 0.88, roughness: 0.25, emissive: colDef.emissive }),
        );
        gearBody.castShadow = true;
        g.add(gearBody);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const tooth = new THREE.Mesh(
            this.assets.box('col-gear-tooth', 3.5 * ZOOM, 2.8 * ZOOM, T),
            this.assets.standard('col-gear-mat', colDef.color, { metalness: 0.88, roughness: 0.25, emissive: colDef.emissive }),
          );
          tooth.position.set(Math.cos(a) * (R + 1.4 * ZOOM), Math.sin(a) * (R + 1.4 * ZOOM), 0);
          tooth.rotation.z = a;
          tooth.castShadow = true;
          g.add(tooth);
        }
        const bore = new THREE.Mesh(
          this.assets.cylinder('col-gear-bore', 3.2 * ZOOM, 3.2 * ZOOM, T + 0.5 * ZOOM, 12),
          this.assets.standard('col-gear-bore-mat', 0x2f3542, { metalness: 0.95, roughness: 0.4 }),
        );
        g.add(bore);
        break;
      }
      case 'chip': {
        const chip = new THREE.Mesh(
          this.assets.roundedBox(12 * ZOOM, 12 * ZOOM, 2.4 * ZOOM, 1.2 * ZOOM, 2),
          this.assets.standard('col-chip-base', 0x1e2430, { metalness: 0.85, roughness: 0.3 }),
        );
        chip.castShadow = true;
        g.add(chip);
        const core = new THREE.Mesh(
          this.assets.box('col-chip-core', 7.5 * ZOOM, 7.5 * ZOOM, 3 * ZOOM),
          this.assets.standard('col-chip-glow', colDef.color, { metalness: 0.7, roughness: 0.15, emissive: colDef.glowColor }),
        );
        g.add(core);
        break;
      }
      case 'scarab': {
        const scarab = new THREE.Mesh(
          this.assets.sphere('col-scarab-body', 6.2 * ZOOM, 12, 8),
          this.assets.standard('col-scarab-mat', colDef.color, { metalness: 0.95, roughness: 0.2, emissive: colDef.emissive }),
        );
        scarab.scale.set(1.3, 1, 0.65);
        scarab.castShadow = true;
        g.add(scarab);
        const gem = new THREE.Mesh(
          this.assets.sphere('col-scarab-jewel', 2.8 * ZOOM, 8, 6),
          this.assets.standard('col-scarab-gem-mat', 0x1dd1a1, { metalness: 0.8, roughness: 0.15, emissive: 0x008844 }),
        );
        gem.position.z = 3 * ZOOM;
        g.add(gem);
        break;
      }
      case 'crown': {
        const crown = new THREE.Mesh(
          this.assets.cylinder('col-crown-base', 7 * ZOOM, 8.5 * ZOOM, 7 * ZOOM, 12),
          this.assets.standard('col-crown-mat', 0xffd700, { metalness: 0.95, roughness: 0.2, emissive: 0x553300 }),
        );
        crown.castShadow = true;
        g.add(crown);
        const ruby = new THREE.Mesh(
          this.assets.sphere('col-crown-ruby', 3 * ZOOM, 8, 6),
          this.assets.standard('col-crown-ruby-mat', 0xff4757, { metalness: 0.85, roughness: 0.1, emissive: 0xff1122 }),
        );
        ruby.position.z = 4.5 * ZOOM;
        g.add(ruby);
        break;
      }
      case 'plasma':
      case 'fragment': {
        const orb = new THREE.Mesh(
          this.assets.sphere(`col-orb:${worldId}`, 6.5 * ZOOM, 12, 10),
          this.assets.standard(`col-orb-mat:${worldId}`, colDef.color, { metalness: 0.8, roughness: 0.1, emissive: colDef.glowColor }),
        );
        orb.castShadow = true;
        g.add(orb);
        for (let i = 0; i < 2; i++) {
          const ring = new THREE.Mesh(
            this.assets.torus(`col-plasma-ring:${i}`, (7.5 + i * 1.5) * ZOOM, 0.9 * ZOOM, 8, 20),
            this.assets.standard(`col-plasma-ring-mat:${i}`, colDef.glowColor, { metalness: 0.95, roughness: 0.1, emissive: colDef.glowColor }),
          );
          ring.rotation.x = Math.PI / 3 + i * 0.8;
          ring.rotation.y = i * 0.9;
          g.add(ring);
        }
        break;
      }
      default: {
        // High-tech Power Cell
        const cell = new THREE.Mesh(
          this.assets.cylinder(`col-cell:${worldId}`, 4.8 * ZOOM, 4.8 * ZOOM, 12 * ZOOM, 14),
          this.assets.standard(`col-cell-mat:${worldId}`, colDef.color, { metalness: 0.6, roughness: 0.2, emissive: colDef.emissive }),
        );
        cell.castShadow = true;
        g.add(cell);
        for (const s of [-1, 1]) {
          const cap = new THREE.Mesh(
            this.assets.cylinder('col-cell-cap', 5.3 * ZOOM, 5.3 * ZOOM, 2.2 * ZOOM, 14),
            this.assets.standard('col-cell-cap-mat', 0xdfe4ea, { metalness: 0.9, roughness: 0.25 }),
          );
          cap.position.y = s * 5.4 * ZOOM;
          g.add(cap);
        }
        break;
      }
    }
    return g;
  }

  private pickLaneType(index: number, world: WorldConfig, district: number, difficultyLevel?: DifficultyLevel | string): LaneType {
    if (Math.abs(index - GAME_CONFIG.startLane) <= 1) return 'field';
    if (index <= 4) return 'field';

    const spec = getDifficultySpec(difficultyLevel);
    const maxConsecutive = world.id === 'neon' ? (spec.id === 'EASY' ? 1 : 2) : (spec.id === 'EASY' ? 2 : spec.id === 'EXTREME' ? 4 : 3);
    
    if (this.consecutiveRoads >= maxConsecutive) {
      return Math.random() < (spec.id === 'EASY' ? 0.8 : 0.6) ? 'field' : 'forest';
    }

    const r = Math.random();
    let roadW = world.laneMix.road * (spec.id === 'EASY' ? 0.75 : spec.id === 'EXTREME' ? 1.25 : 1.0);
    const forestW = world.laneMix.obst;

    if (world.id === 'neon' && this.consecutiveRoads >= 1) {
      roadW *= 0.42;
    }
    if (world.id === 'beach' && district === 0) roadW += 0.08;
    if (world.id === 'beach' && district === 3) roadW = Math.max(0.2, roadW - 0.12);
    if (index > 40 && world.id !== 'neon') roadW = Math.min(0.58, roadW + 0.04);

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
      world.id === 'beach' ? [(g: THREE.Group) => this.trees.palm(g), (g: THREE.Group) => this.props.dune(g)] : def.decor;
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

  makeLane(
    index: number,
    def: World,
    opts: { playerX: number; playerLane: number; difficulty?: DifficultyLevel | string },
  ): Lane {
    const world = def.config;
    const district = world.id === 'beach' ? beachDistrict(index) : -1;
    const type = this.pickLaneType(index, world, district, opts.difficulty);
    const lane: Lane = {
      index,
      type,
      worldId: world.id,
      variant: null,
      district,
      mesh: new THREE.Group(),
      vehicles: [],
      coins: [],
      collectibles: [],
      occupied: {},
      jumpable: {},
      direction: Math.random() >= 0.5,
      speed: 2.4,
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
          jmp[pos] = true;
          const holder = new THREE.Group();
          pick(builders)(holder);
          holder.position.x = (pos * PW + PW / 2) * ZOOM - BOARD / 2;
          lane.mesh.add(holder);
        }
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

      const dif = this.difficultyFor(index, world, opts.difficulty);
      const kinds = type === 'car' ? world.carKinds : world.truckKinds;
      const exotic = /^(hover|neocar|snowmobile|moto|bus)$/;
      const pool = index < 40 ? kinds.filter((k: string) => !exotic.test(k)) : kinds;
      const spawnKinds = pool.length ? pool : kinds;

      const baseCars = type === 'car' ? 3 : 2;
      const targetCars = Math.max(1, Math.min(5, baseCars + dif.densityBonus));
      const used = new Set<number>();
      const list: THREE.Group[] = [];
      const placed: Array<{ x: number; half: number }> = [];
      const slots = type === 'car' ? 8 : 6;
      let attempts = 0;

      // Consistent lane speed: all vehicles in this lane share controlled cruising speed
      const laneSpeed = 2.4 * dif.speedMul;
      lane.speed = laneSpeed;

      while (list.length < targetCars && attempts < 90) {
        attempts++;
        const kind = pick(spawnKinds);
        const slot = Math.floor(Math.random() * slots);
        if (used.has(slot)) continue;
        const probe = this.vehicles.create(kind);
        const px0 = (slot / slots - 0.5) * BOARD * 1.1;
        const ph0 = (probe.userData.length * ZOOM) / 2;
        const baseMinGap = world.id === 'neon' ? 85 : TRAFFIC_CONFIG.minGap;
        const minGap = baseMinGap * dif.minGapFactor;
        
        let ok = true;
        for (const q of placed) {
          if (Math.abs(px0 - q.x) < ph0 + q.half + minGap) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        used.add(slot);
        const veh = probe as BuiltVehicle;
        veh.position.x = px0;
        if (!lane.direction) veh.rotation.z = Math.PI;

        // Controlled, predictable cruise speed without jarring random bursts
        veh.userData.baseSpeed = laneSpeed;
        veh.userData.cruise = laneSpeed / 16;
        veh.userData.cur = veh.userData.cruise;
        veh.userData.prevDx = null;

        lane.mesh.add(veh);
        list.push(veh);
        placed.push({ x: px0, half: ph0 });
      }
      lane.vehicles = list;

      // Fairness: nudge vehicles off the player's column on lanes entering view
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
      this.enforceLaneSpacing(lane, (world.id === 'neon' ? 65 : TRAFFIC_CONFIG.minGap) * dif.minGapFactor);
    }

    // Coins & World Superpower Collectibles placement on safe lanes
    if ((type === 'field' || type === 'forest') && index > 2 && Math.random() < 0.48) {
      const r = Math.random();
      const cols: number[] = [];
      const start = Math.floor(Math.random() * COLS);
      if (r < 0.5 || COLS < 3) cols.push(start);
      else if (r < 0.75) {
        cols.push(start, Math.min(COLS - 1, start + 1));
      } else {
        cols.push(Math.max(0, start - 1), start, Math.min(COLS - 1, start + 1));
      }

      for (const col of cols) {
        if (lane.occupied[col]) continue;
        if (lane.coins.some((c: { col: number }) => c.col === col)) continue;

        // Spawn signature superpower collectible ~30% of the time, else standard gold coin
        const isCollectible = Math.random() < 0.32;
        if (isCollectible) {
          const colDef = collectibleForWorld(world.id);
          const mesh = this.makeCollectibleMesh(world.id);
          mesh.position.set((col * PW + PW / 2) * ZOOM - BOARD / 2, 0, 12 * ZOOM);
          lane.mesh.add(mesh);
          lane.collectibles?.push({
            mesh,
            col,
            id: colDef.id,
            name: colDef.name,
            bonusCoins: colDef.bonusCoins,
            taken: false,
          });
        } else {
          const mesh = this.makeCoinMesh();
          mesh.position.set((col * PW + PW / 2) * ZOOM - BOARD / 2, 0, 12 * ZOOM);
          lane.mesh.add(mesh);
          lane.coins.push({ mesh, col, taken: false });
        }
      }
    }

    if (!this.validateLane(lane, world, index, opts.difficulty)) {
      this.sanitizeToSafeField(lane, world, index);
    }

    return lane;
  }

  private validateLane(lane: Lane, world: WorldConfig, index: number, difficultyLevel?: DifficultyLevel | string): boolean {
    if (index <= 4 && lane.type !== 'field') return false;

    const spec = getDifficultySpec(difficultyLevel);
    const maxConsecutive = world.id === 'neon' ? (spec.id === 'EASY' ? 1 : 2) : (spec.id === 'EASY' ? 2 : spec.id === 'EXTREME' ? 4 : 3);
    if ((lane.type === 'car' || lane.type === 'truck') && this.consecutiveRoads > maxConsecutive) {
      return false;
    }

    if (lane.type === 'forest') {
      const blockedCount = Object.keys(lane.occupied).length;
      if (blockedCount > COLS - 3) return false;
      let openCount = 0;
      for (let c = 0; c < COLS; c++) {
        if (!lane.occupied[c]) openCount++;
      }
      if (openCount < 3) return false;
    }
    return true;
  }

  private sanitizeToSafeField(lane: Lane, world: WorldConfig, index: number): void {
    while (lane.mesh.children.length) lane.mesh.remove(lane.mesh.children[0]);
    lane.type = 'field';
    lane.variant = null;
    lane.vehicles = [];
    lane.coins = [];
    lane.collectibles = [];
    lane.occupied = {};
    lane.jumpable = {};
    this.consecutiveRoads = 0;

    const g = new THREE.Group();
    this.buildTerrain(g, world, null, index);
    lane.mesh.add(g);
  }

  private enforceLaneSpacing(lane: Lane, minGap: number): void {
    const vs = lane.vehicles;
    if (vs.length < 2) return;
    vs.sort((a: THREE.Group, b: THREE.Group) => a.position.x - b.position.x);
    for (let i = 0; i < vs.length - 1; i++) {
      const v1 = vs[i] as BuiltVehicle;
      const v2 = vs[i + 1] as BuiltVehicle;
      const h1 = (v1.userData.length * ZOOM) / 2;
      const h2 = (v2.userData.length * ZOOM) / 2;
      const curGap = v2.position.x - v1.position.x - h1 - h2;
      if (curGap < minGap) {
        v2.position.x += minGap - curGap;
      }
    }
  }
}
