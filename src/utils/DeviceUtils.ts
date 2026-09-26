/** Device / capability detection with graceful fallbacks. */

export function isTouchDevice(): boolean {
  try {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  } catch {
    return false;
  }
}

export function isPortrait(): boolean {
  try {
    return window.innerHeight >= window.innerWidth;
  } catch {
    return true;
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

export function isStandalonePWA(): boolean {
  try {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* haptics are optional */
  }
}
