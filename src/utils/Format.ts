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

/** Formats coins for compact top HUD display (e.g. 518, 1K, 1.2K, 1.5K, 10K, 25.5K, 100K, 1M, 1.2M). */
export function formatHudCoins(n: number): string {
  const v = Math.floor(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  if (v < 1000) return sign + String(v);

  if (v >= 1_000_000) {
    const val = v / 1_000_000;
    const rounded = Math.round(val * 10) / 10;
    const str = rounded % 1 === 0 ? String(Math.round(val)) : rounded.toFixed(1);
    return sign + str + 'M';
  }

  const val = v / 1000;
  if (v >= 100_000) {
    return sign + String(Math.round(val)) + 'K';
  }

  const rounded = Math.round(val * 10) / 10;
  const str = rounded % 1 === 0 ? String(Math.round(val)) : rounded.toFixed(1);
  return sign + str + 'K';
}

/** Formats coins for menu display showing exact integer with locale thousands separators (e.g. 1,076, 15,342). */
export function formatMenuCoins(n: number): string {
  const v = Math.floor(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  return sign + v.toLocaleString('en-US');
}

/** <100 → up to 1 decimal (25.5K, 1.2K); >=100 → integer (100K, 250K). */
function trimNum(x: number): string {
  if (x >= 100) return String(Math.round(x));
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
