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
 * At most one decimal, trailing ".0" stripped. Truncated/floored (never rounded up)
 * so coin counts accurately reflect reached thresholds:
 * 999→999, 1000→1K, 1099→1K, 1850→1.8K, 1900..1999→1.9K, 2000→2K, 9999→9.9K, etc.
 */
export function fmtCount(n: number): string {
  if (!Number.isFinite(n)) return '0';
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
      return sign + trimNum(v, size) + suffix;
    }
  }
  return sign + String(v);
}

/** HUD coin format alias */
export function formatHudCoins(n: number): string {
  return fmtCount(n);
}

/**
 * Floored / truncated compact formatting:
 * <100 size units → up to 1 decimal place (1850 -> "1.8", 1900..1999 -> "1.9", 2000..2099 -> "2");
 * >=100 size units → integer floor (100K, 250K).
 */
function trimNum(v: number, size: number): string {
  if (v >= 100 * size) {
    return String(Math.floor(v / size));
  }
  const tenths = Math.floor(v / (size / 10));
  const intPart = Math.floor(tenths / 10);
  const fracPart = tenths % 10;
  return fracPart === 0 ? String(intPart) : `${intPart}.${fracPart}`;
}
