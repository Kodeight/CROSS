/**
 * Menu 3D previews (characters + worlds). Centrally owned by UIManager:
 * renderers are created on open and fully disposed on close — one bad
 * preview never breaks the menu. Gameplay uses the single GameRenderer.
 *
 * Context budget: browsers cap simultaneous WebGL contexts (~16 desktop,
 * fewer on mobile). Eagerly creating one renderer per card (19 characters
 * + 20 worlds + main scene ≈ 40) exhausts the budget, the main context
 * gets lost, and Three's next program compile crashes inside
 * gl.shaderSource (createShader returns null on a dead context). So GL
 * contexts are created LAZILY per visible card via IntersectionObserver
 * and released when cards scroll far offscreen — only a handful of
 * contexts ever exist at once. Cards without a live context show their
 * branded placeholder (never an empty dark rectangle).
 */
import * as THREE from 'three';
import { CHARACTERS } from '../config/characters.config';
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
  /** User is actively scrolling the list: freeze rotation (rendering
   * continues) so a vertical swipe never appears to manipulate the 3D
   * models. Scroll listeners call hold(). */
  private holdUntil = 0;

  constructor(private readonly factory: CharacterFactory, private readonly reducedMotion: () => boolean) {}

  hold(ms = 900): void {
    this.holdUntil = performance.now() + ms;
  }

  open(canvases: Array<{ canvas: HTMLCanvasElement; id: string }>): void {
    this.close();
    if (canvases.length === 0) return;
    // Branded placeholder behind every card: the same green ground the 3D
    // scene uses, so a card never reads as an empty dark rectangle even
    // before (or without) its GL context.
    for (const entry of canvases) {
      try {
        entry.canvas.style.background = '#8ab53f';
      } catch { /* placeholder is decorative */ }
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

  /** Create the GL context for a card that scrolled into view. */
  private ensure(e: CharEntry): void {
    if (e.live || e.failed) return;
    try {
      const renderer = new THREE.WebGLRenderer({ canvas: e.canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(1);
      const W = e.canvas.clientWidth || 220;
      const H = e.canvas.clientHeight || 150;
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
      const model = this.factory.create(e.id);
      model.rotation.z = 0.6;
      sc.add(model);
      const cam = new THREE.PerspectiveCamera(32, W / H, 1, 2000);
      cam.position.set(95, -125, 95);
      cam.lookAt(0, 0, 26);
      e.live = { renderer, scene: sc, camera: cam, model };
      // A lost preview context is expendable: drop it and keep the
      // branded placeholder. The main game context is never touched.
      const onLost = (ev: Event) => {
        try {
          ev.preventDefault();
        } catch { /* ignore */ }
        this.release(e);
      };
      e.onLost = onLost;
      e.canvas.addEventListener('webglcontextlost', onLost);
    } catch {
      // No context budget left (or headless): keep the placeholder so the
      // card stays intentional, and never retry in a hot loop.
      e.failed = true;
    }
  }

  /** Release a far-offscreen card's context back to the browser budget. */
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

interface WorldItem {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  vehicles: THREE.Group[];
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

  constructor(private readonly vehicles: VehicleFactory, private readonly reducedMotion: () => boolean) {}

  hold(ms = 900): void {
    this.holdUntil = performance.now() + ms;
  }

  open(canvases: Array<{ canvas: HTMLCanvasElement; world: World }>): void {
    this.close();
    if (canvases.length === 0) return;
    // Branded placeholder: each card shows its world's own ground color,
    // so a card never reads as an empty dark (or blue) rectangle even
    // before (or without) its GL context.
    for (const entry of canvases) {
      try {
        entry.canvas.style.background = hex(entry.world.config.safe);
      } catch { /* placeholder is decorative */ }
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
            it.vehicles.forEach((v, vi) => {
              v.position.x = Math.sin(it.t * 0.7 + vi * Math.PI) * 70;
            });
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
      renderer.shadowMap.enabled = false;
      const world = entry.world.config;
      const sc = new THREE.Scene();
      // Transparent background over the ground-colored placeholder: the
      // frame is filled edge-to-edge with the actual map (no sky box).
      sc.background = null;
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
      // Two real traffic vehicles from this world's own roster, driving
      // the road in opposite phases — the card reads as the living map.
      const kinds = world.carKinds.length ? world.carKinds : ['car'];
      const vehicles: THREE.Group[] = [];
      for (let vi = 0; vi < 2; vi++) {
        const veh = this.vehicles.create(kinds[vi % kinds.length]);
        veh.position.set(vi === 0 ? -50 : 55, 10, 0);
        sc.add(veh);
        vehicles.push(veh);
      }
      // Top-down map framing: the 230x150 ground patch slightly overflows
      // every edge of the frame at any card aspect, so no sky/background
      // blue can ever show around the map.
      const cam = new THREE.PerspectiveCamera(35, W / H, 1, 3000);
      const halfFov = (35 * Math.PI) / 360;
      const dist = Math.max(150 * 0.94, (230 * 0.94) / (W / H)) / (2 * Math.tan(halfFov));
      cam.position.set(0, 10, dist);
      cam.lookAt(0, 10, 0);
      e.live = { renderer, scene: sc, camera: cam, vehicles, t: Math.random() * 10 };
      // A lost preview context is expendable: drop it and keep the branded
      // placeholder. The main game context is never touched.
      const onLost = (ev: Event) => {
        try {
          ev.preventDefault();
        } catch { /* ignore */ }
        this.release(e);
      };
      e.onLost = onLost;
      e.canvas.addEventListener('webglcontextlost', onLost);
    } catch {
      // No context budget left (or headless): keep the placeholder so the
      // card stays intentional, and never retry in a hot loop.
      e.failed = true;
    }
  }

  /** Release a far-offscreen card's context back to the browser budget. */
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
