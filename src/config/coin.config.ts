/**
 * Single source of truth for the CROSS! coin visual identity.
 *
 * The HUD counter coin and the 3D world collectible are ONE design:
 * the HUD icon is the flat reference rendering, the world coin is the
 * physical 3D implementation (edge cylinder + inset faces + emboss +
 * rim). Change the spec here and both follow — the palette is pushed
 * into CSS custom properties at boot (see applyCoinTheme).
 */
export const COIN_SPEC = {
  edge: '#d99a00',
  face: '#ffe27a',
  emboss: '#ffc93c',
  rim: '#b57e00',
  /** Face-disc radius as a fraction of the coin radius. */
  faceRatio: 0.72,
  /** Center-emboss radius as a fraction of the coin radius. */
  embossRatio: 0.375,
} as const;

export function coinColor(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

/** Publish the coin palette to CSS so the HUD icon uses the same spec. */
export function applyCoinTheme(): void {
  try {
    const root = document.documentElement.style;
    root.setProperty('--coin-edge', COIN_SPEC.edge);
    root.setProperty('--coin-face', COIN_SPEC.face);
    root.setProperty('--coin-emboss', COIN_SPEC.emboss);
    root.setProperty('--coin-rim', COIN_SPEC.rim);
  } catch {
    /* theming must never break boot */
  }
}
