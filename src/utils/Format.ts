/**
 * Exact integer formatting for the Main Menu coin counter (Phase 14 & 15).
 * NEVER abbreviates with K, M, or B. Always displays the exact underlying integer balance.
 * Examples: 0 -> "0", 1000 -> "1000", 15342 -> "15342", 1000000 -> "1000000".
 */
export function formatMenuCoins(n: number): string {
  const v = Math.floor(Math.abs(Number.isFinite(n) ? n : 0));
  const sign = n < 0 ? '-' : '';
  return sign + String(v);
}

/**
 * Compact HUD number format (task.md coin-counter spec).
 *
 * DISPLAY ONLY — the underlying value stays a full integer everywhere
 * (save, missions, rewards, comparisons). Only the rendered string is
 * compacted so huge counts can never widen the coin pill into the
 * centered world notch.
 *
 * 0–999 → full number · 1,000+ → K · 1,000,000+ → M · 1,000,000,000+ → B
 * At most one decimal, trailing ".0" stripped: 999→999, 1000→1K,
 * 1200→1.2K, 9999→10K, 999999→1M, 1200000→1.2M, 10M, 1B.
 */
export function fmtCount(n: number): string {
  const v = Math.floor(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  const units: Array<[number, string]> = [
    [1_000_000_000, 'B'],
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  for (let i = 0; i < units.length; i++) {
    const [size, suffix] = units[i];
    if (v >= size) {
      let x = v / size;
      // Rounded value hitting 1000 promotes to the next unit up
      // (999999 → 1M, never "1000K").
      if (Math.round(x * 10) / 10 >= 1000 && i > 0) {
        const [bigger, biggerSuffix] = units[i - 1];
        x = v / bigger;
        return sign + trimNum(x) + biggerSuffix;
      }
      return sign + trimNum(x) + suffix;
    }
  }
  return sign + String(v);
}

/** HUD coin format alias */
export function formatHudCoins(n: number): string {
  return fmtCount(n);
}

/** <100 → up to 1 decimal (25.5K, 1.2K); >=100 → integer (100K, 250K). */
function trimNum(x: number): string {
  if (x >= 100) return String(Math.round(x));
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
