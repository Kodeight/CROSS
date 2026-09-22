/** §16 — pooled particle bursts (hop dust, coin sparkle, death, weather). */
import * as THREE from 'three';
import { GAME_CONFIG } from '../config/game.config';
import type { AssetManager } from '../assets/AssetManager';

const ZOOM = GAME_CONFIG.zoom;

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  max: number;
  alive: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private geo: THREE.BoxGeometry | null = null;
  private readonly mats = new Map<number, THREE.MeshBasicMaterial>();
  particlesEnabled = true;

  constructor(private readonly scene: THREE.Scene, private readonly assets: AssetManager) {}

  private mat(color: number): THREE.MeshBasicMaterial {
    let m = this.mats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color });
      this.mats.set(color, m);
    }
    return m;
  }

  burst(x: number, y: number, z: number, color: number, n: number, speed: number, life: number, up: number, lowQuality: boolean): void {
    if (!this.particlesEnabled && n > 4) return;
    if (!this.geo) this.geo = new THREE.BoxGeometry(5 * ZOOM, 5 * ZOOM, 5 * ZOOM);
    const max = lowQuality ? Math.ceil(n / 2) : n;
    for (let i = 0; i < max; i++) {
      let p: Particle | null = null;
      for (const q of this.particles) {
        if (!q.alive) { p = q; break; }
      }
      if (!p) {
        if (this.particles.length > 140) return;
        p = { mesh: new THREE.Mesh(this.geo, this.mat(color)), vel: new THREE.Vector3(), life: 0, max: 1, alive: false };
        this.scene.add(p.mesh);
        this.particles.push(p);
      }
      p.mesh.material = this.mat(color);
      p.mesh.visible = true;
      p.mesh.position.set(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, z + Math.random() * 14);
      p.vel.set((Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed, Math.random() * up + 60);
      p.life = p.max = life * (0.6 + Math.random() * 0.6);
      p.alive = true;
    }
  }

  update(dtMs: number): void {
    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life -= dtMs / 1000;
      if (p.life <= 0) {
        p.alive = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.z -= 700 * dtMs / 1000;
      p.mesh.position.x += (p.vel.x * dtMs) / 1000;
      p.mesh.position.y += (p.vel.y * dtMs) / 1000;
      p.mesh.position.z = Math.max(2, p.mesh.position.z + (p.vel.z * dtMs) / 1000);
      const s = Math.max(0.05, p.life / p.max);
      p.mesh.scale.set(s, s, s);
      p.mesh.rotation.x += 0.1;
      p.mesh.rotation.y += 0.13;
    }
  }
}
