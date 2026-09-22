/**
 * §26 — UIManager owns all DOM screens. Communicates with the game through
 * callbacks + GameState, never touches Three.js gameplay logic.
 */
import { GameState } from '../core/GameState';

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`CROSS! missing DOM element: #${id}`);
  return e;
}

export class UIManager {
  state: GameState = GameState.BOOT;
  returnTo: GameState = GameState.MAIN_MENU;
  private toastTimer = 0;
  private introTimers: number[] = [];
  private tutorialTimer: number = 0;
  deferredInstallPrompt: unknown = null;

  get el() {
    return {
      loading: el('loading'),
      loadFill: el('load-fill'),
      loadText: el('load-text'),
      webglError: el('webgl-error'),
      appError: el('app-error'),
      appErrorText: el('app-error-text'),
      hud: el('hud'),
      hudCoinsVal: el('hud-coins-val'),
      toast: el('toast'),
      nearMiss: el('near-miss'),
      worldIntro: el('world-intro'),
      worldIntroName: el('world-intro-name'),
      worldIntroSub: el('world-intro-sub'),
      worldHeader: el('world-header'),
      touchControls: el('touch-controls'),
      tutorial: el('tutorial'),
      tutorialText: el('tutorial-text'),
      tutorialGesture: el('tutorial-gesture'),
      debug: el('debug'),
    };
  }

  /** Show the swipe tutorial on first play. Auto-dismisses after ms or on first touch. */
  showTutorial(text: string, gesture: string, ms = 4000): void {
    try {
      const t = el('tutorial');
      el('tutorial-text').textContent = text;
      el('tutorial-gesture').textContent = gesture;
      t.hidden = false;
      t.style.display = 'flex';
      if (this.tutorialTimer) clearTimeout(this.tutorialTimer);
      this.tutorialTimer = window.setTimeout(() => {
        t.hidden = true;
        t.style.display = '';
      }, ms);
      // Dismiss on first touch.
      const dismiss = (): void => {
        t.hidden = true;
        t.style.display = '';
        document.removeEventListener('touchstart', dismiss);
        document.removeEventListener('pointerdown', dismiss);
      };
      document.addEventListener('touchstart', dismiss, { once: true });
      document.addEventListener('pointerdown', dismiss, { once: true });
    } catch { /* ignore */ }
  }

  hideTutorial(): void {
    try {
      const t = el('tutorial');
      t.hidden = true;
      t.style.display = '';
      if (this.tutorialTimer) clearTimeout(this.tutorialTimer);
    } catch { /* ignore */ }
  }

  setLoad(pct: number, text?: string): void {
    try {
      el('load-fill').style.width = `${pct}%`;
      if (text) el('load-text').textContent = text;
    } catch { /* ignore */ }
  }

  hideLoading(): void {
    try {
      const l = el('loading');
      l.style.transition = 'opacity .3s ease';
      l.style.opacity = '0';
      window.setTimeout(() => {
        l.style.display = 'none';
      }, 320);
    } catch { /* ignore */ }
  }

  toast(msg: string, ms = 2600): void {
    const t = el('toast');
    t.textContent = msg;
    t.hidden = false;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      t.hidden = true;
    }, ms);
  }

  flashNearMiss(): void {
    const n = el('near-miss');
    n.textContent = 'NEAR MISS +2';
    n.hidden = false;
    const prev = (n as unknown as { _t?: number })._t;
    if (prev) clearTimeout(prev);
    (n as unknown as { _t: number })._t = window.setTimeout(() => {
      n.hidden = true;
    }, 800);
  }

  /** §27 — cinematic intro: fade/slide/scale in → hold → fade/rise out. Never one-frame. */
  showWorldIntro(name: string, sub: string, reducedMotion: boolean, onDone: () => void): void {
    try {
      const box = el('world-intro');
      for (const t of this.introTimers) clearTimeout(t);
      this.introTimers = [];
      el('world-intro-name').textContent = name;
      el('world-intro-sub').textContent = sub;
      box.classList.remove('wi-in', 'wi-out');
      box.hidden = false;
      void box.offsetWidth;
      box.classList.add('wi-in');
      const fast = reducedMotion;
      this.introTimers.push(window.setTimeout(() => {
        box.classList.remove('wi-in');
        box.classList.add('wi-out');
        this.introTimers.push(window.setTimeout(() => {
          box.hidden = true;
          box.classList.remove('wi-out');
          onDone();
        }, fast ? 200 : 520));
      }, fast ? 350 : 1150));
    } catch {
      onDone();
    }
  }

  showOnly(ids: string[]): void {
    for (const id of ['menu', 'chars-screen', 'worlds-screen', 'missions-screen', 'settings-screen', 'pause-screen', 'gameover']) {
      el(id).hidden = !ids.includes(id);
    }
    // Top HUD (coins left / world notch center / button right) is visible
    // on the menu, the world intro, and during gameplay — one responsive
    // architecture, only scale/spacing changes between breakpoints.
    const hudVisible = this.state === GameState.MAIN_MENU
      || this.state === GameState.WORLD_INTRO
      || this.state === GameState.PLAYING
      || this.state === GameState.PAUSED;
    el('hud').hidden = !hudVisible;
    try {
      el('world-header').hidden = !hudVisible;
    } catch { /* ignore */ }
  }

  /**
   * Top-right HUD zone: settings gear on the menu, pause during gameplay.
   * Same anchor, same size — only the glyph and action change by state.
   */
  syncTopButton(s: GameState): void {
    try {
      const b = el('btn-pause');
      if (s === GameState.MAIN_MENU) {
        b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5zm0-5.2l1.2 2.1 2.3-.5 1 2.1 2.3.7-.3 2.4 1.6 1.8-1.6 1.8.3 2.4-2.3.7-1 2.1-2.3-.5L12 20l-1.2-2.1-2.3.5-1-2.1-2.3-.7.3-2.4L3.9 12l1.6-1.8-.3-2.4 2.3-.7 1-2.1 2.3.5z"/></svg>';
        b.setAttribute('aria-label', 'Settings');
      } else {
        b.textContent = 'II';
        b.setAttribute('aria-label', 'Pause game');
      }
    } catch { /* ignore */ }
  }

  /** Coin collect feedback: counter pops + a small floating +1. */
  coinPulse(): void {
    try {
      const pill = el('hud-coins');
      pill.classList.remove('coin-pulse');
      void pill.offsetWidth;
      pill.classList.add('coin-pulse');
      const plus = document.createElement('div');
      plus.className = 'coin-plus';
      plus.textContent = '+1';
      pill.appendChild(plus);
      window.setTimeout(() => plus.remove(), 750);
    } catch { /* ignore */ }
  }

  setTouchControlsVisible(playing: boolean, isTouch: boolean): void {
    try {
      el('touch-controls').hidden = !(playing && isTouch);
    } catch { /* ignore */ }
  }

  showWebGLError(): void {
    try {
      el('loading').style.display = 'none';
      el('webgl-error').hidden = false;
    } catch { /* ignore */ }
  }

  showAppError(message: string): void {
    try {
      el('loading').style.display = 'none';
      el('app-error-text').textContent = message;
      el('app-error').hidden = false;
    } catch { /* ignore */ }
  }

  hideAppError(): void {
    try {
      el('app-error').hidden = true;
    } catch { /* ignore */ }
  }
}
