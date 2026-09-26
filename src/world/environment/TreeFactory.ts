/**
 * TreeFactory — World-specific stylized premium vegetation:
 * smooth-shaded organic canopies, tropical palms, saguaro cacti,
 * snow pines with snow drifts, fantasy glowing toadstool trees,
 * volcanic scorched spires, and jungle flora.
 */
import * as THREE from 'three';
import { GAME_CONFIG } from '../../config/game.config';
import type { AssetManager } from '../../assets/AssetManager';
import { pick } from '../../utils/Random';

const ZOOM = GAME_CONFIG.zoom;

export class TreeFactory {
  constructor(private readonly assets: AssetManager) {}

  private mat(color: number, shininess = 25, emissive = 0): THREE.MeshPhongMaterial {
    return this.assets.phong(`tree:${color}:${shininess}:${emissive}`, color, { shininess, emissive });
  }

  private add(
    parent: THREE.Group,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x * ZOOM, y * ZOOM, z * ZOOM);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** City street tree with sculpted multi-lobed canopy puffs and root flares */
  streetTree(g: THREE.Group): void {
    const trunkMat = this.mat(0x6b4a2a, 15);
    // Main trunk
    this.add(g, this.assets.cylinder('tree-trunk', 2.2 * ZOOM, 3.4 * ZOOM, 18 * ZOOM, 8), trunkMat, 0, 0, 9);
    // Root buttress flares at ground level
    for (const a of [0, 2.1, 4.2]) {
      const rx = Math.cos(a) * 2.8;
      const ry = Math.sin(a) * 2.8;
      const flare = this.add(g, this.assets.cylinder(`tree-root:${a}`, 0.8 * ZOOM, 2.2 * ZOOM, 5 * ZOOM, 6), trunkMat, rx, ry, 2.5);
      flare.rotation.x = Math.sin(a) * 0.35;
      flare.rotation.y = Math.cos(a) * 0.35;
    }

    // Layered multi-sphere cloud canopy
    const leafPrimary = this.mat(0x4a7c59, 20);
    const leafLight = this.mat(0x5da53a, 20);
    const leafDark = this.mat(0x355e3b, 20);

    // Central crown
    const cMain = this.add(g, this.assets.sphere('tree-c-main', 10 * ZOOM, 10, 8), leafPrimary, 0, 0, 24);
    cMain.scale.set(1.05, 1.05, 0.9);

    // Flanking organic foliage puffs
    const c1 = this.add(g, this.assets.sphere('tree-c-puff1', 7 * ZOOM, 9, 7), leafLight, 4.5, 3, 21);
    c1.scale.set(1, 0.95, 0.85);

    const c2 = this.add(g, this.assets.sphere('tree-c-puff2', 6.5 * ZOOM, 9, 7), leafDark, -4.5, 2, 22);
    c2.scale.set(0.95, 1, 0.8);

    const c3 = this.add(g, this.assets.sphere('tree-c-puff3', 6 * ZOOM, 8, 6), leafLight, 1, -4.5, 20);
    c3.scale.set(0.9, 0.9, 0.85);
  }

  /** Beach tropical coconut palm with segmented curved trunk and drooping fronds */
  palm(g: THREE.Group): void {
    const trunkMat = this.mat(0x8a5f36, 15);
    let x = 0;
    let y = 0;

    // Segmented curved trunk with trunk ring notches
    for (let i = 0; i < 5; i++) {
      x += 1.4;
      y += pick([-0.3, 0.3]);
      const seg = this.add(
        g,
        this.assets.cylinder(`palm-t${i}`, 2.2 * ZOOM, 2.8 * ZOOM, 8.5 * ZOOM, 8),
        trunkMat,
        x,
        y,
        4.5 + i * 7.5,
      );
      seg.rotation.y = -0.12 * i;
    }

    const frondMat = this.mat(0x3f9f4f, 25);
    const headX = x;
    const headY = y;
    const headZ = 40;

    // 7 Arched drooping palm fronds radiating outwards
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const frond = this.add(
        g,
        this.assets.sphere(`palm-f${i}`, 3.5 * ZOOM, 8, 6),
        frondMat,
        headX + Math.cos(a) * 9.5,
        headY + Math.sin(a) * 9.5,
        headZ - 1.5,
      );
      frond.scale.set(2.8, 0.85, 0.45);
      frond.rotation.z = a;
      frond.rotation.x = Math.sin(a) * 0.35;
      frond.rotation.y = -Math.cos(a) * 0.35;
    }

    // Coconut cluster under crown
    const nutMat = this.mat(0x5a3e22, 10);
    this.add(g, this.assets.sphere('palm-nut1', 2.2 * ZOOM, 8, 6), nutMat, headX + 2, headY + 1.2, headZ - 4);
    this.add(g, this.assets.sphere('palm-nut2', 2.1 * ZOOM, 8, 6), nutMat, headX - 1.8, headY - 1, headZ - 4);
    this.add(g, this.assets.sphere('palm-nut3', 2 * ZOOM, 8, 6), nutMat, headX + 0.5, headY - 2, headZ - 4.5);
  }

  /** Broad jungle leaf cluster with tropical flowers */
  bigLeaf(g: THREE.Group): void {
    const leafMat = this.mat(0x2e7d32, 30);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = this.add(
        g,
        this.assets.sphere(`jungle-leaf${i}`, 4.5 * ZOOM, 8, 6),
        leafMat,
        Math.cos(a) * 6,
        Math.sin(a) * 6,
        8 + (i % 2) * 4,
      );
      leaf.scale.set(2.2, 0.75, 0.35);
      leaf.rotation.z = a;
      leaf.rotation.x = Math.sin(a) * 0.25;
    }
    // Exotic tropical flower in center
    this.add(g, this.assets.sphere('jungle-flower', 2.8 * ZOOM, 8, 6), this.mat(0xff4757, 40), 0, 0, 11);
  }

  /** Dense jungle vine tree with twisting lianas */
  vineTree(g: THREE.Group): void {
    const trunkMat = this.mat(0x5a4128, 12);
    this.add(g, this.assets.cylinder('vine-trunk', 3.2 * ZOOM, 4.5 * ZOOM, 24 * ZOOM, 8), trunkMat, 0, 0, 12);

    // Hanging aerial lianas / vines
    const vineMat = this.mat(0x35682d, 15);
    for (let i = 0; i < 3; i++) {
      const va = (i / 3) * Math.PI * 2;
      const vx = Math.cos(va) * 3.8;
      const vy = Math.sin(va) * 3.8;
      this.add(g, this.assets.cylinder(`vine-liana${i}`, 0.6 * ZOOM, 0.6 * ZOOM, 16 * ZOOM, 6), vineMat, vx, vy, 11);
    }

    // Deep canopy
    const leafMat = this.mat(0x27ae60, 20);
    const c = this.add(g, this.assets.sphere('vine-canopy', 12 * ZOOM, 10, 8), leafMat, 0, 0, 28);
    c.scale.set(1.15, 1.1, 0.85);
  }

  /** Sculpted rounded shrub with tiny berry clusters */
  bush(g: THREE.Group): void {
    const b = this.add(g, this.assets.sphere('bush-body', 6.5 * ZOOM, 9, 7), this.mat(0x4a7c59, 20), 0, 0, 5.5);
    b.scale.set(1.25, 1.1, 0.75);

    // Red berry accents
    const berryMat = this.mat(0xff4757, 50);
    this.add(g, this.assets.sphere('bush-berry1', 1.2 * ZOOM, 6, 5), berryMat, 3, 4, 7);
    this.add(g, this.assets.sphere('bush-berry2', 1.1 * ZOOM, 6, 5), berryMat, -4, 2, 6.5);
    this.add(g, this.assets.sphere('bush-berry3', 1.2 * ZOOM, 6, 5), berryMat, 1, -4.5, 7.5);
  }

  /** Desert Saguaro cactus with ribbed trunk and staggered upward arms */
  cactus(g: THREE.Group): void {
    const cactusMat = this.mat(0x3f8f4f, 15);
    // Main ribbed body
    this.add(g, this.assets.cylinder('cactus-main', 3.2 * ZOOM, 3.6 * ZOOM, 22 * ZOOM, 10), cactusMat, 0, 0, 11);
    this.add(g, this.assets.sphere('cactus-top', 3.2 * ZOOM, 8, 6), cactusMat, 0, 0, 22);

    // Left arm (lower)
    this.add(g, this.assets.cylinder('cactus-arm-l-h', 1.8 * ZOOM, 1.8 * ZOOM, 5 * ZOOM, 7), cactusMat, -3.8, 0, 11);
    this.add(g, this.assets.cylinder('cactus-arm-l-v', 1.8 * ZOOM, 1.8 * ZOOM, 9 * ZOOM, 7), cactusMat, -6.2, 0, 15);
    this.add(g, this.assets.sphere('cactus-arm-l-top', 1.8 * ZOOM, 7, 5), cactusMat, -6.2, 0, 19.5);

    // Right arm (higher)
    this.add(g, this.assets.cylinder('cactus-arm-r-h', 1.8 * ZOOM, 1.8 * ZOOM, 5 * ZOOM, 7), cactusMat, 3.8, 0, 14);
    this.add(g, this.assets.cylinder('cactus-arm-r-v', 1.8 * ZOOM, 1.8 * ZOOM, 8 * ZOOM, 7), cactusMat, 6.2, 0, 18);
    this.add(g, this.assets.sphere('cactus-arm-r-top', 1.8 * ZOOM, 7, 5), cactusMat, 6.2, 0, 22);

    // Yellow flower on top
    this.add(g, this.assets.sphere('cactus-flower', 1.6 * ZOOM, 7, 5), this.mat(0xffc93c, 40), 0, 0, 24.5);
  }

  /** Desert tumbleweed / dry scrub */
  deadBush(g: THREE.Group): void {
    const b = this.add(g, this.assets.sphere('dead-scrub', 4.5 * ZOOM, 7, 6), this.mat(0x9a7b4f, 10), 0, 0, 4.5);
    b.scale.set(1.2, 1, 0.7);
  }

  /** Layered alpine pine tree with cascading skirts and optional snow caps */
  pine(g: THREE.Group, snowCap: boolean): void {
    const trunkMat = this.mat(0x5a4128, 12);
    this.add(g, this.assets.cylinder('pine-trunk', 2.2 * ZOOM, 2.8 * ZOOM, 10 * ZOOM, 8), trunkMat, 0, 0, 5);

    const green = this.mat(0x2f6b4f, 20);
    // Lower tier
    const t1 = this.add(g, this.assets.cylinder('pine-1', 2 * ZOOM, 10 * ZOOM, 11 * ZOOM, 10), green, 0, 0, 12);
    // Mid tier
    const t2 = this.add(g, this.assets.cylinder('pine-2', 1.6 * ZOOM, 7.5 * ZOOM, 10 * ZOOM, 10), green, 0, 0, 20);
    // Top tier
    const t3 = this.add(g, this.assets.cylinder('pine-3', 0.8 * ZOOM, 5 * ZOOM, 9 * ZOOM, 10), green, 0, 0, 27);

    if (snowCap) {
      const snowMat = this.mat(0xffffff, 80);
      // Snow drifts resting on tiers
      this.add(g, this.assets.cylinder('pine-snow-top', 0.6 * ZOOM, 4.2 * ZOOM, 3.5 * ZOOM, 10), snowMat, 0, 0, 31);
      this.add(g, this.assets.cylinder('pine-snow-mid', 1.4 * ZOOM, 6.2 * ZOOM, 2.8 * ZOOM, 10), snowMat, 0, 0, 23.5);
    }
  }

  /** Fantasy giant mushroom tree with glowing fairy gills (Enchanted Forest) */
  glowMushroomTree(g: THREE.Group): void {
    // Pale organic stalk
    const stalkMat = this.mat(0xf5f6fa, 20);
    this.add(g, this.assets.cylinder('mush-stalk', 2.5 * ZOOM, 4 * ZOOM, 20 * ZOOM, 8), stalkMat, 0, 0, 10);

    // Glowing fairy gills
    const gillMat = this.mat(0x2ed573, 50, 0x005522);
    this.add(g, this.assets.cylinder('mush-gills', 9.5 * ZOOM, 2.5 * ZOOM, 2.5 * ZOOM, 12), gillMat, 0, 0, 19.5);

    // Red/purple spotted cap
    const capMat = this.mat(0x9b59b6, 30);
    const cap = this.add(g, this.assets.sphere('mush-cap', 10 * ZOOM, 12, 8), capMat, 0, 0, 23);
    cap.scale.set(1.1, 1.1, 0.6);

    // White polka dot spots on cap
    const spotMat = this.mat(0xffffff, 60);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      this.add(g, this.assets.sphere(`mush-spot${i}`, 1.8 * ZOOM, 6, 5), spotMat, Math.cos(a) * 6, Math.sin(a) * 6, 26);
    }
  }

  /** Volcanic scorched basalt spire with glowing magma fissures (Volcano) */
  magmaSpire(g: THREE.Group): void {
    const rockMat = this.mat(0x221310, 15);
    this.add(g, this.assets.cylinder('volc-spire', 1.8 * ZOOM, 5.5 * ZOOM, 26 * ZOOM, 7), rockMat, 0, 0, 13);

    // Glowing magma vein cracks
    const lavaMat = this.mat(0xff4757, 60, 0xaa2200);
    for (const z of [8, 16, 22]) {
      this.add(g, this.assets.box(`lava-seam:${z}`, 3.5 * ZOOM, 3.5 * ZOOM, 1.8 * ZOOM), lavaMat, 0, 0, z);
    }
  }
}
