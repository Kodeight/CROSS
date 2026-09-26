/**
 * PropFactory — World-specific stylized premium 3D props & obstacles:
 * rounded edges, material variations, secondary details,
 * and distinct physical character per environment.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import type { AssetManager } from '../../assets/AssetManager';
import type { TreeFactory } from './TreeFactory';

const ZOOM = GAME_CONFIG.zoom;

export type PropBuilder = (g: THREE.Group) => void;

export class PropFactory {
  constructor(private readonly assets: AssetManager, private readonly trees: TreeFactory) {}

  private mat(color: number, emissive = 0, shininess = 35): THREE.MeshPhongMaterial {
    return this.assets.phong(`prop:${color}:${emissive}:${shininess}`, color, { emissive, shininess });
  }

  private box(
    g: THREE.Group,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    emissive = 0,
    shininess = 35,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.box(`prop:${w}x${h}x${d}`, w * ZOOM, h * ZOOM, d * ZOOM),
      this.mat(color, emissive, shininess),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  private rbox(
    g: THREE.Group,
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
    radius = 1.8,
    emissive = 0,
    shininess = 40,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.roundedBox(w * ZOOM, h * ZOOM, d * ZOOM, radius * ZOOM, 2),
      this.mat(color, emissive, shininess),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  private ball(
    g: THREE.Group,
    r: number,
    color: number,
    x: number,
    y: number,
    z: number,
    emissive = 0,
    shininess = 30,
  ): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.sphere(`prop:${r}:${color}:${emissive}`, r * ZOOM, 10, 8),
      this.mat(color, emissive, shininess),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  // ============================================================
  // CITY OBSTACLES
  // ============================================================
  planter = (g: THREE.Group): void => {
    // Concrete trough with chamfered rim
    this.rbox(g, 18, 12, 8, 0x8a8f99, 0, 0, 4, 1.2);
    // Soil layer
    this.box(g, 16, 10, 2, 0x4a3219, 0, 0, 7.5);
    // Sculpted shrub with flower accents
    this.ball(g, 5.5, 0x4a7c59, 0, 0, 12);
    this.ball(g, 1.4, 0xff4757, 2.5, 2, 16, 0x660000);
    this.ball(g, 1.4, 0xffc93c, -2.5, -2, 16, 0x664400);
  };

  kiosk = (g: THREE.Group): void => {
    // Booth body
    this.rbox(g, 16, 12, 14, 0xd64045, 0, 0, 7, 1.5);
    // Display counter window
    this.box(g, 14, 2, 6, 0x1e2430, 0, 5.2, 8);
    // Overhanging striped awning
    this.rbox(g, 18, 14, 2.5, 0xfff3e0, 0, 0, 15, 1);
    this.box(g, 18, 4, 2.7, 0xd64045, 0, 0, 15);
  };

  hydrant = (g: THREE.Group): void => {
    const redMat = 0xd64045;
    // Central barrel
    const body = new THREE.Mesh(
      this.assets.cylinder('hyd-body', 2.8 * ZOOM, 3.4 * ZOOM, 11 * ZOOM, 10),
      this.mat(redMat, 0, 60),
    );
    body.position.set(0, 0, 5.5 * ZOOM);
    body.castShadow = true;
    g.add(body);
    // Domed operating cap
    this.ball(g, 2.8, redMat, 0, 0, 11);
    this.box(g, 1.8, 1.8, 1.8, 0x747d8c, 0, 0, 14); // Operating pentagon nut
    // Side nozzle outlet caps
    this.box(g, 7.6, 2.2, 2.2, 0xdfe4ea, 0, 0, 7, 0, 80);
  };

  barrier = (g: THREE.Group): void => {
    // Concrete jersey barrier with angled base and hazard diagonal stripes
    this.rbox(g, 22, 6, 9, 0xffc93c, 0, 0, 4.5, 1.2);
    // Black caution stripes
    this.box(g, 4, 6.4, 7, 0x1e2430, -6, 0, 5.5);
    this.box(g, 4, 6.4, 7, 0x1e2430, 6, 0, 5.5);
    // Red reflector markers on top
    this.box(g, 2, 2, 2, 0xff2222, -9, 0, 9.5, 0x880000);
    this.box(g, 2, 2, 2, 0xff2222, 9, 0, 9.5, 0x880000);
  };

  trashCan = (g: THREE.Group): void => {
    // Ribbed stainless municipal can
    const m = new THREE.Mesh(
      this.assets.cylinder('prop-trash', 4.2 * ZOOM, 3.6 * ZOOM, 11 * ZOOM, 12),
      this.mat(0x57606f, 0, 80),
    );
    m.position.set(0, 0, 5.5 * ZOOM);
    m.castShadow = true;
    g.add(m);
    // Domed hood lid with aperture
    this.ball(g, 4.2, 0x2f3542, 0, 0, 11);
  };

  // ============================================================
  // JUNGLE / DESERT / SNOW OBSTACLES
  // ============================================================
  jungleRock = (g: THREE.Group): void => {
    // Mossy tropical boulders
    this.ball(g, 7.5, 0x5b6b55, 0, 0, 4.5);
    this.ball(g, 4.8, 0x708068, 6.5, 3.5, 3.5);
    // Clinging moss patch
    this.ball(g, 3.5, 0x3f9f4f, -3, 3, 7);
  };

  desertRock = (g: THREE.Group): void => {
    // Sun-bleached sandstone rocks
    this.ball(g, 7.5, 0xb89258, 0, 0, 4);
    this.ball(g, 5, 0x9e7943, 6.5, 3.5, 3);
    // Sand dune buildup at base
    this.box(g, 18, 14, 2, 0xdfbe7e, 1, 1, 1);
  };

  snowBank = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.sphere('prop-snowbank', 8.5 * ZOOM, 10, 7), this.mat(0xffffff, 0, 70));
    m.scale.set(1.4, 1.1, 0.55);
    m.position.set(0, 0, 2.5 * ZOOM);
    m.receiveShadow = true;
    g.add(m);
  };

  iceRock = (g: THREE.Group): void => {
    // Translucent blue glacial ice boulder
    this.ball(g, 6.5, 0xbce0fd, 0, 0, 3.5, 0x113355, 90);
    this.ball(g, 4, 0xdcf0ff, 4, 3, 4, 0x112233, 100);
  };

  // ============================================================
  // NEON / CYBERPUNK OBSTACLES
  // ============================================================
  holoPillar = (hue: number) => (g: THREE.Group): void => {
    // Dark metallic structural base
    this.rbox(g, 8, 8, 4, 0x1e2430, 0, 0, 2);
    // Glowing holographic energy column
    this.rbox(g, 5.5, 5.5, 22, hue, 0, 0, 13, 1.2, hue, 100);
    // Floating top emitter cap
    this.rbox(g, 7, 7, 3, 0x1e2430, 0, 0, 24);
  };

  neonSign = (g: THREE.Group): void => {
    // Steel stanchion
    this.box(g, 3, 3, 18, 0x2b2f3d, 0, 0, 9);
    // Vibrant glowing neon sign board
    this.rbox(g, 16, 3, 8, 0xff3fb4, 0, 0, 19, 1.2, 0xff3fb4, 100);
    this.box(g, 12, 3.4, 3, 0x38e1ff, 0, 0, 19, 0x38e1ff, 120);
  };

  glowBarrier = (g: THREE.Group): void => {
    // Heavy base mounts
    this.box(g, 4, 6, 6, 0x1e2430, -9, 0, 3);
    this.box(g, 4, 6, 6, 0x1e2430, 9, 0, 3);
    // Luminescent forcefield rail
    this.rbox(g, 22, 2.5, 6, 0x38e1ff, 0, 0, 6, 1, 0x38e1ff, 110);
  };

  // ============================================================
  // TROPICAL BEACH OBSTACLES
  // ============================================================
  umbrella = (g: THREE.Group): void => {
    // Sand anchor base
    this.box(g, 6, 6, 2, 0xfffdf5, 0, 0, 1);
    // Wooden pole
    const pole = new THREE.Mesh(
      this.assets.cylinder('prop-umb-pole', 1.2 * ZOOM, 1.2 * ZOOM, 18 * ZOOM, 8),
      this.mat(0x8a5f36),
    );
    pole.position.set(0, 0, 9 * ZOOM);
    pole.castShadow = true;
    g.add(pole);

    // Multi-color striped canopy cone
    const top = new THREE.Mesh(
      this.assets.cylinder('prop-umb-top', 0.8 * ZOOM, 13 * ZOOM, 7 * ZOOM, 12),
      this.mat(0xff4757, 0, 50),
    );
    top.position.set(0, 0, 20 * ZOOM);
    top.castShadow = true;
    g.add(top);

    // Contrasting yellow valance rim
    const rim = new THREE.Mesh(
      this.assets.cylinder('prop-umb-rim', 13.2 * ZOOM, 13.2 * ZOOM, 1.5 * ZOOM, 12),
      this.mat(0xffc93c, 0, 60),
    );
    rim.position.set(0, 0, 17 * ZOOM);
    g.add(rim);
  };

  surfboard = (g: THREE.Group): void => {
    // Tapered performance surfboard stuck in the sand
    const b = new THREE.Mesh(this.assets.sphere('prop-surf', 3.4 * ZOOM, 9, 7), this.mat(0x38e1ff, 0, 70));
    b.scale.set(1.1, 0.4, 3.4);
    b.position.set(0, 0, 9 * ZOOM);
    b.rotation.x = 0.38;
    b.castShadow = true;
    g.add(b);

    // Sporty racing center stripe
    const stripe = new THREE.Mesh(this.assets.sphere('prop-surf-stripe', 1.2 * ZOOM, 8, 6), this.mat(0xff4757, 0, 80));
    stripe.scale.set(0.8, 0.45, 3.4);
    stripe.position.set(0, 0, 9 * ZOOM);
    stripe.rotation.x = 0.38;
    g.add(stripe);
  };

  lounger = (g: THREE.Group): void => {
    // White timber frame
    this.rbox(g, 9, 18, 3, 0xfffdf5, 0, 0, 4.5, 1);
    // Striped fabric cushion
    this.box(g, 8.5, 17, 1.8, 0x3f8efc, 0, 0, 6.5);
    // Inclined backrest pillow
    this.box(g, 8.5, 5.5, 3.5, 0xffc93c, 0, -6, 8);
  };

  beachBall = (g: THREE.Group): void => {
    this.ball(g, 4.2, 0xff4757, 0, 0, 4.2, 0, 60);
    this.ball(g, 3.8, 0xffc93c, 1, 1, 4.2, 0, 60);
  };

  towelSet = (g: THREE.Group): void => {
    // Striped beach towel spread on sand
    this.box(g, 11, 15, 0.8, 0x3f8efc, 0, 0, 0.8);
    this.box(g, 6, 15, 0.9, 0xffffff, 0, 0, 0.85);
    // Sunscreen bottle & sunglasses
    this.box(g, 2.5, 4, 3, 0xffc93c, 3, -4, 2.5);
  };

  dune = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.sphere('prop-dune', 11 * ZOOM, 10, 7), this.mat(0xe3c886, 0, 8));
    m.scale.set(1.5, 1.1, 0.4);
    m.position.set(0, 0, 1.5 * ZOOM);
    m.receiveShadow = true;
    g.add(m);
  };

  tuft = (g: THREE.Group): void => {
    this.box(g, 2, 2, 7, 0x4a7c59, -2, 0, 3.5);
    this.box(g, 2, 2, 6, 0x5da53a, 2, 1, 3);
  };

  pierPost = (g: THREE.Group): void => {
    // Heavy wooden harbor piling
    const m = new THREE.Mesh(
      this.assets.cylinder('prop-pier', 2.6 * ZOOM, 2.8 * ZOOM, 16 * ZOOM, 8),
      this.mat(0x5a3e22, 0, 15),
    );
    m.position.set(0, 0, 5 * ZOOM);
    m.castShadow = true;
    g.add(m);
    // Iron mooring ring
    this.box(g, 6.2, 6.2, 1.8, 0x2f3542, 0, 0, 11);
  };

  beachSign = (g: THREE.Group): void => {
    this.box(g, 2.5, 2.5, 14, 0x8a5f36, 0, 0, 7);
    this.rbox(g, 15, 1.5, 7, 0xfffdf5, 0, 0, 14, 1);
    this.box(g, 11, 1.8, 2, 0x3f8efc, 0, 0, 14);
  };

  lifeguard = (g: THREE.Group): void => {
    // Elevated timber lifeguard stand
    this.rbox(g, 11, 11, 5, 0xd64045, 0, 0, 15, 1.2);
    this.box(g, 13, 13, 2, 0xfffdf5, 0, 0, 18);
    // 4 Support timber stilts
    for (const sx of [-4.5, 4.5]) {
      for (const sy of [-4.5, 4.5]) {
        this.box(g, 2, 2, 14, 0x8a5f36, sx, sy, 7);
      }
    }
  };

  volleyball = (g: THREE.Group): void => {
    for (const px of [-15, 15]) this.box(g, 2, 2, 19, 0x8a5f36, px, 0, 9.5);
    this.box(g, 32, 1, 7, 0xffffff, 0, 0, 16);
  };

  boat = (g: THREE.Group): void => {
    this.rbox(g, 24, 11, 7, 0xffffff, 0, 0, 4.5, 2);
    this.box(g, 2.5, 2.5, 13, 0x8a5f36, 0, 0, 12);
    this.box(g, 11, 1, 9, 0x38e1ff, 3, 0, 14);
  };

  buoy = (g: THREE.Group): void => {
    // Red marine mooring buoy with beacon
    this.ball(g, 4.2, 0xff4757, 0, 0, 4.2, 0, 70);
    this.box(g, 1.5, 1.5, 5, 0x1e2430, 0, 0, 8.5);
    this.ball(g, 1.2, 0xfff6b0, 0, 0, 11.5, 0xaa8800);
  };

  beachHut = (g: THREE.Group): void => {
    // Bamboo/wood cabin walls
    this.rbox(g, 17, 13, 11, 0x8a5f36, 0, 0, 5.5, 1.5);
    // Overhanging palm thatched roof
    this.rbox(g, 20, 16, 3.5, 0xd4a373, 0, 0, 12, 1.5);
    this.box(g, 6, 1, 7, 0x1e2430, 0, 6.7, 4.5); // Open door
  };

  beachBarrier = (g: THREE.Group): void => {
    this.box(g, 25, 2.5, 6, 0xfffdf5, 0, 0, 5);
  };

  // ============================================================
  // DECOR (OUTER SLABS)
  // ============================================================
  lamp = (g: THREE.Group): void => {
    // Heavy cast iron base
    this.box(g, 4, 4, 4, 0x2f3542, 0, 0, 2);
    // Stately lamppost column
    const pole = new THREE.Mesh(
      this.assets.cylinder('prop-lamp-pole', 1.2 * ZOOM, 1.8 * ZOOM, 20 * ZOOM, 8),
      this.mat(0x2f3542, 0, 60),
    );
    pole.position.set(0, 0, 12 * ZOOM);
    pole.castShadow = true;
    g.add(pole);
    // Warm glowing lantern head
    this.rbox(g, 6.5, 4, 4.5, 0xfff6b0, 0, 0, 23.5, 1, 0xaa8800, 100);
    this.box(g, 7.5, 5, 1.5, 0x1e2430, 0, 0, 26); // Lantern cap
  };

  bench = (g: THREE.Group): void => {
    // Cast iron frame legs
    this.box(g, 3, 6, 5, 0x2f3542, -6, 0, 2.5);
    this.box(g, 3, 6, 5, 0x2f3542, 6, 0, 2.5);
    // Wooden slats for seat & backrest
    this.rbox(g, 17, 6, 1.8, 0x8a5f36, 0, 0, 5.5, 0.8);
    this.rbox(g, 17, 1.8, 6, 0x8a5f36, 0, -3.2, 8.5, 0.8);
  };

  crossSign = (g: THREE.Group): void => {
    this.box(g, 2.5, 2.5, 16, 0x747d8c, 0, 0, 8);
    // Diamond yellow warning pedestrian cross sign
    const sign = this.rbox(g, 9, 1.5, 9, 0xffc93c, 0, 0, 18, 1.2);
    sign.rotation.y = Math.PI / 4;
  };

  // ============================================================
  // VOLCANO / INDUSTRIAL / TEMPLE / NEW WORLDS PROPS
  // ============================================================
  magmaRock = (g: THREE.Group): void => {
    // Jagged basalt boulder
    this.ball(g, 7.5, 0x221310, 0, 0, 4.5);
    // Molten glowing lava fissure
    this.ball(g, 4.5, 0xff4757, 5, 2, 3.5, 0xaa2200, 70);
    this.ball(g, 2.5, 0xffa502, 2, -3, 6, 0xff4400, 80);
  };

  obsidianSpire = (g: THREE.Group): void => {
    // Sharp faceted black obsidian shard
    this.rbox(g, 6.5, 6.5, 22, 0x180f0c, 0, 0, 11, 1.5, 0, 90);
    // Crimson core glow
    this.box(g, 4.5, 4.5, 10, 0xff4757, 0, 0, 19, 0x880000, 80);
  };

  glowMushroom = (g: THREE.Group): void => {
    // Fairy mushroom cluster
    this.box(g, 3.2, 3.2, 11, 0xf1f2f6, 0, 0, 5.5);
    this.ball(g, 6.5, 0x2ed573, 0, 0, 13, 0x005522, 70);
    // Secondary tiny mushroom
    this.box(g, 2, 2, 6, 0xf1f2f6, 4, 3, 3);
    this.ball(g, 3.5, 0xa55eea, 4, 3, 7.5, 0x330055, 70);
  };

  magicRoot = (g: THREE.Group): void => {
    this.rbox(g, 18, 5, 7, 0x3d2714, 0, 0, 3.5, 1.5);
    this.ball(g, 3.5, 0x7bed9f, 4.5, 0, 7, 0x115522, 80);
  };

  barrelStack = (g: THREE.Group): void => {
    // Industrial steel chemical drums with reinforcement ribs
    const drum1 = new THREE.Mesh(
      this.assets.cylinder('prop-drum1', 4.8 * ZOOM, 4.8 * ZOOM, 11 * ZOOM, 12),
      this.mat(0xffa502, 0, 70),
    );
    drum1.position.set(-3.5 * ZOOM, 0, 5.5 * ZOOM);
    drum1.castShadow = true;
    g.add(drum1);

    const drum2 = new THREE.Mesh(
      this.assets.cylinder('prop-drum2', 4.8 * ZOOM, 4.8 * ZOOM, 11 * ZOOM, 12),
      this.mat(0x747d8c, 0, 70),
    );
    drum2.position.set(4.5 * ZOOM, 0, 5.5 * ZOOM);
    drum2.castShadow = true;
    g.add(drum2);

    // Hazard stripes
    this.box(g, 5, 9.8, 2, 0x1e2430, -3.5, 0, 5.5);
  };

  pipeSection = (g: THREE.Group): void => {
    // High-pressure industrial pipe with flange joints
    const pipe = new THREE.Mesh(
      this.assets.cylinder('prop-pipe', 3.5 * ZOOM, 3.5 * ZOOM, 20 * ZOOM, 10),
      this.mat(0x57606f, 0, 70),
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 0, 6 * ZOOM);
    pipe.castShadow = true;
    g.add(pipe);

    // Red valve wheel
    this.ball(g, 3.2, 0xff4757, 5, 0, 11, 0, 60);
    this.box(g, 1.8, 1.8, 4, 0xdfe4ea, 5, 0, 8.5);
  };

  ancientPillar = (g: THREE.Group): void => {
    // Classical fluted column with pedestal plinth and capital
    this.box(g, 10, 10, 4, 0x6e5f4d, 0, 0, 2);
    const col = new THREE.Mesh(
      this.assets.cylinder('prop-temple-col', 3.6 * ZOOM, 4.2 * ZOOM, 20 * ZOOM, 10),
      this.mat(0x8c7b65, 0, 20),
    );
    col.position.set(0, 0, 13 * ZOOM);
    col.castShadow = true;
    g.add(col);
    this.box(g, 11, 11, 4, 0x6e5f4d, 0, 0, 24);
  };

  stoneRelic = (g: THREE.Group): void => {
    // Carved ancient altar pedestal
    this.rbox(g, 11, 11, 9, 0x6e5f4d, 0, 0, 4.5, 1.5);
    // Glowing floating mystic relic gem
    this.ball(g, 4.5, 0xbe2edd, 0, 0, 12, 0x660088, 100);
  };

  signalLight = (g: THREE.Group): void => {
    this.box(g, 2.5, 2.5, 24, 0x2f3542, 0, 0, 12);
    this.rbox(g, 7, 5, 12, 0x1e2430, 0, 0, 22, 1.5);
    this.ball(g, 2.2, 0xff4757, 0, 2.6, 25, 0xaa0000);
    this.ball(g, 2.2, 0x2ed573, 0, 2.6, 19, 0x00aa22);
  };

  hayBale = (g: THREE.Group): void => {
    this.rbox(g, 15, 11, 9, 0xf6b93b, 0, 0, 4.5, 1.8);
    this.rbox(g, 13, 9, 8, 0xeccc68, 0, 0, 12.5, 1.5);
  };

  peakRock = (g: THREE.Group): void => {
    this.rbox(g, 13, 11, 15, 0x4a7f93, 0, 0, 7.5, 2);
    this.rbox(g, 9, 9, 5, 0xdff9fb, 0, 0, 16.5, 1.5);
  };

  bannerPillar = (g: THREE.Group): void => {
    this.box(g, 6, 6, 22, 0x535c68, 0, 0, 11);
    this.box(g, 1.2, 9, 13, 0xff4757, 4.5, 0, 17);
  };

  rumBarrel = (g: THREE.Group): void => {
    const barrel = new THREE.Mesh(
      this.assets.cylinder('prop-rum', 4.5 * ZOOM, 4.2 * ZOOM, 12 * ZOOM, 10),
      this.mat(0x6e4e2e, 0, 20),
    );
    barrel.position.set(0, 0, 6 * ZOOM);
    barrel.castShadow = true;
    g.add(barrel);
    this.box(g, 9.6, 9.6, 1.8, 0x2f3542, 0, 0, 6);
  };

  giantCoral = (g: THREE.Group): void => {
    this.rbox(g, 5, 5, 18, 0xff4757, 0, 0, 9, 1.5, 0x440011);
    this.rbox(g, 9, 5, 5, 0xff6b81, 2.5, 0, 15, 1.5, 0x440022);
  };

  craterRock = (g: THREE.Group): void => {
    this.ball(g, 7.5, 0x576574, 0, 0, 3.5);
    this.ball(g, 3.5, 0xced6e0, 4.5, 3.5, 2.5);
  };

  aetherObelisk = (g: THREE.Group): void => {
    this.rbox(g, 6.5, 6.5, 25, 0x70a1ff, 0, 0, 12.5, 1.5, 0x113377);
    this.ball(g, 3.5, 0xffffff, 0, 0, 27, 0x336699);
  };

  alienTentacle = (g: THREE.Group): void => {
    this.rbox(g, 5.5, 5.5, 20, 0xa55eea, 0, 0, 10, 1.5, 0x381768);
    this.ball(g, 4.5, 0xff9ff3, 0, 0, 21, 0x662255);
  };

  plasmaGeode = (g: THREE.Group): void => {
    this.rbox(g, 11, 11, 9, 0x2b1240, 0, 0, 4.5, 2);
    this.ball(g, 5.5, 0x00f0ff, 0, 0, 11, 0x006688);
  };

  obstacleSets(): Record<string, PropBuilder[]> {
    const t = this.trees;
    return {
      city: [this.planter, this.kiosk, this.hydrant, this.barrier, (g) => t.streetTree(g), this.trashCan],
      jungle: [(g) => t.bigLeaf(g), (g) => t.vineTree(g), this.jungleRock, (g) => t.bush(g)],
      desert: [(g) => t.cactus(g), this.desertRock, (g) => t.deadBush(g)],
      snow: [(g) => t.pine(g, true), this.snowBank, this.iceRock, (g) => t.pine(g, false)],
      neon: [this.holoPillar(0x38e1ff), this.holoPillar(0xff3fb4), this.neonSign, this.glowBarrier],
      beach: [(g) => t.palm(g), this.umbrella, this.surfboard],
      volcano: [this.magmaRock, this.obsidianSpire, (g) => t.magmaSpire(g)],
      forest: [this.glowMushroom, this.magicRoot, (g) => t.glowMushroomTree(g)],
      industrial: [this.barrelStack, this.pipeSection, this.barrier],
      temple: [this.ancientPillar, this.stoneRelic, this.ancientPillar],
      flooded: [this.buoy, this.pierPost, this.boat],
      railway: [this.signalLight, this.barrier, this.trashCan],
      countryside: [this.hayBale, (g) => t.bush(g), this.hayBale],
      mountain: [this.peakRock, (g) => t.pine(g, true), this.peakRock],
      fantasy: [this.bannerPillar, (g) => t.pine(g, false), this.bannerPillar],
      pirate: [this.rumBarrel, this.pierPost, this.boat],
      ocean: [this.giantCoral, this.buoy, this.giantCoral],
      moon: [this.craterRock, this.holoPillar(0xced6e0), this.craterRock],
      sky: [this.aetherObelisk, (g) => t.streetTree(g), this.aetherObelisk],
      alien: [this.alienTentacle, this.plasmaGeode, this.holoPillar(0xa55eea)],
    };
  }

  beachDistrictObstacles(): PropBuilder[][] {
    const t = this.trees;
    return [
      [this.trashCan, this.beachSign, this.umbrella, this.beachBarrier],
      [this.umbrella, this.lounger, this.towelSet, this.surfboard],
      [(g) => t.palm(g), this.umbrella, this.beachBall, this.towelSet, this.dune, this.tuft, this.lifeguard],
      [this.pierPost, this.boat, this.buoy, this.beachSign],
      [this.beachHut, this.lounger, this.boat, this.surfboard, this.trashCan],
    ];
  }
}
