/**
 * Mobile PWA Bottom Gameplay Instruction & Status Panel
 *
 * Implements a solid, world-integrated concave bottom instruction & status
 * panel for the installed mobile PWA (iOS & Android).
 *
 * Requirements:
 * - Clear rounded upper corners curving upward into gameplay area
 * - Subtle flattened/straighter center section near top of curve
 * - Preserves controls: LEFT ARROW, PAUSE, RIGHT ARROW with exact spacing
 * - Preserves instruction text: "AVOID TRAFFIC" & "SWIPE TO MOVE"
 * - Coordinated color lifecycle:
 *     * Loader / Pre-game: Pistachio-light (#FFFDF5)
 *     * Loader disappears & gameplay starts: Switches seamlessly to active world color
 *     * Menus (Main menu, Pause, Game over, Settings, etc.): Pistachio-light (#FFFDF5)
 */
import { getFadeColorForWorld } from '../config/worlds.config';
import { GameState } from '../core/GameState';
import { isStandalonePWA, isTouchDevice } from '../utils/DeviceUtils';

export class PWABottomPanel {
  private container: HTMLElement | null = null;
  private pathEl: SVGPathElement | null = null;
  private contentEl: HTMLElement | null = null;
  private currentWorldId: string = 'city';
  private currentState: GameState = GameState.MAIN_MENU;
  private loaderFinished: boolean = false;
  private isStandaloneMobile: boolean = false;

  constructor() {
    this.checkMode();
    this.createDOM();
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
  }

  private checkMode(): boolean {
    const isTouch = isTouchDevice();
    const isStandalone = isStandalonePWA();
    const forceDebug = typeof location !== 'undefined' && /[?&](pwapanel|pwadbg|forcepanel)/i.test(location.search);
    this.isStandaloneMobile = (isStandalone && isTouch) || forceDebug;
    return this.isStandaloneMobile;
  }

  private createDOM(): void {
    if (typeof document === 'undefined') return;

    let el = document.getElementById('pwa-bottom-panel');
    if (!el) {
      el = document.createElement('section');
      el.id = 'pwa-bottom-panel';
      el.setAttribute('aria-label', 'Gameplay instructions and tips');
      el.setAttribute('role', 'region');
      el.hidden = true;

      // Rounded upper corners curving upward into gameplay area with subtle flat center
      el.innerHTML = `
        <div class="pwa-panel-curve-wrap" aria-hidden="true">
          <svg class="pwa-panel-svg" viewBox="0 0 1000 80" preserveAspectRatio="none">
            <path id="pwa-panel-curve-path" d="M 0,80 L 0,40 C 0,16 22,4 52,4 C 180,4 280,34 400,40 L 600,40 C 720,34 820,4 948,4 C 978,4 1000,16 1000,40 L 1000,80 Z" fill="#FFFDF5" />
          </svg>
        </div>
        <div class="pwa-panel-body">
          <div id="pwa-panel-content" class="pwa-panel-content"></div>
        </div>
      `;

      document.body.appendChild(el);
    }

    this.container = el;
    this.pathEl = el.querySelector('#pwa-panel-curve-path');
    this.contentEl = el.querySelector('#pwa-panel-content');
    this.renderContent();
    this.setPreGameTheme();
  }

  private renderContent(): void {
    if (!this.contentEl) return;

    switch (this.currentState) {
      case GameState.PAUSED:
        this.contentEl.innerHTML = `
          <div class="pwa-panel-controls" aria-hidden="true">
            <svg class="pwa-ctrl-icon pwa-ctrl-pause" width="14" height="14" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="2.5" width="4" height="15" rx="2" fill="currentColor"/>
              <rect x="12" y="2.5" width="4" height="15" rx="2" fill="currentColor"/>
            </svg>
          </div>
          <div class="pwa-panel-primary">GAME PAUSED</div>
          <div class="pwa-panel-secondary">TAKE A BREATHER · WATCH THE ROAD AHEAD</div>
        `;
        break;

      case GameState.MAIN_MENU:
        this.contentEl.innerHTML = `
          <div class="pwa-panel-controls" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div class="pwa-panel-primary">READY TO HOP?</div>
          <div class="pwa-panel-secondary">TIMING IS EVERYTHING · TAP PLAY TO START</div>
        `;
        break;

      case GameState.GAME_OVER:
      case GameState.RESULTS:
        this.contentEl.innerHTML = `
          <div class="pwa-panel-controls" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c1.8-.4 3.23-1.82 3.61-3.06C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
            </svg>
          </div>
          <div class="pwa-panel-primary">NICE RUN!</div>
          <div class="pwa-panel-secondary">COLLECT COINS &amp; COMPLETE MISSIONS</div>
        `;
        break;

      case GameState.CHARACTER_SELECT:
        this.contentEl.innerHTML = `
          <div class="pwa-panel-primary">CHOOSE YOUR HERO</div>
          <div class="pwa-panel-secondary">EACH CHARACTER BRINGS UNIQUE STYLE</div>
        `;
        break;

      case GameState.WORLD_SELECT:
        this.contentEl.innerHTML = `
          <div class="pwa-panel-primary">SELECT YOUR WORLD</div>
          <div class="pwa-panel-secondary">DISCOVER NEW HAZARDS &amp; LIVING BIOMES</div>
        `;
        break;

      case GameState.MISSIONS:
        this.contentEl.innerHTML = `
          <div class="pwa-panel-primary">DAILY CHALLENGES</div>
          <div class="pwa-panel-secondary">COMPLETE OBJECTIVES TO EARN GOLD COINS</div>
        `;
        break;

      case GameState.SETTINGS:
        this.contentEl.innerHTML = `
          <div class="pwa-panel-primary">SETTINGS</div>
          <div class="pwa-panel-secondary">TWEAK AUDIO, GRAPHICS &amp; CONTROLS</div>
        `;
        break;

      case GameState.PLAYING:
      case GameState.WORLD_INTRO:
      default:
        this.contentEl.innerHTML = `
          <div class="pwa-panel-controls" aria-hidden="true">
            <svg class="pwa-ctrl-icon pwa-ctrl-left" width="13" height="13" viewBox="0 0 20 20" fill="none">
              <polygon points="15,3 4,10 15,17" fill="currentColor"/>
            </svg>
            <svg class="pwa-ctrl-icon pwa-ctrl-pause" width="13" height="13" viewBox="0 0 20 20" fill="none">
              <rect x="4.5" y="2.5" width="3.5" height="15" rx="1.75" fill="currentColor"/>
              <rect x="12" y="2.5" width="3.5" height="15" rx="1.75" fill="currentColor"/>
            </svg>
            <svg class="pwa-ctrl-icon pwa-ctrl-right" width="13" height="13" viewBox="0 0 20 20" fill="none">
              <polygon points="5,3 16,10 5,17" fill="currentColor"/>
            </svg>
          </div>
          <div class="pwa-panel-primary">AVOID TRAFFIC</div>
          <div class="pwa-panel-secondary">SWIPE TO MOVE</div>
        `;
        break;
    }
  }

  private handleResize(): void {
    this.checkMode();
    this.updateVisibility();
  }

  public setPreGameTheme(): void {
    const bg = '#FFFDF5';
    const text = '#1E2430';
    if (this.container) {
      this.container.style.setProperty('--panel-ground-color', bg);
      this.container.style.setProperty('--panel-text-color', text);
    }
    if (this.pathEl) {
      this.pathEl.setAttribute('fill', bg);
    }
  }

  public setWorld(worldId: string): void {
    this.currentWorldId = worldId;
    this.setPreGameTheme();
  }

  public setState(state: GameState): void {
    this.currentState = state;
    this.renderContent();
    this.setPreGameTheme();
    this.updateVisibility();
  }

  public applyWorldColor(_worldId: string): void {
    // Keep consistent light pistachio color (#FFFDF5) across all worlds and states
    this.setPreGameTheme();
  }

  public onLoaderFinished(): void {
    this.loaderFinished = true;
    this.setPreGameTheme();
    this.updateVisibility();
  }

  public setGameplayMode(_isGameplay: boolean): void {
    this.updateVisibility();
  }

  public setVisible(show: boolean): void {
    if (show) {
      this.loaderFinished = true;
    }
    this.updateVisibility();
  }

  private updateVisibility(): void {
    if (!this.container) return;
    this.checkMode();

    const shouldDisplay = this.isStandaloneMobile && this.loaderFinished;
    if (shouldDisplay) {
      this.container.hidden = false;
      this.container.classList.add('visible');
    } else {
      this.container.hidden = true;
      this.container.classList.remove('visible');
    }
  }

  public destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.pathEl = null;
    this.contentEl = null;
  }
}
