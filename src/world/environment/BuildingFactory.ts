/**
 * Buildings + large structures: houses, shops, apartments, towers, decor.
 * Static world-space objects — never camera-attached, never player-attached.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import type { AssetManager } from '../../assets/AssetManager';
import { pick } from '../../utils/Random';

const ZOOM = GAME_CONFIG.zoom;

export class BuildingFactory {
  constructor(private readonly assets: AssetManager) {}

  private mat(color: number, emissive = 0, shininess = 30): THREE.MeshPhongMaterial {
    return this.assets.phong(`bld:${color}:${emissive}`, color, { emissive, shininess });
  }

  private box(g: THREE.Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number, emissive = 0): void {
    const m = new THREE.Mesh(this.assets.box(`bld:${w}x${h}x${d}`, w * ZOOM, h * ZOOM, d * ZOOM), this.mat(color, emissive));
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }

  private rbox(g: THREE.Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number): void {
    const m = new THREE.Mesh(this.assets.roundedBox(w * ZOOM, h * ZOOM, d * ZOOM, 1.6 * ZOOM, 1), this.mat(color, 0, 45));
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }

  smallHouse(g: THREE.Group): void {
    const wall = pick([0xfff3e0, 0xe8f1f8, 0xffe1e1, 0xeef3e4]);
    this.rbox(g, 34, 26, 20, wall, 0, 0, 10);
    this.box(g, 38, 30, 3, 0xd64045, 0, 0, 21);
    this.box(g, 8, 2, 12, 0x5b6570, 0, 13, 6);
    this.box(g, 10, 1, 8, 0xcfe8ff, -8, 13, 12);
    this.box(g, 10, 1, 8, 0xcfe8ff, 8, 13, 12);
  }

  shop(g: THREE.Group): void {
    this.rbox(g, 40, 28, 22, 0xfffdf5, 0, 0, 11);
    this.box(g, 42, 30, 4, pick([0x3f8efc, 0xd64045, 0x7ac74f]), 0, 0, 24);
    this.box(g, 26, 1, 12, 0x1e2430, 0, 14, 8);
    this.box(g, 8, 2, 10, 0x5b6570, -12, 14, 5);
  }

  apartment(g: THREE.Group): void {
    this.rbox(g, 36, 30, 52, pick([0xb9bec7, 0xd9c8a9, 0xc3cad2]), 0, 0, 26);
    for (let f = 0; f < 3; f++) {
      for (const sx of [-9, 9]) {
        this.box(g, 8, 1, 7, 0xfff6b0, sx, 15, 14 + f * 14, 0x555500);
      }
    }
  }

  tower(g: THREE.Group): void {
    this.box(g, 30, 30, 70, 0x2b2f3d, 0, 0, 35);
    this.box(g, 32, 4, 60, 0x38e1ff, 0, 0, 35, 0x0a3344);
    this.box(g, 34, 34, 3, 0xff3fb4, 0, 0, 71, 0x441133);
  }

  mountain(g: THREE.Group, color: number, size: number): void {
    const m = new THREE.Mesh(this.assets.cylinder(`bld-mtn:${size}`, 2 * ZOOM, size * ZOOM, size * 1.2 * ZOOM, 7), this.mat(color, 0, 8));
    m.position.set(0, 0, (size * 0.4) * ZOOM);
    g.add(m);
  }

  cafe(g: THREE.Group): void {
    this.rbox(g, 36, 26, 16, 0xfff3e0, 0, 0, 8);
    this.box(g, 38, 28, 2.5, 0x3f8efc, 0, 0, 17);
    this.box(g, 20, 1, 8, 0x1e2430, 0, 13, 5);
  }

  busStop(g: THREE.Group): void {
    this.box(g, 24, 2, 14, 0x5b6570, -11, 0, 7);
    this.box(g, 24, 2, 14, 0x5b6570, 11, 0, 7);
    this.box(g, 26, 12, 2, 0x3f8efc, 0, 0, 15);
  }

  fence(g: THREE.Group): void {
    for (let i = -2; i <= 2; i++) this.box(g, 2, 2, 10, 0x8a5f36, i * 8, 0, 5);
    this.box(g, 40, 1.5, 2, 0x8a5f36, 0, 0, 8);
  }

  water(g: THREE.Group, color: number): void {
    const m = new THREE.Mesh(
      this.assets.box(`bld-water:${color}`, 60 * ZOOM, 30 * ZOOM, 2 * ZOOM),
      this.mat(color, 0, 110),
    );
    m.position.set(0, 0, 1 * ZOOM);
    g.add(m);
  }
}
