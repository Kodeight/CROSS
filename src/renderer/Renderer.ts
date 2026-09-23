/**
 * §14 — one THREE.Scene, one renderer. Renderer failure is isolated and
 * marked so boot shows the WebGL screen ONLY for real renderer failure (§23).
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
  }

  static create(container: HTMLElement): GameRenderer {
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
      });
    } catch (err) {
      const e = new RendererError('WebGLRenderer construction failed');
      console.error('CROSS! WebGL initialization failed:', err);
      throw e;
    }
    if (!renderer) throw new RendererError('WebGLRenderer unavailable');

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    const inst = new GameRenderer(container, scene, renderer, hemi, dirLight, backLight);
    inst.onResize();
    console.log('CROSS! WebGL renderer initialized successfully');
    return inst;
  }

  /**
   * Full-bleed viewport sizing driven by the authoritative getActualViewportSize().
   * Sized edge-to-edge covering status bar and behind the iOS home indicator.
   */
  onResize(): void {
    const { width, height } = getActualViewportSize();
    this.renderer.setSize(width, height, true);
    this.cssWidth = width;
    this.cssHeight = height;
    try {
      const canvas = this.renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (this.container) {
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;
      }
    } catch { /* stylesheet covers */ }
  }

  /** §28 — never render above the DPR cap; touch devices get a lower cap. */
  applyQuality(level: QualityLevel): void {
    const profile = QUALITY_PROFILES[level] ?? QUALITY_PROFILES.AUTO;
    const dprCap = isTouchDevice()
      ? Math.min(profile.pixelRatioCap, 1.5)
      : profile.pixelRatioCap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

    // Quality is rendering-only (§6/§67). Antialias is fixed at context
    // creation (true = current LOW baseline); post-creation assignment is
    // a Three.js no-op, so we never touch it here.
    const shadowsOn = profile.shadows;
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

    // Keep the shadow frustum matched to the elevated camera view so
    // MEDIUM/HIGH shadows never clip or produce wrong self-shadowing.
    const d = 900;
    const sc = this.dirLight.shadow.camera;
    if (sc.left !== -d || sc.right !== d || sc.top !== d || sc.bottom !== -d) {
      sc.left = -d;
      sc.right = d;
      sc.top = d;
      sc.bottom = -d;
      sc.updateProjectionMatrix();
    }

    // Materials must recompile only when the shadow pipeline toggles —
    // never on every quality keystroke (avoids hitching mid-game).
    if (shadowToggled) {
      this.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
        if (Array.isArray(mat)) mat.forEach((m) => { m.needsUpdate = true; });
        else if (mat) mat.needsUpdate = true;
      });
    }
    // render.info keeps its default autoReset (per-frame reset). Disabling
    // it without a manual reset would accumulate counters unboundedly.
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  dispose(): void {
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
