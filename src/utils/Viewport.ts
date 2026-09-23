/**
 * Authoritative Viewport System for CROSS!
 *
 * Provides ONE single source of truth for the entire application viewport,
 * ensuring genuine full-bleed edge-to-edge coverage across:
 * - iPhone Safari & installed iOS PWA (covering status bar and behind home indicator)
 * - Android Chrome & installed Android PWA
 * - iPad and Android tablets (portrait & landscape)
 * - Desktop browsers (Chrome, Edge, Safari, Firefox)
 *
 * Key principle:
 * On iOS PWA with viewport-fit=cover, WebKit's visualViewport excludes the bottom
 * safe area (34px home indicator) and dvh collapses to it. The authoritative
 * screen/app viewport dimensions must come from the full window/documentElement
 * and the fixed unconstrained #game container, never shortened by safe-area insets.
 */

export interface ViewportDimensions {
  width: number;
  height: number;
  pixelRatio: number;
  isStandalone: boolean;
  source: 'gameRect' | 'windowInner' | 'documentElement' | 'fallback';
}

export function getActualViewportSize(): ViewportDimensions {
  let gameW = 0;
  let gameH = 0;

  if (typeof document !== 'undefined') {
    const game = document.getElementById('game');
    if (game) {
      const rect = game.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        gameW = Math.round(rect.width);
        gameH = Math.round(rect.height);
      }
    }
  }

  const winW = typeof window !== 'undefined' ? Math.round(window.innerWidth) : 0;
  const winH = typeof window !== 'undefined' ? Math.round(window.innerHeight) : 0;

  const docW = typeof document !== 'undefined' && document.documentElement ? Math.round(document.documentElement.clientWidth) : 0;
  const docH = typeof document !== 'undefined' && document.documentElement ? Math.round(document.documentElement.clientHeight) : 0;

  const isStandalone = typeof window !== 'undefined' ? (
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches)
  ) : false;

  // Visual viewport measurement (may be smaller on iOS due to safe-area / keyboard)
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const vvW = vv ? Math.round(vv.width) : 0;
  const vvH = vv ? Math.round(vv.height) : 0;

  // The true viewport height for the game is the full available application surface.
  // We use Math.max to ensure we never get clamped by safe-area-shortened visualViewport on iOS PWA.
  const finalW = Math.max(gameW, winW, docW, vvW, 1);
  const finalH = Math.max(gameH, winH, docH, vvH, 1);

  let source: ViewportDimensions['source'] = 'fallback';
  if (finalH === gameH && gameH > 0) source = 'gameRect';
  else if (finalH === winH && winH > 0) source = 'windowInner';
  else if (finalH === docH && docH > 0) source = 'documentElement';

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  return {
    width: finalW,
    height: finalH,
    pixelRatio: dpr,
    isStandalone,
    source,
  };
}
