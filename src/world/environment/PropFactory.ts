/**
 * Small props: obstacles (block tiles) + decor (outer slabs only).
 * Beach-district composition tables live here.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import type { AssetManager } from '../../assets/AssetManager';
import type { TreeFactory } from './TreeFactory';

const ZOOM = GAME_CONFIG.zoom;

export type PropBuilder = (g: THREE.Group) => void;

export class PropFactory {
  constructor(private readonly assets: AssetManager, private readonly trees: TreeFactory) {}

  private mat(color: number, emissive = 0, shininess = 30): THREE.MeshPhongMaterial {
    return this.assets.phong(`prop:${color}:${emissive}`, color, { emissive, shininess });
  }

  private box(g: THREE.Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number, emissive = 0): void {
    const m = new THREE.Mesh(this.assets.box(`prop:${w}x${h}x${d}`, w * ZOOM, h * ZOOM, d * ZOOM), this.mat(color, emissive));
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }

  private ball(g: THREE.Group, r: number, color: number, x: number, y: number, z: number, emissive = 0): void {
    const m = new THREE.Mesh(this.assets.sphere(`prop:${r}:${color}`, r * ZOOM, 9, 7), this.mat(color, emissive));
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    g.add(m);
  }

  // ---- city obstacles ----
  planter = (g: THREE.Group): void => {
    this.box(g, 16, 10, 8, 0x8a8f99, 0, 0, 4);
    this.ball(g, 5, 0x4a7c59, 0, 0, 11);
  };
  kiosk = (g: THREE.Group): void => {
    this.box(g, 14, 10, 12, 0xd64045, 0, 0, 6);
    this.box(g, 16, 12, 2, 0xfff3e0, 0, 0, 13);
  };
  hydrant = (g: THREE.Group): void => {
    this.box(g, 5, 5, 9, 0xd64045, 0, 0, 4.5);
    this.ball(g, 2.5, 0xd64045, 0, 0, 10);
  };
  barrier = (g: THREE.Group): void => {
    this.box(g, 20, 3, 8, 0xffc93c, 0, 0, 6);
    this.box(g, 3, 3, 6, 0x8a8f99, -8, 0, 3);
    this.box(g, 3, 3, 6, 0x8a8f99, 8, 0, 3);
  };
  trashCan = (g: THREE.Group): void => {
    const m = new THREE.Mesh(
      this.assets.cylinder('prop-trash', 4 * ZOOM, 3.4 * ZOOM, 10 * ZOOM, 9),
      this.mat(0x5b6570, 0, 70),
    );
    m.position.set(0, 0, 5 * ZOOM);
    m.castShadow = true;
    g.add(m);
  };

  // ---- jungle / desert / snow ----
  jungleRock = (g: THREE.Group): void => {
    this.ball(g, 7, 0x6b7a65, 0, 0, 4);
    this.ball(g, 4, 0x7d8c77, 6, 3, 3);
  };
  desertRock = (g: THREE.Group): void => {
    this.ball(g, 7, 0xb08b52, 0, 0, 3);
    this.ball(g, 4, 0x9a7443, 6, 3, 2);
  };
  snowBank = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.sphere('prop-snowbank', 8 * ZOOM, 9, 6), this.mat(0xffffff, 0, 60));
    m.scale.set(1.3, 1, 0.45);
    m.position.set(0, 0, 2 * ZOOM);
    m.receiveShadow = true;
    g.add(m);
  };
  iceRock = (g: THREE.Group): void => {
    this.ball(g, 6, 0xbcd8ee, 0, 0, 3);
  };

  // ---- neon ----
  holoPillar = (hue: number) => (g: THREE.Group): void => {
    this.box(g, 6, 6, 22, hue, 0, 0, 11, hue);
  };
  neonSign = (g: THREE.Group): void => {
    this.box(g, 3, 3, 16, 0x2b2f3d, 0, 0, 8);
    this.box(g, 14, 2, 6, 0xff3fb4, 0, 0, 17, 0xff3fb4);
  };
  glowBarrier = (g: THREE.Group): void => {
    this.box(g, 20, 2, 6, 0x38e1ff, 0, 0, 5, 0x38e1ff);
  };

  // ---- beach ----
  umbrella = (g: THREE.Group): void => {
    const pole = new THREE.Mesh(
      this.assets.cylinder('prop-umb-pole', 1 * ZOOM, 1 * ZOOM, 16 * ZOOM, 7),
      this.mat(0x8a5f36),
    );
    pole.position.set(0, 0, 8 * ZOOM);
    pole.castShadow = true;
    g.add(pole);
    const top = new THREE.Mesh(
      this.assets.cylinder('prop-umb-top', 0.5 * ZOOM, 11 * ZOOM, 6 * ZOOM, 10),
      this.mat(0xff5252, 0, 45),
    );
    top.position.set(0, 0, 18 * ZOOM);
    top.castShadow = true;
    g.add(top);
  };
  surfboard = (g: THREE.Group): void => {
    const b = new THREE.Mesh(this.assets.sphere('prop-surf', 3 * ZOOM, 8, 6), this.mat(0x38e1ff, 0, 60));
    b.scale.set(1, 0.45, 3.2);
    b.position.set(0, 0, 9 * ZOOM);
    b.rotation.x = 0.35;
    b.castShadow = true;
    g.add(b);
  };
  lounger = (g: THREE.Group): void => {
    this.box(g, 8, 16, 2, 0xfff3e0, 0, 0, 4);
    this.box(g, 8, 5, 5, 0x3f8efc, 0, -6, 6);
  };
  beachBall = (g: THREE.Group): void => {
    this.ball(g, 4, 0xff5252, 0, 0, 4);
  };
  towelSet = (g: THREE.Group): void => {
    this.box(g, 10, 14, 1, 0x3f8efc, 0, 0, 1);
    this.box(g, 6, 6, 3, 0xffc93c, 2, 2, 3);
  };
  dune = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.sphere('prop-dune', 10 * ZOOM, 9, 6), this.mat(0xe3c886, 0, 8));
    m.scale.set(1.4, 1, 0.4);
    m.position.set(0, 0, 1 * ZOOM);
    m.receiveShadow = true;
    g.add(m);
  };
  tuft = (g: THREE.Group): void => {
    this.box(g, 1.5, 1.5, 6, 0x4a7c59, -2, 0, 3);
    this.box(g, 1.5, 1.5, 5, 0x5da53a, 2, 1, 2.5);
  };
  pierPost = (g: THREE.Group): void => {
    const m = new THREE.Mesh(
      this.assets.cylinder('prop-pier', 2.4 * ZOOM, 2.4 * ZOOM, 14 * ZOOM, 7),
      this.mat(0x6b4a2a, 0, 12),
    );
    m.position.set(0, 0, 4 * ZOOM);
    m.castShadow = true;
    g.add(m);
  };
  beachSign = (g: THREE.Group): void => {
    this.box(g, 2, 2, 12, 0x8a5f36, 0, 0, 6);
    this.box(g, 14, 1, 6, 0xfff3e0, 0, 0, 13);
  };
  lifeguard = (g: THREE.Group): void => {
    this.box(g, 10, 10, 4, 0xd64045, 0, 0, 14);
    this.box(g, 12, 12, 1.5, 0xfff3e0, 0, 0, 17);
    for (const sx of [-4, 4]) this.box(g, 2, 2, 12, 0x8a5f36, sx, sx > 0 ? 4 : -4, 6);
  };
  volleyball = (g: THREE.Group): void => {
    for (const px of [-14, 14]) this.box(g, 1.5, 1.5, 18, 0x8a5f36, px, 0, 9);
    this.box(g, 30, 1, 6, 0xffffff, 0, 0, 16);
  };
  boat = (g: THREE.Group): void => {
    this.box(g, 22, 10, 6, 0x8a5f36, 0, 0, 4);
    this.box(g, 2, 2, 12, 0x8a5f36, 0, 0, 12);
    this.box(g, 10, 1, 8, 0xffffff, 3, 0, 14);
  };
  buoy = (g: THREE.Group): void => {
    this.ball(g, 3.5, 0xff5252, 0, 0, 3.5);
    this.box(g, 1, 1, 4, 0x1e2430, 0, 0, 8);
  };
  beachHut = (g: THREE.Group): void => {
    this.box(g, 16, 12, 10, 0x3f8efc, 0, 0, 5);
    this.box(g, 18, 14, 2, 0xd64045, 0, 0, 11);
  };
  beachBarrier = (g: THREE.Group): void => {
    this.box(g, 24, 2, 5, 0xfff3e0, 0, 0, 4);
  };

  // ---- decor (outer slabs) ----
  lamp = (g: THREE.Group): void => {
    this.box(g, 2, 2, 20, 0x5b6570, 0, 0, 10);
    this.box(g, 6, 3, 3, 0xffe9a3, 0, 0, 21, 0x998800);
  };
  bench = (g: THREE.Group): void => {
    this.box(g, 16, 5, 2, 0x8a5f36, 0, 0, 5);
    this.box(g, 16, 1.5, 6, 0x8a5f36, 0, -3, 5);
  };
  crossSign = (g: THREE.Group): void => {
    this.box(g, 2, 2, 14, 0x8a8f99, 0, 0, 7);
    this.box(g, 8, 1, 5, 0xffc93c, 0, 0, 15);
  };

  // ---- volcano ----
  magmaRock = (g: THREE.Group): void => {
    this.ball(g, 6, 0x351912, 0, 0, 3.5, 0xff2200);
    this.ball(g, 3.5, 0xff5252, 4, 3, 2, 0xff5252);
  };
  basaltPillar = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.cylinder('prop-basalt', 4 * ZOOM, 4.5 * ZOOM, 18 * ZOOM, 6), this.mat(0x241410, 0, 20));
    m.position.set(0, 0, 9 * ZOOM);
    m.castShadow = true;
    g.add(m);
  };
  smokeVent = (g: THREE.Group): void => {
    this.box(g, 7, 7, 10, 0x351912, 0, 0, 5);
    this.ball(g, 2.5, 0xff7744, 0, 0, 11, 0xff5500);
  };

  // ---- forest ----
  magicMushroom = (g: THREE.Group): void => {
    this.box(g, 2, 2, 7, 0xf5f6fa, 0, 0, 3.5);
    this.ball(g, 5, 0x7bed9f, 0, 0, 8.5, 0x2ed573);
  };
  ancientRune = (g: THREE.Group): void => {
    this.box(g, 6, 4, 14, 0x375e43, 0, 0, 7);
    this.box(g, 4, 0.5, 10, 0x7bed9f, 0, 2, 7, 0x2ed573);
  };

  // ---- industrial ----
  hazardBarrier = (g: THREE.Group): void => {
    this.box(g, 22, 3, 8, 0xffa502, 0, 0, 4);
    this.box(g, 20, 3.2, 3, 0x2d3436, 0, 0, 4);
    this.box(g, 3, 3, 6, 0x636e72, -8, 0, 3);
    this.box(g, 3, 3, 6, 0x636e72, 8, 0, 3);
  };
  shippingCrate = (g: THREE.Group): void => {
    this.box(g, 16, 12, 12, 0x2d3436, 0, 0, 6);
    this.box(g, 17, 13, 2, 0xffa502, 0, 0, 6);
  };

  // ---- temple ----
  stoneObelisk = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.cylinder('prop-obelisk', 0.5 * ZOOM, 4 * ZOOM, 22 * ZOOM, 4), this.mat(0x8c7b65, 0, 40));
    m.position.set(0, 0, 11 * ZOOM);
    m.rotation.y = Math.PI / 4;
    m.castShadow = true;
    g.add(m);
  };
  goldenUrn = (g: THREE.Group): void => {
    this.ball(g, 4, 0xf5cd79, 0, 0, 4.5, 0x886600);
    this.box(g, 4, 4, 2, 0x6e5f4d, 0, 0, 1);
  };

  // ---- flooded ----
  submergedRooftop = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.cylinder('prop-roof', 0.1, 8 * ZOOM, 12 * ZOOM, 4), this.mat(0x273c75));
    m.position.set(0, 0, 3 * ZOOM);
    m.rotation.y = Math.PI / 4;
    m.castShadow = true;
    g.add(m);
  };

  // ---- railway ----
  railSignal = (g: THREE.Group): void => {
    this.box(g, 2, 2, 20, 0x2f3542, 0, 0, 10);
    this.box(g, 8, 2, 4, 0xf6b93b, 0, 0, 18);
    this.ball(g, 1.8, 0xff5252, 0, 1, 18, 0xff2222);
  };

  // ---- countryside ----
  hayBale = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.cylinder('prop-hay', 5 * ZOOM, 5 * ZOOM, 10 * ZOOM, 10), this.mat(0xf5cd79, 0, 15));
    m.position.set(0, 0, 5 * ZOOM);
    m.rotation.x = Math.PI / 2;
    m.castShadow = true;
    g.add(m);
  };
  fence = (g: THREE.Group): void => {
    this.box(g, 16, 2, 2, 0xa07855, 0, 0, 4);
    this.box(g, 16, 2, 2, 0xa07855, 0, 0, 8);
    this.box(g, 2.5, 2.5, 11, 0x8a6240, -6, 0, 5.5);
    this.box(g, 2.5, 2.5, 11, 0x8a6240, 6, 0, 5.5);
  };

  // ---- fantasy ----
  crystalSpire = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.octahedron('prop-crystal', 7 * ZOOM), this.mat(0xe056fd, 0x6611aa, 80));
    m.position.set(0, 0, 9 * ZOOM);
    m.scale.set(0.7, 0.7, 1.6);
    m.castShadow = true;
    g.add(m);
  };

  // ---- pirate ----
  treasureChest = (g: THREE.Group): void => {
    this.box(g, 10, 7, 6, 0x6e5636, 0, 0, 3);
    const lid = new THREE.Mesh(this.assets.cylinder('prop-chest-lid', 3.6 * ZOOM, 3.6 * ZOOM, 10 * ZOOM, 8), this.mat(0x8a5f36));
    lid.rotation.z = Math.PI / 2;
    lid.position.set(0, 0, 6.2 * ZOOM);
    g.add(lid);
    this.ball(g, 1.5, 0xffd700, 0, 3.6, 5, 0x886600);
  };
  pirateCannon = (g: THREE.Group): void => {
    this.box(g, 6, 8, 4, 0x6e5636, 0, 0, 2);
    const barrel = new THREE.Mesh(this.assets.cylinder('prop-cannon', 2.4 * ZOOM, 3.2 * ZOOM, 14 * ZOOM, 8), this.mat(0x2c3e50, 0, 60));
    barrel.position.set(0, 0, 5 * ZOOM);
    barrel.rotation.x = -0.3;
    barrel.castShadow = true;
    g.add(barrel);
  };

  // ---- ocean ----
  coralSpire = (g: THREE.Group): void => {
    this.box(g, 3, 3, 14, 0x00d2d3, 0, 0, 7);
    this.ball(g, 4, 0xff9ff3, 3, 0, 12);
    this.ball(g, 3.5, 0x54a0ff, -3, 0, 9);
  };

  // ---- moon ----
  lunarLander = (g: THREE.Group): void => {
    this.box(g, 10, 10, 8, 0xced6e0, 0, 0, 7);
    this.ball(g, 3, 0xffd700, 0, 0, 12, 0x665500);
    for (const sx of [-4, 4]) {
      for (const sy of [-4, 4]) {
        this.box(g, 1.2, 1.2, 6, 0x95a5a6, sx, sy, 2);
      }
    }
  };
  commAntenna = (g: THREE.Group): void => {
    this.box(g, 1.5, 1.5, 16, 0xced6e0, 0, 0, 8);
    const dish = new THREE.Mesh(this.assets.cylinder('prop-dish', 5 * ZOOM, 0.5 * ZOOM, 2 * ZOOM, 8), this.mat(0xf5f6fa));
    dish.position.set(0, 0, 16 * ZOOM);
    dish.rotation.x = 0.5;
    g.add(dish);
  };

  // ---- sky ----
  cloudPillar = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.cylinder('prop-skypillar', 3.5 * ZOOM, 3.5 * ZOOM, 18 * ZOOM, 8), this.mat(0xffffff, 0, 60));
    m.position.set(0, 0, 9 * ZOOM);
    m.castShadow = true;
    g.add(m);
    this.box(g, 9, 9, 2.5, 0xffd700, 0, 0, 19, 0x554400);
  };

  // ---- alien ----
  xenolithMonolith = (g: THREE.Group): void => {
    const m = new THREE.Mesh(this.assets.box('prop-xeno', 6 * ZOOM, 4 * ZOOM, 20 * ZOOM), this.mat(0x2b1240, 0x440088, 70));
    m.position.set(0, 0, 10 * ZOOM);
    m.rotation.z = 0.2;
    m.castShadow = true;
    g.add(m);
    this.ball(g, 2.5, 0xa55eea, 0, 0, 21, 0xaa22ff);
  };
  bioSpore = (g: THREE.Group): void => {
    this.ball(g, 6, 0xa55eea, 0, 0, 6, 0x7700cc);
    this.ball(g, 3, 0x00f0ff, 3, 2, 10, 0x00ffff);
  };

  // ---- New Canonical Reference Props ----
  duckie = (g: THREE.Group): void => {
    // Yellow rubber duck with orange beak
    const m = new THREE.Mesh(this.assets.sphere('prop-duck-body', 4.5 * ZOOM, 9, 7), this.mat(0xfeca57, 0, 60));
    m.position.set(0, 0, 4.5 * ZOOM);
    g.add(m);
    const head = new THREE.Mesh(this.assets.sphere('prop-duck-head', 3.0 * ZOOM, 8, 6), this.mat(0xfeca57, 0, 60));
    head.position.set(0, 2.8 * ZOOM, 8.5 * ZOOM);
    g.add(head);
    const beak = new THREE.Mesh(this.assets.cylinder('prop-duck-beak', 0.2 * ZOOM, 1.4 * ZOOM, 2.2 * ZOOM, 7), this.mat(0xff6b35, 0, 50));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 5.2 * ZOOM, 8.2 * ZOOM);
    g.add(beak);
  };

  lilypad = (g: THREE.Group): void => {
    // Floating green lilypad with pink lotus flower
    const pad = new THREE.Mesh(this.assets.cylinder('prop-lilypad', 6.5 * ZOOM, 6.5 * ZOOM, 0.6 * ZOOM, 12), this.mat(0x2ed573, 0, 30));
    pad.position.set(0, 0, 0.4 * ZOOM);
    g.add(pad);
    const flower = new THREE.Mesh(this.assets.sphere('prop-lotus', 2.0 * ZOOM, 8, 6), this.mat(0xff9ff3, 0, 50));
    flower.position.set(1.5 * ZOOM, 1.5 * ZOOM, 2.2 * ZOOM);
    g.add(flower);
  };

  snowman = (g: THREE.Group): void => {
    // Cute rounded snowman with blue scarf & hat
    const whiteMat = this.mat(0xffffff, 0, 50);
    const bottom = new THREE.Mesh(this.assets.sphere('prop-snow-bot', 5.5 * ZOOM, 10, 8), whiteMat);
    bottom.position.set(0, 0, 5.5 * ZOOM);
    g.add(bottom);
    const head = new THREE.Mesh(this.assets.sphere('prop-snow-top', 3.8 * ZOOM, 9, 7), whiteMat);
    head.position.set(0, 0, 12.5 * ZOOM);
    g.add(head);
    const scarf = new THREE.Mesh(this.assets.torus('prop-snow-scarf', 3.8 * ZOOM, 0.9 * ZOOM, 8, 16), this.mat(0x3867d6, 0, 50));
    scarf.position.set(0, 0, 9.8 * ZOOM);
    g.add(scarf);
    const hat = new THREE.Mesh(this.assets.cylinder('prop-snow-hat', 2.2 * ZOOM, 2.2 * ZOOM, 3.5 * ZOOM, 10), this.mat(0x1e272e, 0, 60));
    hat.position.set(0, 0, 16.5 * ZOOM);
    g.add(hat);
  };

  toriiGate = (g: THREE.Group): void => {
    // Traditional vermilion red Japanese Torii Gate
    const redMat = this.mat(0xe74c3c, 0, 50);
    const blackMat = this.mat(0x111111, 0, 60);
    for (const s of [-8, 8]) {
      const post = new THREE.Mesh(this.assets.cylinder('prop-torii-post', 1.8 * ZOOM, 1.8 * ZOOM, 24 * ZOOM, 8), redMat);
      post.position.set(s * ZOOM, 0, 12 * ZOOM);
      g.add(post);
    }
    const beam = new THREE.Mesh(this.assets.box('prop-torii-beam', 24 * ZOOM, 2.6 * ZOOM, 3.2 * ZOOM), redMat);
    beam.position.set(0, 0, 22 * ZOOM);
    g.add(beam);
    const topBar = new THREE.Mesh(this.assets.box('prop-torii-top', 28 * ZOOM, 3.2 * ZOOM, 2.0 * ZOOM), blackMat);
    topBar.position.set(0, 0, 24.5 * ZOOM);
    g.add(topBar);
  };

  candyCane = (g: THREE.Group): void => {
    // Red-and-white striped candy cane
    const post = new THREE.Mesh(this.assets.cylinder('prop-cane-post', 1.6 * ZOOM, 1.6 * ZOOM, 18 * ZOOM, 8), this.mat(0xff4757, 0, 60));
    post.position.set(0, 0, 9 * ZOOM);
    g.add(post);
    const arch = new THREE.Mesh(this.assets.torus('prop-cane-arch', 3.5 * ZOOM, 1.5 * ZOOM, 8, 16), this.mat(0xffffff, 0, 60));
    arch.position.set(3.5 * ZOOM, 0, 18 * ZOOM);
    arch.rotation.x = Math.PI / 2;
    g.add(arch);
  };

  trafficCone = (g: THREE.Group): void => {
    // Orange airport/road safety cone with white reflective band
    const cone = new THREE.Mesh(this.assets.cylinder('prop-cone', 0.4 * ZOOM, 3.2 * ZOOM, 9 * ZOOM, 8), this.mat(0xff6348, 0, 50));
    cone.position.set(0, 0, 4.5 * ZOOM);
    g.add(cone);
    const base = new THREE.Mesh(this.assets.box('prop-cone-base', 7 * ZOOM, 7 * ZOOM, 1.2 * ZOOM), this.mat(0xff6348, 0, 50));
    base.position.set(0, 0, 0.6 * ZOOM);
    g.add(base);
    const band = new THREE.Mesh(this.assets.cylinder('prop-cone-band', 1.8 * ZOOM, 2.2 * ZOOM, 2.5 * ZOOM, 8), this.mat(0xffffff, 0, 80));
    band.position.set(0, 0, 4.2 * ZOOM);
    g.add(band);
  };

  ruinsPillar = (g: THREE.Group): void => {
    // Sandstone ancient Egyptian ruins pillar
    const col = new THREE.Mesh(this.assets.cylinder('prop-ruins-col', 3.4 * ZOOM, 3.8 * ZOOM, 20 * ZOOM, 8), this.mat(0xd2b48c, 0, 25));
    col.position.set(0, 0, 10 * ZOOM);
    col.castShadow = true;
    g.add(col);
    const cap = new THREE.Mesh(this.assets.box('prop-ruins-cap', 9 * ZOOM, 9 * ZOOM, 2.8 * ZOOM), this.mat(0xc8a870, 0, 30));
    cap.position.set(0, 0, 20.5 * ZOOM);
    g.add(cap);
  };

  obstacleSets(): Record<string, PropBuilder[]> {
    const t = this.trees;
    return {
      city: [this.planter, this.kiosk, this.hydrant, this.barrier, (g) => t.streetTree(g), this.trashCan],
      river: [this.duckie, this.lilypad, (g) => t.streetTree(g), this.buoy],
      beach: [(g) => t.palm(g), this.umbrella, this.surfboard, this.beachSign],
      forest: [this.magicMushroom, this.ancientRune, (g) => t.vineTree(g), (g) => t.bush(g)],
      desert: [(g) => t.cactus(g), this.desertRock, (g) => t.deadBush(g)],
      snow: [this.snowman, (g) => t.pine(g, true), this.snowBank, this.iceRock],
      farm: [this.hayBale, this.fence, (g) => t.streetTree(g), (g) => t.bush(g)],
      jungle: [(g) => t.bigLeaf(g), (g) => t.vineTree(g), this.jungleRock, (g) => t.bush(g)],
      night_city: [this.holoPillar(0x38e1ff), this.holoPillar(0xff3fb4), this.neonSign, this.glowBarrier],
      neon: [this.holoPillar(0x38e1ff), this.holoPillar(0xff3fb4), this.neonSign, this.glowBarrier],
      volcano: [this.magmaRock, this.basaltPillar, this.smokeVent],
      airport: [this.trafficCone, this.shippingCrate, this.barrier, this.trashCan],
      harbor: [this.shippingCrate, this.hazardBarrier, this.buoy, this.pierPost],
      highway: [this.barrier, this.hazardBarrier, this.railSignal],
      candy: [this.candyCane, (g) => t.candyTree(g), this.crystalSpire],
      ruins: [this.ruinsPillar, this.stoneObelisk, this.goldenUrn],
      space: [this.commAntenna, this.lunarLander, this.holoPillar(0x38e1ff)],
      tokyo: [this.toriiGate, (g) => t.cherryTree(g), this.lamp],
      wildlife: [(g) => t.acaciaTree(g), (g) => t.baobabTree(g), this.desertRock],
      underwater: [this.coralSpire, this.buoy, this.pierPost],
      sky_island: [this.cloudPillar, this.crystalSpire, this.stoneObelisk],
      sky: [this.cloudPillar, this.crystalSpire, this.stoneObelisk],
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
