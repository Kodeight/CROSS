/**
 * Run coin & superpower collectible tracking with juicy mobile-game animations:
 * - Floating/bobbing idle with gentle rotation & glow pulse
 * - Anticipation pop on collection
 * - Smooth acceleration toward the player's root
 * - Fluid scale dissipation without abrupt visibility cuts
 */
import * as THREE from 'three';

export interface CoinAnim {
  mesh: THREE.Object3D;
  off: number;
  baseZ: number;
  baseScale: number;
}

interface ItemCollectAnim {
  mesh: THREE.Object3D;
  t: number;
  maxTime: number;
  startPos: THREE.Vector3;
  targetPos?: THREE.Vector3;
  baseScale: number;
}

export class CoinSystem {
  runCoins = 0;
  readonly anims: CoinAnim[] = [];
  private readonly collecting: ItemCollectAnim[] = [];

  reset(): void {
    this.runCoins = 0;
    this.anims.length = 0;
    this.collecting.length = 0;
  }

  collect(): number {
    this.runCoins++;
    return this.runCoins;
  }

  track(mesh: THREE.Object3D): void {
    const baseScale = mesh.scale.x > 0 ? mesh.scale.x : 1.0;
    this.anims.push({
      mesh,
      off: Math.random() * Math.PI * 2,
      baseZ: mesh.position.z,
      baseScale,
    });
    if (this.anims.length > 250) this.anims.splice(0, this.anims.length - 250);
  }

  /**
   * Begins rich pickup sequence: anticipation pop -> suction toward player -> fade out.
   */
  beginCollect(mesh: THREE.Object3D, targetPos?: THREE.Vector3, durationMs = 280): void {
    if (!mesh.parent) return;
    const existing = this.anims.find((a) => a.mesh === mesh);
    const baseScale = existing?.baseScale ?? (mesh.scale.x > 0 ? mesh.scale.x : 1.0);
    this.collecting.push({
      mesh,
      t: 0,
      maxTime: durationMs,
      startPos: mesh.position.clone(),
      targetPos: targetPos ? targetPos.clone() : undefined,
      baseScale,
    });
  }

  update(tMs: number, zoom: number, dtMs: number, playerPos?: THREE.Vector3): void {
    // 1. Idle Floating, Bobbing & Proximity Pulse
    for (const c of this.anims) {
      if (!c.mesh.parent) continue;
      if (this.isCollecting(c.mesh)) continue;

      // Smooth spin around Z
      c.mesh.rotation.z = tMs / 450 + c.off;

      // Proximity detection for subtle magnetic pull & pulse
      let proxScale = 1.0;
      if (playerPos) {
        const dx = (c.mesh.parent.position.x + c.mesh.position.x) - playerPos.x;
        const dy = (c.mesh.parent.position.y + c.mesh.position.y) - playerPos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 140 * 140) {
          proxScale = 1.0 + (1 - Math.sqrt(distSq) / 140) * 0.2;
        }
      }

      // Smooth sine bobbing
      const bob = Math.sin(tMs / 320 + c.off) * 1.5 * zoom;
      c.mesh.position.z = 12 * zoom + bob;
      
      // Gentle breathing scale preserving the model's authored baseScale
      const breath = 1.0 + Math.sin(tMs / 280 + c.off) * 0.05;
      const s = c.baseScale * breath * proxScale;
      c.mesh.scale.set(s, s, s);
    }

    // 2. Collection Animation: Anticipation Pop + Accelerate to Target + Shrink
    for (let i = this.collecting.length - 1; i >= 0; i--) {
      const a = this.collecting[i];
      a.t += Math.max(dtMs, 0);
      const k = Math.min(a.t / a.maxTime, 1);

      if (k < 0.2) {
        // Phase 1: Quick anticipation scale-up (pop to 1.25x of baseScale)
        const popK = k / 0.2;
        const s = a.baseScale * (1.0 + Math.sin(popK * Math.PI) * 0.25);
        a.mesh.scale.setScalar(s);
        a.mesh.position.z += dtMs * 0.15 * zoom;
      } else {
        // Phase 2: Accelerate toward player + shrink to 0
        const moveK = (k - 0.2) / 0.8;
        const easeMove = moveK * moveK; // quadratic acceleration
        const s = Math.max(0.01, a.baseScale * (1 - moveK) * 1.2);
        a.mesh.scale.setScalar(s);

        if (a.targetPos && a.mesh.parent) {
          // Lerp toward target in parent space
          const targetInParent = a.targetPos.clone().sub(a.mesh.parent.position);
          a.mesh.position.lerpVectors(a.startPos, targetInParent, easeMove);
        } else {
          a.mesh.position.z += dtMs * 0.25 * zoom;
        }
      }

      a.mesh.rotation.z += dtMs * 0.04;

      if (k >= 1) {
        if (a.mesh.parent) a.mesh.parent.remove(a.mesh);
        this.collecting.splice(i, 1);
      }
    }
  }

  private isCollecting(mesh: THREE.Object3D): boolean {
    for (const a of this.collecting) if (a.mesh === mesh) return true;
    return false;
  }
}
