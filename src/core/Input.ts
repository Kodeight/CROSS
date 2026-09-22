/**
 * Unified InputManager. Keyboard, swipe, tap and touch buttons are normalized
 * into game actions — gameplay layers never touch raw DOM events.
 */

export type GameAction = 'MOVE_LEFT' | 'MOVE_RIGHT' | 'MOVE_FORWARD' | 'MOVE_BACK' | 'PAUSE';

export class InputManager {
  private actionHandlers: Array<(a: GameAction) => void> = [];
  private anyKeyHandlers: Array<() => void> = [];
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartT = 0;
  private bound = false;

  onAction(handler: (a: GameAction) => void): void {
    this.actionHandlers.push(handler);
  }

  onFirstGesture(handler: () => void): void {
    this.anyKeyHandlers.push(handler);
  }

  private emit(action: GameAction): void {
    for (const h of this.actionHandlers) {
      try {
        h(action);
      } catch (err) {
        console.error('CROSS! input handler failed:', err);
      }
    }
  }

  private gesture(): void {
    const hs = this.anyKeyHandlers;
    this.anyKeyHandlers = [];
    for (const h of hs) {
      try {
        h();
      } catch {
        /* ignore */
      }
    }
  }

  bind(): void {
    if (this.bound) return;
    this.bound = true;

    document.addEventListener('pointerdown', () => this.gesture(), { once: true });

    window.addEventListener('keydown', (e) => {
      this.gesture();
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        e.preventDefault();
        this.emit('MOVE_LEFT');
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        e.preventDefault();
        this.emit('MOVE_RIGHT');
      } else if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        e.preventDefault();
        this.emit('MOVE_FORWARD');
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        e.preventDefault();
        this.emit('MOVE_BACK');
      } else if (k === 'Escape' || k === 'p' || k === 'P') {
        this.emit('PAUSE');
      }
    });

    // Swipe anywhere on the 3D canvas.
    const game = document.getElementById('game');
    if (game) {
      game.addEventListener(
        'touchstart',
        (e) => {
          const t = e.changedTouches[0];
          this.touchStartX = t.clientX;
          this.touchStartY = t.clientY;
          this.touchStartT = performance.now();
        },
        { passive: true },
      );
      game.addEventListener('touchend', (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - this.touchStartX;
        const dy = t.clientY - this.touchStartY;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        const dt = performance.now() - this.touchStartT;
        if (Math.max(adx, ady) < 24 || dt > 900) {
          if (Math.max(adx, ady) < 12) this.emit('MOVE_FORWARD');
          return;
        }
        if (adx > ady) this.emit(dx > 0 ? 'MOVE_RIGHT' : 'MOVE_LEFT');
        else this.emit(dy < 0 ? 'MOVE_FORWARD' : 'MOVE_BACK');
      });
    }

    // On-screen touch buttons.
    const wire = (id: string, action: GameAction) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.emit(action);
      });
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.emit(action);
      });
    };
    wire('t-forward', 'MOVE_FORWARD');
    wire('t-backward', 'MOVE_BACK');
    wire('t-left', 'MOVE_LEFT');
    wire('t-right', 'MOVE_RIGHT');
  }
}
