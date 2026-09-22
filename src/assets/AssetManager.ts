/**
 * Central asset cache: shared geometries + materials so gameplay never
 * re-creates Three.js resources per object. Procedural-only game —
 * no external models required, keeps the PWA light and offline-safe.
 */
import * as THREE from 'three';

export class AssetManager {
  private geometries = new Map<string, THREE.BufferGeometry>();
  private materials = new Map<string, THREE.Material>();

  geometry<T extends THREE.BufferGeometry>(key: string, factory: () => T): T {
    let g = this.geometries.get(key) as T | undefined;
    if (!g) {
      g = factory();
      this.geometries.set(key, g);
    }
    return g;
  }

  phong(key: string, color: number, opts: { emissive?: number; shininess?: number; flat?: boolean } = {}): THREE.MeshPhongMaterial {
    const cacheKey = `phong:${key}:${color}:${opts.emissive ?? 0}:${opts.shininess ?? 30}:${opts.flat ? 1 : 0}`;
    let m = this.materials.get(cacheKey) as THREE.MeshPhongMaterial | undefined;
    if (!m) {
      m = new THREE.MeshPhongMaterial({
        color,
        emissive: opts.emissive ?? 0x000000,
        shininess: opts.shininess ?? 30,
        flatShading: opts.flat ?? false,
      });
      this.materials.set(cacheKey, m);
    }
    return m;
  }

  basic(key: string, color: number): THREE.MeshBasicMaterial {
    const cacheKey = `basic:${key}:${color}`;
    let m = this.materials.get(cacheKey) as THREE.MeshBasicMaterial | undefined;
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color });
      this.materials.set(cacheKey, m);
    }
    return m;
  }

  /** Rounded box via beveled ExtrudeGeometry — kills the "primitive cube" look. */
  roundedBox(w: number, h: number, d: number, radius: number, segments = 2): THREE.BufferGeometry {
    const key = `rbox:${w}x${h}x${d}r${radius}s${segments}`;
    return this.geometry(key, () => {
      const shape = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      const r = Math.min(radius, w / 2, h / 2);
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.1, d - radius * 2),
        bevelEnabled: true,
        bevelThickness: radius,
        bevelSize: radius,
        bevelSegments: segments,
        curveSegments: 6,
      });
      geo.translate(0, 0, -Math.max(0.1, d - radius * 2) / 2);
      geo.computeVertexNormals();
      return geo;
    });
  }

  sphere(key: string, r: number, w = 10, h = 8): THREE.SphereGeometry {
    return this.geometry(`sph:${key}:${r}:${w}x${h}`, () => new THREE.SphereGeometry(r, w, h));
  }

  box(key: string, w: number, h: number, d: number): THREE.BoxGeometry {
    return this.geometry(`box:${key}:${w}x${h}x${d}`, () => new THREE.BoxGeometry(w, h, d));
  }

  cylinder(key: string, rt: number, rb: number, h: number, seg = 10): THREE.CylinderGeometry {
    return this.geometry(`cyl:${key}:${rt}/${rb}x${h}x${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
  }

  dispose(): void {
    for (const g of this.geometries.values()) g.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.geometries.clear();
    this.materials.clear();
  }
}
