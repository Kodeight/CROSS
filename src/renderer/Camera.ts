/**
 * High top-down follow camera for CROSS!. The camera is elevated
 * high above the world looking down at ~50-65° angle from horizontal.
 *
 * Composition:
 *   UPCOMING WORLD (above player in viewport)
 *   TRAFFIC
 *   OBSTACLES
 *   PLAYER (lower-middle of viewport)
 *
 * The world stays stationary in world coordinates. The camera
 * follows the player smoothly with interpolation. Never move the
 * world around the player.
 *
 * Three.js coordinate system for this game:
 *   X = left-right
 *   Y = forward-backward (lane direction, player moves along +Y)
 *   Z = up (vertical)
 */
import * as THREE from 'three';
import { isTouchDevice } from '../utils/DeviceUtils';

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  private lookCurrent = new THREE.Vector3();
  private readonly lookDesired = new THREE.Vector3();
  private introT = 0;
  private introActive = false;
  private introFrom = new THREE.Vector3();
  private reducedMotion = false;

  // Elevated diorama camera parameters.
  // distBehind: distance behind the player along -Y (slightly behind
  //   the movement direction). elevation: height above the world (+Z).
  // lookAhead: how far ahead of the player the camera looks toward (+Y).
  // The camera looks from (px, py - distBehind, elevation) toward
  // (px, py + lookAhead, 0) producing a steep downward angle.
  //
  // Downward angle from horizontal:
  //   elevation / (distBehind + lookAhead) ≈ tan(angle)
  //   520 / (260 + 180) ≈ 1.18 → ≈ 50°
  // The look point ahead of the player pushes the player to the
  // lower-middle of the viewport with the upcoming world above.
  private readonly distBehind = 260;
  private readonly elevation = 520;
  private readonly lookAhead = 180;
  private readonly lookAtZ = 0;

  // FOV: perspective (never orthographic) so farther objects read smaller.
  // Mobile portrait gets a wider FOV for forward visibility.
  private readonly desktopFov = 55;
  private readonly mobileFov = 62;

  // Intro camera start position: higher and more behind for cinematic entry.
  private readonly introDistBehind = 420;
  private readonly introElevation = 640;
  private readonly introLookAhead = 140;

  constructor() {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const w = vv ? vv.width : (typeof window !== 'undefined' ? window.innerWidth : 800);
    const h = vv ? vv.height : (typeof window !== 'undefined' ? window.innerHeight : 600);
    const aspect = w / Math.max(1, h);
    this.camera = new THREE.PerspectiveCamera(this.desktopFov, aspect, 0.5, 9000);
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
  }

  /**
   * Follows the authoritative renderer size (container → renderer →
   * camera: one measurement chain). Falls back to visualViewport/window dims when called
   * before the renderer measured (identical for a fullscreen shell).
   */
  onResize(width?: number, height?: number): void {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const fallbackW = vv ? vv.width : window.innerWidth;
    const fallbackH = vv ? vv.height : window.innerHeight;
    const w = width && width > 0 ? width : fallbackW;
    const h = height && height > 0 ? height : fallbackH;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.fov = h > w ? this.mobileFov : this.desktopFov;
    this.camera.updateProjectionMatrix();
  }

  /** Cinematic entrance: start even higher, smoothly move into gameplay position. */
  beginIntro(playerPos: THREE.Vector3): void {
    this.introActive = true;
    this.introT = 0;
    this.introFrom.copy(this.camera.position);
    if (this.introFrom.lengthSq() < 1) {
      this.introFrom.set(
        playerPos.x,
        playerPos.y - this.introDistBehind,
        this.introElevation,
      );
    }
    this.lookCurrent.set(playerPos.x, playerPos.y + this.introLookAhead, this.lookAtZ);
  }

  snapToPlayer(playerPos: THREE.Vector3): void {
    this.camera.position.set(
      playerPos.x,
      playerPos.y - this.distBehind,
      this.elevation,
    );
    this.lookCurrent.set(playerPos.x, playerPos.y + this.lookAhead, this.lookAtZ);
    this.camera.lookAt(this.lookCurrent);
  }

  update(dtMs: number, playerPos: THREE.Vector3): void {
    const dt = Math.min(Math.max(dtMs, 0), 100) / 1000;
    const desired = new THREE.Vector3(
      playerPos.x,
      playerPos.y - this.distBehind,
      this.elevation,
    );
    this.lookDesired.set(playerPos.x, playerPos.y + this.lookAhead, this.lookAtZ);

    if (this.introActive && !this.reducedMotion) {
      this.introT += dt / 0.9;
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
