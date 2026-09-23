/**
 * Unified InputManager. Keyboard, swipe, tap and touch buttons are normalized
 * into game actions — gameplay layers never touch raw DOM events.
 */

export type GameAction = 'MOVE_LEFT' | 'MOVE_RIGHT' | 'MOVE_FORWARD' | 'MOVE_BACK' | 'JUMP' | 'PAUSE';

export class InputManager {
  private actionHandlers: Array<(a: GameAction) => void> = [];
  private anyKeyHandlers: Array<() => void> = [];
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartT = 0;
  private bound = false;
  // Double-tap jump: a lone tap still steps forward, but deferred briefly
  // so a second tap can upgrade the gesture to a jump instead.
  private tapTimer = 0;
  private lastTapT = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  // Modal owns touches starting inside it: gameplay gesture tracking never
  // starts, so modal swipes/scrolls can never move the player or camera.
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

  /**
   * DOM-containment modal boundary: a touch starting inside a modal overlay
   * (.panel-screen) belongs to the modal — never to gameplay. Uses event
   * target semantics, never coordinates.
   */
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
        // SPACE = jump. preventDefault so focused buttons don't also click.
        e.preventDefault();
        this.emit('JUMP');
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
          if (this.startsInModal(e.target)) {
            // Modal owns this touch: do not start gameplay swipe detection.
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
        if (dt > 900) return; // slow drag: never a swipe nor a tap
        if (Math.max(adx, ady) >= 24) {
          // Swipe: immediate directional move, never a tap.
          this.lastTapT = 0;
          if (adx > ady) this.emit(dx > 0 ? 'MOVE_RIGHT' : 'MOVE_LEFT');
          else this.emit(dy < 0 ? 'MOVE_FORWARD' : 'MOVE_BACK');
          return;
        }
        if (Math.max(adx, ady) >= 12) {
          // Deliberate dead zone: not a tap, must not arm double-tap.
          this.lastTapT = 0;
          return;
        }
        // Tap: single = step forward (deferred); second tap in window = jump.
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
