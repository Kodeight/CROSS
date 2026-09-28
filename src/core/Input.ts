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
  private lastTapT = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private pendingTapTimer: number | null = null;
  private isSecondTapPending = false;
  private touchInModal = false;
  private swipeTriggered = false;
  private static readonly TAP_MS = 260;
  private static readonly TAP_DIST = 42;

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
      } else if (e.code === 'Space' || k === ' ' || k === 'Spacebar') {
        e.preventDefault();
        if (!e.repeat) {
          this.emit('JUMP');
        }
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
          this.swipeTriggered = false;

          // Check if this touch down occurs during the double-tap window:
          const now = performance.now();
          if (this.pendingTapTimer !== null) {
            const quick = now - this.lastTapT < InputManager.TAP_MS;
            const near = Math.hypot(t.clientX - this.lastTapX, t.clientY - this.lastTapY) < InputManager.TAP_DIST;
            if (quick && near) {
              // Potential second tap is actively down: pause timer so no step can fire while finger is on screen!
              window.clearTimeout(this.pendingTapTimer);
              this.pendingTapTimer = null;
              this.isSecondTapPending = true;
            } else {
              // Not part of double tap: flush pending step immediately before this new touch progresses
              window.clearTimeout(this.pendingTapTimer);
              this.pendingTapTimer = null;
              this.isSecondTapPending = false;
              this.emit('MOVE_FORWARD');
            }
          }
        },
        { passive: true },
      );

      game.addEventListener(
        'touchmove',
        (e) => {
          if (this.touchInModal || this.swipeTriggered) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - this.touchStartX;
          const dy = t.clientY - this.touchStartY;
          const adx = Math.abs(dx);
          const ady = Math.abs(dy);

          // Instantaneous swipe recognition as finger moves:
          if (Math.max(adx, ady) >= 18) {
            this.swipeTriggered = true;
            this.isSecondTapPending = false;
            // Cancel any pending single-tap forward move so swipe takes immediate precedence!
            if (this.pendingTapTimer !== null) {
              window.clearTimeout(this.pendingTapTimer);
              this.pendingTapTimer = null;
            }
            this.lastTapT = 0;
            if (adx > ady) {
              this.emit(dx > 0 ? 'MOVE_RIGHT' : 'MOVE_LEFT');
            } else {
              this.emit(dy < 0 ? 'MOVE_FORWARD' : 'MOVE_BACK');
            }
          }
        },
        { passive: true },
      );

      game.addEventListener('touchend', (e) => {
        if (this.touchInModal || this.startsInModal(e.target)) {
          this.touchInModal = false;
          this.isSecondTapPending = false;
          return;
        }
        if (this.swipeTriggered) {
          this.swipeTriggered = false;
          this.isSecondTapPending = false;
          return;
        }
        const t = e.changedTouches[0];
        const dx = t.clientX - this.touchStartX;
        const dy = t.clientY - this.touchStartY;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        const dt = performance.now() - this.touchStartT;

        // If swipe was fast and released before touchmove triggered:
        if (Math.max(adx, ady) >= 16) {
          if (this.pendingTapTimer !== null) {
            window.clearTimeout(this.pendingTapTimer);
            this.pendingTapTimer = null;
          }
          this.isSecondTapPending = false;
          this.lastTapT = 0;
          if (adx > ady) this.emit(dx > 0 ? 'MOVE_RIGHT' : 'MOVE_LEFT');
          else this.emit(dy < 0 ? 'MOVE_FORWARD' : 'MOVE_BACK');
          return;
        }

        // Tap handling with double-tap detection window:
        // A deliberate double-tap JUMPS immediately with ZERO unwanted movement step!
        if (dt < 420) {
          const now = performance.now();
          const quick = now - this.lastTapT < InputManager.TAP_MS + 100;
          const near = Math.hypot(t.clientX - this.lastTapX, t.clientY - this.lastTapY) < InputManager.TAP_DIST;

          if (this.isSecondTapPending || (this.pendingTapTimer !== null && quick && near)) {
            // Second tap arrived within window! Execute ONLY JUMP, cancel pending step!
            if (this.pendingTapTimer !== null) {
              window.clearTimeout(this.pendingTapTimer);
              this.pendingTapTimer = null;
            }
            this.isSecondTapPending = false;
            this.lastTapT = 0;
            this.emit('JUMP');
          } else {
            // First tap: start the short double-tap detection window
            if (this.pendingTapTimer !== null) {
              window.clearTimeout(this.pendingTapTimer);
              this.pendingTapTimer = null;
            }
            this.isSecondTapPending = false;
            this.lastTapT = now;
            this.lastTapX = t.clientX;
            this.lastTapY = t.clientY;

            // Wait briefly for potential 2nd tap; if none arrives, execute normal single step
            this.pendingTapTimer = window.setTimeout(() => {
              this.pendingTapTimer = null;
              this.emit('MOVE_FORWARD');
            }, 180);
          }
        } else {
          this.isSecondTapPending = false;
        }
      });
    }
  }
}
