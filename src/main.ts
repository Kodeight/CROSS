/** CROSS! entry point — Vite + TypeScript. Boots the Game. */
import './style.css';
import { Game } from './core/Game';

/**
 * Updates Three.js renderer.setSize() and camera.aspect using window.visualViewport
 * dimensions if available, rather than window.innerHeight, to ensure proper edge-to-edge
 * sizing as the PWA layout settles on iOS.
 */
export function updateViewportSize(game: Game): void {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const width = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
  const height = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));

  if (game.renderer?.renderer) {
    game.renderer.renderer.setSize(width, height, false);
    game.renderer.cssWidth = width;
    game.renderer.cssHeight = height;
  }

  if (game.camera?.camera) {
    game.camera.camera.aspect = width / height;
    game.camera.camera.updateProjectionMatrix();
  }

  try {
    game.onViewportChange();
  } catch { /* ignore */ }
}

async function boot(): Promise<void> {
  try {
    const game = new Game();
    await game.boot();

    // Ensure renderer.setSize() and camera.aspect are updated using window.visualViewport
    // dimensions if available, rather than window.innerHeight, and bind to visualViewport.onresize.
    const onResize = () => updateViewportSize(game);

    if (typeof window !== 'undefined') {
      if (window.visualViewport) {
        window.visualViewport.onresize = onResize;
        window.visualViewport.addEventListener('resize', onResize);
      }
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', () => {
        onResize();
        setTimeout(onResize, 100);
        setTimeout(onResize, 300);
      });
      window.addEventListener('pageshow', onResize);
      window.addEventListener('focus', onResize);
    }

    // Trigger initial adjustment as iOS PWA settles
    onResize();
  } catch (err) {
    console.error('CROSS! startup failed:', err);
    try {
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';
      const text = document.getElementById('app-error-text');
      if (text) text.textContent = `CROSS! hit a startup problem: ${String((err as Error)?.message ?? err)}`;
      const box = document.getElementById('app-error');
      if (box) box.hidden = false;
      const retry = document.getElementById('btn-retry-boot');
      if (retry) retry.addEventListener('click', () => window.location.reload());
    } catch { /* ignore */ }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void boot());
else void boot();

