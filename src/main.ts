/** CROSS! entry point — Vite + TypeScript. Boots the Game. */
import './style.css';
import { Game } from './core/Game';
import { getActualViewportSize } from './utils/Viewport';

/**
 * Authoritative viewport updater. Drives Three.js renderer and camera
 * from the single source of truth across iOS PWA, Android, and desktop.
 */
export function updateViewportSize(game: Game): void {
  const { width, height } = getActualViewportSize();

  if (game.renderer?.renderer) {
    game.renderer.renderer.setSize(width, height, false);
    game.renderer.cssWidth = width;
    game.renderer.cssHeight = height;
    try {
      game.renderer.renderer.domElement.style.position = 'absolute';
      game.renderer.renderer.domElement.style.top = '0';
      game.renderer.renderer.domElement.style.left = '0';
      game.renderer.renderer.domElement.style.width = '100%';
      game.renderer.renderer.domElement.style.height = '100%';
    } catch { /* stylesheet covers */ }
  }

  if (game.camera?.camera) {
    game.camera.camera.aspect = width / Math.max(1, height);
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
        setTimeout(onResize, 600);
      });
      window.addEventListener('pageshow', onResize);
      window.addEventListener('focus', onResize);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          onResize();
          setTimeout(onResize, 100);
        }
      });
    }

    // Trigger initial adjustment as iOS PWA settles
    onResize();
    setTimeout(onResize, 100);
    setTimeout(onResize, 500);
    setTimeout(onResize, 1000);
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

