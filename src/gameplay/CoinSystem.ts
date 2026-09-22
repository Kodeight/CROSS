/** Run coin tracking — wallet itself lives in SaveManager. */
import type * as THREE from 'three';

export interface CoinAnim {
  mesh: THREE.Object3D;
  off: number;
}

interface CoinCollectAnim {
  mesh: THREE.Object3D;
  t: number;
}

const COLLECT_MS = 240;

export class CoinSystem {
  runCoins = 0;
  readonly anims: CoinAnim[] = [];
  private readonly collecting: CoinCollectAnim[] = [];

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
    this.anims.push({ mesh, off: Math.random() * 6.28 });
    if (this.anims.length > 220) this.anims.splice(0, this.anims.length - 220);
  }

  /** Start the subtle collect feedback: quick shrink + rise, then detach. */
  beginCollect(mesh: THREE.Object3D): void {
    if (!mesh.parent) return;
    this.collecting.push({ mesh, t: 0 });
  }

  update(tMs: number, zoom: number, dtMs: number): void {
    for (const c of this.anims) {
      if (!c.mesh.parent) continue;
      if (this.isCollecting(c.mesh)) continue;
      c.mesh.rotation.z = tMs / 500 + c.off;
      c.mesh.position.z = 1.5 * zoom + Math.sin(tMs / 400 + c.off) * 0.5 * zoom;
    }
    for (let i = this.collecting.length - 1; i >= 0; i--) {
      const a = this.collecting[i];
      a.t += Math.max(dtMs, 0);
      const k = Math.min(a.t / COLLECT_MS, 1);
      const s = 1.2 * (1 - k) + 0.05;
      a.mesh.scale.setScalar(Math.max(s, 0.01));
      a.mesh.position.z += Math.max(dtMs, 0) * 0.12;
      a.mesh.rotation.z += Math.max(dtMs, 0) * 0.02;
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
