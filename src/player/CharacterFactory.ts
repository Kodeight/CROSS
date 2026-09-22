/**
 * §9 — single character-building system (gameplay + menu previews share it).
 * Faithful port of the original six stylized low-poly characters.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import { characterById } from '../config/characters.config';
import type { AssetManager } from '../assets/AssetManager';
import type { IdleKind } from './Character';

const ZOOM = GAME_CONFIG.zoom;

export class MeshBuilder {
  constructor(private readonly assets: AssetManager) {}

  cmat(color: number, emissive = 0): THREE.MeshPhongMaterial {
    return this.assets.phong(`char:${color}:${emissive}`, color, { emissive, flat: true });
  }

  part(parent: THREE.Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number, emissive = 0): THREE.Mesh {
    const m = new THREE.Mesh(this.assets.box(`char:${w}x${h}x${d}`, w * ZOOM, h * ZOOM, d * ZOOM), this.cmat(color, emissive));
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  ball(parent: THREE.Group, r: number, color: number, x: number, y: number, z: number, emissive = 0): THREE.Mesh {
    const m = new THREE.Mesh(this.assets.sphere(`char:${r}`, r * ZOOM, 8, 6), this.cmat(color, emissive));
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  spike(parent: THREE.Group, r: number, h: number, color: number, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(
      this.assets.cylinder(`char-spike:${r}x${h}`, 0.01, r * ZOOM, h * ZOOM, 4),
      this.cmat(color),
    );
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.rotation.y = Math.PI / 4;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  saveBase<T extends THREE.Object3D>(m: T): T {
    try {
      m.userData.base = { p: m.position.clone(), r: m.rotation.clone() };
    } catch { /* ignore */ }
    return m;
  }

  addEyes(parent: THREE.Group, x: number, y: number, z: number, s = 1): void {
    this.part(parent, 2.6 * s, 2 * s, 4 * s, 0xffffff, -x, y, z);
    this.part(parent, 2.6 * s, 2 * s, 4 * s, 0xffffff, x, y, z);
    this.part(parent, 1.4 * s, 1 * s, 2 * s, 0x1a1a1a, -x, y + 1 * s, z);
    this.part(parent, 1.4 * s, 1 * s, 2 * s, 0x1a1a1a, x, y + 1 * s, z);
  }

  addLegsFeet(parent: THREE.Group, legColor: number, footColor: number, legSpread: number, footSize: number): void {
    this.part(parent, 2.2, 2.2, 6, legColor, -legSpread, 0, 3);
    this.part(parent, 2.2, 2.2, 6, legColor, legSpread, 0, 3);
    this.part(parent, footSize, footSize + 1.5, 2, footColor, -legSpread, 0.5, 1);
    this.part(parent, footSize, footSize + 1.5, 2, footColor, legSpread, 0.5, 1);
  }
}

export class CharacterFactory {
  private readonly mb: MeshBuilder;

  constructor(assets: AssetManager) {
    this.mb = new MeshBuilder(assets);
  }

  create(id: string): THREE.Group {
    const spec = characterById(id);
    const g = new THREE.Group();
    const mb = this.mb;
    switch (spec.id) {
      case 'duck': this.buildDuck(g, spec.body, spec.beak); break;
      case 'frog': this.buildFrog(g, spec.body, spec.accent); break;
      case 'cat': this.buildCat(g, spec.body, spec.accent); break;
      case 'fox': this.buildFox(g, spec.body); break;
      case 'robot': this.buildRobot(g, spec.body); break;
      case 'chicken':
      default: this.buildChicken(g, spec.body, spec.beak, spec.accent); break;
    }
    g.userData.charId = spec.id;
    return g;
  }

  idleOf(group: THREE.Group): IdleKind {
    return (group.userData.idle as IdleKind) ?? 'bob';
  }

  private buildChicken(g: THREE.Group, white: number, beak: number, accent: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0xe08a00, 0xff9f1c, 3.5, 4.5);
    const body = mb.part(g, 16, 14, 14, white, 0, 0, 12);
    g.userData.body = body;
    mb.part(g, 10, 6, 12, 0xf4f4f4, 0, 5, 13);
    const wl = mb.part(g, 3, 10, 9, 0xe4e4e4, -9, -0.5, 13);
    const wr = mb.part(g, 3, 10, 9, 0xe4e4e4, 9, -0.5, 13);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const tail = mb.part(g, 6, 3, 7, white, 0, -8, 17);
    tail.rotation.x = -0.5;
    const head = mb.part(g, 12, 11, 10, white, 0, 1, 25);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 5, 4, 4, beak, 0, 7.5, 23);
    mb.part(g, 2.5, 2.5, 3.5, accent, 0, -1, 31);
    mb.part(g, 2.5, 2.5, 4.2, accent, 0, 1.6, 31.2);
    mb.part(g, 2.5, 2.5, 3.5, accent, 0, 4.2, 31);
    mb.addEyes(g, 4, 6, 26, 1);
    g.userData.idle = 'bob';
  }

  private buildDuck(g: THREE.Group, yellow: number, beak: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0xe08a00, 0xff7b1c, 4, 5.5);
    const body = mb.part(g, 19, 15, 11, yellow, 0, 0, 10);
    g.userData.body = body;
    const wl = mb.part(g, 3, 11, 7, 0xe8b62a, -10.5, -0.5, 10);
    const wr = mb.part(g, 3, 11, 7, 0xe8b62a, 10.5, -0.5, 10);
    g.userData.wings = [mb.saveBase(wl), mb.saveBase(wr)];
    const tail = mb.part(g, 5, 4, 5, 0xe8b62a, 0, -8.5, 13);
    tail.rotation.x = -0.7;
    const head = mb.part(g, 12, 12, 9, yellow, 0, 1, 21);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 10, 6, 3, beak, 0, 7.5, 19.5);
    mb.addEyes(g, 4, 6.5, 22, 1);
    g.userData.idle = 'bob';
  }

  private buildFrog(g: THREE.Group, green: number, dark: number): void {
    const mb = this.mb;
    const bl = mb.part(g, 5, 10, 6, dark, -9.5, -1, 6);
    bl.rotation.z = 0.35;
    const br = mb.part(g, 5, 10, 6, dark, 9.5, -1, 6);
    br.rotation.z = -0.35;
    mb.part(g, 4, 5, 2.5, dark, -5, 5, 1.2);
    mb.part(g, 4, 5, 2.5, dark, 5, 5, 1.2);
    const body = mb.ball(g, 9, green, 0, 0, 9);
    body.scale.set(1, 1.15, 0.95);
    g.userData.body = body;
    mb.ball(g, 6.5, 0xcde8b0, 0, 3.5, 7);
    const head = mb.ball(g, 7, green, 0, 1, 18);
    g.userData.head = mb.saveBase(head);
    mb.ball(g, 2.8, 0xffffff, -4.2, 1, 24.5);
    mb.ball(g, 2.8, 0xffffff, 4.2, 1, 24.5);
    mb.ball(g, 1.3, 0x1a1a1a, -4.2, 3, 24.8);
    mb.ball(g, 1.3, 0x1a1a1a, 4.2, 3, 24.8);
    mb.part(g, 11, 1, 1.6, dark, 0, 7, 15.5);
    g.userData.idle = 'breathe';
  }

  private buildCat(g: THREE.Group, gray: number, accent: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x5b6570, 0x5b6570, 4, 4);
    const body = mb.part(g, 14, 13, 13, gray, 0, 0, 11);
    g.userData.body = body;
    mb.part(g, 9, 5, 10, 0xc3cad2, 0, 4.5, 10);
    const head = mb.part(g, 12, 11, 10, gray, 0, 1, 23);
    g.userData.head = mb.saveBase(head);
    mb.spike(g, 3.6, 7, gray, -4.5, 0.5, 30.5);
    mb.spike(g, 3.6, 7, gray, 4.5, 0.5, 30.5);
    mb.spike(g, 1.8, 3.5, 0xffb3c1, -4.5, 1, 30);
    mb.spike(g, 1.8, 3.5, 0xffb3c1, 4.5, 1, 30);
    mb.part(g, 2.4, 1.6, 1.6, 0xffb3c1, 0, 6.2, 22);
    mb.part(g, 6, 0.6, 0.6, 0xffffff, -7, 5.5, 22);
    mb.part(g, 6, 0.6, 0.6, 0xffffff, 7, 5.5, 22);
    mb.addEyes(g, 4, 6, 24, 1);
    const s1 = mb.part(g, 3.2, 3.2, 7, accent, 0, -8, 9);
    s1.rotation.x = -0.9;
    const s2 = mb.part(g, 3, 3, 6.5, accent, 0, -11.5, 13.5);
    s2.rotation.x = -0.5;
    const s3 = mb.part(g, 2.8, 2.8, 6, 0xc3cad2, 0, -13.5, 19);
    s3.rotation.x = -0.1;
    g.userData.tailSegs = [mb.saveBase(s1), mb.saveBase(s2), mb.saveBase(s3)];
    g.userData.idle = 'tail';
  }

  private buildFox(g: THREE.Group, orange: number): void {
    const mb = this.mb;
    mb.addLegsFeet(g, 0x5a2d12, 0x3c1e0c, 4, 4);
    const body = mb.part(g, 14, 13, 12, orange, 0, 0, 11);
    g.userData.body = body;
    mb.part(g, 8, 5, 10, 0xfff3e0, 0, 4.5, 10);
    const head = mb.part(g, 11, 10, 9, orange, 0, 1, 22);
    g.userData.head = mb.saveBase(head);
    mb.spike(g, 3.2, 9, orange, -4, 0.5, 29.5);
    mb.spike(g, 3.2, 9, orange, 4, 0.5, 29.5);
    mb.part(g, 6, 5, 4.5, 0xfff3e0, 0, 6.5, 20);
    mb.part(g, 2.2, 1.5, 1.5, 0x1a1a1a, 0, 9.2, 20.5);
    mb.addEyes(g, 3.6, 5.5, 23.5, 0.95);
    const s1 = mb.part(g, 5, 5, 9, orange, 0, -8.5, 8);
    s1.rotation.x = -1.0;
    const s2 = mb.part(g, 4.6, 4.6, 8.5, orange, 0, -12.5, 13);
    s2.rotation.x = -0.55;
    const s3 = mb.part(g, 4.2, 4.2, 8, 0xfff3e0, 0, -14, 19.5);
    s3.rotation.x = -0.15;
    g.userData.tailSegs = [mb.saveBase(s1), mb.saveBase(s2), mb.saveBase(s3)];
    g.userData.idle = 'tail';
  }

  private buildRobot(g: THREE.Group, slate: number): void {
    const mb = this.mb;
    mb.part(g, 6, 8, 3, 0x39424f, -4, 0, 1.5);
    mb.part(g, 6, 8, 3, 0x39424f, 4, 0, 1.5);
    mb.part(g, 4, 4, 9, 0x4a5563, -4, 0, 7);
    mb.part(g, 4, 4, 9, 0x4a5563, 4, 0, 7);
    const body = mb.part(g, 16, 12, 16, slate, 0, 0, 14);
    g.userData.body = body;
    mb.part(g, 10, 1, 8, 0x39424f, 0, 6.2, 13);
    mb.part(g, 6, 1.5, 4, slate, 0, 6.5, 17, 0x0a5566);
    const aL = mb.part(g, 3.5, 3.5, 12, 0x4a5563, -10, 0, 14);
    const aR = mb.part(g, 3.5, 3.5, 12, 0x4a5563, 10, 0, 14);
    mb.part(g, 4, 4, 3, 0x39424f, -10, 0, 7.5);
    mb.part(g, 4, 4, 3, 0x39424f, 10, 0, 7.5);
    g.userData.arms = [mb.saveBase(aL), mb.saveBase(aR)];
    const head = mb.part(g, 12, 10, 9, 0x4a5563, 0, 0.5, 27.5);
    g.userData.head = mb.saveBase(head);
    mb.part(g, 9, 1.5, 4.5, slate, 0, 5.2, 28, 0x0a5566);
    mb.part(g, 1.5, 1.5, 7, slate, 0, 0, 34);
    const tipMat = new THREE.MeshPhongMaterial({ color: 0x38e1ff, emissive: 0x14424d, flatShading: true });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(2 * ZOOM, 7, 6), tipMat);
    tip.position.set(0, 0, 38 * ZOOM);
    g.add(tip);
    g.userData.tipMat = tipMat;
    g.userData.idle = 'mech';
  }

  /** Idle animation shared by gameplay + menu previews. */
  animate(group: THREE.Group, tMs: number): void {
    const u = group.userData as Record<string, any>;
    if (!u) return;
    const s = tMs / 1000;
    const idle = (u.idle as IdleKind) ?? 'bob';
    const head = u.head as (THREE.Object3D & { userData: { base?: { p: THREE.Vector3; r: THREE.Euler } } }) | undefined;
    if (idle === 'tail' && Array.isArray(u.tailSegs)) {
      (u.tailSegs as THREE.Object3D[]).forEach((m, i) => {
        const base = (m.userData.base as { r: THREE.Euler } | undefined)?.r;
        if (base) m.rotation.x = base.x + Math.sin(s * 2.2 + i * 0.7) * 0.16;
      });
      const bp = head?.userData.base?.p;
      if (head && bp) head.position.z = bp.z + Math.sin(s * 1.6) * 0.7 * ZOOM;
    } else if (idle === 'breathe') {
      const bp = head?.userData.base?.p;
      if (head && bp) head.position.z = bp.z + Math.sin(s * 2.2) * 0.9 * ZOOM;
    } else if (idle === 'mech') {
      const br = head?.userData.base?.r;
      if (head && br) head.rotation.y = Math.sin(s * 1.1) * 0.16;
      if (Array.isArray(u.arms)) {
        (u.arms as THREE.Object3D[]).forEach((m, i) => {
          const base = (m.userData.base as { r: THREE.Euler } | undefined)?.r;
          if (base) m.rotation.x = Math.sin(s * 1.4 + i * 2.1) * 0.1;
        });
      }
      const tipMat = u.tipMat as THREE.MeshPhongMaterial | undefined;
      if (tipMat?.emissive) {
        try {
          tipMat.emissive.setHex((Math.floor(tMs / 450) % 2) ? 0x38e1ff : 0x14424d);
        } catch { /* ignore */ }
      }
    } else {
      const bp = head?.userData.base?.p;
      if (head && bp) head.position.z = bp.z + Math.sin(s * 3.1) * 0.8 * ZOOM;
      if (Array.isArray(u.wings)) {
        (u.wings as THREE.Object3D[]).forEach((m, i) => {
          const base = (m.userData.base as { r: THREE.Euler } | undefined)?.r;
          if (base) m.rotation.x = Math.sin(s * 3.1 + i * Math.PI) * 0.08;
        });
      }
    }
  }
}
