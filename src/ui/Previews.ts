/**
 * Menu 3D previews (characters + worlds).
 *
 * All previews render through the ONE authoritative GameRenderer via single-pass
 * 2D canvas blits. Zero extra WebGLRenderers are created, completely preventing
 * iOS Safari context exhaustion and shader initialization crashes.
 */
import * as THREE from 'three';
import { CHARACTERS } from '../config/characters.config';
import type { World } from '../world/World';
import type { CharacterFactory } from '../player/CharacterFactory';
import type { VehicleFactory } from '../world/environment/VehicleFactory';
import type { TreeFactory } from '../world/environment/TreeFactory';
import type { PropFactory } from '../world/environment/PropFactory';
import type { AssetManager } from '../assets/AssetManager';
import type { GameRenderer } from '../renderer/Renderer';

interface CharItem {
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.Camera;
  model: THREE.Group;
}

export class CharacterPreviewManager {
  private items: CharItem[] = [];
  private rafId = 0;
  private running = false;
  private holdUntil = 0;

  constructor(
    private readonly factory: CharacterFactory,
    private readonly reducedMotion: () => boolean,
    private gameRenderer: GameRenderer | null = null,
  ) {}

  setRenderer(renderer: GameRenderer): void {
    this.gameRenderer = renderer;
  }

  hold(ms = 900): void {
    this.holdUntil = performance.now() + ms;
  }

  open(canvases: Array<{ canvas: HTMLCanvasElement; id: string }>): void {
    this.close();
    if (canvases.length === 0 || !this.gameRenderer) return;

    for (const entry of canvases) {
      try {
        const sc = new THREE.Scene();
        sc.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 0.95));
        const dl = new THREE.DirectionalLight(0xffffff, 0.75);
        dl.position.set(60, -40, 120);
        sc.add(dl);

        const ground = new THREE.Mesh(
          new THREE.BoxGeometry(150, 150, 6),
          new THREE.MeshPhongMaterial({ color: 0x8ab53f, flatShading: true }),
        );
        ground.position.z = -3;
        ground.receiveShadow = true;
        sc.add(ground);

        const model = this.factory.create(entry.id);
        model.rotation.z = 0.6;
        sc.add(model);

        const W = entry.canvas.clientWidth || 220;
        const H = entry.canvas.clientHeight || 150;
        const cam = new THREE.PerspectiveCamera(32, W / Math.max(1, H), 1, 2000);
        cam.position.set(95, -125, 95);
        cam.lookAt(0, 0, 26);

        this.items.push({ canvas: entry.canvas, scene: sc, camera: cam, model });
      } catch {
        /* one bad preview must not break the menu */
      }
    }

    if (!this.items.length) return;
    this.running = true;

    const loop = (t: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      if (!this.gameRenderer || this.gameRenderer.isContextLost) return;

      try {
        const held = performance.now() < this.holdUntil;
        for (const it of this.items) {
          if (!this.reducedMotion() && !held) {
            it.model.rotation.z += 0.012;
            this.factory.animate(it.model, t || 0);
          }
          this.gameRenderer.renderToCanvas(it.scene, it.camera, it.canvas);
        }
      } catch {
        /* ignore preview rendering frame hiccups */
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  close(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.items = [];
  }
}

interface WorldItem {
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  vehicle: THREE.Group;
  t: number;
}

export class WorldPreviewManager {
  private items: WorldItem[] = [];
  private rafId = 0;
  private running = false;
  private holdUntil = 0;

  constructor(
    private readonly assets: AssetManager,
    private readonly vehicles: VehicleFactory,
    private readonly trees: TreeFactory,
    private readonly props: PropFactory,
    private readonly reducedMotion: () => boolean,
    private gameRenderer: GameRenderer | null = null,
  ) {}

  setRenderer(renderer: GameRenderer): void {
    this.gameRenderer = renderer;
  }

  hold(ms = 900): void {
    this.holdUntil = performance.now() + ms;
  }

  open(canvases: Array<{ canvas: HTMLCanvasElement; world: World }>): void {
    this.close();
    if (canvases.length === 0 || !this.gameRenderer) return;

    for (const entry of canvases) {
      try {
        const world = entry.world.config;
        const sc = new THREE.Scene();

        // 1. Atmosphere & Fog: seamless background matching world palette
        const bgTone = world.fog || world.safeDark || world.safe;
        sc.background = new THREE.Color(bgTone);
        sc.fog = new THREE.Fog(bgTone, 140, 360);

        // 2. Lighting
        const hemi = new THREE.HemisphereLight(world.hemiSky, world.hemiGround, world.hemiI ?? 0.85);
        sc.add(hemi);
        const dl = new THREE.DirectionalLight(world.dirColor, (world.dirI ?? 0.7) * 1.15);
        dl.position.set(65, -55, 110);
        dl.castShadow = true;
        dl.shadow.mapSize.width = 512;
        dl.shadow.mapSize.height = 512;
        sc.add(dl);

        // 3. Expansive Diorama Ground
        const groundGeo = new THREE.BoxGeometry(460, 460, 12);
        const groundMat = new THREE.MeshPhongMaterial({ color: world.safe, flatShading: true });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.z = -6;
        ground.receiveShadow = true;
        sc.add(ground);

        // Upper biome accent strip
        const shoulderGeo = new THREE.PlaneGeometry(460, 60);
        const shoulderMat = new THREE.MeshPhongMaterial({ color: world.safeDark, flatShading: true });
        const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        shoulder.position.set(0, 42, 0.2);
        shoulder.receiveShadow = true;
        sc.add(shoulder);

        // Asphalt road strip
        const roadGeo = new THREE.PlaneGeometry(460, 72);
        const roadMat = new THREE.MeshPhongMaterial({ color: world.road, flatShading: true });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.position.set(0, -14, 0.4);
        road.receiveShadow = true;
        sc.add(road);

        // White road dashes
        for (let x = -190; x <= 190; x += 38) {
          const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 2.5),
            new THREE.MeshBasicMaterial({ color: 0xffffff }),
          );
          dash.position.set(x, -14, 0.6);
          sc.add(dash);
        }

        // Sidewalk curb
        const curbMat = new THREE.MeshPhongMaterial({ color: world.walk, flatShading: true });
        const curb1 = new THREE.Mesh(new THREE.BoxGeometry(460, 5, 3), curbMat);
        curb1.position.set(0, 23, 1.5);
        sc.add(curb1);

        const curb2 = new THREE.Mesh(new THREE.BoxGeometry(460, 5, 3), curbMat);
        curb2.position.set(0, -51, 1.5);
        sc.add(curb2);

        // World-specific vegetation & props
        const decorBuilders = entry.world.decor;
        const obstacleBuilders = entry.world.obstacles;
        const decorPositions = [-85, -45, 0, 45, 85];

        decorPositions.forEach((posX, idx) => {
          const builder = decorBuilders[idx % decorBuilders.length];
          if (builder) {
            const propGrp = new THREE.Group();
            builder(propGrp);
            propGrp.position.set(posX, 42 + (idx % 2 === 0 ? 6 : -6), 0);
            sc.add(propGrp);
          }
        });

        // Obstacles on lower terrain
        [-70, 20, 75].forEach((posX, idx) => {
          const obstBuilder = obstacleBuilders[idx % obstacleBuilders.length];
          if (obstBuilder) {
            const obstGrp = new THREE.Group();
            obstBuilder(obstGrp);
            obstGrp.position.set(posX, -70, 0);
            sc.add(obstGrp);
          }
        });

        // Driving vehicle on the road
        const carKind = world.carKinds[0] || 'car';
        const v = this.vehicles.create(carKind);
        v.position.set(0, -14, 0);
        v.rotation.z = Math.PI; // Face left along the road
        sc.add(v);

        // Camera setup
        const W = entry.canvas.clientWidth || 240;
        const H = entry.canvas.clientHeight || 160;
        const cam = new THREE.PerspectiveCamera(36, W / Math.max(1, H), 1, 2000);
        cam.position.set(100, -150, 115);
        cam.lookAt(0, 0, 8);

        this.items.push({
          canvas: entry.canvas,
          scene: sc,
          camera: cam,
          vehicle: v,
          t: Math.random() * 10,
        });
      } catch {
        /* ignore single diorama builder errors */
      }
    }

    if (!this.items.length) return;
    this.running = true;

    const loop = () => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      if (!this.gameRenderer || this.gameRenderer.isContextLost) return;

      try {
        const held = performance.now() < this.holdUntil;
        this.items.forEach((it, i) => {
          it.t += 0.016;
          if (!this.reducedMotion() && !held) {
            it.vehicle.position.x = Math.sin(it.t * 0.85) * 55;
          }
          it.camera.position.x = 100 + Math.sin((it.t + i) * 0.3) * 8;
          it.camera.lookAt(0, 0, 8);
          this.gameRenderer!.renderToCanvas(it.scene, it.camera, it.canvas);
        });
      } catch {
        /* ignore preview rendering frame hiccups */
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  close(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.items = [];
  }
}

export const LOCK_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="#fff"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2.5"/></svg>';

export function characterEntries(): typeof CHARACTERS {
  return CHARACTERS;
}
