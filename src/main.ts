/** CROSS! entry point — Vite + TypeScript. Boots the Game. */
import './style.css';
import { Game } from './core/Game';

function boot(): void {
  try {
    const game = new Game();
    game.boot();
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

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
