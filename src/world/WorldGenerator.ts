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
import { WorldTerrainMaterials } from './environment/WorldTerrainMaterials';
import type { Lane, LaneType, World } from './World';
import { TRAFFIC_CONFIG } from '../config/traffic.config';
import { activeCollectibleForWorld } from '../config/collectibles.config';
import { buildGeneratedCollectible, isGeneratedKindReady, noteFallback } from '../assets/generated/GeneratedAssets';
import { createGoldStarCoinModel } from '../../assets/img2threejs/factories/createCoinStarModel';
import type { PowerUpType } from '../config/powerups.config';
import { getDifficultySpec, type DifficultyLevel } from '../config/difficulty.config';
import { pick } from '../utils/Random';

const PW = GAME_CONFIG.positionWidth;
const COLS = GAME_CONFIG.columns;
const ZOOM = GAME_CONFIG.zoom;
const BOARD = PW * ZOOM * COLS;
/** Extra wide diorama ground width (7200+) so terrain completely covers viewport on any aspect ratio */
const TERRAIN_BOARD = Math.max(BOARD * 4.8, 7200);

export interface WaterAnim {
  mesh: THREE.Object3D;
  base: number;
  off: number;
}

export class WorldGenerator {
  readonly waterAnims: WaterAnim[] = [];
  private consecutiveRoads = 0;
  private readonly terrainMats = WorldTerrainMaterials.get();

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
    powerSpawnChance: number;
    obstacleDensityMul: number;
  } {
    const spec = getDifficultySpec(difficultyLevel);
    const progressionScale = 1.0 + Math.min(lane * 0.006, 0.7);
    const speedMul = world.speedMul * spec.multiplier * progressionScale;
    return {
      speedMul,
      densityBonus: spec.trafficDensityBonus,
      minGapFactor: spec.minGapFactor,
      powerSpawnChance: spec.powerSpawnChance,
      obstacleDensityMul: spec.obstacleDensityMul,
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

  private slab(mat: THREE.Material, h = 3): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.box(`gen-slab:${h}`, TERRAIN_BOARD, PW * ZOOM, h * ZOOM),
      mat,
    );
    m.receiveShadow = true;
    return m;
  }

  /**
   * Builds rich, stylized environment terrain slabs with PBR materials,
   * natural tone variation, micro textures, and world-specific surface treatments.
   */
  private buildTerrain(g: THREE.Group, world: WorldConfig, variant: string | null, laneIndex: number): void {
    // -------------------------------------------------------------
    // BEACH WORLD TERRAIN
    // -------------------------------------------------------------
    if (world.id === 'beach') {
      const d = beachDistrict(laneIndex);
      if (d === 0) {
        // Inland lush tropical grass
        g.add(this.slab(this.terrainMats.getCityGrassMaterial(1), 3));
      } else if (d === 1) {
        // Sun-baked golden dunes
        if (variant === 'boardwalk') {
          const b = new THREE.Mesh(
            this.assets.box('gen-boardwalk', TERRAIN_BOARD, PW * ZOOM, 3.4 * ZOOM),
            this.terrainMats.getWoodPlankMaterial(),
          );
          b.receiveShadow = true;
          g.add(b);
        } else {
          g.add(this.slab(this.terrainMats.getBeachSandMaterial(false), 2.8));
        }
      } else if (d === 2) {
        // Darker wet shoreline sand with water foam edge
        g.add(this.slab(this.terrainMats.getBeachSandMaterial(true), 2.4));
        const waterEdge = new THREE.Mesh(
          this.assets.box('gen-beach-water-edge', TERRAIN_BOARD, PW * ZOOM * 0.45, 1.8 * ZOOM),
          this.terrainMats.getBeachOceanMaterial(),
        );
        waterEdge.position.set(0, (PW * ZOOM) * 0.25, -0.4 * ZOOM);
        waterEdge.receiveShadow = true;
        g.add(waterEdge);
        this.regWater(waterEdge, -0.4 * ZOOM);
      } else if (d === 3) {
        // Crystal turquoise tropical ocean
        const ocean = new THREE.Mesh(
          this.assets.box('gen-beach-ocean', TERRAIN_BOARD, PW * ZOOM, 1.8 * ZOOM),
          this.terrainMats.getBeachOceanMaterial(),
        );
        ocean.position.z = -0.5 * ZOOM;
        ocean.receiveShadow = true;
        g.add(ocean);
        this.regWater(ocean, -0.5 * ZOOM);
      } else {
        g.add(this.slab(this.terrainMats.getBeachSandMaterial(false), 2.8));
      }
      return;
    }

    // -------------------------------------------------------------
    // VOLCANO WORLD TERRAIN
    // -------------------------------------------------------------
    if (world.id === 'volcano') {
      if (variant === 'bridge' || variant === 'lava') {
        const lava = new THREE.Mesh(
          this.assets.box('gen-volcano-lava', TERRAIN_BOARD, PW * ZOOM, 2.0 * ZOOM),
          this.terrainMats.getVolcanoLavaMaterial(),
        );
        lava.position.z = -0.6 * ZOOM;
        lava.receiveShadow = true;
        g.add(lava);
        this.regWater(lava, -0.6 * ZOOM);

        // Industrial heat-resistant steel bridge walkway
        const bridge = new THREE.Mesh(
          this.assets.box('gen-volcano-bridge', TERRAIN_BOARD, PW * ZOOM * 0.88, 3.8 * ZOOM),
          this.assets.standard('volcano-bridge-plate', 0x4a4448, { metalness: 0.8, roughness: 0.35, emissive: 0x220804 }),
        );
        bridge.receiveShadow = true;
        bridge.castShadow = true;
        g.add(bridge);
        return;
      }
      // Cracked basalt obsidian rock crust
      g.add(this.slab(this.terrainMats.getVolcanoRockMaterial(), 3));
      return;
    }

    // -------------------------------------------------------------
    // RIVER WORLD TERRAIN
    // -------------------------------------------------------------
    if (world.id === 'river') {
      if (variant === 'bridge') {
        // Rustic wooden crossing plank walkway with railings
        const bridge = new THREE.Mesh(
          this.assets.box('gen-river-bridge', TERRAIN_BOARD, PW * ZOOM * 0.9, 3.8 * ZOOM),
          this.terrainMats.getWoodPlankMaterial(),
        );
        bridge.receiveShadow = true;
        bridge.castShadow = true;
        g.add(bridge);

        const water = new THREE.Mesh(
          this.assets.box('gen-bridge-water', TERRAIN_BOARD, PW * ZOOM, 1.8 * ZOOM),
          this.terrainMats.getRiverWaterMaterial(),
        );
        water.position.z = -1.5 * ZOOM;
        water.receiveShadow = true;
        g.add(water);
        this.regWater(water, -1.5 * ZOOM);
        return;
      }
      // Grassy riverbank with moss & silt
      g.add(this.slab(this.terrainMats.getRiverBankMaterial(), 3));
      return;
    }

    // -------------------------------------------------------------
    // TOKYO WORLD TERRAIN
    // -------------------------------------------------------------
    if (world.id === 'tokyo') {
      // Modern dark urban sidewalk pavers
      g.add(this.slab(this.terrainMats.getTokyoSidewalkMaterial(), 3));
      // Glowing neon ground trim strip
      const neonStrip = new THREE.Mesh(
        this.assets.box('gen-tokyo-safe-neon', TERRAIN_BOARD, 1.2 * ZOOM, 0.4 * ZOOM),
        this.terrainMats.getTokyoNeonStripMaterial(laneIndex % 2 === 0 ? 0x00e5ff : 0xff007f),
      );
      neonStrip.position.set(0, (PW * ZOOM) / 2 - 0.6 * ZOOM, 1.6 * ZOOM);
      g.add(neonStrip);
      return;
    }

    // -------------------------------------------------------------
    // CITY / GENERAL SAFE FIELD TERRAIN
    // -------------------------------------------------------------
    if (variant === 'boardwalk') {
      const b = new THREE.Mesh(
        this.assets.box('gen-boardwalk', TERRAIN_BOARD, PW * ZOOM, 3.4 * ZOOM),
        this.terrainMats.getWoodPlankMaterial(),
      );
      b.receiveShadow = true;
      g.add(b);
      return;
    }

    // Lush multi-tone park grass with micro-blade noise
    const grassMat = this.terrainMats.getCityGrassMaterial(laneIndex % 3);
    g.add(this.slab(grassMat, 3));
  }

  /**
   * Builds high-quality roads with dark asphalt grain, PBR roughness maps,
   * granite curb edges, solid boundary lines, and crisp painted lane markings.
   */
  private buildRoad(g: THREE.Group, world: WorldConfig, variant: string | null): void {
    // 1. Road Surface Slab
    let roadMat: THREE.Material;
    if (world.id === 'tokyo') {
      roadMat = this.terrainMats.getTokyoRoadMaterial();
    } else if (world.id === 'volcano') {
      roadMat = this.terrainMats.getVolcanoRockMaterial();
    } else if (world.id === 'river') {
      // River water channel
      const water = new THREE.Mesh(
        this.assets.box('gen-river-main-water', TERRAIN_BOARD, PW * ZOOM, 2.2 * ZOOM),
        this.terrainMats.getRiverWaterMaterial(),
      );
      water.position.z = -0.4 * ZOOM;
      water.receiveShadow = true;
      g.add(water);
      this.regWater(water, -0.4 * ZOOM);
      return;
    } else {
      roadMat = this.terrainMats.getCityRoadMaterial();
    }

    g.add(this.slab(roadMat, 2.8));

    // 2. Granite Curbs on Top and Bottom Road Edges
    const curbMat = world.id === 'tokyo'
      ? this.terrainMats.getTokyoSidewalkMaterial()
      : this.terrainMats.getGraniteCurbMaterial(world.walk);

    for (const s of [-1, 1]) {
      const curb = new THREE.Mesh(
        this.assets.box(`road-curb:${world.id}`, TERRAIN_BOARD, 1.8 * ZOOM, 3.4 * ZOOM),
        curbMat,
      );
      curb.position.y = s * ((PW * ZOOM) / 2 - 0.9 * ZOOM);
      curb.position.z = 0.3 * ZOOM;
      curb.receiveShadow = true;
      g.add(curb);

      // Tokyo Cyberpunk: Neon underglow strip running along curbs
      if (world.id === 'tokyo') {
        const neonCurb = new THREE.Mesh(
          this.assets.box('road-curb-neon', TERRAIN_BOARD, 0.8 * ZOOM, 0.4 * ZOOM),
          this.terrainMats.getTokyoNeonStripMaterial(s === 1 ? 0x00e5ff : 0xff007f),
        );
        neonCurb.position.y = s * ((PW * ZOOM) / 2 - 1.6 * ZOOM);
        neonCurb.position.z = 1.55 * ZOOM;
        g.add(neonCurb);
      }
    }

    // 3. Solid Edge Fog Lines (White boundary line inside curbs)
    const lineMat = this.terrainMats.getMarkingMaterial(world.marking, world.id === 'tokyo');
    for (const s of [-1, 1]) {
      const fogLine = new THREE.Mesh(
        this.assets.box('road-fog-line', TERRAIN_BOARD, 0.8 * ZOOM, 0.25 * ZOOM),
        lineMat,
      );
      fogLine.position.y = s * ((PW * ZOOM) / 2 - 2.4 * ZOOM);
      fogLine.position.z = 1.45 * ZOOM;
      fogLine.receiveShadow = true;
      g.add(fogLine);
    }

    // 4. Center Lane Markings
    if (variant === 'intersection' || variant === 'crosswalk') {
      // Bold zebra crosswalk stripes
      for (let x = -BOARD / 2 + 15 * ZOOM; x < BOARD / 2; x += 30 * ZOOM) {
        const stripe = new THREE.Mesh(
          this.assets.box('crosswalk-stripe', 12 * ZOOM, PW * ZOOM * 0.65, 0.4 * ZOOM),
          lineMat,
        );
        stripe.position.set(x, 0, 1.55 * ZOOM);
        stripe.receiveShadow = true;
        g.add(stripe);
      }
    } else if (world.id === 'tokyo' && Math.random() < 0.35) {
      // Tokyo Tram Rail Tracks
      const railMat = this.assets.standard('tokyo-tram-rail', 0xe0e7ff, { metalness: 0.95, roughness: 0.15 });
      for (const ry of [-4 * ZOOM, 4 * ZOOM]) {
        const rail = new THREE.Mesh(
          this.assets.box('tokyo-rail', TERRAIN_BOARD, 1.2 * ZOOM, 0.6 * ZOOM),
          railMat,
        );
        rail.position.set(0, ry, 1.5 * ZOOM);
        rail.receiveShadow = true;
        g.add(rail);
      }
    } else {
      // Standard dashed center lane divider
      for (let x = -BOARD / 2 + 25 * ZOOM; x < BOARD / 2; x += 50 * ZOOM) {
        const dash = new THREE.Mesh(
          this.assets.box('road-dash', 22 * ZOOM, 2.2 * ZOOM, 0.35 * ZOOM),
          lineMat,
        );
        dash.position.set(x, 0, 1.5 * ZOOM);
        dash.receiveShadow = true;
        g.add(dash);
      }
    }
  }

  /**
   * img2threejs powerType → reference-built factory kind.
   */
  private generatedPowerCore(powerType: PowerUpType): THREE.Group | null {
    const KIND: Record<string, string> = {
      shield: 'powerup_shield',
      fire_shield: 'powerup_shield',
      magnet: 'powerup_magnet',
      dash: 'powerup_speed',
      freeze: 'powerup_freeze',
      time_warp: 'powerup_slow_time',
      ghost: 'powerup_ghost',
      double_jump: 'powerup_jump_boost',
      low_gravity: 'powerup_jump_boost',
      coin_mult: 'powerup_double_coins',
    };
    const kind = KIND[powerType];
    if (!kind || !isGeneratedKindReady(kind)) return null;
    const core = buildGeneratedCollectible(kind, 14 * ZOOM);
    if (!core) {
      console.warn(`[collectibles] generated asset "${kind}" failed, using fallback`);
      noteFallback(kind);
      return null;
    }
    if (powerType === 'fire_shield') {
      core.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if ((mesh as THREE.Mesh).isMesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            mesh.material = mat.clone();
            (mesh.material as THREE.MeshStandardMaterial).color.offsetHSL(-0.55, 0.1, 0);
            (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x771100);
          }
        }
      });
    }
    return core;
  }

  /**
   * Returns the high-fidelity 3D Gold Star Coin model.
   * Thick, beveled, polished 24K gold with 3D star medallion.
   */
  makeCoinMesh(): THREE.Group {
    if (isGeneratedKindReady('coin_star')) {
      const generated = buildGeneratedCollectible('coin_star', 16 * ZOOM, true);
      if (generated) return generated;
      console.warn('[collectibles] generated asset "coin_star" failed, using fallback');
      noteFallback('coin_star');
    }
    // Direct pristine 3D coin instantiation
    const model = createGoldStarCoinModel({ castShadow: true, receiveShadow: false });
    model.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(model);
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    const s = (16 * ZOOM) / Math.max(Math.max(size.x, size.y), 1e-4);
    holder.scale.setScalar(s);
    return holder;
  }

  /**
   * World-specific signature 3D collectible items with distinct geometry,
   * smooth rounded surfaces, beveled contours, and premium stylized game art!
   */
  makeCollectibleMesh(worldId: string): THREE.Group {
    const g = new THREE.Group();
    const colDef = activeCollectibleForWorld(worldId);
    const generatedCore = this.generatedPowerCore(colDef.powerType);
    if (generatedCore) {
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
      g.add(generatedCore);
      return g;
    }

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

    return g;
  }

  private pickLaneType(index: number, world: WorldConfig, district: number, difficultyLevel?: DifficultyLevel | string): LaneType {
    if (Math.abs(index - GAME_CONFIG.startLane) <= 1) return 'field';
    if (index <= 4) return 'field';

    const spec = getDifficultySpec(difficultyLevel);
    const maxConsecutive = world.id === 'tokyo' ? (spec.id === 'EASY' ? 1 : 2) : (spec.id === 'EASY' ? 2 : spec.id === 'EXTREME' ? 4 : 3);
    
    if (this.consecutiveRoads >= maxConsecutive) {
      return Math.random() < (spec.id === 'EASY' ? 0.8 : 0.6) ? 'field' : 'forest';
    }

    const r = Math.random();
    let roadW = world.laneMix.road * (spec.id === 'EASY' ? 0.75 : spec.id === 'EXTREME' ? 1.25 : 1.0);
    const forestW = world.laneMix.obst;

    if (world.id === 'tokyo' && this.consecutiveRoads >= 1) {
      roadW *= 0.42;
    }
    if (world.id === 'beach' && district === 0) roadW += 0.08;
    if (world.id === 'beach' && district === 3) roadW = Math.max(0.2, roadW - 0.12);
    if (index > 40 && world.id !== 'tokyo') roadW = Math.min(0.58, roadW + 0.04);

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
    if (!builders || !builders.length) return;
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
        const dif = this.difficultyFor(index, world, opts.difficulty);
        const builders: PropBuilder[] =
          world.id === 'beach' && def.beachObstacles
            ? def.beachObstacles[Math.max(0, Math.min(4, district))]
            : def.obstacles;
        if (!builders || !builders.length) {
          this.laneDecor(lane, def, opts.playerX);
          return lane;
        }
        const occ: Record<number, boolean> = {};
        const jmp: Record<number, boolean> = {};
        const center = Math.floor(COLS / 2);
        const spawnClear = index >= GAME_CONFIG.startLane && index <= GAME_CONFIG.startLane + 3;
        const baseCount = 4 + (Math.random() < 0.4 ? 1 : 0);
        const count = Math.min(COLS - 3, Math.max(2, Math.round(baseCount * dif.obstacleDensityMul)));
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
      const targetCars = Math.max(1, Math.min(6, baseCars + dif.densityBonus));
      const used = new Set<number>();
      const list: THREE.Group[] = [];
      const placed: Array<{ x: number; half: number }> = [];
      const slots = type === 'car' ? 8 : 6;
      let attempts = 0;

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
        const overlaps = placed.some((p) => Math.abs(p.x - px0) < (p.half + ph0 + 40 * ZOOM));
        if (overlaps) continue;
        used.add(slot);
        placed.push({ x: px0, half: ph0 });
        const v = this.vehicles.create(kind);
        v.position.x = px0;
        v.position.z = 0;
        list.push(v);
        lane.mesh.add(v);
      }
      lane.vehicles = list;
      this.enforceLaneSpacing(lane, (world.id === 'tokyo' ? 65 : TRAFFIC_CONFIG.minGap) * dif.minGapFactor);
    }

    // =========================================================================
    // COINS & WORLD SUPERPOWER COLLECTIBLES PIPELINE
    // Intentional placement patterns (single, lines, arcs, crossing rewards)
    // =========================================================================
    const isSafeLane = type === 'field' || type === 'forest';
    const isRoadLane = type === 'car' || type === 'truck';
    const coinChance = isSafeLane ? 0.62 : (isRoadLane ? 0.28 : 0.45);

    const centerCol = Math.floor(COLS / 2);
    const isStartZone = index >= GAME_CONFIG.startLane + 1 && index <= GAME_CONFIG.startLane + 3;

    if (isStartZone || (index > 2 && Math.random() < coinChance)) {
      const dif = this.difficultyFor(index, world, opts.difficulty);
      const r = Math.random();
      const cols: number[] = [];
      const start = isStartZone ? centerCol : Math.floor(Math.random() * COLS);

      if (isStartZone) {
        cols.push(centerCol);
      } else if (isSafeLane) {
        if (r < 0.40 || COLS < 3) {
          // Single coin
          cols.push(start);
        } else if (r < 0.75) {
          // Short line of 2 coins
          cols.push(start, Math.min(COLS - 1, start + 1));
        } else {
          // Rewarding 3-coin cluster/line
          cols.push(Math.max(0, start - 1), start, Math.min(COLS - 1, start + 1));
        }
      } else {
        // Road crossing: single coin in safe gap
        cols.push(start);
      }

      for (const col of cols) {
        if (lane.occupied[col]) continue;
        if (lane.coins.some((c: { col: number }) => c.col === col)) continue;

        // Spawn signature superpower collectible based on difficulty's powerSpawnChance
        const isCollectible = isSafeLane && Math.random() < dif.powerSpawnChance;
        if (isCollectible) {
          const colDef = activeCollectibleForWorld(world.id);
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
    const maxConsecutive = spec.maxConsecutiveRoads;
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
