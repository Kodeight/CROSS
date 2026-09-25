/**
 * Menu 3D previews (characters + worlds). Centrally owned by UIManager:
 * renderers are created on open and fully disposed on close.
 * Worlds render as full rich living 3D dioramas with zero empty blue voids.
 */
import * as THREE from 'three';
import { CHARACTERS } from '../config/characters.config';
import type { World } from '../world/World';
import type { CharacterFactory } from '../player/CharacterFactory';
import type { VehicleFactory } from '../world/environment/VehicleFactory';
import type { TreeFactory } from '../world/environment/TreeFactory';
import type { PropFactory } from '../world/environment/PropFactory';
import type { AssetManager } from '../assets/AssetManager';

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
  private holdUntil = 0;

  constructor(private readonly factory: CharacterFactory, private readonly reducedMotion: () => boolean) {}

  hold(ms = 900): void {
    this.holdUntil = performance.now() + ms;
  }

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
        const held = performance.now() < this.holdUntil;
        for (const it of this.items) {
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
  private holdUntil = 0;

  constructor(
    private readonly assets: AssetManager,
    private readonly vehicles: VehicleFactory,
    private readonly trees: TreeFactory,
    private readonly props: PropFactory,
    private readonly reducedMotion: () => boolean,
  ) {}

  hold(ms = 900): void {
    this.holdUntil = performance.now() + ms;
  }

  open(canvases: Array<{ canvas: HTMLCanvasElement; world: World }>): void {
    this.close();
    if (canvases.length === 0) return;
    for (const entry of canvases) {
      try {
        const renderer = new THREE.WebGLRenderer({ canvas: entry.canvas, alpha: false, antialias: true });
        renderer.setPixelRatio(1);
        const W = entry.canvas.clientWidth || 240;
        const H = entry.canvas.clientHeight || 160;
        renderer.setSize(W, H, false);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;

        const world = entry.world.config;
        const sc = new THREE.Scene();

        // 1. Atmosphere & Fog: seamless background matching world palette (NO BLUE VOID)
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
        dl.shadow.camera.near = 10;
        dl.shadow.camera.far = 300;
        dl.shadow.camera.left = -90;
        dl.shadow.camera.right = 90;
        dl.shadow.camera.top = 90;
        dl.shadow.camera.bottom = -90;
        sc.add(dl);

        // 3. Expansive Diorama Ground (covers entire canvas area seamlessly)
        const groundGeo = new THREE.BoxGeometry(460, 460, 12);
        const groundMat = new THREE.MeshPhongMaterial({ color: world.safe, flatShading: true });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.z = -6;
        ground.receiveShadow = true;
        sc.add(ground);

        // Upper biome accent strip / hillside
        const shoulderGeo = new THREE.PlaneGeometry(460, 60);
        const shoulderMat = new THREE.MeshPhongMaterial({ color: world.safeDark, flatShading: true });
        const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        shoulder.position.set(0, 42, 0.2);
        shoulder.receiveShadow = true;
        sc.add(shoulder);

        // 4. Multi-lane Roadway / Environment Strips
        const roadGeo = new THREE.PlaneGeometry(460, 38);
        const roadMat = new THREE.MeshPhongMaterial({ color: world.road });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.position.set(0, 6, 0.4);
        road.receiveShadow = true;
        sc.add(road);

        // Road dashed center markings
        for (let d = -6; d <= 6; d++) {
          const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 2.2),
            new THREE.MeshBasicMaterial({ color: world.marking }),
          );
          dash.position.set(d * 24, 6, 0.6);
          sc.add(dash);
        }

        // Sidewalk / Divider Curb
        const curbGeo = new THREE.BoxGeometry(460, 4, 2.4);
        const curbMat = new THREE.MeshPhongMaterial({ color: world.walk || world.safeDark });
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(0, -14, 1.2);
        curb.receiveShadow = true;
        sc.add(curb);

        // World-Specific Ground Elements (Beach Water, Crosswalks, Dirt Trails)
        if (world.id === 'beach') {
          // Turquoise Ocean Wave Strip
          const waterGeo = new THREE.PlaneGeometry(460, 50);
          const waterMat = new THREE.MeshPhongMaterial({
            color: 0x24b2d3,
            specular: 0x88e6ff,
            shininess: 90,
          });
          const water = new THREE.Mesh(waterGeo, waterMat);
          water.position.set(0, -42, 0.5);
          sc.add(water);

          // White Surf Foam Line
          const foamGeo = new THREE.PlaneGeometry(460, 3);
          const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const foam = new THREE.Mesh(foamGeo, foamMat);
          foam.position.set(0, -17.5, 0.6);
          sc.add(foam);
        } else if (world.id === 'city') {
          // Zebra Crosswalk Lines
          for (let z = -2; z <= 2; z++) {
            const stripe = new THREE.Mesh(
              new THREE.PlaneGeometry(4, 28),
              new THREE.MeshBasicMaterial({ color: 0xffffff }),
            );
            stripe.position.set(-35 + z * 8, 6, 0.55);
            sc.add(stripe);
          }
        } else if (world.id === 'snow') {
          // Icy Frost Accents
          const icePatch = new THREE.Mesh(
            new THREE.PlaneGeometry(90, 24),
            new THREE.MeshPhongMaterial({ color: 0xcfe4ff, shininess: 80 }),
          );
          icePatch.position.set(30, -32, 0.3);
          sc.add(icePatch);
        }

        // 5. Rich 3D World Props & Scenery
        const decor = new THREE.Group();

        switch (world.id) {
          case 'city': {
            // Street trees
            const t1 = new THREE.Group();
            this.trees.streetTree(t1);
            t1.position.set(-45, 42, 0);
            t1.scale.set(0.85, 0.85, 0.85);
            decor.add(t1);

            const t2 = new THREE.Group();
            this.trees.streetTree(t2);
            t2.position.set(48, 40, 0);
            t2.scale.set(0.95, 0.95, 0.95);
            decor.add(t2);

            // Sidewalk props
            const planter = new THREE.Group();
            this.props.planter(planter);
            planter.position.set(12, -28, 0);
            decor.add(planter);

            const hydrant = new THREE.Group();
            this.props.hydrant(hydrant);
            hydrant.position.set(-20, -26, 0);
            decor.add(hydrant);

            const trash = new THREE.Group();
            this.props.trashCan(trash);
            trash.position.set(38, -26, 0);
            decor.add(trash);
            break;
          }
          case 'jungle': {
            const p1 = new THREE.Group();
            this.trees.palm(p1);
            p1.position.set(-48, 44, 0);
            decor.add(p1);

            const p2 = new THREE.Group();
            this.trees.vineTree(p2);
            p2.position.set(45, 42, 0);
            decor.add(p2);

            const r1 = new THREE.Group();
            this.props.jungleRock(r1);
            r1.position.set(-15, -28, 0);
            decor.add(r1);

            const b1 = new THREE.Group();
            this.trees.bigLeaf(b1);
            b1.position.set(22, -26, 0);
            decor.add(b1);
            break;
          }
          case 'desert': {
            const c1 = new THREE.Group();
            this.trees.cactus(c1);
            c1.position.set(-42, 42, 0);
            decor.add(c1);

            const c2 = new THREE.Group();
            this.trees.cactus(c2);
            c2.position.set(45, 44, 0);
            c2.scale.set(0.8, 0.8, 0.8);
            decor.add(c2);

            const r1 = new THREE.Group();
            this.props.desertRock(r1);
            r1.position.set(-18, -28, 0);
            decor.add(r1);

            const db = new THREE.Group();
            this.trees.deadBush(db);
            db.position.set(25, -26, 0);
            decor.add(db);
            break;
          }
          case 'snow': {
            const pine1 = new THREE.Group();
            this.trees.pine(pine1, true);
            pine1.position.set(-45, 42, 0);
            decor.add(pine1);

            const pine2 = new THREE.Group();
            this.trees.pine(pine2, true);
            pine2.position.set(42, 40, 0);
            pine2.scale.set(0.9, 0.9, 0.9);
            decor.add(pine2);

            const sb = new THREE.Group();
            this.props.snowBank(sb);
            sb.position.set(-15, -28, 0);
            decor.add(sb);

            const ir = new THREE.Group();
            this.props.iceRock(ir);
            ir.position.set(28, -26, 0);
            decor.add(ir);
            break;
          }
          case 'neon': {
            const p1 = new THREE.Group();
            this.props.holoPillar(0x00ffff)(p1);
            p1.position.set(-46, 42, 0);
            decor.add(p1);

            const p2 = new THREE.Group();
            this.props.holoPillar(0xff00aa)(p2);
            p2.position.set(46, 42, 0);
            decor.add(p2);

            const sign = new THREE.Group();
            this.props.neonSign(sign);
            sign.position.set(-15, -28, 0);
            decor.add(sign);

            const barrier = new THREE.Group();
            this.props.glowBarrier(barrier);
            barrier.position.set(24, -28, 0);
            decor.add(barrier);
            break;
          }
          case 'beach': {
            const palm = new THREE.Group();
            this.trees.palm(palm);
            palm.position.set(-45, 42, 0);
            decor.add(palm);

            const umb = new THREE.Group();
            this.props.umbrella(umb);
            umb.position.set(35, 38, 0);
            decor.add(umb);

            const palm2 = new THREE.Group();
            this.trees.palm(palm2);
            palm2.position.set(48, -28, 0);
            palm2.scale.set(0.8, 0.8, 0.8);
            decor.add(palm2);
            break;
          }
          default: {
            const t = new THREE.Group();
            this.trees.streetTree(t);
            t.position.set(-40, 40, 0);
            decor.add(t);
            break;
          }
        }

        sc.add(decor);

        // 6. Active Moving Themed Vehicle
        const kinds = world.carKinds.length ? world.carKinds : ['car'];
        const veh = this.vehicles.create(kinds[0]);
        veh.position.set(-40, 6, 0);
        veh.castShadow = true;
        sc.add(veh);

        // 7. Isometric Camera (tight, filling, zero empty borders)
        const cam = new THREE.PerspectiveCamera(34, W / H, 1, 1000);
        cam.position.set(100, -125, 105);
        cam.lookAt(0, 0, 8);

        this.items.push({
          renderer,
          scene: sc,
          camera: cam,
          vehicle: veh,
          t: Math.random() * 10,
        });
      } catch (err) {
        console.warn('World preview init error:', err);
      }
    }

    if (!this.items.length) return;
    this.running = true;

    const loop = () => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      try {
        const held = performance.now() < this.holdUntil;
        this.items.forEach((it, i) => {
          it.t += 0.016;
          if (!this.reducedMotion() && !held) {
            // Smooth vehicle traversal back and forth with speed
            it.vehicle.position.x = Math.sin(it.t * 0.85) * 55;
          }
          it.camera.position.x = 100 + Math.sin((it.t + i) * 0.3) * 8;
          it.camera.lookAt(0, 0, 8);
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
