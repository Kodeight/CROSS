/**
 * Menu 3D previews (characters + worlds). Centrally owned by UIManager:
 * renderers are created on open and fully disposed on close — one bad
 * preview never breaks the menu. Gameplay uses the single GameRenderer.
 *
 * World Previews: Every world card features a unique, handcrafted 3D miniature
 * diorama/globe representing that world's living biome with signature props
 * and custom lighting (no gameplay roads or moving cars).
 */
import * as THREE from 'three';
import { CHARACTERS } from '../config/characters.config';
import type { WorldConfig } from '../config/worlds.config';
import type { World } from '../world/World';
import type { CharacterFactory } from '../player/CharacterFactory';
import type { VehicleFactory } from '../world/environment/VehicleFactory';

function hex(color: number): string {
  return `#${(color >>> 0).toString(16).padStart(6, '0')}`;
}

/** Nearest scroll container, so visibility is measured against the list. */
function scrollRoot(el: HTMLElement): HTMLElement | null {
  try {
    return el.closest('.panel-scroll') as HTMLElement | null;
  } catch {
    return null;
  }
}

interface CharItem {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  model: THREE.Group;
}

interface CharEntry {
  canvas: HTMLCanvasElement;
  id: string;
  live: CharItem | null;
  failed: boolean;
  onLost: ((e: Event) => void) | null;
}

export class CharacterPreviewManager {
  private entries: CharEntry[] = [];
  private observer: IntersectionObserver | null = null;
  private rafId = 0;
  private running = false;
  private holdUntil = 0;

  constructor(private readonly factory: CharacterFactory, private readonly reducedMotion: () => boolean) {}

  hold(ms = 900): void {
    this.holdUntil = performance.now() + ms;
  }

  open(canvases: Array<{ canvas: HTMLCanvasElement; id: string }>): void {
    this.close();
    if (canvases.length === 0) return;
    for (const entry of canvases) {
      this.entries.push({ canvas: entry.canvas, id: entry.id, live: null, failed: false, onLost: null });
    }
    if (typeof IntersectionObserver === 'undefined') {
      for (const e of this.entries) this.ensure(e);
    } else {
      try {
        const root = canvases.length ? scrollRoot(canvases[0].canvas) : null;
        this.observer = new IntersectionObserver(
          (list) => {
            for (const rec of list) {
              const e = this.entries.find((x) => x.canvas === rec.target);
              if (!e) continue;
              if (rec.isIntersecting) this.ensure(e);
              else this.release(e);
            }
          },
          { root, rootMargin: '200px', threshold: 0 },
        );
        for (const e of this.entries) this.observer.observe(e.canvas);
      } catch {
        for (const e of this.entries) this.ensure(e);
      }
    }
    this.running = true;
    const loop = (t: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      try {
        const held = performance.now() < this.holdUntil;
        for (const e of this.entries) {
          const it = e.live;
          if (!it) continue;
          if (!this.reducedMotion() && !held) {
            it.model.rotation.z += 0.012;
            this.factory.animate(it.model, t || 0);
          }
          it.renderer.render(it.scene, it.camera);
        }
      } catch { /* ignore */ }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Create the GL context for a card that scrolled into view with dedicated studio lighting. */
  private ensure(e: CharEntry): void {
    if (e.live || e.failed) return;
    try {
      const renderer = new THREE.WebGLRenderer({ canvas: e.canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      const W = e.canvas.clientWidth || 220;
      const H = e.canvas.clientHeight || 150;
      renderer.setSize(W, H, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const sc = new THREE.Scene();
      sc.background = null;

      // Studio Lighting Hierarchy:
      // 1. Hemisphere ambient fill
      const hemi = new THREE.HemisphereLight(0xffffff, 0x333d4d, 0.9);
      sc.add(hemi);

      // 2. Key Studio Light (warm direct illumination)
      const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.0);
      keyLight.position.set(45, 65, 90);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 512;
      keyLight.shadow.mapSize.height = 512;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 250;
      keyLight.shadow.bias = -0.001;
      sc.add(keyLight);

      // 3. Fill Light (cool soft opposing tone)
      const fillLight = new THREE.DirectionalLight(0xd0e4ff, 0.45);
      fillLight.position.set(-60, -30, 60);
      sc.add(fillLight);

      // 4. Rim / Silhouette Backlight
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.65);
      rimLight.position.set(0, -90, 70);
      sc.add(rimLight);

      // Studio Pedestal:
      const podiumGroup = new THREE.Group();
      // Upper gold trim bevel
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(20, 20.5, 1.5, 28),
        new THREE.MeshStandardMaterial({ color: 0xFCA71D, metalness: 0.6, roughness: 0.3, flatShading: true }),
      );
      rim.position.y = -0.75;
      podiumGroup.add(rim);

      // Pedestal body
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(20.5, 23, 6, 28),
        new THREE.MeshStandardMaterial({ color: 0x0F2657, roughness: 0.5, metalness: 0.2, flatShading: true }),
      );
      base.position.y = -4.5;
      base.receiveShadow = true;
      podiumGroup.add(base);

      // Pedestal top surface disk
      const topDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(19.8, 19.8, 0.5, 28),
        new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.6 }),
      );
      topDisk.position.y = 0.05;
      topDisk.receiveShadow = true;
      podiumGroup.add(topDisk);

      sc.add(podiumGroup);

      // Character Model
      const model = this.factory.create(e.id);
      model.position.set(0, 0, 0.5);
      model.rotation.z = 0.5; // Initial welcoming dynamic angle
      sc.add(model);

      // Perspective studio camera centered on character
      const cam = new THREE.PerspectiveCamera(36, W / H, 1, 1000);
      cam.position.set(0, 52, 44);
      cam.lookAt(0, 0, 16);

      e.live = { renderer, scene: sc, camera: cam, model };
      e.canvas.classList.add('loaded');

      const onLost = (ev: Event) => {
        try {
          ev.preventDefault();
        } catch { /* ignore */ }
        this.release(e);
      };
      e.onLost = onLost;
      e.canvas.addEventListener('webglcontextlost', onLost);
    } catch {
      e.failed = true;
    }
  }

  private release(e: CharEntry): void {
    const it = e.live;
    e.live = null;
    if (e.onLost) {
      try {
        e.canvas.removeEventListener('webglcontextlost', e.onLost);
      } catch { /* ignore */ }
      e.onLost = null;
    }
    if (!it) return;
    try {
      e.canvas.classList.remove('loaded');
      it.renderer.dispose();
      it.renderer.forceContextLoss();
    } catch { /* ignore */ }
  }

  close(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch { /* ignore */ }
      this.observer = null;
    }
    for (const e of this.entries) this.release(e);
    this.entries = [];
  }
}

/** Crafts a stylized 3D miniature diorama island for each world. */
function createWorldDiorama(world: WorldConfig): THREE.Group {
  const g = new THREE.Group();

  // Base Pedestal / Diorama Island Disk
  const baseGeo = new THREE.CylinderGeometry(28, 25, 7, 24);
  const baseMat = new THREE.MeshPhongMaterial({ color: world.safe, flatShading: true });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -3.5;
  baseMesh.receiveShadow = true;
  g.add(baseMesh);

  const subMat = new THREE.MeshPhongMaterial({ color: world.safeDark, flatShading: true });
  const subMesh = new THREE.Mesh(new THREE.CylinderGeometry(25, 22, 5, 24), subMat);
  subMesh.position.y = -9.5;
  g.add(subMesh);

  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, emissive = 0) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshPhongMaterial({ color, emissive, flatShading: true })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };

  const ball = (r: number, color: number, x: number, y: number, z: number, emissive = 0) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 12, 10),
      new THREE.MeshPhongMaterial({ color, emissive, flatShading: true })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  const id = world.id.toLowerCase();

  switch (id) {
    case 'city': {
      box(12, 22, 12, 0x3a404d, -8, 11, -6);
      box(10, 16, 10, 0x5a6375, 8, 8, 4);
      box(8, 2, 8, 0xffe9a3, -8, 23, -6, 0x665500);
      box(2, 12, 2, 0x22242a, 12, 6, -10);
      ball(3, 0xffc93c, 12, 13, -10, 0x886600);
      ball(5, 0x4a7c59, -12, 5, 10);
      box(10, 5, 5, 0xffc93c, 0, 2.5, 10);
      break;
    }
    case 'jungle': {
      ball(8, 0x2ecc71, -8, 12, -4);
      ball(6, 0x27ae60, 6, 10, 6);
      box(3, 14, 3, 0x5a4128, -8, 7, -4);
      box(2.5, 10, 2.5, 0x5a4128, 6, 5, 6);
      ball(5, 0x7f8c8d, 10, 2.5, -8);
      box(20, 0.5, 6, 0x8a6b3f, 0, 0.3, 0);
      break;
    }
    case 'desert': {
      ball(12, 0xe8c878, -6, 2, -6);
      ball(9, 0xd9b25e, 8, 2, 4);
      box(3, 12, 3, 0x27ae60, -10, 6, 8);
      box(6, 2.5, 2.5, 0x27ae60, -10, 7, 8);
      ball(4, 0xb08b52, 10, 2, -10);
      break;
    }
    case 'snow': {
      ball(10, 0xffffff, -8, 2, -6);
      ball(8, 0xd3ddf0, 8, 2, 6);
      box(2, 6, 2, 0x5a4128, -8, 3, -6);
      const pine1 = new THREE.Mesh(new THREE.ConeGeometry(7, 12, 8), new THREE.MeshPhongMaterial({ color: 0x2f6b4f, flatShading: true }));
      pine1.position.set(-8, 12, -6);
      g.add(pine1);
      const pine2 = new THREE.Mesh(new THREE.ConeGeometry(5, 8, 8), new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true }));
      pine2.position.set(-8, 17, -6);
      g.add(pine2);
      ball(4, 0xbcd8ee, 10, 2, 8);
      break;
    }
    case 'neon': {
      box(4, 18, 4, 0x38e1ff, -10, 9, -6, 0x38e1ff);
      box(4, 22, 4, 0xff3fb4, 8, 11, 4, 0xff3fb4);
      box(14, 8, 2, 0x1e2331, 0, 10, -12);
      box(12, 6, 1, 0x38e1ff, 0, 10, -11, 0x38e1ff);
      break;
    }
    case 'volcano': {
      const vol = new THREE.Mesh(new THREE.ConeGeometry(16, 16, 12, 1, true), new THREE.MeshPhongMaterial({ color: 0x351912, flatShading: true }));
      vol.position.set(0, 8, 0);
      g.add(vol);
      ball(5, 0xff5252, 0, 15, 0, 0xff2200);
      ball(3, 0xff7744, -10, 2, 8, 0xff4400);
      ball(4, 0x4a2820, 10, 2, -8);
      break;
    }
    case 'beach': {
      const water = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 2, 24), new THREE.MeshPhongMaterial({ color: 0x3f8efc, transparent: true, opacity: 0.75, flatShading: true }));
      water.position.y = -3;
      g.add(water);
      box(2.5, 14, 2.5, 0x8a5f36, -8, 7, -4);
      ball(8, 0x2ecc71, -8, 15, -4);
      box(1, 10, 1, 0x8a5f36, 8, 5, 6);
      const umb = new THREE.Mesh(new THREE.ConeGeometry(7, 4, 8), new THREE.MeshPhongMaterial({ color: 0xff5252, flatShading: true }));
      umb.position.set(8, 11, 6);
      g.add(umb);
      break;
    }
    case 'forest': {
      ball(9, 0x2e7d32, -8, 10, -6);
      box(3, 10, 3, 0x5a4128, -8, 5, -6);
      ball(4, 0xe056fd, 8, 4, 6, 0xaa22dd);
      box(1.5, 4, 1.5, 0xffffff, 8, 2, 6);
      box(4, 12, 4, 0x6e5f4d, 0, 6, -10);
      break;
    }
    case 'industrial': {
      box(8, 24, 8, 0x4b5358, -8, 12, -6);
      box(6, 2, 6, 0xffa502, -8, 23, -6, 0xaa6600);
      box(10, 8, 8, 0xd64045, 8, 4, 4);
      box(24, 0.5, 4, 0xffa502, 0, 0.3, 8);
      break;
    }
    case 'temple': {
      box(16, 4, 16, 0x6e5f4d, 0, 2, 0);
      box(10, 4, 10, 0x8c7b65, 0, 6, 0);
      box(3, 14, 3, 0x8c7b65, -10, 7, -10);
      box(3, 14, 3, 0x8c7b65, 10, 7, -10);
      ball(3, 0xffd700, 0, 10, 0, 0x886600);
      break;
    }
    case 'flooded': {
      const water = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 3, 24), new THREE.MeshPhongMaterial({ color: 0x365d84, transparent: true, opacity: 0.8, flatShading: true }));
      water.position.y = -2;
      g.add(water);
      box(10, 10, 10, 0x273c75, -6, 2, -6);
      box(14, 1, 4, 0x6e5636, 6, 0.5, 6);
      ball(2.5, 0xff5252, 10, 1, -8, 0xaa1111);
      break;
    }
    case 'railway': {
      box(28, 1, 14, 0x576574, 0, 0.5, 0);
      for (let i = -10; i <= 10; i += 5) {
        box(1.5, 1.2, 12, 0x6e5636, i, 0.8, 0);
      }
      box(26, 0.8, 1, 0x95a5a6, 0, 1.6, -4);
      box(26, 0.8, 1, 0x95a5a6, 0, 1.6, 4);
      box(10, 6, 6, 0xd64045, -2, 4.5, 0);
      break;
    }
    case 'countryside': {
      box(12, 10, 10, 0xd64045, -6, 5, -4);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 6, 4), new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true }));
      roof.rotation.y = Math.PI / 4;
      roof.position.set(-6, 13, -4);
      g.add(roof);
      ball(5, 0xf5cd79, 8, 2.5, 6);
      box(16, 2, 0.5, 0xffffff, 4, 2, 10);
      break;
    }
    case 'mountain': {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(14, 20, 8), new THREE.MeshPhongMaterial({ color: 0x4a7f93, flatShading: true }));
      peak.position.set(-4, 10, -4);
      g.add(peak);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(7, 8, 8), new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true }));
      cap.position.set(-4, 16, -4);
      g.add(cap);
      const pine = new THREE.Mesh(new THREE.ConeGeometry(5, 10, 7), new THREE.MeshPhongMaterial({ color: 0x2f6b4f, flatShading: true }));
      pine.position.set(10, 5, 6);
      g.add(pine);
      break;
    }
    case 'fantasy': {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(6, 0), new THREE.MeshPhongMaterial({ color: 0xe056fd, emissive: 0x6611aa, flatShading: true }));
      crystal.position.set(0, 12, 0);
      g.add(crystal);
      ball(7, 0x538d3b, -8, 8, -6);
      box(2, 8, 2, 0x535c68, -8, 4, -6);
      ball(5, 0xf8c291, 8, 6, 6);
      break;
    }
    case 'pirate': {
      box(6, 5, 4, 0x6e5636, -6, 2.5, 4);
      ball(1, 0xffd700, -6, 5, 4, 0x886600);
      box(2.5, 12, 2.5, 0x8a5f36, 8, 6, -6);
      ball(7, 0x2ecc71, 8, 13, -6);
      box(2, 8, 2, 0x2c3e50, -8, 4, -8);
      break;
    }
    case 'ocean': {
      const sea = new THREE.Mesh(new THREE.SphereGeometry(26, 16, 14), new THREE.MeshPhongMaterial({ color: 0x0083c7, transparent: true, opacity: 0.82, flatShading: true }));
      sea.position.y = -10;
      g.add(sea);
      ball(4, 0x00d2d3, -6, 2, -4);
      ball(3, 0xff9ff3, 6, 2, 6);
      box(8, 4, 4, 0x3fa8d8, 0, 1, 0);
      break;
    }
    case 'moon': {
      ball(5, 0x576574, -8, 1, -6);
      ball(4, 0x576574, 8, 1, 6);
      box(6, 6, 6, 0xced6e0, 0, 3, 0);
      box(1, 8, 1, 0xffffff, 6, 4, -8);
      box(3, 2, 0.2, 0xff5252, 7.5, 7, -8);
      break;
    }
    case 'sky': {
      ball(10, 0xffffff, -10, 0, -4);
      ball(12, 0xffffff, 0, 1, 0);
      ball(10, 0xffffff, 10, 0, 4);
      box(14, 2, 14, 0xced6e0, 0, 4, 0);
      box(2, 10, 2, 0xffffff, -5, 10, -5);
      box(2, 10, 2, 0xffffff, 5, 10, -5);
      box(12, 2, 2, 0xffd700, 0, 15, -5, 0x554400);
      break;
    }
    case 'alien':
    default: {
      ball(6, 0xa55eea, -8, 5, -6, 0x4400aa);
      ball(5, 0x00f0ff, 8, 4, 6, 0x0066aa);
      const ufo = new THREE.Mesh(new THREE.CylinderGeometry(8, 2, 3, 12), new THREE.MeshPhongMaterial({ color: 0xced6e0, emissive: 0x330066, flatShading: true }));
      ufo.position.set(0, 14, 0);
      g.add(ufo);
      ball(3, 0x00f0ff, 0, 16, 0, 0x00ffff);
      break;
    }
  }

  return g;
}

interface WorldItem {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  diorama: THREE.Group;
  t: number;
}

interface WorldEntry {
  canvas: HTMLCanvasElement;
  world: World;
  live: WorldItem | null;
  failed: boolean;
  onLost: ((e: Event) => void) | null;
}

export class WorldPreviewManager {
  private entries: WorldEntry[] = [];
  private observer: IntersectionObserver | null = null;
  private rafId = 0;
  private running = false;
  private holdUntil = 0;

  constructor(private readonly vehicles: VehicleFactory, private readonly reducedMotion: () => boolean) {
    void this.vehicles;
  }

  hold(ms = 900): void {
    this.holdUntil = performance.now() + ms;
  }

  open(canvases: Array<{ canvas: HTMLCanvasElement; world: World }>): void {
    this.close();
    if (canvases.length === 0) return;
    for (const entry of canvases) {
      this.entries.push({ canvas: entry.canvas, world: entry.world, live: null, failed: false, onLost: null });
    }
    if (typeof IntersectionObserver === 'undefined') {
      for (const e of this.entries) this.ensure(e);
    } else {
      try {
        const root = canvases.length ? scrollRoot(canvases[0].canvas) : null;
        this.observer = new IntersectionObserver(
          (list) => {
            for (const rec of list) {
              const e = this.entries.find((x) => x.canvas === rec.target);
              if (!e) continue;
              if (rec.isIntersecting) this.ensure(e);
              else this.release(e);
            }
          },
          { root, rootMargin: '200px', threshold: 0 },
        );
        for (const e of this.entries) this.observer.observe(e.canvas);
      } catch {
        for (const e of this.entries) this.ensure(e);
      }
    }
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      try {
        const held = performance.now() < this.holdUntil;
        this.entries.forEach((e) => {
          const it = e.live;
          if (!it) return;
          it.t += 0.016;
          if (!this.reducedMotion() && !held) {
            it.diorama.rotation.y += 0.012;
            it.diorama.position.y = Math.sin(it.t * 1.5) * 1.2;
          }
          it.renderer.render(it.scene, it.camera);
        });
      } catch { /* ignore */ }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Create the GL context for a card that scrolled into view. */
  private ensure(e: WorldEntry): void {
    if (e.live || e.failed) return;
    try {
      const entry = { canvas: e.canvas, world: e.world };
      const renderer = new THREE.WebGLRenderer({ canvas: entry.canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(1);
      const W = entry.canvas.clientWidth || 220;
      const H = entry.canvas.clientHeight || 150;
      renderer.setSize(W, H, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const world = entry.world.config;
      const sc = new THREE.Scene();
      sc.background = null;
      sc.add(new THREE.HemisphereLight(world.hemiSky, world.hemiGround, 0.95));
      const dl = new THREE.DirectionalLight(world.dirColor, 0.85);
      dl.position.set(40, 60, 50);
      dl.castShadow = true;
      sc.add(dl);

      const diorama = createWorldDiorama(world);
      sc.add(diorama);

      const cam = new THREE.PerspectiveCamera(38, W / H, 1, 1000);
      cam.position.set(0, 42, 62);
      cam.lookAt(0, 4, 0);

      e.live = { renderer, scene: sc, camera: cam, diorama, t: Math.random() * 10 };
      e.canvas.classList.add('loaded');

      const onLost = (ev: Event) => {
        try {
          ev.preventDefault();
        } catch { /* ignore */ }
        this.release(e);
      };
      e.onLost = onLost;
      e.canvas.addEventListener('webglcontextlost', onLost);
    } catch {
      e.failed = true;
    }
  }

  private release(e: WorldEntry): void {
    const it = e.live;
    e.live = null;
    if (e.onLost) {
      try {
        e.canvas.removeEventListener('webglcontextlost', e.onLost);
      } catch { /* ignore */ }
      e.onLost = null;
    }
    if (!it) return;
    try {
      e.canvas.classList.remove('loaded');
      it.renderer.dispose();
      it.renderer.forceContextLoss();
    } catch { /* ignore */ }
  }

  close(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch { /* ignore */ }
      this.observer = null;
    }
    for (const e of this.entries) this.release(e);
    this.entries = [];
  }
}

export const LOCK_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="#fff"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2.5"/></svg>';

export function characterEntries(): typeof CHARACTERS {
  return CHARACTERS;
}
