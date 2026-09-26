/**
 * §11/environment — stylized vehicles with rounded bodies, glass cabins,
 * wheels, lights and bevels. Dimensions/speeds mirror the original roster
 * so traffic spacing math stays valid.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import { vehicleSpec } from '../../config/traffic.config';
import type { AssetManager } from '../../assets/AssetManager';
import { pick } from '../../utils/Random';

const ZOOM = GAME_CONFIG.zoom;

const BODY_COLORS = [0xd64045, 0xffc93c, 0x3f8efc, 0x4a7c59, 0xe8e8e8, 0x8a8f99, 0xe07b2a];

export interface BuiltVehicle extends THREE.Group {
  userData: THREE.Group['userData'] & {
    length: number;
    kind: string;
    speed: number;
    baseSpeed?: number;
    cruise?: number;
    cur?: number;
    prevDx?: number | null;
  };
}

export class VehicleFactory {
  constructor(private readonly assets: AssetManager) {}

  private mat(color: number, emissive = 0, shininess = 30): THREE.MeshPhongMaterial {
    return this.assets.phong(`veh:${color}:${emissive}:${shininess}`, color, { emissive, shininess });
  }

  private box(parent: THREE.Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number, emissive = 0, shininess = 30): THREE.Mesh {
    const m = new THREE.Mesh(this.assets.box(`veh:${w}x${h}x${d}`, w * ZOOM, h * ZOOM, d * ZOOM), this.mat(color, emissive, shininess));
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  private rbody(parent: THREE.Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(this.assets.roundedBox(w * ZOOM, h * ZOOM, d * ZOOM, 2.2 * ZOOM, 2), this.mat(color, 0, 45));
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  private wheel(parent: THREE.Group, x: number): void {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(
      this.assets.cylinder('veh-tire', 7 * ZOOM, 7 * ZOOM, 12 * ZOOM, 12),
      this.mat(0x22242a, 0, 15),
    );
    tire.castShadow = true;
    g.add(tire);
    const cap = new THREE.Mesh(
      this.assets.cylinder('veh-cap', 3.2 * ZOOM, 3.2 * ZOOM, 12.6 * ZOOM, 10),
      this.mat(0x9aa0ab, 0, 70),
    );
    g.add(cap);
    g.position.set(x * ZOOM, 0, 7 * ZOOM);
    parent.add(g);
  }

  private headlights(parent: THREE.Group, len: number, spread: number, z: number): void {
    for (const s of [-1, 1]) {
      this.box(parent, 3, 5, 4, 0xfff6b0, -len / 2, s * spread, z, 0x998800);
    }
  }

  create(kind: string): BuiltVehicle {
    const spec = vehicleSpec(kind);
    const g = new THREE.Group() as BuiltVehicle;
    const len = Math.round(spec.length * 1.76);
    const bodyH = kind === 'truck' || kind === 'bus' ? 26 : kind === 'van' ? 20 : 15;
    const color = kind === 'taxi' ? 0xffc93c : pick(BODY_COLORS);
    const speed = spec.baseSpeed;

    switch (kind) {
      case 'moto': {
        this.box(g, len, 14, 10, color, 0, 0, 10);
        this.box(g, 12, 12, 14, 0x1e2430, 0, 0, 22);
        this.wheel(g, -12); this.wheel(g, 12);
        this.box(g, 3, 4, 4, 0xfff6b0, -len / 2, 0, 10, 0x998800);
        break;
      }
      case 'truck':
      case 'bus': {
        this.box(g, len, 25, 6, 0xdfe6f2, 0, 0, 9);
        this.rbody(g, len * 0.68, 30, bodyH + 14, kind === 'bus' ? color : 0xe8edf5, 14, 0, 26);
        this.rbody(g, 24, 28, 26, color, -len / 2 + 12, 0, 18);
        this.box(g, 4, 24, 12, 0xcfe8ff, -len / 2 + 24, 0, 20, 0, 100);
        this.wheel(g, -len / 2 + 12); this.wheel(g, 0); this.wheel(g, len / 2 - 14);
        break;
      }
      case 'hover': {
        this.rbody(g, len, 26, 13, color, 0, 0, 12);
        this.box(g, len * 0.4, 18, 7, 0x38e1ff, len * 0.05, 0, 21, 0x0a3344);
        this.box(g, len * 0.9, 24, 2.5, 0x38e1ff, 0, 0, 3.5, 0x0a5566);
        break;
      }
      case 'neocar': {
        this.rbody(g, len, 26, 14, color, 0, 0, 11);
        this.box(g, len * 0.55, 27, 5, 0xff3fb4, 0, 0, 20, 0x441133);
        this.box(g, len * 0.85, 24, 2.5, 0xb44dff, 0, 0, 3.5, 0x2a0a44);
        this.wheel(g, -len * 0.3); this.wheel(g, len * 0.3);
        this.headlights(g, len, 10, 10);
        break;
      }
      case 'buggy': {
        this.rbody(g, len * 0.55, 22, 8, color, -len * 0.2, 0, 7);
        this.box(g, len * 0.35, 20, 10, 0x22242a, len * 0.25, 0, 10);
        this.wheel(g, -len * 0.3); this.wheel(g, len * 0.32);
        this.headlights(g, len, 8, 7);
        break;
      }
      case 'snowmobile': {
        this.box(g, len, 16, 12, color, 0, 0, 10);
        this.box(g, 10, 14, 10, 0xcfe8ff, -len * 0.2, 0, 20, 0, 100);
        this.box(g, 12, 12, 14, 0x1e2430, len * 0.2, 0, 20);
        this.box(g, 30, 18, 6, 0x22242a, len * 0.25, 0, 4);
        break;
      }
      case 'jeep': {
        this.rbody(g, len, 28, 16, color, 0, 0, 11);
        this.box(g, len * 0.42, 28, 7, 0x2b2f38, len * 0.12, 0, 21);
        this.wheel(g, -len * 0.32); this.wheel(g, len * 0.32);
        this.headlights(g, len, 10, 10);
        break;
      }
      case 'train': {
        this.rbody(g, len * 0.95, 28, 28, 0xd64045, 0, 0, 20);
        this.box(g, len * 0.35, 26, 12, 0x1e2430, -len * 0.22, 0, 36);
        this.box(g, 6, 6, 16, 0x3a3f4b, len * 0.28, 0, 36);
        this.wheel(g, -len * 0.35); this.wheel(g, -len * 0.15); this.wheel(g, len * 0.15); this.wheel(g, len * 0.35);
        this.box(g, 4, 8, 8, 0xfff6b0, -len * 0.48, 0, 22, 0xffe9a3);
        break;
      }
      case 'tractor': {
        this.rbody(g, len * 0.6, 26, 18, 0x2ecc71, len * 0.15, 0, 14);
        this.box(g, len * 0.35, 24, 18, 0xfff3e0, -len * 0.18, 0, 26);
        this.wheel(g, len * 0.25);
        // Big back tractor wheel
        const bg = new THREE.Group();
        const tire = new THREE.Mesh(this.assets.cylinder('veh-tire-big', 11 * ZOOM, 11 * ZOOM, 14 * ZOOM, 12), this.mat(0x22242a));
        tire.castShadow = true;
        bg.add(tire);
        bg.position.set(-len * 0.25 * ZOOM, 0, 11 * ZOOM);
        g.add(bg);
        break;
      }
      case 'ufo': {
        const saucer = new THREE.Mesh(this.assets.cylinder('veh-ufo-disc', 16 * ZOOM, 7 * ZOOM, 6 * ZOOM, 16), this.mat(0x7158e2, 0x331166));
        saucer.position.set(0, 0, 9 * ZOOM);
        g.add(saucer);
        const dome = new THREE.Mesh(this.assets.sphere('veh-ufo-dome', 9 * ZOOM, 12, 8), this.mat(0x38e1ff, 0x114466));
        dome.position.set(0, 0, 15 * ZOOM);
        g.add(dome);
        break;
      }
      case 'cart': {
        this.box(g, len * 0.8, 22, 12, 0x8a5a2b, 0, 0, 12);
        this.box(g, 4, 26, 4, 0x4a3219, -len * 0.2, 0, 8);
        this.box(g, 4, 26, 4, 0x4a3219, len * 0.2, 0, 8);
        break;
      }
      case 'boat': {
        this.rbody(g, len * 0.9, 24, 12, 0xffffff, 0, 0, 7);
        this.box(g, len * 0.45, 18, 10, 0x3fa8d8, -len * 0.1, 0, 16);
        break;
      }
      case 'miner':
      case 'rover': {
        this.rbody(g, len * 0.85, 28, 18, color, 0, 0, 14);
        this.box(g, len * 0.4, 24, 8, 0xced6e0, len * 0.1, 0, 24);
        this.wheel(g, -len * 0.32); this.wheel(g, 0); this.wheel(g, len * 0.32);
        break;
      }
      default: {
        // car / taxi / hatch / van / neocar fallback: rounded body + glass cabin.
        this.rbody(g, len, 28, bodyH, color, 0, 0, 11);
        const cab = new THREE.Mesh(
          this.assets.roundedBox(len * 0.5 * ZOOM, 22 * ZOOM, 12 * ZOOM, 2 * ZOOM, 2),
          this.mat(0xe8f1f8, 0, 100),
        );
        cab.position.set(len * 0.05 * ZOOM, 0, (bodyH + 8) * ZOOM + 2 * ZOOM);
        cab.castShadow = true;
        g.add(cab);
        this.wheel(g, -len * 0.3); this.wheel(g, len * 0.3);
        this.headlights(g, len, 12, 10);
        if (kind === 'taxi') this.box(g, 10, 8, 5, 0x1e2430, 0, 0, bodyH + 27);
        if (kind === 'van') this.rbody(g, len * 0.8, 29, bodyH + 6, color, 4, 0, 16);
        break;
      }
    }

    g.userData.length = len;
    g.userData.kind = kind;
    g.userData.speed = speed;
    g.userData.prevDx = null;
    return g;
  }
}
