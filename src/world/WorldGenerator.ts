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
/** Extra wide diorama ground width (6500+) so terrain completely covers viewport on any aspect ratio */
const TERRAIN_BOARD = Math.max(BOARD * 4.5, 6800);

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

  private slab(color: number, h = 3): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.box(`gen-slab:${h}`, TERRAIN_BOARD, PW * ZOOM, h * ZOOM),
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
        this.assets.box('gen-bridge', TERRAIN_BOARD, PW * ZOOM * 0.9, 4 * ZOOM),
        this.assets.standard('bridge-wood', 0x5a3d28, { roughness: 0.8 }),
      );
      plank.receiveShadow = true;
      plank.castShadow = true;
      g.add(plank);
      const water = new THREE.Mesh(
        this.assets.box('bridge-water', TERRAIN_BOARD, PW * ZOOM, 1.5 * ZOOM),
        this.mat(world.id === 'volcano' ? 0xff3811 : 0x2d68c4, 60),
      );
      water.position.z = -2.5 * ZOOM;
      g.add(water);
      this.regWater(water, -2.5 * ZOOM);
      return;
    }

    if (variant === 'boardwalk') {
      const b = new THREE.Mesh(
        this.assets.box('gen-boardwalk', TERRAIN_BOARD, PW * ZOOM, 3.5 * ZOOM),
        this.assets.standard('boardwalk-wood', 0xc2a679, { roughness: 0.7 }),
      );
      b.receiveShadow = true;
      g.add(b);
      return;
    }

    if (variant === 'ice') {
      const ice = new THREE.Mesh(
        this.assets.box('gen-ice', TERRAIN_BOARD, PW * ZOOM, 2.5 * ZOOM),
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

    // Sidewalk curb edges spanning full terrain width
    for (const s of [-1, 1]) {
      const curb = new THREE.Mesh(
        this.assets.box(`road-curb:${world.id}`, TERRAIN_BOARD, 1.8 * ZOOM, 3.4 * ZOOM),
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
   * smooth rounded surfaces, beveled contours, and premium stylized game art!
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

    const powerType = colDef.powerType;

    if (powerType === 'shield' || powerType === 'fire_shield') {
      // --- PREMIUM 3D SHIELD COLLECTIBLE ---
      // Smooth heraldic heater shield with dimensional beveled rim, vibrant plate, and golden emblem crest
      const shieldGroup = new THREE.Group();

      const shieldShape = new THREE.Shape();
      const sw = 6.2 * ZOOM;
      const sh = 7.5 * ZOOM;
      shieldShape.moveTo(-sw, sh);
      shieldShape.lineTo(sw, sh);
      shieldShape.quadraticCurveTo(sw * 1.05, 0, 0, -sh * 1.15);
      shieldShape.quadraticCurveTo(-sw * 1.05, 0, -sw, sh);

      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
        depth: 1.4 * ZOOM,
        bevelEnabled: true,
        bevelThickness: 1.1 * ZOOM,
        bevelSize: 1.0 * ZOOM,
        bevelSegments: 3,
      });
      shieldGeo.computeVertexNormals();

      const shieldMat = this.assets.standard(
        `col-shield-plate:${worldId}`,
        colDef.color,
        { metalness: 0.45, roughness: 0.2, emissive: colDef.emissive },
      );
      const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      shieldMesh.castShadow = true;
      shieldGroup.add(shieldMesh);

      // Golden raised heraldic rim/border
      const rimMat = this.assets.standard('col-gold-rim', 0xffd700, {
        metalness: 0.9,
        roughness: 0.18,
        emissive: 0x442a00,
      });

      // Central dimensional golden crest cross / star
      const crossH = new THREE.Mesh(
        this.assets.box('col-shield-cross-h', 6 * ZOOM, 1.8 * ZOOM, 2.2 * ZOOM),
        rimMat,
      );
      crossH.position.set(0, 1 * ZOOM, 1.4 * ZOOM);
      crossH.castShadow = true;
      shieldGroup.add(crossH);

      const crossV = new THREE.Mesh(
        this.assets.box('col-shield-cross-v', 1.8 * ZOOM, 8 * ZOOM, 2.2 * ZOOM),
        rimMat,
      );
      crossV.position.set(0, 1 * ZOOM, 1.4 * ZOOM);
      crossV.castShadow = true;
      shieldGroup.add(crossV);

      // Central glowing power diamond gem
      const gem = new THREE.Mesh(
        this.assets.sphere(`col-shield-gem:${worldId}`, 2.2 * ZOOM, 8, 6),
        this.assets.standard(`col-shield-gem-mat:${worldId}`, colDef.glowColor, {
          metalness: 0.95,
          roughness: 0.1,
          emissive: colDef.glowColor,
        }),
      );
      gem.position.set(0, 1 * ZOOM, 2.5 * ZOOM);
      shieldGroup.add(gem);

      shieldGroup.rotation.x = Math.PI / 8; // Slanted upright angle
      g.add(shieldGroup);

    } else if (powerType === 'magnet') {
      // --- PREMIUM 3D COIN MAGNET COLLECTIBLE ---
      // Authentic curved horseshoe magnet with red enamel, chrome tips, and floating golden coin
      const magnetGroup = new THREE.Group();

      // Curved U-arch body
      const arch = new THREE.Mesh(
        this.assets.torus('col-magnet-arch', 6.5 * ZOOM, 2.0 * ZOOM, 14, 24),
        this.assets.standard('col-magnet-body', 0xe74c3c, {
          metalness: 0.35,
          roughness: 0.18,
          emissive: 0x330805,
        }),
      );
      arch.rotation.x = Math.PI / 2;
      magnetGroup.add(arch);

      // Twin straight legs
      const legMat = this.assets.standard('col-magnet-body', 0xe74c3c, {
        metalness: 0.35,
        roughness: 0.18,
        emissive: 0x330805,
      });
      const chromeMat = this.assets.standard('col-magnet-chrome', 0xf1f2f6, {
        metalness: 0.95,
        roughness: 0.12,
        emissive: 0x333333,
      });

      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(
          this.assets.cylinder('col-magnet-leg', 2.0 * ZOOM, 2.0 * ZOOM, 5 * ZOOM, 14),
          legMat,
        );
        leg.position.set(s * 6.5 * ZOOM, -2.5 * ZOOM, 0);
        leg.rotation.x = Math.PI / 2;
        leg.castShadow = true;
        magnetGroup.add(leg);

        // Metallic silver pole tip
        const poleTip = new THREE.Mesh(
          this.assets.cylinder('col-magnet-pole', 2.1 * ZOOM, 2.1 * ZOOM, 2.5 * ZOOM, 14),
          chromeMat,
        );
        poleTip.position.set(s * 6.5 * ZOOM, -5.5 * ZOOM, 0);
        poleTip.rotation.x = Math.PI / 2;
        poleTip.castShadow = true;
        magnetGroup.add(poleTip);
      }

      // Floating golden mini-coin magnetically levitating between the poles
      const levCoin = new THREE.Mesh(
        this.assets.cylinder('col-magnet-coin', 3.2 * ZOOM, 3.2 * ZOOM, 1.2 * ZOOM, 16),
        this.assets.standard('col-magnet-gold', 0xffd700, {
          metalness: 0.95,
          roughness: 0.15,
          emissive: 0x553300,
        }),
      );
      levCoin.position.set(0, -5.5 * ZOOM, 0);
      levCoin.rotation.x = Math.PI / 4;
      magnetGroup.add(levCoin);

      magnetGroup.rotation.x = -Math.PI / 4;
      g.add(magnetGroup);

    } else if (powerType === 'dash') {
      // --- PREMIUM 3D SONIC DASH SPEED POD ---
      // Aerodynamic glowing energy capsule with twin orbital speed rings & forward chevron
      const dashGroup = new THREE.Group();

      const core = new THREE.Mesh(
        this.assets.sphere(`col-dash-core:${worldId}`, 5.5 * ZOOM, 16, 12),
        this.assets.standard(`col-dash-core-mat:${worldId}`, colDef.color, {
          metalness: 0.85,
          roughness: 0.12,
          emissive: colDef.glowColor,
        }),
      );
      core.scale.set(1, 1.4, 0.9);
      core.castShadow = true;
      dashGroup.add(core);

      // Orbital high-velocity warp rings
      const ring1 = new THREE.Mesh(
        this.assets.torus('col-dash-ring1', 8.2 * ZOOM, 1.1 * ZOOM, 10, 24),
        this.assets.standard('col-dash-ring-mat', 0xffa502, {
          metalness: 0.9,
          roughness: 0.15,
          emissive: 0xffa502,
        }),
      );
      ring1.rotation.x = Math.PI / 3;
      dashGroup.add(ring1);

      const ring2 = new THREE.Mesh(
        this.assets.torus('col-dash-ring2', 7.0 * ZOOM, 0.9 * ZOOM, 8, 20),
        this.assets.standard('col-dash-ring-cyan', 0x38e1ff, {
          metalness: 0.95,
          roughness: 0.1,
          emissive: 0x00f0ff,
        }),
      );
      ring2.rotation.y = Math.PI / 3;
      dashGroup.add(ring2);

      g.add(dashGroup);

    } else if (powerType === 'freeze') {
      // --- PREMIUM 3D FROST FREEZE PERMAFROST PRISM ---
      // Multi-faceted crystalline snowflake with beveled surfaces & floating frost shards
      const freezeGroup = new THREE.Group();

      const prism = new THREE.Mesh(
        this.assets.sphere('col-freeze-octa', 6.5 * ZOOM, 8, 6),
        this.assets.standard('col-freeze-ice', 0xa8d8ea, {
          metalness: 0.3,
          roughness: 0.08,
          emissive: 0x004466,
        }),
      );
      prism.scale.set(1, 1, 1.6);
      prism.castShadow = true;
      freezeGroup.add(prism);

      // Glowing frost core
      const frostCore = new THREE.Mesh(
        this.assets.sphere('col-freeze-core', 3.5 * ZOOM, 8, 6),
        this.assets.standard('col-freeze-core-mat', 0xdff9fb, {
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0x38e1ff,
        }),
      );
      freezeGroup.add(frostCore);

      // 4 orbital satellite ice needles
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const shard = new THREE.Mesh(
          this.assets.sphere(`col-ice-shard:${i}`, 1.8 * ZOOM, 6, 4),
          this.assets.standard('col-freeze-ice', 0xa8d8ea, { metalness: 0.3, roughness: 0.08, emissive: 0x004466 }),
        );
        shard.position.set(Math.cos(a) * 8.5 * ZOOM, Math.sin(a) * 8.5 * ZOOM, 0);
        shard.scale.set(1, 1, 2);
        freezeGroup.add(shard);
      }

      g.add(freezeGroup);

    } else if (powerType === 'ghost') {
      // --- PREMIUM 3D PHASE GHOST SPIRIT ORB ---
      // Spectral translucent wisp with glowing ethereal wisp star
      const ghostGroup = new THREE.Group();

      const wisp = new THREE.Mesh(
        this.assets.sphere('col-ghost-outer', 6.5 * ZOOM, 16, 12),
        this.assets.standard('col-ghost-outer-mat', colDef.color, {
          metalness: 0.2,
          roughness: 0.1,
          emissive: colDef.glowColor,
        }),
      );
      wisp.scale.set(0.9, 1.1, 1.3);
      wisp.castShadow = true;
      ghostGroup.add(wisp);

      const auraTorus = new THREE.Mesh(
        this.assets.torus('col-ghost-torus', 8 * ZOOM, 1.0 * ZOOM, 10, 24),
        this.assets.standard('col-ghost-torus-mat', colDef.glowColor, {
          metalness: 0.8,
          roughness: 0.2,
          emissive: colDef.glowColor,
        }),
      );
      auraTorus.rotation.x = Math.PI / 4;
      ghostGroup.add(auraTorus);

      g.add(ghostGroup);

    } else if (powerType === 'time_warp') {
      // --- PREMIUM 3D QUANTUM CHRONOMETER GYROSCOPE ---
      // Twin golden gimbal rings orbiting around a radiant pulsing chrono-sphere
      const timeGroup = new THREE.Group();

      const chronoSphere = new THREE.Mesh(
        this.assets.sphere('col-time-sphere', 4.5 * ZOOM, 14, 10),
        this.assets.standard('col-time-sphere-mat', colDef.color, {
          metalness: 0.8,
          roughness: 0.15,
          emissive: colDef.glowColor,
        }),
      );
      timeGroup.add(chronoSphere);

      const ringOuter = new THREE.Mesh(
        this.assets.torus('col-time-ring-outer', 8.2 * ZOOM, 1.1 * ZOOM, 10, 28),
        this.assets.standard('col-time-brass', 0xffd700, {
          metalness: 0.9,
          roughness: 0.2,
          emissive: 0x443300,
        }),
      );
      ringOuter.rotation.x = Math.PI / 3;
      timeGroup.add(ringOuter);

      const ringInner = new THREE.Mesh(
        this.assets.torus('col-time-ring-inner', 6.2 * ZOOM, 0.9 * ZOOM, 8, 22),
        this.assets.standard('col-time-magenta', 0xff3fb4, {
          metalness: 0.85,
          roughness: 0.15,
          emissive: 0xff3fb4,
        }),
      );
      ringInner.rotation.y = Math.PI / 3;
      timeGroup.add(ringInner);

      g.add(timeGroup);

    } else {
      // --- PREMIUM 3D WINGED DOUBLE HOP SPHERE ---
      // Glowing sphere flanked by stylized golden wings
      const jumpGroup = new THREE.Group();

      const jumpCore = new THREE.Mesh(
        this.assets.sphere(`col-jump-core:${worldId}`, 5.5 * ZOOM, 16, 12),
        this.assets.standard(`col-jump-core-mat:${worldId}`, colDef.color, {
          metalness: 0.6,
          roughness: 0.2,
          emissive: colDef.glowColor,
        }),
      );
      jumpCore.castShadow = true;
      jumpGroup.add(jumpCore);

      const wingMat = this.assets.standard('col-jump-wing', 0xffffff, {
        metalness: 0.3,
        roughness: 0.2,
        emissive: 0x444444,
      });

      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(
          this.assets.roundedBox(5 * ZOOM, 2.5 * ZOOM, 1.5 * ZOOM, 0.6 * ZOOM, 2),
          wingMat,
        );
        wing.position.set(s * 6.5 * ZOOM, 1.5 * ZOOM, 0);
        wing.rotation.z = s * 0.35;
        jumpGroup.add(wing);
      }

      g.add(jumpGroup);
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
        const dif = this.difficultyFor(index, world, opts.difficulty);
        const builders: PropBuilder[] =
          world.id === 'beach' && def.beachObstacles
            ? def.beachObstacles[Math.max(0, Math.min(4, district))]
            : def.obstacles;
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
      const dif = this.difficultyFor(index, world, opts.difficulty);
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

        // Spawn signature superpower collectible based on difficulty's powerSpawnChance
        const isCollectible = Math.random() < dif.powerSpawnChance;
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
