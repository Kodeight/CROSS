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

  // High top-down camera parameters.
  // distBehind: distance behind the player along -Y (looking forward).
  // elevation: height above the world along +Z.
  // lookAhead: how far ahead of the player the camera looks toward along +Y.
  // The camera looks from (px, py - distBehind, elevation) toward
  // (px, py + lookAhead, laneHeight) producing a steep downward angle.
  //
  // For ~55° downward angle from horizontal:
  //   elevation / (distBehind + lookAhead) ≈ tan(55°) ≈ 1.43
  // With elevation=320 and laneHeight≈80: total horizontal ≈ 240
  // distBehind=180 + lookAhead=60 = 240 → angle ≈ 53°
  // Slightly adjust for visual feel.
  private readonly distBehind = 200;
  private readonly elevation = 350;
  private readonly lookAhead = 100;
  private readonly lookAtZ = 0;

  // FOV: narrower for top-down depth, wider for mobile portrait.
  private readonly desktopFov = 52;
  private readonly mobileFov = 58;

  // Intro camera start position: higher and more behind for cinematic entry.
  private readonly introDistBehind = 350;
  private readonly introElevation = 480;
  private readonly introLookAhead = 80;

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
