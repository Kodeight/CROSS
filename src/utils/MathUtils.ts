/** Shared math helpers. */

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent damping factor. */
export function dampFactor(rate: number, dtMs: number): number {
  return 1 - Math.pow(rate, Math.min(dtMs, 100) / 1000);
}

export function indexMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
