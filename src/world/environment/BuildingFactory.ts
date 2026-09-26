/**
 * BuildingFactory — Stylized premium 3D architecture & world landmarks:
 * storefronts with awnings, residential villas with chimneys, high-rise towers,
 * industrial warehouses with smokestacks, ancient temple ruins, and volcanic calderas.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import type { AssetManager } from '../../assets/AssetManager';
import { pick } from '../../utils/Random';

const ZOOM = GAME_CONFIG.zoom;

export class BuildingFactory {
  constructor(private readonly assets: AssetManager) {}

  private mat(color: number, emissive = 0, shininess = 35): THREE.MeshPhongMaterial {
    return this.assets.phong(`bld:${color}:${emissive}:${shininess}`, color, { emissive, shininess });
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
      this.assets.box(`bld:${w}x${h}x${d}`, w * ZOOM, h * ZOOM, d * ZOOM),
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

  smallHouse(g: THREE.Group): void {
    const wall = pick([0xfff3e0, 0xe8f1f8, 0xffe1e1, 0xeef3e4]);
    // Rounded stucco base
    this.rbox(g, 36, 28, 22, wall, 0, 0, 11, 2);
    // Gabled shingled roof
    this.rbox(g, 40, 32, 4, 0xd64045, 0, 0, 23, 1.2);
    // Brick chimney with smoke cap
    this.box(g, 5, 5, 10, 0xa73539, 10, 6, 26);
    this.box(g, 7, 7, 1.8, 0x57606f, 10, 6, 31);
    // Front entrance door & steps
    this.box(g, 8, 2, 12, 0x5a3e22, 0, 14, 6);
    this.box(g, 12, 4, 1.5, 0x8a8f99, 0, 15, 0.7);
    // Glass windows with warm indoor glow
    this.box(g, 9, 1, 8, 0xaee2ff, -9, 14.2, 13, 0, 100);
    this.box(g, 9, 1, 8, 0xaee2ff, 9, 14.2, 13, 0, 100);
  }

  shop(g: THREE.Group): void {
    // Ground floor boutique
    this.rbox(g, 42, 30, 24, 0xfffdf5, 0, 0, 12, 2);
    // Storefront colorful marquee awning
    const awningCol = pick([0x3f8efc, 0xd64045, 0x7ac74f, 0xffa502]);
    this.rbox(g, 44, 32, 4, awningCol, 0, 0, 25, 1.5);
    // Large glass display window with warm illumination
    this.box(g, 26, 1.5, 13, 0xaee2ff, 0, 15, 8.5, 0, 110);
    // Entrance door
    this.box(g, 9, 2, 13, 0x2f3542, -12, 15, 7.5);
  }

  apartment(g: THREE.Group): void {
    // Multi-story modern residential building
    this.rbox(g, 38, 32, 56, pick([0xb9bec7, 0xd9c8a9, 0xc3cad2]), 0, 0, 28, 2.5);
    // Rooftop elevator penthouse / water tower
    this.rbox(g, 16, 16, 10, 0x747d8c, 0, 0, 60, 1.5);
    // Window grid with alternating night lights
    for (let f = 0; f < 3; f++) {
      for (const sx of [-10, 10]) {
        this.box(g, 9, 1.2, 8, 0xfff6b0, sx, 16.2, 16 + f * 15, 0x665500, 90);
      }
    }
  }

  tower(g: THREE.Group): void {
    // Cyberpunk skyscraper
    this.rbox(g, 32, 32, 74, 0x1e2430, 0, 0, 37, 2.5);
    // Neon vertical glass ribbon
    this.box(g, 34, 4, 64, 0x38e1ff, 0, 0, 37, 0x0088aa, 100);
    // Rooftop antenna spire
    this.box(g, 3, 3, 22, 0xff3fb4, 0, 0, 80, 0xff3fb4, 110);
  }

  mountain(g: THREE.Group, color: number, size: number): void {
    const m = new THREE.Mesh(
      this.assets.cylinder(`bld-mtn:${size}:${color}`, 3 * ZOOM, size * ZOOM, size * 1.3 * ZOOM, 8),
      this.mat(color, 0, 15),
    );
    m.position.set(0, 0, (size * 0.45) * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }

  volcanoCaldera(g: THREE.Group, size: number): void {
    // Volcanic cone
    const cone = new THREE.Mesh(
      this.assets.cylinder(`volc-cone:${size}`, (size * 0.45) * ZOOM, size * ZOOM, size * 1.2 * ZOOM, 10),
      this.mat(0x221310, 0, 15),
    );
    cone.position.set(0, 0, (size * 0.4) * ZOOM);
    cone.castShadow = true;
    cone.receiveShadow = true;
    g.add(cone);

    // Glowing bubbling magma caldera in the crater!
    const lava = new THREE.Mesh(
      this.assets.cylinder(`volc-lava:${size}`, (size * 0.4) * ZOOM, (size * 0.4) * ZOOM, 3 * ZOOM, 10),
      this.mat(0xff4757, 0xaa2200, 80),
    );
    lava.position.set(0, 0, (size * 0.95) * ZOOM);
    g.add(lava);
  }

  factoryWarehouse(g: THREE.Group): void {
    // Industrial facility with corrugated walls
    this.rbox(g, 46, 34, 26, 0x57606f, 0, 0, 13, 2);
    // Sawtooth warehouse roof
    this.box(g, 48, 36, 4, 0x2f3542, 0, 0, 27);
    // Tall industrial smokestack
    const stack = new THREE.Mesh(
      this.assets.cylinder('factory-stack', 3.5 * ZOOM, 4.5 * ZOOM, 36 * ZOOM, 8),
      this.mat(0xa73539, 0, 20),
    );
    stack.position.set(16 * ZOOM, 10 * ZOOM, 30 * ZOOM);
    stack.castShadow = true;
    g.add(stack);
    // Industrial rollup loading bay
    this.box(g, 18, 1.5, 14, 0x747d8c, -8, 17, 7.5);
  }

  templeRuins(g: THREE.Group): void {
    // Stepped stone dais
    this.box(g, 44, 34, 3, 0x6e5f4d, 0, 0, 1.5);
    this.box(g, 40, 30, 3, 0x7a6b57, 0, 0, 4.5);
    // 4 Classical columns supporting frieze
    for (const sx of [-14, 14]) {
      for (const sy of [-10, 10]) {
        const col = new THREE.Mesh(
          this.assets.cylinder(`ruin-col:${sx}:${sy}`, 2.6 * ZOOM, 3 * ZOOM, 20 * ZOOM, 8),
          this.mat(0x8c7b65, 0, 15),
        );
        col.position.set(sx * ZOOM, sy * ZOOM, 15 * ZOOM);
        col.castShadow = true;
        g.add(col);
      }
    }
    // Heavy stone lintel architrave on top
    this.box(g, 36, 28, 4, 0x6e5f4d, 0, 0, 26);
  }

  cafe(g: THREE.Group): void {
    this.rbox(g, 38, 28, 18, 0xfff3e0, 0, 0, 9, 2);
    this.rbox(g, 40, 30, 3, 0x3f8efc, 0, 0, 19, 1.2);
    this.box(g, 22, 1.5, 9, 0x1e2430, 0, 14, 6);
  }

  busStop(g: THREE.Group): void {
    // Glass shelter with benches
    this.box(g, 26, 2.5, 15, 0x57606f, -11, 0, 7.5);
    this.box(g, 26, 2.5, 15, 0x57606f, 11, 0, 7.5);
    this.rbox(g, 28, 14, 2.5, 0x3f8efc, 0, 0, 16, 1);
    this.box(g, 18, 6, 2, 0x8a5f36, 0, 0, 5); // Bench inside
  }

  fence(g: THREE.Group): void {
    for (let i = -2; i <= 2; i++) this.box(g, 2.5, 2.5, 11, 0x8a5f36, i * 8, 0, 5.5);
    this.box(g, 42, 1.8, 2.2, 0x8a5f36, 0, 0, 9);
    this.box(g, 42, 1.8, 2.2, 0x8a5f36, 0, 0, 4);
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
