/**
 * Authoritative Viewport System for CROSS!
 *
 * Provides ONE single source of truth for the entire application viewport,
 * ensuring genuine full-bleed edge-to-edge coverage across:
 * - iPhone Safari & installed iOS PWA (covering status bar and behind home indicator)
 * - Android Chrome & installed Android PWA (supporting both gesture and 3-button nav)
 * - iPad and Android tablets (portrait & landscape)
 * - Desktop browsers (Chrome, Edge, Safari, Firefox)
 */

export interface ViewportDimensions {
  width: number;
  height: number;
  pixelRatio: number;
  isStandalone: boolean;
  source: 'windowInner' | 'documentElement' | 'visualViewport' | 'fallback';
}

export function getActualViewportSize(): ViewportDimensions {
  const winW = typeof window !== 'undefined' ? Math.round(window.innerWidth) : 0;
  const winH = typeof window !== 'undefined' ? Math.round(window.innerHeight) : 0;

  const docW = typeof document !== 'undefined' && document.documentElement ? Math.round(document.documentElement.clientWidth) : 0;
  const docH = typeof document !== 'undefined' && document.documentElement ? Math.round(document.documentElement.clientHeight) : 0;

  const isStandalone = typeof window !== 'undefined' ? (
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
    Boolean(window.matchMedia?.('(display-mode: fullscreen)').matches)
  ) : false;

  // Visual viewport measurement (if available)
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const vvW = vv ? Math.round(vv.width) : 0;
  const vvH = vv ? Math.round(vv.height) : 0;

  // Authoritative application viewport:
  // With <meta name="viewport" content="... viewport-fit=cover ...">,
  // window.innerWidth and window.innerHeight give the exact active display area
  // assigned to the application on all platforms (including behind iOS home indicator).
  let finalW = winW || docW || vvW || 1;
  let finalH = winH || docH || vvH || 1;

  let source: ViewportDimensions['source'] = 'windowInner';
  if (winH === 0 && docH > 0) {
    finalH = docH;
    finalW = docW || finalW;
    source = 'documentElement';
  } else if (winH === 0 && vvH > 0) {
    finalH = vvH;
    finalW = vvW || finalW;
    source = 'visualViewport';
  }

  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  return {
    width: finalW,
    height: finalH,
    pixelRatio: dpr,
    isStandalone,
    source,
  };
}
