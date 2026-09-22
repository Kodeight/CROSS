/** Deterministic-friendly random helpers. */

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function range(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function chance(p: number): boolean {
  return Math.random() < p;
}
