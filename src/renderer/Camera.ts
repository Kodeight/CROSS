/**
 * Third-person follow camera. Owns ONLY the camera: follows the player
 * from behind with look-ahead, smooth damping, intro positioning and
 * responsive portrait/landscape adjustments. Never owns the world.
 *
 * Framing goal: the playable world fills the entire viewport — no blue
 * bands above/below, no visible world boundaries. The camera sits
 * lower and closer so the road/lane system dominates the screen while
 * still showing several lanes ahead.
 */
import * as THREE from 'three';
import { isTouchDevice } from '../utils/DeviceUtils';

export interface CameraTarget {
  x: number;
  y: number;
}

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  private lookCurrent = new THREE.Vector3();
  private readonly lookDesired = new THREE.Vector3();
  private introT = 0;
  private introActive = false;
  private introFrom = new THREE.Vector3();
  private reducedMotion = false;

  // Tunables — closer and lower so the playable world fills the screen.
  // distBehind is measured in world units along z; heightAbove along y.
  // The lane height = POSITION_WIDTH * ZOOM = 84 units.
  // Camera sits just above lane height so the road fills vertical FOV,
  // with enough forward sight to see upcoming traffic.
  private readonly distBehind = 230;
  private readonly heightAbove = 95;
  private readonly lookAhead = 180;

  // Mobile portrait: slightly wider FOV + lower height for more forward
  // visibility while keeping the character centered and readable.
  private readonly mobileFov = 70;
  private readonly desktopFov = 56;

  constructor() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(this.desktopFov, aspect, 0.5, 9000);
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
  }

  onResize(): void {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.fov = h > w ? this.mobileFov : this.desktopFov;
    this.camera.updateProjectionMatrix();
  }

  /** Cinematic entrance: start elevated, settle behind the player. */
  beginIntro(playerPos: THREE.Vector3): void {
    this.introActive = true;
    this.introT = 0;
    this.introFrom.copy(this.camera.position);
    if (this.introFrom.lengthSq() < 1) {
      this.introFrom.set(playerPos.x, playerPos.y - this.distBehind * 1.4, this.heightAbove * 1.6);
    }
    this.lookCurrent.set(playerPos.x, playerPos.y + this.lookAhead * 0.4, 0);
  }

  snapToPlayer(playerPos: THREE.Vector3): void {
    this.camera.position.set(playerPos.x, playerPos.y - this.distBehind, this.heightAbove);
    this.lookCurrent.set(playerPos.x, playerPos.y + this.lookAhead, 0);
    this.camera.lookAt(this.lookCurrent);
  }

  update(dtMs: number, playerPos: THREE.Vector3): void {
    const dt = Math.min(Math.max(dtMs, 0), 100) / 1000;
    const desired = new THREE.Vector3(
      playerPos.x,
      playerPos.y - this.distBehind,
      this.heightAbove,
    );
    this.lookDesired.set(playerPos.x, playerPos.y + this.lookAhead, 0);

    if (this.introActive && !this.reducedMotion) {
      this.introT += dt / 1.1;
      const t = Math.min(this.introT, 1);
      const e = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.introFrom, desired, e);
      this.lookCurrent.lerp(this.lookDesired, Math.min(1, e * 1.2 + 0.05));
      if (t >= 1) this.introActive = false;
    } else {
      const k = this.reducedMotion ? 1 : 1 - Math.pow(0.0015, dt);
      this.camera.position.lerp(desired, Math.min(1, k * 1.15));
      this.lookCurrent.lerp(this.lookDesired, Math.min(1, k * 1.35));
      this.introActive = false;
    }
    this.camera.lookAt(this.lookCurrent);
  }

  /** Screen shake is positional-only and decays — never rotates the camera. */
  shake(amount: number): void {
    if (this.reducedMotion || amount <= 0.3) return;
    this.camera.position.x += (Math.random() - 0.5) * amount;
    this.camera.position.y += (Math.random() - 0.5) * amount;
  }

  get isIntroActive(): boolean {
    return this.introActive;
  }
}
