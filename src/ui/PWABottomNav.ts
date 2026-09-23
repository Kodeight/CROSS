/**
 * PWA Standalone Bottom Navigation Dock for CROSS!
 *
 * Provides a dedicated, premium mobile navigation dock on installed iOS & Android PWAs:
 * - HOME (Main Menu / Play)
 * - WORLDS (World Select)
 * - MISSIONS (Quests & Achievements)
 * - CHARACTERS (Character Selection)
 *
 * Sits as an intentional overlay above the edge-to-edge Three.js viewport,
 * respecting the device home indicator safe area.
 */
import { GameState } from '../core/GameState';

export type NavTab = 'home' | 'worlds' | 'missions' | 'characters';

export class PWABottomNav {
  private elDock: HTMLElement | null = null;
  private btnHome: HTMLElement | null = null;
  private btnWorlds: HTMLElement | null = null;
  private btnMissions: HTMLElement | null = null;
  private btnChars: HTMLElement | null = null;
  private isStandalone = false;

  constructor(private onSelect: (tab: NavTab) => void) {
    this.checkStandalone();
    this.initDOM();
  }

  private checkStandalone(): void {
    if (typeof window === 'undefined') return;
    const isIosStandalone = Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
    const isMediaStandalone = Boolean(window.matchMedia?.('(display-mode: standalone)').matches);
    const isFullscreen = Boolean(window.matchMedia?.('(display-mode: fullscreen)').matches);
    this.isStandalone = isIosStandalone || isMediaStandalone || isFullscreen;

    if (this.isStandalone) {
      document.documentElement.classList.add('is-pwa-standalone');
    }
  }

  private initDOM(): void {
    this.elDock = document.getElementById('pwa-nav');
    this.btnHome = document.getElementById('pwa-nav-home');
    this.btnWorlds = document.getElementById('pwa-nav-worlds');
    this.btnMissions = document.getElementById('pwa-nav-missions');
    this.btnChars = document.getElementById('pwa-nav-chars');

    if (!this.elDock) return;

    // Show if running standalone on mobile
    if (this.isStandalone) {
      this.elDock.hidden = false;
    }

    const bindTab = (btn: HTMLElement | null, tab: NavTab) => {
      if (!btn) return;
      // Prevent pointer events from leaking to Three.js canvas movement
      const stop = (e: Event) => {
        e.stopPropagation();
      };
      btn.addEventListener('pointerdown', stop);
      btn.addEventListener('touchstart', stop, { passive: true });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSelect(tab);
      });
    };

    bindTab(this.btnHome, 'home');
    bindTab(this.btnWorlds, 'worlds');
    bindTab(this.btnMissions, 'missions');
    bindTab(this.btnChars, 'characters');

    // Prevent background canvas taps through the dock container
    this.elDock.addEventListener('pointerdown', (e) => {
      if (e.target === this.elDock) e.stopPropagation();
    });
  }

  /** Syncs the active navigation highlight to match the active screen/state. */
  syncState(state: GameState): void {
    if (!this.elDock) return;

    // In gameover / boot / loading, hide the dock to let the score/prompt shine
    if (state === GameState.GAME_OVER || state === GameState.BOOT) {
      this.elDock.classList.add('pwa-nav-hidden');
    } else {
      this.elDock.classList.remove('pwa-nav-hidden');
    }

    const items = [
      { el: this.btnHome, active: state === GameState.MAIN_MENU },
      { el: this.btnWorlds, active: state === GameState.WORLD_SELECT },
      { el: this.btnMissions, active: state === GameState.MISSIONS },
      { el: this.btnChars, active: state === GameState.CHARACTER_SELECT },
    ];

    for (const item of items) {
      if (item.el) {
        if (item.active) {
          item.el.classList.add('active');
        } else {
          item.el.classList.remove('active');
        }
      }
    }
  }
}
