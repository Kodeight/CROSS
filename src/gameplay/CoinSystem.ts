/** Run coin tracking — wallet itself lives in SaveManager. */
import type * as THREE from 'three';

export interface CoinAnim {
  mesh: THREE.Object3D;
  off: number;
}

export class CoinSystem {
  runCoins = 0;
  readonly anims: CoinAnim[] = [];

  reset(): void {
    this.runCoins = 0;
    this.anims.length = 0;
  }

  collect(): number {
    this.runCoins++;
    return this.runCoins;
  }

  track(mesh: THREE.Object3D): void {
    this.anims.push({ mesh, off: Math.random() * 6.28 });
    if (this.anims.length > 220) this.anims.splice(0, this.anims.length - 220);
  }

  update(tMs: number, zoom: number): void {
    for (const c of this.anims) {
      if (!c.mesh.parent) continue;
      c.mesh.rotation.z = tMs / 500 + c.off;
      c.mesh.position.z = 1.5 * zoom + Math.sin(tMs / 400 + c.off) * 0.5 * zoom;
    }
  }
}
