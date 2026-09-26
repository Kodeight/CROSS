/**
 * Vegetation per world: smooth-shaded stylized trees (never raw cones on
 * cylinders), jungle foliage, desert cacti, snow pines, beach palms.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import type { AssetManager } from '../../assets/AssetManager';
import { pick } from '../../utils/Random';

const ZOOM = GAME_CONFIG.zoom;

export class TreeFactory {
  constructor(private readonly assets: AssetManager) {}

  private mat(color: number, shininess = 30): THREE.MeshPhongMaterial {
    return this.assets.phong(`tree:${color}`, color, { shininess });
  }

  private add(parent: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Street tree (city). */
  streetTree(g: THREE.Group): void {
    this.add(g, this.assets.cylinder('tree-trunk', 2.4 * ZOOM, 3 * ZOOM, 16 * ZOOM, 7), this.mat(0x6b4a2a, 12), 0, 0, 8);
    const leaf = this.mat(0x4a7c59);
    const c1 = this.add(g, this.assets.sphere('tree-c1', 9 * ZOOM, 9, 7), leaf, 0, 0, 21);
    c1.scale.set(1, 1, 0.85);
    const c2 = this.add(g, this.assets.sphere('tree-c2', 6 * ZOOM, 8, 6), leaf, 5, 2, 17);
    c2.scale.set(1, 1, 0.8);
  }

  /** Smooth palm with curved trunk segments + drooping fronds (beach). */
  palm(g: THREE.Group): void {
    const trunkMat = this.mat(0x8a5f36, 12);
    let x = 0;
    for (let i = 0; i < 4; i++) {
      x += 1.2;
      this.add(g, this.assets.cylinder(`palm-t${i}`, 2.2 * ZOOM, 2.8 * ZOOM, 9 * ZOOM, 7), trunkMat, x, 0, 4 + i * 8);
    }
    const leafMat = this.mat(0x3f9f4f);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + pick([0, 0.3]);
      const frond = this.add(g, this.assets.sphere(`palm-f${i}`, 3 * ZOOM, 7, 5), leafMat, x + Math.cos(a) * 8, Math.sin(a) * 8, 38);
      frond.scale.set(2.6, 0.9, 0.5);
      frond.rotation.z = a;
    }
    this.add(g, this.assets.sphere('palm-nut', 2 * ZOOM, 7, 6), this.mat(0x6b4a2a), x + 2, 1, 35);
    this.add(g, this.assets.sphere('palm-nut2', 2 * ZOOM, 7, 6), this.mat(0x6b4a2a), x - 2, -1, 35);
  }

  /** Broad jungle leaf cluster. */
  bigLeaf(g: THREE.Group): void {
    const leafMat = this.mat(0x2e7d32);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = this.add(g, this.assets.sphere(`jungle-leaf${i}`, 4 * ZOOM, 7, 5), leafMat, Math.cos(a) * 5, Math.sin(a) * 5, 8 + (i % 2) * 5);
      leaf.scale.set(1.8, 0.7, 0.4);
      leaf.rotation.z = a;
    }
  }

  vineTree(g: THREE.Group): void {
    this.add(g, this.assets.cylinder('vine-trunk', 3 * ZOOM, 4 * ZOOM, 22 * ZOOM, 7), this.mat(0x5a4128, 12), 0, 0, 11);
    const leafMat = this.mat(0x3f8f4f);
    const c = this.add(g, this.assets.sphere('vine-c', 10 * ZOOM, 9, 7), leafMat, 0, 0, 26);
    c.scale.set(1.1, 1, 0.8);
  }

  bush(g: THREE.Group): void {
    const b = this.add(g, this.assets.sphere('bush', 6 * ZOOM, 8, 6), this.mat(0x4a7c59), 0, 0, 5);
    b.scale.set(1.2, 1, 0.7);
  }

  cactus(g: THREE.Group): void {
    const m = this.mat(0x3f8f4f, 12);
    this.add(g, this.assets.cylinder('cactus-main', 3 * ZOOM, 3.4 * ZOOM, 20 * ZOOM, 8), m, 0, 0, 10);
    this.add(g, this.assets.sphere('cactus-top', 3 * ZOOM, 8, 6), m, 0, 0, 20);
    this.add(g, this.assets.cylinder('cactus-arm', 1.8 * ZOOM, 1.8 * ZOOM, 8 * ZOOM, 7), m, 5, 0, 12);
  }

  deadBush(g: THREE.Group): void {
    this.add(g, this.assets.sphere('dead', 4 * ZOOM, 7, 5), this.mat(0x8a6b3f, 8), 0, 0, 4);
  }

  pine(g: THREE.Group, snowCap: boolean): void {
    this.add(g, this.assets.cylinder('pine-trunk', 2 * ZOOM, 2.6 * ZOOM, 8 * ZOOM, 7), this.mat(0x5a4128, 12), 0, 0, 4);
    const green = this.mat(0x2f6b4f);
    const t1 = this.add(g, this.assets.cylinder('pine-1', 2 * ZOOM, 9 * ZOOM, 12 * ZOOM, 9), green, 0, 0, 13);
    t1.rotation.x = 0;
    this.add(g, this.assets.cylinder('pine-2', 1.4 * ZOOM, 6.5 * ZOOM, 10 * ZOOM, 9), green, 0, 0, 21);
    if (snowCap) {
      this.add(g, this.assets.cylinder('pine-cap', 1.2 * ZOOM, 5 * ZOOM, 4 * ZOOM, 9), this.mat(0xffffff, 60), 0, 0, 26);
    }
  }
}
