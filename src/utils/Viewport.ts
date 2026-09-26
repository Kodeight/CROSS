/**
 * Viewport measurement: the single funnel for actual drawable size.
 * Measured from the #game container (what the renderer fills), with
 * visualViewport/window fallback — mirrors GameRenderer.onResize so the
 * per-frame check in Game.render() compares against the same truth.
 */

export interface ViewportSize {
  width: number;
  height: number;
}

export function getActualViewportSize(): ViewportSize {
  try {
    const container = document.getElementById('game');
    if (container) {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w > 0 && h > 0) return { width: w, height: h };
    }
  } catch { /* fall through to viewport */ }
  try {
    const vv = window.visualViewport;
    return {
      width: Math.max(1, Math.round(vv?.width ?? window.innerWidth)),
      height: Math.max(1, Math.round(vv?.height ?? window.innerHeight)),
    };
  } catch {
    return { width: 1, height: 1 };
  }
}
