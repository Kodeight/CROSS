/**
 * Menu 3D previews (characters + worlds). Centrally owned by UIManager:
 * renderers are created on open and fully disposed on close — one bad
 * preview never breaks the menu. Gameplay uses the single GameRenderer.
 */
import * as THREE from 'three';
import { CHARACTERS } from '../config/characters.config';
import type { World } from '../world/World';
import type { CharacterFactory } from '../player/CharacterFactory';
import type { VehicleFactory } from '../world/environment/VehicleFactory';

interface CharItem {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  model: THREE.Group;
}

export class CharacterPreviewManager {
  private items: CharItem[] = [];
  private rafId = 0;
  private running = false;

  constructor(private readonly factory: CharacterFactory, private readonly reducedMotion: () => boolean) {}

  open(canvases: Array<{ canvas: HTMLCanvasElement; id: string }>): void {
    this.close();
    if (canvases.length === 0) return;
    for (const entry of canvases) {
      try {
        const renderer = new THREE.WebGLRenderer({ canvas: entry.canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(1);
        const W = entry.canvas.clientWidth || 220;
        const H = entry.canvas.clientHeight || 150;
        renderer.setSize(W, H, false);
        renderer.shadowMap.enabled = true;
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
        const cam = new THREE.PerspectiveCamera(32, W / H, 1, 2000);
        cam.position.set(95, -125, 95);
        cam.lookAt(0, 0, 26);
        this.items.push({ renderer, scene: sc, camera: cam, model });
      } catch { /* one bad preview must not break the menu */ }
    }
    if (!this.items.length) return;
    this.running = true;
    const loop = (t: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      try {
        for (const it of this.items) {
          if (!this.reducedMotion()) {
            it.model.rotation.z += 0.012;
            this.factory.animate(it.model, t || 0);
          }
          it.renderer.render(it.scene, it.camera);
        }
      } catch { /* ignore */ }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  close(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    for (const it of this.items) {
      try {
        it.renderer.dispose();
        it.renderer.forceContextLoss();
      } catch { /* ignore */ }
    }
    this.items = [];
  }
}

interface WorldItem {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  vehicle: THREE.Group;
  t: number;
}

export class WorldPreviewManager {
  private items: WorldItem[] = [];
  private rafId = 0;
  private running = false;

  constructor(private readonly vehicles: VehicleFactory, private readonly reducedMotion: () => boolean) {}

  open(canvases: Array<{ canvas: HTMLCanvasElement; world: World }>): void {
    this.close();
    if (canvases.length === 0) return;
    for (const entry of canvases) {
      try {
        const renderer = new THREE.WebGLRenderer({ canvas: entry.canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(1);
        const W = entry.canvas.clientWidth || 220;
        const H = entry.canvas.clientHeight || 150;
        renderer.setSize(W, H, false);
        renderer.shadowMap.enabled = false;
        const world = entry.world.config;
        const sc = new THREE.Scene();
        sc.background = new THREE.Color(world.sky);
        sc.add(new THREE.HemisphereLight(world.hemiSky, world.hemiGround, 0.95));
        const dl = new THREE.DirectionalLight(world.dirColor, 0.75);
        dl.position.set(60, -40, 120);
        sc.add(dl);
        const ground = new THREE.Mesh(
          new THREE.BoxGeometry(230, 150, 6),
          new THREE.MeshPhongMaterial({ color: world.safe, flatShading: true }),
        );
        ground.position.z = -3;
        ground.receiveShadow = true;
        sc.add(ground);
        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(230, 44),
          new THREE.MeshPhongMaterial({ color: world.road }),
        );
        road.position.set(0, 10, 0.6);
        sc.add(road);
        for (let d = -4; d <= 4; d++) {
          const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 2.4),
            new THREE.MeshBasicMaterial({ color: world.marking }),
          );
          dash.position.set(d * 26, 10, 0.9);
          sc.add(dash);
        }
        const kinds = world.carKinds.length ? world.carKinds : ['car'];
        const veh = this.vehicles.create(kinds[0]);
        veh.position.set(-60, 10, 0);
        sc.add(veh);
        const cam = new THREE.PerspectiveCamera(35, W / H, 1, 3000);
        cam.position.set(150, -185, 165);
        cam.lookAt(0, 0, 5);
        this.items.push({ renderer, scene: sc, camera: cam, vehicle: veh, t: Math.random() * 10 });
      } catch { /* ignore */ }
    }
    if (!this.items.length) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      try {
        this.items.forEach((it, i) => {
          it.t += 0.016;
          if (!this.reducedMotion()) {
            it.vehicle.position.x = Math.sin(it.t * 0.7) * 70;
          }
          it.camera.position.x = 150 + Math.sin((it.t + i) * 0.25) * 14;
          it.camera.lookAt(0, 0, 5);
          it.renderer.render(it.scene, it.camera);
        });
      } catch { /* ignore */ }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  close(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    for (const it of this.items) {
      try {
        it.renderer.dispose();
        it.renderer.forceContextLoss();
      } catch { /* ignore */ }
    }
    this.items = [];
  }
}

export const LOCK_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="#fff"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2.5"/></svg>';

export function characterEntries(): typeof CHARACTERS {
  return CHARACTERS;
}
