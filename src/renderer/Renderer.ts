/**
 * §14 — Single authoritative WebGLRenderer lifecycle manager.
 * Owns the ONE WebGL context for the entire application.
 *
 * Implements robust webglcontextlost / webglcontextrestored handlers,
 * safe render suspension, resource recompilation upon restoration,
 * controlled teardown/disposal, and single-context 2D blit rendering.
 */
import * as THREE from 'three';
import { QUALITY_PROFILES, type QualityLevel } from '../config/game.config';
import { isTouchDevice } from '../utils/DeviceUtils';
import { getActualViewportSize } from '../utils/Viewport';

export class RendererError extends Error {
  readonly rendererFailure = true;
}

export class GameRenderer {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  readonly hemi: THREE.HemisphereLight;
  readonly dirLight: THREE.DirectionalLight;
  readonly backLight: THREE.DirectionalLight;
  /** The fullscreen game container the canvas must exactly fill. */
  readonly container: HTMLElement;
  /** Last CSS size applied — the single measured truth camera follows. */
  cssWidth = 1;
  cssHeight = 1;

  isContextLost = false;
  currentQuality: QualityLevel = 'AUTO';
  shadowsEnabled = true;

  onContextLost?: () => void;
  onContextRestored?: () => void;

  private readonly boundOnContextLost: (e: Event) => void;
  private readonly boundOnContextRestored: () => void;

  private constructor(
    container: HTMLElement,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    hemi: THREE.HemisphereLight,
    dirLight: THREE.DirectionalLight,
    backLight: THREE.DirectionalLight,
  ) {
    this.container = container;
    this.scene = scene;
    this.renderer = renderer;
    this.hemi = hemi;
    this.dirLight = dirLight;
    this.backLight = backLight;

    // Attach authoritative context lifecycle listeners
    this.boundOnContextLost = (event: Event) => {
      event.preventDefault(); // Prevents default browser destruction of WebGL context
      console.warn('CROSS! WebGL context lost. Suspending rendering pipeline.');
      this.isContextLost = true;
      this.onContextLost?.();
    };

    this.boundOnContextRestored = () => {
      console.log('CROSS! WebGL context restored. Re-synchronizing GPU pipeline...');
      this.isContextLost = false;
      this.restoreContext();
      this.onContextRestored?.();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', this.boundOnContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.boundOnContextRestored, false);
  }

  static create(container: HTMLElement): GameRenderer {
    // If container already has canvas elements from a previous crashed run, purge them
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e2430);
    scene.fog = new THREE.Fog(0x1e2430, 2600, 6000);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa66, 0.75);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.62);
    dirLight.position.set(-100, -100, 400);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    const d = 900;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 1500;
    scene.add(dirLight);
    scene.add(dirLight.target);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.25);
    backLight.position.set(200, 300, 100);
    scene.add(backLight);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true, // Enables single-renderer preview blits without extra contexts
      });
    } catch (err) {
      const e = new RendererError('WebGLRenderer construction failed');
      console.error('CROSS! WebGL initialization failed:', err);
      throw e;
    }
    if (!renderer) throw new RendererError('WebGLRenderer unavailable');

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    container.appendChild(renderer.domElement);
    const inst = new GameRenderer(container, scene, renderer, hemi, dirLight, backLight);
    inst.onResize();
    console.log('CROSS! Single authoritative WebGL renderer initialized successfully');
    return inst;
  }

  /**
   * Reinitializes GPU state and recompiles materials upon webglcontextrestored.
   */
  restoreContext(): void {
    try {
      this.renderer.setSize(this.cssWidth, this.cssHeight, true);
      this.applyQuality(this.currentQuality);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.06;
      this.renderer.shadowMap.enabled = this.shadowsEnabled;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Invalidate existing shader programs to trigger clean recompiles
      this.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => { m.needsUpdate = true; });
        } else if (mat) {
          mat.needsUpdate = true;
        }
      });
      console.log('CROSS! Renderer state restored successfully');
    } catch (err) {
      console.error('CROSS! Error restoring WebGL context:', err);
    }
  }

  /**
   * Full-bleed viewport sizing driven by authoritative getActualViewportSize().
   * Sized edge-to-edge covering status bar and behind the iOS home indicator.
   */
  onResize(): void {
    if (this.isContextLost) return;
    const { width, height } = getActualViewportSize();
    this.renderer.setSize(width, height, true);
    this.cssWidth = width;
    this.cssHeight = height;

    try {
      const canvas = this.renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      if (this.container) {
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
      }
    } catch { /* stylesheet covers */ }
  }

  /** §28 — never render above the DPR cap; touch devices get a lower cap. */
  applyQuality(level: QualityLevel): void {
    if (this.isContextLost) return;
    this.currentQuality = level;
    const profile = QUALITY_PROFILES[level] ?? QUALITY_PROFILES.AUTO;
    const dprCap = isTouchDevice()
      ? Math.min(profile.pixelRatioCap, 1.5)
      : profile.pixelRatioCap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

    const shadowsOn = profile.shadows;
    this.shadowsEnabled = shadowsOn;
    const shadowToggled = this.renderer.shadowMap.enabled !== shadowsOn;
    this.renderer.shadowMap.enabled = shadowsOn;

    const s = profile.shadowSize;
    if (shadowsOn && this.dirLight.shadow.mapSize.width !== s) {
      this.dirLight.shadow.mapSize.set(s, s);
      if (this.dirLight.shadow.map) {
        this.dirLight.shadow.map.dispose();
        this.dirLight.shadow.map = null as unknown as THREE.WebGLRenderTarget;
      }
    }

    const d = 900;
    const sc = this.dirLight.shadow.camera;
    if (sc.left !== -d || sc.right !== d || sc.top !== d || sc.bottom !== -d) {
      sc.left = -d;
      sc.right = d;
      sc.top = d;
      sc.bottom = -d;
      sc.updateProjectionMatrix();
    }

    if (shadowToggled) {
      this.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
        if (Array.isArray(mat)) mat.forEach((m) => { m.needsUpdate = true; });
        else if (mat) mat.needsUpdate = true;
      });
    }
  }

  /**
   * Main gameplay render pass. Safely guards against invalid WebGL states.
   */
  render(camera: THREE.Camera): void {
    if (this.isContextLost) return;
    try {
      this.renderer.render(this.scene, camera);
    } catch (err) {
      console.error('CROSS! render error:', err);
    }
  }

  /**
   * Renders a 3D scene directly into an external 2D canvas using the ONE authoritative
   * renderer, eliminating the need for multiple active WebGL contexts.
   */
  renderToCanvas(scene: THREE.Scene, camera: THREE.Camera, targetCanvas: HTMLCanvasElement): void {
    if (this.isContextLost) return;
    const w = targetCanvas.clientWidth || targetCanvas.width || 220;
    const h = targetCanvas.clientHeight || targetCanvas.height || 150;
    if (targetCanvas.width !== w || targetCanvas.height !== h) {
      targetCanvas.width = w;
      targetCanvas.height = h;
    }

    try {
      this.renderer.setSize(w, h, false);
      this.renderer.render(scene, camera);
      const ctx = targetCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(this.renderer.domElement, 0, 0, w, h);
      }
    } catch {
      // Ignore preview draw errors
    } finally {
      // Restore renderer to authoritative viewport size
      this.renderer.setSize(this.cssWidth, this.cssHeight, true);
    }
  }

  /**
   * Controlled disposal: unbinds listeners, frees WebGL memory, and detaches canvas.
   */
  dispose(): void {
    try {
      const canvas = this.renderer.domElement;
      canvas.removeEventListener('webglcontextlost', this.boundOnContextLost);
      canvas.removeEventListener('webglcontextrestored', this.boundOnContextRestored);
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
    } catch (err) {
      console.warn('CROSS! Renderer disposal warning:', err);
    }
  }
}
