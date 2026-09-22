/**
 * §26 — UIManager owns all DOM screens. Communicates with the game through
 * callbacks + GameState, never touches Three.js gameplay logic.
 */
import { GameState } from '../core/GameState';
import { liquidUI } from './liquidUI';

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
  private tutorialSession = 0;
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

  /** Show a one-shot hint. Auto-dismisses after ms or on first touch. Gesture may be SVG HTML. */
  showTutorial(text: string, gesture: string, ms = 4000): void {
    const session = ++this.tutorialSession;
    try {
      const t = el('tutorial');
      el('tutorial-text').textContent = text;
      const g = el('tutorial-gesture');
      if (gesture.startsWith('<svg')) {
        g.textContent = '';
        g.innerHTML = gesture;
      } else {
        g.textContent = gesture;
      }
      t.hidden = false;
      t.style.display = 'flex';
      if (this.tutorialTimer) clearTimeout(this.tutorialTimer);
      this.tutorialTimer = window.setTimeout(() => {
        if (session !== this.tutorialSession) return;
        t.hidden = true;
        t.style.display = '';
      }, ms);
      // Dismiss on first touch — invalidates any chained steps.
      const dismiss = (): void => {
        this.tutorialSession++;
        if (this.tutorialTimer) clearTimeout(this.tutorialTimer);
        t.hidden = true;
        t.style.display = '';
        document.removeEventListener('touchstart', dismiss);
        document.removeEventListener('pointerdown', dismiss);
      };
      document.addEventListener('touchstart', dismiss, { once: true });
      document.addEventListener('pointerdown', dismiss, { once: true });
    } catch { /* ignore */ }
  }

  /**
   * Staged first-run mobile tutorial, played inside the live world:
   * gestures → warning → send-off. Short, skippable, shown once.
   * Gestures are real SVG icons — never emoji glyphs.
   */
  showMobileTutorial(onDone: () => void): void {
    const swipeLR = '<svg width="72" height="40" viewBox="0 0 72 40" aria-hidden="true"><path fill="#fff" d="M14 20 4 8v24l10-12zm0 0h18v4H14V20zm44 0 10-12v24L58 20zm0 0H40v4h18v-4z"/><path fill="#FFC93C" d="M30 6h12v4H30zM30 30h12v4H30z"/></svg>';
    const swipeUp = '<svg width="48" height="72" viewBox="0 0 48 72" aria-hidden="true"><path fill="#fff" d="M24 4 12 18h8v20h8V18h8L24 4zm0 64h8V48H16v20h8z"/><path fill="#FFC93C" d="M6 30h4v12H6zM38 30h4v12h-4z"/></svg>';
    const traffic = '<svg width="160" height="44" viewBox="0 0 160 44" aria-hidden="true">'
      + '<rect x="6" y="14" width="44" height="20" rx="6" fill="#e74c3c"/><rect x="14" y="8" width="24" height="12" rx="4" fill="#c0392b"/><circle cx="18" cy="36" r="6" fill="#2c3e50"/><circle cx="40" cy="36" r="6" fill="#2c3e50"/>'
      + '<rect x="58" y="14" width="44" height="20" rx="6" fill="#f1c40f"/><rect x="66" y="8" width="24" height="12" rx="4" fill="#d4ac0d"/><circle cx="70" cy="36" r="6" fill="#2c3e50"/><circle cx="92" cy="36" r="6" fill="#2c3e50"/>'
      + '<rect x="110" y="10" width="44" height="24" rx="6" fill="#3498db"/><rect x="118" y="4" width="20" height="12" rx="3" fill="#2980b9"/><circle cx="122" cy="36" r="6" fill="#2c3e50"/><circle cx="144" cy="36" r="6" fill="#2c3e50"/></svg>';
    const chicken = '<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">'
      + '<ellipse cx="28" cy="34" rx="16" ry="14" fill="#fff"/><circle cx="28" cy="20" r="12" fill="#fff"/>'
      + '<path d="M28 6c2 4 2 8 0 12-2-4-2-8 0-12z" fill="#e74c3c"/>'
      + '<circle cx="24" cy="18" r="2.2" fill="#1E2430"/><circle cx="33" cy="18" r="2.2" fill="#1E2430"/>'
      + '<path d="M36 22l8 2-8 3v-5z" fill="#f39c12"/>'
      + '<path d="M44 14c4-2 8 0 10 4-4 0-7 1-10-4z" fill="#FFC93C"/></svg>';
    const steps: Array<[string, string, number]> = [
      ['SWIPE LEFT & RIGHT', swipeLR, 1700],
      ['SWIPE UP TO CROSS', swipeUp, 1700],
      ['AVOID THE TRAFFIC', traffic, 1600],
      ['GOOD LUCK!', chicken, 1400],
    ];
    let i = 0;
    const next = (): void => {
      if (i >= steps.length) {
        this.hideTutorial();
        onDone();
        return;
      }
      const [text, gesture] = steps[i];
      i++;
      const session = ++this.tutorialSession;
      try {
        const t = el('tutorial');
        el('tutorial-text').textContent = text;
        const g = el('tutorial-gesture');
        g.textContent = '';
        g.innerHTML = gesture;
        t.hidden = false;
        t.style.display = 'flex';
        if (this.tutorialTimer) clearTimeout(this.tutorialTimer);
        this.tutorialTimer = window.setTimeout(() => {
          if (session !== this.tutorialSession) return;
          next();
        }, steps[i - 1][2]);
        const dismiss = (): void => {
          this.tutorialSession++;
          if (this.tutorialTimer) clearTimeout(this.tutorialTimer);
          t.hidden = true;
          t.style.display = '';
          document.removeEventListener('touchstart', dismiss);
          document.removeEventListener('pointerdown', dismiss);
          onDone();
        };
        document.addEventListener('touchstart', dismiss, { once: true });
        document.addEventListener('pointerdown', dismiss, { once: true });
      } catch {
        onDone();
      }
    };
    next();
  }

  isMobileTutorialCompleted(): boolean {
    try {
      return localStorage.getItem('cross_mobile_tutorial_completed') === '1';
    } catch {
      return true;
    }
  }

  completeMobileTutorial(): void {
    try {
      localStorage.setItem('cross_mobile_tutorial_completed', '1');
    } catch { /* ignore */ }
  }

  clearMobileTutorial(): void {
    try {
      localStorage.removeItem('cross_mobile_tutorial_completed');
    } catch { /* ignore */ }
  }

  /**
   * Content-responsive HUD guard: the coins pill compresses (never the
   * notch moves) so huge values can never slide under WORLD 01 / CITY.
   */
  fitHud(): void {
    try {
      const hud = el('hud');
      const coins = el('hud-coins');
      const notch = el('world-header');
      coins.style.fontSize = '';
      coins.style.padding = '';
      const val = el('hud-coins-val');
      val.style.maxWidth = '';
      if (hud.hidden || notch.hidden) return;
      const gap = 8;
      let size = 16;
      for (let i = 0; i < 7; i++) {
        const c = coins.getBoundingClientRect();
        const n = notch.getBoundingClientRect();
        if (c.right + gap <= n.left) break;
        if (size > 11) {
          size -= 1;
          coins.style.fontSize = `${size}px`;
          coins.style.padding = '8px 10px';
        } else {
          // Last resort: cap the number itself; the notch never moves.
          const iconW = 20 + 8;
          const avail = Math.max(28, n.left - gap - c.left - iconW - 20);
          val.style.maxWidth = `${avail}px`;
          break;
        }
      }
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
    liquidUI.refresh();
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
        b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7V5zm6 0h4v14h-4V5z"/></svg>';
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
      // Fade lives inside .ql-content (never on the glass host itself).
      liquidUI.contentLayer(pill).appendChild(plus);
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
