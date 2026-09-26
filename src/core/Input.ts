/**
 * Unified InputManager. Keyboard, swipe, tap and touch buttons are normalized
 * into game actions — gameplay layers never touch raw DOM events.
 */

export type GameAction = 'MOVE_LEFT' | 'MOVE_RIGHT' | 'MOVE_FORWARD' | 'MOVE_BACK' | 'JUMP' | 'PAUSE' | 'USE_POWER';

export class InputManager {
  private actionHandlers: Array<(a: GameAction) => void> = [];
  private anyKeyHandlers: Array<() => void> = [];
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartT = 0;
  private bound = false;
  private tapTimer = 0;
  private lastTapT = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private touchInModal = false;
  private static readonly TAP_MS = 300;
  private static readonly TAP_DIST = 24;
  private static readonly TAP_DELAY_MS = 280;

  onAction(handler: (a: GameAction) => void): void {
    this.actionHandlers.push(handler);
  }

  onFirstGesture(handler: () => void): void {
    this.anyKeyHandlers.push(handler);
  }

  public emit(action: GameAction): void {
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

  private startsInModal(t: EventTarget | null): boolean {
    try {
      return t instanceof Element && !!t.closest('.panel-screen');
    } catch {
      return false;
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
      } else if (k === ' ' || k === 'Spacebar') {
        e.preventDefault();
        this.emit('JUMP');
      } else if (k === 'e' || k === 'E' || k === 'f' || k === 'F' || k === 'q' || k === 'Q') {
        e.preventDefault();
        this.emit('USE_POWER');
      } else if (k === 'Escape' || k === 'p' || k === 'P') {
        this.emit('PAUSE');
      }
    });

    const game = document.getElementById('game');
    if (game) {
      game.addEventListener(
        'touchstart',
        (e) => {
          if (this.startsInModal(e.target)) {
            this.touchInModal = true;
            return;
          }
          this.touchInModal = false;
          const t = e.changedTouches[0];
          this.touchStartX = t.clientX;
          this.touchStartY = t.clientY;
          this.touchStartT = performance.now();
        },
        { passive: true },
      );
      game.addEventListener('touchend', (e) => {
        if (this.touchInModal || this.startsInModal(e.target)) {
          this.touchInModal = false;
          return;
        }
        const t = e.changedTouches[0];
        const dx = t.clientX - this.touchStartX;
        const dy = t.clientY - this.touchStartY;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        const dt = performance.now() - this.touchStartT;
        if (dt > 900) return;
        if (Math.max(adx, ady) >= 24) {
          this.lastTapT = 0;
          if (adx > ady) this.emit(dx > 0 ? 'MOVE_RIGHT' : 'MOVE_LEFT');
          else this.emit(dy < 0 ? 'MOVE_FORWARD' : 'MOVE_BACK');
          return;
        }
        if (Math.max(adx, ady) >= 12) {
          this.lastTapT = 0;
          return;
        }
        const now = performance.now();
        const quick = now - this.lastTapT < InputManager.TAP_MS;
        const near = Math.hypot(t.clientX - this.lastTapX, t.clientY - this.lastTapY) < InputManager.TAP_DIST;
        if (quick && near) {
          if (this.tapTimer) clearTimeout(this.tapTimer);
          this.tapTimer = 0;
          this.lastTapT = 0;
          this.emit('JUMP');
        } else {
          this.lastTapT = now;
          this.lastTapX = t.clientX;
          this.lastTapY = t.clientY;
          if (this.tapTimer) clearTimeout(this.tapTimer);
          this.tapTimer = window.setTimeout(() => {
            this.tapTimer = 0;
            this.emit('MOVE_FORWARD');
          }, InputManager.TAP_DELAY_MS);
        }
      });
    }
  }
}
