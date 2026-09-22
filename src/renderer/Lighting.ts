/**
 * §11/§14 — per-world lighting moods, lerped on transitions.
 * Consumes WorldConfig only; owns no gameplay state.
 */
import * as THREE from 'three';
import type { WorldConfig } from '../config/worlds.config';

export interface LightState {
  sky: THREE.Color;
  fog: THREE.Color;
  fogNear: number;
  fogFar: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiI: number;
  dir: THREE.Color;
  dirI: number;
}

export function worldLightState(world: WorldConfig): LightState {
  return {
    sky: new THREE.Color(world.sky),
    fog: new THREE.Color(world.fog),
    fogNear: world.fogNear,
    fogFar: world.fogFar,
    hemiSky: new THREE.Color(world.hemiSky),
    hemiGround: new THREE.Color(world.hemiGround),
    hemiI: world.hemiI,
    dir: new THREE.Color(world.dirColor),
    dirI: world.dirI,
  };
}

export class Lighting {
  private target: LightState | null = null;
  private readonly tmp = {
    sky: new THREE.Color(0),
    fog: new THREE.Color(0),
    hemiSky: new THREE.Color(0),
    hemiGround: new THREE.Color(0),
    dir: new THREE.Color(0),
  };

  constructor(
    private readonly scene: THREE.Scene,
    private readonly hemi: THREE.HemisphereLight,
    private readonly dirLight: THREE.DirectionalLight,
  ) {}

  setWorld(world: WorldConfig, instant: boolean): void {
    this.target = worldLightState(world);
    if (instant && this.target) this.snap();
  }

  private snap(): void {
    const t = this.target;
    if (!t || !this.scene.background || !this.scene.fog) return;
    (this.scene.background as THREE.Color).copy(t.sky);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(t.fog);
    fog.near = t.fogNear;
    fog.far = t.fogFar;
    this.hemi.color.copy(t.hemiSky);
    this.hemi.groundColor.copy(t.hemiGround);
    this.hemi.intensity = t.hemiI;
    this.dirLight.color.copy(t.dir);
    this.dirLight.intensity = t.dirI;
  }

  update(dtMs: number, reducedMotion: boolean): void {
    if (!this.target || !this.scene.background || !this.scene.fog) return;
    const t = this.target;
    const k = reducedMotion ? 1 : 1 - Math.pow(0.05, Math.min(Math.max(dtMs, 0), 100) / 1000);
    const bg = this.scene.background as THREE.Color;
    const fog = this.scene.fog as THREE.Fog;
    this.tmp.sky.copy(bg).lerp(t.sky, k);
    bg.copy(this.tmp.sky);
    this.tmp.fog.copy(fog.color).lerp(t.fog, k);
    fog.color.copy(this.tmp.fog);
    fog.near += (t.fogNear - fog.near) * k;
    fog.far += (t.fogFar - fog.far) * k;
    this.tmp.hemiSky.copy(this.hemi.color).lerp(t.hemiSky, k);
    this.hemi.color.copy(this.tmp.hemiSky);
    this.tmp.hemiGround.copy(this.hemi.groundColor).lerp(t.hemiGround, k);
    this.hemi.groundColor.copy(this.tmp.hemiGround);
    this.hemi.intensity += (t.hemiI - this.hemi.intensity) * k;
    this.tmp.dir.copy(this.dirLight.color).lerp(t.dir, k);
    this.dirLight.color.copy(this.tmp.dir);
    this.dirLight.intensity += (t.dirI - this.dirLight.intensity) * k;
  }
}
