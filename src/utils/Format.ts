/** Game-style number formatting: full grouped values, never abbreviated. */
export function fmtCount(n: number): string {
  const v = Math.floor(n);
  try {
    return v.toLocaleString('en-US');
  } catch {
    return String(v);
  }
}
