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
 * Key principles:
 * 1. On iOS PWA with viewport-fit=cover, WebKit's visualViewport excludes the bottom
 *    safe area (34px home indicator) and dvh collapses to it. The authoritative
 *    screen/app viewport dimensions must come from window.innerWidth and window.innerHeight,
 *    never shortened by safe-area insets.
 * 2. Viewport dimensions must NOT depend on #game's own getBoundingClientRect(),
 *    which creates a feedback loop that blocks shrinking upon rotation to landscape.
 */

export interface ViewportDimensions {
  width: number;
  height: number;
  pixelRatio: number;
  isStandalone: boolean;
  source: 'windowInner' | 'documentElement' | 'standaloneScreen' | 'fallback';
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

  // Screen hardware dimensions
  let screenW = 0;
  let screenH = 0;
  if (typeof window !== 'undefined' && window.screen) {
    const sW = Math.round(window.screen.width || 0);
    const sH = Math.round(window.screen.height || 0);
    const isLandscape = winW > winH || (window.screen.orientation && window.screen.orientation.type?.includes('landscape'));
    screenW = isLandscape ? Math.max(sW, sH) : Math.min(sW, sH);
    screenH = isLandscape ? Math.min(sW, sH) : Math.max(sW, sH);
  }

  // The true viewport height for the game is the full available application surface.
  // On iOS standalone PWA (where WebKit window.innerHeight truncates at safe-area-inset-bottom),
  // the true physical render surface is the full hardware screen dimensions, guaranteeing
  // genuine edge-to-edge rendering behind the home indicator and status bar.
  let finalW = Math.max(winW, docW, vvW, 1);
  let finalH = Math.max(winH, docH, vvH, 1);

  let source: ViewportDimensions['source'] = 'fallback';

  if (isStandalone && screenH > 0 && screenW > 0) {
    finalW = Math.max(finalW, screenW);
    finalH = Math.max(finalH, screenH);
    source = 'standaloneScreen';
  } else if (finalH === winH && winH > 0) {
    source = 'windowInner';
  } else if (finalH === docH && docH > 0) {
    source = 'documentElement';
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
