/**
 * Mobile PWA Bottom Gameplay Instruction Panel
 *
 * Implements a solid, world-integrated concave bottom gameplay instruction
 * panel for the installed mobile PWA (iOS & Android) ONLY.
 *
 * Requirements:
 * - Installed mobile PWA only (display-mode: standalone / fullscreen or iOS standalone)
 * - Solid color matching the active world's authoritative ground/environment tone
 * - Zero transparency, zero blur, zero glassmorphism, zero inner shadows
 * - Shallow organic curve with a subtly flattened center
 * - Extends edge-to-edge behind the iOS/Android system gesture bar / home indicator
 * - Standalone white control icons: ◀  ❚❚  ▶
 * - Hierarchical text: "SWIPE TO MOVE" (primary) + "AVOID TRAFFIC" (secondary)
 * - Compact height respecting env(safe-area-inset-bottom)
 * - Permanent panel shape & background across gameplay, menu, and gameover
 * - Strict single-background architecture during loading vs post-loading
 */

import { getFadeColorForWorld } from '../config/worlds.config';
import { isStandalonePWA, isTouchDevice } from '../utils/DeviceUtils';

export class PWABottomPanel {
  private container: HTMLElement | null = null;
  private pathEl: SVGPathElement | null = null;
  private contentEl: HTMLElement | null = null;
  private currentWorldId: string = 'city';
  private loaderFinished: boolean = false;
  private isGameplay: boolean = false;
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
      el.setAttribute('aria-label', 'Gameplay instructions');
      el.setAttribute('role', 'region');
      el.hidden = true;

      // Shallow organic curve with subtly flattened center across 380-620
      el.innerHTML = `
        <div class="pwa-panel-curve-wrap" aria-hidden="true">
          <svg class="pwa-panel-svg" viewBox="0 0 1000 50" preserveAspectRatio="none">
            <path id="pwa-panel-curve-path" d="M 0,0 C 140,2 260,26 380,30 C 450,31.5 550,31.5 620,30 C 740,26 860,2 1000,0 L 1000,50 L 0,50 Z" fill="#848886" />
          </svg>
        </div>
        <div class="pwa-panel-body">
          <div id="pwa-panel-content" class="pwa-panel-content">
            <div class="pwa-panel-controls" aria-hidden="true">
              <svg class="pwa-ctrl-icon pwa-ctrl-left" width="14" height="14" viewBox="0 0 20 20" fill="none">
                <polygon points="15,3 4,10 15,17" fill="#FFFFFF"/>
              </svg>
              <svg class="pwa-ctrl-icon pwa-ctrl-pause" width="14" height="14" viewBox="0 0 20 20" fill="none">
                <rect x="4.5" y="2.5" width="3.5" height="15" rx="1.75" fill="#FFFFFF"/>
                <rect x="12" y="2.5" width="3.5" height="15" rx="1.75" fill="#FFFFFF"/>
              </svg>
              <svg class="pwa-ctrl-icon pwa-ctrl-right" width="14" height="14" viewBox="0 0 20 20" fill="none">
                <polygon points="5,3 16,10 5,17" fill="#FFFFFF"/>
              </svg>
            </div>
            <div class="pwa-panel-primary">SWIPE TO MOVE</div>
            <div class="pwa-panel-secondary">AVOID TRAFFIC</div>
          </div>
        </div>
      `;

      document.body.appendChild(el);
    }

    this.container = el;
    this.pathEl = el.querySelector('#pwa-panel-curve-path');
    this.contentEl = el.querySelector('#pwa-panel-content');
    this.applyWorldColor(this.currentWorldId);
  }

  private handleResize(): void {
    this.checkMode();
    this.updateVisibility();
  }

  public setWorld(worldId: string): void {
    this.currentWorldId = worldId;
    this.applyWorldColor(worldId);
  }

  private applyWorldColor(worldId: string): void {
    const [r, g, b] = getFadeColorForWorld(worldId);
    const colorHex = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');

    if (this.container) {
      this.container.style.setProperty('--panel-ground-color', colorHex);
    }
    if (this.pathEl) {
      this.pathEl.setAttribute('fill', colorHex);
    }
    if (typeof document !== 'undefined' && this.loaderFinished) {
      document.documentElement.style.setProperty('--panel-ground-color', colorHex);
      document.body.style.backgroundColor = colorHex;
      document.documentElement.style.backgroundColor = colorHex;
    }
  }

  public onLoaderFinished(): void {
    this.loaderFinished = true;
    this.applyWorldColor(this.currentWorldId);
    this.updateVisibility();
  }

  public setGameplayMode(isGameplay: boolean): void {
    this.isGameplay = isGameplay;
    if (this.contentEl) {
      if (isGameplay) {
        this.contentEl.classList.remove('suppressed');
      } else {
        this.contentEl.classList.add('suppressed');
      }
    }
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

    // STRICT SCOPE: Only display in installed standalone mobile PWA after loader finishes.
    // Once loader finishes, the panel ALWAYS remains present to guarantee solid bottom architecture.
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
