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

  // ---- volcano / industrial / temple / alien & new worlds props ----
  magmaRock = (g: THREE.Group): void => {
    this.ball(g, 7, 0x3d1c14, 0, 0, 4);
    this.ball(g, 4, 0xff4757, 5, 2, 3, 0x661100);
  };
  obsidianSpire = (g: THREE.Group): void => {
    this.box(g, 6, 6, 20, 0x221310, 0, 0, 10);
    this.box(g, 4, 4, 10, 0xff5252, 0, 0, 18, 0x881100);
  };
  glowMushroom = (g: THREE.Group): void => {
    this.box(g, 3, 3, 10, 0xffffff, 0, 0, 5);
    this.ball(g, 6, 0x2ed573, 0, 0, 12, 0x005522);
  };
  magicRoot = (g: THREE.Group): void => {
    this.box(g, 16, 4, 6, 0x3d2714, 0, 0, 3);
    this.ball(g, 3, 0x7bed9f, 4, 0, 6, 0x114422);
  };
  barrelStack = (g: THREE.Group): void => {
    this.box(g, 14, 7, 10, 0xffa502, 0, 0, 5);
    this.box(g, 8, 6, 8, 0x747d8c, 0, 0, 13);
  };
  pipeSection = (g: THREE.Group): void => {
    this.box(g, 18, 5, 8, 0x57606f, 0, 0, 4);
    this.box(g, 4, 8, 12, 0x2f3542, 6, 0, 6);
  };
  ancientPillar = (g: THREE.Group): void => {
    this.box(g, 8, 8, 22, 0x8c7b65, 0, 0, 11);
    this.box(g, 12, 12, 3, 0x6e5f4d, 0, 0, 22);
  };
  stoneRelic = (g: THREE.Group): void => {
    this.box(g, 10, 10, 8, 0x6e5f4d, 0, 0, 4);
    this.ball(g, 4, 0xbe2edd, 0, 0, 10, 0x440055);
  };
  signalLight = (g: THREE.Group): void => {
    this.box(g, 2, 2, 22, 0x2f3542, 0, 0, 11);
    this.box(g, 6, 4, 10, 0x1e2430, 0, 0, 20);
    this.ball(g, 2, 0xff4757, 0, 2, 22, 0x660000);
    this.ball(g, 2, 0x2ed573, 0, 2, 17, 0x006622);
  };
  hayBale = (g: THREE.Group): void => {
    this.box(g, 14, 10, 8, 0xf6b93b, 0, 0, 4);
    this.box(g, 12, 8, 7, 0xeccc68, 0, 0, 11);
  };
  peakRock = (g: THREE.Group): void => {
    this.box(g, 12, 10, 14, 0x4a7f93, 0, 0, 7);
    this.box(g, 8, 8, 4, 0xdff9fb, 0, 0, 15);
  };
  bannerPillar = (g: THREE.Group): void => {
    this.box(g, 6, 6, 20, 0x535c68, 0, 0, 10);
    this.box(g, 1, 8, 12, 0xff4757, 4, 0, 16);
  };
  rumBarrel = (g: THREE.Group): void => {
    this.box(g, 8, 8, 12, 0x6e4e2e, 0, 0, 6);
    this.box(g, 9, 9, 2, 0x2f3542, 0, 0, 6);
  };
  giantCoral = (g: THREE.Group): void => {
    this.box(g, 4, 4, 16, 0xff4757, 0, 0, 8, 0x440011);
    this.box(g, 8, 4, 4, 0xff6b81, 2, 0, 14, 0x440022);
  };
  craterRock = (g: THREE.Group): void => {
    this.ball(g, 7, 0x576574, 0, 0, 3);
    this.ball(g, 3, 0xced6e0, 4, 3, 2);
  };
  aetherObelisk = (g: THREE.Group): void => {
    this.box(g, 6, 6, 24, 0x70a1ff, 0, 0, 12, 0x113377);
    this.ball(g, 3, 0xffffff, 0, 0, 26, 0x336699);
  };
  alienTentacle = (g: THREE.Group): void => {
    this.box(g, 5, 5, 18, 0xa55eea, 0, 0, 9, 0x381768);
    this.ball(g, 4, 0xff9ff3, 0, 0, 19, 0x662255);
  };
  plasmaGeode = (g: THREE.Group): void => {
    this.box(g, 10, 10, 8, 0x2b1240, 0, 0, 4);
    this.ball(g, 5, 0x00f0ff, 0, 0, 10, 0x006688);
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
      volcano: [this.magmaRock, this.obsidianSpire, this.magmaRock],
      forest: [this.glowMushroom, this.magicRoot, (g) => t.pine(g, false)],
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
